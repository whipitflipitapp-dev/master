#!/usr/bin/env node
/**
 * Prints starter cover provenance (seq, title, source, matched meal / query).
 *
 *   node scripts/audit-starter-recipe-covers.mjs
 *   node scripts/audit-starter-recipe-covers.mjs 65 12 25
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { starterRecipeTitles } from "./starter-recipes-data.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MANIFEST = join(__dirname, "..", "public", "recipes", "starter-covers-manifest.json");

/** @type {Array<{ seq: number, title: string, source: string, mealName?: string, query?: string }>} */
let rows = [];
if (existsSync(MANIFEST)) {
  rows = JSON.parse(readFileSync(MANIFEST, "utf8"));
}

const bySeq = new Map(rows.map((r) => [r.seq, r]));
const titles = starterRecipeTitles();

const onlySeq = process.argv
  .slice(2)
  .map((n) => Number.parseInt(n, 10))
  .filter((n) => Number.isFinite(n) && n >= 1 && n <= 100);

const list = onlySeq.length
  ? titles.filter((t) => onlySeq.includes(t.seq))
  : titles;

const counts = { themealdb: 0, unsplash: 0, wikimedia: 0, foodish: 0, missing: 0 };

console.log("seq\ttitle\tsource\tmatched / query");
console.log("-".repeat(80));

for (const { seq, title } of list) {
  const row = bySeq.get(seq);
  const source = row?.source ?? "missing";
  counts[source] = (counts[source] ?? 0) + 1;
  const detail = row?.mealName ?? row?.query ?? "—";
  console.log(`${String(seq).padStart(3)}\t${title}\t${source}\t${detail}`);
}

console.log("-".repeat(80));
console.log(
  `Totals: TheMealDB ${counts.themealdb ?? 0}, Unsplash ${counts.unsplash ?? 0}, Wikimedia ${counts.wikimedia ?? 0}, Foodish ${counts.foodish ?? 0}, missing ${counts.missing ?? 0}`,
);

if (!existsSync(MANIFEST)) {
  console.error("\nNo manifest found. Run: node scripts/fetch-starter-recipe-covers.mjs");
  process.exitCode = 1;
}
