/**
 * Launch-readiness report for site content.
 *
 * Sections backed by real-world facts render nothing while empty, so the site
 * is always honest — but "honest" and "finished" are different things, and
 * this is what tells them apart.
 *
 *   npm run check:content
 */
import { contentGaps } from "../lib/content/pending.ts";

const gaps = contentGaps();

if (gaps.length === 0) {
  console.log("All content slots are filled. Nothing is hidden.");
  process.exit(0);
}

console.log(
  `${gaps.length} section(s) are hidden because they have no real content yet.\n` +
    "This is intended behaviour, not a bug: nothing fabricated is rendered.\n",
);

for (const gap of gaps) {
  console.log(`  ${gap.section.padEnd(14)} ${gap.detail}`);
}

console.log("\nFill these in lib/content/pending.ts to turn each section on.");
// Not a failure: an unfinished site is a normal pre-launch state, and failing
// here would make the check useless in CI.
