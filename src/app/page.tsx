"use client";

import { useMemo } from "react";
import { useAppData } from "@/lib/useAppData";
import { consolidate } from "@/lib/consolidate";
import { RecipeForm } from "@/components/RecipeForm";
import { RecipesPanel } from "@/components/RecipesPanel";
import { ListsPanel } from "@/components/ListsPanel";
import { ShoppingListView } from "@/components/ShoppingListView";

export default function Home() {
  const app = useAppData();
  const list = useMemo(() => consolidate(app.data), [app.data]);

  if (!app.ready) {
    return <main className="min-h-screen grid place-items-center text-muted">Loading…</main>;
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-line bg-card">
        <div className="max-w-6xl mx-auto px-5 py-5 flex items-baseline justify-between">
          <div className="flex items-baseline gap-3">
            <span className="display text-xl text-grocer">▪</span>
            <h1 className="display text-xl">Recipes in, one list out</h1>
          </div>
          <button className="text-xs text-muted hover:text-ink" onClick={app.reset}>
            Clear shop
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-6 grid lg:grid-cols-2 gap-6">
        <section className="space-y-4">
          <RecipeForm onAdd={app.addRecipe} />
          <RecipesPanel recipes={app.data.recipes} onRemove={app.removeRecipe} />
          <ListsPanel
            data={app.data}
            onTogglePantry={app.togglePantry}
            onAddUnavailable={app.addUnavailable}
            onRemoveUnavailable={app.removeUnavailable}
          />
        </section>

        <section className="lg:sticky lg:top-6 self-start">
          <ShoppingListView list={list} onSetKosher={app.setKosher} />
        </section>
      </div>
    </main>
  );
}
