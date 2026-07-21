// Small, deliberately modest unit engine. It converts within a family
// (mass, volume) to a base unit so quantities can be summed, and leaves
// anything it doesn't understand as a separate, clearly-labelled line.

type Family = "mass" | "volume" | "count" | "unknown";

const MASS: Record<string, number> = { mg: 0.001, g: 1, gram: 1, grams: 1, kg: 1000, kilogram: 1000, kilograms: 1000 };
const VOLUME: Record<string, number> = {
  ml: 1, milliliter: 1, milliliters: 1, millilitre: 1, millilitres: 1,
  l: 1000, litre: 1000, litres: 1000, liter: 1000, liters: 1000,
  tsp: 5, teaspoon: 5, teaspoons: 5,
  tbsp: 15, tablespoon: 15, tablespoons: 15,
  cup: 250, cups: 250, // AUS metric cup
};

export function normaliseUnit(unit: string): { family: Family; base: string; factor: number } {
  const u = unit.trim().toLowerCase().replace(/\.$/, "");
  if (u in MASS) return { family: "mass", base: "g", factor: MASS[u] };
  if (u in VOLUME) return { family: "volume", base: "ml", factor: VOLUME[u] };
  if (u === "" || u === "x" || u === "whole" || u === "each") return { family: "count", base: "", factor: 1 };
  return { family: "unknown", base: u, factor: 1 };
}

/** A running accumulator keyed by unit family. */
export interface QtyAccumulator {
  mass: number; // grams
  volume: number; // ml
  count: number; // plain items
  // Units we couldn't fold together, kept verbatim for display
  loose: string[];
  hadUnknownQty: boolean; // e.g. "to taste"
}

export function newAccumulator(): QtyAccumulator {
  return { mass: 0, volume: 0, count: 0, loose: [], hadUnknownQty: false };
}

export function addToAccumulator(acc: QtyAccumulator, quantity: number | null, unit: string, raw: string) {
  if (quantity === null) {
    acc.hadUnknownQty = true;
    return;
  }
  const { family, factor } = normaliseUnit(unit);
  if (family === "mass") acc.mass += quantity * factor;
  else if (family === "volume") acc.volume += quantity * factor;
  else if (family === "count") acc.count += quantity;
  else acc.loose.push(raw.trim());
}

/** Render an accumulator to a short human amount string. */
export function formatAmount(acc: QtyAccumulator): string {
  const parts: string[] = [];
  if (acc.mass > 0) parts.push(acc.mass >= 1000 ? `${round(acc.mass / 1000)} kg` : `${round(acc.mass)} g`);
  if (acc.volume > 0) parts.push(acc.volume >= 1000 ? `${round(acc.volume / 1000)} L` : `${round(acc.volume)} ml`);
  if (acc.count > 0) parts.push(`${round(acc.count)}`);
  if (acc.loose.length) parts.push(...dedupe(acc.loose));
  if (acc.hadUnknownQty && parts.length === 0) return "as needed";
  if (acc.hadUnknownQty) parts.push("+ as needed");
  return parts.length ? parts.join(" + ") : "—";
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
function dedupe(xs: string[]): string[] {
  return Array.from(new Set(xs));
}
