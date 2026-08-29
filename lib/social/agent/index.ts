import { runStructuredCall } from "@/lib/ai/call";
import { assertWithinBudget, recordSpend } from "@/lib/ai/budget";
import { UsageLedger, logRunReport, type RunReport } from "@/lib/ai/usage";
import { logger } from "@/lib/observability/logger";
import { byDateThenPlatform, mergeItems, ownedBy } from "../merge";
import { SHORTS_PER_MONTH, buildSlots } from "../schedule";
import { PLATFORMS } from "../types";
import type { CalendarMonth, ContentItem, Platform } from "../types";
import { assembleItems, assembleShorts } from "./assemble";
import {
  STRATEGIST_SYSTEM,
  monthName,
  platformPlanPrompt,
  shortsPrompt,
  themePrompt,
  type PromptContext,
} from "./prompts";
import {
  PlatformPlanSchema,
  ShortsPlanSchema,
  ThemeSchema,
  type PlannedTheme,
} from "./schemas";

/**
 * The planning pipeline.
 *
 * Shape of a full month: one theme call, then three platform calls in
 * parallel, then one repurpose call that depends on the Instagram result.
 * Every call shares the same cached system prompt and is routed to the model
 * tier its work actually needs — see lib/ai/models.ts for why each stage is
 * mapped where it is.
 */

/** Everything a planning run needs: the month, plus optional direction. */
export type GenerateOptions = PromptContext;

export interface GenerationResult {
  calendar: CalendarMonth;
  report: RunReport;
}

async function planTheme(
  opts: GenerateOptions,
  ledger: UsageLedger,
): Promise<PlannedTheme> {
  return runStructuredCall({
    label: "theme",
    stage: "theme",
    systemPrompt: STRATEGIST_SYSTEM,
    userPrompt: themePrompt(opts),
    schema: ThemeSchema,
    maxTokens: 8_000,
    effort: "high",
    ledger,
  });
}

async function planPlatform(
  platform: Platform,
  slots: ReturnType<typeof buildSlots>,
  theme: PlannedTheme,
  opts: GenerateOptions,
  ledger: UsageLedger,
) {
  const plan = await runStructuredCall({
    label: platform,
    stage: "platformPlan",
    systemPrompt: STRATEGIST_SYSTEM,
    userPrompt: platformPlanPrompt(platform, slots, theme, opts),
    schema: PlatformPlanSchema,
    maxTokens: 32_000,
    effort: "high",
    ledger,
  });
  return plan.items;
}

/**
 * Turns that month's Instagram reels into YouTube Shorts.
 *
 * The point is that the team shoots once. Because the idea and the script are
 * already fixed, this is a rewrite rather than a planning decision — which is
 * exactly why it is routed to the cheapest tier.
 */
async function repurposeReelsToShorts(
  monthId: string,
  reels: ContentItem[],
  ledger: UsageLedger,
): Promise<ContentItem[]> {
  const chosen = reels.slice(0, SHORTS_PER_MONTH);
  if (chosen.length === 0) return [];

  const plan = await runStructuredCall({
    label: "yt shorts",
    stage: "repurpose",
    systemPrompt: STRATEGIST_SYSTEM,
    userPrompt: shortsPrompt(chosen),
    schema: ShortsPlanSchema,
    maxTokens: 16_000,
    // Deliberately omitted: the repurpose tier may not accept `effort`, and the
    // call layer drops it for such models anyway.
    ledger,
  });

  return assembleShorts(monthId, chosen, plan.items);
}

/** Plans a whole month from scratch: one theme, then all three platforms. */
export async function generateCalendar(
  opts: GenerateOptions,
): Promise<GenerationResult> {
  const id = `${opts.year}-${String(opts.month).padStart(2, "0")}`;
  const ledger = new UsageLedger(monthName(opts.year, opts.month));

  // Check before spending anything, so an exhausted budget costs nothing.
  await assertWithinBudget();
  logger.info("studio.generation.started", { runId: ledger.runId, monthId: id });

  const allSlots = buildSlots(opts.year, opts.month);
  const theme = await planTheme(opts, ledger);

  // Platforms are independent once the theme is fixed — run them together.
  const perPlatform = await Promise.all(
    PLATFORMS.map(async (platform) => {
      const slots = allSlots.filter((s) => s.platform === platform);
      const planned = await planPlatform(platform, slots, theme, opts, ledger);
      return assembleItems(id, platform, slots, planned);
    }),
  );

  const items = perPlatform.flat();
  // Shorts depend on the Instagram plan, so they run after it, not alongside.
  const reels = items.filter(
    (i) => i.platform === "instagram" && i.format === "reel",
  );
  const shorts = await repurposeReelsToShorts(id, reels, ledger);

  const report = await finish(ledger);
  const now = new Date().toISOString();

  return {
    calendar: {
      id,
      year: opts.year,
      month: opts.month,
      theme: {
        title: theme.title,
        rationale: theme.rationale,
        throughLine: theme.throughLine,
      },
      platformNotes: theme.platformNotes,
      items: [...items, ...shorts].sort(byDateThenPlatform),
      createdAt: now,
      updatedAt: now,
    },
    report,
  };
}

/**
 * Re-plans ONE platform inside an existing month.
 *
 * The month theme is reused, not regenerated, so the platform stays consistent
 * with the other two — and so a re-plan costs one call rather than five. Only
 * this platform's rows are replaced; every other platform's content and ticked
 * boxes are left exactly as they were.
 */
export async function regeneratePlatform(
  calendar: CalendarMonth,
  platform: Platform,
  opts: Pick<GenerateOptions, "brief" | "research">,
): Promise<GenerationResult> {
  const ledger = new UsageLedger(`${calendar.id} (${platform})`);
  await assertWithinBudget();

  const slots = buildSlots(calendar.year, calendar.month).filter(
    (s) => s.platform === platform,
  );

  const theme: PlannedTheme = {
    ...calendar.theme,
    platformNotes: calendar.platformNotes,
  };

  const context: GenerateOptions = {
    year: calendar.year,
    month: calendar.month,
    ...opts,
  };

  const planned = await planPlatform(platform, slots, theme, context, ledger);
  const fresh = assembleItems(calendar.id, platform, slots, planned);

  // Re-planning Instagram invalidates the Shorts cut from its reels, so they
  // are re-derived here rather than left pointing at rows that no longer exist.
  const shorts =
    platform === "instagram"
      ? await repurposeReelsToShorts(
          calendar.id,
          fresh.filter((i) => i.format === "reel"),
          ledger,
        )
      : [];

  const report = await finish(ledger);

  return {
    calendar: {
      ...calendar,
      items: mergeItems(calendar, ownedBy(platform), [...fresh, ...shorts]),
      updatedAt: new Date().toISOString(),
    },
    report,
  };
}

/** Commits spend against the monthly budget and emits the cost report. */
async function finish(ledger: UsageLedger): Promise<RunReport> {
  const report = ledger.report();
  await recordSpend(report.totalCostUsd);
  logRunReport(report);
  return report;
}
