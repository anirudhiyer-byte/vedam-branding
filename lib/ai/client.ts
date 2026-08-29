import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";

/**
 * Anthropic client construction and retry policy.
 *
 * The SDK already retries connection errors, 429s and 5xxs twice. That is left
 * on, and the retry loop here sits *above* it for the failures the SDK cannot
 * see: a response that arrives intact but whose structured output failed to
 * parse. Retrying those is worth one extra attempt and no more — if the model
 * cannot produce the schema twice, a third try is just spend.
 */

export class MissingApiKeyError extends Error {
  readonly status = 503;
  constructor() {
    super(
      "ANTHROPIC_API_KEY is not set, so calendars cannot be planned. " +
        "Add it to .env.local (or the deployment's environment) and retry.",
    );
    this.name = "MissingApiKeyError";
  }
}

let cached: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) throw new MissingApiKeyError();

  cached ??= new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    // A month plan is several minutes of streamed generation. The SDK default
    // is ten minutes; this leaves headroom for the largest platform call
    // without letting a hung connection occupy a worker indefinitely.
    timeout: 15 * 60 * 1000,
    maxRetries: 2,
  });
  return cached;
}

/** Test seam: drops the memoised client so a new key takes effect. */
export function resetAnthropicClient(): void {
  cached = null;
}

export interface RetryOptions {
  /** Total attempts, including the first. */
  attempts?: number;
  /** Base delay for exponential backoff, in milliseconds. */
  baseDelayMs?: number;
  label: string;
}

/** Errors worth a second attempt: transient transport and capacity problems. */
function isRetryable(error: unknown): boolean {
  if (error instanceof Anthropic.APIConnectionError) return true;
  if (error instanceof Anthropic.RateLimitError) return true;
  if (error instanceof Anthropic.APIError) {
    return error.status !== undefined && error.status >= 500;
  }
  // A parse failure from the structured-output helper: the call succeeded but
  // the payload did not validate. Worth exactly one more try.
  return error instanceof UnusableOutputError;
}

/** The model returned a response that did not match the requested schema. */
export class UnusableOutputError extends Error {
  constructor(what: string) {
    super(`The model did not return a usable ${what}.`);
    this.name = "UnusableOutputError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs `fn`, retrying transient failures with exponential backoff and jitter.
 *
 * Jitter matters here because the three platform calls run concurrently: on a
 * 429 they would otherwise all back off in lockstep and collide again.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  { attempts = 3, baseDelayMs = 1_000, label }: RetryOptions,
): Promise<{ value: T; attempts: number }> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return { value: await fn(attempt), attempts: attempt };
    } catch (error) {
      lastError = error;

      if (attempt === attempts || !isRetryable(error)) throw error;

      const backoff = baseDelayMs * 2 ** (attempt - 1);
      const delay = backoff + Math.random() * backoff * 0.3;
      logger.warn("ai.retrying", {
        label,
        attempt,
        of: attempts,
        delayMs: Math.round(delay),
        error,
      });
      await sleep(delay);
    }
  }

  throw lastError;
}

/** Turns SDK errors into messages a non-engineer can act on. */
export function describeApiError(error: unknown): string {
  if (error instanceof MissingApiKeyError) return error.message;

  if (error instanceof Anthropic.AuthenticationError) {
    return "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "The Anthropic API is rate limiting us. Wait a minute and retry.";
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return "Could not reach the Anthropic API. Check the network and retry.";
  }
  if (error instanceof Anthropic.BadRequestError) {
    return `The Anthropic API rejected the request: ${error.message}`;
  }
  if (error instanceof Anthropic.APIError) {
    return `The Anthropic API returned an error (${error.status ?? "unknown"}): ${error.message}`;
  }
  if (error instanceof Error) return error.message;
  return "Generation failed for an unknown reason.";
}
