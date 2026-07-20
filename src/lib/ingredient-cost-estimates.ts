import {
  isIngredientLineNoise,
  normalizeIngredientToken,
} from "@/lib/ingredients";

/**
 * Static US retail **average** prices for recipe-affordability sorting (not live quotes).
 *
 * Approach:
 * - Amounts are **USD cents** for one typical recipe-sized portion (not full package price).
 * - Keys use {@link normalizeIngredientToken} to align with catalog `ingredients.name`.
 * - Unknown names fall through **category keyword** rules, then {@link DEFAULT_INGREDIENT_COST_CENTS}.
 * - Prices are national averages (~2024–2025); real cost varies by store, region, and brand.
 * - Quantities on recipe rows are ignored (same limitation as overlap matching).
 */

export const DEFAULT_INGREDIENT_COST_CENTS = 175;

/** Per-ingredient recipe-portion estimates (USD cents). */
const INGREDIENT_COST_CENTS: Record<string, number> = {
  "beef spare ribs (3-4 lb rack)": 2200,
  "kosher salt": 15,
  "black pepper freshly ground": 40,
  "smoked paprika": 35,
  "garlic powder": 30,
  "light brown sugar": 40,
  "yellow onion": 60,
  "garlic cloves": 50,
  "low-sodium beef broth": 180,
  "dried bay leaves": 25,
  "apple cider vinegar": 45,
  "skin-on salmon fillets": 1400,
  "fresh rosemary sprigs": 120,
  lemon: 75,
  "extra-virgin olive oil": 90,
  "bone-in skin-on chicken thighs": 650,
  "long-grain white rice": 120,
  "red bell pepper": 150,
  "canned diced tomatoes": 110,
  "low-sodium chicken broth": 160,
  "ground turmeric": 35,
  "ground cumin": 35,
  "sweet paprika": 35,
  "frozen green peas": 90,
  "lemon wedges for serving": 40,
  // Common pantry / shorthand names
  chicken: 550,
  "chicken breast": 600,
  "chicken thigh": 500,
  beef: 900,
  pork: 700,
  salmon: 1200,
  fish: 900,
  shrimp: 800,
  tofu: 250,
  eggs: 80,
  milk: 60,
  butter: 90,
  cheese: 200,
  "parmesan cheese": 250,
  flour: 40,
  sugar: 35,
  rice: 100,
  pasta: 120,
  bread: 150,
  potato: 80,
  potatoes: 100,
  tomato: 90,
  tomatoes: 120,
  "olive oil": 85,
  oil: 70,
  garlic: 45,
  onion: 55,
  "bell pepper": 140,
  carrot: 50,
  carrots: 70,
  celery: 60,
  mushroom: 150,
  mushrooms: 180,
  spinach: 120,
  lettuce: 100,
  avocado: 180,
  lime: 60,
  cilantro: 80,
  parsley: 70,
  basil: 90,
  thyme: 70,
  oregano: 40,
  "soy sauce": 35,
  honey: 60,
  vinegar: 40,
  "baking powder": 25,
  "baking soda": 20,
  cornstarch: 30,
  beans: 90,
  chickpeas: 110,
  lentils: 100,
  cream: 120,
  "sour cream": 90,
  yogurt: 100,
  bacon: 350,
  sausage: 400,
  "romaine lettuce": 110,
  "hard-boiled eggs": 120,
  "hard boiled eggs": 120,
  "blue cheese": 220,
  chives: 70,
  "green onion": 65,
  "green onions": 80,
  "red wine vinegar": 45,
  mustard: 35,
  "dijon mustard": 40,
  "cherry tomatoes": 130,
  rotisserie: 650,
  wine: 300,
  beer: 200,
  stock: 170,
  broth: 170,
};

type CategoryRule = { test: RegExp; cents: number };

/** First matching rule wins; order = more specific → broader. */
const CATEGORY_RULES: CategoryRule[] = [
  {
    test: /\b(rib rack|beef rib|spare rib|brisket|lamb chop|pork chop|ground beef|ground turkey)\b/i,
    cents: 900,
  },
  { test: /\bbacon\b/i, cents: 350 },
  { test: /\bsausage\b/i, cents: 400 },
  {
    test: /\b(salmon|tuna|cod|shrimp|prawn|scallop)\b/i,
    cents: 1100,
  },
  {
    test: /\b(chicken|turkey|duck|thigh|breast|wing|drumstick|rotisserie)\b/i,
    cents: 600,
  },
  { test: /\b(egg|tofu|tempeh)\b/i, cents: 150 },
  { test: /\b(cheese|cream|butter|milk|yogurt|mozzarella|cheddar|feta)\b/i, cents: 180 },
  { test: /\bvinegar\b/i, cents: 45 },
  { test: /\b(mustard|mayonnaise|ketchup)\b/i, cents: 50 },
  {
    test: /\b(wine|beer|liqueur|brandy|sherry)\b/i,
    cents: 350,
  },
  {
    test: /\b(broth|stock|bouillon)\b/i,
    cents: 170,
  },
  {
    test: /\b(oil|sauce|paste)\b/i,
    cents: 80,
  },
  {
    test: /\b(salt|pepper|paprika|cumin|turmeric|spice|seasoning|powder|herb|leaf|sprig|bay)\b/i,
    cents: 45,
  },
  {
    test: /\b(onion|garlic|pepper|tomato|carrot|celery|potato|lettuce|spinach|mushroom|lemon|lime|fruit|berry|apple|banana|avocado|zucchini|squash|broccoli|cauliflower|cabbage|bean|pea|corn|rice|pasta|noodle|flour|sugar|honey|nut)\b/i,
    cents: 120,
  },
];

function costKey(name: string): string {
  return normalizeIngredientToken(name);
}

function lookupDictionaryCostCents(key: string): number | undefined {
  const exact = INGREDIENT_COST_CENTS[key];
  if (exact !== undefined) return exact;

  let bestLen = 0;
  let bestCents: number | undefined;
  for (const [dictKey, cents] of Object.entries(INGREDIENT_COST_CENTS)) {
    if (dictKey.length < 3) continue;
    if (key.includes(dictKey) && dictKey.length > bestLen) {
      bestLen = dictKey.length;
      bestCents = cents;
    }
  }
  return bestCents;
}

/**
 * Estimated cost in USD cents for one recipe-sized portion of an ingredient.
 */
export function estimateIngredientCostCents(ingredientName: string): number {
  const key = costKey(ingredientName);
  if (!key || isIngredientLineNoise(key)) return 0;

  const fromDict = lookupDictionaryCostCents(key);
  if (fromDict !== undefined) return fromDict;

  for (const rule of CATEGORY_RULES) {
    if (rule.test.test(key)) return rule.cents;
  }

  return DEFAULT_INGREDIENT_COST_CENTS;
}

/** Sum estimates for ingredients the user still needs to buy. */
export function estimateMissingIngredientsCostCents(
  missingIngredientNames: readonly string[],
): number {
  let total = 0;
  for (const name of missingIngredientNames) {
    total += estimateIngredientCostCents(name);
  }
  return total;
}

/** Whole-dollar display for cards (~$12). */
export function formatEstimatedMissingCostDisplay(cents: number): string {
  if (cents <= 0) return "~$0";
  const dollars = Math.max(1, Math.round(cents / 100));
  return `~$${dollars}`;
}
