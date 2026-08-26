/**
 * Guards the generation calls against the SDK's non-streaming timeout.
 *
 * The Anthropic SDK estimates `60min * max_tokens / 128000` and refuses any
 * non-streaming request projected to take over 10 minutes — i.e. anything with
 * max_tokens above 21,333. Our platform calls use 32,000, so they MUST stream.
 * This asserts that, because the failure only shows up at runtime on a real
 * generation, which is an expensive place to discover it.
 */
import { readFileSync } from "node:fs";

const src = readFileSync("lib/social/agent.ts", "utf8");

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

const NONSTREAMING_LIMIT = Math.floor(128_000 / 6); // 21,333

const streams = src.match(/messages\.stream\(/g)?.length ?? 0;
const finals = src.match(/\.finalMessage\(\)/g)?.length ?? 0;
const parses = src.match(/messages\.parse\(/g)?.length ?? 0;
const maxTokens = [...src.matchAll(/max_tokens:\s*(\d+)/g)].map((m) => Number(m[1]));

check("every generation call streams", streams > 0 && parses === 0,
  `${streams} stream, ${parses} non-streaming`);
check("every stream awaits finalMessage()", streams === finals,
  `${streams} streams, ${finals} awaits`);
check("max_tokens declared on every call", maxTokens.length === streams,
  `${maxTokens.length} values for ${streams} calls`);

for (const n of maxTokens) {
  check(
    `max_tokens ${n.toLocaleString()} is safe (streaming)`,
    streams > 0 && parses === 0,
    n > NONSTREAMING_LIMIT
      ? `above the ${NONSTREAMING_LIMIT.toLocaleString()} non-streaming limit, so streaming is required`
      : `under the non-streaming limit anyway`,
  );
}

// Structured output must survive the switch to streaming.
check("structured output still declared", src.includes("zodOutputFormat("));
check("parsed_output still read", src.includes("parsed_output"));
check("token usage still recorded", (src.match(/record\(usage/g)?.length ?? 0) === 3);

console.log(
  failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`,
);
process.exit(failures === 0 ? 0 : 1);
