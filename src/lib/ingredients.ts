/** Normalize ingredient tokens for matching (lowercase, trim). */
export function normalizeIngredientToken(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Escape `%`, `_`, and `\` for use inside PostgreSQL ILIKE patterns wrapped with `%`. */
export function escapeIlikePercentPattern(token: string): string {
  return token
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

/** Strip leading amounts/units so pantry tokens align with canonical `ingredients.name`. */
export function stripIngredientQuantityPrefix(raw: string): string {
  let t = raw.trim();
  for (let i = 0; i < 8; i++) {
    const before = t;
    t = t.replace(/^[\s]*[\u00BC-\u00BE\u2150-\u215E]\s*/u, "");
    t = t.replace(
      /^\s*(?:\d+(?:\/\d+)?(?:\.\d+)?(?:\s*-\s*\d+(?:\/\d+)?)?)\s*/u,
      "",
    );
    t = t.replace(
      /^\s*(?:(?:cup|cups|c\.|tbsp|tbs\.?|tsp|ts\.|tablespoons?|teaspoons?|ounces?|oz\.?|lb\.?|lbs\.?|pounds?|grams?|g\b|kg\.?|ml\b|m[lL]\b|liter|liters|litre|litres)\b\.?)\s*/iu,
      "",
    );
    if (t === before) break;
  }
  return t.trim();
}

/** Canonical name for database rows — same normalization Help Me Cook matches on. */
export function ingredientCanonicalName(rawLine: string): string {
  const stripped = stripIngredientQuantityPrefix(rawLine);
  const fromStripped = normalizeIngredientToken(stripped);
  if (fromStripped) return fromStripped;
  return normalizeIngredientToken(rawLine);
}

/**
 * Split like {@link parseIngredientInput} (comma, newline, semicolon).
 * Dedupes by canonical name; preserves first-seen order for sort_order.
 */
export function parseIngredientLinesForRecipe(text: string): {
  raw: string;
  canonical: string;
}[] {
  const parts = text
    .split(/[\n,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: { raw: string; canonical: string }[] = [];
  for (const raw of parts) {
    const canonical = ingredientCanonicalName(raw);
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    out.push({ raw, canonical });
  }
  return out;
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
