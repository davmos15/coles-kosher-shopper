import type { Product } from "./types";

// ---------------------------------------------------------------------------
// Coles integration — STUB.
//
// v1 returns a plausible placeholder product so the whole flow works end to
// end. When you wire up real data, replace `matchColes` with a call to your
// chosen source (e.g. a scraping API) that returns the same Product shape.
//
// Path B (robust, recommended): resolve name -> best Coles product + price +
// product URL, hand the user a one-tap add-through link.
// Path A (experimental toggle): drive Coles' internal trolley endpoint with
// the user's own session — implement behind a feature flag, expect breakage.
// ---------------------------------------------------------------------------

export interface ColesMatcher {
  match(name: string): Product | null;
}

/** Deterministic stub so the UI has something real-looking to show. */
export function matchColes(name: string): Product | null {
  if (!name) return null;
  return {
    id: `stub:${name}`,
    name: `${cap(name)} (Coles match pending)`,
    brand: "—",
    price: null, // unknown until real data is connected
    size: "—",
    url: colesSearchUrl(name),
    kosher: "unverified",
  };
}

/** A real, clickable Coles search URL — useful even before product matching. */
export function colesSearchUrl(name: string): string {
  return `https://www.coles.com.au/search?q=${encodeURIComponent(name)}`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
