"use client";

import { useEffect, useState, useCallback } from "react";
import type { AppData, Recipe, UnavailableItem, KosherStatus, Product } from "./types";
import { load, save, emptyData } from "./store";
import { normaliseName } from "./normalise";

export function useAppData() {
  const [data, setData] = useState<AppData>(emptyData());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setData(load());
    setReady(true);
  }, []);

  const commit = useCallback((next: AppData) => {
    setData(next);
    save(next);
  }, []);

  const addRecipe = useCallback((r: Omit<Recipe, "id" | "createdAt">) => {
    setData((prev) => {
      const next = { ...prev, recipes: [{ ...r, id: crypto.randomUUID(), createdAt: Date.now() }, ...prev.recipes] };
      save(next);
      return next;
    });
  }, []);

  const removeRecipe = useCallback((id: string) => {
    setData((prev) => {
      const next = { ...prev, recipes: prev.recipes.filter((r) => r.id !== id) };
      save(next);
      return next;
    });
  }, []);

  const togglePantry = useCallback((name: string) => {
    const key = normaliseName(name);
    if (!key) return;
    setData((prev) => {
      const has = prev.pantryStaples.map(normaliseName).includes(key);
      const pantryStaples = has
        ? prev.pantryStaples.filter((p) => normaliseName(p) !== key)
        : [...prev.pantryStaples, name.trim()];
      const next = { ...prev, pantryStaples };
      save(next);
      return next;
    });
  }, []);

  const setKosher = useCallback((productId: string, status: KosherStatus) => {
    setData((prev) => {
      const next = { ...prev, kosher: { ...prev.kosher, [productId]: status } };
      save(next);
      return next;
    });
  }, []);

  const setFavourite = useCallback((ingredientKey: string, product: Product) => {
    setData((prev) => {
      const next = { ...prev, favourites: { ...prev.favourites, [ingredientKey]: product } };
      save(next);
      return next;
    });
  }, []);

  const addUnavailable = useCallback((item: Omit<UnavailableItem, "id">) => {
    setData((prev) => {
      const next = { ...prev, unavailable: [...prev.unavailable, { ...item, id: crypto.randomUUID() }] };
      save(next);
      return next;
    });
  }, []);

  const removeUnavailable = useCallback((id: string) => {
    setData((prev) => {
      const next = { ...prev, unavailable: prev.unavailable.filter((u) => u.id !== id) };
      save(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => commit(emptyData()), [commit]);

  return {
    data, ready,
    addRecipe, removeRecipe, togglePantry, setKosher, setFavourite,
    addUnavailable, removeUnavailable, reset,
  };
}
