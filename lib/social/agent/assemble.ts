import { logger } from "@/lib/observability/logger";
import type { Slot } from "../schedule";
import type { ContentItem, Platform } from "../types";
import type { PlannedItem, PlannedShort } from "./schemas";

/**
 * Turning model output into stored rows.
 *
 * Dates, day names, week numbers, and post counts are computed from the
 * calendar here rather than asked of the model. The model is good at ideas and
 * unreliable at arithmetic over dates; deriving them guarantees valid in-month
 * dates and exactly the cadence the team committed to.
 */

/**
 * Pairs planned items with their slots.
 *
 * A model returning fewer items than slots leaves the tail unfilled rather than
 * inventing filler or discarding the whole month. That is a real, visible
 * shortfall — the caller logs it, and the dashboard shows a short month — but
 * it beats both alternatives.
 */
export function assembleItems(
  monthId: string,
  platform: Platform,
  slots: Slot[],
  planned: PlannedItem[],
): ContentItem[] {
  if (planned.length < slots.length) {
    logger.warn("agent.short_plan", {
      monthId,
      platform,
      slots: slots.length,
      planned: planned.length,
    });
  }

  return slots.flatMap((slot, i) => {
    const p = planned[i];
    if (!p) return [];

    return [
      {
        id: `${monthId}-${platform}-${i}`,
        date: slot.date,
        day: slot.day,
        week: slot.week,
        platform,
        bucket: p.bucket,
        format: p.format,
        topic: p.topic,
        copy: p.copy,
        caption: p.caption,
        hashtags: p.hashtags,
        hook: p.hook,
        cta: p.cta,
        seoKeywords: p.seoKeywords,
        rationale: p.rationale,
        production: { shoot: false, edit: false, posted: false },
        liveLink: null,
      } satisfies ContentItem,
    ];
  });
}

/**
 * Pairs each rewritten Short with the reel it came from.
 *
 * The video asset is identical, so date, week, script and bucket carry over
 * verbatim; only the title, description, tags and keywords are replaced,
 * because YouTube is a search surface and Instagram is a scroll surface.
 */
export function assembleShorts(
  monthId: string,
  reels: ContentItem[],
  planned: PlannedShort[],
): ContentItem[] {
  return reels.flatMap((reel, i) => {
    const short = planned[i];
    if (!short) return [];

    return [
      {
        ...reel,
        id: `${monthId}-youtube-short-${i}`,
        platform: "youtube",
        format: "short",
        topic: short.topic,
        caption: short.caption,
        hashtags: short.hashtags,
        seoKeywords: short.seoKeywords,
        rationale: `Same asset as the Instagram reel "${reel.topic}" — shot once, posted twice.`,
        production: { shoot: false, edit: false, posted: false },
        liveLink: null,
        derivedFrom: reel.id,
      } satisfies ContentItem,
    ];
  });
}
