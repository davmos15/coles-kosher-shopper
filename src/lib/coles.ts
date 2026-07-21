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

function colesSearch(name: string): string {
  return `https://www.coles.com.au/search/products?q=${encodeURIComponent(name)}`;
}

/** Link-only default: a working search URL, no product data. */
class SearchLinkConnector implements ColesConnector {
  readonly id = "search-link";
  async search(): Promise<Product[]> {
    return [];
  }
  searchUrl(name: string): string {
    return colesSearch(name);
  }
}

// Browser-ish headers so the request looks like a normal page fetch. This is
// not evasion — if Coles blocks non-browser / datacenter traffic (it often
// does from cloud hosts), the connector simply fails and we fall back.
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
  Accept: "application/json,text/html;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-AU,en;q=0.9",
};

/**
 * Live search against Coles' own internal Next.js data endpoint — the same one
 * coles.com.au calls. Server-side only, opt-in via COLES_PROVIDER=live.
 *
 * Unofficial and fragile: the build id rotates (resolved dynamically here) and
 * Coles' bot protection commonly blocks datacenter IPs, so this can work from a
 * home connection yet fail on a host like Vercel. Every failure degrades to the
 * search link. Search-only — Coles exposes no cart API.
 */
class LiveColesConnector implements ColesConnector {
  readonly id = "coles-live";
  private buildId: string | null = null;
  private buildIdAt = 0;

  private async resolveBuildId(): Promise<string> {
    const fresh = this.buildId && Date.now() - this.buildIdAt < 30 * 60 * 1000;
    if (fresh) return this.buildId!;
    const res = await fetch("https://www.coles.com.au/", { headers: BROWSER_HEADERS });
    if (!res.ok) throw new Error(`Coles homepage returned ${res.status}`);
    const html = await res.text();
    const m = html.match(/"buildId":"(.*?)"/);
    if (!m) throw new Error("Could not resolve Coles buildId (page shape changed or blocked).");
    this.buildId = m[1];
    this.buildIdAt = Date.now();
    return this.buildId;
  }

  async search(query: string): Promise<Product[]> {
    const buildId = await this.resolveBuildId();
    const url = `https://www.coles.com.au/_next/data/${buildId}/en/search/products.json?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: BROWSER_HEADERS });
    if (!res.ok) {
      // A rotated build id shows up as a 404 — clear the cache so the next call re-resolves.
      if (res.status === 404) this.buildId = null;
      throw new Error(`Coles search returned ${res.status}`);
    }
    const data: any = await res.json();
    const results: any[] = data?.pageProps?.searchResults?.results ?? [];
    return results
      .filter((r) => r && (r.name || r.description) && r._type !== "SINGLE_TILE")
      .slice(0, 8)
      .map(toProduct);
  }

  searchUrl(name: string): string {
    return colesSearch(name);
  }
}

function toProduct(r: any): Product {
  const now = r?.pricing?.now;
  const size = r?.size || r?.pricing?.unit?.ofMeasureUnits || "";
  const slug = r?.seoToken || (r?.id != null ? String(r.id) : "");
  return {
    id: `coles:${r?.id ?? r?.name}`,
    name: r?.name || r?.description || "Coles product",
    brand: r?.brand || "",
    price: typeof now === "number" ? now : null,
    size,
    url: slug ? `https://www.coles.com.au/product/${slug}` : colesSearch(r?.name || ""),
    kosher: "unverified",
  };
}

let connector: ColesConnector | null = null;

/**
 * The active connector. Defaults to link-only; set COLES_PROVIDER=live (server
 * env) to try live product search. COLES_PROVIDER is not a NEXT_PUBLIC var, so
 * on the client this is always undefined and the pure search-link connector is
 * used — the live path only ever runs in the /api/coles/search route.
 */
export function getColesConnector(): ColesConnector {
  if (!connector) {
    connector =
      process.env.COLES_PROVIDER === "live"
        ? new LiveColesConnector()
        : new SearchLinkConnector();
  }
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
