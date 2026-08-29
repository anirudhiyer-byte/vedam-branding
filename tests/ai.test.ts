import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CACHE_PRICE_MULTIPLIER,
  MODELS,
  baselineCostOf,
  costOf,
  modelFor,
  UnknownModelError,
} from "@/lib/ai/models";
import { UsageLedger } from "@/lib/ai/usage";
import { estimateTokens } from "@/lib/ai/call";
import {
  BudgetExceededError,
  assertWithinBudget,
  budgetStatus,
  recordSpend,
  setBudgetStore,
} from "@/lib/ai/budget";
import { resetEnvCache } from "@/lib/config/env";
import { STRATEGIST_SYSTEM, platformPlanPrompt, themePrompt } from "@/lib/social/agent/prompts";
import { buildSlots } from "@/lib/social/schedule";

afterEach(() => {
  for (const key of [
    "MODEL_THEME",
    "MODEL_PLATFORM_PLAN",
    "MODEL_REPURPOSE",
    "AI_MONTHLY_BUDGET_USD",
  ]) {
    delete process.env[key];
  }
  resetEnvCache();
});

describe("model registry", () => {
  it("routes each stage to its intended default tier", () => {
    expect(modelFor("theme").id).toBe("claude-opus-5");
    expect(modelFor("platformPlan").id).toBe("claude-sonnet-5");
    expect(modelFor("repurpose").id).toBe("claude-haiku-4-5");
  });

  it("honours an env override", () => {
    process.env.MODEL_PLATFORM_PLAN = "claude-opus-5";
    resetEnvCache();
    expect(modelFor("platformPlan").id).toBe("claude-opus-5");
  });

  it("fails loudly on an unknown model rather than calling the API with it", () => {
    process.env.MODEL_THEME = "claude-imaginary-9";
    resetEnvCache();
    expect(() => modelFor("theme")).toThrow(UnknownModelError);
  });

  it("records the capability facts the call layer gates on", () => {
    // Haiku 4.5 rejects `output_config.effort` outright and has no adaptive
    // thinking. Sending either produces a 400, so this must stay accurate.
    const haiku = MODELS["claude-haiku-4-5"];
    expect(haiku.capabilities.effort).toBe(false);
    expect(haiku.capabilities.adaptiveThinking).toBe(false);
    expect(haiku.capabilities.structuredOutputs).toBe(true);

    const opus = MODELS["claude-opus-5"];
    expect(opus.capabilities.effort).toBe(true);
    expect(opus.capabilities.adaptiveThinking).toBe(true);
  });

  it("knows each model's minimum cacheable prefix", () => {
    // Not monotonic across the family — a marker below the minimum silently
    // does nothing, so the call layer checks before marking.
    expect(MODELS["claude-opus-5"].capabilities.minCacheableTokens).toBe(512);
    expect(MODELS["claude-sonnet-5"].capabilities.minCacheableTokens).toBe(1024);
    expect(MODELS["claude-haiku-4-5"].capabilities.minCacheableTokens).toBe(4096);
  });

  it("keeps every stage on a model that supports structured outputs", () => {
    for (const stage of ["theme", "platformPlan", "repurpose"] as const) {
      expect(modelFor(stage).capabilities.structuredOutputs).toBe(true);
    }
  });
});

describe("cost accounting", () => {
  const opus = MODELS["claude-opus-5"];

  it("prices fresh input and output at list rates", () => {
    const cost = costOf(opus, {
      input: 1_000_000,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
    });
    expect(cost).toBeCloseTo(5, 6);
  });

  it("prices a cache read at a tenth of fresh input", () => {
    const usage = { input: 0, output: 0, cacheRead: 1_000_000, cacheWrite: 0 };
    expect(costOf(opus, usage)).toBeCloseTo(5 * CACHE_PRICE_MULTIPLIER.read, 6);
  });

  it("prices a cache write at a premium over fresh input", () => {
    const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 1_000_000 };
    expect(costOf(opus, usage)).toBeCloseTo(5 * CACHE_PRICE_MULTIPLIER.write5m, 6);
    expect(costOf(opus, usage, "1h")).toBeCloseTo(5 * CACHE_PRICE_MULTIPLIER.write1h, 6);
  });

  it("counts cached tokens as full-price input in the baseline", () => {
    // The baseline is "what this would have cost uncached on Opus", so cached
    // tokens must be priced as if they had been sent fresh.
    const usage = { input: 0, output: 0, cacheRead: 1_000_000, cacheWrite: 0 };
    expect(baselineCostOf(usage)).toBeCloseTo(5, 6);
  });

  it("shows tiering and caching as a saving against the baseline", () => {
    const ledger = new UsageLedger("test");

    ledger.record({
      label: "theme",
      stage: "theme",
      model: MODELS["claude-opus-5"],
      usage: { input: 2_000, output: 3_000, cacheRead: 0, cacheWrite: 2_000 },
      durationMs: 1,
      attempts: 1,
    });
    // Three Sonnet calls reading the cached prefix — the shape of a real run.
    for (const label of ["instagram", "linkedin", "youtube"]) {
      ledger.record({
        label,
        stage: "platformPlan",
        model: MODELS["claude-sonnet-5"],
        usage: { input: 1_500, output: 20_000, cacheRead: 2_000, cacheWrite: 0 },
        durationMs: 1,
        attempts: 1,
      });
    }

    const report = ledger.report();
    expect(report.calls).toHaveLength(4);
    expect(report.totalCostUsd).toBeLessThan(report.baselineCostUsd);
    expect(report.savedPercent).toBeGreaterThan(0);
    // 6,000 of 11,500 prompt tokens came from cache.
    expect(report.cacheHitRate).toBeGreaterThan(40);
  });

  it("reports a zero cache hit rate when nothing was read from cache", () => {
    const ledger = new UsageLedger("test");
    ledger.record({
      label: "theme",
      stage: "theme",
      model: MODELS["claude-opus-5"],
      usage: { input: 5_000, output: 1_000, cacheRead: 0, cacheWrite: 0 },
      durationMs: 1,
      attempts: 1,
    });
    expect(ledger.report().cacheHitRate).toBe(0);
  });

  it("tracks running spend so the budget can be checked between calls", () => {
    const ledger = new UsageLedger("test");
    expect(ledger.spentUsd).toBe(0);
    ledger.record({
      label: "theme",
      stage: "theme",
      model: MODELS["claude-opus-5"],
      usage: { input: 1_000_000, output: 0, cacheRead: 0, cacheWrite: 0 },
      durationMs: 1,
      attempts: 1,
    });
    expect(ledger.spentUsd).toBeCloseTo(5, 6);
  });
});

describe("budget ceiling", () => {
  beforeEach(() => {
    // Fresh in-memory ledger per test.
    const totals = new Map<string, number>();
    setBudgetStore({
      async spentFor(key) {
        return totals.get(key) ?? 0;
      },
      async add(key, usd) {
        totals.set(key, (totals.get(key) ?? 0) + usd);
      },
    });
  });

  it("is inert when no ceiling is configured", async () => {
    await expect(assertWithinBudget(1_000_000)).resolves.toBeUndefined();
    expect((await budgetStatus()).enabled).toBe(false);
  });

  it("blocks a run once the month's spend is used up", async () => {
    process.env.AI_MONTHLY_BUDGET_USD = "10";
    resetEnvCache();

    await recordSpend(9);
    await expect(assertWithinBudget()).resolves.toBeUndefined();

    await recordSpend(2);
    await expect(assertWithinBudget()).rejects.toThrow(BudgetExceededError);
  });

  it("counts a run's uncommitted spend, so one run cannot overshoot", async () => {
    process.env.AI_MONTHLY_BUDGET_USD = "10";
    resetEnvCache();

    await recordSpend(6);
    // Committed 6 + 5 already spent inside the current run = over the ceiling.
    await expect(assertWithinBudget(5)).rejects.toThrow(BudgetExceededError);
  });

  it("reports what is left", async () => {
    process.env.AI_MONTHLY_BUDGET_USD = "20";
    resetEnvCache();
    await recordSpend(5);

    const status = await budgetStatus();
    expect(status).toMatchObject({ enabled: true, limitUsd: 20, spentUsd: 5, remainingUsd: 15 });
  });
});

describe("prompt caching invariants", () => {
  const theme = {
    title: "T",
    rationale: "R",
    throughLine: "TL",
    platformNotes: { instagram: "a", linkedin: "b", youtube: "c" },
  };

  it("keeps the cached system prompt byte-identical across calls", () => {
    // This is the invariant the entire caching saving rests on, and it breaks
    // silently: no error, no visible difference, just a bigger bill.
    const first = STRATEGIST_SYSTEM;
    themePrompt({ year: 2026, month: 9 });
    platformPlanPrompt("instagram", buildSlots(2026, 9), theme, { year: 2026, month: 9 });
    expect(STRATEGIST_SYSTEM).toBe(first);
  });

  it("puts nothing volatile in the cached prefix", () => {
    // A date, a year, or a run id in the system prompt would invalidate the
    // prefix on every single request.
    expect(STRATEGIST_SYSTEM).not.toMatch(/\b20\d{2}\b/);
    expect(STRATEGIST_SYSTEM).not.toMatch(
      /January|February|March|April|May|June|July|August|September|October|November|December/,
    );
    expect(STRATEGIST_SYSTEM).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
  });

  it("is long enough to actually cache on the models it is sent to", () => {
    const tokens = estimateTokens(STRATEGIST_SYSTEM);
    for (const stage of ["theme", "platformPlan"] as const) {
      const spec = modelFor(stage);
      expect(
        tokens,
        `system prompt is ~${tokens} tokens, below ${spec.id}'s ${spec.capabilities.minCacheableTokens}-token minimum — the cache_control marker would silently do nothing`,
      ).toBeGreaterThanOrEqual(spec.capabilities.minCacheableTokens);
    }
  });

  it("puts the month in the user prompt, not the system prompt", () => {
    expect(themePrompt({ year: 2026, month: 9 })).toContain("September 2026");
  });

  it("orders research deterministically so identical inputs produce identical bytes", () => {
    const a = themePrompt({
      year: 2026,
      month: 9,
      research: { youtube: "y", instagram: "i" },
    });
    const b = themePrompt({
      year: 2026,
      month: 9,
      research: { instagram: "i", youtube: "y" },
    });
    expect(a).toBe(b);
  });
});
