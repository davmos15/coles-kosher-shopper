import Anthropic from "@anthropic-ai/sdk";
import {
  SYSTEM,
  USER_IMAGE_HINT,
  parseResult,
  type ExtractInput,
  type ExtractResult,
} from "./shared";

// Anthropic (paid). Haiku 4.5 — cheapest current model, ideal for extraction.
// Override with ANTHROPIC_MODEL if you want a bigger one.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

type Block =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

export async function extractWithAnthropic(input: ExtractInput): Promise<ExtractResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set on the server.");

  const client = new Anthropic({ apiKey });

  const content: Block[] = [];
  if (input.image) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: input.image.mediaType, data: input.image.base64 },
    });
    content.push({ type: "text", text: USER_IMAGE_HINT });
  }
  if (input.text) {
    content.push({ type: "text", text: `Recipe:\n\n${input.text}` });
  }
  if (content.length === 0) throw new Error("Provide recipe text or an image.");

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: SYSTEM,
    messages: [{ role: "user", content: content as never }],
  });

  const raw = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  return parseResult(raw);
}
