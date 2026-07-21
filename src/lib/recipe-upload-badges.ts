export type RecipeUploadBadgeTierId =
  | "tier_1_5"
  | "tier_6_10"
  | "tier_11_20"
  | "tier_21_40"
  | "tier_41_50"
  | "tier_50_plus";

export const RECIPE_UPLOAD_BADGE_TIER_ORDER: readonly RecipeUploadBadgeTierId[] =
  [
    "tier_1_5",
    "tier_6_10",
    "tier_11_20",
    "tier_21_40",
    "tier_41_50",
    "tier_50_plus",
  ] as const;

const RECIPE_UPLOAD_BADGE_TIER_SET = new Set<string>(
  RECIPE_UPLOAD_BADGE_TIER_ORDER,
);

export function uploadBadgeTierRank(tier: RecipeUploadBadgeTierId): number {
  return RECIPE_UPLOAD_BADGE_TIER_ORDER.indexOf(tier);
}

export function parseCelebratedUploadBadgeTier(
  raw: unknown,
): RecipeUploadBadgeTierId | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || !RECIPE_UPLOAD_BADGE_TIER_SET.has(trimmed)) return null;
  return trimmed as RecipeUploadBadgeTierId;
}

/** True when the user has reached a badge tier not yet celebrated. */
export function shouldCelebrateUploadBadge(
  current: RecipeUploadBadgeTierId | null,
  celebrated: RecipeUploadBadgeTierId | null,
): boolean {
  if (current == null) return false;
  if (celebrated == null) return true;
  return uploadBadgeTierRank(current) > uploadBadgeTierRank(celebrated);
}

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
