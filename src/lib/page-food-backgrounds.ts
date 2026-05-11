/**
 * Static food textures served from `public/food/` (Unsplash License).
 * Do not hotlink third-party URLs in components — reference these paths only.
 */
export const FOOD_PAGE_BACKGROUNDS = [
  "/food/salad.jpg",
  "/food/pizza.jpg",
  "/food/spread.jpg",
  "/food/breakfast.jpg",
  "/food/pasta.jpg",
  "/food/soup.jpg",
] as const;

function djb2Hash(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

/** Stable image for a route or state key (no client-only randomness). */
export function foodBackgroundForKey(key: string): string {
  const list = FOOD_PAGE_BACKGROUNDS;
  if (!key.length) return list[0];
  const idx = djb2Hash(key) % list.length;
  return list[idx];
}
