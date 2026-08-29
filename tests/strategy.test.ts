import { describe, expect, it } from "vitest";
import {
  BUCKET_COLOR,
  BUCKET_DEFINITIONS,
  BUCKET_LABEL,
  FORMAT_LABEL,
  PLATFORM_BUCKET_MIX,
  PLATFORM_LABEL,
  PLATFORM_STRATEGY,
  bucketTarget,
  bucketsForPlatform,
} from "@/lib/social/strategy";
import { platformUrl } from "@/lib/social/strategy/links";
import { BUCKETS, FORMATS, PLATFORMS } from "@/lib/social/types";
import { platformTotals, summarisePlatform } from "@/lib/social/summary";
import { makeCalendar } from "./helpers/calendar";

describe("bucket mix", () => {
  it.each(PLATFORMS)("%s sums to 100%%", (platform) => {
    const total = Object.values(PLATFORM_BUCKET_MIX[platform]).reduce(
      (a, b) => a + b,
      0,
    );
    expect(total).toBe(100);
  });

  it("only references buckets that exist", () => {
    for (const platform of PLATFORMS) {
      for (const bucket of Object.keys(PLATFORM_BUCKET_MIX[platform])) {
        expect(BUCKETS).toContain(bucket);
      }
    }
  });

  it("orders buckets richest first, deterministically", () => {
    for (const platform of PLATFORMS) {
      const ordered = bucketsForPlatform(platform);
      const shares = ordered.map((b) => bucketTarget(platform, b));
      expect([...shares].sort((a, b) => b - a)).toEqual(shares);
      // Stable across calls, so the prompt bytes do not vary between runs.
      expect(bucketsForPlatform(platform)).toEqual(ordered);
    }
  });

  it("returns 0 for a bucket a platform does not plan against", () => {
    // LinkedIn deliberately omits student_life.
    expect(bucketTarget("linkedin", "student_life")).toBe(0);
  });
});

describe("presentation maps are complete", () => {
  it("labels every bucket, format and platform", () => {
    for (const b of BUCKETS) {
      expect(BUCKET_LABEL[b]).toBeTruthy();
      expect(BUCKET_DEFINITIONS[b].purpose).toBeTruthy();
      expect(BUCKET_COLOR[b]).toMatch(/^#[0-9a-f]{6}$/);
    }
    for (const f of FORMATS) expect(FORMAT_LABEL[f]).toBeTruthy();
    for (const p of PLATFORMS) {
      expect(PLATFORM_LABEL[p]).toBeTruthy();
      expect(PLATFORM_STRATEGY[p].preferredFormats.length).toBeGreaterThan(0);
    }
  });

  it("only lets a platform prefer formats that exist", () => {
    for (const p of PLATFORMS) {
      for (const format of PLATFORM_STRATEGY[p].preferredFormats) {
        expect(FORMATS).toContain(format);
      }
    }
  });
});

describe("platform URLs", () => {
  it("returns null when unset rather than a guessed handle", () => {
    // A plausible-looking guess renders as a working link to a page that may
    // not be ours; absent is the honest state.
    for (const platform of PLATFORMS) {
      expect(platformUrl(platform)).toBeNull();
    }
  });
});

describe("summarisePlatform", () => {
  const calendar = makeCalendar();

  it("scopes every number to the platform, not the whole calendar", () => {
    const summary = summarisePlatform(calendar, "linkedin");
    const linkedin = calendar.items.filter((i) => i.platform === "linkedin");

    expect(summary.total).toBe(linkedin.length);
    expect(summary.total).toBeLessThan(calendar.items.length);

    // Shares are percentages of this platform's own month.
    const shareTotal = summary.byFormat.reduce((n, r) => n + r.share, 0);
    expect(shareTotal).toBeGreaterThanOrEqual(99);
    expect(shareTotal).toBeLessThanOrEqual(101);
  });

  it("flags posts landing in a bucket the platform does not plan", () => {
    const skewed = makeCalendar();
    // student_life is not in LinkedIn's mix.
    const target = skewed.items.find((i) => i.platform === "linkedin")!;
    target.bucket = "student_life";

    const summary = summarisePlatform(skewed, "linkedin");
    const offPlan = summary.byBucket.find((r) => r.key === "student_life");
    expect(offPlan?.offPlan).toBe(true);
  });

  it("counts production progress per platform", () => {
    const marked = makeCalendar();
    for (const item of marked.items.filter((i) => i.platform === "youtube")) {
      item.production.posted = true;
    }

    expect(summarisePlatform(marked, "youtube").production.posted).toBe(7);
    expect(summarisePlatform(marked, "instagram").production.posted).toBe(0);
  });

  it("handles an empty platform without dividing by zero", () => {
    const empty = { ...calendar, items: [] };
    const summary = summarisePlatform(empty, "instagram");
    expect(summary.total).toBe(0);
    expect(summary.byBucket.every((r) => r.share === 0)).toBe(true);
  });
});

describe("platformTotals", () => {
  it("reports totals and posted counts per platform", () => {
    const totals = platformTotals(makeCalendar(), PLATFORMS);
    expect(totals).toHaveLength(3);
    expect(totals.find((t) => t.platform === "youtube")?.total).toBe(7);
    expect(totals.every((t) => t.posted === 0)).toBe(true);
  });
});
