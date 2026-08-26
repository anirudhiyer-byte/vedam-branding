"use client";

import { useActionState } from "react";
import {
  generateMonth,
  replanPlatform,
  type GenerateState,
} from "@/app/studio/actions";
import { PLATFORM_LABEL } from "@/lib/social/strategy";
import { PLATFORMS, type Platform } from "@/lib/social/types";

const initial: GenerateState = {};

/**
 * Per-platform research fields. `autoFetch` reflects what the APIs actually
 * allow, not what we wish they allowed — see lib/social/insights.ts.
 */
const RESEARCH: Record<
  Platform,
  { autoFetch: boolean; handlePlaceholder: string; help: string }
> = {
  instagram: {
    autoFetch: false,
    handlePlaceholder: "@vedamschool",
    help: "Not auto-fetched — the Graph API needs a Meta Business app, and competitor access is limited. Paste what you know below and the strategist will use it.",
  },
  linkedin: {
    autoFetch: false,
    handlePlaceholder: "vedam-school-of-technology",
    help: "Not auto-fetched — there is no supported API for reading competitors' organic posts. Your notes are the only signal here, so they matter most.",
  },
  youtube: {
    autoFetch: true,
    handlePlaceholder: "@vedamschool",
    help: "Auto-fetched when YOUTUBE_API_KEY is set: recent videos, view counts, and recurring title keywords for you and each competitor.",
  },
};

function PlatformResearch({ platform }: { platform: Platform }) {
  const cfg = RESEARCH[platform];
  const field =
    "w-full rounded-xl border border-rule bg-paper-alt px-3.5 py-2.5 text-sm focus:border-accent focus:bg-paper";

  return (
    <fieldset className="rounded-2xl border border-rule p-4">
      <legend className="flex items-center gap-2 px-2">
        <span className="font-display text-lg">{PLATFORM_LABEL[platform]}</span>
        <span
          className={`rounded-full px-2 py-0.5 font-mono text-[0.625rem] tracking-wide uppercase ${
            cfg.autoFetch
              ? "bg-accent-soft text-accent"
              : "border border-rule text-ink-faint"
          }`}
        >
          {cfg.autoFetch ? "Auto-fetched" : "Manual"}
        </span>
      </legend>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="eyebrow">Our handle</span>
          <input
            name={`${platform}Own`}
            placeholder={cfg.handlePlaceholder}
            className={`${field} mt-1.5`}
          />
        </label>
        <label className="block">
          <span className="eyebrow">Competitor handles</span>
          <input
            name={`${platform}Competitors`}
            placeholder="comma separated"
            className={`${field} mt-1.5`}
          />
        </label>
      </div>

      <label className="mt-3 block">
        <span className="eyebrow">
          What&rsquo;s working / competitor notes
          {!cfg.autoFetch && " — the main input for this platform"}
        </span>
        <textarea
          name={`${platform}Notes`}
          rows={2}
          placeholder={
            platform === "linkedin"
              ? "e.g. Founder posts on hiring outperform everything. Competitor X posts placement screenshots weekly and they do well."
              : "e.g. Our lab reels cross 40k, campus tours die at 2k. Competitor Y's 'day in the life' series is working."
          }
          className={`${field} mt-1.5 resize-y`}
        />
      </label>

      <p className="mt-2 text-xs text-ink-faint">{cfg.help}</p>
    </fieldset>
  );
}

export function GeneratePanel({
  year,
  month,
  monthLabel,
  regenerate,
  platform,
}: {
  year: number;
  month: number;
  monthLabel: string;
  regenerate: boolean;
  /**
   * When set, this panel re-plans only that platform and shows only its
   * research fields. Omitted for a first-time plan, which needs all three
   * because it also decides the shared month theme.
   */
  platform?: Platform;
}) {
  const scoped = platform !== undefined;
  const [state, action, pending] = useActionState(
    scoped ? replanPlatform : generateMonth,
    initial,
  );
  const platforms = scoped ? [platform] : PLATFORMS;
  const subject = scoped ? PLATFORM_LABEL[platform] : "all three platforms";

  return (
    <form action={action}>
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="month" value={month} />
      {scoped && <input type="hidden" name="platform" value={platform} />}

      <h2 className="font-display text-xl tracking-tight">
        {scoped
          ? `Re-plan ${PLATFORM_LABEL[platform]} — ${monthLabel}`
          : regenerate
            ? `Re-plan ${monthLabel}`
            : `Plan ${monthLabel}`}
      </h2>
      <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">
        {scoped ? (
          <>
            Re-plans <strong>{PLATFORM_LABEL[platform]} only</strong>, against
            this month&rsquo;s existing theme. The other platforms keep their
            content and their ticked boxes. {PLATFORM_LABEL[platform]}&rsquo;s
            own rows are replaced, so its Shoot / Edit / Posted marks reset.
          </>
        ) : (
          <>
            The strategist sets one theme for the month, then plans each platform
            separately against its own audience, bucket mix, and research.
          </>
        )}
      </p>

      <label className="mt-5 block">
        <span className="eyebrow">Direction for this month (optional)</span>
        <textarea
          name="brief"
          rows={3}
          placeholder="e.g. Admissions close on the 20th. Push the new AI lab. Avoid exam-stress angles this month."
          className="mt-1.5 w-full resize-y rounded-xl border border-rule bg-paper-alt px-3.5 py-2.5 text-sm focus:border-accent focus:bg-paper"
        />
      </label>

      <div className="mt-6">
        <h3 className="eyebrow">
          {scoped ? `Research for ${PLATFORM_LABEL[platform]}` : "Research, per platform"}
        </h3>
        <p className="mt-1.5 max-w-2xl text-xs text-ink-faint">
          Each platform&rsquo;s research goes only into that platform&rsquo;s plan.
          Everything here is optional — leave it blank and {subject} still get
          planned from the standing strategy.
        </p>
        <div className="mt-3 grid gap-4">
          {platforms.map((p) => (
            <PlatformResearch key={p} platform={p} />
          ))}
        </div>
      </div>

      {state.error && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-accent/40 bg-accent-soft px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="brand-gradient-bg mt-5 inline-flex h-11 items-center rounded-full px-7 text-sm font-bold text-on-dark shadow-tile transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {pending
          ? scoped
            ? `Re-planning ${PLATFORM_LABEL[platform]}…`
            : "Planning the month…"
          : scoped
            ? `Re-plan ${PLATFORM_LABEL[platform]}`
            : regenerate
              ? "Re-plan month"
              : "Plan this month"}
      </button>
      {pending && (
        <p className="mt-2 text-xs text-ink-faint">
          {scoped
            ? "This takes about a minute — a single call for this platform."
            : "This takes a minute or two — one call for the theme, then three in parallel, one per platform."}
        </p>
      )}
    </form>
  );
}
