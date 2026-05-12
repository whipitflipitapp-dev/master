/** PRD-aligned minimum match % for Help Me Cook (no fractional threshold in-repo). */
export const PANTRY_MATCH_MIN_PERCENT = 40;

/**
 * When the pantry query has at most this many tokens, recipes with any overlapping
 * ingredient still appear even if match % is below {@link PANTRY_MATCH_MIN_PERCENT}
 * (e.g. one staple vs a long ingredient list).
 */
export const PANTRY_MATCH_SHORT_QUERY_MAX_TOKENS = 5;

/** Minimum token length for substring matching against `ingredients.name` (ILIKE). */
export const PANTRY_PARTIAL_INGREDIENT_MIN_LEN = 4;
