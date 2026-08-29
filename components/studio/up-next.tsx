import {
  BUCKET_LABEL,
  FORMAT_LABEL,
  bucketChipStyle,
} from "@/lib/social/strategy";
import type { ContentItem } from "@/lib/social/types";

/** How many upcoming posts to surface. Enough to plan a week, not a wall. */
const LIMIT = 6;

export function UpNext({ items }: { items: ContentItem[] }) {
  const pending = items
    .filter((i) => !i.production.posted)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, LIMIT);

  const remaining = items.filter((i) => !i.production.posted).length;

  return (
    <section className="card h-full p-5">
      <h2 className="font-display text-lg font-bold">Up next</h2>
      <p className="mt-0.5 text-xs text-ink-faint">
        {remaining === 0
          ? "Everything on this platform is live"
          : `${remaining} still to go this month`}
      </p>

      {pending.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">
          Nothing left to shoot or post here. Nice.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {pending.map((item) => (
            <li key={item.id} className="flex items-start gap-3">
              {/* The bucket hue is the tint and the border only. The date sits
                  in ink: half this palette — Vedams Orange at 2.50:1 among
                  them — fails WCAG AA as text on a light surface. */}
              <span
                aria-hidden="true"
                style={bucketChipStyle(item.bucket)}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl border text-[0.6875rem] font-extrabold tabular-nums text-ink"
              >
                {item.date.slice(8)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">
                  {item.topic}
                </span>
                <span className="block truncate text-xs text-ink-faint">
                  {FORMAT_LABEL[item.format]} · {BUCKET_LABEL[item.bucket]}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-paper-alt px-2 py-1 text-[0.625rem] font-bold text-ink-muted">
                {item.production.edit
                  ? "Edited"
                  : item.production.shoot
                    ? "Shot"
                    : "To shoot"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
