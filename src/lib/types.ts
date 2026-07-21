// ---- Core domain types ----

export type KosherStatus = "verified" | "not" | "unverified";

/** One ingredient line as parsed from a recipe. */
export interface Ingredient {
  /** Human name, e.g. "brown onion" */
  name: string;
  /** Numeric amount if known, else null (e.g. "to taste") */
  quantity: number | null;
  /** Unit token if known, e.g. "g", "ml", "tbsp", "" for plain counts */
  unit: string;
  /** Original text as written in the recipe */
  raw: string;
}

export interface Recipe {
  id: string;
  title: string;
  /** Who added it — free label so both people can see provenance */
  addedBy: string;
  ingredients: Ingredient[];
  createdAt: number;
}

/** A Coles product (stubbed for now — real data drops in later). */
export interface Product {
  id: string;
  name: string;
  brand: string;
  /** Price in AUD; null when unknown/stubbed */
  price: number | null;
  size: string;
  url: string | null;
  kosher: KosherStatus;
}

/** Preferred product per normalised ingredient key ("bought before"). */
export type Favourites = Record<string, Product>;

/** productKey -> status. Learn-once kosher memory. */
export type KosherMemory = Record<string, KosherStatus>;

/** Item you can't get at Coles — tracked separately. */
export interface UnavailableItem {
  id: string;
  name: string;
  note: string;
}

/** An item added straight to the shop, not via a recipe. */
export interface ManualItem {
  id: string;
  name: string;
  quantity: number | null;
  unit: string;
}

/** Everything persisted for a household. */
export interface AppData {
  recipes: Recipe[];
  manualItems: ManualItem[]; // added directly, outside any recipe
  pantryStaples: string[]; // normalised names always in the cupboard
  favourites: Favourites;
  kosher: KosherMemory;
  unavailable: UnavailableItem[];
}

// ---- Generated shopping list ----

export interface ListLine {
  /** Display name for the consolidated ingredient */
  name: string;
  /** Combined amount text, e.g. "750 g" or "3" or "assorted" */
  amount: string;
  /** How many recipes contributed to this line */
  fromRecipes: number;
  /** True when (part of) this line was added manually, not via a recipe */
  manual: boolean;
  /** Matched product (favourite or stubbed candidate), if any */
  product: Product | null;
  /** Kosher status of the matched product */
  kosher: KosherStatus;
  /** True when we couldn't confidently match a Coles product yet */
  needsMatch: boolean;
}

export interface ShoppingList {
  lines: ListLine[];
  /** Names excluded because they're pantry staples */
  pantryExcluded: string[];
  /** Manual "can't get at Coles" additions */
  unavailable: UnavailableItem[];
  /** Count of lines whose kosher status is unverified */
  unverifiedCount: number;
  /** Estimated total of matched products with known prices */
  estimatedTotal: number | null;
}
