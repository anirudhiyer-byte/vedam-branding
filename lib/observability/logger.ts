import { env, isProduction, isTest } from "@/lib/config/env";

/**
 * Structured logging.
 *
 * Production emits one JSON object per line, which every log aggregator can
 * parse without a custom grok pattern; development emits something a human can
 * read at a glance. Both go through the same call sites, so a log line added
 * while debugging is a log line that works in production.
 *
 * Anything that could carry a secret is redacted here rather than at the call
 * site, because the call site is exactly where that gets forgotten.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function minimumLevel(): number {
  if (isTest()) return LEVEL_ORDER.error;
  return isProduction() ? LEVEL_ORDER.info : LEVEL_ORDER.debug;
}

/** Keys whose values never belong in a log, whatever they contain. */
const REDACT_KEYS =
  /(password|secret|token|api[-_]?key|authorization|cookie|session)/i;

const REDACTED = "[redacted]";

/**
 * Recursively redacts sensitive fields. Depth-limited so a cyclic or very deep
 * object logged by accident cannot hang the process.
 */
function sanitise(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: isProduction() ? undefined : value.stack,
    };
  }
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((v) => sanitise(v, depth + 1));
  }

  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    out[key] = REDACT_KEYS.test(key) ? REDACTED : sanitise(v, depth + 1);
  }
  return out;
}

function emit(level: LogLevel, event: string, context?: unknown) {
  if (LEVEL_ORDER[level] < minimumLevel()) return;

  const fields = context === undefined ? undefined : sanitise(context);
  const write = level === "error" || level === "warn" ? console.error : console.log;

  if (isProduction()) {
    write(
      JSON.stringify({
        level,
        event,
        time: new Date().toISOString(),
        ...(fields && typeof fields === "object" ? fields : { detail: fields }),
      }),
    );
    return;
  }

  const suffix = fields === undefined ? "" : ` ${JSON.stringify(fields)}`;
  write(`[${level}] ${event}${suffix}`);
}

export const logger = {
  debug: (event: string, context?: unknown) => emit("debug", event, context),
  info: (event: string, context?: unknown) => emit("info", event, context),
  warn: (event: string, context?: unknown) => emit("warn", event, context),
  error: (event: string, context?: unknown) => emit("error", event, context),
};

/** Exposed for the log-redaction tests. */
export const __testing = { sanitise, minimumLevel, env };
