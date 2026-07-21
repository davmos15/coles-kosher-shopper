import Anthropic from "@anthropic-ai/sdk";
import type { Ingredient } from "./types";

// Haiku 4.5 — cheapest current model, ideal for extraction. Override with
// ANTHROPIC_MODEL if you want to try a bigger one.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

export interface ExtractResult {
  title: string;
  ingredients: Ingredient[];
}

const SYSTEM = `You extract shopping ingredients from a recipe.
Return ONLY minified JSON, no prose, no markdown fences, in this exact shape:
{"title": string, "ingredients": [{"name": string, "quantity": number|null, "unit": string, "raw": string}]}

Rules:
- "name" is the base grocery item, singular, no prep words (e.g. "brown onion" not "2 large brown onions, diced").
- "quantity" is a number or null if none/"to taste". Convert fractions to decimals (1/2 -> 0.5).
- "unit" is a short token: g, kg, ml, l, tsp, tbsp, cup, or "" for whole items.
- "raw" is the original line, verbatim.
- Ignore step instructions; only list ingredients.
- If a title isn't stated, invent a short sensible one.`;

type Block =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

export async function extractRecipe(input: {
  text?: string;
  image?: { mediaType: string; base64: string };
}): Promise<ExtractResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set on the server.");

  const client = new Anthropic({ apiKey });

  const content: Block[] = [];
  if (input.image) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: input.image.mediaType, data: input.image.base64 },
    });
    content.push({ type: "text", text: "Extract the ingredients from this recipe image." });
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

function parseResult(raw: string): ExtractResult {
  // Be forgiving: strip accidental fences, grab the outermost JSON object.
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const json = start >= 0 && end >= 0 ? cleaned.slice(start, end + 1) : cleaned;

  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Could not parse the recipe. Try pasting the ingredients list more clearly.");
  }

  const ingredients: Ingredient[] = Array.isArray(parsed.ingredients)
    ? parsed.ingredients.map((i: any) => ({
        name: String(i.name ?? "").trim(),
        quantity: typeof i.quantity === "number" ? i.quantity : null,
        unit: String(i.unit ?? "").trim(),
        raw: String(i.raw ?? i.name ?? "").trim(),
      })).filter((i: Ingredient) => i.name)
    : [];

  return { title: String(parsed.title ?? "Untitled recipe").trim(), ingredients };
}
