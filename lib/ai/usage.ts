import {
  EMPTY_USAGE,
  addUsage,
  baselineCostOf,
  costOf,
  type ModelSpec,
  type ModelStage,
  type TokenUsage,
} from "./models";
import { logger } from "@/lib/observability/logger";

/**
 * Per-run cost accounting.
 *
 * The point of recording this is not bookkeeping — it is that caching and
 * tiering fail *silently*. A prompt-assembly change that breaks the cache
 * prefix produces no error and no visible difference; the only symptom is that
 * `cacheRead` goes to zero and the bill goes up. So every run reports what it
 * spent, what it would have spent uncached and untiered, and whether the cache
 * was actually read.
 */

export interface CallRecord {
  label: string;
  stage: ModelStage;
  model: ModelSpec;
  usage: TokenUsage;
  costUsd: number;
  /** What this call alone would have cost at Opus list price, uncached. */
  baselineUsd: number;
  durationMs: number;
  /** Attempts consumed, including the successful one. */
  attempts: number;
}

export interface RunReport {
  runId: string;
  subject: string;
  calls: CallRecord[];
  totalUsage: TokenUsage;
  totalCostUsd: number;
  baselineCostUsd: number;
  savedUsd: number;
  savedPercent: number;
  cacheHitRate: number;
  durationMs: number;
}

/** Accumulates the calls of one generation run. */
export class UsageLedger {
  readonly runId: string;
  readonly subject: string;
  private readonly calls: CallRecord[] = [];
  private readonly startedAt = Date.now();

  constructor(subject: string, runId = crypto.randomUUID()) {
    this.subject = subject;
    this.runId = runId;
  }

  record(entry: Omit<CallRecord, "costUsd" | "baselineUsd">): CallRecord {
    const record: CallRecord = {
      ...entry,
      costUsd: costOf(entry.model, entry.usage),
      baselineUsd: baselineCostOf(entry.usage),
    };
    this.calls.push(record);
    return record;
  }

  /** Cost incurred so far — read by the budget guard between calls. */
  get spentUsd(): number {
    return this.calls.reduce((sum, c) => sum + c.costUsd, 0);
  }

  report(): RunReport {
    const totalUsage = this.calls.reduce(
      (acc, c) => addUsage(acc, c.usage),
      EMPTY_USAGE,
    );
    const totalCostUsd = this.spentUsd;
    const baselineCostUsd = this.calls.reduce((s, c) => s + c.baselineUsd, 0);

    // Of everything the model read as prompt, how much came from cache.
    const promptTokens =
      totalUsage.input + totalUsage.cacheRead + totalUsage.cacheWrite;

    return {
      runId: this.runId,
      subject: this.subject,
      calls: this.calls,
      totalUsage,
      totalCostUsd,
      baselineCostUsd,
      savedUsd: Math.max(0, baselineCostUsd - totalCostUsd),
      savedPercent:
        baselineCostUsd === 0
          ? 0
          : Math.round(
              ((baselineCostUsd - totalCostUsd) / baselineCostUsd) * 100,
            ),
      cacheHitRate:
        promptTokens === 0
          ? 0
          : Math.round((totalUsage.cacheRead / promptTokens) * 100),
      durationMs: Date.now() - this.startedAt,
    };
  }
}

const usd = (n: number) => `$${n.toFixed(4)}`;

/** One structured log line per run, plus a readable table in development. */
export function logRunReport(report: RunReport): void {
  logger.info("studio.generation.completed", {
    runId: report.runId,
    subject: report.subject,
    calls: report.calls.length,
    durationMs: report.durationMs,
    costUsd: Number(report.totalCostUsd.toFixed(4)),
    baselineUsd: Number(report.baselineCostUsd.toFixed(4)),
    savedPercent: report.savedPercent,
    cacheHitRate: report.cacheHitRate,
    tokens: report.totalUsage,
    models: [...new Set(report.calls.map((c) => c.model.id))],
  });

  if (report.cacheHitRate === 0 && report.calls.length > 1) {
    // Not fatal, but it means the prefix broke or the prompt is below the
    // model's minimum cacheable length. Both are worth investigating.
    logger.warn("studio.generation.no_cache_reads", {
      runId: report.runId,
      hint:
        "No cached prompt tokens were read across this run. Check that the " +
        "strategist system prompt is byte-identical between calls and long " +
        "enough to cache on the configured model.",
    });
  }
}

/** Renders the report as a table — used by the CLI checks. */
export function formatRunReport(report: RunReport): string {
  const rows = report.calls.map((c) => {
    const cache =
      c.usage.cacheRead > 0
        ? `${c.usage.cacheRead} read`
        : c.usage.cacheWrite > 0
          ? `${c.usage.cacheWrite} written`
          : "—";
    return [
      `  ${c.label.padEnd(16)}`,
      c.model.id.padEnd(18),
      `${String(c.usage.input).padStart(7)} in`,
      `${String(c.usage.output).padStart(7)} out`,
      `${cache.padStart(14)}`,
      usd(c.costUsd).padStart(10),
    ].join(" ");
  });

  return [
    `[studio] ${report.subject} — ${report.calls.length} call(s) in ${(
      report.durationMs / 1000
    ).toFixed(1)}s`,
    ...rows,
    `  ${"TOTAL".padEnd(16)} ${" ".repeat(18)} ${String(
      report.totalUsage.input,
    ).padStart(7)} in ${String(report.totalUsage.output).padStart(7)} out ${String(
      `${report.cacheHitRate}% cached`,
    ).padStart(14)} ${usd(report.totalCostUsd).padStart(10)}`,
    `  Untiered, uncached baseline: ${usd(report.baselineCostUsd)} — ` +
      `saved ${usd(report.savedUsd)} (${report.savedPercent}%)`,
  ].join("\n");
}
