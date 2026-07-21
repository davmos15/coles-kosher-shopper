"use client";

import { useState } from "react";
import type { AppData, UnavailableItem } from "@/lib/types";

interface Props {
  data: AppData;
  onTogglePantry: (name: string) => void;
  onAddUnavailable: (item: Omit<UnavailableItem, "id">) => void;
  onRemoveUnavailable: (id: string) => void;
}

export function ListsPanel({ data, onTogglePantry, onAddUnavailable, onRemoveUnavailable }: Props) {
  const [pantryInput, setPantryInput] = useState("");
  const [unavName, setUnavName] = useState("");
  const [unavNote, setUnavNote] = useState("");

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <p className="eyebrow mb-1">Always in the cupboard</p>
        <p className="text-xs text-muted mb-3">These never appear on the shopping list.</p>
        <div className="flex gap-2 mb-3">
          <input
            className="field"
            placeholder="e.g. salt, plain flour"
            value={pantryInput}
            onChange={(e) => setPantryInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && pantryInput.trim()) {
                onTogglePantry(pantryInput);
                setPantryInput("");
              }
            }}
          />
          <button
            className="btn btn-ghost shrink-0"
            onClick={() => {
              if (pantryInput.trim()) {
                onTogglePantry(pantryInput);
                setPantryInput("");
              }
            }}
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.pantryStaples.map((p) => (
            <button
              key={p}
              className="chip chip-verified hover:opacity-70"
              title="Remove"
              onClick={() => onTogglePantry(p)}
            >
              {p} ✕
            </button>
          ))}
          {data.pantryStaples.length === 0 && <p className="text-xs text-muted">Nothing yet.</p>}
        </div>
      </div>

      <div className="card p-4">
        <p className="eyebrow mb-1">Can’t get at Coles</p>
        <p className="text-xs text-muted mb-3">Kept as a separate reminder list, appended to each shop.</p>
        <div className="grid grid-cols-1 gap-2 mb-3">
          <input className="field" placeholder="Item, e.g. kosher challah" value={unavName} onChange={(e) => setUnavName(e.target.value)} />
          <div className="flex gap-2">
            <input className="field" placeholder="Where you get it (optional)" value={unavNote} onChange={(e) => setUnavNote(e.target.value)} />
            <button
              className="btn btn-ghost shrink-0"
              onClick={() => {
                if (unavName.trim()) {
                  onAddUnavailable({ name: unavName.trim(), note: unavNote.trim() });
                  setUnavName("");
                  setUnavNote("");
                }
              }}
            >
              Add
            </button>
          </div>
        </div>
        <ul className="space-y-2">
          {data.unavailable.map((u) => (
            <li key={u.id} className="flex items-start justify-between gap-3 text-sm">
              <span>
                <span className="font-medium">{u.name}</span>
                {u.note && <span className="text-muted"> — {u.note}</span>}
              </span>
              <button className="text-xs text-muted hover:text-[#9c3a28]" onClick={() => onRemoveUnavailable(u.id)}>
                Remove
              </button>
            </li>
          ))}
          {data.unavailable.length === 0 && <p className="text-xs text-muted">Nothing yet.</p>}
        </ul>
      </div>
    </div>
  );
}
