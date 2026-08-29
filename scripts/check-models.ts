/**
 * Proves each configured model tier actually works, before a real run.
 *
 * This exists because the tiers do not accept the same request. Sending
 * `output_config.effort` to Haiku 4.5 is a 400; adaptive thinking is Claude
 * 4.6+ only. lib/ai/models.ts encodes those facts, and this verifies the
 * encoding against the live API rather than trusting it.
 *
 * It also reports whether the strategist prefix genuinely cached — the saving
 * that fails silently — by issuing each call twice and reading the usage.
 *
 *   npm run check:models
 *
 * Cost: a few cents. Every call is tiny and capped.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod";
import { MODELS, modelFor, type ModelStage } from "../lib/ai/models.ts";
import { STRATEGIST_SYSTEM } from "../lib/social/agent/prompts.ts";
import { estimateTokens } from "../lib/ai/call.ts";

const Schema = z.object({ ok: z.boolean(), note: z.string() });

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("FAIL  ANTHROPIC_API_KEY is not set — add it to .env.local");
  process.exit(1);
}

const client = new Anthropic();
const stages: ModelStage[] = ["theme", "platformPlan", "repurpose"];
let failures = 0;

const prefixTokens = estimateTokens(STRATEGIST_SYSTEM);
console.log(
  `Strategist prefix: ~${prefixTokens} tokens (${STRATEGIST_SYSTEM.length} chars)\n`,
);

for (const stage of stages) {
  const spec = modelFor(stage);
  const caps = spec.capabilities;
  const cacheable = prefixTokens >= caps.minCacheableTokens;

  console.log(`${stage} → ${spec.id}`);
  console.log(
    `  capabilities: effort=${caps.effort} adaptiveThinking=${caps.adaptiveThinking} ` +
      `minCache=${caps.minCacheableTokens} → prefix ${cacheable ? "CACHES" : "too short to cache"}`,
  );

  // Exactly the request shape lib/ai/call.ts builds for this stage.
  const outputConfig: Record<string, unknown> = {
    format: zodOutputFormat(Schema),
  };
  if (caps.effort) outputConfig.effort = "low";

  const request = {
    model: spec.id,
    max_tokens: 2_000,
    ...(caps.adaptiveThinking ? { thinking: { type: "adaptive" as const } } : {}),
    output_config: outputConfig,
    system: [
      {
        type: "text" as const,
        text: STRATEGIST_SYSTEM,
        ...(cacheable
          ? { cache_control: { type: "ephemeral" as const, ttl: "5m" as const } }
          : {}),
      },
    ],
    messages: [
      {
        role: "user" as const,
        content: "Reply with ok=true and a three-word note. Nothing else.",
      },
    ],
  };

  try {
    // Twice: the first writes the cache entry, the second should read it.
    const first = await client.messages.stream(request).finalMessage();
    const second = await client.messages.stream(request).finalMessage();

    if (!first.parsed_output || !second.parsed_output) {
      console.log("  FAIL  structured output did not parse\n");
      failures++;
      continue;
    }

    const write = first.usage.cache_creation_input_tokens ?? 0;
    const read = second.usage.cache_read_input_tokens ?? 0;

    console.log(`  PASS  structured output parsed on both calls`);
    console.log(`        call 1: ${first.usage.input_tokens} fresh in, ${write} cache written`);
    console.log(`        call 2: ${second.usage.input_tokens} fresh in, ${read} cache read`);

    if (cacheable && read === 0) {
      console.log(
        "  FAIL  the prefix was marked cacheable but nothing was read back —\n" +
          "        something is varying between requests. Diff the payloads.",
      );
      failures++;
    } else if (cacheable) {
      console.log(`  PASS  prompt caching is live (${read} tokens served from cache)`);
    }
    console.log();
  } catch (err) {
    console.log(
      `  FAIL  ${err instanceof Error ? err.message : String(err)}\n` +
        "        The capability table in lib/ai/models.ts may be wrong for this model.\n",
    );
    failures++;
  }
}

console.log(
  failures === 0
    ? "All tiers work, and caching is verified where the prefix is long enough."
    : `${failures} problem(s). Fix before relying on a generation run.`,
);
console.log(
  `\nPricing table last verified: see PRICING_VERIFIED_AT in lib/ai/models.ts.\n` +
    `Known models: ${Object.keys(MODELS).join(", ")}`,
);

process.exit(failures === 0 ? 0 : 1);
