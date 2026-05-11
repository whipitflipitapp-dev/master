/**
 * Lightweight keyword → canonical allergen name mapping (seed list names in DB).
 * Used only for suggestions on recipe create; does not replace manual tagging.
 */

const KEYWORD_TO_ALLERGEN_NAME: ReadonlyArray<readonly [string, string]> = [
  ["peanut", "peanuts"],
  ["peanuts", "peanuts"],
  ["almond", "tree nuts"],
  ["almonds", "tree nuts"],
  ["cashew", "tree nuts"],
  ["cashews", "tree nuts"],
  ["walnut", "tree nuts"],
  ["walnuts", "tree nuts"],
  ["pecan", "tree nuts"],
  ["pecans", "tree nuts"],
  ["hazelnut", "tree nuts"],
  ["hazelnuts", "tree nuts"],
  ["pistachio", "tree nuts"],
  ["pistachios", "tree nuts"],
  ["macadamia", "tree nuts"],
  ["nut butter", "tree nuts"],
  ["milk", "milk"],
  ["butter", "milk"],
  ["cream", "milk"],
  ["cheese", "milk"],
  ["yogurt", "milk"],
  ["whey", "milk"],
  ["lactose", "milk"],
  ["dairy", "milk"],
  ["egg", "eggs"],
  ["eggs", "eggs"],
  ["mayo", "eggs"],
  ["mayonnaise", "eggs"],
  ["soy", "soy"],
  ["soya", "soy"],
  ["tofu", "soy"],
  ["edamame", "soy"],
  ["miso", "soy"],
  ["tamari", "soy"],
  ["flour", "wheat"],
  ["wheat", "wheat"],
  ["bread", "wheat"],
  ["pasta", "wheat"],
  ["couscous", "wheat"],
  ["bulgur", "wheat"],
  ["semolina", "wheat"],
  ["fish", "fish"],
  ["anchovy", "fish"],
  ["anchovies", "fish"],
  ["cod", "fish"],
  ["salmon", "fish"],
  ["tuna", "fish"],
  ["shellfish", "shellfish"],
  ["shrimp", "shellfish"],
  ["prawn", "shellfish"],
  ["crab", "shellfish"],
  ["lobster", "shellfish"],
  ["mussel", "shellfish"],
  ["clam", "shellfish"],
  ["oyster", "shellfish"],
  ["scallop", "shellfish"],
  ["sesame", "sesame"],
  ["tahini", "sesame"],
  ["mustard", "mustard"],
  ["sulfite", "sulfites"],
  ["sulfites", "sulfites"],
  ["wine", "sulfites"],
  ["gluten", "gluten"],
  ["celery", "celery"],
  ["lupin", "lupin"],
  ["corn", "corn"],
  ["cornmeal", "corn"],
  ["cornstarch", "corn"],
  ["maize", "corn"],
];

/**
 * Returns distinct allergen ids whose canonical names match keyword hits in `text`.
 */
export function suggestAllergenIdsFromText(
  text: string,
  allergens: readonly { id: string; name: string }[],
): string[] {
  const lower = text.toLowerCase();
  const nameToId = new Map(allergens.map((a) => [a.name.toLowerCase(), a.id] as const));
  const names = new Set<string>();

  for (const [keyword, allergenName] of KEYWORD_TO_ALLERGEN_NAME) {
    if (lower.includes(keyword)) {
      names.add(allergenName.toLowerCase());
    }
  }

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const n of names) {
    const id = nameToId.get(n);
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}
