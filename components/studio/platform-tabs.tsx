import Link from "next/link";
import { PLATFORM_GRADIENT, PLATFORM_LABEL } from "@/lib/social/strategy";
import type { PlatformTotal } from "@/lib/social/summary";
import type { Platform } from "@/lib/social/types";

/** Thin progress ring showing how much of the platform is already live. */
function Ring({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : done / total;
  const r = 15;
  const c = 2 * Math.PI * r;

  return (
    <svg viewBox="0 0 36 36" className="size-10 shrink-0 -rotate-90">
      <circle
        cx="18" cy="18" r={r} fill="none"
        stroke="currentColor" strokeOpacity="0.25" strokeWidth="3.5"
      />
      <circle
        cx="18" cy="18" r={r} fill="none"
        stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
      />
    </svg>
  );
}

/**
 * Each platform is its own calendar. This strip is navigation between them,
 * not a merged view — no combined table is rendered anywhere.
 */
export function PlatformTabs({
  totals,
  active,
  year,
  month,
}: {
  totals: PlatformTotal[];
  active: Platform;
  year: number;
  month: number;
}) {
  return (
    <nav aria-label="Platform" className="grid gap-3 sm:grid-cols-3">
      {totals.map(({ platform, total, posted }) => {
        const isActive = platform === active;
        const pct = total === 0 ? 0 : Math.round((posted / total) * 100);

        return (
          <Link
            key={platform}
            href={`/studio?y=${year}&m=${month}&p=${platform}`}
            aria-current={isActive ? "page" : undefined}
            style={isActive ? { backgroundImage: PLATFORM_GRADIENT[platform] } : undefined}
            className={`group relative overflow-hidden rounded-2xl border p-4 transition-all ${
              isActive
                ? "border-transparent text-on-dark shadow-lg"
                : "border-rule hover:-translate-y-0.5 hover:border-ink-faint hover:shadow-md"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="font-display text-lg font-bold">
                  {PLATFORM_LABEL[platform]}
                </span>
                <span
                  className={`mt-1.5 block font-display text-2xl font-extrabold tabular-nums ${
                    isActive ? "text-on-dark" : "text-ink"
                  }`}
                >
                  {total}
                  <span
                    className={`ml-1.5 text-xs font-medium ${
                      isActive ? "text-on-dark/75" : "text-ink-faint"
                    }`}
                  >
                    posts
                  </span>
                </span>
              </div>

              <span
                className={`relative flex items-center justify-center ${
                  isActive ? "text-on-dark" : "text-accent"
                }`}
              >
                <Ring done={posted} total={total} />
                <span className="absolute text-[0.5625rem] font-bold tabular-nums">
                  {pct}%
                </span>
              </span>
            </div>

            <span
              className={`mt-2 block text-xs font-semibold ${
                isActive ? "text-on-dark/75" : "text-ink-faint"
              }`}
            >
              {posted} live · {total - posted} to go
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
