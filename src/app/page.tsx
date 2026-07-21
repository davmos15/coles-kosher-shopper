"use client";

import { useMemo, useState } from "react";
import { useAppData } from "@/lib/useAppData";
import { consolidate } from "@/lib/consolidate";
import { useSupabase } from "@/lib/supabase/provider";
import { AuthGate } from "@/components/AuthGate";
import { RecipeForm } from "@/components/RecipeForm";
import { RecipesPanel } from "@/components/RecipesPanel";
import { ManualItemsPanel } from "@/components/ManualItemsPanel";
import { ListsPanel } from "@/components/ListsPanel";
import { ShoppingListView } from "@/components/ShoppingListView";

export default function Home() {
  return (
    <AuthGate>
      <Shop />
    </AuthGate>
  );
}

function Shop() {
  const app = useAppData();
  const list = useMemo(() => consolidate(app.data), [app.data]);

  if (!app.ready) {
    return <main className="min-h-screen grid place-items-center text-muted">Loading…</main>;
  }

  const hasRecipes = app.data.recipes.length > 0;

  function clearShop() {
    if (hasRecipes && !window.confirm("Clear the recipes for this shop? Your cupboard, favourites and kosher checks are kept.")) {
      return;
    }
    app.clearShop();
  }

  return (
    <main className="min-h-screen">
      <header className="appbar">
        <div className="max-w-6xl mx-auto px-5 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="brandmark shrink-0">C</span>
            <div className="min-w-0">
              <h1 className="display text-lg leading-tight truncate">Recipes in, one list out</h1>
              <p className="text-xs text-muted leading-tight hidden sm:block">
                Paste recipes → one consolidated Coles list
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <button
              className="text-xs text-muted hover:text-ink disabled:opacity-40"
              onClick={clearShop}
              disabled={!hasRecipes}
            >
              Clear shop
            </button>
            <AccountBar />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-6 grid lg:grid-cols-2 gap-6">
        <section className="space-y-4">
          <RecipeForm onAdd={app.addRecipe} />
          <ManualItemsPanel
            items={app.data.manualItems}
            onAdd={app.addManualItem}
            onRemove={app.removeManualItem}
          />
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

/** Invite code + sign-out — only meaningful when sharing via Supabase. */
function AccountBar() {
  const { configured, household, signOut } = useSupabase();
  const [copied, setCopied] = useState(false);

  if (!configured || !household) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(household!.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — nothing to do */
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={copy}
        title="Copy this code and send it to the other person so they can join your shop"
        className="text-xs text-muted hover:text-ink"
      >
        {copied ? "Copied!" : "Invite code"}
      </button>
      <button className="text-xs text-muted hover:text-ink" onClick={signOut}>
        Sign out
      </button>
    </div>
  );
}
