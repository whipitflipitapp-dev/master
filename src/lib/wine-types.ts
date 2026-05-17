/** Curated wine types for community pairing submissions (slug is stored in DB). */
export const CURATED_WINE_TYPES = [
  { slug: "chardonnay", labelKey: "wine_type_chardonnay" },
  { slug: "pinot_noir", labelKey: "wine_type_pinot_noir" },
  { slug: "cabernet_sauvignon", labelKey: "wine_type_cabernet_sauvignon" },
  { slug: "merlot", labelKey: "wine_type_merlot" },
  { slug: "sauvignon_blanc", labelKey: "wine_type_sauvignon_blanc" },
  { slug: "rose", labelKey: "wine_type_rose" },
  { slug: "sparkling", labelKey: "wine_type_sparkling" },
  { slug: "red_blend", labelKey: "wine_type_red_blend" },
  { slug: "white_blend", labelKey: "wine_type_white_blend" },
  { slug: "dessert", labelKey: "wine_type_dessert" },
] as const;

export type CuratedWineTypeSlug = (typeof CURATED_WINE_TYPES)[number]["slug"];

const SLUG_SET = new Set<string>(CURATED_WINE_TYPES.map((t) => t.slug));

/** English canonical label stored in `wine_pairings.wine_type` for user rows. */
export const WINE_TYPE_CANONICAL_LABEL: Record<CuratedWineTypeSlug, string> = {
  chardonnay: "Chardonnay",
  pinot_noir: "Pinot Noir",
  cabernet_sauvignon: "Cabernet Sauvignon",
  merlot: "Merlot",
  sauvignon_blanc: "Sauvignon Blanc",
  rose: "Rosé",
  sparkling: "Sparkling",
  red_blend: "Red blend",
  white_blend: "White blend",
  dessert: "Dessert wine",
};

export function isCuratedWineTypeSlug(value: string): value is CuratedWineTypeSlug {
  return SLUG_SET.has(value);
}

export function curatedWineTypeBySlug(
  slug: string,
): (typeof CURATED_WINE_TYPES)[number] | null {
  return CURATED_WINE_TYPES.find((t) => t.slug === slug) ?? null;
}
