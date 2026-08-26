/**
 * Verifies both API keys before you spend a real generation run on them.
 *
 *   node --env-file=.env.local --experimental-strip-types --no-warnings scripts/check-keys.ts
 *
 * Or just: npm run check:keys
 */
import Anthropic from "@anthropic-ai/sdk";

let failures = 0;
const ok = (m: string) => console.log(`PASS  ${m}`);
const bad = (m: string) => {
  console.log(`FAIL  ${m}`);
  failures++;
};

// --- Anthropic ---
if (!process.env.ANTHROPIC_API_KEY) {
  bad("ANTHROPIC_API_KEY is not set — add it to .env.local");
} else {
  try {
    const client = new Anthropic();
    const res = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: "Reply with exactly: OK" }],
    });
    const text = res.content.find((b) => b.type === "text");
    ok(`Anthropic key works — model ${res.model} replied "${text?.text.trim().slice(0, 20)}"`);
    console.log(
      `      tokens: ${res.usage.input_tokens} in / ${res.usage.output_tokens} out`,
    );
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      bad("Anthropic key was rejected — check it is copied in full");
    } else if (err instanceof Anthropic.APIError) {
      bad(`Anthropic API error ${err.status}: ${err.message}`);
    } else {
      bad(`Anthropic call failed: ${err instanceof Error ? err.message : err}`);
    }
  }
}

// --- YouTube ---
const ytKey = process.env.YOUTUBE_API_KEY;
if (!ytKey) {
  console.log("SKIP  YOUTUBE_API_KEY is not set — channel research will be skipped");
} else {
  // A known-good public channel, so a failure means the key, not the handle.
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("forHandle", "youtube");
  url.searchParams.set("key", ytKey);

  const res = await fetch(url);
  const body = (await res.json()) as {
    items?: { snippet: { title: string } }[];
    error?: { message: string; errors?: { reason: string }[] };
  };

  if (!res.ok) {
    const reason = body.error?.errors?.[0]?.reason ?? "";
    if (reason === "accessNotConfigured") {
      bad("YouTube key valid but the Data API v3 is not enabled for this project — enable it in Google Cloud console");
    } else if (reason === "keyInvalid") {
      bad("YouTube key was rejected — check it is copied in full");
    } else {
      bad(`YouTube API ${res.status}: ${body.error?.message ?? "unknown error"}`);
    }
  } else if (!body.items?.length) {
    bad("YouTube key works but returned no channel — unexpected");
  } else {
    ok(`YouTube key works — resolved channel "${body.items[0].snippet.title}"`);
  }
}

console.log(
  failures === 0
    ? "\nReady to generate."
    : `\n${failures} problem(s) — fix these before generating.`,
);
process.exit(failures === 0 ? 0 : 1);
