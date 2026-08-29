import { describe, expect, it } from "vitest";
import { byDateThenPlatform, mergeItems, ownedBy } from "@/lib/social/merge";
import { makeCalendar, makeShort } from "./helpers/calendar";

/**
 * The guarantee a re-plan makes to the team: touching one platform must leave
 * the other two's content AND their ticked production boxes exactly as they
 * were. This is the promise the Studio's copy makes on screen, so it is worth
 * asserting rather than trusting.
 */
describe("ownedBy", () => {
  it("gives Instagram its own rows and the Shorts cut from its reels", () => {
    const calendar = makeCalendar();
    const short = makeShort(calendar);
    const owns = ownedBy("instagram");

    expect(owns(calendar.items.find((i) => i.platform === "instagram")!)).toBe(true);
    expect(owns(short)).toBe(true);
    expect(owns(calendar.items.find((i) => i.platform === "linkedin")!)).toBe(false);
  });

  it("gives YouTube only its long-form rows, never the Shorts", () => {
    const calendar = makeCalendar();
    const owns = ownedBy("youtube");

    expect(owns(calendar.items.find((i) => i.platform === "youtube")!)).toBe(true);
    // Shorts belong to the Instagram plan — re-planning YouTube must not
    // replace a Short whose source reel is staying put.
    expect(owns(makeShort(calendar))).toBe(false);
  });

  it("gives LinkedIn exactly its own rows", () => {
    const calendar = makeCalendar();
    const owns = ownedBy("linkedin");
    expect(calendar.items.filter(owns).every((i) => i.platform === "linkedin")).toBe(true);
  });
});

describe("mergeItems", () => {
  it("replaces only the target platform and preserves everyone else's ticks", () => {
    const calendar = makeCalendar();

    // Mark progress across all three platforms.
    for (const item of calendar.items) {
      item.production = { shoot: true, edit: true, posted: true };
      item.liveLink = "https://example.com/post";
    }

    const fresh = calendar.items
      .filter((i) => i.platform === "linkedin")
      .map((i) => ({ ...i, topic: "REPLACED", production: { shoot: false, edit: false, posted: false }, liveLink: null }));

    const merged = mergeItems(calendar, ownedBy("linkedin"), fresh);

    // Untouched platforms keep content, ticks, and links.
    for (const item of merged.filter((i) => i.platform !== "linkedin")) {
      expect(item.topic).not.toBe("REPLACED");
      expect(item.production).toEqual({ shoot: true, edit: true, posted: true });
      expect(item.liveLink).toBe("https://example.com/post");
    }

    // The replanned platform is genuinely new content, so its marks reset.
    for (const item of merged.filter((i) => i.platform === "linkedin")) {
      expect(item.topic).toBe("REPLACED");
      expect(item.production).toEqual({ shoot: false, edit: false, posted: false });
    }
  });

  it("keeps the merged result sorted by date then platform", () => {
    const calendar = makeCalendar();
    const fresh = calendar.items.filter((i) => i.platform === "youtube");
    const merged = mergeItems(calendar, ownedBy("youtube"), fresh);

    expect(merged).toEqual([...merged].sort(byDateThenPlatform));
  });

  it("does not change the total row count for a like-for-like replan", () => {
    const calendar = makeCalendar();
    const fresh = calendar.items.filter((i) => i.platform === "instagram");
    expect(mergeItems(calendar, ownedBy("instagram"), fresh)).toHaveLength(
      calendar.items.length,
    );
  });
});
