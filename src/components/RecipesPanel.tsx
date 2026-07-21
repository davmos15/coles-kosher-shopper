"use client";

import type { Recipe } from "@/lib/types";

export function RecipesPanel({ recipes, onRemove }: { recipes: Recipe[]; onRemove: (id: string) => void }) {
  if (recipes.length === 0) {
    return (
      <div className="card p-4 text-sm text-muted">
        No recipes yet. Add one above and it’ll fold into the list on the right.
      </div>
    );
  }
  return (
    <div className="card p-4">
      <p className="eyebrow mb-3">Recipes in this shop ({recipes.length})</p>
      <ul className="space-y-3">
        {recipes.map((r) => (
          <li key={r.id} className="flex items-start justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
            <div>
              <p className="font-semibold">{r.title}</p>
              <p className="text-xs text-muted">
                {r.ingredients.length} ingredients · added by {r.addedBy}
              </p>
            </div>
            <button className="text-xs text-muted hover:text-[#9c3a28]" onClick={() => onRemove(r.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
