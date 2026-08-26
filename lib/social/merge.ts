import type { CalendarMonth, ContentItem, Platform } from "./types";

export function byDateThenPlatform(a: ContentItem, b: ContentItem) {
  return a.date.localeCompare(b.date) || a.platform.localeCompare(b.platform);
}

/**
 * Swaps in freshly planned rows, replacing exactly the rows `shouldReplace`
 * matches. Everything else is carried across untouched — its copy, live links,
 * and Shoot/Edit/Posted marks. Replaced rows are genuinely new content, so
 * their production marks start clear rather than being inherited from rows
 * that no longer exist.
 */
export function mergeItems(
  calendar: CalendarMonth,
  shouldReplace: (item: ContentItem) => boolean,
  fresh: ContentItem[],
): ContentItem[] {
  const kept = calendar.items.filter((i) => !shouldReplace(i));
  return [...kept, ...fresh].sort(byDateThenPlatform);
}

/**
 * Which rows a re-plan of `platform` owns.
 *
 * YouTube shorts are the Instagram reels reposted, so they belong to the
 * Instagram plan: re-planning Instagram replaces them too, and re-planning
 * YouTube leaves them alone and touches only the long-form videos.
 */
export function ownedBy(platform: Platform) {
  return (item: ContentItem): boolean => {
    const isShort = item.platform === "youtube" && item.format === "short";
    if (platform === "instagram") return item.platform === "instagram" || isShort;
    if (platform === "youtube") return item.platform === "youtube" && !isShort;
    return item.platform === platform;
  };
}

/** Back-compat wrapper for a plain single-platform swap. */
export function mergePlatformItems(
  calendar: CalendarMonth,
  platform: Platform,
  fresh: ContentItem[],
): ContentItem[] {
  return mergeItems(calendar, ownedBy(platform), fresh);
}
