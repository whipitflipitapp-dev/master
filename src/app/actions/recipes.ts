"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeIngredientToken, parseIngredientInput } from "@/lib/ingredients";
import { PANTRY_MATCH_MIN_PERCENT } from "@/lib/pantry";
import {
  validateRecipeImageUploadMeta,
  validateStoredRecipeImageUrl,
} from "@/lib/recipe-image";
import { logEvent } from "@/lib/telemetry";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type RecipeListItem = {
  id: string;
  title: string;
  image_url: string | null;
  favorites_count: number;
  difficulty: string | null;
  cook_time_minutes: number | null;
  created_at: string;
  creator_display_name: string | null;
};

type RecipeBrowseRow = Omit<RecipeListItem, "creator_display_name">;

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
      if (blocked?.has(r.id)) continue;
      rows.push(r);
      if (rows.length >= limit) break;
    }

    offset += batch.length;
    if (batch.length < PAGE) break;
  }

  return { rows, errorMessage: null };
}

function sanitizeRecipeSearch(raw: string | undefined): string | null {
  const q = raw?.trim() ?? "";
  if (!q) return null;
  const stripped = q.replace(/[%_\\]/g, "").trim().slice(0, 80);
  return stripped.length > 0 ? stripped : null;
}

export async function listRecipes(
  limit = 24,
  options?: {
    query?: string | undefined;
    /** When set, excludes recipes tagged with any of these allergens. */
    excludeAllergenIds?: string[] | undefined;
  },
): Promise<{
  recipes: RecipeListItem[];
  error: string | null | "missing_env" | "browse_unavailable";
}> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { recipes: [], error: "missing_env" as const };
  }

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
    rows = data as RecipeBrowseRow[];
  } else {
    const fb = await listRecipesBrowseFallback(
      supabase,
      limit,
      term,
      excludeIds,
    );
    if (fb.errorMessage || !fb.rows) {
      return { recipes: [], error: "browse_unavailable" as const };
    }
    rows = fb.rows;
  }

  const creatorByRecipeId = new Map<string, string | null>();
  if (rows.length > 0) {
    type CreatorRow = { recipe_id: string; creator_name: string | null };
    const { data: creators, error: creatorErr } = await supabase.rpc(
      "recipe_creator_names_for",
      { recipe_ids: rows.map((r) => r.id) },
    );

    if (!creatorErr && Array.isArray(creators)) {
      for (const c of creators as CreatorRow[]) {
        creatorByRecipeId.set(c.recipe_id, c.creator_name ?? null);
      }
    }
  }

  const recipes: RecipeListItem[] = rows.map((r) => ({
    ...r,
    creator_display_name: creatorByRecipeId.get(r.id) ?? null,
  }));

  return { recipes, error: null };
}

export type RecipeMatchResult = {
  recipeId: string;
  title: string;
  image_url?: string | null;
  matchPercent: number;
  missingIngredients: string[];
  /** User warn mode: tagged allergen names that intersect profile allergens. */
  allergyOverlapNames?: string[];
};

export async function matchRecipesForPantry(
  ingredientText: string,
  options?: {
    excludeAllergenIds?: string[];
    /** Defaults to strict when excluded IDs are present. */
    allergyMode?: "strict" | "warn";
  },
): Promise<{ matches: RecipeMatchResult[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      matches: [],
      error: "Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    };
  }

  const userTokens = parseIngredientInput(ingredientText);
  if (userTokens.length === 0) {
    return { matches: [], error: null };
  }

  const { data: ingRows, error: ingErr } = await supabase
    .from("ingredients")
    .select("id,name")
    .in("name", userTokens);

  if (ingErr) {
    return { matches: [], error: ingErr.message };
  }

  if (!ingRows?.length) {
    return { matches: [], error: null };
  }

  const userIngredientIds = new Set(ingRows.map((r: { id: string }) => r.id));

  const { data: riRows, error: riErr } = await supabase
    .from("recipe_ingredients")
    .select("recipe_id,ingredient_id")
    .in("ingredient_id", [...userIngredientIds]);

  if (riErr) {
    return { matches: [], error: riErr.message };
  }

  const overlapByRecipe = new Map<string, number>();
  for (const row of (riRows ?? []) as {
    recipe_id: string;
    ingredient_id: string;
  }[]) {
    overlapByRecipe.set(
      row.recipe_id,
      (overlapByRecipe.get(row.recipe_id) ?? 0) + 1,
    );
  }

  let candidateIds = [...overlapByRecipe.keys()];

  const excludeIds = options?.excludeAllergenIds?.filter(Boolean) ?? [];
  const allergyMode = options?.allergyMode ?? "strict";
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

  if (candidateIds.length === 0) {
    return { matches: [], error: null };
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

  const recipeIngMap = new Map<string, Set<string>>();
  for (const row of allRi as { recipe_id: string; ingredient_id: string }[]) {
    const nm = ingName.get(row.ingredient_id);
    if (!nm) continue;
    if (!recipeIngMap.has(row.recipe_id)) {
      recipeIngMap.set(row.recipe_id, new Set());
    }
    recipeIngMap.get(row.recipe_id)!.add(nm);
  }

  const userSet = new Set(userTokens);
  const matches: RecipeMatchResult[] = [];

  for (const r of (recipes ?? []) as {
    id: string;
    title: string;
    image_url: string | null;
  }[]) {
    const set = recipeIngMap.get(r.id);
    if (!set?.size) continue;
    let overlap = 0;
    for (const n of set) {
      if (userSet.has(n)) overlap += 1;
    }
    const denom = set.size;
    const matchPercent = Math.min(100, Math.round((overlap / denom) * 100));
    const missingIngredients = [...set]
      .filter((n) => !userSet.has(n))
      .sort((a, b) => a.localeCompare(b));
    matches.push({
      recipeId: r.id,
      title: r.title,
      image_url: r.image_url,
      matchPercent,
      missingIngredients,
    });
  }

  matches.sort(
    (a, b) =>
      b.matchPercent - a.matchPercent || a.title.localeCompare(b.title),
  );

  const filtered = matches.filter(
    (m) => m.matchPercent >= PANTRY_MATCH_MIN_PERCENT,
  );

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

  return { matches: filtered, error: null };
}

export async function createRecipe(formData: FormData) {
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

  const lines = ingredientBlock
    .split(/[\n]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const seenNormalized = new Set<string>();

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

  for (const line of lines) {
    const normalized = normalizeIngredientToken(
      line.replace(/^[\d./\s-]+/, "").trim() || line,
    );
    if (!normalized || seenNormalized.has(normalized)) continue;
    seenNormalized.add(normalized);

    const { data: ingRow, error: ingErr } = await supabase
      .from("ingredients")
      .upsert({ name: normalized }, { onConflict: "name" })
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
      ingredient_count: seenNormalized.size,
      allergen_count: allergenIds.length,
      tag_count: tagNames.length,
    },
  });

  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath("/add");
  return { error: null, recipeId };
}

/** Toggle signed-in user's favorite row; bumps recipes.favorites_count via triggers. */
export async function toggleFavorite(recipeId: string): Promise<{
  ok: boolean;
  favored?: boolean;
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
    return { ok: true, favored: false };
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
      return { ok: true, favored: true };
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
  return { ok: true, favored: true };
}

export async function createRecipeFromForm(formData: FormData) {
  const result = await createRecipe(formData);
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
