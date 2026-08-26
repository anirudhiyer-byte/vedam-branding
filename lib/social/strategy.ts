import type { Bucket, Format, Platform } from "./types";

/**
 * The standing strategy brief. This is the agent's "who we are and who we're
 * talking to" context — edit this file to change how every future calendar
 * gets planned, rather than re-explaining it in a prompt each month.
 */

export const BRAND = {
  name: "Vedam School of Technology",
  shortName: "Vedam",
  what: "An engineering school offering B.Tech in Computer Science & Artificial Intelligence.",
  positioning:
    "Not another private engineering college. A school built by people who actually build — where you learn AI by shipping, not by memorising.",
  voice:
    "Direct, warm, a little irreverent. Talks to students like capable adults, never talks down. Confident without being boastful. Zero corporate education-speak — no 'holistic learning journey', no 'nurturing young minds'.",
  proofPoints: [
    "CS & AI curriculum built around building real projects",
    "Faculty and mentors who have shipped in industry",
    "Small cohorts, high contact time",
  ],
} as const;

export interface PlatformStrategy {
  platform: Platform;
  audience: string;
  audienceState: string;
  objective: string;
  toneShift: string;
  preferredFormats: Format[];
  postsPerWeek: number;
  reachMechanic: string;
  avoid: string;
}

export const PLATFORM_STRATEGY: Record<Platform, PlatformStrategy> = {
  instagram: {
    platform: "instagram",
    audience:
      "Class 11 and 12 students actively looking at B.Tech admissions (CS & AI), plus students already inside tech/engineering programmes. Secondary: parents who lurk and influence the decision.",
    audienceState:
      "Anxious and comparison-shopping. Scrolling at night. Deciding between many colleges that all look identical in a brochure. They trust peers and vibes far more than they trust institutions.",
    objective:
      "Reach and brand recall first, admissions enquiry second. If they cannot name Vedam unprompted by month three, the content failed.",
    toneShift:
      "Peer-to-peer. Fast, visual, funny where earned. Sound-on, hook in the first second.",
    preferredFormats: ["reel", "carousel", "static", "story"],
    postsPerWeek: 5,
    reachMechanic:
      "Reels drive discovery; carousels drive saves and shares. Optimise the first 3 seconds and the cover frame. Trending audio only when it does not undercut credibility.",
    avoid:
      "Formal announcements, cropped press releases, stock photos of students pointing at laptops, motivational quote cards.",
  },
  linkedin: {
    platform: "linkedin",
    audience:
      "Tech professionals, and especially people who recently entered tech — freshers, career switchers, early-career engineers. Students are largely NOT here.",
    audienceState:
      "Building credibility, hungry for signal about what actually matters in AI/CS careers. Receptive to strong opinions from people who have built things.",
    objective:
      "Institutional credibility and employer/mentor pull. Make industry people respect the school so students inherit that respect second-hand.",
    toneShift:
      "First-person POV, opinionated, specific. Written like a practitioner, not a marketing department.",
    preferredFormats: ["static", "carousel"],
    postsPerWeek: 3,
    reachMechanic:
      "Text-led posts with a strong first line before the 'see more' fold. Documents/carousels for teaching. Comments are where the reach compounds — every post needs a question worth answering.",
    avoid:
      "Reposting Instagram reels verbatim, hashtag spam, 'thrilled to announce', engagement-bait polls.",
  },
  youtube: {
    platform: "youtube",
    audience:
      "Class 11 and 12 students researching B.Tech and CS/AI admissions — the same people as Instagram, but in active research mode rather than passive scroll mode.",
    audienceState:
      "Searching with intent: 'is CS AI worth it', 'best btech ai colleges', 'what after 12th pcm'. They will watch 12 minutes if the answer is honest.",
    objective:
      "Search capture and deep trust. YouTube is the only platform here with real long-tail SEO — a good video keeps pulling admissions traffic for years.",
    toneShift:
      "Honest, unhurried, genuinely useful even to someone who never applies to Vedam.",
    preferredFormats: ["long_form_video", "short"],
    postsPerWeek: 2,
    reachMechanic:
      "Title and thumbnail carry most of the weight. Target real search queries in the title. Shorts feed the main channel and capture the same scroll behaviour as Reels.",
    avoid:
      "Campus tour videos with drone footage and no narration, uncut seminar recordings, anything that only makes sense if you already know Vedam.",
  },
};

export interface BucketDefinition {
  id: Bucket;
  label: string;
  purpose: string;
  /** Rough share of a month's posts, as a percentage. Should total ~100. */
  targetShare: number;
}

export const BUCKET_DEFINITIONS: Record<Bucket, BucketDefinition> = {
  learn_tech: {
    id: "learn_tech",
    label: "Learn Tech",
    purpose:
      "Actually teach something — an AI concept, a CS fundamental, a coding trick. This is the save-and-share engine and the main reason a non-applicant follows.",
    targetShare: 20,
  },
  student_life: {
    id: "student_life",
    label: "Student Life",
    purpose:
      "Campus culture, hostel, clubs, fests, day-in-the-life. Sells the feeling of being there, which is what actually decides a 17-year-old.",
    targetShare: 15,
  },
  proof_outcomes: {
    id: "proof_outcomes",
    label: "Proof & Outcomes",
    purpose:
      "Student projects, placements, internships, alumni. Evidence that the promise is real. Answers the parent in the room.",
    targetShare: 12,
  },
  industry_career: {
    id: "industry_career",
    label: "Industry & Career",
    purpose:
      "What is happening in AI/tech, career paths, honest salary and skill-demand reality. Positions Vedam as the one telling the truth.",
    targetShare: 12,
  },
  admissions_program: {
    id: "admissions_program",
    label: "Admissions & Program",
    purpose:
      "Curriculum, eligibility, fees, deadlines, how to apply. Necessary, but it converts only because the other buckets earned attention first.",
    targetShare: 10,
  },
  trend_culture: {
    id: "trend_culture",
    label: "Trend & Culture",
    purpose:
      "Meme-jacking, trending audio, relatable student humour. Pure reach play — cheap to make, disproportionate discovery.",
    targetShare: 10,
  },
  faculty_mentors: {
    id: "faculty_mentors",
    label: "Faculty & Mentors",
    purpose:
      "Who teaches, what they built before, their opinions. Turns an institution into a set of people worth learning from.",
    targetShare: 8,
  },
  founder_pov: {
    id: "founder_pov",
    label: "Founder POV",
    purpose:
      "Opinionated takes on engineering education and AI. LinkedIn-heavy. The highest-leverage brand-recall asset the school has.",
    targetShare: 6,
  },
  community_ugc: {
    id: "community_ugc",
    label: "Community & UGC",
    purpose:
      "Student takeovers, testimonials, parent voices. Borrowed credibility — reads as true in a way brand-shot content never does.",
    targetShare: 4,
  },
  behind_the_build: {
    id: "behind_the_build",
    label: "Behind the Build",
    purpose:
      "Building the school itself — the philosophy, the decisions, why Vedam exists. Narrative spine for people who follow long-term.",
    targetShare: 3,
  },
};

export const BUCKET_LABEL: Record<Bucket, string> = Object.fromEntries(
  Object.values(BUCKET_DEFINITIONS).map((b) => [b.id, b.label]),
) as Record<Bucket, string>;

export const FORMAT_LABEL: Record<Format, string> = {
  reel: "Reel",
  static: "Static",
  carousel: "Carousel",
  story: "Story",
  short: "Short",
  long_form_video: "Long-form video",
  live: "Live",
};

export const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  youtube: "YouTube",
};

/**
 * Target bucket mix, per platform, as percentages of that platform's own month.
 *
 * These replace a single global mix: the same bucket should carry very
 * different weight on each platform, because the audiences are different
 * people. Student life sells the school to a 17-year-old on Instagram and is
 * noise to a fresher on LinkedIn. Each column sums to 100; a bucket omitted
 * from a platform is deliberately not planned there.
 */
export const PLATFORM_BUCKET_MIX: Record<
  Platform,
  Partial<Record<Bucket, number>>
> = {
  instagram: {
    student_life: 20,
    learn_tech: 18,
    trend_culture: 16,
    proof_outcomes: 12,
    admissions_program: 10,
    community_ugc: 8,
    faculty_mentors: 6,
    industry_career: 6,
    behind_the_build: 4,
  },
  linkedin: {
    founder_pov: 24,
    industry_career: 24,
    faculty_mentors: 16,
    proof_outcomes: 16,
    learn_tech: 10,
    behind_the_build: 10,
  },
  youtube: {
    industry_career: 25,
    admissions_program: 22,
    learn_tech: 22,
    student_life: 12,
    proof_outcomes: 11,
    faculty_mentors: 8,
  },
};

/** The share this bucket should hold on this platform, or 0 if unplanned there. */
export function bucketTarget(platform: Platform, bucket: Bucket): number {
  return PLATFORM_BUCKET_MIX[platform][bucket] ?? 0;
}

/** Buckets this platform actually plans against, richest first. */
export function bucketsForPlatform(platform: Platform): Bucket[] {
  return (
    Object.entries(PLATFORM_BUCKET_MIX[platform]) as [Bucket, number][]
  )
    .sort((a, b) => b[1] - a[1])
    .map(([bucket]) => bucket);
}

/**
 * A colour per bucket, drawn from the brand's primary + secondary palettes.
 *
 * These are used as solid dots/bars and as light tint chips (mixed with the
 * page background at render time), so the text on a chip is always ink and
 * stays readable no matter how vivid the hue is.
 */
export const BUCKET_COLOR: Record<Bucket, string> = {
  learn_tech: "#8a18ff", // Electric Violet
  student_life: "#f97d03", // Vedams Orange
  trend_culture: "#e80074", // Red-Purple
  proof_outcomes: "#00cfe5", // Dark Turquoise
  industry_career: "#c200db", // Vivid Mulberry
  admissions_program: "#2b135c", // Vedams Violet
  faculty_mentors: "#1d1856", // Space Cadet
  founder_pov: "#0c0931", // Cetacean Blue
  community_ugc: "#ff9e1b", // Amber, derived from Vedams Orange
  behind_the_build: "#00a3b8", // Deep teal, derived from Dark Turquoise
};

/** Shorthand the team already thinks in. */
export const FORMAT_EMOJI: Record<Format, string> = {
  reel: "🎬",
  static: "🖼️",
  carousel: "🎠",
  story: "⚡",
  short: "⏱️",
  long_form_video: "📺",
  live: "🔴",
};

export const PLATFORM_EMOJI: Record<Platform, string> = {
  instagram: "📸",
  linkedin: "💼",
  youtube: "▶️",
};

/** Per-platform gradient, used on the tab cards. */
export const PLATFORM_GRADIENT: Record<Platform, string> = {
  instagram: "linear-gradient(135deg, #f97d03 0%, #e80074 100%)",
  linkedin: "linear-gradient(135deg, #8a18ff 0%, #1d1856 100%)",
  youtube: "linear-gradient(135deg, #e80074 0%, #c200db 100%)",
};

/**
 * What a caption actually has to be on each platform. These differ enough that
 * a single "write a caption" instruction produces the wrong artefact twice out
 * of three times.
 */
export const CAPTION_SPEC: Record<Platform, string> = {
  instagram: `TWO LINES, maximum. Line one earns the stop, line two lands the point. Then a clear CTA on its own line ("Link in bio", "Comment AI and we'll send it", "Save this for counselling season"). Total under 300 characters before hashtags. No paragraphs, no essay, no emoji spam. Write it exactly as it will be pasted.`,

  linkedin: `A LONG post, 150-300 words, formatted for the feed. Open with a single-sentence hook that lands before the "see more" fold. Then short paragraphs of one to three lines each, separated by blank lines — never a wall of text. Use a specific number, name, or concrete detail early. Close with a genuine question that a practitioner would actually want to answer in the comments. No hashtag walls: three at most, at the very end.`,

  youtube: `A YOUTUBE DESCRIPTION, not a caption. 150-250 words. The first two lines are what shows above the fold in search results, so front-load the primary keyword there naturally. Then a fuller paragraph covering what the video answers, written for someone typing that query. Then a timestamped chapter list (00:00 style) matching the outline in the copy field. Then a short line about Vedam and admissions. Keywords appear naturally throughout — this is the SEO surface for the whole channel, so it carries more weight than any caption elsewhere.`,
};

/** Where each platform's profile lives, for the "open our channel" links. */
export const PLATFORM_URL: Record<Platform, string> = {
  // TODO: replace with Vedam's real profile URLs before the team uses this.
  instagram: "https://www.instagram.com/vedamschooloftechnology/",
  linkedin: "https://www.linkedin.com/school/vedam-school-of-technology/",
  youtube: "https://www.youtube.com/@vedamschooloftechnology",
};
