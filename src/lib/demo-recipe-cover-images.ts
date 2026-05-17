/**
 * Bundled demo recipe cover paths (`public/recipes/…`) keyed by fixed UUIDs from
 * `20260511140000_seed_demo_recipes.sql`. Used as browse order and as a server
 * fallback when `image_url` is missing or points at removed filenames.
 */
export const DEMO_RECIPE_COVER_BY_ID = {
  "e2a7c0d1-5b3e-4a11-8f00-000000000001": "/recipes/demo-beef-ribs.jpg",
  "e2a7c0d1-5b3e-4a11-8f00-000000000002": "/recipes/demo-salmon-rosemary.jpg",
  "e2a7c0d1-5b3e-4a11-8f00-000000000003": "/recipes/demo-brazilian-chicken-rice.jpg",
} as const;

export type DemoRecipeId = keyof typeof DEMO_RECIPE_COVER_BY_ID;

/** Stable browse order for demo rows (matches prior `DEMO_RECIPE_IDS` in recipes actions). */
export const DEMO_RECIPE_IDS_ORDERED: readonly DemoRecipeId[] = [
  "e2a7c0d1-5b3e-4a11-8f00-000000000001",
  "e2a7c0d1-5b3e-4a11-8f00-000000000002",
  "e2a7c0d1-5b3e-4a11-8f00-000000000003",
];

/** Fixed UUID prefix for `20260517140000_seed_starter_recipes_100.sql` rows. */
export const STARTER_RECIPE_ID_PREFIX = "c0ffe000-0000-4000-8000-";

/** Legacy rotating demo paths still stored on some starter rows before image migration. */
const LEGACY_STARTER_CYCLING_COVER_PATHS = new Set([
  "/recipes/demo-beef-ribs.jpg",
  "/recipes/demo-salmon-rosemary.jpg",
  "/recipes/demo-brazilian-chicken-rice.jpg",
]);

/** Paths from an older migration whose files were renamed / removed from the repo. */
const OBSOLETE_DEMO_COVER_PATHS: Readonly<Record<string, string>> = {
  "/recipes/demo-salmon.jpg": "/recipes/demo-salmon-rosemary.jpg",
  "/recipes/demo-chicken-rice.jpg": "/recipes/demo-brazilian-chicken-rice.jpg",
};

/** Root-relative `/…` for static covers; leaves `https:` and `data:` unchanged. */
export function normalizeRecipeCoverImgSrc(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (/^(https?:\/\/|data:)/i.test(t)) return t;
  return t.startsWith("/") ? t : `/${t.replace(/^\/+/, "")}`;
}

/**
 * Resolves bundled cover for starter seed UUIDs (`c0ffe000-…-000001` … `000100`).
 * Returns null when the id is not a starter row or the sequence is out of range.
 */
export function starterRecipeCoverPath(recipeId: string): string | null {
  if (!recipeId.startsWith(STARTER_RECIPE_ID_PREFIX)) return null;
  const suffix = recipeId.slice(STARTER_RECIPE_ID_PREFIX.length);
  const n = Number.parseInt(suffix, 10);
  if (!Number.isFinite(n) || n < 1 || n > 100) return null;
  return `/recipes/starter-${String(n).padStart(3, "0")}.jpg`;
}

/**
 * Resolves `image_url` for list/detail/pantry: trims, fixes legacy demo paths,
 * ensures root-relative paths start with `/`, and applies bundled demo fallbacks
 * when the column is blank (so production works even if migrations were not applied).
 */
export function resolveRecipeDisplayImageUrl(
  recipeId: string,
  imageUrl: string | null | undefined,
): string | null {
  const starterFallback = starterRecipeCoverPath(recipeId);

  const raw = imageUrl == null ? "" : String(imageUrl).trim();
  let u = raw ? normalizeRecipeCoverImgSrc(raw) : "";
  if (u.startsWith("/")) {
    const replacement = OBSOLETE_DEMO_COVER_PATHS[u];
    if (replacement) u = replacement;
    if (
      starterFallback &&
      (u.length === 0 || LEGACY_STARTER_CYCLING_COVER_PATHS.has(u))
    ) {
      return starterFallback;
    }
  }
  if (u.length > 0) return u;

  if (starterFallback) return starterFallback;

  const fallback =
    recipeId in DEMO_RECIPE_COVER_BY_ID
      ? DEMO_RECIPE_COVER_BY_ID[recipeId as DemoRecipeId]
      : null;
  return fallback ?? null;
}
