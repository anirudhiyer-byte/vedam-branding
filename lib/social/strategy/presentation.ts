import type { Bucket, Format, Platform } from "../types";
import { BUCKET_DEFINITIONS } from "./buckets";

/**
 * Display-only mappings: labels and colours. Kept apart from the strategy
 * itself so a copy tweak in the dashboard never risks changing what the
 * strategist is briefed with.
 */

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
 * A colour per bucket, from the brand's primary and secondary palettes.
 *
 * CONTRAST RULE — this is the one that keeps getting broken, so it is stated
 * where the colours live rather than in a doc nobody opens:
 *
 *   These are GRAPHIC colours. Use them for dots, bars, rules, and as a tint
 *   mixed into the page background. Never as text colour on a light surface.
 *
 * Vedams Orange is 2.50:1 on white — it fails WCAG AA for text by a wide
 * margin, and half of this palette is in the same range. Text sitting on a
 * tinted chip must be `--color-ink`; the tint carries the identity, the ink
 * carries the legibility. `npm run check:contrast` enforces both halves.
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

/**
 * Inline styles for a bucket chip: the hue as a tint and a border, with text
 * left to inherit `--color-ink`.
 *
 * Exists so that no call site has to re-derive the tint percentages — the two
 * places that hand-rolled this drifted, and one of them ended up rendering
 * orange text on white.
 */
export function bucketChipStyle(bucket: Bucket, tint = 16) {
  const color = BUCKET_COLOR[bucket];
  return {
    backgroundColor: `color-mix(in oklab, ${color} ${tint}%, var(--color-paper))`,
    borderColor: `color-mix(in oklab, ${color} 45%, var(--color-paper))`,
  };
}

/** Per-platform gradient, used on the tab cards (a fill, never text). */
export const PLATFORM_GRADIENT: Record<Platform, string> = {
  instagram: "linear-gradient(135deg, #f97d03 0%, #e80074 100%)",
  linkedin: "linear-gradient(135deg, #8a18ff 0%, #1d1856 100%)",
  youtube: "linear-gradient(135deg, #e80074 0%, #c200db 100%)",
};
