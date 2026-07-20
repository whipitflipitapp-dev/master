import { normalizeIngredientToken } from "@/lib/ingredients";

/** Canonical recipe browse / add-recipe category slugs (stored as `tags.name`). */
export const RECIPE_CATEGORY_VALUES = [
  "italian",
  "mexican",
  "asian",
  "mediterranean",
  "indian",
  "american_comfort",
  "bbq",
  "seafood",
  "vegetarian",
  "vegan",
  "gluten_free",
  "soups",
  "salads",
  "pasta",
  "breakfast",
  "desserts",
] as const;

export type RecipeCategory = (typeof RECIPE_CATEGORY_VALUES)[number];

/** @deprecated Use {@link RECIPE_CATEGORY_VALUES} — kept for onboarding profile fields. */
export const FOOD_CATEGORY_VALUES = RECIPE_CATEGORY_VALUES;

export type FoodCategory = RecipeCategory;

const CATEGORY_SET = new Set<string>(RECIPE_CATEGORY_VALUES);

export function isRecipeCategory(value: string): value is RecipeCategory {
  return CATEGORY_SET.has(value);
}

export function recipeCategoryI18nKey(slug: RecipeCategory): string {
  return `onboarding_food_${slug}`;
}

export function parseRecipeCategoryParam(
  raw: string | undefined,
): RecipeCategory | null {
  const v = raw?.trim() ?? "";
  if (!v || !isRecipeCategory(v)) return null;
  return v;
}

/** Normalize free-text to a canonical category slug (spaces/hyphens → underscores). */
export function normalizeRecipeCategorySlug(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

/**
 * When the browse search box contains only a category name/slug (e.g. "Seafood", "gluten free"),
 * treat it as a category filter rather than a title search.
 */
export function recipeCategoryFromSearchTerm(
  raw: string,
): RecipeCategory | null {
  const slug = normalizeRecipeCategorySlug(raw);
  if (!slug || !isRecipeCategory(slug)) return null;
  return slug;
}

/** Max custom "Other" category labels per recipe (comma-separated in the form). */
export const RECIPE_CUSTOM_CATEGORY_MAX_COUNT = 3;

/** Max length per custom category label after normalization. */
export const RECIPE_CUSTOM_CATEGORY_MAX_LEN = 48;

/** Parse free-text "Other" categories (comma-separated) into tag names. */
export function parseCustomRecipeCategoryInput(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of trimmed.split(/[,]+/)) {
    const token = normalizeIngredientToken(part);
    if (!token || token.length > RECIPE_CUSTOM_CATEGORY_MAX_LEN) {
      continue;
    }
    if (seen.has(token)) {
      continue;
    }
    seen.add(token);
    out.push(token);
    if (out.length >= RECIPE_CUSTOM_CATEGORY_MAX_COUNT) {
      break;
    }
  }
  return out;
}
