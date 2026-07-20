"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isIngredientLineNoise,
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
  HOSTED_REEL_DURATION_REQUIRED_ERROR,
  HOSTED_REEL_PLAN_REQUIRED_ERROR,
  RECIPE_REEL_BUCKET,
  parseHostedReelDurationFormField,
  validateRecipeReelDurationSeconds,
  validateStoredRecipeReelUrl,
} from "@/lib/recipe-reel";
import {
  RECIPE_IMAGE_BUCKET,
  RECIPE_GALLERY_MAX_IMAGES,
  validateRecipeImageUploadMeta,
  validateStoredRecipeGalleryUrls,
} from "@/lib/recipe-image";
import { estimateMissingIngredientsCostCents } from "@/lib/ingredient-cost-estimates";
import {
  resolvePantryIngredientTokens,
  type GenericPantryTokenHint,
} from "@/lib/pantry-ingredient-resolve";
import { checkMonthlyRecipeUploadAllowed } from "@/lib/recipe-upload-limit";
import { PREMIUM_RECIPE_TOOLS_PLAN_REQUIRED_ERROR } from "@/lib/premium-recipe-tools-plan-gate";
import { getCurrentProfile } from "@/lib/profile";
import { getAccountAccessDenial } from "@/lib/moderation/session-enforcement";
import { applyRecipeProfanityHoldIfNeeded } from "@/lib/moderation/recipe-profanity-hold";
import { RECIPE_HELD_FOR_REVIEW_MESSAGE } from "@/lib/moderation/profanity";
import { GENERIC_SERVER_ERROR, logServerError } from "@/lib/server-error";
import { logEvent } from "@/lib/telemetry";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isProOrAbove } from "@/lib/plan";
import {
  isRecipeCategory,
  parseCustomRecipeCategoryInput,
  recipeCategoryFromSearchTerm,
  type RecipeCategory,
} from "@/lib/recipe-categories";
import { getExcludedRecipeIdsForUser } from "@/lib/user-excluded-recipes";
import {
  isInstagramReelVideoUrl,
  normalizeRecipeVideoUrlInput,
  parseInstagramPermalink,
  resolveRecipeCardPreviewImage,
  type HomeInstagramReelItem,
} from "@/lib/video-url";

const RECIPE_TITLE_MAX = 200;
const RECIPE_INSTRUCTIONS_MAX = 12000;
const RECIPE_INGREDIENTS_TEXT_MAX = 8000;
const RECIPE_INGREDIENT_MAX_COUNT = 80;
const RECIPE_TAGS_TEXT_MAX = 1000;
const RECIPE_ALLERGEN_MAX_COUNT = 32;
const RECIPE_CATEGORY_MAX_COUNT = 8;
const RECIPE_COOK_TIME_MINUTES_MIN = 1;
const RECIPE_COOK_TIME_MINUTES_MAX = 1440;
const RECIPE_DIFFICULTY_VALUES = ["easy", "medium", "hard"] as const;
type RecipeDifficulty = (typeof RECIPE_DIFFICULTY_VALUES)[number];
const MONTHLY_RECIPE_LIMIT_ERROR =
  "You've reached this month's recipe upload limit. Upgrade for unlimited recipe uploads.";

async function cleanupUploadedRecipeImage(
  supabase: SupabaseClient,
  objectPath: string | null,
) {
  if (!objectPath) return;

  const { error } = await supabase.storage
    .from(RECIPE_IMAGE_BUCKET)
    .remove([objectPath]);

  if (error) {
    logServerError("recipes.cleanup_uploaded_image", error);
  }
}

async function cleanupUploadedRecipeReel(
  supabase: SupabaseClient,
  objectPath: string | null,
) {
  if (!objectPath) return;

  const { error } = await supabase.storage
    .from(RECIPE_REEL_BUCKET)
    .remove([objectPath]);

  if (error) {
    logServerError("recipes.cleanup_uploaded_reel", error);
  }
}

async function cleanupUploadedRecipeImages(
  supabase: SupabaseClient,
  objectPaths: string[],
) {
  for (const path of objectPaths) {
    await cleanupUploadedRecipeImage(supabase, path);
  }
}

function parseRecipeGalleryJsonField(raw: unknown): string[] {
  const text = String(raw ?? "").trim();
  if (!text) return [];
  try {
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((v) => String(v).trim()).filter(Boolean);
  } catch {
    return [];
  }
}

async function applyRecipeGalleryOrder(
  supabase: SupabaseClient,
  recipeId: string,
  userId: string,
  orderedUrls: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: rows, error: fetchErr } = await supabase
    .from("recipe_images")
    .select("image_url")
    .eq("recipe_id", recipeId);

  if (fetchErr) {
    logServerError("recipes.gallery_order_fetch", fetchErr);
    return { ok: false, error: GENERIC_SERVER_ERROR };
  }

  const existing = (rows ?? [])
    .map((r) => (r.image_url ?? "").trim())
    .filter(Boolean);

  if (existing.length === 0 && orderedUrls.length > 0) {
    const { data: recipeRow } = await supabase
      .from("recipes")
      .select("image_url")
      .eq("id", recipeId)
      .eq("created_by", userId)
      .maybeSingle();
    const legacy = (recipeRow?.image_url ?? "").trim();
    if (legacy && orderedUrls.length === 1 && orderedUrls[0] === legacy) {
      const { error: insertErr } = await supabase.from("recipe_images").insert({
        recipe_id: recipeId,
        image_url: legacy,
        sort_order: 0,
      });
      if (insertErr) {
        logServerError("recipes.gallery_legacy_backfill", insertErr);
        return { ok: false, error: GENERIC_SERVER_ERROR };
      }
      return { ok: true };
    }
  }

  const existingSet = new Set(existing);
  if (orderedUrls.length !== existingSet.size) {
    return {
      ok: false,
      error: "Photo gallery must include every existing image (reorder only).",
    };
  }
  for (const url of orderedUrls) {
    if (!existingSet.has(url)) {
      return {
        ok: false,
        error: "Photo gallery order includes an unknown image.",
      };
    }
  }

  const { error: deleteErr } = await supabase
    .from("recipe_images")
    .delete()
    .eq("recipe_id", recipeId);
  if (deleteErr) {
    logServerError("recipes.gallery_order_delete", deleteErr);
    return { ok: false, error: GENERIC_SERVER_ERROR };
  }

  const { error: insertErr } = await supabase.from("recipe_images").insert(
    orderedUrls.map((image_url, sort_order) => ({
      recipe_id: recipeId,
      image_url,
      sort_order,
    })),
  );
  if (insertErr) {
    logServerError("recipes.gallery_order_insert", insertErr);
    return { ok: false, error: GENERIC_SERVER_ERROR };
  }

  const coverUrl = orderedUrls[0] ?? null;
  const { error: coverErr } = await supabase
    .from("recipes")
    .update({ image_url: coverUrl })
    .eq("id", recipeId)
    .eq("created_by", userId);
  if (coverErr) {
    logServerError("recipes.gallery_cover_update", coverErr);
    return { ok: false, error: GENERIC_SERVER_ERROR };
  }

  return { ok: true };
}

function isMonthlyRecipeLimitRpcError(error: { message?: string } | null): boolean {
  return error?.message === "monthly_recipe_limit";
}

export type RecipeListItem = {
  id: string;
  title: string;
  image_url: string | null;
  video_url: string | null;
  favorites_count: number;
  difficulty: string | null;
  cook_time_minutes: number | null;
  created_at: string;
  creator_display_name: string | null;
  creator_id: string | null;
  creator_avatar_url: string | null;
};

export type { HomeInstagramReelItem } from "@/lib/video-url";

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
  const rawVideo = r.video_url ?? r.videoUrl;
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

  const videoTrimmed =
    rawVideo == null ? null : String(rawVideo).trim() || null;

  return {
    id: r.id,
    title: r.title,
    image_url: trimRecipeImageUrl(rawImg),
    video_url: videoTrimmed,
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
async function recipeIdsMatchingTagNames(
  supabase: SupabaseClient,
  tagNames: string[],
): Promise<Set<string> | null> {
  if (tagNames.length === 0) return null;

  const { data: tags, error: tagErr } = await supabase
    .from("tags")
    .select("id,name")
    .in("name", tagNames);

  if (tagErr) return null;
  const tagIds = (tags ?? []).map((t: { id: string }) => t.id);
  if (tagIds.length === 0) return new Set();

  const { data: rt, error: rtErr } = await supabase
    .from("recipe_tags")
    .select("recipe_id")
    .in("tag_id", tagIds);

  if (rtErr) return null;
  return new Set((rt ?? []).map((r: { recipe_id: string }) => r.recipe_id));
}

async function listRecipesBrowseFallback(
  supabase: SupabaseClient,
  limit: number,
  term: string | null,
  excludeIds: string[],
  excludedRecipeIds: Set<string>,
  tagFilterIds: Set<string> | null,
): Promise<{ rows: RecipeBrowseRow[] | null; errorMessage: string | null }> {
  const ilikePattern = term ? `%${term}%` : null;

  const matchesTagFilter = (recipeId: string) =>
    tagFilterIds == null || tagFilterIds.has(recipeId);

  let blocked: Set<string> | null = null;
  if (excludeIds.length > 0) {
    const { data: ra, error: raErr } = await supabase
      .from("recipe_allergens")
      .select("recipe_id")
      .in("allergen_id", excludeIds);

    if (raErr) {
      logServerError("recipes.browse_allergen_filter", raErr);
      return { rows: null, errorMessage: GENERIC_SERVER_ERROR };
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
      "id,title,image_url,video_url,favorites_count,difficulty,cook_time_minutes,created_at",
    )
    .in("id", [...DEMO_RECIPE_IDS_ORDERED]);

  if (ilikePattern) {
    demoQ = demoQ.ilike("title", ilikePattern);
  }

  const { data: demoData, error: demoErr } = await demoQ;

  if (demoErr) {
    logServerError("recipes.browse_demo_recipes", demoErr);
    return { rows: null, errorMessage: GENERIC_SERVER_ERROR };
  }

  const demoById = new Map(
    ((demoData ?? []) as RecipeBrowseRow[]).map((r) => [r.id, r]),
  );
  for (const id of DEMO_RECIPE_IDS_ORDERED) {
    const r = demoById.get(id);
    if (
      !r ||
      blocked?.has(r.id) ||
      excludedRecipeIds.has(r.id) ||
      !matchesTagFilter(r.id)
    )
      continue;
    rows.push(r);
    seen.add(r.id);
    if (rows.length >= limit) {
      return { rows, errorMessage: null };
    }
  }

  let reelQ = supabase
    .from("recipes")
    .select(
      "id,title,image_url,video_url,favorites_count,difficulty,cook_time_minutes,created_at",
    )
    .ilike("video_url", "%instagram.com/reel/%")
    .order("created_at", { ascending: false });

  if (ilikePattern) {
    reelQ = reelQ.ilike("title", ilikePattern);
  }

  const { data: reelData, error: reelErr } = await reelQ;

  if (reelErr) {
    logServerError("recipes.browse_instagram_reels", reelErr);
    return { rows: null, errorMessage: GENERIC_SERVER_ERROR };
  }

  for (const r of (reelData ?? []) as RecipeBrowseRow[]) {
    if (
      seen.has(r.id) ||
      blocked?.has(r.id) ||
      excludedRecipeIds.has(r.id) ||
      !matchesTagFilter(r.id) ||
      !isInstagramReelVideoUrl(r.video_url)
    ) {
      continue;
    }
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
        "id,title,image_url,video_url,favorites_count,difficulty,cook_time_minutes,created_at",
      )
      .order("created_at", { ascending: false });

    if (ilikePattern) {
      q = q.ilike("title", ilikePattern);
    }

    const { data, error } = await q.range(offset, offset + PAGE - 1);

    if (error) {
      logServerError("recipes.browse", error);
      return { rows: null, errorMessage: GENERIC_SERVER_ERROR };
    }

    const batch = (data ?? []) as RecipeBrowseRow[];
    if (batch.length === 0) break;

    for (const r of batch) {
      if (seen.has(r.id)) continue;
      if (
        blocked?.has(r.id) ||
        excludedRecipeIds.has(r.id) ||
        !matchesTagFilter(r.id)
      )
        continue;
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
    /** Canonical category slug stored in tags.name (e.g. vegan, bbq). */
    category?: RecipeCategory | null;
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

  let term = sanitizeRecipeSearch(options?.query);
  const excludeIds = options?.excludeAllergenIds?.filter(Boolean) ?? [];
  let category = options?.category ?? null;

  if (!category && term) {
    const fromSearch = recipeCategoryFromSearchTerm(term);
    if (fromSearch) {
      category = fromSearch;
      term = null;
    }
  }

  const tagNames = category ? [category] : null;

  const tagFilterIds =
    category != null
      ? await recipeIdsMatchingTagNames(supabase, [category])
      : null;
  if (category != null) {
    if (tagFilterIds === null) {
      return { recipes: [], error: "browse_unavailable" as const };
    }
    if (tagFilterIds.size === 0) {
      return { recipes: [], error: null };
    }
  }

  const { data, error: rpcError } = await supabase.rpc(
    "list_recipes_for_browse",
    {
      p_limit: limit,
      p_title_search: term,
      p_exclude_allergen_ids:
        excludeIds.length > 0 ? excludeIds : null,
      p_tag_names: tagNames,
    },
  );

  let rows: RecipeBrowseRow[];
  if (!rpcError && Array.isArray(data)) {
    rows = (data as unknown[])
      .map(coerceRecipeBrowseRow)
      .filter((x): x is RecipeBrowseRow => x != null);
    if (tagFilterIds != null) {
      rows = rows.filter((r) => tagFilterIds.has(r.id));
    }
  } else {
    const fb = await listRecipesBrowseFallback(
      supabase,
      limit,
      term,
      excludeIds,
      excludedRecipeIds,
      tagFilterIds,
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

  rows = rows.map((r) => {
    const preview = resolveRecipeCardPreviewImage({
      imageUrl: resolveRecipeDisplayImageUrl(r.id, r.image_url),
      videoUrl: r.video_url,
    });
    return {
      ...r,
      image_url: preview.imageUrl,
    };
  });

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
  /** Tokens with no ingredient row (exact or partial); matching uses only resolved tokens. */
  unmatchedTokens?: string[];
  /** Broad tokens (e.g. chicken) — suggest specific catalog names. */
  genericTokenHints?: GenericPantryTokenHint[];
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

  const {
    userTokens,
    resolvedSpecs,
    userUnion,
    dbUnmatchedTokens,
    genericTokenHints,
  } = phase.data;

  const genericHintsExtra =
    genericTokenHints.length > 0 ? { genericTokenHints } : {};

  if (userTokens.length === 0) {
    return { matches: [], error: null };
  }

  if (resolvedSpecs.length === 0) {
    return {
      matches: [],
      error: null,
      ...(dbUnmatchedTokens.length ? { unmatchedTokens: dbUnmatchedTokens } : {}),
      ...genericHintsExtra,
    };
  }

  const { data: riRows, error: riErr } = await supabase
    .from("recipe_ingredients")
    .select("recipe_id,ingredient_id")
    .in("ingredient_id", [...userUnion]);

  if (riErr) {
    logServerError("recipes.match_recipe_ingredients", riErr);
    return { matches: [], error: GENERIC_SERVER_ERROR };
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
      ...genericHintsExtra,
    };
  }

  const { data: recipes, error: rErr } = await supabase
    .from("recipes")
    .select("id,title,image_url")
    .in("id", candidateIds);

  if (rErr) {
    logServerError("recipes.match_recipes", rErr);
    return { matches: [], error: GENERIC_SERVER_ERROR };
  }

  const { data: allRi, error: allRiErr } = await supabase
    .from("recipe_ingredients")
    .select("recipe_id,ingredient_id,quantity")
    .in("recipe_id", candidateIds);

  if (allRiErr || !allRi) {
    if (allRiErr) {
      logServerError("recipes.match_all_ingredients", allRiErr);
    }
    return {
      matches: [],
      error: GENERIC_SERVER_ERROR,
      ...(dbUnmatchedTokens.length ? { unmatchedTokens: dbUnmatchedTokens } : {}),
      ...genericHintsExtra,
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

  type RiRow = {
    recipe_id: string;
    ingredient_id: string;
    quantity: string | null;
  };

  const recipeIngredientIds = new Map<string, Set<string>>();
  const recipeIngredientQty = new Map<
    string,
    Map<string, string | null>
  >();
  for (const row of allRi as RiRow[]) {
    const nm = ingName.get(row.ingredient_id);
    if (!nm) continue;
    if (!recipeIngredientIds.has(row.recipe_id)) {
      recipeIngredientIds.set(row.recipe_id, new Set());
      recipeIngredientQty.set(row.recipe_id, new Map());
    }
    recipeIngredientIds.get(row.recipe_id)!.add(row.ingredient_id);
    recipeIngredientQty.get(row.recipe_id)!.set(row.ingredient_id, row.quantity);
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
    const qtyByIng = recipeIngredientQty.get(r.id);
    const missingIngredients = [...ids]
      .filter((id) => !userUnion.has(id))
      .map((id) => ingName.get(id)!)
      .filter((name) => !isIngredientLineNoise(name))
      .sort((a, b) => a.localeCompare(b));
    const missingCostLines = [...ids]
      .filter((id) => !userUnion.has(id))
      .map((id) => ({
        name: ingName.get(id)!,
        quantity: qtyByIng?.get(id) ?? null,
      }))
      .filter((line) => !isIngredientLineNoise(line.name));
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
        estimateMissingIngredientsCostCents(missingCostLines),
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
    ...genericHintsExtra,
  };
}

export type CreateRecipeResult = {
  error: string | null;
  recipeId: string | null;
  /** Set when a free-tier user has reached the monthly recipe creation cap. */
  code?: "monthly_recipe_limit";
  /** Recipe saved but hidden pending admin language review. */
  pendingReview?: boolean;
  reviewNotice?: string;
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

  const accessDenial = await getAccountAccessDenial(supabase, user);
  if (accessDenial) {
    return {
      error: "Your account cannot add recipes. Contact support if you need help.",
      recipeId: null,
    };
  }

  const gate = await checkMonthlyRecipeUploadAllowed(supabase, user.id);
  if (!gate.allowed) {
    if (gate.reason === "monthly_limit") {
      return {
        error: MONTHLY_RECIPE_LIMIT_ERROR,
        recipeId: null,
        code: "monthly_recipe_limit",
      };
    }
    return { error: gate.message, recipeId: null };
  }

  const hostedReelUrlInput = String(formData.get("hosted_reel_url") ?? "").trim();
  const hostedReelPathInput = String(
    formData.get("hosted_reel_object_path") ?? "",
  ).trim();
  let pendingHostedReelPath: string | null = null;

  const projectOriginEarly = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (hostedReelUrlInput || hostedReelPathInput) {
    if (!isProOrAbove(gate.plan)) {
      return { error: HOSTED_REEL_PLAN_REQUIRED_ERROR, recipeId: null };
    }
    if (!projectOriginEarly) {
      return { error: "Supabase is not configured.", recipeId: null };
    }
    const reelCheck = validateStoredRecipeReelUrl({
      reelUrlRaw: hostedReelUrlInput,
      objectPathRaw: hostedReelPathInput,
      userId: user.id,
      supabaseProjectOrigin: projectOriginEarly,
    });
    if (!reelCheck.ok) {
      return { error: reelCheck.message, recipeId: null };
    }
    if (reelCheck.url) {
      pendingHostedReelPath = reelCheck.objectPath;
      const durationSec = parseHostedReelDurationFormField(
        formData.get("hosted_reel_duration_seconds"),
      );
      if (durationSec == null) {
        return { error: HOSTED_REEL_DURATION_REQUIRED_ERROR, recipeId: null };
      }
      const durationErr = validateRecipeReelDurationSeconds(durationSec);
      if (durationErr) {
        return { error: durationErr, recipeId: null };
      }
    }
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
  const galleryUrlsRaw = parseRecipeGalleryJsonField(formData.get("gallery_image_urls"));
  const galleryPathsRaw = parseRecipeGalleryJsonField(
    formData.get("gallery_image_object_paths"),
  );
  const legacyImageUrl = String(formData.get("image_url") ?? "").trim();
  const legacyObjectPath = String(formData.get("image_object_path") ?? "").trim();
  const galleryUrlsInput =
    galleryUrlsRaw.length > 0
      ? galleryUrlsRaw
      : legacyImageUrl
        ? [legacyImageUrl]
        : [];
  const galleryPathsInput =
    galleryPathsRaw.length > 0
      ? galleryPathsRaw
      : legacyObjectPath
        ? [legacyObjectPath]
        : [];
  const videoUrlRaw = String(formData.get("video_url") ?? "").trim();
  const videoNormalized = normalizeRecipeVideoUrlInput(videoUrlRaw);
  if (!videoNormalized.ok) {
    return { error: videoNormalized.error, recipeId: null };
  }
  const video_url = videoNormalized.video_url;
  const hostedReelFinalUrl =
    hostedReelUrlInput && pendingHostedReelPath ? hostedReelUrlInput : null;
  const ingredientBlock = String(formData.get("ingredients") ?? "");
  const tagRaw = String(formData.get("tags") ?? "");
  const difficultyRaw = String(formData.get("difficulty") ?? "")
    .trim()
    .toLowerCase();
  const difficulty = difficultyRaw ? (difficultyRaw as RecipeDifficulty) : null;
  const cookTimeRaw = String(formData.get("cook_time_minutes") ?? "").trim();
  let cook_time_minutes: number | null = null;
  const categorySlugs = formData
    .getAll("recipe_category")
    .map(String)
    .filter((s) => isRecipeCategory(s));
  const otherCategoryRaw = String(formData.get("recipe_category_other") ?? "").trim();
  const customCategoryTags = parseCustomRecipeCategoryInput(otherCategoryRaw);
  const allergenIds = formData.getAll("allergen_id").map(String).filter(Boolean);

  if (!title || !instructions) {
    return { error: "Title and instructions are required.", recipeId: null };
  }
  if (title.length > RECIPE_TITLE_MAX) {
    return {
      error: `Recipe title must be at most ${RECIPE_TITLE_MAX} characters.`,
      recipeId: null,
    };
  }
  if (instructions.length > RECIPE_INSTRUCTIONS_MAX) {
    return {
      error: `Directions must be at most ${RECIPE_INSTRUCTIONS_MAX} characters.`,
      recipeId: null,
    };
  }
  if (ingredientBlock.length > RECIPE_INGREDIENTS_TEXT_MAX) {
    return {
      error: `Ingredient list must be at most ${RECIPE_INGREDIENTS_TEXT_MAX} characters.`,
      recipeId: null,
    };
  }
  if (tagRaw.length > RECIPE_TAGS_TEXT_MAX) {
    return {
      error: `Extra tags must be at most ${RECIPE_TAGS_TEXT_MAX} characters.`,
      recipeId: null,
    };
  }
  if (
    difficulty !== null &&
    !RECIPE_DIFFICULTY_VALUES.includes(difficulty)
  ) {
    return { error: "Choose a valid difficulty.", recipeId: null };
  }
  if (cookTimeRaw) {
    const parsedCookTime = Number(cookTimeRaw);
    if (
      !Number.isInteger(parsedCookTime) ||
      parsedCookTime < RECIPE_COOK_TIME_MINUTES_MIN ||
      parsedCookTime > RECIPE_COOK_TIME_MINUTES_MAX
    ) {
      return {
        error: `Cook time must be a whole number from ${RECIPE_COOK_TIME_MINUTES_MIN} to ${RECIPE_COOK_TIME_MINUTES_MAX} minutes.`,
        recipeId: null,
      };
    }
    cook_time_minutes = parsedCookTime;
  }
  if (categorySlugs.length > RECIPE_CATEGORY_MAX_COUNT) {
    return {
      error: `Choose up to ${RECIPE_CATEGORY_MAX_COUNT} recipe categories.`,
      recipeId: null,
    };
  }
  if (otherCategoryRaw && customCategoryTags.length === 0) {
    return {
      error:
        "Enter a valid custom category under Other (up to 48 characters each, comma-separated).",
      recipeId: null,
    };
  }
  if (categorySlugs.length + customCategoryTags.length > RECIPE_CATEGORY_MAX_COUNT) {
    return {
      error: `Choose up to ${RECIPE_CATEGORY_MAX_COUNT} categories total (including Other).`,
      recipeId: null,
    };
  }
  if (allergenIds.length > RECIPE_ALLERGEN_MAX_COUNT) {
    return {
      error: `Choose up to ${RECIPE_ALLERGEN_MAX_COUNT} allergens.`,
      recipeId: null,
    };
  }

  const ingredientEntries = parseIngredientLinesForRecipe(ingredientBlock);
  if (ingredientEntries.length === 0) {
    return { error: "Add at least one ingredient.", recipeId: null };
  }
  if (ingredientEntries.length > RECIPE_INGREDIENT_MAX_COUNT) {
    return {
      error: `Use ${RECIPE_INGREDIENT_MAX_COUNT} ingredients or fewer.`,
      recipeId: null,
    };
  }

  const uploadedGalleryPaths: string[] = [];

  const projectOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!projectOrigin) {
    await cleanupUploadedRecipeImages(supabase, galleryPathsInput);
    return { error: "Supabase is not configured.", recipeId: null };
  }

  const galleryCheck = validateStoredRecipeGalleryUrls({
    urlsRaw: galleryUrlsInput,
    objectPathsRaw: galleryPathsInput,
    userId: user.id,
    supabaseProjectOrigin: projectOrigin,
    rejectPlainDataUrls: process.env.NODE_ENV === "production",
    maxImages: RECIPE_GALLERY_MAX_IMAGES,
  });
  if (!galleryCheck.ok) {
    await cleanupUploadedRecipeImages(supabase, galleryPathsInput);
    return { error: galleryCheck.message, recipeId: null };
  }

  uploadedGalleryPaths.push(...galleryCheck.entries.map((e) => e.objectPath));
  const coverImageUrl =
    galleryCheck.entries.length > 0 ? galleryCheck.entries[0].url : null;

  const tagNames = [
    ...new Set([
      ...categorySlugs,
      ...customCategoryTags,
      ...tagRaw
        .split(/[,]+/)
        .map((t) => normalizeIngredientToken(t))
        .filter(Boolean),
    ]),
  ];

  const { data: recipeId, error: recipeError } = await supabase.rpc(
    "create_recipe_atomic",
    {
      p_title: title,
      p_instructions: instructions,
      p_image_url: coverImageUrl,
      p_video_url: video_url,
      p_difficulty: difficulty,
      p_cook_time_minutes: cook_time_minutes,
      p_ingredients: ingredientEntries.map(({ canonical }, sort_order) => ({
        name: canonical,
        quantity: null,
        sort_order,
      })),
      p_allergen_ids: allergenIds,
      p_tag_names: tagNames,
    },
  );

  if (recipeError || !recipeId) {
    await cleanupUploadedRecipeImages(supabase, uploadedGalleryPaths);
    if (pendingHostedReelPath) {
      await cleanupUploadedRecipeReel(supabase, pendingHostedReelPath);
    }
    if (isMonthlyRecipeLimitRpcError(recipeError)) {
      return {
        error: MONTHLY_RECIPE_LIMIT_ERROR,
        recipeId: null,
        code: "monthly_recipe_limit",
      };
    }
    if (recipeError) {
      logServerError("recipes.create_recipe_atomic", recipeError);
    }
    return {
      error: GENERIC_SERVER_ERROR,
      recipeId: null,
    };
  }

  if (galleryCheck.entries.length > 0) {
    const { error: galleryErr } = await supabase.from("recipe_images").insert(
      galleryCheck.entries.map((entry, sort_order) => ({
        recipe_id: recipeId,
        image_url: entry.url,
        sort_order,
      })),
    );
    if (galleryErr) {
      logServerError("recipes.insert_recipe_images", galleryErr);
      await cleanupUploadedRecipeImages(supabase, uploadedGalleryPaths);
      if (pendingHostedReelPath) {
        await cleanupUploadedRecipeReel(supabase, pendingHostedReelPath);
      }
      await supabase.from("recipes").delete().eq("id", recipeId);
      return {
        error: GENERIC_SERVER_ERROR,
        recipeId: null,
      };
    }
  }

  if (hostedReelFinalUrl) {
    const { error: reelErr } = await supabase
      .from("recipes")
      .update({ hosted_reel_url: hostedReelFinalUrl })
      .eq("id", recipeId);
    if (reelErr) {
      logServerError("recipes.set_hosted_reel", reelErr);
      await cleanupUploadedRecipeImages(supabase, uploadedGalleryPaths);
      await cleanupUploadedRecipeReel(supabase, pendingHostedReelPath);
      await supabase.from("recipes").delete().eq("id", recipeId);
      return { error: GENERIC_SERVER_ERROR, recipeId: null };
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

  const profanityFields = [
    title,
    instructions,
    ingredientBlock,
    tagRaw,
    ...ingredientEntries.map((e) => e.raw),
  ];
  const { held: pendingReview } = await applyRecipeProfanityHoldIfNeeded(
    supabase,
    recipeId as string,
    profanityFields,
  );

  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath("/add");
  revalidatePath("/help-me-cook");
  return {
    error: null,
    recipeId,
    ...(pendingReview
      ? {
          pendingReview: true,
          reviewNotice: RECIPE_HELD_FOR_REVIEW_MESSAGE,
        }
      : {}),
  };
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
    logServerError("recipes.favorite_lookup", existErr);
    return { ok: false, error: GENERIC_SERVER_ERROR };
  }

  if (existing) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("recipe_id", rid);
    if (error) {
      logServerError("recipes.favorite_remove", error);
      return { ok: false, error: GENERIC_SERVER_ERROR };
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
    logServerError("recipes.favorite_insert", insErr);
    return { ok: false, error: GENERIC_SERVER_ERROR };
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
  let result: CreateRecipeResult;
  try {
    result = await createRecipe(formData);
  } catch (error) {
    logServerError("recipes.create_recipe_unhandled", error);
    return { error: GENERIC_SERVER_ERROR, recipeId: null };
  }

  if (result.error) {
    return result;
  }
  if (result.recipeId) {
    const suffix = result.pendingReview ? "?review=pending" : "";
    redirect(`/recipes/${result.recipeId}${suffix}`);
  }
  return { error: GENERIC_SERVER_ERROR, recipeId: null };
}

export async function updateRecipe(
  _prev: { error: string | null; success: string | null },
  formData: FormData,
): Promise<{ error: string | null; success: string | null }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "Supabase is not configured.", success: null };
  }

  const ctx = await getCurrentProfile(supabase);
  if (!ctx) {
    redirect("/login");
  }
  if (!isProOrAbove(ctx.profile.plan_type)) {
    return {
      error: PREMIUM_RECIPE_TOOLS_PLAN_REQUIRED_ERROR,
      success: null,
    };
  }

  const recipeId = String(formData.get("recipe_id") ?? "").trim();
  const title = String(formData.get("title") ?? "")
    .trim()
    .slice(0, RECIPE_TITLE_MAX);
  const instructions = String(formData.get("instructions") ?? "")
    .trim()
    .slice(0, RECIPE_INSTRUCTIONS_MAX);
  const ingredientBlock = String(formData.get("ingredients") ?? "").slice(
    0,
    RECIPE_INGREDIENTS_TEXT_MAX,
  );
  const videoNormalized = normalizeRecipeVideoUrlInput(
    String(formData.get("video_url") ?? ""),
  );
  if (!videoNormalized.ok) {
    return { error: videoNormalized.error, success: null };
  }
  const video_url = videoNormalized.video_url;

  const hostedReelUrlInput = String(formData.get("hosted_reel_url") ?? "").trim();
  const hostedReelPathInput = String(
    formData.get("hosted_reel_object_path") ?? "",
  ).trim();
  const clearHostedReel =
    String(formData.get("clear_hosted_reel") ?? "").trim() === "1";

  const projectOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!projectOrigin) {
    return { error: "Supabase is not configured.", success: null };
  }

  let hosted_reel_url: string | null | undefined = undefined;
  if (hostedReelUrlInput || hostedReelPathInput) {
    const reelCheck = validateStoredRecipeReelUrl({
      reelUrlRaw: hostedReelUrlInput,
      objectPathRaw: hostedReelPathInput,
      userId: ctx.user.id,
      supabaseProjectOrigin: projectOrigin,
    });
    if (!reelCheck.ok) {
      return { error: reelCheck.message, success: null };
    }
    hosted_reel_url = reelCheck.url;
    const durationSec = parseHostedReelDurationFormField(
      formData.get("hosted_reel_duration_seconds"),
    );
    if (durationSec == null) {
      return { error: HOSTED_REEL_DURATION_REQUIRED_ERROR, success: null };
    }
    const durationErr = validateRecipeReelDurationSeconds(durationSec);
    if (durationErr) {
      return { error: durationErr, success: null };
    }
  } else if (clearHostedReel) {
    hosted_reel_url = null;
  }

  const ingredientEntries = parseIngredientLinesForRecipe(ingredientBlock);

  if (!recipeId) {
    return { error: "Missing recipe.", success: null };
  }
  if (!title || !instructions) {
    return { error: "Title and instructions are required.", success: null };
  }
  if (ingredientEntries.length === 0) {
    return { error: "Add at least one ingredient.", success: null };
  }
  if (ingredientEntries.length > RECIPE_INGREDIENT_MAX_COUNT) {
    return { error: "Use fewer ingredients.", success: null };
  }

  const { data: ownedRecipe, error: ownedErr } = await supabase
    .from("recipes")
    .select("id")
    .eq("id", recipeId)
    .eq("created_by", ctx.user.id)
    .maybeSingle();

  if (ownedErr) {
    logServerError("recipes.update_ownership_lookup", ownedErr);
    return { error: GENERIC_SERVER_ERROR, success: null };
  }
  if (!ownedRecipe) {
    return { error: "You can only edit your own recipes.", success: null };
  }

  const recipePatch: {
    title: string;
    instructions: string;
    video_url: string | null;
    hosted_reel_url?: string | null;
  } = { title, instructions, video_url };
  if (hosted_reel_url !== undefined) {
    recipePatch.hosted_reel_url = hosted_reel_url;
  }

  const { error: recipeError } = await supabase
    .from("recipes")
    .update(recipePatch)
    .eq("id", recipeId)
    .eq("created_by", ctx.user.id);

  if (recipeError) {
    logServerError("recipes.update_recipe", recipeError);
    return { error: GENERIC_SERVER_ERROR, success: null };
  }

  const ingredientIds: string[] = [];
  for (const { canonical } of ingredientEntries) {
    const { data: ingRow, error: ingErr } = await supabase
      .from("ingredients")
      .upsert({ name: canonical }, { onConflict: "name" })
      .select("id")
      .single();

    if (ingErr || !ingRow) {
      if (ingErr) {
        logServerError("recipes.update_ingredient_upsert", ingErr);
      }
      return { error: GENERIC_SERVER_ERROR, success: null };
    }
    ingredientIds.push(ingRow.id);
  }

  const { error: deleteIngredientsError } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("recipe_id", recipeId);

  if (deleteIngredientsError) {
    logServerError("recipes.update_delete_ingredients", deleteIngredientsError);
    return { error: GENERIC_SERVER_ERROR, success: null };
  }

  const { error: riErr } = await supabase.from("recipe_ingredients").insert(
    ingredientIds.map((ingredientId, sort) => ({
      recipe_id: recipeId,
      ingredient_id: ingredientId,
      quantity: null,
      sort_order: sort,
    })),
  );

  if (riErr) {
    logServerError("recipes.update_recipe_ingredients", riErr);
    return { error: GENERIC_SERVER_ERROR, success: null };
  }

  const galleryOrderUrls = parseRecipeGalleryJsonField(
    formData.get("gallery_image_urls_order"),
  );
  if (galleryOrderUrls.length > 0) {
    const galleryResult = await applyRecipeGalleryOrder(
      supabase,
      recipeId,
      ctx.user.id,
      galleryOrderUrls,
    );
    if (!galleryResult.ok) {
      return { error: galleryResult.error, success: null };
    }
  }

  await logEvent(supabase, {
    type: "recipe_updated",
    metadata: {
      recipe_id: recipeId,
      ingredient_count: ingredientEntries.length,
    },
  });

  const { held: pendingReview } = await applyRecipeProfanityHoldIfNeeded(
    supabase,
    recipeId,
    [
      title,
      instructions,
      ingredientBlock,
      ...ingredientEntries.map((e) => e.raw),
    ],
  );

  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath("/recipes");
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/analytics");
  return {
    error: null,
    success: pendingReview
      ? RECIPE_HELD_FOR_REVIEW_MESSAGE
      : "Recipe updated.",
  };
}

const HOME_INSTAGRAM_REELS_LIMIT = 12;
const HOME_INSTAGRAM_REELS_SCAN = 48;

/**
 * Latest recipes with an Instagram Reel permalink, newest first.
 * Used by the homepage strip; returns [] when none (caller should hide UI).
 */
export async function listLatestInstagramRecipeReels(
  limit = HOME_INSTAGRAM_REELS_LIMIT,
): Promise<HomeInstagramReelItem[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const take = Math.min(Math.max(1, limit), HOME_INSTAGRAM_REELS_LIMIT);
  const { data, error } = await supabase
    .from("recipes")
    .select("id,title,image_url,video_url,created_at")
    .not("video_url", "is", null)
    .eq("moderation_status", "published")
    .ilike("video_url", "%instagram.com/reel/%")
    .order("created_at", { ascending: false })
    .limit(HOME_INSTAGRAM_REELS_SCAN);

  if (error) {
    logServerError("recipes.home_instagram_reels", error);
    return [];
  }

  const items: HomeInstagramReelItem[] = [];
  for (const row of data ?? []) {
    const ig = parseInstagramPermalink(
      typeof row.video_url === "string" ? row.video_url : null,
    );
    if (!ig || ig.type !== "reel") continue;
    items.push({
      recipeId: row.id,
      title: row.title,
      imageUrl: resolveRecipeDisplayImageUrl(
        row.id,
        trimRecipeImageUrl(row.image_url),
      ),
      permalink: ig.permalink,
      createdAt: row.created_at,
    });
    if (items.length >= take) break;
  }
  return items;
}
