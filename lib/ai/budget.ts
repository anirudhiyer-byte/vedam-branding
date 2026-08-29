import { env } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";

/**
 * A hard ceiling on estimated model spend per calendar month.
 *
 * This exists because the failure mode it prevents is expensive and quiet: a
 * retry loop, a stuck client, or an over-eager teammate re-planning the same
 * month twelve times produces no error at all — just an invoice. The cap is
 * checked before a run starts *and* between calls inside a run, so a single
 * run cannot blow through it either.
 *
 * The ledger is process-local, which means the cap is per-instance rather than
 * global. That is stated plainly rather than hidden: implement `BudgetStore`
 * against a shared table and call `setBudgetStore` to make it authoritative
 * across instances.
 */

export interface BudgetStore {
  /** Total estimated USD recorded for `monthKey` ("2026-08"). */
  spentFor(monthKey: string): Promise<number>;
  /** Adds to the running total for `monthKey`. */
  add(monthKey: string, usd: number): Promise<void>;
}

class MemoryBudgetStore implements BudgetStore {
  private totals = new Map<string, number>();

  async spentFor(monthKey: string) {
    return this.totals.get(monthKey) ?? 0;
  }

  async add(monthKey: string, usd: number) {
    this.totals.set(monthKey, (this.totals.get(monthKey) ?? 0) + usd);
  }
}

let store: BudgetStore = new MemoryBudgetStore();

export function setBudgetStore(next: BudgetStore): void {
  store = next;
}

export function currentMonthKey(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Raised when a run would exceed the configured ceiling. */
export class BudgetExceededError extends Error {
  readonly status = 429;
  constructor(
    readonly spentUsd: number,
    readonly limitUsd: number,
  ) {
    super(
      `This month's model budget is spent: about $${spentUsd.toFixed(2)} of ` +
        `the $${limitUsd.toFixed(2)} AI_MONTHLY_BUDGET_USD ceiling. ` +
        "Raise the limit or wait for the next calendar month.",
    );
    this.name = "BudgetExceededError";
  }
}

export interface BudgetStatus {
  enabled: boolean;
  limitUsd: number | null;
  spentUsd: number;
  remainingUsd: number | null;
}

export async function budgetStatus(now = new Date()): Promise<BudgetStatus> {
  const limitUsd = env.AI_MONTHLY_BUDGET_USD ?? null;
  const spentUsd = await store.spentFor(currentMonthKey(now));

  return {
    enabled: limitUsd !== null,
    limitUsd,
    spentUsd,
    remainingUsd: limitUsd === null ? null : Math.max(0, limitUsd - spentUsd),
  };
}

/**
 * Throws if the budget is already spent.
 *
 * `pendingUsd` lets a run in progress include what it has spent so far but not
 * yet committed, so the check between calls sees the true running total.
 */
export async function assertWithinBudget(
  pendingUsd = 0,
  now = new Date(),
): Promise<void> {
  const limitUsd = env.AI_MONTHLY_BUDGET_USD;
  if (limitUsd === undefined) return;

  const committed = await store.spentFor(currentMonthKey(now));
  const total = committed + pendingUsd;
  if (total >= limitUsd) throw new BudgetExceededError(total, limitUsd);
}

/** Commits a completed run's spend against the monthly total. */
export async function recordSpend(usd: number, now = new Date()): Promise<void> {
  if (usd <= 0) return;

  const monthKey = currentMonthKey(now);
  await store.add(monthKey, usd);

  const limitUsd = env.AI_MONTHLY_BUDGET_USD;
  if (limitUsd === undefined) return;

  const spent = await store.spentFor(monthKey);
  // Warn on the way up rather than only at the wall, so the team has notice.
  if (spent >= limitUsd * 0.8) {
    logger.warn("studio.budget.threshold", {
      monthKey,
      spentUsd: Number(spent.toFixed(2)),
      limitUsd,
      percentUsed: Math.round((spent / limitUsd) * 100),
    });
  }
}
