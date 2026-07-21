"use client";

import { useMemo, useState } from "react";
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

  // Which lines are already in the trolley — a shopping-session convenience,
  // kept locally (it isn't part of the saved list).
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const doneCount = list.lines.filter((l) => done[l.name]).length;

  const listText = useMemo(
    () => list.lines.map((l) => `${l.name} — ${l.amount}`).join("\n"),
    [list.lines]
  );

  async function copyList() {
    try {
      await navigator.clipboard.writeText(listText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div>
          <p className="eyebrow">The shop</p>
          <h2 className="display text-2xl mt-1">Coles list</h2>
        </div>
        {!empty && (
          <div className="flex gap-5 pt-1">
            <div className="text-right">
              <div className="stat-num text-xl">
                {doneCount}/{list.lines.length}
              </div>
              <div className="stat-label">in trolley</div>
            </div>
            {list.estimatedTotal != null && (
              <div className="text-right">
                <div className="stat-num text-xl">${list.estimatedTotal.toFixed(2)}</div>
                <div className="stat-label">est. total</div>
              </div>
            )}
          </div>
        )}
      </div>

      {list.unverifiedCount > 0 && (
        <div className="mx-5 mt-4 rounded-lg bg-[#fbf0dd] text-amber text-sm px-3 py-2">
          {list.unverifiedCount} item{list.unverifiedCount > 1 ? "s" : ""} not yet checked for kosher status — tap the chip to confirm once and it’s remembered.
        </div>
      )}

      {!empty && list.lines.length > 0 && (
        <div className="mx-5 mt-4 flex flex-wrap items-center gap-2">
          <button className="btn btn-primary text-sm" onClick={copyList}>
            {copied ? "List copied ✓" : "Copy list"}
          </button>
          <a
            className="btn btn-ghost text-sm"
            href="https://www.coles.com.au"
            target="_blank"
            rel="noreferrer"
          >
            Open Coles ↗
          </a>
          <p className="text-xs text-muted w-full mt-1">
            Tick items as you add them. Coles has no public cart, so this copies your list and
            opens their site — each item below also links straight to its Coles search.
          </p>
        </div>
      )}

      {empty ? (
        <p className="px-5 py-10 text-sm text-muted text-center">
          Add a recipe and your consolidated list appears here.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {list.lines.map((line) => {
            const isDone = !!done[line.name];
            return (
              <li
                key={line.name}
                className={`flex items-center gap-3 px-5 py-3 ${isDone ? "line-done" : ""}`}
              >
                <button
                  className={`tick shrink-0 ${isDone ? "tick-on" : ""}`}
                  aria-label={isDone ? "Mark as not added" : "Mark as added to trolley"}
                  aria-pressed={isDone}
                  onClick={() => setDone((d) => ({ ...d, [line.name]: !d[line.name] }))}
                >
                  ✓
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="line-name font-semibold truncate">{line.name}</span>
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
            );
          })}
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
