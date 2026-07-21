import { NextRequest, NextResponse } from "next/server";
import { getColesConnector } from "@/lib/coles";

export const runtime = "nodejs";
export const maxDuration = 20;

// GET /api/coles/search?q=milk
// Returns candidate Coles products from the active connector plus a search URL.
// The connector runs server-side so its (unofficial) Coles calls never touch the
// browser; any failure degrades to an empty list + the search link.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const connector = getColesConnector();

  if (!q) {
    return NextResponse.json({ error: "Add a search term." }, { status: 400 });
  }

  const searchUrl = connector.searchUrl(q);
  try {
    const products = await connector.search(q);
    return NextResponse.json({ query: q, provider: connector.id, searchUrl, products });
  } catch (err: any) {
    // Not fatal — the UI still offers the search link and manual entry.
    return NextResponse.json({
      query: q,
      provider: connector.id,
      searchUrl,
      products: [],
      error: err?.message || "Coles search is unavailable right now.",
    });
  }
}
