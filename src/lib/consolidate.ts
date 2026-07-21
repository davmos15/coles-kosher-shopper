import type { AppData, ShoppingList, ListLine, KosherStatus } from "./types";
import { normaliseName, displayName } from "./normalise";
import { newAccumulator, addToAccumulator, formatAmount, QtyAccumulator } from "./units";
import { matchColes } from "./coles";

/**
 * The brain: take every recipe plus the household's lists and produce one
 * consolidated shopping list.
 *
 * Steps, in order:
 *  1. Flatten ingredients across all recipes.
 *  2. Group by a normalised name key.
 *  3. Sum quantities within each group (mass/volume/count folded separately).
 *  4. Drop anything on the pantry-staples "always have" list.
 *  5. Attach a product: favourite ("bought before") first, else a Coles match.
 *  6. Resolve kosher status: prefer verified, flag unverified.
 *  7. Return, with the "can't get at Coles" items appended separately.
 */
export function consolidate(data: AppData): ShoppingList {
  const pantry = new Set(data.pantryStaples.map(normaliseName));

  // key -> { acc, recipeIds }
  const groups = new Map<string, { acc: QtyAccumulator; recipes: Set<string> }>();

  for (const recipe of data.recipes) {
    for (const ing of recipe.ingredients) {
      const key = normaliseName(ing.name);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, { acc: newAccumulator(), recipes: new Set() });
      const g = groups.get(key)!;
      addToAccumulator(g.acc, ing.quantity, ing.unit, ing.raw);
      g.recipes.add(recipe.id);
    }
  }

  const lines: ListLine[] = [];
  const pantryExcluded: string[] = [];
  let unverifiedCount = 0;
  let estimatedTotal = 0;
  let sawPrice = false;

  for (const [key, g] of Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    if (pantry.has(key)) {
      pantryExcluded.push(displayName(key));
      continue;
    }

    // Product: favourite wins, else a stubbed Coles candidate.
    const favourite = data.favourites[key] ?? null;
    const product = favourite ?? matchColes(key);
    const needsMatch = product === null;

    // Kosher: status stored against the product; learn-once memory overrides.
    let kosher: KosherStatus = "unverified";
    if (product) {
      kosher = data.kosher[productKey(product.id)] ?? product.kosher ?? "unverified";
    }
    if (kosher === "unverified") unverifiedCount++;

    if (product?.price != null) {
      estimatedTotal += product.price;
      sawPrice = true;
    }

    lines.push({
      name: displayName(key),
      amount: formatAmount(g.acc),
      fromRecipes: g.recipes.size,
      product,
      kosher,
      needsMatch,
    });
  }

  return {
    lines,
    pantryExcluded: pantryExcluded.sort(),
    unavailable: data.unavailable,
    unverifiedCount,
    estimatedTotal: sawPrice ? Math.round(estimatedTotal * 100) / 100 : null,
  };
}

export function productKey(id: string): string {
  return id;
}
