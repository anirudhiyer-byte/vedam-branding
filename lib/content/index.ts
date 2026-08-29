/**
 * All site copy, in one place, so it can be edited without touching layout.
 *
 * Split three ways by how trustworthy each kind of content is:
 *
 *   site.ts       — identity, navigation, the studio sub-brand
 *   programme.ts  — what the school teaches and how (claims Vedam makes)
 *   pending.ts    — projects, quotes, stats, profiles: real-world facts only
 *                   Vedam can supply, empty until then, and never rendered
 *                   while empty
 */
export { site, studio, nav, siteUrl } from "./site";
export {
  hero,
  pillars,
  journey,
  curriculumAreas,
  admissions,
} from "./programme";
export {
  projects,
  testimonials,
  stats,
  socialProfiles,
  partners,
  contentGaps,
  type StudentProject,
  type Testimonial,
  type Stat,
  type SocialProfile,
} from "./pending";
