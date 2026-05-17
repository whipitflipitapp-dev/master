#!/usr/bin/env node
/**
 * Writes supabase/migrations/20260517142000_dedupe_starter_recipes.sql
 * Patches starter rows that were duplicate titles (queue recycling bug).
 * Run: node scripts/generate-dedupe-starter-migration.mjs
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CATEGORIES,
  BY_CATEGORY,
  buildStarterRecipes,
} from "./starter-recipes-data.mjs";

function sqlStr(s) {
  if (s.includes("$") || s.includes("\\")) {
    return (
      "$q$" +
      s.replace(/\$/g, () => {
        throw new Error("unexpected $ in string");
      }) +
      "$q$"
    );
  }
  return "'" + s.replace(/'/g, "''") + "'";
}

function uuidFor(n) {
  return `c0ffe000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

/** Category pool sizes before 20260517142000 dedupe expansion (queue recycling dupes). */
const LEGACY_POOL_SLICE = {
  italian: 6,
  mexican: 6,
  asian: 6,
  mediterranean: 6,
  indian: 5,
  american_comfort: 6,
  bbq: 7,
  seafood: 6,
  vegetarian: 6,
  vegan: 6,
  gluten_free: 6,
  soups: 6,
  salads: 7,
  pasta: 6,
  breakfast: 6,
  desserts: 5,
};

/** Pre-fix builder (reused titles when category pool ran dry). */
function buildStarterRecipesLegacy() {
  const recipes = [];
  let seq = 1;
  const summerBoost = [
    "bbq",
    "salads",
    "soups",
    "seafood",
    "mediterranean",
    "vegan",
    "vegetarian",
  ];
  const TARGET = 100;
  const queues = Object.fromEntries(
    CATEGORIES.map((c) => [
      c,
      [...(BY_CATEGORY[c] ?? [])].slice(0, LEGACY_POOL_SLICE[c] ?? 0),
    ]),
  );
  for (const cat of CATEGORIES) {
    const item = queues[cat].shift();
    if (!item) throw new Error(`Empty queue for ${cat}`);
    recipes.push({ cat, item, seq: seq++ });
  }
  let i = 0;
  while (recipes.length < TARGET) {
    const cat =
      recipes.length % 3 === 0 && summerBoost.length
        ? summerBoost[i % summerBoost.length]
        : CATEGORIES[i % CATEGORIES.length];
    i++;
    if (queues[cat].length === 0) queues[cat].push(...BY_CATEGORY[cat]);
    const item = queues[cat].shift();
    recipes.push({ cat, item, seq: seq++ });
  }
  return { recipes };
}

const norm = (t) => t.trim().toLowerCase();
const legacy = buildStarterRecipesLegacy();
const byTitle = new Map();
for (const r of legacy.recipes) {
  const key = norm(r.item[0]);
  if (!byTitle.has(key)) byTitle.set(key, []);
  byTitle.get(key).push(r.seq);
}
const rewriteSeqs = [];
for (const [, seqs] of byTitle) {
  if (seqs.length < 2) continue;
  seqs.sort((a, b) => a - b);
  for (const seq of seqs.slice(1)) rewriteSeqs.push(seq);
}
rewriteSeqs.sort((a, b) => a - b);

const { recipes: fixed } = buildStarterRecipes();
const fixedBySeq = new Map(fixed.map((r) => [r.seq, r]));

const ingredientCanon = new Map();
function canonIngredient(name) {
  const key = name.toLowerCase();
  if (!ingredientCanon.has(key)) ingredientCanon.set(key, name);
  return ingredientCanon.get(key);
}
for (const seq of rewriteSeqs) {
  const r = fixedBySeq.get(seq);
  if (!r) throw new Error(`Missing fixed recipe for seq ${seq}`);
  for (const ing of r.item[4]) {
    ing[0] = canonIngredient(ing[0]);
  }
}
const newIngredients = [...ingredientCanon.values()];

const lines = [];
lines.push(
  "-- Rewrite starter slots that duplicated titles (buildStarterRecipes queue recycling).",
);
lines.push("-- Keeps lowest-seq row per title; replaces higher-seq rows with unique catalog entries.");
lines.push("-- Safe to re-run: targets fixed UUIDs only.");
lines.push("");

if (newIngredients.length > 0) {
  lines.push("INSERT INTO public.ingredients (name)");
  lines.push("VALUES");
  lines.push(
    newIngredients
      .sort((a, b) => a.localeCompare(b))
      .map((n) => `  (${sqlStr(n)})`)
      .join(",\n"),
  );
  lines.push("ON CONFLICT (name) DO NOTHING;");
  lines.push("");
}

for (const seq of rewriteSeqs) {
  const r = fixedBySeq.get(seq);
  const [title, difficulty, minutes, instr, ings] = r.item;
  const id = uuidFor(seq);
  const img = `/recipes/starter-${String(seq).padStart(3, "0")}.jpg`;

  lines.push(`-- seq ${seq}: ${title}`);
  lines.push(`UPDATE public.recipes`);
  lines.push(`SET`);
  lines.push(`  title = ${sqlStr(title)},`);
  lines.push(`  instructions = $instr$${instr}$instr$,`);
  lines.push(`  image_url = ${sqlStr(img)},`);
  lines.push(`  difficulty = ${sqlStr(difficulty)},`);
  lines.push(`  cook_time_minutes = ${minutes}`);
  lines.push(`WHERE id = ${sqlStr(id)}::uuid;`);
  lines.push("");

  lines.push(
    `DELETE FROM public.recipe_ingredients WHERE recipe_id = ${sqlStr(id)}::uuid;`,
  );
  lines.push(
    `DELETE FROM public.recipe_tags WHERE recipe_id = ${sqlStr(id)}::uuid;`,
  );
  lines.push("");

  lines.push(
    "INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, sort_order)",
  );
  lines.push("VALUES");
  lines.push(
    ings
      .map(
        ([name, qty], sort) =>
          `  (${sqlStr(id)}::uuid, (SELECT id FROM public.ingredients WHERE name = ${sqlStr(name)} LIMIT 1), ${sqlStr(qty)}, ${sort})`,
      )
      .join(",\n"),
  );
  lines.push("ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;");
  lines.push("");

  lines.push("INSERT INTO public.recipe_tags (recipe_id, tag_id)");
  lines.push(
    `SELECT ${sqlStr(id)}::uuid, t.id FROM public.tags t WHERE t.name = ${sqlStr(r.cat)}`,
  );
  lines.push("ON CONFLICT (recipe_id, tag_id) DO NOTHING;");
  lines.push("");
}

const outPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "supabase",
  "migrations",
  "20260517142000_dedupe_starter_recipes.sql",
);
writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
console.log(`Wrote ${outPath}`);
console.log(`Rewrite slots: ${rewriteSeqs.length} (seq ${rewriteSeqs.join(", ")})`);
