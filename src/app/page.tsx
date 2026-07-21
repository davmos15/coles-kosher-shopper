"use client";

import { useMemo, useState } from "react";
import { useAppData } from "@/lib/useAppData";
import { consolidate } from "@/lib/consolidate";
import { useSupabase } from "@/lib/supabase/provider";
import { AuthGate } from "@/components/AuthGate";
import { RecipeForm } from "@/components/RecipeForm";
import { RecipesPanel } from "@/components/RecipesPanel";
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

  return (
    <main className="min-h-screen">
      <header className="border-b border-line bg-card">
        <div className="max-w-6xl mx-auto px-5 py-5 flex items-baseline justify-between">
          <div className="flex items-baseline gap-3">
            <span className="display text-xl text-grocer">▪</span>
            <h1 className="display text-xl">Recipes in, one list out</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-xs text-muted hover:text-ink" onClick={app.reset}>
              Clear shop
            </button>
            <AccountBar />
          </div>
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
