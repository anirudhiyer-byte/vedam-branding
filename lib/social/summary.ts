import {
  BUCKET_DEFINITIONS,
  FORMAT_LABEL,
  bucketTarget,
  bucketsForPlatform,
} from "./strategy";
import type { Bucket, CalendarMonth, ContentItem, Format, Platform } from "./types";

export interface CountRow<T extends string> {
  key: T;
  label: string;
  count: number;
  share: number;
  /** Intended share for this bucket ON THIS PLATFORM. */
  targetShare?: number;
  /** True when posts landed in a bucket this platform does not plan against. */
  offPlan?: boolean;
}

export interface PlatformSummary {
  platform: Platform;
  total: number;
  byBucket: CountRow<Bucket>[];
  byFormat: CountRow<Format>[];
  production: { shoot: number; edit: number; posted: number };
  linked: number;
}

export interface PlatformTotal {
  platform: Platform;
  total: number;
  posted: number;
}

function countBy<T extends string>(items: ContentItem[], key: (i: ContentItem) => T) {
  const counts = new Map<T, number>();
  for (const i of items) {
    const k = key(i);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

function share(count: number, total: number) {
  return total === 0 ? 0 : Math.round((count / total) * 100);
}

export function itemsFor(month: CalendarMonth, platform: Platform): ContentItem[] {
  return month.items.filter((i) => i.platform === platform);
}

/**
 * Everything here is scoped to one platform. Bucket and format shares are
 * percentages of that platform's own month, not of the whole calendar —
 * comparing LinkedIn's 14 posts against a 45-post total told you nothing.
 */
export function summarisePlatform(
  month: CalendarMonth,
  platform: Platform,
): PlatformSummary {
  const items = itemsFor(month, platform);
  const total = items.length;

  const bucketCounts = countBy<Bucket>(items, (i) => i.bucket);
  const planned = bucketsForPlatform(platform);
  // Buckets that received posts but are not in this platform's plan.
  const unplanned = [...bucketCounts.keys()].filter((b) => !planned.includes(b));

  const byBucket: CountRow<Bucket>[] = [...planned, ...unplanned].map((bucket) => {
    const count = bucketCounts.get(bucket) ?? 0;
    const target = bucketTarget(platform, bucket);
    return {
      key: bucket,
      label: BUCKET_DEFINITIONS[bucket].label,
      count,
      share: share(count, total),
      targetShare: target,
      offPlan: target === 0 && count > 0,
    };
  });

  const formatCounts = countBy<Format>(items, (i) => i.format);
  const byFormat: CountRow<Format>[] = [...formatCounts.entries()]
    .map(([key, count]) => ({
      key,
      label: FORMAT_LABEL[key],
      count,
      share: share(count, total),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    platform,
    total,
    byBucket,
    byFormat,
    production: {
      shoot: items.filter((i) => i.production.shoot).length,
      edit: items.filter((i) => i.production.edit).length,
      posted: items.filter((i) => i.production.posted).length,
    },
    linked: items.filter((i) => i.liveLink).length,
  };
}

/** Headline counts per platform, for the tab strip. */
export function platformTotals(
  month: CalendarMonth,
  platforms: readonly Platform[],
): PlatformTotal[] {
  return platforms.map((platform) => {
    const items = itemsFor(month, platform);
    return {
      platform,
      total: items.length,
      posted: items.filter((i) => i.production.posted).length,
    };
  });
}
