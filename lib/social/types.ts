/**
 * Domain model for the Vedam social media calendar.
 *
 * The shape mirrors the team's existing sheet (Theme / Week / Day / Date /
 * Bucket / Format / Topic / Copy / Caption / Shoot / Edit / Posted / Live Link)
 * and adds the fields the agent needs to reason about reach and recall.
 */

export const PLATFORMS = ["instagram", "linkedin", "youtube"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const FORMATS = [
  "reel",
  "static",
  "carousel",
  "story",
  "short",
  "long_form_video",
  "live",
] as const;
export type Format = (typeof FORMATS)[number];

export const BUCKETS = [
  "admissions_program",
  "student_life",
  "learn_tech",
  "proof_outcomes",
  "faculty_mentors",
  "industry_career",
  "founder_pov",
  "trend_culture",
  "community_ugc",
  "behind_the_build",
] as const;
export type Bucket = (typeof BUCKETS)[number];

/** The three production checkboxes the team ticks off in the dashboard. */
export interface Production {
  shoot: boolean;
  edit: boolean;
  posted: boolean;
}

export interface ContentItem {
  id: string;
  /** ISO date, e.g. "2026-09-14". */
  date: string;
  /** "Monday" ... "Sunday" — derived from date, stored for sheet parity. */
  day: string;
  /** 1-indexed week within the month. */
  week: number;
  platform: Platform;
  bucket: Bucket;
  format: Format;
  topic: string;
  /** The script / on-screen content brief the team shoots against. */
  copy: string;
  /** The caption as it will be pasted into the platform. */
  caption: string;
  hashtags: string[];
  /** First 3 seconds — the single biggest lever on reach. */
  hook: string;
  cta: string;
  /** Keywords this post is optimised for (SEO on YouTube, SMO elsewhere). */
  seoKeywords: string[];
  /** Why this post exists, in strategy terms. Kept for review, not for posting. */
  rationale: string;
  production: Production;
  liveLink: string | null;
  /**
   * Set on YouTube shorts that are the same asset as an Instagram reel. Points
   * at that reel's id so the team knows this is a repost, not a second shoot.
   */
  derivedFrom?: string | null;
}

export interface MonthlyTheme {
  title: string;
  rationale: string;
  /** The thread that ties every post in the month back to one idea. */
  throughLine: string;
}

export interface CalendarMonth {
  /** "2026-09" — also the storage key. */
  id: string;
  year: number;
  /** 1-indexed. */
  month: number;
  theme: MonthlyTheme;
  /** Platform-level notes the agent produced for this month. */
  platformNotes: Record<Platform, string>;
  items: ContentItem[];
  createdAt: string;
  updatedAt: string;
}

export type ProductionStage = keyof Production;

export function isProductionStage(v: string): v is ProductionStage {
  return v === "shoot" || v === "edit" || v === "posted";
}
