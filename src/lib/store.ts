import type { AppData } from "./types";

// v1 persistence: browser localStorage. This makes the app fully usable on
// your own device with zero backend setup.
//
// PHASE 2 (sharing between two people): swap this module's load/save for
// Supabase calls (see supabase/schema.sql and README). The rest of the app
// talks only to load()/save(), so nothing else changes.

const KEY = "coles-list:data:v1";

export function emptyData(): AppData {
  return { recipes: [], pantryStaples: [], favourites: {}, kosher: {}, unavailable: [] };
}

export function seedData(): AppData {
  return {
    ...emptyData(),
    pantryStaples: ["salt", "black pepper", "olive oil", "water", "plain flour", "sugar"],
    unavailable: [
      { id: "u1", name: "Kosher challah", note: "From the bakery — not stocked at Coles" },
    ],
  };
}

export function load(): AppData {
  if (typeof window === "undefined") return emptyData();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return seedData();
    const parsed = JSON.parse(raw) as AppData;
    return { ...emptyData(), ...parsed };
  } catch {
    return seedData();
  }
}

export function save(data: AppData): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(data));
}
