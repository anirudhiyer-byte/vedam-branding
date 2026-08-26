import { mergeItems, mergePlatformItems, ownedBy } from "../lib/social/merge.ts";
import type { CalendarMonth, ContentItem, Platform } from "../lib/social/types.ts";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

function item(
  platform: Platform,
  date: string,
  n: number,
  done = false,
  format: ContentItem["format"] = "reel",
  derivedFrom: string | null = null,
): ContentItem {
  return {
    id: `2026-08-${platform}-${n}`, date, day: "Monday", week: 1, platform,
    bucket: "learn_tech", format, topic: `${platform} ${n}`, derivedFrom,
    copy: "", caption: "", hashtags: [], hook: "", cta: "", seoKeywords: [],
    rationale: "",
    production: { shoot: done, edit: done, posted: done },
    liveLink: done ? `https://example.com/${platform}/${n}` : null,
  };
}

const calendar = {
  id: "2026-08", year: 2026, month: 8,
  theme: { title: "T", rationale: "R", throughLine: "L" },
  platformNotes: { instagram: "a", linkedin: "b", youtube: "c" },
  items: [
    item("instagram", "2026-08-03", 0, true),
    item("instagram", "2026-08-04", 1, true),
    item("linkedin", "2026-08-04", 0, true),
    item("youtube", "2026-08-05", 0, true),
  ],
  createdAt: "x", updatedAt: "x",
} satisfies CalendarMonth;

const fresh = [item("instagram", "2026-08-03", 0), item("instagram", "2026-08-10", 1)];
const merged = mergePlatformItems(calendar, "instagram", fresh);

const li = merged.filter((i) => i.platform === "linkedin");
const yt = merged.filter((i) => i.platform === "youtube");
const ig = merged.filter((i) => i.platform === "instagram");

check("LinkedIn rows survive untouched",
  li.length === 1 && li[0].production.posted && li[0].liveLink !== null);
check("YouTube rows survive untouched",
  yt.length === 1 && yt[0].production.posted && yt[0].liveLink !== null);
check("Instagram rows are replaced by the new plan",
  ig.length === 2 && ig.every((i) => i.topic.startsWith("instagram")));
check("re-planned platform's marks reset",
  ig.every((i) => !i.production.shoot && !i.production.posted && i.liveLink === null));
check("no rows lost or duplicated", merged.length === 4);
check("still sorted by date",
  merged.map((i) => i.date).join() ===
    [...merged].sort((a, b) => a.date.localeCompare(b.date)).map((i) => i.date).join());

// Re-planning a platform that had nothing should just add rows.
const empty = { ...calendar, items: calendar.items.filter((i) => i.platform !== "youtube") };
check("re-planning an empty platform adds rows",
  mergePlatformItems(empty, "youtube", [item("youtube", "2026-08-05", 0)]).length === 4);

// An empty plan must not silently wipe the other platforms.
check("empty new plan keeps other platforms",
  mergePlatformItems(calendar, "instagram", []).length === 2);

// --- YouTube shorts belong to the Instagram plan, not the YouTube plan ---
const withShorts = {
  ...calendar,
  items: [
    item("instagram", "2026-08-03", 0, true, "reel"),
    item("linkedin", "2026-08-04", 0, true, "static"),
    item("youtube", "2026-08-05", 0, true, "long_form_video"),
    item("youtube", "2026-08-03", 9, true, "short", "2026-08-instagram-0"),
    item("youtube", "2026-08-06", 8, true, "short", "2026-08-instagram-1"),
  ],
} satisfies CalendarMonth;

const afterYt = mergeItems(
  withShorts,
  ownedBy("youtube"),
  [item("youtube", "2026-08-07", 0, false, "long_form_video")],
);
check("re-planning YouTube keeps the shorts",
  afterYt.filter((i) => i.format === "short").length === 2);
check("re-planning YouTube replaces only long-form",
  afterYt.filter((i) => i.format === "long_form_video").length === 1 &&
  afterYt.filter((i) => i.format === "long_form_video")[0].production.posted === false);
check("re-planning YouTube leaves Instagram alone",
  afterYt.filter((i) => i.platform === "instagram").length === 1);

const afterIg = mergeItems(
  withShorts,
  ownedBy("instagram"),
  [
    item("instagram", "2026-08-09", 0, false, "reel"),
    item("youtube", "2026-08-09", 0, false, "short", "new-reel"),
  ],
);
check("re-planning Instagram clears its stale shorts",
  afterIg.filter((i) => i.format === "short").length === 1);
check("re-planning Instagram keeps YouTube long-form",
  afterIg.filter((i) => i.format === "long_form_video").length === 1 &&
  afterIg.filter((i) => i.format === "long_form_video")[0].production.posted === true);
check("re-planning Instagram keeps LinkedIn",
  afterIg.filter((i) => i.platform === "linkedin").length === 1);

check("no short is left pointing at a deleted reel",
  afterIg
    .filter((i) => i.derivedFrom)
    .every((i) => i.derivedFrom === "new-reel"));

const afterLi = mergeItems(withShorts, ownedBy("linkedin"),
  [item("linkedin", "2026-08-11", 0, false, "static")]);
check("re-planning LinkedIn touches nothing else",
  afterLi.filter((i) => i.platform !== "linkedin").length === 4);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
