import { BUCKET_COLOR, BUCKET_LABEL, FORMAT_LABEL } from "@/lib/social/strategy";
import type { ContentItem } from "@/lib/social/types";

/**
 * The next few posts that still need work, newest deadline first — the
 * "what do I do today" list the reference dashboards put in the right rail.
 */
export function UpNext({ items }: { items: ContentItem[] }) {
  const pending = items
    .filter((i) => !i.production.posted)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  const stage = (i: ContentItem) =>
    !i.production.shoot ? "To shoot" : !i.production.edit ? "To edit" : "Ready to post";

  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-bold">Up next</h2>
        <span className="text-xs font-bold text-ink-faint tabular-nums">
          {items.filter((i) => !i.production.posted).length} pending
        </span>
      </div>

      {pending.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">
          Everything on this platform is live. Nice.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {pending.map((item) => (
            <li key={item.id} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                style={{
                  backgroundColor: `color-mix(in oklab, ${BUCKET_COLOR[item.bucket]} 16%, var(--color-paper))`,
                  color: BUCKET_COLOR[item.bucket],
                }}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[0.625rem] font-extrabold tabular-nums"
              >
                {item.date.slice(8)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{item.topic}</span>
                <span className="block truncate text-xs text-ink-faint">
                  {FORMAT_LABEL[item.format]} · {BUCKET_LABEL[item.bucket]}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-paper-alt px-2 py-1 text-[0.625rem] font-bold text-ink-muted">
                {stage(item)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
