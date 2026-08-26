import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod";
import {
  BRAND,
  BUCKET_DEFINITIONS,
  CAPTION_SPEC,
  PLATFORM_STRATEGY,
  bucketsForPlatform,
  bucketTarget,
} from "./strategy";
import { mergeItems, ownedBy, byDateThenPlatform } from "./merge";
import {
  SHORTS_PER_MONTH,
  buildSlots,
  type Slot,
} from "./schedule";
import { BUCKETS, FORMATS, PLATFORMS } from "./types";
import type {
  CalendarMonth,
  ContentItem,
  Platform,
} from "./types";

const MODEL = "claude-opus-5";

/**
 * Claude Opus 5 list pricing, USD per million tokens.
 * Verify against https://claude.com/pricing — this is only used to print an
 * estimate in the server log, never to bill anything.
 */
const PRICE_PER_MTOK = { input: 5, output: 25 } as const;

export interface CallUsage {
  label: string;
  input: number;
  output: number;
}

function record(
  usage: CallUsage[],
  label: string,
  u: { input_tokens: number; output_tokens: number },
) {
  usage.push({ label, input: u.input_tokens, output: u.output_tokens });
}

function reportUsage(monthId: string, usage: CallUsage[]) {
  const inTok = usage.reduce((n, u) => n + u.input, 0);
  const outTok = usage.reduce((n, u) => n + u.output, 0);
  const cost =
    (inTok / 1e6) * PRICE_PER_MTOK.input + (outTok / 1e6) * PRICE_PER_MTOK.output;

  const rows = usage
    .map((u) => `  ${u.label.padEnd(14)} ${String(u.input).padStart(8)} in ${String(u.output).padStart(8)} out`)
    .join("\n");

  console.log(
    `[studio] ${monthId} — ${usage.length} call(s)\n${rows}\n` +
      `  ${"TOTAL".padEnd(14)} ${String(inTok).padStart(8)} in ${String(outTok).padStart(8)} out` +
      `  ≈ $${cost.toFixed(2)}`,
  );
}

const ThemeSchema = z.object({
  title: z.string(),
  rationale: z.string(),
  throughLine: z.string(),
  platformNotes: z.object({
    instagram: z.string(),
    linkedin: z.string(),
    youtube: z.string(),
  }),
});

const ItemSchema = z.object({
  bucket: z.enum(BUCKETS),
  format: z.enum(FORMATS),
  topic: z.string(),
  copy: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()),
  hook: z.string(),
  cta: z.string(),
  seoKeywords: z.array(z.string()),
  rationale: z.string(),
});

const PlatformPlanSchema = z.object({ items: z.array(ItemSchema) });

const ShortSchema = z.object({
  topic: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()),
  seoKeywords: z.array(z.string()),
});

const ShortsPlanSchema = z.object({ items: z.array(ShortSchema) });

function client() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local before generating a calendar.",
    );
  }
  return new Anthropic();
}

function brandContext(): string {
  const buckets = Object.values(BUCKET_DEFINITIONS)
    .map((b) => `- ${b.id} (${b.label}): ${b.purpose}`)
    .join("\n");

  return `# The brand
${BRAND.name} — ${BRAND.what}

Positioning: ${BRAND.positioning}
Voice: ${BRAND.voice}
Proof points: ${BRAND.proofPoints.join("; ")}

# Content buckets
${buckets}`;
}

const STRATEGIST_SYSTEM = `You are the creative strategist for ${BRAND.name}, not a social media copywriter.

The difference matters. A copywriter fills slots. A strategist decides what the month is ABOUT, picks fights worth picking, and builds ideas that compound into brand recall. Every idea you produce is judged on three axes:

1. REACH — will the algorithm and a stranger's thumb both reward this?
2. RECALL — a month later, would someone remember it came from Vedam? Recurring formats, a repeated visual device, and a consistent point of view beat one-off cleverness.
3. RETENTION — does it earn the next follow, the next watch, the next scroll-stop?

Hard rules:
- Ideas must be shootable by a small in-house team in a day. No drone shoots, no paid actors, no three-week productions. Constraint is the point: a repeatable format executed 12 times builds more recall than 12 beautiful one-offs.
- Be specific. "Talk about AI careers" is not an idea. "We asked 5 second-years to explain backpropagation to a first-year in 30 seconds, and graded them" is an idea.
- No education-marketing clichés. If a line could appear in any college's brochure, cut it.
- Build recurring, nameable formats that can run monthly. Name them.
- Vary the emotional register across the month — funny, useful, provocative, warm, honest. A month of one tone is a month people tune out.

${brandContext()}`;

export interface GenerateOptions {
  year: number;
  month: number;
  /** Optional extra direction from the team for this specific month. */
  brief?: string;
  /**
   * Research per platform (see insights.ts). Each platform's brief is fed into
   * that platform's own planning call; a digest of all of them informs the
   * month theme.
   */
  research?: Partial<Record<Platform, string>>;
}

function researchDigest(research: GenerateOptions["research"]): string {
  if (!research) return "";
  return Object.entries(research)
    .map(([platform, text]) => `### ${platform}\n${text}`)
    .join("\n\n");
}

async function planTheme(opts: GenerateOptions, usage: CallUsage[]) {
  const monthName = new Date(opts.year, opts.month - 1, 1).toLocaleString(
    "en-IN",
    { month: "long", year: "numeric" },
  );
  const digest = researchDigest(opts.research);

  const stream = client().messages.stream({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: zodOutputFormat(ThemeSchema) },
    system: STRATEGIST_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Decide the theme for ${monthName}.

Consider where this month sits in the Indian academic and admissions calendar — board exam season, results, counselling, admission deadlines, festivals, new-session starts — and let that shape what the audience actually cares about right now.

Give me:
- title: the month's theme, as something you'd actually say out loud. Not "Innovation Month".
- rationale: why THIS theme for THIS month, in terms of what the audience is going through.
- throughLine: the single idea every post ties back to.
- platformNotes: how the theme plays differently on Instagram vs LinkedIn vs YouTube, given their very different audiences.
${opts.brief ? `\nExtra direction from the team:\n${opts.brief}` : ""}
${digest ? `\nChannel and competitor research:\n${digest}` : ""}`,
      },
    ],
  });
  const response = await stream.finalMessage();

  if (!response.parsed_output) {
    throw new Error("The model did not return a usable month theme.");
  }
  record(usage, "theme", response.usage);
  return response.parsed_output;
}

async function planPlatform(
  platform: Platform,
  slots: Slot[],
  theme: z.infer<typeof ThemeSchema>,
  opts: GenerateOptions,
  usage: CallUsage[],
) {
  const strategy = PLATFORM_STRATEGY[platform];
  const research = opts.research?.[platform];
  // Each platform plans against its own bucket mix — the same bucket carries
  // very different weight for a Class 12 student and a working engineer.
  const mix = bucketsForPlatform(platform)
    .map((b) => {
      const target = bucketTarget(platform, b);
      const posts = Math.round((target / 100) * slots.length);
      return `- ${b} (${BUCKET_DEFINITIONS[b].label}): ~${target}% ≈ ${posts} post(s)`;
    })
    .join("\n");
  const slotList = slots
    .map((s, i) => `${i + 1}. ${s.date} (${s.day}, week ${s.week})`)
    .join("\n");

  const stream = client().messages.stream({
    model: MODEL,
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: zodOutputFormat(PlatformPlanSchema) },
    system: STRATEGIST_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Plan the full ${strategy.platform} month.

# This month's theme
${theme.title}
Through-line: ${theme.throughLine}
Why: ${theme.rationale}
On this platform: ${theme.platformNotes[platform]}

# Platform strategy
Audience: ${strategy.audience}
Where their head is at: ${strategy.audienceState}
Objective: ${strategy.objective}
Tone: ${strategy.toneShift}
How reach actually works here: ${strategy.reachMechanic}
Preferred formats: ${strategy.preferredFormats.join(", ")}
Never: ${strategy.avoid}

# Bucket mix for ${strategy.platform} — these are the ONLY buckets to use here
${mix}

# Slots to fill — return EXACTLY ${slots.length} items, in this order
${slotList}

For each slot give me:
- bucket: one of the bucket ids from the ${strategy.platform} mix above, and ONLY those. Hit the target counts as closely as the slot count allows.
- format: one of ${strategy.preferredFormats.join(", ")}.
- topic: the idea in one line. Specific enough that someone could shoot it without asking you a question.
- copy: the actual script or on-screen content. For a reel, the beat-by-beat. For a carousel, slide by slide. For a video, the outline. This is what the team executes against — write it like a brief, not a summary.
- caption: ${CAPTION_SPEC[platform]}
- hashtags: 5-10 that a real person or the algorithm would actually surface. No 30-tag spam.
- hook: the first line or first 3 seconds. This is the highest-leverage sentence in the whole post.
- cta: what you want them to do. Vary it — not every post asks for a DM.
- seoKeywords: the search terms this targets. On YouTube these must be real queries a Class 11/12 student types. Elsewhere they guide topic and caption wording.
- rationale: one line on why this earns reach, recall, or retention.

Build at least two recurring named formats that repeat through the month so the audience starts recognising them.
${opts.brief ? `\nExtra direction from the team:\n${opts.brief}` : ""}
${research ? `\n# Research for ${strategy.platform}\nUse this to pick topics and keywords that have evidence behind them, not guesses.\n${research}` : ""}`,
      },
    ],
  });
  const response = await stream.finalMessage();

  if (!response.parsed_output) {
    throw new Error(`The model did not return a usable ${platform} plan.`);
  }
  record(usage, platform, response.usage);
  return response.parsed_output.items;
}

/** Turns one platform's model output into stored rows against its slots. */
function assembleItems(
  monthId: string,
  platform: Platform,
  slots: Slot[],
  planned: z.infer<typeof ItemSchema>[],
): ContentItem[] {
  const items: ContentItem[] = [];

  slots.forEach((slot, i) => {
    const p = planned[i];
    // A short plan means the model returned fewer items than slots; skip the
    // tail rather than inventing filler or throwing away the whole month.
    if (!p) return;
    items.push({
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
    });
  });

  return items;
}

/**
 * Turns that month's Instagram reels into YouTube shorts.
 *
 * The point is that the team shoots once. The video asset is identical, so the
 * topic and script are carried over verbatim; only the title and the
 * description are rewritten, because YouTube is a search surface and Instagram
 * is a scroll surface. Shorts post on the same date as their source reel.
 */
async function repurposeReelsToShorts(
  monthId: string,
  reels: ContentItem[],
  usage: CallUsage[],
): Promise<ContentItem[]> {
  const chosen = reels.slice(0, SHORTS_PER_MONTH);
  if (chosen.length === 0) return [];

  const list = chosen
    .map((r, i) => `${i + 1}. ${r.topic}\n   Script: ${r.copy}`)
    .join("\n");

  const stream = client().messages.stream({
    model: MODEL,
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: zodOutputFormat(ShortsPlanSchema) },
    system: STRATEGIST_SYSTEM,
    messages: [
      {
        role: "user",
        content: `These ${chosen.length} Instagram reels are being reposted as YouTube Shorts. Same video, no reshoot.

${list}

For each, in the same order, return EXACTLY ${chosen.length} items:
- topic: the YouTube Shorts TITLE. Not the Instagram topic reworded — a title someone would actually search or tap on YouTube. Front-load the keyword. Under 70 characters.
- caption: ${CAPTION_SPEC.youtube.replace(/\n/g, " ")} Keep it proportionate to a Short — aim for the shorter end, and skip chapters since a Short has none.
- hashtags: 3-5 that work on YouTube Shorts specifically.
- seoKeywords: the real queries a Class 11 or 12 student types that this Short could surface for.`,
      },
    ],
  });
  const response = await stream.finalMessage();

  if (!response.parsed_output) {
    throw new Error("The model did not return usable YouTube Shorts.");
  }
  record(usage, "yt shorts", response.usage);

  const shorts: ContentItem[] = [];
  chosen.forEach((reel, i) => {
    const short = response.parsed_output!.items[i];
    // A short plan means fewer shorts, not a broken month.
    if (!short) return;
    shorts.push({
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
    });
  });
  return shorts;
}

/** Plans a whole month from scratch: one theme, then all three platforms. */
export async function generateCalendar(
  opts: GenerateOptions,
): Promise<CalendarMonth> {
  const id = `${opts.year}-${String(opts.month).padStart(2, "0")}`;
  const allSlots = buildSlots(opts.year, opts.month);
  const usage: CallUsage[] = [];
  const theme = await planTheme(opts, usage);

  // Platforms are independent once the theme is fixed — run them together.
  const perPlatform = await Promise.all(
    PLATFORMS.map(async (platform) => {
      const slots = allSlots.filter((s) => s.platform === platform);
      const planned = await planPlatform(platform, slots, theme, opts, usage);
      return assembleItems(id, platform, slots, planned);
    }),
  );

  const items = perPlatform.flat();
  // Shorts depend on the Instagram plan, so they run after it, not alongside.
  const reels = items.filter(
    (i) => i.platform === "instagram" && i.format === "reel",
  );
  const shorts = await repurposeReelsToShorts(id, reels, usage);
  reportUsage(id, usage);

  const now = new Date().toISOString();
  return {
    id,
    year: opts.year,
    month: opts.month,
    theme: {
      title: theme.title,
      rationale: theme.rationale,
      throughLine: theme.throughLine,
    },
    platformNotes: theme.platformNotes,
    items: [...items, ...shorts].sort(byDateThenPlatform),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Re-plans ONE platform inside an existing month.
 *
 * The month theme is reused, not regenerated, so the platform stays consistent
 * with the other two. Only this platform's rows are replaced — every other
 * platform's content and ticked boxes are left exactly as they were.
 */
export async function regeneratePlatform(
  calendar: CalendarMonth,
  platform: Platform,
  opts: Pick<GenerateOptions, "brief" | "research">,
): Promise<CalendarMonth> {
  const slots = buildSlots(calendar.year, calendar.month).filter(
    (s) => s.platform === platform,
  );

  const theme = {
    title: calendar.theme.title,
    rationale: calendar.theme.rationale,
    throughLine: calendar.theme.throughLine,
    platformNotes: calendar.platformNotes,
  };

  const usage: CallUsage[] = [];
  const planned = await planPlatform(platform, slots, theme, {
    year: calendar.year,
    month: calendar.month,
    ...opts,
  }, usage);

  const fresh = assembleItems(calendar.id, platform, slots, planned);

  // Re-planning Instagram invalidates the shorts cut from its reels, so they
  // are re-derived here rather than left pointing at rows that no longer exist.
  const shorts =
    platform === "instagram"
      ? await repurposeReelsToShorts(
          calendar.id,
          fresh.filter((i) => i.format === "reel"),
          usage,
        )
      : [];

  reportUsage(`${calendar.id} (${platform})`, usage);

  return {
    ...calendar,
    items: mergeItems(calendar, ownedBy(platform), [...fresh, ...shorts]),
    updatedAt: new Date().toISOString(),
  };
}
