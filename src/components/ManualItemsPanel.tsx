"use client";

import { useState } from "react";
import type { ManualItem } from "@/lib/types";

interface Props {
  items: ManualItem[];
  onAdd: (item: Omit<ManualItem, "id">) => void;
  onRemove: (id: string) => void;
}

export function ManualItemsPanel({ items, onAdd, onRemove }: Props) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const q = qty.trim() === "" ? null : Number(qty);
    onAdd({
      name: trimmed,
      quantity: q != null && Number.isFinite(q) ? q : null,
      unit: unit.trim(),
    });
    setName("");
    setQty("");
    setUnit("");
  }

  return (
    <div className="card p-4">
      <p className="eyebrow mb-1">Add an item</p>
      <p className="text-xs text-muted mb-3">
        Straight onto the list — no recipe needed. It merges with matching recipe items.
      </p>
      <div className="flex gap-2 mb-3">
        <input
          className="field flex-1"
          placeholder="e.g. paper towels, milk"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <input
          className="field w-16 text-center"
          placeholder="qty"
          inputMode="decimal"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <input
          className="field w-20"
          placeholder="unit"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button className="btn btn-ghost shrink-0" onClick={submit}>
          Add
        </button>
      </div>
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {items.map((m) => (
            <li key={m.id}>
              <button
                className="chip chip-verified hover:opacity-70"
                title="Remove"
                onClick={() => onRemove(m.id)}
              >
                {m.quantity != null ? `${m.quantity}${m.unit ? " " + m.unit : ""} ` : ""}
                {m.name} ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
