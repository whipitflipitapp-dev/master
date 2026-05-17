import type { SupabaseClient } from "@supabase/supabase-js";

import {
  pantryTokenMatchesIngredientName,
  parseIngredientInput,
} from "@/lib/ingredients";
import {
  fetchGenericPantryTokenHints,
  type GenericPantryTokenHint,
} from "@/lib/pantry-specificity";

export type { GenericPantryTokenHint };

type IngRow = { id: string; name: string };

export type PantryIngredientResolution = {
  userTokens: string[];
  tokenToIds: Map<string, Set<string>>;
  resolvedSpecs: { token: string; ids: Set<string> }[];
  userUnion: Set<string>;
  dbUnmatchedTokens: string[];
  genericTokenHints: GenericPantryTokenHint[];
};

/**
 * Resolve textarea tokens to catalog ingredient rows (exact normalized name only).
 * Same rules as Help Me Cook matching and recipe-detail pantry pre-checks.
 */
export async function resolvePantryIngredientTokens(
  supabase: SupabaseClient,
  ingredientText: string,
): Promise<
  { ok: true; data: PantryIngredientResolution } | { ok: false; error: string }
> {
  const userTokens = parseIngredientInput(ingredientText);
  if (userTokens.length === 0) {
    return {
      ok: true,
      data: {
        userTokens: [],
        tokenToIds: new Map(),
        resolvedSpecs: [],
        userUnion: new Set(),
        dbUnmatchedTokens: [],
        genericTokenHints: [],
      },
    };
  }

  const { data: exactRows, error: ingErr } = await supabase
    .from("ingredients")
    .select("id,name")
    .in("name", userTokens);

  if (ingErr) {
    return { ok: false, error: ingErr.message };
  }

  const tokenToIds = new Map<string, Set<string>>();
  for (const t of userTokens) tokenToIds.set(t, new Set());

  for (const row of (exactRows ?? []) as IngRow[]) {
    for (const token of userTokens) {
      if (!pantryTokenMatchesIngredientName(token, row.name)) continue;
      tokenToIds.get(token)!.add(row.id);
    }
  }

  const dbUnmatchedTokens = userTokens.filter((t) => tokenToIds.get(t)!.size === 0);
  const resolvedSpecs = userTokens
    .filter((t) => tokenToIds.get(t)!.size > 0)
    .map((t) => ({ token: t, ids: tokenToIds.get(t)! }));

  const userUnion = new Set<string>();
  for (const spec of resolvedSpecs) {
    for (const id of spec.ids) userUnion.add(id);
  }

  const genericTokenHints = await fetchGenericPantryTokenHints(
    supabase,
    userTokens,
    tokenToIds,
  );

  return {
    ok: true,
    data: {
      userTokens,
      tokenToIds,
      resolvedSpecs,
      userUnion,
      dbUnmatchedTokens,
      genericTokenHints,
    },
  };
}

/** Ingredient IDs the user's list resolves to — used to pre-check recipe rows. */
export async function resolvePantryUserIngredientIds(
  supabase: SupabaseClient,
  ingredientText: string,
): Promise<
  | { ok: true; userIngredientIds: Set<string> }
  | { ok: false; error: string }
> {
  const res = await resolvePantryIngredientTokens(supabase, ingredientText);
  if (!res.ok) return res;
  const { resolvedSpecs, userUnion } = res.data;
  if (resolvedSpecs.length === 0) {
    return { ok: true, userIngredientIds: new Set<string>() };
  }
  return { ok: true, userIngredientIds: userUnion };
}
