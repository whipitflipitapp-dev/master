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
