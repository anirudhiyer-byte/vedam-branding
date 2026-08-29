import * as z from "zod";
import { BUCKETS, FORMATS } from "../types";

/**
 * The shapes the model is constrained to return.
 *
 * These are enforced by the API through structured outputs rather than
 * checked after the fact, so a plan either arrives in this shape or the call
 * fails — there is no "mostly right" branch to handle downstream.
 */

export const ThemeSchema = z.object({
  title: z.string(),
  rationale: z.string(),
  throughLine: z.string(),
  platformNotes: z.object({
    instagram: z.string(),
    linkedin: z.string(),
    youtube: z.string(),
  }),
});
export type PlannedTheme = z.infer<typeof ThemeSchema>;

export const ItemSchema = z.object({
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
export type PlannedItem = z.infer<typeof ItemSchema>;

export const PlatformPlanSchema = z.object({ items: z.array(ItemSchema) });

export const ShortSchema = z.object({
  topic: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()),
  seoKeywords: z.array(z.string()),
});
export type PlannedShort = z.infer<typeof ShortSchema>;

export const ShortsPlanSchema = z.object({ items: z.array(ShortSchema) });
