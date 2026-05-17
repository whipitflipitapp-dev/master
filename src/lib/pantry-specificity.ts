import type { SupabaseClient } from "@supabase/supabase-js";

import {
  escapeIlikePercentPattern,
  normalizeIngredientToken,
} from "@/lib/ingredients";

/** Broad pantry tokens — partial pantry match works; hints nudge users toward specifics. */
const GENERIC_PANTRY_TOKENS = new Set([
  "beef",
  "cheese",
  "chicken",
  "fish",
  "lamb",
  "mushroom",
  "mushrooms",
  "pasta",
  "pork",
  "potato",
  "potatoes",
  "rice",
  "salmon",
  "seafood",
  "shrimp",
  "tofu",
  "turkey",
  "vegetable",
  "vegetables",
  "vinegar",
  "wine",
]);

export type GenericPantryTokenHint = {
  token: string;
  /** Up to 3 catalog names more specific than the token (e.g. chicken breast). */
  examples: string[];
};

export function isGenericPantryToken(token: string): boolean {
  const n = normalizeIngredientToken(token);
  return n.length > 0 && GENERIC_PANTRY_TOKENS.has(n);
}

/** Tokens in the input list that are considered too broad for exact pantry matching. */
export function findGenericPantryTokens(tokens: string[]): string[] {
  return tokens.filter(isGenericPantryToken);
}

/**
 * Load specificity hints for generic tokens (catalog names starting with "token ").
 * Unmatched generic tokens always get a hint; matched ones only when 2+ variants exist.
 */
export async function fetchGenericPantryTokenHints(
  supabase: SupabaseClient,
  userTokens: string[],
  tokenToIds: Map<string, Set<string>>,
): Promise<GenericPantryTokenHint[]> {
  const hints: GenericPantryTokenHint[] = [];

  for (const token of userTokens) {
    if (!isGenericPantryToken(token)) continue;

    const matched = (tokenToIds.get(token)?.size ?? 0) > 0;
    const prefixPattern = `${escapeIlikePercentPattern(token)} %`;

    const { data: rows, error } = await supabase
      .from("ingredients")
      .select("name")
      .ilike("name", prefixPattern)
      .order("name")
      .limit(5);

    if (error) continue;

    const tokenNorm = normalizeIngredientToken(token);
    const examples = (rows ?? [])
      .map((r: { name: string }) => r.name)
      .filter((name) => normalizeIngredientToken(name) !== tokenNorm)
      .slice(0, 3);

    const unmatched = !matched;
    if (!unmatched && examples.length < 2) continue;

    hints.push({ token, examples });
  }

  return hints;
}
