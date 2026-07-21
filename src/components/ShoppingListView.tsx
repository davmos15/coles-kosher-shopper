"use client";

import type { ShoppingList, KosherStatus } from "@/lib/types";

const NEXT: Record<KosherStatus, KosherStatus> = {
  unverified: "verified",
  verified: "not",
  not: "unverified",
};

function KosherChip({ status, onClick }: { status: KosherStatus; onClick: () => void }) {
  const label = status === "verified" ? "kosher ✓" : status === "not" ? "not kosher" : "unverified";
  const cls = status === "verified" ? "chip-verified" : status === "not" ? "chip-not" : "chip-unverified";
  return (
    <button className={`chip ${cls} hover:opacity-75`} onClick={onClick} title="Tap to change — remembered next time">
      {label}
    </button>
  );
}

interface Props {
  list: ShoppingList;
  onSetKosher: (productId: string, status: KosherStatus) => void;
}

export function ShoppingListView({ list, onSetKosher }: Props) {
  const empty = list.lines.length === 0 && list.unavailable.length === 0;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-baseline justify-between px-5 pt-5">
        <div>
          <p className="eyebrow">The shop</p>
          <h2 className="display text-2xl mt-1">Coles list</h2>
        </div>
        {list.estimatedTotal != null && (
          <p className="text-sm text-muted">
            est. <span className="font-semibold text-ink">${list.estimatedTotal.toFixed(2)}</span>
          </p>
        )}
      </div>

      {list.unverifiedCount > 0 && (
        <div className="mx-5 mt-4 rounded-lg bg-[#fbf0dd] text-amber text-sm px-3 py-2">
          {list.unverifiedCount} item{list.unverifiedCount > 1 ? "s" : ""} not yet checked for kosher status — tap the chip to confirm once and it’s remembered.
        </div>
      )}

      {empty ? (
        <p className="px-5 py-10 text-sm text-muted text-center">
          Add a recipe and your consolidated list appears here.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {list.lines.map((line) => (
            <li key={line.name} className="flex items-center gap-3 px-5 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">{line.name}</span>
                  {line.product && (
                    <KosherChip
                      status={line.kosher}
                      onClick={() => line.product && onSetKosher(line.product.id, NEXT[line.kosher])}
                    />
                  )}
                </div>
                <p className="text-xs text-muted mt-0.5">
                  {line.amount}
                  {line.fromRecipes > 1 && <span> · from {line.fromRecipes} recipes</span>}
                  {line.needsMatch && <span> · no Coles match yet</span>}
                </p>
              </div>
              {line.product?.url && (
                <a className="btn btn-ghost text-xs shrink-0" href={line.product.url} target="_blank" rel="noreferrer">
                  Find on Coles
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      {list.unavailable.length > 0 && (
        <div className="border-t border-line px-5 py-4">
          <p className="eyebrow mb-2">Get elsewhere</p>
          <ul className="space-y-1 text-sm">
            {list.unavailable.map((u) => (
              <li key={u.id}>
                <span className="font-medium">{u.name}</span>
                {u.note && <span className="text-muted"> — {u.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {list.pantryExcluded.length > 0 && (
        <div className="border-t border-line px-5 py-3">
          <p className="text-xs text-muted">
            Skipped (in your cupboard): {list.pantryExcluded.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
