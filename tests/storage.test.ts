import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JsonCalendarStore } from "@/lib/social/storage/json-store";
import {
  CalendarNotFoundError,
  ItemNotFoundError,
} from "@/lib/social/storage/types";
import { InvalidCalendarError, normaliseLiveLink } from "@/lib/social/validation";
import { makeCalendar } from "./helpers/calendar";

let dir: string;
let store: JsonCalendarStore;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "vedam-store-"));
  store = new JsonCalendarStore(dir);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("JsonCalendarStore", () => {
  it("round-trips a calendar", async () => {
    const calendar = makeCalendar();
    await store.save(calendar);

    const loaded = await store.get(calendar.id);
    expect(loaded?.id).toBe(calendar.id);
    expect(loaded?.items).toHaveLength(calendar.items.length);
    expect(loaded?.theme.title).toBe("Test theme");
  });

  it("returns null for a month that was never planned", async () => {
    expect(await store.get("2030-01")).toBeNull();
  });

  it("lists month ids newest first, ignoring junk files", async () => {
    await store.save(makeCalendar(2026, 8));
    await store.save(makeCalendar(2026, 9));
    await writeFile(path.join(dir, "notes.txt"), "ignore me");
    await writeFile(path.join(dir, "backup.json"), "{}");

    expect(await store.list()).toEqual(["2026-09", "2026-08"]);
  });

  it("rejects a path-traversing month id", async () => {
    // The id arrives from a query string, so this has to be impossible by
    // construction rather than by convention.
    for (const bad of ["../../etc/passwd", "2026-13", "2026-1", "....//x"]) {
      await expect(store.get(bad)).rejects.toThrow(/Invalid calendar id/);
    }
  });

  it("rejects a corrupted file instead of returning a broken calendar", async () => {
    await writeFile(
      path.join(dir, "2026-09.json"),
      JSON.stringify({ id: "2026-09", items: "not an array" }),
    );
    await expect(store.get("2026-09")).rejects.toThrow(InvalidCalendarError);
  });

  it("leaves no temp files behind after a save", async () => {
    await store.save(makeCalendar());
    const files = await readdir(dir);
    expect(files.filter((f) => f.includes(".tmp"))).toHaveLength(0);
    expect(files).toEqual(["2026-09.json"]);
  });

  it("writes valid JSON — the write is atomic, never torn", async () => {
    const calendar = makeCalendar();
    await store.save(calendar);
    const raw = await readFile(path.join(dir, "2026-09.json"), "utf8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  describe("setProduction", () => {
    it("flips exactly one stage on one item", async () => {
      const calendar = makeCalendar();
      await store.save(calendar);
      const target = calendar.items[0];

      await store.setProduction(calendar.id, target.id, "shoot", true);

      const loaded = await store.get(calendar.id);
      const updated = loaded!.items.find((i) => i.id === target.id)!;
      expect(updated.production).toEqual({ shoot: true, edit: false, posted: false });
      // Nothing else moved.
      expect(
        loaded!.items.filter((i) => i.id !== target.id).every((i) => !i.production.shoot),
      ).toBe(true);
    });

    it("does not lose an update when two writes race", async () => {
      // The defect this store previously had: two read-modify-write cycles
      // interleaving meant the second save discarded the first. The per-month
      // lock serialises them, so both survive.
      const calendar = makeCalendar();
      await store.save(calendar);
      const [a, b] = calendar.items;

      await Promise.all([
        store.setProduction(calendar.id, a.id, "shoot", true),
        store.setProduction(calendar.id, b.id, "posted", true),
      ]);

      const loaded = await store.get(calendar.id);
      expect(loaded!.items.find((i) => i.id === a.id)!.production.shoot).toBe(true);
      expect(loaded!.items.find((i) => i.id === b.id)!.production.posted).toBe(true);
    });

    it("survives many concurrent writes without dropping any", async () => {
      const calendar = makeCalendar();
      await store.save(calendar);
      const targets = calendar.items.slice(0, 20);

      await Promise.all(
        targets.map((item) =>
          store.setProduction(calendar.id, item.id, "edit", true),
        ),
      );

      const loaded = await store.get(calendar.id);
      const edited = loaded!.items.filter((i) => i.production.edit);
      expect(edited).toHaveLength(targets.length);
    });

    it("reports a missing month and a missing item distinctly", async () => {
      await expect(
        store.setProduction("2030-01", "nope", "shoot", true),
      ).rejects.toThrow(CalendarNotFoundError);

      const calendar = makeCalendar();
      await store.save(calendar);
      await expect(
        store.setProduction(calendar.id, "no-such-item", "shoot", true),
      ).rejects.toThrow(ItemNotFoundError);
    });

    it("keeps serving later writes after one fails", async () => {
      const calendar = makeCalendar();
      await store.save(calendar);

      await expect(
        store.setProduction(calendar.id, "missing", "shoot", true),
      ).rejects.toThrow();

      // A rejected promise must not poison the month's lock chain.
      await store.setProduction(calendar.id, calendar.items[0].id, "shoot", true);
      const loaded = await store.get(calendar.id);
      expect(loaded!.items[0].production.shoot).toBe(true);
    });
  });

  describe("setLiveLink", () => {
    it("stores a valid URL and clears on empty", async () => {
      const calendar = makeCalendar();
      await store.save(calendar);
      const id = calendar.items[0].id;

      await store.setLiveLink(calendar.id, id, "https://instagram.com/p/abc");
      expect((await store.get(calendar.id))!.items[0].liveLink).toBe(
        "https://instagram.com/p/abc",
      );

      await store.setLiveLink(calendar.id, id, "   ");
      expect((await store.get(calendar.id))!.items[0].liveLink).toBeNull();
    });
  });
});

describe("normaliseLiveLink", () => {
  it("accepts http and https", () => {
    expect(normaliseLiveLink("https://example.com/a")).toBe("https://example.com/a");
    expect(normaliseLiveLink(" http://example.com ")).toBe("http://example.com/");
  });

  it("treats blank as cleared", () => {
    expect(normaliseLiveLink("")).toBeNull();
    expect(normaliseLiveLink("   ")).toBeNull();
    expect(normaliseLiveLink(null)).toBeNull();
  });

  it("rejects a javascript: URL that would become a live href", () => {
    // The value is rendered into an anchor's href, so this is XSS, not a typo.
    expect(() => normaliseLiveLink("javascript:alert(1)")).toThrow(/http/);
    expect(() => normaliseLiveLink("data:text/html,<script>")).toThrow(/http/);
  });

  it("rejects something that is not a URL at all", () => {
    expect(() => normaliseLiveLink("just some text")).toThrow(/does not look like a URL/);
  });
});
