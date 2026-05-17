/** PRD-aligned minimum match % for Help Me Cook (no fractional threshold in-repo). */
export const PANTRY_MATCH_MIN_PERCENT = 40;

/**
 * When the pantry query has at most this many tokens **and** matching uses the
 * single-ingredient overlap score, recipes with any overlapping ingredient still
 * appear even if match % is below {@link PANTRY_MATCH_MIN_PERCENT}. Not used when
 * multiple recognized tokens require an AND across all of them (then overlap is
 * 100% for the pantry subset by definition).
 */
export const PANTRY_MATCH_SHORT_QUERY_MAX_TOKENS = 5;

/** Minimum token length for substring matching against `ingredients.name` (ILIKE). */
export const PANTRY_PARTIAL_INGREDIENT_MIN_LEN = 4;
