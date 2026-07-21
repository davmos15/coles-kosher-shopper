import type { Product } from "./types";

// ---------------------------------------------------------------------------
// Coles connector.
//
// A connector turns an item name into (a) a Coles search URL, and (b) — once a
// real data source is wired in — actual matching products with price + link.
// Everything else in the app talks to this interface, so swapping in real data
// is a one-file change.
//
// Coles has no public API, so the default connector is link-only: it returns a
// real search URL (useful today) and no product data. A real source (a
// product-data API, or an internal-endpoint client behind a flag) implements
// `search()` and slots in via `getColesConnector()`.
// ---------------------------------------------------------------------------

export interface ColesConnector {
  /** Stable id for diagnostics / UI ("search-link", "acme-api", …). */
  readonly id: string;
  /** Candidate products for a query, best first. Empty when link-only. */
  search(query: string): Promise<Product[]>;
  /** A real, clickable Coles search URL for a query. */
  searchUrl(query: string): string;
}

/** Link-only default: a working search URL, no product data. */
class SearchLinkConnector implements ColesConnector {
  readonly id = "search-link";

  async search(): Promise<Product[]> {
    return [];
  }

  searchUrl(name: string): string {
    return `https://www.coles.com.au/search?q=${encodeURIComponent(name)}`;
  }
}

let connector: ColesConnector | null = null;

/**
 * The active connector. Today it's always link-only; when a real source is
 * added, select it here (e.g. from a COLES_PROVIDER env var) and the search /
 * matching UI lights up automatically.
 */
export function getColesConnector(): ColesConnector {
  if (!connector) connector = new SearchLinkConnector();
  return connector;
}

/** A real, clickable Coles search URL — useful even before product matching. */
export function colesSearchUrl(name: string): string {
  return getColesConnector().searchUrl(name);
}

/**
 * A best-effort product for the consolidation engine. Until a real connector is
 * wired in, this is a placeholder carrying a live Coles search link so every
 * line stays actionable.
 */
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

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
