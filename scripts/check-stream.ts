/**
 * Proves the exact streaming + structured-output pattern the agent uses,
 * with a tiny schema so it costs a fraction of a cent.
 *
 *   npm run check:stream
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod";

const Schema = z.object({
  platform: z.string(),
  caption: z.string(),
});

if (!process.env.ANTHROPIC_API_KEY) {
  console.log("FAIL  ANTHROPIC_API_KEY is not set");
  process.exit(1);
}

// Same max_tokens as the real platform calls — this is what used to throw.
const stream = new Anthropic().messages.stream({
  model: "claude-opus-5",
  max_tokens: 32000,
  thinking: { type: "adaptive" },
  output_config: { effort: "low", format: zodOutputFormat(Schema) },
  messages: [
    {
      role: "user",
      content:
        "Write a two-line Instagram caption for an engineering school, with a CTA. Set platform to 'instagram'.",
    },
  ],
});

const res = await stream.finalMessage();

if (!res.parsed_output) {
  console.log("FAIL  streamed, but structured output did not parse");
  process.exit(1);
}

console.log("PASS  streaming works at max_tokens 32,000");
console.log("PASS  structured output parsed:", JSON.stringify(res.parsed_output));
console.log(`      tokens: ${res.usage.input_tokens} in / ${res.usage.output_tokens} out`);
console.log("\nGeneration should work now.");
