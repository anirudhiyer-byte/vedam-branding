/**
 * Writes a SAMPLE calendar so the dashboard can be reviewed without an API key.
 * Hand-written placeholder content, not model output — regenerate the month
 * from the Studio for real strategist output.
 *
 *   npm run seed:sample -- 2026 9
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { SHORTS_PER_MONTH, buildSlots } from "../lib/social/schedule.ts";

const year = Number(process.argv[2] ?? 2026);
const month = Number(process.argv[3] ?? 9);
const id = `${year}-${String(month).padStart(2, "0")}`;

type Idea = readonly [string, string, string, string];

const IDEAS: Record<string, readonly Idea[]> = {
  instagram: [
    ["learn_tech", "reel", "Explain It To A First-Year: backpropagation in 30s", "Second-years explain a hard concept to a first-year. Timer on screen. Cut to the first-year's face when they lose the plot."],
    ["trend_culture", "reel", "POV: your code compiles on the first try", "Trending audio. Single take in the lab. Cut on the beat."],
    ["student_life", "carousel", "What the Vedam lab looks like at 2am", "Six slides shot on a phone: the whiteboard, the cold coffee, the GPU rack, someone asleep on a beanbag."],
    ["proof_outcomes", "reel", "A first-year built this in week six", "Screen recording of the demo, then the student explaining what they knew before starting: nothing."],
    ["admissions_program", "static", "The CS & AI curriculum, one page", "Flat design, no stock photos. Semester grid with the project shipped each term."],
    ["learn_tech", "reel", "One line of Python that breaks your model", "Screen recording. The bug, the symptom, the fix. Under 40 seconds."],
    ["community_ugc", "reel", "Student takeover: a Tuesday at Vedam", "Handed the phone to a second-year for a day. Unedited, vertical, no script."],
    ["faculty_mentors", "carousel", "Our compilers course is taught by someone who shipped one", "Five slides: who they are, what they built, why it matters for your placement."],
    ["industry_career", "reel", "The AI job nobody is applying for", "Talking head, one claim, one number, one instruction."],
    ["trend_culture", "reel", "Rating first-year project ideas out of 10", "Fast cuts, honest scores, one genuinely great idea at the end."],
  ],
  linkedin: [
    ["founder_pov", "static", "We stopped asking for JEE ranks. Here's what happened.", "First line lands before the fold. Specific numbers, one uncomfortable admission, a question at the end."],
    ["industry_career", "carousel", "The AI jobs nobody is hiring for in 2026", "Document post. One claim per slide, sourced. Ends on what to learn instead."],
    ["faculty_mentors", "static", "Why we hire faculty who have shipped, not just published", "First person, one specific war story, one hiring principle."],
    ["proof_outcomes", "carousel", "What a first-year portfolio should look like by month six", "Six slides of real student work with the brief that produced it."],
    ["learn_tech", "carousel", "The five CS fundamentals every AI role still tests", "Teaching post. Concrete, no fluff, saveable."],
    ["behind_the_build", "static", "What we got wrong in our first admissions cycle", "Honest retrospective. Three mistakes, what changed."],
  ],
  youtube: [
    ["industry_career", "long_form_video", "Is B.Tech in AI actually worth it in 2026? An honest answer", "12 min. Salary data, the oversupply problem, who should NOT do this. Chapters: 00:00 the honest version, 02:10 the salary data, 05:40 who this is wrong for, 09:00 what to do instead."],
    ["admissions_program", "long_form_video", "What after 12th PCM: every path, ranked by regret", "Whiteboard explainer against a real high-volume search query. Chapters per path."],
    ["learn_tech", "long_form_video", "Build your first neural network from scratch (no libraries)", "Screen recording, full build, runs at the end. Chapters per stage."],
    ["proof_outcomes", "long_form_video", "We asked our first-years to ship in 6 weeks. Here's what they built", "Project showcase with the students explaining trade-offs."],
    ["student_life", "long_form_video", "A full day at Vedam, unedited", "Single-camera follow of one student, 6am to midnight."],
    ["faculty_mentors", "long_form_video", "A compilers engineer explains what college got wrong", "Long-form interview, one chapter per claim."],
    ["industry_career", "long_form_video", "CS vs CS-AI: which degree actually gets hired?", "Comparison video targeting a high-intent query. Chapters per criterion."],
  ],
};

function caption(platform: string, topic: string): string {
  if (platform === "instagram") {
    return `[SAMPLE] ${topic}\nThe part nobody explains until your third semester.\n\nLink in bio for the CS & AI curriculum.`;
  }
  if (platform === "linkedin") {
    return `[SAMPLE] ${topic}\n\nMost engineering schools answer this with a brochure. We'd rather answer it with numbers.\n\nWhen we looked at our own cohort, the students who moved fastest weren't the ones who arrived with the highest entrance rank. They were the ones who had already broken something and fixed it.\n\nThat changed how we run first year. Less lecturing, more shipping. Every semester ends with something that runs.\n\nIt is not a comfortable way to teach. It is a very good way to learn.\n\nIf you hire early-career engineers: what actually predicts whether a fresher works out on your team?\n\n#engineering #AI #hiring`;
  }
  return `[SAMPLE] ${topic} — an honest answer for Class 11 and 12 students deciding on B.Tech CS & AI in India.\n\nThis video covers what the brochures skip: what the course actually contains, which roles it leads to, what the salary data really says, and who should pick something else instead. Useful whether or not you ever apply to Vedam.\n\n00:00 The honest version\n02:10 What the syllabus really covers\n05:40 Who this is wrong for\n09:00 What to do instead\n\nVedam School of Technology offers a B.Tech in Computer Science & Artificial Intelligence. Learn tech by building it.\n\nadmissions, btech cs ai, best ai college india, what after 12th pcm`;
}

const slots = buildSlots(year, month);
const seen: Record<string, number> = {};

const items = slots.map((slot, i) => {
  const pool = IDEAS[slot.platform];
  const n = seen[slot.platform] ?? 0;
  seen[slot.platform] = n + 1;
  const [bucket, format, topic, copy] = pool[n % pool.length];
  const done = i < slots.length * 0.3;

  return {
    id: `${id}-${slot.platform}-${n}`,
    date: slot.date, day: slot.day, week: slot.week,
    platform: slot.platform, bucket, format, topic, copy,
    caption: caption(slot.platform, topic),
    hashtags: ["vedam", "btechcse", "aiengineering", "collegelife", "class12"],
    hook: topic,
    cta: "Link in bio for the CS & AI curriculum.",
    seoKeywords: ["btech cs ai", "best ai college india", "what after 12th pcm"],
    rationale: "Sample row — seeded locally so the dashboard renders without an API key.",
    production: { shoot: done, edit: done && i % 2 === 0, posted: done && i % 3 === 0 },
    liveLink: null,
    derivedFrom: null,
  };
});

// Shorts mirror that month's Instagram reels — same asset, YouTube-shaped copy.
const reels = items.filter((i) => i.platform === "instagram" && i.format === "reel");
const shorts = reels.slice(0, SHORTS_PER_MONTH).map((reel, i) => ({
  ...reel,
  id: `${id}-youtube-short-${i}`,
  platform: "youtube" as const,
  format: "short" as const,
  topic: `${reel.topic} | CS & AI explained`,
  caption: `[SAMPLE] ${reel.topic} — explained in under a minute for Class 11 and 12 students looking at B.Tech CS & AI.\n\nbtech cs ai, ai engineering, what after 12th pcm, best ai college india`,
  hashtags: ["shorts", "btechcsai", "aiengineering"],
  seoKeywords: ["btech cs ai", "ai engineering explained", "what after 12th pcm"],
  rationale: `Same asset as the Instagram reel "${reel.topic}" — shot once, posted twice.`,
  production: { shoot: false, edit: false, posted: false },
  liveLink: null,
  derivedFrom: reel.id,
}));

const all = [...items, ...shorts].sort(
  (a, b) => a.date.localeCompare(b.date) || a.platform.localeCompare(b.platform),
);

const calendar = {
  id, year, month,
  theme: {
    title: "[SAMPLE] Build Something That Runs",
    rationale: "Placeholder theme so the dashboard has something to render. Regenerate the month in the Studio for real strategist output.",
    throughLine: "Every post shows something being built, not something being claimed.",
  },
  platformNotes: {
    instagram: "[SAMPLE] Peer-to-peer, sound-on, hook in the first second.",
    linkedin: "[SAMPLE] Practitioner voice, opinion before the fold, a real question at the end.",
    youtube: "[SAMPLE] Search-led titles, honest answers, useful to non-applicants.",
  },
  items: all,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

mkdirSync("data/calendars", { recursive: true });
writeFileSync(`data/calendars/${id}.json`, JSON.stringify(calendar, null, 2));

const by = (p: string) => all.filter((i) => i.platform === p).length;
console.log(`Wrote data/calendars/${id}.json`);
console.log(`  Instagram ${by("instagram")} · LinkedIn ${by("linkedin")} · YouTube ${by("youtube")} (${shorts.length} shorts repurposed) = ${all.length}`);
