// Turns "2 large Brown Onions, diced" style names into a stable grouping key.
// Intentionally conservative — better to keep two things separate than to
// wrongly merge them.

const STOP_DESCRIPTORS = [
  "large", "small", "medium", "fresh", "ripe", "free-range", "free range",
  "organic", "raw", "cooked", "chopped", "diced", "sliced", "minced", "grated",
  "finely", "roughly", "peeled", "trimmed", "boneless", "skinless",
  "to taste", "optional", "for serving", "for garnish",
];

export function normaliseName(name: string): string {
  let n = name.toLowerCase().trim();
  // drop anything after a comma (usually prep instructions)
  n = n.split(",")[0];
  // strip bracketed notes
  n = n.replace(/\([^)]*\)/g, " ");
  // remove common descriptors
  for (const d of STOP_DESCRIPTORS) {
    n = n.replace(new RegExp(`\\b${d}\\b`, "g"), " ");
  }
  // collapse whitespace
  n = n.replace(/\s+/g, " ").trim();
  // naive singularisation for the last word
  n = singularise(n);
  return n;
}

function singularise(s: string): string {
  const words = s.split(" ");
  const last = words[words.length - 1];
  if (last.length > 3) {
    if (last.endsWith("ies")) words[words.length - 1] = last.slice(0, -3) + "y";
    else if (last.endsWith("oes")) words[words.length - 1] = last.slice(0, -2);
    else if (last.endsWith("s") && !last.endsWith("ss")) words[words.length - 1] = last.slice(0, -1);
  }
  return words.join(" ");
}

/** A nice title-cased display name from a normalised key. */
export function displayName(key: string): string {
  return key.replace(/\b\w/g, (c) => c.toUpperCase());
}
