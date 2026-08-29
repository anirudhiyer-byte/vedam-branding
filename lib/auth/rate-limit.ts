/**
 * Fixed-window rate limiting for the two things worth protecting: failed
 * logins (password guessing) and calendar generation (billed model calls).
 *
 * The default backend is process-local. That is honest about what it can do:
 * with N app instances the effective limit is N × the configured one, and a
 * restart clears the counters. It is still worth having — it turns an
 * unbounded scripted attack into a slow one, and it stops a stuck client from
 * looping a generate request into a large bill. When the app runs on more than
 * one instance, swap in a shared backend via `setRateLimitStore`; nothing else
 * changes.
 */

export interface RateLimitDecision {
  allowed: boolean;
  /** Requests still available in the current window. */
  remaining: number;
  /** When the current window resets, ms since epoch. */
  resetAt: number;
  /** Seconds until the caller may retry. Zero when allowed. */
  retryAfterSeconds: number;
}

export interface RateLimitRule {
  /** Requests permitted per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitStore {
  /** Increments the counter for `key` and returns the new count and reset. */
  hit(key: string, windowMs: number, now: number): Promise<{
    count: number;
    resetAt: number;
  }>;
  reset(key: string): Promise<void>;
}

interface Window {
  count: number;
  resetAt: number;
}

class MemoryRateLimitStore implements RateLimitStore {
  private windows = new Map<string, Window>();
  /** Sweeps expired windows so a stream of unique keys cannot grow unbounded. */
  private lastSweep = 0;

  async hit(key: string, windowMs: number, now: number) {
    this.sweep(now);

    const existing = this.windows.get(key);
    if (!existing || existing.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowMs };
      this.windows.set(key, fresh);
      return { ...fresh };
    }

    existing.count += 1;
    return { ...existing };
  }

  async reset(key: string) {
    this.windows.delete(key);
  }

  private sweep(now: number) {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(key);
    }
  }
}

let store: RateLimitStore = new MemoryRateLimitStore();

/** Replaces the backend — e.g. with Redis once the app runs multi-instance. */
export function setRateLimitStore(next: RateLimitStore): void {
  store = next;
}

export async function rateLimit(
  key: string,
  rule: RateLimitRule,
  now: number = Date.now(),
): Promise<RateLimitDecision> {
  const { count, resetAt } = await store.hit(key, rule.windowMs, now);
  const allowed = count <= rule.limit;

  return {
    allowed,
    remaining: Math.max(0, rule.limit - count),
    resetAt,
    retryAfterSeconds: allowed ? 0 : Math.ceil((resetAt - now) / 1000),
  };
}

/** Clears a key — called on a successful login so one typo isn't punished. */
export async function clearRateLimit(key: string): Promise<void> {
  await store.reset(key);
}

/**
 * The rules, in one place so they can be read and reasoned about together.
 *
 * `generate` is deliberately tight: a single run is several large model calls,
 * so the limit is about spend, not about load.
 */
export const RATE_LIMITS = {
  login: { limit: 8, windowMs: 15 * 60 * 1000 },
  generate: { limit: 6, windowMs: 60 * 60 * 1000 },
  mutate: { limit: 240, windowMs: 60 * 1000 },
} as const satisfies Record<string, RateLimitRule>;

/** Human-readable message for a refused request. */
export function rateLimitMessage(
  decision: RateLimitDecision,
  subject: string,
): string {
  const minutes = Math.ceil(decision.retryAfterSeconds / 60);
  const wait =
    decision.retryAfterSeconds < 90
      ? `${decision.retryAfterSeconds} seconds`
      : `${minutes} minute${minutes === 1 ? "" : "s"}`;
  return `Too many ${subject}. Try again in about ${wait}.`;
}
