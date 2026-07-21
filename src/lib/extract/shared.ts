import type { Ingredient } from "../types";

// Shared bits for every extraction provider (Anthropic, Gemini, …): the prompt,
// the result shape, and a forgiving JSON parser. Providers differ only in how
// they call their model; the contract in and out is identical.

export type ExtractionProvider = "anthropic" | "gemini";

export interface ExtractResult {
  title: string;
  ingredients: Ingredient[];
}

export interface ExtractInput {
  text?: string;
  image?: { mediaType: string; base64: string };
}

export const SYSTEM = `You extract shopping ingredients from a recipe.
Return ONLY minified JSON, no prose, no markdown fences, in this exact shape:
{"title": string, "ingredients": [{"name": string, "quantity": number|null, "unit": string, "raw": string}]}

Rules:
- "name" is the base grocery item, singular, no prep words (e.g. "brown onion" not "2 large brown onions, diced").
- "quantity" is a number or null if none/"to taste". Convert fractions to decimals (1/2 -> 0.5).
- "unit" is a short token: g, kg, ml, l, tsp, tbsp, cup, or "" for whole items.
- "raw" is the original line, verbatim.
- Ignore step instructions; only list ingredients.
- If a title isn't stated, invent a short sensible one.`;

export const USER_IMAGE_HINT = "Extract the ingredients from this recipe image.";

export function parseResult(raw: string): ExtractResult {
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
    ? parsed.ingredients
        .map((i: any) => ({
          name: String(i.name ?? "").trim(),
          quantity: typeof i.quantity === "number" ? i.quantity : null,
          unit: String(i.unit ?? "").trim(),
          raw: String(i.raw ?? i.name ?? "").trim(),
        }))
        .filter((i: Ingredient) => i.name)
    : [];

  return { title: String(parsed.title ?? "Untitled recipe").trim(), ingredients };
}
