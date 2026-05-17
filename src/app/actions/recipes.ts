"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  normalizeIngredientToken,
  parseIngredientLinesForRecipe,
} from "@/lib/ingredients";
import {
  PANTRY_MATCH_MIN_PERCENT,
  PANTRY_MATCH_SHORT_QUERY_MAX_TOKENS,
} from "@/lib/pantry";
import {
  matchedOtherAllergenTokens,
  parseOtherAllergenTokens,
} from "@/lib/allergy-other";
import {
  DEMO_RECIPE_IDS_ORDERED,
  resolveRecipeDisplayImageUrl,
} from "@/lib/demo-recipe-cover-images";
import {
  validateRecipeImageUploadMeta,
  validateStoredRecipeImageUrl,
} from "@/lib/recipe-image";
import { estimateMissingIngredientsCostCents } from "@/lib/ingredient-cost-estimates";
import { resolvePantryIngredientTokens } from "@/lib/pantry-ingredient-resolve";
import { checkMonthlyRecipeUploadAllowed } from "@/lib/recipe-upload-limit";
import { logEvent } from "@/lib/telemetry";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getExcludedRecipeIdsForUser } from "@/lib/user-excluded-recipes";

export type RecipeListItem = {
  id: string;
  title: string;
  image_url: string | null;
  favorites_count: number;
  difficulty: string | null;
  cook_time_minutes: number | null;
  created_at: string;
  creator_display_name: string | null;
  creator_id: string | null;
  creator_avatar_url: string | null;
};

type RecipeBrowseRow = Omit<
  RecipeListItem,
  "creator_display_name" | "creator_id" | "creator_avatar_url"
>;

function trimRecipeImageUrl(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  return s.length > 0 ? s : null;
}

/**
 * RPC / REST rows may omit keys or use alternate casing depending on PostgREST
 * and deployed function versions — normalize before UI.
 */
function coerceRecipeBrowseRow(row: unknown): RecipeBrowseRow | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.title !== "string") return null;

  const rawImg = r.image_url ?? r.imageUrl;
  const favoritesRaw = r.favorites_count;
  const favoritesCount =
    typeof favoritesRaw === "number" && Number.isFinite(favoritesRaw)
      ? favoritesRaw
      : Number(favoritesRaw);
  const favorites_count = Number.isFinite(favoritesCount) ? favoritesCount : 0;

  let cook_time_minutes: number | null = null;
  if (r.cook_time_minutes != null && r.cook_time_minutes !== "") {
    const n = Number(r.cook_time_minutes);
    cook_time_minutes = Number.isFinite(n) ? n : null;
  }

  const difficultyRaw = r.difficulty;
  const difficulty =
    difficultyRaw == null || difficultyRaw === ""
      ? null
      : String(difficultyRaw);

  const created_at =
    typeof r.created_at === "string"
      ? r.created_at
      : r.created_at != null
        ? String(r.created_at)
        : "";

  return {
    id: r.id,
    title: r.title,
    image_url: trimRecipeImageUrl(rawImg),
    favorites_count,
    difficulty,
    cook_time_minutes,
    created_at,
  };
}

/**
 * Used when `list_recipes_for_browse` errors or is not deployed. Loads recipes in
 * small pages (no huge `.in`/`.not` filter URLs). Allergen exclusion: load matching
 * `recipe_allergens` rows (`.in` on allergen ids only), then skip blocked recipe ids
 * while paginating `recipes`.
 */
async function listRecipesBrowseFallback(
  supabase: SupabaseClient,
  limit: number,
  term: string | null,
  excludeIds: string[],
  excludedRecipeIds: Set<string>,
): Promise<{ rows: RecipeBrowseRow[] | null; errorMessage: string | null }> {
  const ilikePattern = term ? `%${term}%` : null;

  let blocked: Set<string> | null = null;
  if (excludeIds.length > 0) {
    const { data: ra, error: raErr } = await supabase
      .from("recipe_allergens")
      .select("recipe_id")
      .in("allergen_id", excludeIds);

    if (raErr) {
      return { rows: null, errorMessage: raErr.message };
    }
    blocked = new Set(
      (ra ?? []).map((r: { recipe_id: string }) => r.recipe_id),
    );
  }

  const rows: RecipeBrowseRow[] = [];
  const seen = new Set<string>();

  let demoQ = supabase
    .from("recipes")
    .select(
      "id,title,image_url,favorites_count,difficulty,cook_time_minutes,created_at",
    )
    .in("id", [...DEMO_RECIPE_IDS_ORDERED]);

  if (ilikePattern) {
    demoQ = demoQ.ilike("title", ilikePattern);
  }

  const { data: demoData, error: demoErr } = await demoQ;

  if (demoErr) {
    return { rows: null, errorMessage: demoErr.message };
  }

  const demoById = new Map(
    ((demoData ?? []) as RecipeBrowseRow[]).map((r) => [r.id, r]),
  );
  for (const id of DEMO_RECIPE_IDS_ORDERED) {
    const r = demoById.get(id);
    if (!r || blocked?.has(r.id) || excludedRecipeIds.has(r.id)) continue;
    rows.push(r);
    seen.add(r.id);
    if (rows.length >= limit) {
      return { rows, errorMessage: null };
    }
  }

  const PAGE = 80;
  const MAX_SCAN = 4000;
  let offset = 0;

  while (rows.length < limit && offset < MAX_SCAN) {
    let q = supabase
      .from("recipes")
      .select(
        "id,title,image_url,favorites_count,difficulty,cook_time_minutes,created_at",
      )
      .order("created_at", { ascending: false });

    if (ilikePattern) {
      q = q.ilike("title", ilikePattern);
    }

    const { data, error } = await q.range(offset, offset + PAGE - 1);

    if (error) {
      return { rows: null, errorMessage: error.message };
    }

    const batch = (data ?? []) as RecipeBrowseRow[];
    if (batch.length === 0) break;

    for (const r of batch) {
      if (seen.has(r.id)) continue;
      if (blocked?.has(r.id) || excludedRecipeIds.has(r.id)) continue;
      seen.add(r.id);
      rows.push(r);
      if (rows.length >= limit) break;
    }

    offset += batch.length;
    if (batch.length < PAGE) break;
  }

  return { rows, errorMessage: null };
}

async function recipeIdsBlockedByOtherAllergens(
  supabase: SupabaseClient,
  recipeIds: string[],
  tokens: string[],
): Promise<Set<string>> {
  const blocked = new Set<string>();
  if (recipeIds.length === 0 || tokens.length === 0) return blocked;

  const { data: ri, error } = await supabase
    .from("recipe_ingredients")
    .select("recipe_id, ingredient_id")
    .in("recipe_id", recipeIds);

  if (error || !ri?.length) return blocked;

  const ingIds = [
    ...new Set(
      (ri as { ingredient_id: string }[]).map((r) => r.ingredient_id),
    ),
  ].filter(Boolean);

  const { data: namesRows } =
    ingIds.length > 0
      ? await supabase.from("ingredients").select("id,name").in("id", ingIds)
      : { data: [] as { id: string; name: string }[] | null };

  const nameById = new Map(
    (namesRows ?? []).map((n: { id: string; name: string }) => [
      n.id,
      n.name,
    ]),
  );

  for (const row of ri as { recipe_id: string; ingredient_id: string }[]) {
    const nm = nameById.get(row.ingredient_id);
    if (!nm) continue;
    if (matchedOtherAllergenTokens([nm], tokens).length > 0) {
      blocked.add(row.recipe_id);
    }
  }

  return blocked;
}

function sanitizeRecipeSearch(raw: string | undefined): string | null {
  const q = raw?.trim() ?? "";
  if (!q) return null;
  const stripped = q.replace(/[%_\\]/g, "").trim().slice(0, 80);
  return stripped.length > 0 ? stripped : null;
}

export type RecipesBrowseSort = "newest" | "cook_asc" | "cook_desc";

export async function listRecipes(
  limit = 24,
  options?: {
    query?: string | undefined;
    /** When set, excludes recipes tagged with any of these allergens. */
    excludeAllergenIds?: string[] | undefined;
    /** Free-text profile allergens — strict mode excludes when ingredient names match. */
    allergyOtherRaw?: string | null;
    allergyMode?: "strict" | "warn";
    /** Defaults to "newest" — uses the RPC's existing order. Other values post-sort the page slice. */
    sort?: RecipesBrowseSort;
  },
): Promise<{
  recipes: RecipeListItem[];
  error: string | null | "missing_env" | "browse_unavailable";
}> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { recipes: [], error: "missing_env" as const };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const excludedRecipeIds = await getExcludedRecipeIdsForUser(
    supabase,
    user?.id,
  );

  const term = sanitizeRecipeSearch(options?.query);
  const excludeIds = options?.excludeAllergenIds?.filter(Boolean) ?? [];

  const { data, error: rpcError } = await supabase.rpc(
    "list_recipes_for_browse",
    {
      p_limit: limit,
      p_title_search: term,
      p_exclude_allergen_ids:
        excludeIds.length > 0 ? excludeIds : null,
    },
  );

  let rows: RecipeBrowseRow[];
  if (!rpcError && Array.isArray(data)) {
    rows = (data as unknown[])
      .map(coerceRecipeBrowseRow)
      .filter((x): x is RecipeBrowseRow => x != null);
  } else {
    const fb = await listRecipesBrowseFallback(
      supabase,
      limit,
      term,
      excludeIds,
      excludedRecipeIds,
    );
    if (fb.errorMessage || !fb.rows) {
      return { recipes: [], error: "browse_unavailable" as const };
    }
    rows = fb.rows
      .map((row) => coerceRecipeBrowseRow(row))
      .filter((x): x is RecipeBrowseRow => x != null);
  }

  const otherToks = parseOtherAllergenTokens(options?.allergyOtherRaw);
  if (
    otherToks.length > 0 &&
    (options?.allergyMode ?? "strict") === "strict"
  ) {
    const blockedOther = await recipeIdsBlockedByOtherAllergens(
      supabase,
      rows.map((r) => r.id),
      otherToks,
    );
    rows = rows.filter((r) => !blockedOther.has(r.id));
  }

  if (excludedRecipeIds.size > 0) {
    rows = rows.filter((r) => !excludedRecipeIds.has(r.id));
  }

  rows = rows.map((r) => ({
    ...r,
    image_url: resolveRecipeDisplayImageUrl(r.id, r.image_url),
  }));

  type CreatorMeta = {
    name: string | null;
    id: string | null;
    avatarUrl: string | null;
  };
  const creatorByRecipeId = new Map<string, CreatorMeta>();
  if (rows.length > 0) {
    type CreatorRow = {
      recipe_id: string;
      creator_name: string | null;
      creator_id: string | null;
      creator_avatar_url: string | null;
    };
    const { data: creators, error: creatorErr } = await supabase.rpc(
      "recipe_creator_names_for",
      { recipe_ids: rows.map((r) => r.id) },
    );

    if (!creatorErr && Array.isArray(creators)) {
      for (const c of creators as CreatorRow[]) {
        creatorByRecipeId.set(c.recipe_id, {
          name: c.creator_name ?? null,
          id: c.creator_id ?? null,
          avatarUrl: c.creator_avatar_url ?? null,
        });
      }
    }
  }

  const recipes: RecipeListItem[] = rows.map((r) => {
    const creator = creatorByRecipeId.get(r.id);
    return {
      ...r,
      creator_display_name: creator?.name ?? null,
      creator_id: creator?.id ?? null,
      creator_avatar_url: creator?.avatarUrl ?? null,
    };
  });

  const sort = options?.sort ?? "newest";
  if (sort === "cook_asc" || sort === "cook_desc") {
    const dir = sort === "cook_asc" ? 1 : -1;
    recipes.sort((a, b) => {
      const aNull = a.cook_time_minutes == null;
      const bNull = b.cook_time_minutes == null;
      if (aNull && bNull) return a.title.localeCompare(b.title);
      if (aNull) return 1;
      if (bNull) return -1;
      const diff =
        (a.cook_time_minutes! - b.cook_time_minutes!) * dir;
      return diff !== 0 ? diff : a.title.localeCompare(b.title);
    });
  }

  return { recipes, error: null };
}

export type RecipeMatchResult = {
  recipeId: string;
  title: string;
  image_url?: string | null;
  matchPercent: number;
  missingIngredients: string[];
  /** Total catalog ingredients linked to the recipe (denominator for overlap). */
  recipeIngredientCount: number;
  /** Ingredients matched to the user's resolved pantry tokens. */
  matchedIngredientCount: number;
  /** User warn mode: tagged allergen names that intersect profile allergens. */
  allergyOverlapNames?: string[];
  /** Sum of static US-average estimates for {@link missingIngredients} (USD cents). */
  estimatedMissingCostCents: number;
};

export async function matchRecipesForPantry(
  ingredientText: string,
  options?: {
    excludeAllergenIds?: string[];
    /** Defaults to strict when excluded IDs are present. */
    allergyMode?: "strict" | "warn";
    /** Profile free-text allergens (`profiles.allergy_other`). */
    allergyOtherRaw?: string | null;
  },
): Promise<{
  matches: RecipeMatchResult[];
  error: string | null;
  /** Tokens with no exact catalog name match; matching uses only resolved tokens. */
  unmatchedTokens?: string[];
}> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      matches: [],
      error: "Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const excludedRecipeIds = await getExcludedRecipeIdsForUser(
    supabase,
    user?.id,
  );

  const phase = await resolvePantryIngredientTokens(supabase, ingredientText);
  if (!phase.ok) {
    return { matches: [], error: phase.error };
  }

  const { userTokens, resolvedSpecs, userUnion, dbUnmatchedTokens } =
    phase.data;

  if (userTokens.length === 0) {
    return { matches: [], error: null };
  }

  if (resolvedSpecs.length === 0) {
    return {
      matches: [],
      error: null,
      ...(dbUnmatchedTokens.length ? { unmatchedTokens: dbUnmatchedTokens } : {}),
    };
  }

  const { data: riRows, error: riErr } = await supabase
    .from("recipe_ingredients")
    .select("recipe_id,ingredient_id")
    .in("ingredient_id", [...userUnion]);

  if (riErr) {
    return { matches: [], error: riErr.message };
  }

  const recipeUnionHits = new Map<string, Set<string>>();
  for (const row of (riRows ?? []) as {
    recipe_id: string;
    ingredient_id: string;
  }[]) {
    if (!recipeUnionHits.has(row.recipe_id)) {
      recipeUnionHits.set(row.recipe_id, new Set());
    }
    recipeUnionHits.get(row.recipe_id)!.add(row.ingredient_id);
  }

  let candidateIds = [...recipeUnionHits.keys()].filter((rid) => {
    const hits = recipeUnionHits.get(rid)!;
    return resolvedSpecs.every((spec) => [...spec.ids].some((id) => hits.has(id)));
  });

  const excludeIds = options?.excludeAllergenIds?.filter(Boolean) ?? [];
  const allergyMode = options?.allergyMode ?? "strict";
  const otherTokens = parseOtherAllergenTokens(options?.allergyOtherRaw);
  if (excludeIds.length > 0 && allergyMode === "strict") {
    const { data: blockedRows } = await supabase
      .from("recipe_allergens")
      .select("recipe_id")
      .in("allergen_id", excludeIds);
    const blocked = new Set(
      (blockedRows ?? []).map((b: { recipe_id: string }) => b.recipe_id),
    );
    candidateIds = candidateIds.filter((id) => !blocked.has(id));
  }

  if (otherTokens.length > 0 && allergyMode === "strict") {
    const blockedOther = await recipeIdsBlockedByOtherAllergens(
      supabase,
      candidateIds,
      otherTokens,
    );
    candidateIds = candidateIds.filter((id) => !blockedOther.has(id));
  }

  if (excludedRecipeIds.size > 0) {
    candidateIds = candidateIds.filter((id) => !excludedRecipeIds.has(id));
  }

  if (candidateIds.length === 0) {
    return {
      matches: [],
      error: null,
      ...(dbUnmatchedTokens.length ? { unmatchedTokens: dbUnmatchedTokens } : {}),
    };
  }

  const { data: recipes, error: rErr } = await supabase
    .from("recipes")
    .select("id,title,image_url")
    .in("id", candidateIds);

  if (rErr) {
    return { matches: [], error: rErr.message };
  }

  const { data: allRi, error: allRiErr } = await supabase
    .from("recipe_ingredients")
    .select("recipe_id,ingredient_id")
    .in("recipe_id", candidateIds);

  if (allRiErr || !allRi) {
    return {
      matches: [],
      error: allRiErr?.message ?? "Failed to load ingredients.",
      ...(dbUnmatchedTokens.length ? { unmatchedTokens: dbUnmatchedTokens } : {}),
    };
  }

  const allIngredientIds = [
    ...new Set(
      (allRi as { recipe_id: string; ingredient_id: string }[]).map(
        (r) => r.ingredient_id,
      ),
    ),
  ].filter((id): id is string => Boolean(id));
  const { data: namesRows } =
    allIngredientIds.length > 0
      ? await supabase
          .from("ingredients")
          .select("id,name")
          .in("id", allIngredientIds)
      : { data: [] as { id: string; name: string }[] | null };

  const ingName = new Map<string, string>(
    (namesRows ?? []).map((n: { id: string; name: string }) => [n.id, n.name]),
  );

  const recipeIngredientIds = new Map<string, Set<string>>();
  for (const row of allRi as { recipe_id: string; ingredient_id: string }[]) {
    const nm = ingName.get(row.ingredient_id);
    if (!nm) continue;
    if (!recipeIngredientIds.has(row.recipe_id)) {
      recipeIngredientIds.set(row.recipe_id, new Set());
    }
    recipeIngredientIds.get(row.recipe_id)!.add(row.ingredient_id);
  }

  const matches: RecipeMatchResult[] = [];

  /** One resolved token group: keep legacy overlap vs full recipe list. Two or more: AND across tokens already enforced; badge is 100%. */
  const useSingleIngredientOverlap = resolvedSpecs.length === 1;

  for (const r of (recipes ?? []) as {
    id: string;
    title: string;
    image_url: string | null;
  }[]) {
    const ids = recipeIngredientIds.get(r.id);
    if (!ids?.size) continue;
    let overlap = 0;
    for (const ingId of ids) {
      if (userUnion.has(ingId)) overlap += 1;
    }
    const denom = ids.size;
    const matchPercent = useSingleIngredientOverlap
      ? Math.min(100, Math.round((overlap / denom) * 100))
      : 100;
    const missingIngredients = [...ids]
      .filter((id) => !userUnion.has(id))
      .map((id) => ingName.get(id)!)
      .sort((a, b) => a.localeCompare(b));
    matches.push({
      recipeId: r.id,
      title: r.title,
      image_url: resolveRecipeDisplayImageUrl(
        r.id,
        r.image_url,
      ),
      matchPercent,
      missingIngredients,
      recipeIngredientCount: denom,
      matchedIngredientCount: overlap,
      estimatedMissingCostCents:
        estimateMissingIngredientsCostCents(missingIngredients),
    });
  }

  matches.sort(
    (a, b) =>
      b.matchPercent - a.matchPercent ||
      a.missingIngredients.length - b.missingIngredients.length ||
      a.title.localeCompare(b.title),
  );

  const shortQuery =
    userTokens.length > 0 &&
    userTokens.length <= PANTRY_MATCH_SHORT_QUERY_MAX_TOKENS;
  const filtered = matches.filter((m) => {
    if (!useSingleIngredientOverlap) {
      return true;
    }
    return (
      m.matchPercent >= PANTRY_MATCH_MIN_PERCENT ||
      (shortQuery && m.matchPercent > 0)
    );
  });

  if (
    excludeIds.length > 0 &&
    allergyMode === "warn" &&
    filtered.length > 0
  ) {
    const recipeIds = filtered.map((m) => m.recipeId);
    const { data: raRows } = await supabase
      .from("recipe_allergens")
      .select("recipe_id, allergen_id")
      .in("recipe_id", recipeIds)
      .in("allergen_id", excludeIds);

    const { data: allergenNameRows } = await supabase
      .from("allergens")
      .select("id, name")
      .in("id", excludeIds);

    const nameByAllergenId = new Map(
      (allergenNameRows ?? []).map((a: { id: string; name: string }) => [
        a.id,
        a.name,
      ]),
    );
    const overlapMap = new Map<string, string[]>();
    for (const row of (raRows ?? []) as {
      recipe_id: string;
      allergen_id: string;
    }[]) {
      const n = nameByAllergenId.get(row.allergen_id);
      if (!n) continue;
      const cur = overlapMap.get(row.recipe_id) ?? [];
      cur.push(n);
      overlapMap.set(row.recipe_id, cur);
    }
    for (const m of filtered) {
      const names = overlapMap.get(m.recipeId);
      if (names?.length) {
        m.allergyOverlapNames = [...new Set(names)].sort((a, b) =>
          a.localeCompare(b),
        );
      }
    }
  }

  if (otherTokens.length > 0 && filtered.length > 0) {
    for (const m of filtered) {
      const ids = recipeIngredientIds.get(m.recipeId);
      if (!ids?.size) continue;
      const names = [...ids]
        .map((id) => ingName.get(id))
        .filter((n): n is string => Boolean(n));
      const matchedTok = matchedOtherAllergenTokens(names, otherTokens);
      if (matchedTok.length) {
        const prev = m.allergyOverlapNames ?? [];
        m.allergyOverlapNames = [...new Set([...prev, ...matchedTok])].sort(
          (a, b) => a.localeCompare(b),
        );
      }
    }
  }

  return {
    matches: filtered,
    error: null,
    ...(dbUnmatchedTokens.length ? { unmatchedTokens: dbUnmatchedTokens } : {}),
  };
}

export type CreateRecipeResult = {
  error: string | null;
  recipeId: string | null;
  /** Set when a free-tier user has reached the monthly recipe creation cap. */
  code?: "monthly_recipe_limit";
};

export async function createRecipe(formData: FormData): Promise<CreateRecipeResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "Supabase is not configured.", recipeId: null as string | null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sign in required to add a recipe.", recipeId: null };
  }

  const gate = await checkMonthlyRecipeUploadAllowed(supabase, user.id);
  if (!gate.allowed) {
    if (gate.reason === "monthly_limit") {
      return { error: null, recipeId: null, code: "monthly_recipe_limit" };
    }
    return { error: gate.message, recipeId: null };
  }

  for (const value of formData.values()) {
    if (!(value instanceof File) || value.size <= 0) continue;
    const metaErr = validateRecipeImageUploadMeta({
      fileName: value.name,
      mimeType: value.type,
      sizeBytes: value.size,
    });
    if (metaErr) {
      return { error: metaErr, recipeId: null };
    }
    return {
      error:
        "Cover images upload to Storage in the browser. Remove stray file attachments from the form.",
      recipeId: null,
    };
  }

  const title = String(formData.get("title") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim();
  const imageUrlRaw = String(formData.get("image_url") ?? "").trim();
  const videoUrlRaw = String(formData.get("video_url") ?? "").trim();
  const video_url = videoUrlRaw ? videoUrlRaw : null;
  const ingredientBlock = String(formData.get("ingredients") ?? "");
  const tagRaw = String(formData.get("tags") ?? "");
  const allergenIds = formData.getAll("allergen_id").map(String).filter(Boolean);

  if (!title || !instructions) {
    return { error: "Title and instructions are required.", recipeId: null };
  }

  const ingredientEntries = parseIngredientLinesForRecipe(ingredientBlock);
  if (ingredientEntries.length === 0) {
    return { error: "Add at least one ingredient.", recipeId: null };
  }

  const projectOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!projectOrigin) {
    return { error: "Supabase is not configured.", recipeId: null };
  }

  const imageCheck = validateStoredRecipeImageUrl({
    imageUrlRaw,
    userId: user.id,
    supabaseProjectOrigin: projectOrigin,
    rejectPlainDataUrls: process.env.NODE_ENV === "production",
  });
  if (!imageCheck.ok) {
    return { error: imageCheck.message, recipeId: null };
  }

  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .insert({
      title,
      instructions,
      image_url: imageCheck.url,
      video_url,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (recipeError || !recipe) {
    return {
      error: recipeError?.message ?? "Could not create recipe.",
      recipeId: null,
    };
  }

  const recipeId = recipe.id;
  let sort = 0;

  for (const { canonical } of ingredientEntries) {
    const { data: ingRow, error: ingErr } = await supabase
      .from("ingredients")
      .upsert({ name: canonical }, { onConflict: "name" })
      .select("id")
      .single();

    if (ingErr || !ingRow) {
      return { error: ingErr?.message ?? "Ingredient save failed.", recipeId };
    }

    const { error: riErr } = await supabase.from("recipe_ingredients").insert({
      recipe_id: recipeId,
      ingredient_id: ingRow.id,
      quantity: null,
      sort_order: sort++,
    });

    if (riErr) {
      return { error: riErr.message, recipeId };
    }
  }

  const tagNames = [
    ...new Set(
      tagRaw
        .split(/[,]+/)
        .map((t) => normalizeIngredientToken(t))
        .filter(Boolean),
    ),
  ];

  for (const tagName of tagNames) {
    const { data: tagRow, error: tagErr } = await supabase
      .from("tags")
      .upsert({ name: tagName }, { onConflict: "name" })
      .select("id")
      .single();

    if (tagErr || !tagRow) {
      return { error: tagErr?.message ?? "Tag save failed.", recipeId };
    }

    const { error: rtErr } = await supabase.from("recipe_tags").insert({
      recipe_id: recipeId,
      tag_id: tagRow.id,
    });

    if (rtErr) {
      return { error: rtErr.message, recipeId };
    }
  }

  for (const aid of allergenIds) {
    const { error: raErr } = await supabase.from("recipe_allergens").insert({
      recipe_id: recipeId,
      allergen_id: aid,
    });
    if (raErr) {
      return { error: raErr.message, recipeId };
    }
  }

  await logEvent(supabase, {
    type: "recipe_created",
    metadata: {
      recipe_id: recipeId,
      ingredient_count: ingredientEntries.length,
      allergen_count: allergenIds.length,
      tag_count: tagNames.length,
    },
  });

  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath("/add");
  revalidatePath("/help-me-cook");
  return { error: null, recipeId };
}

async function fetchRecipeFavoritesCount(
  supabase: SupabaseClient,
  recipeId: string,
): Promise<number | undefined> {
  const { data, error } = await supabase
    .from("recipes")
    .select("favorites_count")
    .eq("id", recipeId)
    .maybeSingle();
  if (error || !data) return undefined;
  const raw = data.favorites_count as number | string | null | undefined;
  const n =
    typeof raw === "number" && Number.isFinite(raw) ? raw : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/** Toggle signed-in user's favorite row; bumps recipes.favorites_count via triggers. */
export async function toggleFavorite(recipeId: string): Promise<{
  ok: boolean;
  favored?: boolean;
  /** Denormalized count after DB triggers; omit if read fails. */
  favoritesCount?: number;
  error?: string;
}> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sign in to save recipes." };
  }

  const rid = recipeId.trim();
  if (!rid) {
    return { ok: false, error: "Invalid recipe." };
  }

  const { data: existing, error: existErr } = await supabase
    .from("favorites")
    .select("recipe_id")
    .eq("user_id", user.id)
    .eq("recipe_id", rid)
    .maybeSingle();

  if (existErr) {
    return { ok: false, error: existErr.message };
  }

  if (existing) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("recipe_id", rid);
    if (error) {
      return { ok: false, error: error.message };
    }
    await logEvent(supabase, {
      type: "favorite_removed",
      metadata: { recipe_id: rid },
    });
    revalidatePath("/saved");
    revalidatePath("/recipes");
    revalidatePath(`/recipes/${rid}`);
    revalidatePath("/dashboard");
    revalidatePath("/help-me-cook");
    const favoritesCount = await fetchRecipeFavoritesCount(supabase, rid);
    return {
      ok: true,
      favored: false,
      ...(favoritesCount !== undefined ? { favoritesCount } : {}),
    };
  }

  const { error: insErr } = await supabase.from("favorites").insert({
    user_id: user.id,
    recipe_id: rid,
  });

  if (insErr) {
    if (insErr.code === "23505") {
      revalidatePath("/saved");
      revalidatePath("/recipes");
      revalidatePath(`/recipes/${rid}`);
      revalidatePath("/dashboard");
      revalidatePath("/help-me-cook");
      const favoritesCount = await fetchRecipeFavoritesCount(supabase, rid);
      return {
        ok: true,
        favored: true,
        ...(favoritesCount !== undefined ? { favoritesCount } : {}),
      };
    }
    return { ok: false, error: insErr.message };
  }

  await logEvent(supabase, {
    type: "favorite_added",
    metadata: { recipe_id: rid },
  });

  revalidatePath("/saved");
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${rid}`);
  revalidatePath("/dashboard");
  revalidatePath("/help-me-cook");
  const favoritesCount = await fetchRecipeFavoritesCount(supabase, rid);
  return {
    ok: true,
    favored: true,
    ...(favoritesCount !== undefined ? { favoritesCount } : {}),
  };
}

export async function createRecipeFromForm(formData: FormData) {
  const result = await createRecipe(formData);
  if (result.code === "monthly_recipe_limit") {
    redirect("/add?recipeLimit=1");
  }
  if (result.error) {
    redirect(`/add?error=${encodeURIComponent(result.error)}`);
  }
  if (result.recipeId) {
    redirect(`/recipes/${result.recipeId}`);
  }
  redirect("/add");
}

/** Stub: extend with partial updates and ingredient diffing in a follow-up. */
export async function updateRecipeStub(
  _recipeId: string,
  _formData: FormData,
): Promise<{ error: string | null }> {
  // TODO: Stripe-gated edits, audit trail, image upload.
  return { error: "Recipe update API not implemented yet." };
}
