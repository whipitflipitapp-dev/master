export type UserWinePairingRow = {
  id: string;
  wine_type: string;
  wine_type_slug: string | null;
  wine_name: string | null;
  why_blurb: string | null;
  created_at: string;
  user_id: string;
  submitter_name: string | null;
};

export type WineTypeCount = {
  slug: string;
  count: number;
};

export function aggregateWineTypeCounts(
  pairings: Pick<UserWinePairingRow, "wine_type_slug">[],
): WineTypeCount[] {
  const map = new Map<string, number>();
  for (const p of pairings) {
    const slug = p.wine_type_slug?.trim();
    if (!slug) continue;
    map.set(slug, (map.get(slug) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
}
