"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { describeApiError } from "@/lib/ai/client";
import { BudgetExceededError } from "@/lib/ai/budget";
import {
  RATE_LIMITS,
  rateLimit,
  rateLimitMessage,
} from "@/lib/auth/rate-limit";
import { requireStudioSession } from "@/lib/auth/guard";
import { logger } from "@/lib/observability/logger";
import { generateCalendar, regeneratePlatform } from "@/lib/social/agent";
import { gatherResearch, parseHandles } from "@/lib/social/insights";
import { store } from "@/lib/social/storage";
import { PLATFORMS, isProductionStage, type Platform } from "@/lib/social/types";
import { MONTH_ID } from "@/lib/social/validation";

/**
 * The Studio's write surface.
 *
 * Every action here follows the same three steps, in this order:
 *
 *   1. `requireStudioSession()` — before anything else, including reading the
 *      form. Server Actions are POST endpoints reachable by anyone who can
 *      reach the deployment; the route guard in proxy.ts does not cover them
 *      (Next.js documents this explicitly), so this is the real boundary.
 *   2. Validate the input. Everything in `FormData` is attacker-controlled.
 *   3. Do the work, and return a message rather than leaking an internal error.
 *
 * The two generate actions additionally consume rate limit and budget, because
 * each one spends real money.
 */

const MonthInputSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  brief: z.string().trim().max(4_000).optional(),
});

const ItemInputSchema = z.object({
  monthId: z.string().regex(MONTH_ID, "Invalid month."),
  itemId: z.string().min(1).max(200),
});

export interface ActionState {
  error?: string;
  ok?: boolean;
  /** Set on a successful generation, for the cost summary in the UI. */
  summary?: {
    costUsd: number;
    savedPercent: number;
    cacheHitRate: number;
    calls: number;
    durationMs: number;
  };
}

/** Back-compat alias: `GenerateState` was the previous exported name. */
export type GenerateState = ActionState;

/**
 * Maps a thrown error to a message safe to show a signed-in operator.
 *
 * Signed-in staff are trusted with detail, so real API messages come through —
 * but the mapping is explicit so an unexpected error type degrades to a generic
 * string rather than serialising a stack trace into the page.
 */
function toMessage(error: unknown, fallback: string): string {
  if (error instanceof BudgetExceededError) return error.message;
  const described = describeApiError(error);
  return described || fallback;
}

// ---------------------------------------------------------------------------
// Production tracking
// ---------------------------------------------------------------------------

export async function toggleProduction(formData: FormData): Promise<void> {
  const session = await requireStudioSession();

  const parsed = ItemInputSchema.safeParse({
    monthId: formData.get("monthId"),
    itemId: formData.get("itemId"),
  });
  if (!parsed.success) throw new Error("Invalid item reference.");

  const stage = String(formData.get("stage"));
  if (!isProductionStage(stage)) throw new Error(`Unknown stage: ${stage}`);

  const limit = await rateLimit(`mutate:${session.sub}`, RATE_LIMITS.mutate);
  if (!limit.allowed) throw new Error(rateLimitMessage(limit, "changes"));

  await store.setProduction(
    parsed.data.monthId,
    parsed.data.itemId,
    stage,
    formData.get("value") === "true",
  );
  revalidatePath("/studio");
}

export async function saveLiveLink(formData: FormData): Promise<void> {
  const session = await requireStudioSession();

  const parsed = ItemInputSchema.safeParse({
    monthId: formData.get("monthId"),
    itemId: formData.get("itemId"),
  });
  if (!parsed.success) throw new Error("Invalid item reference.");

  const limit = await rateLimit(`mutate:${session.sub}`, RATE_LIMITS.mutate);
  if (!limit.allowed) throw new Error(rateLimitMessage(limit, "changes"));

  // The store validates and normalises the URL — a `javascript:` link must
  // never reach the anchor this renders into.
  await store.setLiveLink(
    parsed.data.monthId,
    parsed.data.itemId,
    String(formData.get("link") ?? ""),
  );
  revalidatePath("/studio");
}

// ---------------------------------------------------------------------------
// Planning — the two actions that spend money
// ---------------------------------------------------------------------------

/**
 * Proves we can persist the result before spending anything on producing it.
 *
 * A month costs five model calls and several minutes. Discovering only at the
 * save that the host's filesystem is read-only — the default state of a Vercel
 * deployment with no DATABASE_URL — means paying in full for a plan that cannot
 * be kept. One cheap round trip up front turns that into a clear error and a
 * zero bill.
 *
 * For Postgres this also warms the pool and applies the schema, so the first
 * real save is not the first time we find out the database is unreachable.
 */
async function assertStorageWritable(): Promise<string | null> {
  try {
    await store.healthCheck();
    return null;
  } catch (err) {
    logger.error("studio.storage.unavailable", { error: err });
    return err instanceof Error
      ? err.message
      : "The calendar store is not writable, so a plan could not be saved.";
  }
}

/** Reads the research fields for one platform out of the form. */
function researchInput(formData: FormData, platform: Platform) {
  return {
    platform,
    ownHandle: String(formData.get(`${platform}Own`) ?? "").trim().slice(0, 200),
    competitors: parseHandles(
      String(formData.get(`${platform}Competitors`) ?? ""),
    ).slice(0, 10),
    notes: String(formData.get(`${platform}Notes`) ?? "").trim().slice(0, 4_000),
  };
}

export async function generateMonth(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireStudioSession();

  const parsed = MonthInputSchema.safeParse({
    year: formData.get("year"),
    month: formData.get("month"),
    brief: formData.get("brief") ?? undefined,
  });
  if (!parsed.success) return { error: "Pick a valid year and month." };

  const limit = await rateLimit(`generate:${session.sub}`, RATE_LIMITS.generate);
  if (!limit.allowed) {
    logger.warn("studio.generate.rate_limited", { sub: session.sub });
    return { error: rateLimitMessage(limit, "generation runs") };
  }

  const { year, month, brief } = parsed.data;

  // Before anything billable.
  const storageProblem = await assertStorageWritable();
  if (storageProblem) return { error: storageProblem };

  // Research is best-effort by design and already swallows its own failures;
  // this catch is the outer guarantee that it can never block a plan.
  const research = await gatherResearch(
    PLATFORMS.map((p) => researchInput(formData, p)),
  ).catch(() => ({}));

  try {
    const { calendar, report } = await generateCalendar({
      year,
      month,
      brief: brief || undefined,
      research,
    });
    await store.save(calendar);
    revalidatePath("/studio");
    return { ok: true, summary: summarise(report) };
  } catch (err) {
    logger.error("studio.generate.failed", { year, month, error: err });
    return { error: toMessage(err, "Generation failed.") };
  }
}

export async function replanPlatform(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireStudioSession();

  const parsed = MonthInputSchema.safeParse({
    year: formData.get("year"),
    month: formData.get("month"),
    brief: formData.get("brief") ?? undefined,
  });
  if (!parsed.success) return { error: "Pick a valid year and month." };

  const raw = String(formData.get("platform") ?? "");
  if (!PLATFORMS.includes(raw as Platform)) {
    return { error: `Unknown platform: ${raw}` };
  }
  const platform = raw as Platform;

  const limit = await rateLimit(`generate:${session.sub}`, RATE_LIMITS.generate);
  if (!limit.allowed) {
    logger.warn("studio.replan.rate_limited", { sub: session.sub, platform });
    return { error: rateLimitMessage(limit, "generation runs") };
  }

  const { year, month, brief } = parsed.data;
  const id = `${year}-${String(month).padStart(2, "0")}`;

  const calendar = await store.get(id);
  if (!calendar) {
    return {
      error: "This month has not been planned yet — plan the full month first.",
    };
  }

  // Reading worked; that does not mean writing will. Check before spending.
  const storageProblem = await assertStorageWritable();
  if (storageProblem) return { error: storageProblem };

  const research = await gatherResearch([
    researchInput(formData, platform),
  ]).catch(() => ({}));

  try {
    const { calendar: next, report } = await regeneratePlatform(
      calendar,
      platform,
      { brief: brief || undefined, research },
    );
    await store.save(next);
    revalidatePath("/studio");
    return { ok: true, summary: summarise(report) };
  } catch (err) {
    logger.error("studio.replan.failed", { id, platform, error: err });
    return { error: toMessage(err, "Re-plan failed.") };
  }
}

function summarise(report: {
  totalCostUsd: number;
  savedPercent: number;
  cacheHitRate: number;
  calls: unknown[];
  durationMs: number;
}): NonNullable<ActionState["summary"]> {
  return {
    costUsd: Number(report.totalCostUsd.toFixed(3)),
    savedPercent: report.savedPercent,
    cacheHitRate: report.cacheHitRate,
    calls: report.calls.length,
    durationMs: report.durationMs,
  };
}
