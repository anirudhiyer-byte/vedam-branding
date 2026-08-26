import { monthStatus } from "@/lib/social/schedule";
import { PLATFORM_LABEL } from "@/lib/social/strategy";
import type { PlatformSummary } from "@/lib/social/summary";
import type { CalendarMonth, Platform } from "@/lib/social/types";

function timeCue(year: number, month: number): string {
  const status = monthStatus(year, month, new Date());
  const name = new Date(year, month - 1, 1).toLocaleString("en-IN", {
    month: "long",
  });
  if (status.kind === "past") return `${name} is closed`;
  if (status.kind === "future") {
    return status.daysUntil === 0
      ? `${name} starts today`
      : `${name} starts in ${status.daysUntil} days`;
  }
  return status.daysLeft === 1
    ? `Last day of ${name}`
    : `${status.daysLeft} days left in ${name}`;
}

function Pulse({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <span className="block font-display text-xl font-extrabold tabular-nums">
        {value}
      </span>
      <span className="block text-[0.6875rem] font-semibold opacity-80">
        {label}
      </span>
    </div>
  );
}

export function ThemeBanner({
  calendar,
  platform,
  summary,
  year,
  month,
}: {
  calendar: CalendarMonth;
  platform: Platform;
  summary: PlatformSummary;
  year: number;
  month: number;
}) {
  const { production, total } = summary;

  return (
    <section className="brand-gradient-bg relative overflow-hidden rounded-3xl p-6 text-on-dark shadow-card-lg md:p-8">
      <div
        aria-hidden="true"
        className="absolute -top-16 -right-10 size-56 rounded-full bg-white/15 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-24 right-28 size-44 rounded-full bg-white/10 blur-2xl"
      />

      <div className="relative">
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-bold tracking-[0.18em] uppercase opacity-85">
          Theme of the month
          <span aria-hidden="true" className="opacity-60">
            ·
          </span>
          <span className="tracking-[0.1em]">{timeCue(year, month)}</span>
        </p>

        <h2 className="mt-2.5 max-w-3xl font-display text-2xl leading-tight font-extrabold text-balance md:text-4xl">
          {calendar.theme.title}
        </h2>

        <p className="mt-4 inline-block max-w-2xl rounded-2xl bg-black/20 px-4 py-2.5 text-sm backdrop-blur-sm">
          <span className="font-bold">Through-line: </span>
          {calendar.theme.throughLine}
        </p>

        {/* The one part of the banner that differs per tab. */}
        <p className="mt-5 max-w-2xl text-sm leading-relaxed">
          <span className="text-xs font-bold tracking-[0.14em] uppercase opacity-75">
            On {PLATFORM_LABEL[platform]}
          </span>
          <span className="mt-1 block opacity-95">
            {calendar.platformNotes[platform]}
          </span>
        </p>

        <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/25 pt-4">
          <Pulse value={total} label="Planned" />
          <Pulse value={production.shoot} label="Shot" />
          <Pulse value={production.edit} label="Edited" />
          <Pulse value={production.posted} label="Live" />
          <Pulse value={total - production.posted} label="Still to go" />
        </div>
      </div>
    </section>
  );
}
