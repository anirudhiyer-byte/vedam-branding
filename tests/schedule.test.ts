import { describe, expect, it } from "vitest";
import {
  MONTHLY_VOLUME,
  buildSlots,
  daysInMonth,
  monthStatus,
  spreadDays,
} from "@/lib/social/schedule";

const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday",
];

/**
 * The scheduler is the one part of the pipeline the model does not touch, so
 * it is the part that can be pinned down exactly. Every month length the
 * calendar can produce is covered, including both February variants.
 */
const MONTHS = [
  { label: "Sep 2026 (30d)", year: 2026, month: 9, days: 30 },
  { label: "Aug 2026 (31d)", year: 2026, month: 8, days: 31 },
  { label: "Feb 2027 (28d)", year: 2027, month: 2, days: 28 },
  { label: "Feb 2028 (29d, leap)", year: 2028, month: 2, days: 29 },
] as const;

describe("daysInMonth", () => {
  it.each(MONTHS)("$label has $days days", ({ year, month, days }) => {
    expect(daysInMonth(year, month)).toBe(days);
  });
});

describe("spreadDays", () => {
  it("returns nothing for a zero or negative count", () => {
    expect(spreadDays(0, 30)).toEqual([]);
    expect(spreadDays(-1, 30)).toEqual([]);
    expect(spreadDays(5, 0)).toEqual([]);
  });

  it("returns exactly `count` days, ascending, inside the month", () => {
    for (const days of [28, 29, 30, 31]) {
      for (const count of [1, 7, 30, 45]) {
        const result = spreadDays(count, days);
        expect(result).toHaveLength(count);
        expect(result[0]).toBeGreaterThanOrEqual(1);
        expect(Math.max(...result)).toBeLessThanOrEqual(days);
        expect([...result].sort((a, b) => a - b)).toEqual(result);
      }
    }
  });

  it("doubles up rather than spilling past the month end", () => {
    // 45 posts across 30 days must stay in the month, not run to day 45.
    const result = spreadDays(45, 30);
    expect(Math.max(...result)).toBeLessThanOrEqual(30);
    expect(result).toHaveLength(45);
  });
});

describe("buildSlots", () => {
  it.each(MONTHS)("$label holds the committed cadence", ({ year, month, days }) => {
    const slots = buildSlots(year, month);

    for (const [platform, expected] of Object.entries(MONTHLY_VOLUME)) {
      expect(slots.filter((s) => s.platform === platform)).toHaveLength(expected);
    }

    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    for (const slot of slots) {
      expect(slot.date.startsWith(prefix)).toBe(true);
      expect(Number(slot.date.slice(8))).toBeLessThanOrEqual(days);
      expect(slot.week).toBeGreaterThanOrEqual(1);
      expect(slot.week).toBeLessThanOrEqual(5);

      // The stored day name must match the actual weekday, since it is shown
      // in the table and never recomputed.
      const [y, m, d] = slot.date.split("-").map(Number);
      expect(slot.day).toBe(DAY_NAMES[new Date(y, m - 1, d).getDay()]);
    }
  });

  it("is sorted by date, then platform", () => {
    const slots = buildSlots(2026, 9);
    const keys = slots.map((s) => `${s.date}|${s.platform}`);
    expect([...keys].sort()).toEqual(keys);
  });

  it("is deterministic — the same month always builds the same slots", () => {
    expect(buildSlots(2026, 9)).toEqual(buildSlots(2026, 9));
  });
});

describe("monthStatus", () => {
  const today = new Date(2026, 7, 26); // 26 August 2026

  it("reports a past month", () => {
    expect(monthStatus(2026, 7, today)).toEqual({ kind: "past" });
  });

  it("counts today as a remaining day", () => {
    // 31-day August, viewed on the 26th: 26th–31st inclusive is 6 days.
    expect(monthStatus(2026, 8, today)).toEqual({ kind: "current", daysLeft: 6 });
  });

  it("counts days until a future month", () => {
    expect(monthStatus(2026, 9, today)).toEqual({ kind: "future", daysUntil: 6 });
  });

  it("handles a year boundary in both directions", () => {
    expect(monthStatus(2025, 12, today)).toEqual({ kind: "past" });
    expect(monthStatus(2027, 1, today).kind).toBe("future");
  });
});
