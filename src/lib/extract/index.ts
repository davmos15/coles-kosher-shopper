import { extractWithAnthropic } from "./anthropic";
import { extractWithGemini } from "./gemini";
import type { ExtractInput, ExtractResult, ExtractionProvider } from "./shared";

export type { ExtractInput, ExtractResult, ExtractionProvider } from "./shared";

// Which model reads your recipes. Choose explicitly with EXTRACTION_PROVIDER
// ("anthropic" or "gemini"); otherwise we use whichever API key is present,
// preferring the free Gemini tier when both are set — flip a single env var to
// A/B test free vs paid.
export function activeProvider(): ExtractionProvider {
  const forced = process.env.EXTRACTION_PROVIDER?.toLowerCase();
  if (forced === "anthropic" || forced === "gemini") return forced;
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  // Nothing configured — default to Anthropic so the error names the key most
  // users set up first.
  return "anthropic";
}

export async function extractRecipe(
  input: ExtractInput
): Promise<ExtractResult & { provider: ExtractionProvider }> {
  const provider = activeProvider();
  const result =
    provider === "gemini"
      ? await extractWithGemini(input)
      : await extractWithAnthropic(input);
  return { ...result, provider };
}
