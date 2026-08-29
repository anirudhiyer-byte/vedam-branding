import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type * as z from "zod";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";
import { assertWithinBudget } from "./budget";
import { UnusableOutputError, anthropic, withRetry } from "./client";
import { modelFor, type ModelSpec, type ModelStage, type TokenUsage } from "./models";
import type { UsageLedger } from "./usage";

/**
 * One structured, cached, budgeted, retried model call.
 *
 * Every call in the pipeline goes through here, which is what makes the cost
 * work real rather than aspirational:
 *
 *  - **Prompt caching.** The strategist brief is the same ~2k tokens on every
 *    call in a run and every run in a month. Marked cacheable, it is billed at
 *    ~10% on re-read instead of full price.
 *  - **Capability gating.** `effort` and adaptive thinking are only sent to
 *    models that accept them, so the pipeline can mix Opus, Sonnet and Haiku
 *    without a per-stage special case at the call site.
 *  - **Budget enforcement.** Checked before each call, not only per run, so a
 *    run cannot overshoot the ceiling by the size of its largest call.
 *  - **Usage capture.** Cached reads and writes are recorded separately from
 *    fresh input, because a collapsed number cannot tell you the cache broke.
 */

/**
 * The cache TTL.
 *
 * Five minutes, deliberately. A run's calls start within seconds of each other
 * and every read refreshes the entry's timer, so the 5-minute window stays warm
 * for the whole run and for the re-plans that typically follow. The 1-hour TTL
 * doubles the write premium to buy a gap this workload does not have.
 */
const CACHE_TTL = "5m" as const;

export interface StructuredCallOptions<S extends z.ZodType> {
  /** Short name for logs and the cost table. */
  label: string;
  stage: ModelStage;
  /**
   * The stable prefix, byte-identical across every call that shares it. This
   * is the part that gets cached, so nothing volatile — no timestamps, no run
   * ids, no per-month text — may appear in it.
   */
  systemPrompt: string;
  /** The volatile part. Goes after the cache breakpoint. */
  userPrompt: string;
  schema: S;
  maxTokens: number;
  /** Passed only to models that accept it. */
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  ledger: UsageLedger;
}

function readUsage(usage: Anthropic.Usage): TokenUsage {
  return {
    input: usage.input_tokens ?? 0,
    output: usage.output_tokens ?? 0,
    cacheRead: usage.cache_read_input_tokens ?? 0,
    cacheWrite: usage.cache_creation_input_tokens ?? 0,
  };
}

/**
 * Builds the `system` field.
 *
 * The whole brief is a single text block with one `cache_control` breakpoint
 * at its end. One block, one breakpoint: splitting the brief into sections
 * would create several prefixes that each have to clear the model's minimum
 * cacheable length independently.
 *
 * Caching is skipped when the model's minimum is out of reach, since a marker
 * below the minimum is accepted, does nothing, and reports nothing.
 */
function buildSystem(
  spec: ModelSpec,
  systemPrompt: string,
): Anthropic.TextBlockParam[] {
  const cacheable =
    !env.AI_DISABLE_PROMPT_CACHE &&
    estimateTokens(systemPrompt) >= spec.capabilities.minCacheableTokens;

  return [
    {
      type: "text",
      text: systemPrompt,
      ...(cacheable
        ? { cache_control: { type: "ephemeral" as const, ttl: CACHE_TTL } }
        : {}),
    },
  ];
}

/**
 * Rough token estimate, used only to decide whether marking a prefix cacheable
 * can possibly pay off.
 *
 * ~3.6 characters per token is slightly *generous* for English prose (the real
 * ratio is nearer 4), so this over-estimates. That is the safe direction here,
 * because the two errors are not symmetric: marking a prefix that turns out to
 * be too short is free — the API silently declines to cache it, with no error
 * and no write premium — whereas failing to mark one that would have cached
 * costs full input price on every call, forever.
 *
 * The estimate is only ever consulted near the boundary. The strategist prefix
 * is ~2,000 tokens, well clear of Opus 5's 512 and Sonnet 5's 1,024 minimums
 * under either ratio, and `tests/ai.test.ts` fails if it ever drifts under.
 */
export function estimateTokens(text: string): number {
  return Math.floor(text.length / 3.6);
}

/** Assembles the request, sending each model only what it accepts. */
function buildRequest<S extends z.ZodType>(
  spec: ModelSpec,
  opts: StructuredCallOptions<S>,
): Anthropic.MessageStreamParams {
  const { capabilities } = spec;

  const outputConfig: Record<string, unknown> = {
    format: zodOutputFormat(opts.schema),
  };
  // Haiku 4.5 rejects `effort` outright rather than ignoring it.
  if (capabilities.effort && opts.effort) outputConfig.effort = opts.effort;

  return {
    model: spec.id,
    max_tokens: opts.maxTokens,
    // Adaptive thinking is Claude 4.6+; older models take the deprecated
    // `budget_tokens` shape, which this pipeline does not need — the stage
    // routed to Haiku is a mechanical rewrite, not a reasoning task.
    ...(capabilities.adaptiveThinking
      ? { thinking: { type: "adaptive" as const } }
      : {}),
    output_config: outputConfig,
    system: buildSystem(spec, opts.systemPrompt),
    messages: [{ role: "user", content: opts.userPrompt }],
  } as Anthropic.MessageStreamParams;
}

/**
 * Runs one structured call and returns the parsed result.
 *
 * Streaming is used for every call, not as an optimisation but because these
 * requests carry large `max_tokens` values and a non-streaming request at that
 * size risks an HTTP timeout well before the model is finished.
 */
export async function runStructuredCall<S extends z.ZodType>(
  opts: StructuredCallOptions<S>,
): Promise<z.infer<S>> {
  const spec = modelFor(opts.stage);

  if (!spec.capabilities.structuredOutputs) {
    throw new Error(
      `Model ${spec.id} is configured for the ${opts.stage} stage but does ` +
        "not support structured outputs, which this pipeline requires.",
    );
  }

  // Between-call check: a run must not walk past the ceiling one call at a
  // time. `ledger.spentUsd` is this run's uncommitted spend so far.
  await assertWithinBudget(opts.ledger.spentUsd);

  const startedAt = Date.now();

  const { value, attempts } = await withRetry(
    async () => {
      const stream = anthropic().messages.stream(buildRequest(spec, opts));
      const response = await stream.finalMessage();

      const usage = readUsage(response.usage);

      if (response.stop_reason === "max_tokens") {
        // Silently truncated output would be assembled into a short month with
        // no indication anything was lost.
        logger.warn("ai.output_truncated", {
          label: opts.label,
          model: spec.id,
          maxTokens: opts.maxTokens,
        });
      }

      const parsed = (response as { parsed_output?: unknown }).parsed_output;
      if (parsed == null) throw new UnusableOutputError(opts.label);

      return { parsed: parsed as z.infer<S>, usage };
    },
    { label: opts.label },
  );

  opts.ledger.record({
    label: opts.label,
    stage: opts.stage,
    model: spec,
    usage: value.usage,
    durationMs: Date.now() - startedAt,
    attempts,
  });

  return value.parsed;
}
