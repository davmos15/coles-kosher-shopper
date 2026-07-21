import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppData, Recipe, UnavailableItem } from "./types";

// Persistence lives behind a small Backend interface so the rest of the app
// (useAppData, the engine, the components) never learns where data is stored.
//
//   - No Supabase env vars  -> LocalBackend  (browser localStorage, per-device)
//   - Supabase + a household -> SupabaseBackend (shared, live via realtime)
//
// AppData is the single shape everything speaks; each backend maps it to/from
// its own storage.

export interface Backend {
  /** Read the full snapshot for this store. */
  load(): Promise<AppData>;
  /** Persist a new snapshot (backends write only what actually changed). */
  save(data: AppData): Promise<void>;
  /** Subscribe to changes made elsewhere; returns an unsubscribe fn. */
  subscribe(onRemoteChange: () => void): () => void;
}

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

/** Pick the right backend for the current auth/config state. */
export function createBackend(
  client: SupabaseClient | null,
  householdId: string | null
): Backend {
  if (client && householdId) return new SupabaseBackend(client, householdId);
  return new LocalBackend();
}

// ---------------------------------------------------------------------------
// Local (offline) backend — browser localStorage, the zero-setup fallback.
// ---------------------------------------------------------------------------

const KEY = "coles-list:data:v1";

class LocalBackend implements Backend {
  async load(): Promise<AppData> {
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

  async save(data: AppData): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, JSON.stringify(data));
  }

  subscribe(onRemoteChange: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    // Cross-tab sync on the same device.
    const handler = (e: StorageEvent) => {
      if (e.key === KEY) onRemoteChange();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }
}

// ---------------------------------------------------------------------------
// Supabase backend — shared data keyed by household, live over realtime.
// ---------------------------------------------------------------------------

const TABLES = [
  "recipes",
  "pantry_staples",
  "favourites",
  "kosher_memory",
  "unavailable_items",
] as const;

class SupabaseBackend implements Backend {
  private last: AppData = emptyData();
  /** Serialises saves so each diffs against the previous one's result. */
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly client: SupabaseClient,
    private readonly householdId: string
  ) {}

  async load(): Promise<AppData> {
    const h = this.householdId;
    const [recipes, pantry, favs, kosher, unavail] = await Promise.all([
      this.client
        .from("recipes")
        .select("id, title, added_by, ingredients, created_at")
        .eq("household_id", h)
        .order("created_at", { ascending: false }),
      this.client.from("pantry_staples").select("name").eq("household_id", h),
      this.client
        .from("favourites")
        .select("ingredient_key, product")
        .eq("household_id", h),
      this.client
        .from("kosher_memory")
        .select("product_key, status")
        .eq("household_id", h),
      this.client
        .from("unavailable_items")
        .select("id, name, note")
        .eq("household_id", h),
    ]);

    const firstError =
      recipes.error || pantry.error || favs.error || kosher.error || unavail.error;
    if (firstError) throw firstError;

    const data: AppData = {
      recipes: (recipes.data ?? []).map((r: any) => ({
        id: r.id,
        title: r.title,
        addedBy: r.added_by,
        ingredients: r.ingredients,
        createdAt: r.created_at ? Date.parse(r.created_at) : Date.now(),
      })),
      pantryStaples: (pantry.data ?? []).map((p: any) => p.name),
      favourites: Object.fromEntries(
        (favs.data ?? []).map((f: any) => [f.ingredient_key, f.product])
      ),
      kosher: Object.fromEntries(
        (kosher.data ?? []).map((k: any) => [k.product_key, k.status])
      ),
      unavailable: (unavail.data ?? []).map((u: any) => ({
        id: u.id,
        name: u.name,
        note: u.note ?? "",
      })),
    };

    this.last = data;
    return data;
  }

  save(next: AppData): Promise<void> {
    // Chain so overlapping saves run one at a time; each then diffs against the
    // up-to-date snapshot rather than a stale one.
    const run = this.queue.then(() => this.persist(next)).catch((err) => {
      console.error("Supabase save failed", err);
    });
    this.queue = run;
    return run;
  }

  private async persist(next: AppData): Promise<void> {
    const h = this.householdId;
    const prev = this.last;
    const ops: Promise<unknown>[] = [];

    // --- recipes (keyed by id, immutable once added) ---
    const prevRecipeIds = new Set(prev.recipes.map((r) => r.id));
    const nextRecipeIds = new Set(next.recipes.map((r) => r.id));
    const newRecipes = next.recipes.filter((r) => !prevRecipeIds.has(r.id));
    const goneRecipes = prev.recipes
      .filter((r) => !nextRecipeIds.has(r.id))
      .map((r) => r.id);
    if (newRecipes.length) {
      ops.push(
        this.expect(
          this.client.from("recipes").upsert(
            newRecipes.map((r: Recipe) => ({
              id: r.id,
              household_id: h,
              title: r.title,
              added_by: r.addedBy,
              ingredients: r.ingredients,
              created_at: new Date(r.createdAt).toISOString(),
            })),
            { onConflict: "id" }
          )
        )
      );
    }
    if (goneRecipes.length) {
      ops.push(
        this.expect(
          this.client.from("recipes").delete().eq("household_id", h).in("id", goneRecipes)
        )
      );
    }

    // --- pantry_staples (set of names) ---
    const prevPantry = new Set(prev.pantryStaples);
    const nextPantry = new Set(next.pantryStaples);
    const addPantry = next.pantryStaples.filter((n) => !prevPantry.has(n));
    const removePantry = prev.pantryStaples.filter((n) => !nextPantry.has(n));
    if (addPantry.length) {
      ops.push(
        this.expect(
          this.client
            .from("pantry_staples")
            .upsert(
              addPantry.map((name) => ({ household_id: h, name })),
              { onConflict: "household_id,name" }
            )
        )
      );
    }
    if (removePantry.length) {
      ops.push(
        this.expect(
          this.client
            .from("pantry_staples")
            .delete()
            .eq("household_id", h)
            .in("name", removePantry)
        )
      );
    }

    // --- favourites (key -> product) ---
    const changedFavs = Object.entries(next.favourites).filter(
      ([k, v]) => JSON.stringify(prev.favourites[k]) !== JSON.stringify(v)
    );
    const goneFavs = Object.keys(prev.favourites).filter(
      (k) => !(k in next.favourites)
    );
    if (changedFavs.length) {
      ops.push(
        this.expect(
          this.client.from("favourites").upsert(
            changedFavs.map(([ingredient_key, product]) => ({
              household_id: h,
              ingredient_key,
              product,
            })),
            { onConflict: "household_id,ingredient_key" }
          )
        )
      );
    }
    if (goneFavs.length) {
      ops.push(
        this.expect(
          this.client
            .from("favourites")
            .delete()
            .eq("household_id", h)
            .in("ingredient_key", goneFavs)
        )
      );
    }

    // --- kosher_memory (key -> status) ---
    const changedKosher = Object.entries(next.kosher).filter(
      ([k, v]) => prev.kosher[k] !== v
    );
    const goneKosher = Object.keys(prev.kosher).filter((k) => !(k in next.kosher));
    if (changedKosher.length) {
      ops.push(
        this.expect(
          this.client.from("kosher_memory").upsert(
            changedKosher.map(([product_key, status]) => ({
              household_id: h,
              product_key,
              status,
            })),
            { onConflict: "household_id,product_key" }
          )
        )
      );
    }
    if (goneKosher.length) {
      ops.push(
        this.expect(
          this.client
            .from("kosher_memory")
            .delete()
            .eq("household_id", h)
            .in("product_key", goneKosher)
        )
      );
    }

    // --- unavailable_items (keyed by id) ---
    const prevUnavailIds = new Set(prev.unavailable.map((u) => u.id));
    const nextUnavailIds = new Set(next.unavailable.map((u) => u.id));
    const newUnavail = next.unavailable.filter((u) => !prevUnavailIds.has(u.id));
    const goneUnavail = prev.unavailable
      .filter((u) => !nextUnavailIds.has(u.id))
      .map((u) => u.id);
    if (newUnavail.length) {
      ops.push(
        this.expect(
          this.client.from("unavailable_items").upsert(
            newUnavail.map((u: UnavailableItem) => ({
              id: u.id,
              household_id: h,
              name: u.name,
              note: u.note,
            })),
            { onConflict: "id" }
          )
        )
      );
    }
    if (goneUnavail.length) {
      ops.push(
        this.expect(
          this.client
            .from("unavailable_items")
            .delete()
            .eq("household_id", h)
            .in("id", goneUnavail)
        )
      );
    }

    if (ops.length) await Promise.all(ops);
    this.last = next;
  }

  subscribe(onRemoteChange: () => void): () => void {
    // Coalesce the burst of table events a single save produces.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ping = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(onRemoteChange, 150);
    };

    const channel = this.client.channel(`household:${this.householdId}`);
    for (const table of TABLES) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `household_id=eq.${this.householdId}`,
        },
        ping
      );
    }
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      this.client.removeChannel(channel);
    };
  }

  /** Turn a PostgREST builder into a promise that rejects on error. */
  private async expect(builder: any): Promise<void> {
    const { error } = await builder;
    if (error) throw error;
  }
}
