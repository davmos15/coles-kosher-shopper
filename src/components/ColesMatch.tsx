"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";

interface Props {
  query: string;
  current: Product | null;
  onPin: (product: Product) => void;
}

// Per-line Coles matcher: search Coles (via /api/coles/search) and pin the real
// product to this line, or enter it by hand. Pinning saves it as the "bought
// before" favourite, so its price and link stick around next time.
export function ColesMatch({ query, current, onPin }: Props) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState(query);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Product[] | null>(null);
  const [searchUrl, setSearchUrl] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [manual, setManual] = useState(false);

  const pinned = !!current && !current.id.startsWith("stub:");

  async function search() {
    setLoading(true);
    setNote(null);
    try {
      const res = await fetch(`/api/coles/search?q=${encodeURIComponent(term.trim())}`);
      const data = await res.json();
      setSearchUrl(data.searchUrl ?? null);
      setResults(data.products ?? []);
      if (data.error) setNote(data.error);
      else if ((data.products ?? []).length === 0) setNote("No live results — open Coles search or enter it manually.");
    } catch {
      setNote("Couldn't reach the search service.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function pin(p: Product) {
    onPin(p);
    setOpen(false);
  }

  return (
    <div className="shrink-0 relative">
      <button
        className={`btn btn-ghost text-xs ${pinned ? "!border-grocer !text-grocerDark" : ""}`}
        onClick={() => setOpen((o) => !o)}
        title={pinned ? "Change the pinned Coles product" : "Find and pin a Coles product"}
      >
        {pinned ? "✓ Matched" : "Match on Coles"}
      </button>

      {open && (
        <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} aria-hidden />
      )}

      {open && (
        <div className="absolute right-0 mt-2 z-30 w-72 card p-3 shadow-lg">
          {pinned && current && (
            <div className="text-xs text-muted mb-2">
              Pinned: <span className="text-ink font-medium">{current.name}</span>
              {current.price != null && <> · ${current.price.toFixed(2)}</>}
            </div>
          )}

          <div className="flex gap-2">
            <input
              className="field flex-1 !py-1.5 text-sm"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Search Coles"
            />
            <button className="btn btn-primary text-xs" onClick={search} disabled={loading || !term.trim()}>
              {loading ? "…" : "Search"}
            </button>
          </div>

          {results && results.length > 0 && (
            <ul className="mt-2 divide-y divide-line max-h-56 overflow-y-auto">
              {results.map((p) => (
                <li key={p.id} className="py-2 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted truncate">
                      {[p.brand, p.size].filter(Boolean).join(" · ")}
                      {p.price != null && <> · <span className="text-ink">${p.price.toFixed(2)}</span></>}
                    </p>
                  </div>
                  <button className="btn btn-ghost text-xs" onClick={() => pin(p)}>
                    Use
                  </button>
                </li>
              ))}
            </ul>
          )}

          {note && <p className="text-xs text-muted mt-2">{note}</p>}

          <div className="flex items-center justify-between mt-2 text-xs">
            {searchUrl ? (
              <a className="text-grocerDark hover:underline" href={searchUrl} target="_blank" rel="noreferrer">
                Open Coles search ↗
              </a>
            ) : (
              <span />
            )}
            <button className="text-muted hover:text-ink" onClick={() => setManual((m) => !m)}>
              {manual ? "Hide manual entry" : "Enter manually"}
            </button>
          </div>

          {manual && <ManualPin defaultName={query} onPin={pin} />}
        </div>
      )}
    </div>
  );
}

function ManualPin({ defaultName, onPin }: { defaultName: string; onPin: (p: Product) => void }) {
  const [name, setName] = useState(defaultName);
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const [url, setUrl] = useState("");

  function submit() {
    if (!name.trim()) return;
    const p = Number(price);
    onPin({
      id: `manual:${name.trim().toLowerCase()}`,
      name: name.trim(),
      brand: brand.trim(),
      size: size.trim(),
      price: price.trim() && Number.isFinite(p) ? p : null,
      url: url.trim() || null,
      kosher: "unverified",
    });
  }

  return (
    <div className="mt-2 space-y-1.5 border-t border-line pt-2">
      <input className="field !py-1.5 text-sm" placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="flex gap-1.5">
        <input className="field !py-1.5 text-sm flex-1" placeholder="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
        <input className="field !py-1.5 text-sm w-20" placeholder="Size" value={size} onChange={(e) => setSize(e.target.value)} />
      </div>
      <div className="flex gap-1.5">
        <input className="field !py-1.5 text-sm w-24" placeholder="$ price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        <input className="field !py-1.5 text-sm flex-1" placeholder="Coles URL (optional)" value={url} onChange={(e) => setUrl(e.target.value)} />
      </div>
      <button className="btn btn-primary text-xs w-full" onClick={submit}>
        Pin this product
      </button>
    </div>
  );
}
