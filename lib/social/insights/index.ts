import { logger } from "@/lib/observability/logger";
import type { Platform } from "../types";
import { youtubeProvider } from "./youtube";
import type {
  ChannelInsight,
  InsightProvider,
  PlatformResearchInput,
} from "./types";

export type {
  ChannelInsight,
  InsightProvider,
  PlatformResearchInput,
  PostInsight,
} from "./types";
export { youtubeProvider } from "./youtube";
export { extractKeywords } from "./keywords";

/**
 * A provider for a platform whose API cannot supply this data.
 *
 * These are not unfinished work — they encode a platform constraint. Rather
 * than pretend, they return the reason, which the UI surfaces so the team knows
 * to type the context in themselves.
 */
function manualOnly(platform: Platform, why: string): InsightProvider {
  return {
    platform,
    available: () => false,
    async fetch(handles, isCompetitor) {
      return handles.map((handle) => ({
        platform,
        handle,
        isCompetitor,
        topPosts: [],
        recurringKeywords: [],
        note: why,
      }));
    },
  };
}

export const instagramProvider = manualOnly(
  "instagram",
  "Not connected. Needs a Meta app with a linked Facebook Page and a long-lived token. Own-account data is fully readable; competitor data is limited to Business Discovery.",
);

export const linkedinProvider = manualOnly(
  "linkedin",
  "Not connected. Organic analytics need an approved Marketing Developer Platform app plus Page admin rights, and competitor organic posts cannot be read through any supported API — supply this context manually.",
);

export const providers: Record<Platform, InsightProvider> = {
  youtube: youtubeProvider,
  instagram: instagramProvider,
  linkedin: linkedinProvider,
};

/** Renders gathered insights into the text block the strategist reads. */
export function renderInsightsBrief(insights: ChannelInsight[]): string {
  if (insights.length === 0) return "";
  const lines: string[] = [];

  for (const c of insights) {
    lines.push(
      `## ${c.isCompetitor ? "Competitor" : "Our channel"} — ${c.platform} ${c.handle}`,
    );
    if (c.note) lines.push(`_${c.note}_`);
    if (c.topPosts.length) {
      lines.push("Top performing:");
      for (const p of c.topPosts) {
        const v = p.views != null ? ` — ${p.views.toLocaleString("en-IN")} views` : "";
        lines.push(`- "${p.title}"${v}`);
      }
    }
    if (c.recurringKeywords.length) {
      lines.push(`Recurring keywords: ${c.recurringKeywords.join(", ")}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/** Splits a comma- or newline-separated list of handles. */
export function parseHandles(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    // A pasted list can repeat a handle; fetching it twice costs quota.
    .filter((h, i, all) => all.indexOf(h) === i);
}

function renderManual(input: PlatformResearchInput): string {
  const lines: string[] = [];
  if (input.ownHandle) lines.push(`Our account: ${input.ownHandle}`);
  if (input.competitors.length) {
    lines.push(`Competitors we watch: ${input.competitors.join(", ")}`);
  }
  if (input.notes) lines.push(`Notes from the team:\n${input.notes}`);
  return lines.join("\n");
}

/**
 * Gathers research per platform: fetched automatically where the API allows it,
 * and taken from what the team typed everywhere else.
 *
 * One brief per platform, not a single pooled blob — each platform's planning
 * call should see its own evidence and not LinkedIn's notes bleeding into an
 * Instagram plan.
 *
 * Nothing in here may fail a run. Research improves a month; its absence must
 * never prevent one.
 */
export async function gatherResearch(
  inputs: PlatformResearchInput[],
): Promise<Partial<Record<Platform, string>>> {
  const results = await Promise.all(
    inputs.map(async (input) => {
      const sections: string[] = [];

      const manual = renderManual(input);
      if (manual) sections.push(manual);

      const provider = providers[input.platform];
      const hasHandles = Boolean(input.ownHandle) || input.competitors.length > 0;

      if (provider.available() && hasHandles) {
        try {
          const [own, rivals] = await Promise.all([
            input.ownHandle ? provider.fetch([input.ownHandle], false) : [],
            input.competitors.length
              ? provider.fetch(input.competitors, true)
              : [],
          ]);
          const fetched = renderInsightsBrief([...own, ...rivals]);
          if (fetched.trim()) sections.push(fetched);
        } catch (err) {
          // A bad handle or a quota error must never block the month.
          logger.warn("research.failed", { platform: input.platform, error: err });
        }
      }

      return [input.platform, sections.join("\n\n")] as const;
    }),
  );

  return Object.fromEntries(
    results.filter(([, brief]) => brief.length > 0),
  ) as Partial<Record<Platform, string>>;
}
