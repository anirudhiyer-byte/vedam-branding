import {
  MONTHLY_VOLUME,
  SHORTS_PER_MONTH,
  buildSlots,
  monthStatus,
  spreadDays,
} from "../lib/social/schedule.ts";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

const NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// Every month length the calendar can throw at us.
for (const [label, y, m, days] of [
  ["Sep 2026 (30d)", 2026, 9, 30],
  ["Aug 2026 (31d)", 2026, 8, 31],
  ["Feb 2027 (28d)", 2027, 2, 28],
  ["Feb 2028 (29d)", 2028, 2, 29],
] as const) {
  const slots = buildSlots(y, m);
  const counts: Record<string, number> = {};
  for (const s of slots) counts[s.platform] = (counts[s.platform] ?? 0) + 1;

  check(`${label}: instagram = 30`, counts.instagram === 30, String(counts.instagram));
  check(`${label}: linkedin = 30`, counts.linkedin === 30, String(counts.linkedin));
  check(`${label}: youtube long-form = 7`, counts.youtube === 7, String(counts.youtube));
  check(`${label}: all dates inside the month`,
    slots.every((s) => s.date.startsWith(`${y}-${String(m).padStart(2, "0")}`)));
  check(`${label}: no date past the month end`,
    slots.every((s) => Number(s.date.slice(8)) <= days));
  check(`${label}: weekday label matches the date`,
    slots.every((s) => {
      const [yy, mm, dd] = s.date.split("-").map(Number);
      return NAMES[new Date(yy, mm - 1, dd).getDay()] === s.day;
    }));
  check(`${label}: weeks are 1-5`, slots.every((s) => s.week >= 1 && s.week <= 5));
}

// Even spread, not all bunched at one end.
const sep = buildSlots(2026, 9).filter((s) => s.platform === "instagram");
const firstHalf = sep.filter((s) => Number(s.date.slice(8)) <= 15).length;
check("instagram spread is even across the month",
  firstHalf >= 13 && firstHalf <= 17, `${firstHalf} posts in the first half`);

const yt = buildSlots(2026, 9).filter((s) => s.platform === "youtube");
const gaps = yt.slice(1).map((s, i) => Number(s.date.slice(8)) - Number(yt[i].date.slice(8)));
check("youtube long-form is spaced out, not clustered",
  gaps.every((g) => g >= 3), `gaps: ${gaps.join(",")}`);

// spreadDays must never leave the month, even when over-subscribed.
check("spreadDays(30, 28) stays in range",
  spreadDays(30, 28).every((d) => d >= 1 && d <= 28));
check("spreadDays(30, 28) returns 30 entries", spreadDays(30, 28).length === 30);
check("spreadDays(0, 31) is empty", spreadDays(0, 31).length === 0);

check("shorts budget is 20", SHORTS_PER_MONTH === 20);
check("monthly volume matches the agreed cadence",
  MONTHLY_VOLUME.instagram === 30 &&
  MONTHLY_VOLUME.linkedin === 30 &&
  MONTHLY_VOLUME.youtube === 7);

// --- month status, for the banner's time cue ---
const aug26 = new Date(2026, 7, 26); // 26 Aug 2026
const cur = monthStatus(2026, 8, aug26);
check("current month reports days left",
  cur.kind === "current" && cur.daysLeft === 6,
  cur.kind === "current" ? `${cur.daysLeft} days` : cur.kind);
check("last day of the month reads 1",
  (() => { const s = monthStatus(2026, 8, new Date(2026, 7, 31)); return s.kind === "current" && s.daysLeft === 1; })());
check("earlier month is past", monthStatus(2026, 7, aug26).kind === "past");
check("later month is future", monthStatus(2026, 9, aug26).kind === "future");
check("previous year is past", monthStatus(2025, 12, aug26).kind === "past");
check("next year is future", monthStatus(2027, 1, aug26).kind === "future");
check("days until a future month is counted",
  (() => { const s = monthStatus(2026, 9, aug26); return s.kind === "future" && s.daysUntil === 6; })());
check("February in a leap year reports correctly",
  (() => { const s = monthStatus(2028, 2, new Date(2028, 1, 20)); return s.kind === "current" && s.daysLeft === 10; })());

const total = 30 + 30 + 7 + SHORTS_PER_MONTH;
console.log(`\nPlanned volume: IG 30, LinkedIn 30, YT 7 long-form + ${SHORTS_PER_MONTH} shorts = ${total} posts/month`);
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
