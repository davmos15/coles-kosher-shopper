import { NextRequest, NextResponse } from "next/server";
import { extractRecipe } from "@/lib/extract";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text: string | undefined = body.text?.trim() || undefined;
    const image = body.image?.base64 && body.image?.mediaType
      ? { base64: body.image.base64 as string, mediaType: body.image.mediaType as string }
      : undefined;

    if (!text && !image) {
      return NextResponse.json({ error: "Paste a recipe or add a photo first." }, { status: 400 });
    }

    const result = await extractRecipe({ text, image });
    if (result.ingredients.length === 0) {
      return NextResponse.json({ error: "No ingredients found — check the recipe and try again." }, { status: 422 });
    }
    return NextResponse.json(result);
  } catch (err: any) {
    const message = err?.message || "Something went wrong extracting the recipe.";
    const status = /API_KEY is not set/.test(message) ? 500 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
