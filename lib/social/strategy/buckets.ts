import type { Bucket, Platform } from "../types";

/**
 * Content buckets: the ten kinds of post this brand makes, and what each one
 * is for. A bucket without a stated purpose becomes a label nobody applies
 * consistently, so every definition says what job the post does.
 */
export interface BucketDefinition {
  id: Bucket;
  label: string;
  purpose: string;
}

export const BUCKET_DEFINITIONS: Record<Bucket, BucketDefinition> = {
  learn_tech: {
    id: "learn_tech",
    label: "Learn Tech",
    purpose:
      "Actually teach something — an AI concept, a CS fundamental, a coding trick. This is the save-and-share engine and the main reason a non-applicant follows.",
  },
  student_life: {
    id: "student_life",
    label: "Student Life",
    purpose:
      "Campus culture, hostel, clubs, fests, day-in-the-life. Sells the feeling of being there, which is what actually decides a 17-year-old.",
  },
  proof_outcomes: {
    id: "proof_outcomes",
    label: "Proof & Outcomes",
    purpose:
      "Student projects, placements, internships, alumni. Evidence that the promise is real. Answers the parent in the room.",
  },
  industry_career: {
    id: "industry_career",
    label: "Industry & Career",
    purpose:
      "What is happening in AI/tech, career paths, honest salary and skill-demand reality. Positions Vedam as the one telling the truth.",
  },
  admissions_program: {
    id: "admissions_program",
    label: "Admissions & Program",
    purpose:
      "Curriculum, eligibility, fees, deadlines, how to apply. Necessary, but it converts only because the other buckets earned attention first.",
  },
  trend_culture: {
    id: "trend_culture",
    label: "Trend & Culture",
    purpose:
      "Meme-jacking, trending audio, relatable student humour. Pure reach play — cheap to make, disproportionate discovery.",
  },
  faculty_mentors: {
    id: "faculty_mentors",
    label: "Faculty & Mentors",
    purpose:
      "Who teaches, what they built before, their opinions. Turns an institution into a set of people worth learning from.",
  },
  founder_pov: {
    id: "founder_pov",
    label: "Founder POV",
    purpose:
      "Opinionated takes on engineering education and AI. LinkedIn-heavy. The highest-leverage brand-recall asset the school has.",
  },
  community_ugc: {
    id: "community_ugc",
    label: "Community & UGC",
    purpose:
      "Student takeovers, testimonials, parent voices. Borrowed credibility — reads as true in a way brand-shot content never does.",
  },
  behind_the_build: {
    id: "behind_the_build",
    label: "Behind the Build",
    purpose:
      "Building the school itself — the philosophy, the decisions, why Vedam exists. Narrative spine for people who follow long-term.",
  },
};

/**
 * Target bucket mix per platform, as percentages of that platform's own month.
 *
 * Per-platform rather than global because the same bucket carries very
 * different weight for different audiences: Student Life sells the school to a
 * 17-year-old on Instagram and is noise to a fresher on LinkedIn. A bucket
 * omitted from a platform is deliberately not planned there.
 *
 * Each column must sum to 100 — `npm run check:slots` asserts it, so a bad
 * edit here fails a check rather than quietly skewing a month.
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

/** The share this bucket should hold on this platform, or 0 if unplanned. */
export function bucketTarget(platform: Platform, bucket: Bucket): number {
  return PLATFORM_BUCKET_MIX[platform][bucket] ?? 0;
}

/** Buckets this platform actually plans against, richest first. */
export function bucketsForPlatform(platform: Platform): Bucket[] {
  return (Object.entries(PLATFORM_BUCKET_MIX[platform]) as [Bucket, number][])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([bucket]) => bucket);
}
