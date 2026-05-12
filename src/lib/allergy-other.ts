import { normalizeIngredientToken } from "@/lib/ingredients";

/** Matches onboarding / profile server validation */
export const OTHER_ALLERGENS_MAX_LEN = 500;

/** Max comma/newline-separated entries kept after parsing */
export const OTHER_ALLERGENS_MAX_TOKENS = 40;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parses profile/onboarding free-text other allergens (comma, newline, semicolon).
 * Dedupes case-insensitively; preserves first-seen order.
 */
export function parseOtherAllergenTokens(
  raw: string | null | undefined,
): string[] {
  if (!raw || typeof raw !== "string") return [];
  const parts = raw
    .split(/[\n,;]+/)
    .map((p) => normalizeIngredientToken(p))
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    if (p.length < 2 || p.length > 120) continue;
    seen.add(key);
    out.push(p);
    if (out.length >= OTHER_ALLERGENS_MAX_TOKENS) break;
  }
  return out;
}

export function sanitizeOtherAllergenInput(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if (!v) return null;
  return v.length > OTHER_ALLERGENS_MAX_LEN
    ? v.slice(0, OTHER_ALLERGENS_MAX_LEN)
    : v;
}

/**
 * True if `token` appears as a substring of `ingredientName` with non-letter
 * boundaries (avoids matching "nut" inside "peanut" incorrectly).
 */
export function ingredientMatchesOtherToken(
  ingredientName: string,
  token: string,
): boolean {
  const ing = normalizeIngredientToken(ingredientName);
  const t = normalizeIngredientToken(token);
  if (!t || t.length < 2) return false;
  const escaped = escapeRegExp(t);
  const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
  return re.test(ing);
}

/** Which tokens match any of the given ingredient display names */
export function matchedOtherAllergenTokens(
  ingredientNames: string[],
  tokens: string[],
): string[] {
  if (tokens.length === 0 || ingredientNames.length === 0) return [];
  const matched: string[] = [];
  for (const t of tokens) {
    if (ingredientNames.some((n) => ingredientMatchesOtherToken(n, t))) {
      matched.push(t);
    }
  }
  return matched;
}

export function profileHasAllergenSelections(
  selectedAllergenIds: string[],
  allergyOtherRaw: string | null | undefined,
): boolean {
  return (
    selectedAllergenIds.length > 0 ||
    parseOtherAllergenTokens(allergyOtherRaw).length > 0
  );
}
