import * as z from "zod";
import { BUCKETS, FORMATS, PLATFORMS } from "./types";
import type { CalendarMonth } from "./types";

/**
 * Runtime validation for stored calendars.
 *
 * The previous storage layer cast parsed JSON straight to `CalendarMonth`,
 * which made the type a statement of intent rather than a fact: a hand-edited
 * file, a partial write, or a row written by an older version of the schema
 * would flow through the app as a well-typed value and fail somewhere far from
 * the cause. Validating at the boundary turns that into one clear error at the
 * point of reading.
 */

export const MONTH_ID = /^\d{4}-(0[1-9]|1[0-2])$/;

export const ProductionSchema = z.object({
  shoot: z.boolean(),
  edit: z.boolean(),
  posted: z.boolean(),
});

export const ContentItemSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected an ISO date"),
  day: z.string().min(1),
  week: z.number().int().min(1).max(6),
  platform: z.enum(PLATFORMS),
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
  production: ProductionSchema,
  liveLink: z.string().nullable(),
  derivedFrom: z.string().nullable().optional(),
});

export const MonthlyThemeSchema = z.object({
  title: z.string(),
  rationale: z.string(),
  throughLine: z.string(),
});

export const CalendarMonthSchema = z.object({
  id: z.string().regex(MONTH_ID, "expected a month id like 2026-09"),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  theme: MonthlyThemeSchema,
  platformNotes: z.object({
    instagram: z.string(),
    linkedin: z.string(),
    youtube: z.string(),
  }),
  items: z.array(ContentItemSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export class InvalidCalendarError extends Error {
  constructor(id: string, issues: string) {
    super(`Stored calendar ${id} is not valid:\n${issues}`);
    this.name = "InvalidCalendarError";
  }
}

/** Parses untrusted JSON into a calendar, or explains exactly what is wrong. */
export function parseCalendar(id: string, raw: unknown): CalendarMonth {
  const result = CalendarMonthSchema.safeParse(raw);
  if (!result.success) {
    throw new InvalidCalendarError(
      id,
      result.error.issues
        .slice(0, 10)
        .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("\n"),
    );
  }
  return result.data as CalendarMonth;
}

/**
 * Guards every path built from a month id.
 *
 * Storage keys arrive from query strings, so `../../etc/passwd` has to be
 * impossible by construction rather than by convention.
 */
export function assertMonthId(id: string): string {
  if (!MONTH_ID.test(id)) {
    throw new Error(`Invalid calendar id: ${JSON.stringify(id)}`);
  }
  return id;
}

/** A live link must be an http(s) URL — the cell renders it as an anchor. */
export function normaliseLiveLink(link: string | null): string | null {
  const trimmed = link?.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("That does not look like a URL. Paste the full link.");
  }
  // Rejects javascript: and data:, which would otherwise become a live href.
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Live links must start with http:// or https://");
  }
  return url.toString();
}
