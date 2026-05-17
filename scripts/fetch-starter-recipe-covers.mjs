#!/usr/bin/env node
/**
 * Downloads food-matched 800×600 JPEG covers for starter recipes (seq 1–100).
 * Sources (in order): TheMealDB (ID + search) → Unsplash → Wikimedia Commons → Foodish.
 * Never uses Lorem Picsum or generic stock landscapes.
 *
 *   node scripts/fetch-starter-recipe-covers.mjs
 *   node scripts/fetch-starter-recipe-covers.mjs 65 12
 */
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { starterRecipeTitles } from "./starter-recipes-data.mjs";
import {
  FOODISH_CATEGORIES,
  THEMEALDB_MEAL_IDS,
  WIKIMEDIA_FIRST_TITLES,
  WIKIMEDIA_IMAGE_OVERRIDES,
  foodishCategoryFromTitle,
  pickBestMeal,
  titleToSearchQueries,
  unsplashFoodQuery,
  wikimediaFoodQuery,
} from "./recipe-title-to-image-query.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "recipes");
const MANIFEST_PATH = join(OUT_DIR, "starter-covers-manifest.json");
const WIDTH = 800;
const HEIGHT = 600;
const DELAY_MS = 180;

const THEMEALDB_SEARCH = "https://www.themealdb.com/api/json/v1/1/search.php?s=";
const THEMEALDB_LOOKUP = "https://www.themealdb.com/api/json/v1/1/lookup.php?i=";
const FOODISH = "https://foodish-api.com/api/images";
const stats = { themealdb: 0, foodish: 0, unsplash: 0, wikimedia: 0, failed: 0 };
/** @type {Array<{ seq: number, title: string, source: string, mealName?: string, query?: string, imageUrl: string }>} */
const manifest = [];

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
async function writeCover(path, buf) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await writeFile(path, buf);
      return;
    } catch (err) {
      if (attempt === 3) throw err;
      await sleep(300 * (attempt + 1));
    }
  }
}

async function fetchResizedJpeg(imageUrl) {
  if (/upload\.wikimedia\.org/i.test(imageUrl)) {
    const clean = imageUrl.split("?")[0];
    await sleep(3200);
    for (let attempt = 0; attempt < 6; attempt++) {
      const res = await fetch(clean, {
        redirect: "follow",
        headers: { "User-Agent": "WhipItFlipIt/1.0 (starter recipe covers)" },
      });
      if (res.status === 429) {
        await sleep(4000 * (attempt + 1));
        continue;
      }
      if (!res.ok) {
        throw new Error(`wikimedia HTTP ${res.status}`);
      }
      return Buffer.from(await res.arrayBuffer());
    }
    throw new Error("wikimedia HTTP 429");
  }

  const encoded = encodeURIComponent(imageUrl.replace(/^https?:\/\//i, ""));
  const proxy = `https://images.weserv.nl/?url=${encoded}&w=${WIDTH}&h=${HEIGHT}&fit=cover&output=jpg`;
  const res = await fetch(proxy, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`resize proxy HTTP ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * @param {string} mealId
 * @returns {Promise<{ thumb: string, mealName: string } | null>}
 */
async function lookupTheMealDBById(mealId) {
  const res = await fetch(THEMEALDB_LOOKUP + encodeURIComponent(mealId));
  if (!res.ok) return null;
  const data = await res.json();
  const meal = data?.meals?.[0];
  if (!meal?.strMealThumb) return null;
  return { thumb: meal.strMealThumb, mealName: meal.strMeal ?? "" };
}

/**
 * @param {string} query
 * @param {string} title
 * @returns {Promise<{ thumb: string, mealName: string, score: number } | null>}
 */
async function searchTheMealDB(query, title) {
  const res = await fetch(THEMEALDB_SEARCH + encodeURIComponent(query));
  if (!res.ok) return null;
  const data = await res.json();
  const meals = data?.meals;
  if (!Array.isArray(meals) || meals.length === 0) return null;
  const picked = pickBestMeal(title, meals);
  if (!picked) return null;
  return { thumb: picked.thumb, mealName: picked.mealName, score: picked.score };
}

/**
 * @param {string} title
 * @returns {Promise<{ thumb: string, mealName: string, query?: string } | null>}
 */
async function fetchFromTheMealDB(title) {
  const lower = title.trim().toLowerCase();
  const preferWiki = WIKIMEDIA_FIRST_TITLES.has(lower);

  if (!preferWiki) {
    const mealId = THEMEALDB_MEAL_IDS[lower];
    if (mealId) {
      const byId = await lookupTheMealDBById(mealId);
      if (byId) return { ...byId, query: `id:${mealId}` };
    }
  }

  for (const q of titleToSearchQueries(title)) {
    const hit = await searchTheMealDB(q, title);
    if (hit) return { thumb: hit.thumb, mealName: hit.mealName, query: q };
    await sleep(80);
  }

  if (preferWiki) {
    const mealId = THEMEALDB_MEAL_IDS[lower];
    if (mealId) {
      const byId = await lookupTheMealDBById(mealId);
      if (byId) return { ...byId, query: `id:${mealId}` };
    }
  }

  return null;
}

/**
 * @param {string} pathSuffix e.g. "pizza" or "" for random
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
  if (!category) return null;
  const primary = await fetchFromFoodishPath(category);
  if (primary) return primary;
  for (const cat of FOODISH_CATEGORIES) {
    if (cat === category) continue;
    const img = await fetchFromFoodishPath(cat);
    if (img) return img;
  }
  return null;
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
 * @param {string} title
 * @returns {Promise<string | null>}
 */
async function fetchFromWikimedia(title) {
  const override = WIKIMEDIA_IMAGE_OVERRIDES[title.trim().toLowerCase()];
  if (override) return override;

  const q = wikimediaFoodQuery(title);
  const api = new URL("https://commons.wikimedia.org/w/api.php");
  api.searchParams.set("action", "query");
  api.searchParams.set("generator", "search");
  api.searchParams.set("gsrsearch", q);
  api.searchParams.set("gsrnamespace", "6");
  api.searchParams.set("gsrlimit", "5");
  api.searchParams.set("prop", "imageinfo");
  api.searchParams.set("iiprop", "url");
  api.searchParams.set("iiurlwidth", String(WIDTH));
  api.searchParams.set("format", "json");
  api.searchParams.set("origin", "*");

  await sleep(1500);

  const res = await fetch(api, {
    headers: { "User-Agent": "WhipItFlipIt/1.0 (starter recipe covers)" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return null;

  const urls = Object.values(pages)
    .map((p) => p.imageinfo?.[0]?.thumburl ?? p.imageinfo?.[0]?.url)
    .filter((u) => typeof u === "string" && /\.(jpg|jpeg|png|webp)(\?|$)/i.test(u));

  return urls[0] ?? null;
}

/**
 * @param {{ seq: number, title: string }} recipe
 */
async function resolveImageUrl(recipe) {
  const preferWiki = WIKIMEDIA_FIRST_TITLES.has(recipe.title.trim().toLowerCase());

  if (!preferWiki) {
    const meal = await fetchFromTheMealDB(recipe.title);
    if (meal) {
      return {
        source: "themealdb",
        url: meal.thumb,
        mealName: meal.mealName,
        query: meal.query,
      };
    }
  }

  const unsplash = await fetchFromUnsplash(recipe.title);
  if (unsplash) {
    return { source: "unsplash", url: unsplash, query: unsplashFoodQuery(recipe.title) };
  }

  const wiki = await fetchFromWikimedia(recipe.title);
  if (wiki) {
    return { source: "wikimedia", url: wiki, query: wikimediaFoodQuery(recipe.title) };
  }

  const meal = await fetchFromTheMealDB(recipe.title);
  if (meal) {
    return {
      source: "themealdb",
      url: meal.thumb,
      mealName: meal.mealName,
      query: meal.query,
    };
  }

  const foodish = await fetchFromFoodish(recipe.title);
  if (foodish) {
    return { source: "foodish", url: foodish, mealName: foodishCategoryFromTitle(recipe.title) };
  }

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
    const resolved = await resolveImageUrl(recipe);
    const buf = await fetchResizedJpeg(resolved.url);
    await writeCover(join(OUT_DIR, name), buf);
    stats[resolved.source] += 1;
    manifest.push({
      seq: recipe.seq,
      title: recipe.title,
      source: resolved.source,
      mealName: resolved.mealName,
      query: resolved.query,
      imageUrl: resolved.url,
    });
    process.stdout.write(
      `\r${name} (${recipe.seq}/100) [${resolved.source}] ${recipe.title.slice(0, 36)}`,
    );
  } catch (err) {
    stats.failed += 1;
    console.error(`\n${name} FAILED (${recipe.title}): ${err.message}`);
  }
  await sleep(DELAY_MS);
}

let mergedManifest = manifest;
if (onlySeq.length > 0 && existsSync(MANIFEST_PATH)) {
  try {
    const prev = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
    const bySeq = new Map(prev.map((row) => [row.seq, row]));
    for (const row of manifest) bySeq.set(row.seq, row);
    mergedManifest = [...bySeq.values()].sort((a, b) => a.seq - b.seq);
  } catch {
    mergedManifest = manifest;
  }
}
await writeFile(MANIFEST_PATH, JSON.stringify(mergedManifest, null, 2));

const total = recipes.length;
console.log("\n\n--- Summary ---");
console.log(`TheMealDB:  ${stats.themealdb}/${total}`);
console.log(`Unsplash:   ${stats.unsplash}/${total} (UNSPLASH_ACCESS_KEY in .env.local)`);
console.log(`Wikimedia:  ${stats.wikimedia}/${total}`);
console.log(`Foodish:    ${stats.foodish}/${total} (category match only)`);
console.log(`Failed:     ${stats.failed}/${total}`);
console.log(`Manifest:   ${MANIFEST_PATH}`);

if (stats.failed > 0) {
  process.exitCode = 1;
}
