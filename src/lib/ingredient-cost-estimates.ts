import {
  isIngredientLineNoise,
  normalizeIngredientToken,
} from "@/lib/ingredients";

/**
 * Static US retail estimates for “what you might pay at checkout” (not live quotes).
 *
 * - Amounts are **USD cents** per line, biased **upward** vs tiny recipe fractions so totals
 *   are not misleading at the register.
 * - Uses ingredient `quantity` when present; otherwise typical **purchase units** for proteins.
 * - Unknown names → category keyword rules → {@link DEFAULT_INGREDIENT_COST_CENTS}.
 */

export const DEFAULT_INGREDIENT_COST_CENTS = 250;

/** ~8% headroom before display rounding (reduces systematic under-estimate). */
const CHECKOUT_BUFFER = 1.08;

export type IngredientCostInput =
  | string
  | { name: string; quantity?: string | null; priceCents?: number | null };

/** Per-ingredient baseline (USD cents) when no weight/count is parsed. */
const INGREDIENT_COST_CENTS: Record<string, number> = {
  "beef spare ribs (3-4 lb rack)": 2800,
  "kosher salt": 25,
  "black pepper freshly ground": 50,
  "smoked paprika": 45,
  "garlic powder": 40,
  "light brown sugar": 45,
  "yellow onion": 85,
  "garlic cloves": 60,
  "low-sodium beef broth": 220,
  "dried bay leaves": 35,
  "apple cider vinegar": 55,
  "skin-on salmon fillets": 2000,
  "fresh rosemary sprigs": 150,
  lemon: 90,
  "extra-virgin olive oil": 110,
  "bone-in skin-on chicken thighs": 900,
  "long-grain white rice": 150,
  "red bell pepper": 175,
  "canned diced tomatoes": 140,
  "low-sodium chicken broth": 200,
  "ground turmeric": 45,
  "ground cumin": 45,
  "sweet paprika": 45,
  "frozen green peas": 110,
  "lemon wedges for serving": 50,
  chicken: 750,
  "chicken breast": 850,
  "chicken thigh": 700,
  beef: 1100,
  pork: 900,
  salmon: 1800,
  fish: 1200,
  shrimp: 1600,
  "large shrimp": 1600,
  "jumbo shrimp": 1800,
  prawn: 1600,
  prawns: 1600,
  tofu: 350,
  eggs: 110,
  milk: 75,
  butter: 110,
  cheese: 250,
  "parmesan cheese": 320,
  flour: 50,
  sugar: 45,
  rice: 130,
  pasta: 150,
  bread: 180,
  potato: 100,
  potatoes: 120,
  tomato: 110,
  tomatoes: 150,
  "olive oil": 100,
  oil: 85,
  garlic: 55,
  onion: 70,
  "bell pepper": 165,
  carrot: 65,
  carrots: 90,
  celery: 75,
  mushroom: 180,
  mushrooms: 220,
  spinach: 150,
  lettuce: 120,
  avocado: 220,
  lime: 75,
  cilantro: 95,
  parsley: 85,
  basil: 110,
  thyme: 85,
  oregano: 50,
  "soy sauce": 45,
  honey: 75,
  vinegar: 50,
  "baking powder": 35,
  "baking soda": 30,
  cornstarch: 40,
  beans: 110,
  chickpeas: 130,
  lentils: 120,
  cream: 150,
  "sour cream": 110,
  yogurt: 120,
  bacon: 450,
  sausage: 500,
  "romaine lettuce": 130,
  "hard-boiled eggs": 140,
  "hard boiled eggs": 140,
  "blue cheese": 280,
  chives: 85,
  "green onion": 75,
  "green onions": 95,
  "red wine vinegar": 55,
  mustard: 45,
  "dijon mustard": 50,
  "cherry tomatoes": 160,
  rotisserie: 850,
  wine: 400,
  beer: 250,
  stock: 200,
  broth: 200,
};

/** Typical $/lb in cents for weight-based scaling. */
const PROTEIN_CENTS_PER_LB: Record<string, number> = {
  shrimp: 1600,
  prawn: 1600,
  scallop: 2200,
  salmon: 1400,
  tuna: 1200,
  cod: 1100,
  fish: 1100,
  chicken: 450,
  beef: 900,
  pork: 700,
  lamb: 1100,
  turkey: 500,
  bacon: 800,
  sausage: 650,
};

type CategoryRule = { test: RegExp; cents: number; centsPerLb?: number };

const CATEGORY_RULES: CategoryRule[] = [
  {
    test: /\b(rib rack|beef rib|spare rib|brisket|lamb chop|pork chop|ground beef|ground turkey)\b/i,
    cents: 1200,
    centsPerLb: 900,
  },
  { test: /\bbacon\b/i, cents: 450, centsPerLb: 800 },
  { test: /\bsausage\b/i, cents: 500, centsPerLb: 650 },
  {
    test: /\b(shrimp|prawn|scallop|lobster|crab)\b/i,
    cents: 1600,
    centsPerLb: 1600,
  },
  {
    test: /\b(salmon|tuna|cod|halibut|tilapia|trout|fish)\b/i,
    cents: 1600,
    centsPerLb: 1200,
  },
  {
    test: /\b(chicken|turkey|duck|thigh|breast|wing|drumstick|rotisserie)\b/i,
    cents: 750,
    centsPerLb: 450,
  },
  { test: /\b(egg|tofu|tempeh)\b/i, cents: 200 },
  {
    test: /\b(cheese|cream|butter|milk|yogurt|mozzarella|cheddar|feta)\b/i,
    cents: 220,
  },
  { test: /\bvinegar\b/i, cents: 55 },
  { test: /\b(mustard|mayonnaise|ketchup)\b/i, cents: 60 },
  { test: /\b(wine|beer|liqueur|brandy|sherry)\b/i, cents: 400 },
  { test: /\b(broth|stock|bouillon)\b/i, cents: 200 },
  { test: /\b(oil|sauce|paste)\b/i, cents: 95 },
  {
    test: /\b(salt|pepper|paprika|cumin|turmeric|spice|seasoning|powder|herb|leaf|sprig|bay)\b/i,
    cents: 55,
  },
  {
    test: /\b(onion|garlic|pepper|tomato|carrot|celery|potato|lettuce|spinach|mushroom|lemon|lime|fruit|berry|apple|banana|avocado|zucchini|squash|broccoli|cauliflower|cabbage|bean|pea|corn|rice|pasta|noodle|flour|sugar|honey|nut)\b/i,
    cents: 140,
  },
];

const SMALL_MEASURE =
  /\b(tsp|teaspoons?|tbsp|tablespoons?|cup|cups|pinch|dash|clove|cloves|sprig|sprigs|slice|slices)\b/i;

const COUNT_WORD =
  /\b(\d+)\s+(large|medium|small|jumbo)?\s*(shrimp|prawn|egg|eggs|lime|limes|lemon|lemons|onion|onions|potato|potatoes|tomato|tomatoes|clove|cloves)\b/i;

function costKey(name: string): string {
  return normalizeIngredientToken(name);
}

function parseNumericToken(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const frac = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (frac) {
    return Number(frac[1]) + Number(frac[2]) / Number(frac[3]);
  }
  const slash = s.match(/^(\d+)\/(\d+)$/);
  if (slash) {
    return Number(slash[1]) / Number(slash[2]);
  }
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

type WeightUnit = "lb" | "oz" | "g" | "kg";

function parseWeightLine(text: string): { pounds: number } | null {
  const t = text.toLowerCase();
  const m = t.match(
    /(\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+)\s*(lb|lbs|pound|pounds|oz|ounce|ounces|g|gram|grams|kg|kilogram|kilograms)\b/,
  );
  if (!m) return null;
  const value = parseNumericToken(m[1]!.replace(/\s+/g, " "));
  if (value == null || value <= 0) return null;
  const unit = m[2]!;
  let pounds: number;
  if (unit.startsWith("lb") || unit.startsWith("pound")) pounds = value;
  else if (unit.startsWith("oz") || unit.startsWith("ounce")) pounds = value / 16;
  else if (unit === "kg" || unit.startsWith("kilogram")) pounds = value * 2.20462;
  else pounds = value / 453.592; // grams
  return { pounds };
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

function lookupCategoryRule(key: string): CategoryRule | undefined {
  for (const rule of CATEGORY_RULES) {
    if (rule.test.test(key)) return rule;
  }
  return undefined;
}

function lookupCentsPerLb(key: string): number | undefined {
  for (const [token, cents] of Object.entries(PROTEIN_CENTS_PER_LB)) {
    if (key.includes(token)) return cents;
  }
  const rule = lookupCategoryRule(key);
  return rule?.centsPerLb;
}

function baselineCents(key: string): number {
  const fromDict = lookupDictionaryCostCents(key);
  if (fromDict !== undefined) return fromDict;
  const rule = lookupCategoryRule(key);
  if (rule) return rule.cents;
  return DEFAULT_INGREDIENT_COST_CENTS;
}

function checkoutMinimumCents(key: string, computed: number): number {
  if (/\b(shrimp|prawn|scallop|lobster|crab)\b/.test(key)) {
    return Math.max(computed, 1400);
  }
  if (/\b(salmon|tuna|cod|halibut|fish)\b/.test(key)) {
    return Math.max(computed, 1200);
  }
  if (/\b(chicken|turkey|beef|pork|lamb|bacon|sausage)\b/.test(key)) {
    return Math.max(computed, 450);
  }
  return computed;
}

/**
 * Estimated checkout cost in USD cents for one grocery line (name + optional quantity).
 */
export function estimateIngredientCostCents(
  ingredientName: string,
  quantity?: string | null,
): number {
  const key = costKey(ingredientName);
  if (!key || isIngredientLineNoise(key)) return 0;

  const combined = [quantity?.trim(), ingredientName].filter(Boolean).join(" ");
  const combinedKey = costKey(combined);

  if (SMALL_MEASURE.test(combinedKey)) {
    return Math.max(baselineCents(key), 45);
  }

  const weight = parseWeightLine(combinedKey);
  const centsPerLb = lookupCentsPerLb(key);
  if (weight && centsPerLb) {
    const scaled = Math.round(weight.pounds * centsPerLb);
    return checkoutMinimumCents(key, scaled);
  }

  const countMatch = combinedKey.match(COUNT_WORD);
  if (countMatch) {
    const count = Number.parseInt(countMatch[1]!, 10);
    const item = countMatch[3] ?? "";
    if (item.startsWith("shrimp") || item.startsWith("prawn")) {
      const per = count >= 20 ? 1600 : Math.round(count * 45);
      return checkoutMinimumCents(key, per);
    }
    if (item.startsWith("egg")) {
      return Math.max(110, Math.round(count * 45));
    }
    return Math.max(baselineCents(key), Math.round(count * 35));
  }

  const base = baselineCents(key);
  return checkoutMinimumCents(key, base);
}

function normalizeCostInput(item: IngredientCostInput): {
  name: string;
  quantity: string | null;
  priceCents: number | null;
} {
  if (typeof item === "string") {
    return { name: item, quantity: null, priceCents: null };
  }
  return {
    name: item.name,
    quantity: item.quantity ?? null,
    priceCents: item.priceCents ?? null,
  };
}

/** Sum estimates for ingredients the user still needs to buy. */
export function estimateMissingIngredientsCostCents(
  missing: readonly IngredientCostInput[],
): number {
  let total = 0;
  for (const raw of missing) {
    const { name, quantity, priceCents } = normalizeCostInput(raw);
    if (priceCents != null && priceCents > 0) {
      total += priceCents;
      continue;
    }
    total += Math.round(
      estimateIngredientCostCents(name, quantity) * CHECKOUT_BUFFER,
    );
  }
  return total;
}

/** Rounded-up whole-dollar display (~$24). */
export function formatEstimatedMissingCostDisplay(cents: number): string {
  if (cents <= 0) return "~$0";
  const dollars = Math.max(1, Math.ceil(cents / 100));
  return `~$${dollars}`;
}
