import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_CONTEXT_ITEMS = 12;

export type AiChefUserContext = {
  displayName: string | null;
  featureInterests: string[];
  foodsLoved: string[];
  foodsLovedOther: string | null;
  cooksPerWeek: number | null;
  allergyNotes: string[];
  pantryItems: string[];
  savedRecipeTitles: string[];
  hiddenRecipeTitles: string[];
};

function stringArray(value: unknown, max = MAX_CONTEXT_ITEMS): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }
    const trimmed = item.trim();
    if (!trimmed || out.includes(trimmed)) {
      continue;
    }
    out.push(trimmed.slice(0, 80));
    if (out.length >= max) {
      break;
    }
  }
  return out;
}

function cleanString(value: unknown, max = 200): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function cleanNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

async function recipeTitlesForIds(
  supabase: SupabaseClient,
  ids: string[],
): Promise<string[]> {
  const uniqueIds = [...new Set(ids.filter(Boolean))].slice(0, MAX_CONTEXT_ITEMS);
  if (uniqueIds.length === 0) {
    return [];
  }
  const { data } = await supabase
    .from("recipes")
    .select("title")
    .in("id", uniqueIds);
  return stringArray((data ?? []).map((row: { title?: unknown }) => row.title));
}

export async function loadAiChefUserContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<AiChefUserContext> {
  const [profileRes, allergiesRes, pantryRes, favoritesRes, hiddenRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "display_name,first_name,feature_interests,foods_loved,foods_loved_other,cooks_per_week,allergy_other",
        )
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("user_allergies")
        .select("allergens(name)")
        .eq("user_id", userId),
      supabase
        .from("user_pantry")
        .select("ingredient")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true })
        .limit(MAX_CONTEXT_ITEMS),
      supabase
        .from("favorites")
        .select("recipe_id")
        .eq("user_id", userId)
        .limit(MAX_CONTEXT_ITEMS),
      supabase
        .from("user_excluded_recipes")
        .select("recipe_id")
        .eq("user_id", userId)
        .limit(MAX_CONTEXT_ITEMS),
    ]);

  const profile = (profileRes.data ?? {}) as Record<string, unknown>;
  const allergyNames = (allergiesRes.data ?? [])
    .map((row: unknown) => {
      const nested =
        row && typeof row === "object" && "allergens" in row
          ? (row as { allergens: unknown }).allergens
          : null;
      if (nested && typeof nested === "object" && !Array.isArray(nested)) {
        return cleanString((nested as { name?: unknown }).name, 80);
      }
      if (Array.isArray(nested)) {
        return cleanString((nested[0] as { name?: unknown } | undefined)?.name, 80);
      }
      return null;
    })
    .filter((name): name is string => Boolean(name));
  const allergyOther = cleanString(profile.allergy_other);

  const favoriteIds = (favoritesRes.data ?? [])
    .map((row: { recipe_id?: unknown }) =>
      typeof row.recipe_id === "string" ? row.recipe_id : "",
    )
    .filter(Boolean);
  const hiddenIds = (hiddenRes.data ?? [])
    .map((row: { recipe_id?: unknown }) =>
      typeof row.recipe_id === "string" ? row.recipe_id : "",
    )
    .filter(Boolean);

  const [savedRecipeTitles, hiddenRecipeTitles] = await Promise.all([
    recipeTitlesForIds(supabase, favoriteIds),
    recipeTitlesForIds(supabase, hiddenIds),
  ]);

  return {
    displayName:
      cleanString(profile.first_name, 80) ?? cleanString(profile.display_name, 80),
    featureInterests: stringArray(profile.feature_interests),
    foodsLoved: stringArray(profile.foods_loved),
    foodsLovedOther: cleanString(profile.foods_loved_other),
    cooksPerWeek: cleanNumber(profile.cooks_per_week),
    allergyNotes: allergyOther ? [...allergyNames, allergyOther] : allergyNames,
    pantryItems: stringArray(
      (pantryRes.data ?? []).map((row: { ingredient?: unknown }) => row.ingredient),
    ),
    savedRecipeTitles,
    hiddenRecipeTitles,
  };
}
