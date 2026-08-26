import { BUCKET_COLOR, PLATFORM_LABEL } from "@/lib/social/strategy";
import type { PlatformSummary } from "@/lib/social/summary";
import type { Bucket } from "@/lib/social/types";

function Bar({
  share,
  target,
  color,
  offPlan,
}: {
  share: number;
  target?: number;
  color: string;
  offPlan?: boolean;
}) {
  return (
    <div className="relative mt-2 h-2.5 w-full overflow-hidden rounded-full bg-rule">
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{
          width: `${Math.min(share, 100)}%`,
          backgroundImage: offPlan
            ? undefined
            : `linear-gradient(90deg, ${color}, color-mix(in oklab, ${color} 55%, #f97d03))`,
          backgroundColor: offPlan ? "var(--color-ink-faint)" : undefined,
        }}
      />
      {target !== undefined && target > 0 && (
        // Where this platform's own strategy says the bucket should land.
        <span
          aria-hidden="true"
          title={`Target ${target}%`}
          className="absolute top-0 h-full w-0.5 bg-ink"
          style={{ left: `${Math.min(target, 100)}%` }}
        />
      )}
    </div>
  );
}

function Stat({
  value,
  label,
  gradient = false,
}: {
  value: string | number;
  label: string;
  gradient?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-paper-alt px-4 py-3">
      <span
        className={`block font-display text-3xl font-extrabold tabular-nums ${
          gradient ? "brand-gradient-text" : "text-ink"
        }`}
      >
        {value}
      </span>
      <span className="mt-1 block text-xs font-semibold text-ink-muted">
        {label}
      </span>
    </div>
  );
}

export function SummaryPanel({ summary }: { summary: PlatformSummary }) {
  const { production, total, platform } = summary;
  const name = PLATFORM_LABEL[platform];
  const livePct = total === 0 ? 0 : Math.round((production.posted / total) * 100);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section>
        <h2 className="eyebrow">{name} this month</h2>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <Stat value={total} label="Posts planned" gradient />
          <Stat value={`${livePct}%`} label="Live" gradient />
          <Stat value={`${production.shoot}/${total}`} label="Shot" />
          <Stat value={`${production.edit}/${total}`} label="Edited" />
        </div>

        <h2 className="eyebrow mt-6">{name} content types</h2>
        {summary.byFormat.length === 0 ? (
          <p className="mt-3 text-sm text-ink-faint">Nothing planned yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {summary.byFormat.map((row) => (
              <li key={row.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-semibold">{row.label}</span>
                  <span className="text-xs font-semibold tabular-nums whitespace-nowrap text-ink-muted">
                    {row.count} · {row.share}%
                  </span>
                </div>
                <Bar share={row.share} color="#8a18ff" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="lg:col-span-2">
        <h2 className="eyebrow">{name} content buckets</h2>
        <p className="mt-1.5 max-w-2xl text-xs text-ink-faint">
          Shares are of {name}&rsquo;s own {total} posts. The dark mark is the
          target for this bucket on {name} specifically — each platform has its
          own mix.
        </p>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {summary.byBucket.map((row) => {
            const color = BUCKET_COLOR[row.key as Bucket];
            return (
              <li key={row.key} className={row.count === 0 ? "opacity-55" : undefined}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <span
                      aria-hidden="true"
                      style={{ backgroundColor: color }}
                      className="size-2.5 shrink-0 rounded-full"
                    />
                    {row.label}
                    {row.offPlan && (
                      <span className="rounded-full border border-rule px-1.5 font-mono text-[0.5625rem] text-ink-faint">
                        off-plan
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-semibold tabular-nums whitespace-nowrap text-ink-muted">
                    {row.count} · {row.share}%
                    {row.targetShare ? (
                      <span className="font-normal text-ink-faint"> / {row.targetShare}%</span>
                    ) : null}
                  </span>
                </div>
                <Bar
                  share={row.share}
                  target={row.targetShare}
                  color={color}
                  offPlan={row.offPlan}
                />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
