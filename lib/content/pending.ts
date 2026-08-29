/**
 * Content that only Vedam can supply.
 *
 * This file is the answer to the single largest class of finding in the audit:
 * the homepage shipped eight fictional client names, four fabricated case
 * studies, an invented testimonial attributed to a named person who does not
 * exist, and three unverifiable statistics — all rendering as fact, with
 * nothing on the page telling a visitor otherwise.
 *
 * Deleting that data was necessary but not sufficient, because the next person
 * to fill these arrays would have had exactly the same choice: leave a section
 * empty, or invent something to fill it. So the shape enforces the rule instead
 * of a comment asking for it.
 *
 * **Every array below is empty, and every section that reads one renders
 * nothing while it is empty.** There is no placeholder mode, no sample data,
 * and no "coming soon" panel. A section appears the moment it has real content
 * and not one commit before.
 *
 * `npm run check:content` reports what is still empty, so launch readiness is
 * something you can see rather than something you have to remember.
 */

export interface StudentProject {
  /** URL segment for the project's own page: /build/<slug>. */
  slug: string;
  title: string;
  /** Who built it — a cohort, a team, or named students who agreed to it. */
  builders: string;
  summary: string;
  /** e.g. "Computer Vision, Systems". */
  discipline: string;
  year: string;
  /**
   * Two brand token names for the card gradient, e.g. ["night", "violet"].
   * Token names rather than raw hex, so a palette change in globals.css
   * carries here instead of leaving these four cards behind.
   */
  gradient: readonly [string, string];
  /** Optional real image. Cards fall back to the gradient panel without one. */
  image?: { src: string; alt: string; width: number; height: number };
}

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

export interface Stat {
  value: string;
  label: string;
  /** Where the number comes from. Required — an unsourced stat is a claim. */
  source: string;
}

export interface SocialProfile {
  label: string;
  href: string;
}

/**
 * Student and studio projects, rendered in the Build section.
 *
 * Each entry also becomes a real page at `/build/<slug>`. The previous cards
 * all linked to `#build` — the section they were already inside — so clicking
 * one did nothing.
 */
export const projects: readonly StudentProject[] = [];

/**
 * Real quotes from real people who agreed to be quoted.
 * Names and roles are published, so consent is not optional.
 */
export const testimonials: readonly Testimonial[] = [];

/** Numbers Vedam can stand behind, each with a stated source. */
export const stats: readonly Stat[] = [];

/**
 * Vedam's actual profiles.
 *
 * The previous links pointed at `https://instagram.com`, `https://linkedin.com`
 * and `https://are.na` — platform homepages, not Vedam's pages.
 */
export const socialProfiles: readonly SocialProfile[] = [];

/** Organisations Vedam genuinely works with, for the partner strip. */
export const partners: readonly string[] = [];

/** What is still missing before launch. Drives `npm run check:content`. */
export function contentGaps(): { section: string; detail: string }[] {
  const gaps: { section: string; detail: string }[] = [];

  if (projects.length === 0) {
    gaps.push({
      section: "Build",
      detail:
        "No student or studio projects. The Build section and every /build/* " +
        "route are hidden until at least one is added.",
    });
  }
  if (testimonials.length === 0) {
    gaps.push({
      section: "Testimonials",
      detail: "No quotes. The testimonial section is hidden.",
    });
  }
  if (stats.length === 0) {
    gaps.push({
      section: "Hero stats",
      detail: "No sourced statistics. The hero stat strip is hidden.",
    });
  }
  if (socialProfiles.length === 0) {
    gaps.push({
      section: "Footer",
      detail:
        "No social profile URLs. The footer shows email only, which is " +
        "correct until the real handles are confirmed.",
    });
  }
  if (partners.length === 0) {
    gaps.push({
      section: "Partners",
      detail: "No partner organisations. The partner strip is hidden.",
    });
  }

  return gaps;
}
