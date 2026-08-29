import {
  BRAND,
  BUCKET_DEFINITIONS,
  CAPTION_SPEC,
  PLATFORM_LABEL,
  PLATFORM_STRATEGY,
  bucketTarget,
  bucketsForPlatform,
} from "../strategy";
import { PLATFORMS, type Platform } from "../types";
import type { Slot } from "../schedule";
import type { PlannedTheme } from "./schemas";

/**
 * Every prompt string the pipeline sends, built by pure functions.
 *
 * Separated from the calls themselves for two reasons. First, prompts are the
 * part most worth testing, and a pure `string` return is trivial to assert on —
 * the suite checks that the cached system prompt is byte-identical between
 * calls, which is the invariant the whole caching strategy rests on and the one
 * that breaks silently. Second, prompt edits are content changes, and content
 * changes should not sit inside orchestration code.
 */

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

/**
 * The full platform playbook, in the cached prefix rather than in each user
 * prompt.
 *
 * This is deliberate placement, not padding. Every platform's strategy and
 * caption specification is identical on every call and every month, so it is
 * exactly the content prompt caching is for. Repeating one platform's slice in
 * each user message — as this pipeline used to — meant paying full input price
 * for it three times a run, forever, while leaving the shared prefix short
 * enough (~1,000 tokens) to fall under Sonnet 5's 1,024-token minimum and not
 * cache at all.
 *
 * Moving it here does both jobs at once: it takes the prefix comfortably past
 * every model's minimum, and it removes those tokens from the volatile suffix.
 */
function platformPlaybook(): string {
  const sections = PLATFORMS.map((platform) => {
    const s = PLATFORM_STRATEGY[platform];
    return `## ${PLATFORM_LABEL[platform]}
Audience: ${s.audience}
Where their head is at: ${s.audienceState}
Objective: ${s.objective}
Tone: ${s.toneShift}
How reach actually works here: ${s.reachMechanic}
Preferred formats: ${s.preferredFormats.join(", ")}
Never: ${s.avoid}
Caption spec: ${CAPTION_SPEC[platform]}`;
  }).join("\n\n");

  return `# The three platforms
These are three different audiences, not one audience in three places. Treat them as such.

${sections}`;
}

/**
 * The shared system prompt. This is the cached prefix.
 *
 * It MUST be byte-identical on every call — the whole prompt-caching saving
 * depends on it. Nothing derived from the date, the month being planned, the
 * platform, or the run may appear here; all of that belongs in the user
 * message, after the cache breakpoint. Computed once at module load so it
 * cannot accidentally vary between calls in a run.
 */
export const STRATEGIST_SYSTEM = `You are the creative strategist for ${BRAND.name}, not a social media copywriter.

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

${brandContext()}

${platformPlaybook()}`;

export interface PromptContext {
  year: number;
  month: number;
  /** Optional extra direction from the team for this specific month. */
  brief?: string;
  research?: Partial<Record<Platform, string>>;
}

export function monthName(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function researchDigest(research: PromptContext["research"]): string {
  if (!research) return "";
  // Sorted so two runs with the same research produce the same bytes.
  return Object.entries(research)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([platform, text]) => `### ${platform}\n${text}`)
    .join("\n\n");
}

export function themePrompt(ctx: PromptContext): string {
  const digest = researchDigest(ctx.research);

  return `Decide the theme for ${monthName(ctx.year, ctx.month)}.

Consider where this month sits in the Indian academic and admissions calendar — board exam season, results, counselling, admission deadlines, festivals, new-session starts — and let that shape what the audience actually cares about right now.

Give me:
- title: the month's theme, as something you'd actually say out loud. Not "Innovation Month".
- rationale: why THIS theme for THIS month, in terms of what the audience is going through.
- throughLine: the single idea every post ties back to.
- platformNotes: how the theme plays differently on Instagram vs LinkedIn vs YouTube, given their very different audiences.
${ctx.brief ? `\nExtra direction from the team:\n${ctx.brief}` : ""}
${digest ? `\nChannel and competitor research:\n${digest}` : ""}`;
}

export function platformPlanPrompt(
  platform: Platform,
  slots: Slot[],
  theme: PlannedTheme,
  ctx: PromptContext,
): string {
  const strategy = PLATFORM_STRATEGY[platform];
  const research = ctx.research?.[platform];

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

  return `Plan the full ${strategy.platform} month.

# This month's theme
${theme.title}
Through-line: ${theme.throughLine}
Why: ${theme.rationale}
On this platform: ${theme.platformNotes[platform]}

Apply the ${strategy.platform} section of the platform playbook above — its audience, objective, tone, reach mechanic, preferred formats, and caption spec.

# Bucket mix for ${strategy.platform} — these are the ONLY buckets to use here
${mix}

# Slots to fill — return EXACTLY ${slots.length} items, in this order
${slotList}

For each slot give me:
- bucket: one of the bucket ids from the ${strategy.platform} mix above, and ONLY those. Hit the target counts as closely as the slot count allows.
- format: one of ${strategy.preferredFormats.join(", ")}.
- topic: the idea in one line. Specific enough that someone could shoot it without asking you a question.
- copy: the actual script or on-screen content. For a reel, the beat-by-beat. For a carousel, slide by slide. For a video, the outline. This is what the team executes against — write it like a brief, not a summary.
- caption: follow the ${strategy.platform} caption spec in the playbook above, exactly.
- hashtags: 5-10 that a real person or the algorithm would actually surface. No 30-tag spam.
- hook: the first line or first 3 seconds. This is the highest-leverage sentence in the whole post.
- cta: what you want them to do. Vary it — not every post asks for a DM.
- seoKeywords: the search terms this targets. On YouTube these must be real queries a Class 11/12 student types. Elsewhere they guide topic and caption wording.
- rationale: one line on why this earns reach, recall, or retention.

Build at least two recurring named formats that repeat through the month so the audience starts recognising them.
${ctx.brief ? `\nExtra direction from the team:\n${ctx.brief}` : ""}
${research ? `\n# Research for ${strategy.platform}\nUse this to pick topics and keywords that have evidence behind them, not guesses.\n${research}` : ""}`;
}

export function shortsPrompt(
  reels: { topic: string; copy: string }[],
): string {
  const list = reels
    .map((r, i) => `${i + 1}. ${r.topic}\n   Script: ${r.copy}`)
    .join("\n");

  return `These ${reels.length} Instagram reels are being reposted as YouTube Shorts. Same video, no reshoot.

${list}

For each, in the same order, return EXACTLY ${reels.length} items:
- topic: the YouTube Shorts TITLE. Not the Instagram topic reworded — a title someone would actually search or tap on YouTube. Front-load the keyword. Under 70 characters.
- caption: ${CAPTION_SPEC.youtube.replace(/\n/g, " ")} Keep it proportionate to a Short — aim for the shorter end, and skip chapters since a Short has none.
- hashtags: 3-5 that work on YouTube Shorts specifically.
- seoKeywords: the real queries a Class 11 or 12 student types that this Short could surface for.`;
}
