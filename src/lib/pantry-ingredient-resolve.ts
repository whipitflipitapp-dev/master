import type { SupabaseClient } from "@supabase/supabase-js";

import { escapeIlikePercentPattern, parseIngredientInput } from "@/lib/ingredients";
import { PANTRY_PARTIAL_INGREDIENT_MIN_LEN } from "@/lib/pantry";

type IngRow = { id: string; name: string };

export type PantryIngredientResolution = {
  userTokens: string[];
  tokenToIds: Map<string, Set<string>>;
  resolvedSpecs: { token: string; ids: Set<string> }[];
  userUnion: Set<string>;
  dbUnmatchedTokens: string[];
};

/**
 * Resolve textarea tokens to catalog ingredient rows (exact name + partial ilike),
 * same rules as Help Me Cook matching.
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
    const s = tokenToIds.get(row.name);
    if (s) s.add(row.id);
  }

  for (const token of userTokens) {
    if (tokenToIds.get(token)!.size > 0) continue;
    if (token.length < PANTRY_PARTIAL_INGREDIENT_MIN_LEN) continue;
    const pattern = `%${escapeIlikePercentPattern(token)}%`;
    const { data: partialRows, error: pErr } = await supabase
      .from("ingredients")
      .select("id,name")
      .ilike("name", pattern)
      .limit(80);

    if (pErr) {
      return { ok: false, error: pErr.message };
    }
    const acc = tokenToIds.get(token)!;
    for (const row of (partialRows ?? []) as IngRow[]) {
      acc.add(row.id);
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

  return {
    ok: true,
    data: {
      userTokens,
      tokenToIds,
      resolvedSpecs,
      userUnion,
      dbUnmatchedTokens,
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
