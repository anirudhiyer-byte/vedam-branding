import type { Platform } from "./types";

/**
 * Posting cadence. Pure date logic, deliberately free of any dependency on the
 * model layer so it can be reasoned about and tested on its own.
 */

const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const;

/**
 * Posts planned per month, per platform.
 *
 * YouTube's number is LONG-FORM ONLY. The 20 shorts are not planned here —
 * they are repurposed from Instagram reels so the team shoots once and posts
 * twice. See SHORTS_PER_MONTH and repurposeReelsToShorts in agent.ts.
 */
export const MONTHLY_VOLUME: Record<Platform, number> = {
  instagram: 30,
  linkedin: 30,
  youtube: 7,
};

/** YouTube shorts mirrored from that month's Instagram reels. */
export const SHORTS_PER_MONTH = 20;

export interface Slot {
  platform: Platform;
  date: string;
  day: string;
  week: number;
}

export function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(year, month, 0).getDate();
}

export function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function dayName(year: number, month: number, day: number): string {
  return DAY_NAMES[new Date(year, month - 1, day).getDay()];
}

/**
 * Spreads `count` posts as evenly as possible across a month.
 *
 * Returns day-of-month numbers, ascending. When count exceeds the number of
 * days the extra posts double up on days rather than spilling out of the month,
 * which is what keeps a 30-post cadence intact in February.
 */
export function spreadDays(count: number, days: number): number[] {
  if (count <= 0 || days <= 0) return [];
  return Array.from(
    { length: count },
    (_, i) => Math.floor((i * days) / count) + 1,
  );
}

/**
 * Dates are computed here rather than asked of the model. The model is good at
 * ideas and bad at calendars; this guarantees valid in-month dates, the exact
 * post counts the team committed to, and a cadence they can staff against.
 */
export function buildSlots(year: number, month: number): Slot[] {
  const days = daysInMonth(year, month);
  const slots: Slot[] = [];

  for (const platform of Object.keys(MONTHLY_VOLUME) as Platform[]) {
    for (const day of spreadDays(MONTHLY_VOLUME[platform], days)) {
      slots.push({
        platform,
        date: isoDate(year, month, day),
        day: dayName(year, month, day),
        week: Math.ceil(day / 7),
      });
    }
  }

  return slots.sort(
    (a, b) => a.date.localeCompare(b.date) || a.platform.localeCompare(b.platform),
  );
}

export type MonthStatus =
  | { kind: "past" }
  | { kind: "current"; daysLeft: number }
  | { kind: "future"; daysUntil: number };

/**
 * Where a calendar month sits relative to today, for the banner's time cue.
 * `daysLeft` counts today as a working day, so the 26th of a 31-day month
 * reads "6 days left" rather than 5.
 */
export function monthStatus(
  year: number,
  month: number,
  today: Date,
): MonthStatus {
  const viewed = year * 12 + (month - 1);
  const now = today.getFullYear() * 12 + today.getMonth();

  if (viewed < now) return { kind: "past" };
  if (viewed > now) {
    const start = new Date(year, month - 1, 1);
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const daysUntil = Math.round((start.getTime() - from.getTime()) / 86_400_000);
    return { kind: "future", daysUntil };
  }
  return {
    kind: "current",
    daysLeft: daysInMonth(year, month) - today.getDate() + 1,
  };
}
