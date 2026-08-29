import { env } from "@/lib/config/env";

/**
 * Model registry: what each model costs, and what it will actually accept.
 *
 * The second half matters more than it looks. Request parameters are not
 * uniform across the family — `output_config.effort` is rejected outright by
 * Haiku 4.5, adaptive thinking is Claude 4.6+ only, and the minimum prefix
 * length that can be cached differs by a factor of eight between models. Send
 * the wrong combination and you get either a 400 or, worse, silent non-caching
 * that shows up only as a larger bill.
 *
 * Encoding those facts once, here, is what lets the call layer stay a single
 * code path while the pipeline mixes three different models.
 */

export interface ModelPricing {
  /** USD per million input tokens. */
  input: number;
  /** USD per million output tokens. */
  output: number;
}

export interface ModelCapabilities {
  /** Accepts `output_config.effort`. Haiku 4.5 errors on it. */
  effort: boolean;
  /** Accepts `thinking: { type: "adaptive" }`. Claude 4.6+ only. */
  adaptiveThinking: boolean;
  /** Accepts `output_config.format` (structured outputs). */
  structuredOutputs: boolean;
  /**
   * Smallest prefix, in tokens, that the API will actually cache. Below this a
   * `cache_control` marker is accepted and silently does nothing — no error,
   * no cache entry, no saving.
   */
  minCacheableTokens: number;
}

export interface ModelSpec {
  id: string;
  label: string;
  pricing: ModelPricing;
  capabilities: ModelCapabilities;
}

/**
 * Cache economics, as multipliers on the base input price.
 * A read is ~10× cheaper than fresh input; a write carries a premium, so a
 * cached prefix has to be read at least twice before it pays for itself.
 */
export const CACHE_PRICE_MULTIPLIER = {
  read: 0.1,
  write5m: 1.25,
  write1h: 2.0,
} as const;

export const MODELS: Record<string, ModelSpec> = {
  "claude-opus-5": {
    id: "claude-opus-5",
    label: "Claude Opus 5",
    pricing: { input: 5, output: 25 },
    capabilities: {
      effort: true,
      adaptiveThinking: true,
      structuredOutputs: true,
      minCacheableTokens: 512,
    },
  },
  "claude-opus-4-8": {
    id: "claude-opus-4-8",
    label: "Claude Opus 4.8",
    pricing: { input: 5, output: 25 },
    capabilities: {
      effort: true,
      adaptiveThinking: true,
      structuredOutputs: true,
      minCacheableTokens: 1024,
    },
  },
  "claude-sonnet-5": {
    id: "claude-sonnet-5",
    label: "Claude Sonnet 5",
    pricing: { input: 2, output: 10 },
    capabilities: {
      effort: true,
      adaptiveThinking: true,
      structuredOutputs: true,
      minCacheableTokens: 1024,
    },
  },
  "claude-haiku-4-5": {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    pricing: { input: 1, output: 5 },
    capabilities: {
      // Rejects `effort` with a 400, and its thinking parameter still takes the
      // older `budget_tokens` shape rather than adaptive.
      effort: false,
      adaptiveThinking: false,
      structuredOutputs: true,
      minCacheableTokens: 4096,
    },
  },
};

/**
 * The three jobs the pipeline does, in descending order of how much judgement
 * each one needs.
 */
export type ModelStage = "theme" | "platformPlan" | "repurpose";

/**
 * Default model per stage.
 *
 * The tiering is the single largest cost lever in this app, and it is chosen
 * per stage rather than globally because the stages are genuinely different
 * work:
 *
 * - `theme` decides what the whole month is about, and every other call is
 *   downstream of it. One call, highest leverage — it gets the best model.
 * - `platformPlan` is three calls producing most of the output tokens in a
 *   run. It executes a decision the theme call already made, against a strategy
 *   brief that spells out audience, bucket mix, and format.
 * - `repurpose` rewrites an existing Instagram script as a YouTube title and
 *   description. The idea is already fixed; this is a transformation.
 *
 * Every stage is overridable by env var, so the tiering can be measured rather
 * than assumed — set all three to the same model to A/B the quality difference.
 */
const DEFAULT_STAGE_MODELS: Record<ModelStage, string> = {
  theme: "claude-opus-5",
  platformPlan: "claude-sonnet-5",
  repurpose: "claude-haiku-4-5",
};

const STAGE_ENV_KEYS: Record<ModelStage, keyof typeof env> = {
  theme: "MODEL_THEME",
  platformPlan: "MODEL_PLATFORM_PLAN",
  repurpose: "MODEL_REPURPOSE",
};

export class UnknownModelError extends Error {
  constructor(id: string, stage: ModelStage) {
    super(
      `Unknown model "${id}" configured for the ${stage} stage. ` +
        `Known models: ${Object.keys(MODELS).join(", ")}.`,
    );
    this.name = "UnknownModelError";
  }
}

/** Resolves the model for a stage, honouring the env override. */
export function modelFor(stage: ModelStage): ModelSpec {
  const override = env[STAGE_ENV_KEYS[stage]] as string | undefined;
  const id = override ?? DEFAULT_STAGE_MODELS[stage];
  const spec = MODELS[id];
  if (!spec) throw new UnknownModelError(id, stage);
  return spec;
}

export interface TokenUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export const EMPTY_USAGE: TokenUsage = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};

/**
 * Estimated USD cost of one call.
 *
 * Cached reads and writes are priced separately from fresh input — folding
 * them into a single `input` number, as the previous implementation did, both
 * over-reports the bill and hides whether caching is working at all.
 *
 * This is an estimate from list prices for operator visibility. It is never
 * used to bill anyone, and it will drift if prices change; `PRICING_VERIFIED_AT`
 * records when the table was last checked against the published rates.
 */
export const PRICING_VERIFIED_AT = "2026-08-29";

export function costOf(
  spec: ModelSpec,
  usage: TokenUsage,
  cacheTtl: "5m" | "1h" = "5m",
): number {
  const { input, output } = spec.pricing;
  const writeMultiplier =
    cacheTtl === "1h"
      ? CACHE_PRICE_MULTIPLIER.write1h
      : CACHE_PRICE_MULTIPLIER.write5m;

  return (
    (usage.input / 1e6) * input +
    (usage.output / 1e6) * output +
    (usage.cacheRead / 1e6) * input * CACHE_PRICE_MULTIPLIER.read +
    (usage.cacheWrite / 1e6) * input * writeMultiplier
  );
}

/**
 * What the same call would have cost with no caching and no tiering — every
 * token billed as fresh input on the most expensive model in the pipeline.
 * This is the baseline the savings report compares against.
 */
export function baselineCostOf(
  usage: TokenUsage,
  baseline: ModelSpec = MODELS["claude-opus-5"],
): number {
  const promptTokens = usage.input + usage.cacheRead + usage.cacheWrite;
  return (
    (promptTokens / 1e6) * baseline.pricing.input +
    (usage.output / 1e6) * baseline.pricing.output
  );
}

export function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    input: a.input + b.input,
    output: a.output + b.output,
    cacheRead: a.cacheRead + b.cacheRead,
    cacheWrite: a.cacheWrite + b.cacheWrite,
  };
}
