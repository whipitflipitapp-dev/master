#!/usr/bin/env node
/**
 * Generates supabase/migrations/*_seed_starter_recipes_100.sql
 * Run: node scripts/generate-starter-recipes-migration.mjs
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CATEGORIES,
  TARGET,
  buildStarterRecipes,
  starterImagePath,
} from "./starter-recipes-data.mjs";

const { recipes, counts } = buildStarterRecipes();

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

/** Lowercase-keyed canonical ingredient names (avoids duplicate rows). */
const ingredientCanon = new Map();
function canonIngredient(name) {
  const key = name.toLowerCase();
  if (!ingredientCanon.has(key)) ingredientCanon.set(key, name);
  return ingredientCanon.get(key);
}
for (const r of recipes) {
  for (const ing of r.item[4]) {
    ing[0] = canonIngredient(ing[0]);
  }
}
const allIngredients = [...ingredientCanon.values()];

const lines = [];
lines.push(`-- Starter browse recipes (~${TARGET}) for local/staging. Idempotent (fixed UUIDs + ON CONFLICT DO NOTHING).`);
lines.push(`-- Category slugs match src/lib/recipe-categories.ts (tags.name).`);
lines.push(`-- Image paths: /recipes/starter-001.jpg … starter-100.jpg (patched in 20260517141000; see demo-recipe-cover-images.ts).`);
lines.push(`-- Food-matched JPEGs: node scripts/fetch-starter-recipe-covers.mjs (TheMealDB / Foodish / optional Unsplash).`);
lines.push(`-- Applied as migration role (bypasses RLS); anon SELECT on recipes is open.`);
lines.push("");

lines.push("INSERT INTO public.ingredients (name)");
lines.push("VALUES");
lines.push(
  allIngredients
    .sort((a, b) => a.localeCompare(b))
    .map((n) => `  (${sqlStr(n)})`)
    .join(",\n"),
);
lines.push("ON CONFLICT (name) DO NOTHING;");
lines.push("");

lines.push("INSERT INTO public.tags (name)");
lines.push("VALUES");
lines.push(CATEGORIES.map((c) => `  (${sqlStr(c)})`).join(",\n"));
lines.push("ON CONFLICT (name) DO NOTHING;");
lines.push("");

lines.push(`INSERT INTO public.recipes (
  id,
  title,
  instructions,
  image_url,
  video_url,
  favorites_count,
  created_by,
  difficulty,
  cook_time_minutes
)`);
lines.push("VALUES");

const recipeRows = recipes.map((r) => {
  const [title, difficulty, minutes, instr] = r.item;
  const id = uuidFor(r.seq);
  const img = starterImagePath(r.seq);
  return `(
  ${sqlStr(id)}::uuid,
  ${sqlStr(title)},
  $instr$${instr}$instr$,
  ${sqlStr(img)},
  NULL,
  0,
  NULL,
  ${sqlStr(difficulty)},
  ${minutes}
)`;
});
lines.push(recipeRows.join(",\n"));
lines.push("ON CONFLICT (id) DO NOTHING;");
lines.push("");

// recipe_ingredients
lines.push("INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, sort_order)");
lines.push("VALUES");
const riRows = [];
for (const r of recipes) {
  const id = uuidFor(r.seq);
  const [, , , , ings] = r.item;
  ings.forEach(([name, qty], sort) => {
    riRows.push(
      `  (${sqlStr(id)}::uuid, (SELECT id FROM public.ingredients WHERE name = ${sqlStr(name)} LIMIT 1), ${sqlStr(qty)}, ${sort})`,
    );
  });
}
lines.push(riRows.join(",\n"));
lines.push("ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;");
lines.push("");

// recipe_tags — one primary category per recipe
lines.push("INSERT INTO public.recipe_tags (recipe_id, tag_id)");
lines.push(
  recipes
    .map(
      (r) =>
        `SELECT ${sqlStr(uuidFor(r.seq))}::uuid, t.id FROM public.tags t WHERE t.name = ${sqlStr(r.cat)}`,
    )
    .join("\nUNION ALL\n"),
);
lines.push("ON CONFLICT (recipe_id, tag_id) DO NOTHING;");
lines.push("");

const outPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "supabase",
  "migrations",
  "20260517140000_seed_starter_recipes_100.sql",
);

writeFileSync(outPath, lines.join("\n") + "\n", "utf8");

console.log(`Wrote ${outPath}`);
console.log(`Recipes: ${recipes.length}`);
console.log("Per category:");
for (const cat of CATEGORIES) {
  console.log(`  ${cat}: ${counts[cat]}`);
}
