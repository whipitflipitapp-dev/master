/**
 * Derives API search terms from starter recipe titles (used by fetch-starter-recipe-covers.mjs).
 */

const LEADING_MODIFIERS =
  /^(classic|easy|smoky|grilled|baked|fluffy|summer|no-churn|tandoori-style|vegan|gf)\s+/i;

const TRAILING_MODIFIERS = /\s+(salad|bowl|bowls|platter|skewers|sandwiches|burrito|toast|parfait|pudding|fritters|burgers|tacos|quesadillas|with\s+.+)$/i;

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "with",
  "and",
  "style",
  "classic",
  "easy",
  "grilled",
  "baked",
  "smoky",
  "fluffy",
  "summer",
  "no",
  "churn",
  "overnight",
  "stuffed",
  "fresh",
]);

/** Exact title (lowercase) → preferred TheMealDB search string. */
export const THEMEALDB_ALIASES = {
  "margherita flatbread": "Pizza",
  "cacio e pepe": "Cacio e pepe",
  "chicken piccata": "Chicken Piccata",
  "pesto orzo salad": "Pesto",
  "street corn salad": "Corn",
  "chicken tinga tacos": "Tacos",
  "black bean quesadillas": "Quesadillas",
  "shrimp ceviche": "Prawn",
  "pork carnitas bowl": "Carnitas",
  "mango salsa verde": "Salsa",
  "ginger scallion salmon": "Salmon",
  "vegetable fried rice": "Fried Rice",
  "miso soup": "Miso soup",
  "thai basil chicken": "Thai Chicken",
  "cucumber sesame salad": "Cucumber",
  "teriyaki tofu bowls": "Teriyaki Chicken",
  "greek chicken souvlaki": "Souvlaki",
  "horiatiki salad": "Greek Salad",
  "shakshuka": "Shakshuka",
  "grilled halloumi skewers": "Halloumi",
  "baked sea bass with herbs": "Sea bass",
  "hummus platter": "Hummus",
  "chana masala": "Chickpea Curry",
  "tandoori-style chicken thighs": "Tandoori chicken",
  "dal tadka": "Dal",
  "vegetable biryani": "Biryani",
  "raita": "Raita",
  "classic mac and cheese": "Macaroni cheese",
  "meatloaf with glaze": "Meatloaf",
  "buttermilk fried chicken": "Fried Chicken",
  "cornbread": "Cornbread",
  "pot roast": "Pot Roast",
  "sloppy joes": "Sloppy Joes",
  "smoky grilled chicken thighs": "BBQ Chicken",
  "bbq pulled pork sandwiches": "Pulled Pork",
  "grilled corn with herb butter": "Corn",
  "beer-can chicken": "Chicken",
  "grilled portobello caps": "Mushroom",
  "peach bbq glaze ribs": "Pork rib",
  "grilled vegetable platter": "Roast vegetables",
  "lemon garlic shrimp skewers": "Garlic Prawns",
  "fish tacos with slaw": "Fish Tacos",
  "clam chowder": "Clam chowder",
  "seared scallops": "Scallops",
  "tuna poke bowl": "Poke",
  "grilled salmon with dill": "Salmon",
  "caprese stuffed avocados": "Caprese",
  "spinach feta pie": "Spanakopita",
  "roasted vegetable grain bowl": "Roast vegetables",
  "mushroom risotto": "Mushroom risotto",
  "black bean burgers": "Burger",
  "zucchini fritters": "Fritters",
  "chickpea curry": "Chickpea Curry",
  "lentil walnut bolognese": "Bolognese",
  "tofu scramble": "Tofu",
  "vegan caesar salad": "Caesar Salad",
  "sweet potato black bean tacos": "Tacos",
  "overnight oats": "Oatmeal",
  "quinoa tabbouleh": "Tabbouleh",
  "gf chicken stir-fry": "Stir Fry",
  "baked cod with tomatoes": "Cod",
  "stuffed bell peppers": "Stuffed Peppers",
  "almond flour pancakes": "Pancakes",
  "zoodles with pesto": "Pesto",
  "gazpacho": "Gazpacho",
  "chicken noodle soup": "Chicken Noodle Soup",
  "tomato basil soup": "Tomato Soup",
  "corn chowder": "Corn Chowder",
  "miso ramen bowl": "Ramen",
  "lentil soup": "Lentil Soup",
  "summer watermelon feta salad": "Salad",
  "classic caesar salad": "Caesar Salad",
  "asian slaw": "Coleslaw",
  "nicoise salad": "Nicoise",
  "strawberry spinach salad": "Spinach Salad",
  "cobb salad": "Cobb Salad",
  "panzanella": "Panzanella",
  "spaghetti aglio e olio": "Aglio e olio",
  "penne alla vodka": "Penne",
  "bolognese": "Bolognese",
  "pesto pasta": "Pesto",
  "shrimp scampi": "Shrimp scampi",
  "baked ziti": "Baked ziti",
  "fluffy scrambled eggs": "Scrambled Eggs",
  "banana pancakes": "Pancakes",
  "avocado toast": "Avocado",
  "overnight chia pudding": "Chia Pudding",
  "breakfast burrito": "Burrito",
  "greek yogurt parfait": "Yogurt",
  "chocolate chip cookies": "Chocolate Chip Cookies",
  "berry crisp": "Crumble",
  "lemon bars": "Lemon",
  "banana bread": "Banana Bread",
  "no-churn vanilla ice cream": "Ice cream",
};

/** Foodish-api.com category slugs (see https://foodish-api.com). */
export const FOODISH_CATEGORIES = [
  "biryani",
  "burger",
  "butter-chicken",
  "dessert",
  "dosa",
  "idly",
  "pasta",
  "pizza",
  "rice",
  "samosa",
];

/** @type {Array<[RegExp, string]>} */
const FOODISH_KEYWORDS = [
  [/\b(pizza|flatbread|margherita)\b/i, "pizza"],
  [/\b(burger|meatloaf|sloppy|ribs|bbq|pork|carnitas|roast)\b/i, "burger"],
  [/\b(pasta|spaghetti|penne|linguine|macaroni|orzo|ziti|fusilli|tagliatelle|bolognese|carbonara|risotto)\b/i, "pasta"],
  [/\b(biryani|fried rice|jasmine rice|carnitas bowl|poke bowl|grain bowl)\b/i, "biryani"],
  [/\b(salmon|shrimp|fish|cod|scallop|clam|tuna|ceviche|chowder|sea bass)\b/i, "biryani"],
  [/\b(cookie|cookies|dessert|crisp|ice cream|pancake|pancakes|pudding|parfait|bread|bars)\b/i, "dessert"],
  [/\b(curry|masala|dal|tandoori|chana|tikka)\b/i, "butter-chicken"],
  [/\b(samosa|dosa|idly)\b/i, "samosa"],
  [/\b(soup|ramen|minestrone|gazpacho|miso)\b/i, "rice"],
  [/\b(salad|slaw|tabbouleh|panzanella)\b/i, "rice"],
  [/\b(taco|burrito|quesadilla|mexican)\b/i, "samosa"],
  [/\b(chicken|souvlaki|piccata|tinga|fried chicken)\b/i, "butter-chicken"],
];

/**
 * @param {string} title
 * @returns {string[]}
 */
export function titleToSearchQueries(title) {
  const trimmed = title.trim();
  const lower = trimmed.toLowerCase();
  const queries = [];

  const alias = THEMEALDB_ALIASES[lower];
  if (alias) queries.push(alias);

  queries.push(trimmed);

  let core = trimmed.replace(LEADING_MODIFIERS, "").replace(TRAILING_MODIFIERS, "").trim();
  if (core && core !== trimmed) queries.push(core);

  const words = core
    .split(/[\s-]+/)
    .map((w) => w.replace(/[^a-zA-Z']/g, ""))
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()));

  if (words.length >= 2) {
    queries.push(words.slice(-2).join(" "));
  }
  if (words.length >= 1) {
    queries.push(words[words.length - 1]);
  }

  return [...new Set(queries.filter(Boolean))];
}

/**
 * @param {string} title
 * @returns {string}
 */
export function unsplashFoodQuery(title) {
  const parts = titleToSearchQueries(title);
  const base = parts[0] ?? title;
  return `${base} food dish`;
}

/**
 * @param {string} title
 * @returns {string | null} Foodish category slug or null
 */
export function foodishCategoryFromTitle(title) {
  const lower = title.toLowerCase();
  for (const [pattern, category] of FOODISH_KEYWORDS) {
    if (pattern.test(lower)) return category;
  }
  return "pasta";
}

/**
 * @param {string} title
 * @param {string} mealName
 * @returns {number}
 */
export function scoreMealNameMatch(title, mealName) {
  const normalize = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const t = normalize(title);
  const m = normalize(mealName);
  if (!t || !m) return 0;
  if (m === t || m.includes(t) || t.includes(m)) return 100;

  const tWords = new Set(t.split(" ").filter((w) => w.length > 2));
  const mWords = m.split(" ").filter((w) => w.length > 2);
  let hits = 0;
  for (const w of mWords) {
    if (tWords.has(w)) hits += 1;
  }
  return hits > 0 ? (hits / Math.max(tWords.size, 1)) * 80 : 0;
}
