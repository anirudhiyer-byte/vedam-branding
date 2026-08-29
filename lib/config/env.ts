import * as z from "zod";

/**
 * The single source of truth for configuration.
 *
 * Every environment variable the app reads is declared here, validated once,
 * and consumed through the typed `env` object. Nothing else in the codebase
 * touches `process.env` directly — that is what stops a typo'd variable name
 * from silently becoming `undefined` three layers down at request time.
 *
 * Validation is lazy so that importing this module from a client bundle, a
 * build step, or a test does not require a fully-populated environment. The
 * first read of `env` in a server context is what triggers it.
 */

/** Trims, then treats an empty string exactly like an unset variable. */
const optionalString = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const optionalUrl = optionalString.pipe(z.string().url().optional());

/** Accepts "1"/"true"/"yes"/"on" (case-insensitive) as true. */
const boolish = optionalString.transform((v) =>
  v === undefined ? undefined : /^(1|true|yes|on)$/i.test(v),
);

/** Parses a positive number, reporting the bad value rather than coercing it. */
const positiveNumber = optionalString.transform((raw, ctx) => {
  if (raw === undefined) return undefined;

  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    ctx.addIssue({
      code: "custom",
      message: `expected a positive number, got ${JSON.stringify(raw)}`,
    });
    return z.NEVER;
  }
  return n;
});

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // ---- Public site -------------------------------------------------------
  /**
   * Absolute origin of the deployed marketing site. Drives `metadataBase`,
   * canonical URLs, `robots.txt`, and the sitemap, so every environment
   * resolves its own OpenGraph image URLs instead of pointing at production.
   */
  NEXT_PUBLIC_SITE_URL: optionalUrl,

  // ---- Studio authentication --------------------------------------------
  /**
   * Shared password for the internal Studio. Required in production; without
   * it the Studio refuses to serve rather than falling open.
   */
  STUDIO_PASSWORD: optionalString,
  /**
   * HMAC key for signing session cookies. Must be stable across instances or
   * everyone is logged out on each deploy. Generate with:
   *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   */
  STUDIO_SESSION_SECRET: optionalString,
  /** Session lifetime in seconds. Defaults to 12 hours. */
  STUDIO_SESSION_TTL_SECONDS: positiveNumber,

  // ---- Model access ------------------------------------------------------
  ANTHROPIC_API_KEY: optionalString,
  YOUTUBE_API_KEY: optionalString,

  /**
   * Per-stage model overrides. Defaults live in lib/ai/models.ts; these exist
   * so a run can be re-pointed (cheaper tier, or everything on one model to
   * compare quality) without a deploy.
   */
  MODEL_THEME: optionalString,
  MODEL_PLATFORM_PLAN: optionalString,
  MODEL_REPURPOSE: optionalString,

  /** Hard ceiling on estimated Anthropic spend per calendar month, in USD. */
  AI_MONTHLY_BUDGET_USD: positiveNumber,
  /** Set to disable prompt caching (for A/B measuring its effect). */
  AI_DISABLE_PROMPT_CACHE: boolish,

  // ---- Storage -----------------------------------------------------------
  /**
   * When set, calendars are stored in Postgres. When unset, they fall back to
   * JSON files under data/calendars — fine for local development and a
   * single-process Node host, never for serverless. See lib/social/storage.
   */
  DATABASE_URL: optionalString,

  // ---- Real profile URLs -------------------------------------------------
  /**
   * Deliberately unset by default. Guessed profile URLs that look real are
   * worse than none: the UI hides the link rather than sending someone to a
   * page that may not be ours.
   */
  VEDAM_INSTAGRAM_URL: optionalUrl,
  VEDAM_LINKEDIN_URL: optionalUrl,
  VEDAM_YOUTUBE_URL: optionalUrl,
});

export type Env = z.infer<typeof EnvSchema>;

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
}

let cached: Env | null = null;

function load(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration:\n${formatIssues(parsed.error)}\n` +
        "See .env.example for the full list.",
    );
  }
  return parsed.data;
}

/**
 * Validated environment. Reads are memoised, so the schema runs once per
 * process rather than once per access.
 */
export const env: Env = new Proxy({} as Env, {
  get(_target, key: string) {
    cached ??= load();
    return cached[key as keyof Env];
  },
  has(_target, key: string) {
    cached ??= load();
    return key in cached;
  },
  ownKeys() {
    cached ??= load();
    return Reflect.ownKeys(cached);
  },
  getOwnPropertyDescriptor(_target, key: string) {
    cached ??= load();
    return Object.getOwnPropertyDescriptor(cached, key);
  },
});

/** Test helper: forces the next read to re-validate `process.env`. */
export function resetEnvCache(): void {
  cached = null;
}

export const isProduction = () => env.NODE_ENV === "production";
export const isTest = () => env.NODE_ENV === "test";

/**
 * Configuration problems that must fail a production deploy loudly rather than
 * surfacing as a confusing 500 on the first request that needs them.
 *
 * Returns human-readable problems; an empty array means the environment is
 * complete. Used by `npm run check:env` and by the Studio's own boot guard.
 */
export function auditEnv(): { fatal: string[]; warnings: string[] } {
  const fatal: string[] = [];
  const warnings: string[] = [];

  if (isProduction()) {
    if (!env.STUDIO_PASSWORD) {
      fatal.push(
        "STUDIO_PASSWORD is not set. /studio triggers billed model calls and " +
          "mutates the calendar; it must never be reachable unauthenticated.",
      );
    } else if (env.STUDIO_PASSWORD.length < 12) {
      fatal.push("STUDIO_PASSWORD must be at least 12 characters.");
    }

    if (!env.STUDIO_SESSION_SECRET) {
      fatal.push("STUDIO_SESSION_SECRET is not set; sessions cannot be signed.");
    } else if (env.STUDIO_SESSION_SECRET.length < 32) {
      fatal.push("STUDIO_SESSION_SECRET must be at least 32 characters.");
    }

    if (!env.NEXT_PUBLIC_SITE_URL) {
      fatal.push(
        "NEXT_PUBLIC_SITE_URL is not set; OpenGraph and canonical URLs would " +
          "resolve against the wrong origin.",
      );
    }

    if (!env.DATABASE_URL) {
      warnings.push(
        "DATABASE_URL is not set, so calendars fall back to JSON files on " +
          "disk. That does not work on a read-only or multi-instance host.",
      );
    }
  }

  if (!env.ANTHROPIC_API_KEY) {
    warnings.push(
      "ANTHROPIC_API_KEY is not set; the Studio can display calendars but " +
        "cannot plan new ones.",
    );
  }

  if (!env.YOUTUBE_API_KEY) {
    warnings.push(
      "YOUTUBE_API_KEY is not set; YouTube channel research is skipped and " +
        "planning falls back to whatever the team types in manually.",
    );
  }

  if (!env.AI_MONTHLY_BUDGET_USD) {
    warnings.push(
      "AI_MONTHLY_BUDGET_USD is not set, so there is no spend ceiling on " +
        "model calls.",
    );
  }

  return { fatal, warnings };
}
