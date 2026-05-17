#!/usr/bin/env node
/**
 * Downloads food-matched 800×600 JPEG covers for starter recipes (seq 1–100).
 * Sources (in order): TheMealDB → Foodish → Unsplash (optional UNSPLASH_ACCESS_KEY).
 * Never uses Lorem Picsum or generic stock landscapes.
 *
 *   node scripts/fetch-starter-recipe-covers.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { starterRecipeTitles } from "./starter-recipes-data.mjs";
import {
  FOODISH_CATEGORIES,
  foodishCategoryFromTitle,
  scoreMealNameMatch,
  titleToSearchQueries,
  unsplashFoodQuery,
} from "./recipe-title-to-image-query.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "recipes");
const WIDTH = 800;
const HEIGHT = 600;
const DELAY_MS = 180;

const THEMEALDB = "https://www.themealdb.com/api/json/v1/1/search.php?s=";
const FOODISH = "https://foodish-api.com/api/images";
const stats = { themealdb: 0, foodish: 0, unsplash: 0, failed: 0 };

function loadEnvLocal() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}

loadEnvLocal();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {string} imageUrl
 * @returns {Promise<Buffer>}
 */
async function fetchResizedJpeg(imageUrl) {
  const encoded = encodeURIComponent(imageUrl.replace(/^https?:\/\//i, ""));
  const proxy = `https://images.weserv.nl/?url=${encoded}&w=${WIDTH}&h=${HEIGHT}&fit=cover&output=jpg`;
  const res = await fetch(proxy, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`resize proxy HTTP ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * @param {string} query
 * @param {string} title
 * @returns {Promise<string | null>}
 */
async function searchTheMealDB(query, title) {
  const res = await fetch(THEMEALDB + encodeURIComponent(query));
  if (!res.ok) return null;
  const data = await res.json();
  const meals = data?.meals;
  if (!Array.isArray(meals) || meals.length === 0) return null;

  let best = null;
  let bestScore = 0;
  for (const meal of meals) {
    const score = scoreMealNameMatch(title, meal.strMeal ?? "");
    if (score > bestScore && meal.strMealThumb) {
      bestScore = score;
      best = meal.strMealThumb;
    }
  }
  if (best && bestScore >= 20) return best;
  if (meals.length === 1 && meals[0]?.strMealThumb) return meals[0].strMealThumb;
  return best ?? meals[0]?.strMealThumb ?? null;
}

/**
 * @param {string} title
 * @returns {Promise<string | null>}
 */
async function fetchFromTheMealDB(title) {
  for (const q of titleToSearchQueries(title)) {
    const thumb = await searchTheMealDB(q, title);
    if (thumb) return thumb;
    await sleep(80);
  }
  return null;
}

/**
 * @param {string} pathSuffix e.g. "seafood" or "" for random
 * @returns {Promise<string | null>}
 */
async function fetchFromFoodishPath(pathSuffix) {
  const url = pathSuffix ? `${FOODISH}/${pathSuffix}` : `${FOODISH}/`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return typeof data?.image === "string" ? data.image : null;
}

/**
 * @param {string} title
 * @returns {Promise<string | null>}
 */
async function fetchFromFoodish(title) {
  const category = foodishCategoryFromTitle(title);
  const primary = await fetchFromFoodishPath(category);
  if (primary) return primary;
  for (const cat of FOODISH_CATEGORIES) {
    if (cat === category) continue;
    const img = await fetchFromFoodishPath(cat);
    if (img) return img;
  }
  return fetchFromFoodishPath("");
}

/**
 * @param {string} title
 * @returns {Promise<string | null>}
 */
async function fetchFromUnsplash(title) {
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!key) return null;

  const q = unsplashFoodQuery(title);
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", q);
  url.searchParams.set("per_page", "1");
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("content_filter", "high");

  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${key}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const photo = data?.results?.[0];
  return photo?.urls?.regular ?? photo?.urls?.small ?? null;
}

/**
 * @param {{ seq: number, title: string }} recipe
 * @returns {Promise<"themealdb" | "foodish" | "unsplash">}
 */
async function resolveImageUrl(recipe) {
  const meal = await fetchFromTheMealDB(recipe.title);
  if (meal) return { source: "themealdb", url: meal };

  const foodish = await fetchFromFoodish(recipe.title);
  if (foodish) return { source: "foodish", url: foodish };

  const unsplash = await fetchFromUnsplash(recipe.title);
  if (unsplash) return { source: "unsplash", url: unsplash };

  throw new Error(`no image source for "${recipe.title}"`);
}

await mkdir(OUT_DIR, { recursive: true });

let recipes = starterRecipeTitles();
if (recipes.length !== 100) {
  throw new Error(`Expected 100 recipes, got ${recipes.length}`);
}

const onlySeq = process.argv
  .slice(2)
  .map((n) => Number.parseInt(n, 10))
  .filter((n) => Number.isFinite(n) && n >= 1 && n <= 100);
if (onlySeq.length > 0) {
  const want = new Set(onlySeq);
  recipes = recipes.filter((r) => want.has(r.seq));
}

console.log(`Fetching food covers for ${recipes.length} recipes…\n`);

for (const recipe of recipes) {
  const name = `starter-${String(recipe.seq).padStart(3, "0")}.jpg`;
  try {
    const { source, url } = await resolveImageUrl(recipe);
    const buf = await fetchResizedJpeg(url);
    await writeFile(join(OUT_DIR, name), buf);
    stats[source] += 1;
    process.stdout.write(
      `\r${name} (${recipe.seq}/100) [${source}] ${recipe.title.slice(0, 40)}`,
    );
  } catch (err) {
    stats.failed += 1;
    console.error(`\n${name} FAILED (${recipe.title}): ${err.message}`);
  }
  await sleep(DELAY_MS);
}

const total = recipes.length;
console.log("\n\n--- Summary ---");
console.log(`TheMealDB:  ${stats.themealdb}/${total}`);
console.log(`Foodish:    ${stats.foodish}/${total} (fallback)`);
console.log(`Unsplash:   ${stats.unsplash}/${total} (fallback, needs UNSPLASH_ACCESS_KEY)`);
console.log(`Failed:     ${stats.failed}/${total}`);
console.log(
  `\nEstimated good dish match rate (TheMealDB + aliases): ~${Math.round((stats.themealdb / total) * 100)}% direct API hits; Foodish category images are approximate.`,
);

if (stats.failed > 0) {
  process.exitCode = 1;
}
