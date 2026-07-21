import {
  SYSTEM,
  USER_IMAGE_HINT,
  parseResult,
  type ExtractInput,
  type ExtractResult,
} from "./shared";

// Google Gemini (has a free tier — handy to compare against paid Anthropic).
// Uses the REST API directly so there's no extra dependency. gemini-2.0-flash
// is fast, cheap, and free-tier eligible; override with GEMINI_MODEL.
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

export async function extractWithGemini(input: ExtractInput): Promise<ExtractResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set on the server.");

  const parts: Part[] = [];
  if (input.image) {
    parts.push({ inline_data: { mime_type: input.image.mediaType, data: input.image.base64 } });
    parts.push({ text: USER_IMAGE_HINT });
  }
  if (input.text) {
    parts.push({ text: `Recipe:\n\n${input.text}` });
  }
  if (parts.length === 0) throw new Error("Provide recipe text or an image.");

  const res = await fetch(
    `${ENDPOINT}/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      }),
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Gemini request failed (${res.status}). ${extractGeminiError(detail)}`.trim()
    );
  }

  const data = await res.json();
  const raw: string = (data?.candidates?.[0]?.content?.parts ?? [])
    .map((p: any) => p?.text ?? "")
    .join("")
    .trim();

  if (!raw) throw new Error("Gemini returned an empty response.");
  return parseResult(raw);
}

function extractGeminiError(body: string): string {
  try {
    const parsed = JSON.parse(body);
    return parsed?.error?.message ?? "";
  } catch {
    return "";
  }
}
