import { daysInMonth } from "@/lib/social/schedule";
import type { ContentItem } from "@/lib/social/types";

/**
 * Production progress, week by week.
 *
 * This replaced a posts-per-week chart. The scheduler spreads posts evenly by
 * construction, so that chart was flat every single month and carried no
 * information. What actually varies — and what the team needs to see — is how
 * far each week has got through shoot → edit → live.
 */

const STAGES = [
  { key: "posted", label: "Live", color: "#f97d03" },
  { key: "edited", label: "Edited", color: "#c200db" },
  { key: "shot", label: "Shot", color: "#00cfe5" },
] as const;

/** The furthest stage an item has reached. */
function stageOf(item: ContentItem): "posted" | "edited" | "shot" | "todo" {
  if (item.production.posted) return "posted";
  if (item.production.edit) return "edited";
  if (item.production.shoot) return "shot";
  return "todo";
}

export function WeeklyProgress({
  items,
  year,
  month,
}: {
  items: ContentItem[];
  year: number;
  month: number;
}) {
  const total = daysInMonth(year, month);

  const weeks = [1, 2, 3, 4, 5]
    .map((week) => {
      const firstDay = (week - 1) * 7 + 1;
      const lastDay = Math.min(week * 7, total);
      const wk = items.filter((i) => i.week === week);
      return {
        week,
        days: Math.max(0, lastDay - firstDay + 1),
        count: wk.length,
        posted: wk.filter((i) => stageOf(i) === "posted").length,
        edited: wk.filter((i) => stageOf(i) === "edited").length,
        shot: wk.filter((i) => stageOf(i) === "shot").length,
      };
    })
    .filter((w) => w.days > 0 && w.count > 0);

  return (
    <div>
      <ul className="space-y-3.5">
        {weeks.map((w) => {
          const done = w.posted;
          const pct = w.count === 0 ? 0 : Math.round((done / w.count) * 100);
          return (
            <li key={w.week}>
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="font-bold">
                  Week {w.week}
                  {w.days < 7 && (
                    <span className="ml-1.5 font-medium text-ink-faint">
                      {w.days}-day week
                    </span>
                  )}
                </span>
                <span className="font-semibold tabular-nums text-ink-muted">
                  {done}/{w.count} live
                </span>
              </div>

              <div className="mt-1.5 flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-paper-alt">
                {STAGES.map(({ key, color }) => {
                  const n = w[key === "posted" ? "posted" : key === "edited" ? "edited" : "shot"];
                  if (n === 0) return null;
                  return (
                    <span
                      key={key}
                      style={{
                        width: `${(n / w.count) * 100}%`,
                        backgroundColor: color,
                      }}
                      className="h-full first:rounded-l-full"
                    />
                  );
                })}
              </div>

              {/* Electric Violet, not Vedams Orange: orange is 2.50:1 on a
                  white card and fails WCAG AA for text. See the contrast rule
                  in globals.css — violet on light, orange on dark. */}
              {pct === 100 && (
                <span className="mt-1 block text-[0.625rem] font-bold text-accent">
                  Week complete
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-rule pt-3">
        {STAGES.map(({ key, label, color }) => (
          <li key={key} className="flex items-center gap-1.5 text-[0.6875rem] font-semibold text-ink-muted">
            <span
              aria-hidden="true"
              style={{ backgroundColor: color }}
              className="size-2 rounded-full"
            />
            {label}
          </li>
        ))}
        <li className="flex items-center gap-1.5 text-[0.6875rem] font-semibold text-ink-faint">
          <span aria-hidden="true" className="size-2 rounded-full bg-paper-alt ring-1 ring-rule" />
          Not started
        </li>
      </ul>
    </div>
  );
}
