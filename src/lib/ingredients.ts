/** Normalize ingredient tokens for matching (lowercase, trim). */
export function normalizeIngredientToken(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Split user textarea into normalized unique ingredient names. */
export function parseIngredientInput(text: string): string[] {
  const parts = text
    .split(/[\n,;]+/)
    .map((p) => normalizeIngredientToken(p))
    .filter(Boolean);
  return [...new Set(parts)];
}

/** Merge normalized unique tokens; earlier groups win ordering. */
export function mergeIngredientTokens(...groups: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const g of groups) {
    for (const t of g) {
      const k = t.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(t);
    }
  }
  return out;
}
