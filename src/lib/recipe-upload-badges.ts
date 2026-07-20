export type RecipeUploadBadgeTierId =
  | "tier_1_5"
  | "tier_6_10"
  | "tier_11_20"
  | "tier_21_40"
  | "tier_41_50"
  | "tier_50_plus";

/** Creator badge from total published recipes (by `created_by`). */
export function resolveRecipeUploadBadgeTier(
  uploadedCount: number,
): RecipeUploadBadgeTierId | null {
  if (uploadedCount < 1) return null;
  if (uploadedCount <= 5) return "tier_1_5";
  if (uploadedCount <= 10) return "tier_6_10";
  if (uploadedCount <= 20) return "tier_11_20";
  if (uploadedCount <= 40) return "tier_21_40";
  if (uploadedCount <= 50) return "tier_41_50";
  return "tier_50_plus";
}

export function recipeUploadBadgeLabelKey(
  tier: RecipeUploadBadgeTierId,
): string {
  return `creator_badge_${tier}`;
}
