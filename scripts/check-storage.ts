import { store } from "../lib/social/storage.ts";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

const id = "2026-09";
const before = await store.get(id);
if (!before) throw new Error("seed the sample month first");

const target = before.items[3];

await store.setProduction(id, target.id, "shoot", true);
await store.setProduction(id, target.id, "posted", true);
await store.setLiveLink(id, target.id, "  https://instagram.com/p/abc123  ");

const after = await store.get(id);
const updated = after!.items.find((i) => i.id === target.id)!;

check("shoot persisted", updated.production.shoot === true);
check("posted persisted", updated.production.posted === true);
check("untouched stage unchanged", updated.production.edit === target.production.edit);
check("live link trimmed on save", updated.liveLink === "https://instagram.com/p/abc123",
  String(updated.liveLink));
check("other items untouched",
  after!.items.filter((i) => i.liveLink).length === 1);
check("updatedAt advanced", after!.updatedAt !== before.updatedAt);

// Empty string should clear the link rather than store "".
await store.setLiveLink(id, target.id, "   ");
const cleared = await store.get(id);
check("blank link clears to null",
  cleared!.items.find((i) => i.id === target.id)!.liveLink === null);

// Path traversal guard.
let threw = false;
try { await store.get("../../../etc/passwd"); } catch { threw = true; }
check("rejects a traversal id", threw);

let threwMissing = false;
try { await store.setProduction(id, "nope", "shoot", true); } catch { threwMissing = true; }
check("unknown item id throws", threwMissing);

check("missing month returns null", (await store.get("1999-01")) === null);
check("list() finds the seeded month", (await store.list()).includes(id));

// Restore the seeded state.
await store.setProduction(id, target.id, "shoot", target.production.shoot);
await store.setProduction(id, target.id, "posted", target.production.posted);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
