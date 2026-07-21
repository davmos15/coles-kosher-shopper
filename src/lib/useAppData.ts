"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { AppData, Recipe, UnavailableItem, ManualItem, KosherStatus, Product } from "./types";
import { createBackend, emptyData } from "./store";
import { normaliseName } from "./normalise";
import { useSupabase } from "./supabase/provider";

// Same public API as before — the components and the engine don't change. What
// changed is underneath: state is loaded from and saved to a Backend (local
// storage, or Supabase keyed by household), and remote edits stream in live.
//
// Mutations update local state optimistically; a single effect persists the
// snapshot. Supabase writes are diff-based, so re-persisting an unchanged
// snapshot (e.g. right after a load or a realtime refresh) is a no-op.

export function useAppData() {
  const { client, household } = useSupabase();
  const backend = useMemo(
    () => createBackend(client, household?.id ?? null),
    [client, household?.id]
  );

  const [data, setData] = useState<AppData>(emptyData());
  const [ready, setReady] = useState(false);

  // Load the snapshot and subscribe to remote changes whenever the backend
  // (i.e. the household, or local vs Supabase) changes.
  useEffect(() => {
    let active = true;
    setReady(false);
    backend.load().then((d) => {
      if (!active) return;
      setData(d);
      setReady(true);
    });
    const unsubscribe = backend.subscribe(() => {
      backend.load().then((d) => {
        if (active) setData(d);
      });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [backend]);

  // Persist local edits. Diff-based backends make a no-op save cheap, so this
  // safely fires on the freshly-loaded snapshot too.
  useEffect(() => {
    if (!ready) return;
    void backend.save(data);
  }, [data, ready, backend]);

  const addRecipe = useCallback((r: Omit<Recipe, "id" | "createdAt">) => {
    const recipe: Recipe = { ...r, id: crypto.randomUUID(), createdAt: Date.now() };
    setData((prev) => ({ ...prev, recipes: [recipe, ...prev.recipes] }));
  }, []);

  const removeRecipe = useCallback((id: string) => {
    setData((prev) => ({ ...prev, recipes: prev.recipes.filter((r) => r.id !== id) }));
  }, []);

  const addManualItem = useCallback((item: Omit<ManualItem, "id">) => {
    const entry: ManualItem = { ...item, id: crypto.randomUUID() };
    setData((prev) => ({ ...prev, manualItems: [...prev.manualItems, entry] }));
  }, []);

  const removeManualItem = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      manualItems: prev.manualItems.filter((m) => m.id !== id),
    }));
  }, []);

  const togglePantry = useCallback((name: string) => {
    const key = normaliseName(name);
    if (!key) return;
    setData((prev) => {
      const has = prev.pantryStaples.map(normaliseName).includes(key);
      const pantryStaples = has
        ? prev.pantryStaples.filter((p) => normaliseName(p) !== key)
        : [...prev.pantryStaples, name.trim()];
      return { ...prev, pantryStaples };
    });
  }, []);

  const setKosher = useCallback((productId: string, status: KosherStatus) => {
    setData((prev) => ({ ...prev, kosher: { ...prev.kosher, [productId]: status } }));
  }, []);

  const setFavourite = useCallback((ingredientKey: string, product: Product) => {
    setData((prev) => ({
      ...prev,
      favourites: { ...prev.favourites, [ingredientKey]: product },
    }));
  }, []);

  const addUnavailable = useCallback((item: Omit<UnavailableItem, "id">) => {
    const entry: UnavailableItem = { ...item, id: crypto.randomUUID() };
    setData((prev) => ({ ...prev, unavailable: [...prev.unavailable, entry] }));
  }, []);

  const removeUnavailable = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      unavailable: prev.unavailable.filter((u) => u.id !== id),
    }));
  }, []);

  // "Clear shop" ends the current run: it drops the recipes and manually-added
  // items (and so the generated list) but keeps everything you've taught the
  // app — cupboard staples, favourites, learned kosher statuses, can't-get list.
  const clearShop = useCallback(() => {
    setData((prev) => ({ ...prev, recipes: [], manualItems: [] }));
  }, []);

  return {
    data, ready,
    addRecipe, removeRecipe, addManualItem, removeManualItem,
    togglePantry, setKosher, setFavourite,
    addUnavailable, removeUnavailable, clearShop,
  };
}
