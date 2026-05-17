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

/** Words that alone should not justify a loose TheMealDB match. */
const GENERIC_MEAL_WORDS = new Set([
  "chicken",
  "beef",
  "pork",
  "lamb",
  "fish",
  "salmon",
  "shrimp",
  "prawn",
  "rice",
  "soup",
  "salad",
  "pasta",
  "noodle",
  "curry",
  "stew",
  "roast",
  "grilled",
  "baked",
  "fried",
  "style",
  "easy",
  "classic",
  "with",
  "and",
  "the",
]);

/** Exact title (lowercase) → preferred TheMealDB search string. */
export const THEMEALDB_ALIASES = {
  "margherita flatbread": "Pizza Express Margherita",
  "cacio e pepe": "Spaghetti alla Carbonara",
  "chicken piccata": "Chicken Alfredo Primavera",
  "pesto orzo salad": "Mediterranean Pasta Salad",
  "street corn salad": "Elote street corn",
  "chicken tinga tacos": "Crock Pot Chicken Baked Tacos",
  "black bean quesadillas": "Stuffed Bell Peppers with Quinoa and Black Beans",
  "shrimp ceviche": "Bang bang prawn salad",
  "pork carnitas bowl": "Portuguese barbecued pork",
  "mango salsa verde": "Piri-piri chicken and slaw",
  "ginger scallion salmon": "Honey Teriyaki Salmon",
  "vegetable fried rice": "Chicken Fried Rice",
  "miso soup": "Miso soup",
  "thai basil chicken": "Thai green chicken soup",
  "cucumber sesame salad": "Sesame Cucumber Salad",
  "teriyaki tofu bowls": "Teriyaki Chicken Casserole",
  "greek chicken souvlaki": "Lamb and Lemon Souvlaki",
  "horiatiki salad": "Greek salad",
  "shakshuka": "Shakshuka",
  "grilled halloumi skewers": "Halloumi",
  "baked sea bass with herbs": "Sea bass",
  "hummus platter": "Hummus",
  "chana masala": "Baingan Bharta",
  "tandoori-style chicken thighs": "Tandoori chicken",
  "dal tadka": "Dal fry",
  "vegetable biryani": "Lamb Biryani",
  "raita": "Cucumber raita",
  "classic mac and cheese": "Chicken Fajita Mac and Cheese",
  "meatloaf with glaze": "Turkey Meatloaf",
  "buttermilk fried chicken": "Kentucky Fried Chicken",
  "cornbread": "Cornbread",
  "pot roast": "Beef Brisket Pot Roast",
  "sloppy joes": "BBQ Pork Sloppy Joes",
  "smoky grilled chicken thighs": "Smoky chicken skewers",
  "bbq pulled pork sandwiches": "BBQ Pork Sloppy Joes",
  "grilled corn with herb butter": "Grilled corn",
  "beer-can chicken": "Roast chicken",
  "grilled portobello caps": "Grilled eggplant with coconut milk",
  "peach bbq glaze ribs": "Pork rib",
  "grilled vegetable platter": "Roast fennel and aubergine paella",
  "lemon garlic shrimp skewers": "Gambas al ajillo",
  "fish tacos with slaw": "Cajun spiced fish tacos",
  "clam chowder": "Clam chowder",
  "seared scallops": "Scallops",
  "tuna poke bowl": "Sushi",
  "grilled salmon with dill": "Baked salmon with fennel & tomatoes",
  "caprese stuffed avocados": "Caprese salad",
  "spinach feta pie": "Flamiche",
  "roasted vegetable grain bowl": "Mediterranean Pasta Salad",
  "mushroom risotto": "Salmon Prawn Risotto",
  "black bean burgers": "Black bean burger",
  "zucchini fritters": "Zucchini fritters",
  "chickpea curry": "Chickpea curry",
  "lentil walnut bolognese": "Spaghetti Bolognese",
  "tofu scramble": "Ma Po Tofu",
  "vegan caesar salad": "Caesar salad",
  "sweet potato black bean tacos": "Crock Pot Chicken Baked Tacos",
  "overnight oats": "Oatmeal pancakes",
  "quinoa tabbouleh": "Tabbouleh",
  "gf chicken stir-fry": "Beef and Broccoli Stir-Fry",
  "baked cod with tomatoes": "Baked salmon with fennel & tomatoes",
  "stuffed bell peppers": "Stuffed Bell Peppers with Quinoa and Black Beans",
  "almond flour pancakes": "Pancakes",
  "zoodles with pesto": "Squash linguine",
  "gazpacho": "Quick gazpacho",
  "chicken noodle soup": "Rosol",
  "tomato basil soup": "Creamy Tomato Soup",
  "corn chowder": "Clam chowder",
  "miso ramen bowl": "Ramen Noodles with Boiled Egg",
  "lentil soup": "Split Pea Soup",
  "summer watermelon feta salad": "Watermelon feta salad",
  "classic caesar salad": "Caesar salad",
  "asian slaw": "Tangy cabbage slaw",
  "nicoise salad": "Tuna Nicoise",
  "strawberry spinach salad": "Strawberry spinach salad",
  "cobb salad": "Cobb salad",
  "panzanella": "Panzanella",
  "spaghetti aglio e olio": "Spaghetti alla Carbonara",
  "penne alla vodka": "Spicy Arrabiata Penne",
  "bolognese": "Spaghetti Bolognese",
  "pesto pasta": "Squash linguine",
  "shrimp scampi": "Chilli prawn linguine",
  "baked ziti": "Lasagne",
  "fluffy scrambled eggs": "Scrambled eggs",
  "banana pancakes": "Banana Pancakes",
  "avocado toast": "Avocado toast",
  "overnight chia pudding": "Chia pudding",
  "breakfast burrito": "Beef Banh Mi Bowls",
  "greek yogurt parfait": "Greek yogurt parfait",
  "chocolate chip cookies": "Chocolate chip cookies",
  "berry crisp": "Apple & Blackberry Crumble",
  "lemon bars": "Lemon bars",
  "banana bread": "Banana bread",
  "no-churn vanilla ice cream": "No-Churn Rum Raisin Ice Cream",
  minestrone: "Ribollita",
  "eggplant parmigiana": "Crispy Eggplant",
  "italian wedding soup": "Algerian Kefta",
  "lamb kofta with tzatziki": "Imam bayildi with BBQ lamb & tzatziki",
  "maple bourbon ribs": "Pork rib bortsch",
  "jackfruit carnitas tacos": "Crock Pot Chicken Baked Tacos",
  "garlic butter mussels": "Gambas al ajillo",
  "roasted butternut squash soup": "Thai pumpkin soup",
  "farro beet salad": "Beetroot salad",
  "kale apple salad": "Kale apple salad",
  "roasted cauliflower steaks": "Cauliflower steak",
  "mediterranean orzo bake": "Mediterranean Pasta Salad",
  "alabama white bbq chicken": "BBQ chicken",
  "crab cakes with remoulade": "Three Fish Pie",
  "three-bean chili": "Smoky Lentil Chili with Squash",
  "coconut red lentil dal": "Dal fry",
  "stuffed sweet potatoes": "Vietnamese lamb shanks with sweet potatoes",
};

/**
 * Confident TheMealDB meal IDs (lookup.php?i=) for starter titles.
 * Omitted titles fall through to search, Unsplash, then Wikimedia.
 */
export const THEMEALDB_MEAL_IDS = {
  "margherita flatbread": "53014",
  "chicken tinga tacos": "52830",
  "black bean quesadillas": "53067",
  "shrimp ceviche": "53239",
  "pork carnitas bowl": "53044",
  "ginger scallion salmon": "52773",
  "vegetable fried rice": "53367",
  "teriyaki tofu bowls": "52772",
  "greek chicken souvlaki": "53009",
  "shakshuka": "52963",
  "baked sea bass with herbs": "53247",
  "hummus platter": "53269",
  "chana masala": "52807",
  "tandoori-style chicken thighs": "52806",
  "dal tadka": "52785",
  "vegetable biryani": "52805",
  "classic mac and cheese": "52818",
  "meatloaf with glaze": "52845",
  "buttermilk fried chicken": "52813",
  "pot roast": "52812",
  "sloppy joes": "52995",
  "smoky grilled chicken thighs": "53264",
  "bbq pulled pork sandwiches": "52995",
  "lemon garlic shrimp skewers": "53144",
  "fish tacos with slaw": "52819",
  "clam chowder": "52840",
  "tuna poke bowl": "53065",
  "grilled salmon with dill": "52959",
  "spinach feta pie": "52906",
  "roasted vegetable grain bowl": "52777",
  "mushroom risotto": "52823",
  "lentil walnut bolognese": "52770",
  "tofu scramble": "52947",
  "sweet potato black bean tacos": "52830",
  "overnight oats": "53331",
  "gf chicken stir-fry": "53366",
  "baked cod with tomatoes": "52959",
  "stuffed bell peppers": "53067",
  "almond flour pancakes": "52854",
  "zoodles with pesto": "52866",
  "gazpacho": "53173",
  "chicken noodle soup": "53020",
  "tomato basil soup": "52841",
  "corn chowder": "52840",
  "miso ramen bowl": "53383",
  "lentil soup": "52925",
  "nicoise salad": "52852",
  "spaghetti aglio e olio": "52982",
  "penne alla vodka": "52771",
  "bolognese": "52770",
  "pesto pasta": "52866",
  "shrimp scampi": "52839",
  "baked ziti": "52844",
  "banana pancakes": "52855",
  "berry crisp": "52893",
  "no-churn vanilla ice cream": "53347",
  minestrone: "52811",
  "eggplant parmigiana": "53072",
  "italian wedding soup": "53281",
  "lamb kofta with tzatziki": "53253",
  "peach bbq glaze ribs": "53306",
  "jackfruit carnitas tacos": "52830",
  "garlic butter mussels": "53144",
  "grilled portobello caps": "53074",
  "grilled vegetable platter": "52942",
  "mediterranean orzo bake": "52777",
  "roasted butternut squash soup": "53210",
  "crab cakes with remoulade": "52882",
  "coconut red lentil dal": "52785",
  "stuffed sweet potatoes": "53231",
  "three-bean chili": "52784",
  "cucumber sesame salad": "53378",
  "asian slaw": "53312",
  "horiatiki salad": "53011",
  "falafel pita pockets": "53091",
  "cacio e pepe": "52982",
  "chicken piccata": "52796",
};

/** Prefer Wikimedia/Unsplash over approximate TheMealDB IDs. */
export const WIKIMEDIA_FIRST_TITLES = new Set([
  "street corn salad",
  "caprese stuffed avocados",
  "summer watermelon feta salad",
  "classic caesar salad",
  "vegan caesar salad",
  "cobb salad",
  "panzanella",
  "quinoa tabbouleh",
  "strawberry spinach salad",
  "lemon bars",
  "chocolate chip cookies",
  "banana bread",
  "beer-can chicken",
  "miso soup",
  "seared scallops",
  "black bean burgers",
  "avocado toast",
  "fluffy scrambled eggs",
  "zucchini fritters",
  "kale apple salad",
  "farro beet salad",
  "roasted cauliflower steaks",
  "alabama white bbq chicken",
  "overnight chia pudding",
  "thai basil chicken",
  "cornbread",
  "grilled halloumi skewers",
  "grilled corn with herb butter",
  "maple bourbon ribs",
  "chickpea curry",
  "raita",
  "mango salsa verde",
  "breakfast burrito",
  "greek yogurt parfait",
]);

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

/** Only map when Foodish category is a plausible visual match. */
const FOODISH_KEYWORDS = [
  [/\b(pizza|margherita)\b/i, "pizza"],
  [/\b(burger|sloppy joe|meatloaf)\b/i, "burger"],
  [/\b(spaghetti|penne|linguine|macaroni|fusilli|tagliatelle|carbonara|bolognese|ziti|rigatoni)\b/i, "pasta"],
  [/\b(biryani)\b/i, "biryani"],
  [/\b(cookie|cookies|ice cream|brownie)\b/i, "dessert"],
  [/\b(curry|masala|tandoori|tikka masala)\b/i, "butter-chicken"],
  [/\b(samosa|dosa|idly)\b/i, "samosa"],
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
 * @returns {string}
 */
export function wikimediaFoodQuery(title) {
  const parts = titleToSearchQueries(title);
  const base = parts[0] ?? title;
  return `${base} food`;
}

/**
 * @param {string} title
 * @returns {string | null} Foodish category slug or null when Foodish cannot match well
 */
export function foodishCategoryFromTitle(title) {
  const lower = title.toLowerCase();
  for (const [pattern, category] of FOODISH_KEYWORDS) {
    if (pattern.test(lower)) return category;
  }
  return null;
}

/**
 * @param {string} title
 * @returns {number}
 */
export function minMealMatchScore(title) {
  const lower = title.trim().toLowerCase();
  if (THEMEALDB_MEAL_IDS[lower]) return 0;
  if (THEMEALDB_ALIASES[lower]) return 35;
  return 48;
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

  const tWords = t.split(" ").filter((w) => w.length > 2);
  const mWords = m.split(" ").filter((w) => w.length > 2);
  const tSet = new Set(tWords);

  let hits = 0;
  let strongHits = 0;
  for (const w of mWords) {
    if (!tSet.has(w)) continue;
    hits += 1;
    if (!GENERIC_MEAL_WORDS.has(w)) strongHits += 1;
  }

  if (strongHits === 0) return hits > 0 ? Math.min(25, hits * 12) : 0;

  const coverage = strongHits / Math.max(tWords.filter((w) => !GENERIC_MEAL_WORDS.has(w)).length, 1);
  return Math.round(40 + coverage * 55);
}

/**
 * @param {string} title
 * @param {Array<{ strMeal?: string, strMealThumb?: string }>} meals
 * @returns {{ thumb: string, mealName: string, score: number } | null}
 */
export function pickBestMeal(title, meals) {
  if (!Array.isArray(meals) || meals.length === 0) return null;

  const threshold = minMealMatchScore(title);
  let best = null;
  let bestScore = 0;

  for (const meal of meals) {
    if (!meal?.strMealThumb) continue;
    const score = scoreMealNameMatch(title, meal.strMeal ?? "");
    if (score > bestScore) {
      bestScore = score;
      best = meal;
    }
  }

  if (!best) return null;
  if (bestScore < threshold) return null;
  if (meals.length === 1 && bestScore >= 30) {
    return { thumb: best.strMealThumb, mealName: best.strMeal ?? "", score: bestScore };
  }
  if (bestScore >= threshold) {
    return { thumb: best.strMealThumb, mealName: best.strMeal ?? "", score: bestScore };
  }
  return null;
}
