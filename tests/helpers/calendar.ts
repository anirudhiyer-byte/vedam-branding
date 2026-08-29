import { buildSlots } from "@/lib/social/schedule";
import type { CalendarMonth, ContentItem, Platform } from "@/lib/social/types";

/** Builds a complete, schema-valid calendar for tests. No model calls. */
export function makeCalendar(year = 2026, month = 9): CalendarMonth {
  const id = `${year}-${String(month).padStart(2, "0")}`;
  const slots = buildSlots(year, month);

  const items: ContentItem[] = slots.map((slot, i) => ({
    id: `${id}-${slot.platform}-${i}`,
    date: slot.date,
    day: slot.day,
    week: slot.week,
    platform: slot.platform,
    bucket: slot.platform === "linkedin" ? "founder_pov" : "learn_tech",
    format: slot.platform === "instagram" ? "reel" : "static",
    topic: `Topic ${i}`,
    copy: `Copy ${i}`,
    caption: `Caption ${i}`,
    hashtags: ["#vedam"],
    hook: `Hook ${i}`,
    cta: "Follow",
    seoKeywords: ["btech ai"],
    rationale: "Test row",
    production: { shoot: false, edit: false, posted: false },
    liveLink: null,
  }));

  return {
    id,
    year,
    month,
    theme: { title: "Test theme", rationale: "Because", throughLine: "One idea" },
    platformNotes: { instagram: "ig", linkedin: "li", youtube: "yt" },
    items,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };
}

/** A YouTube Short derived from an Instagram reel, for merge-ownership tests. */
export function makeShort(calendar: CalendarMonth): ContentItem {
  const reel = calendar.items.find(
    (i) => i.platform === "instagram" && i.format === "reel",
  )!;
  return {
    ...reel,
    id: `${calendar.id}-youtube-short-0`,
    platform: "youtube",
    format: "short",
    derivedFrom: reel.id,
  };
}

export function itemsOn(calendar: CalendarMonth, platform: Platform) {
  return calendar.items.filter((i) => i.platform === platform);
}
