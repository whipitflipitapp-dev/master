#!/usr/bin/env node
/**
 * One-off: delete duplicate recipes by normalized title (keeps lowest UUID).
 *
 *   node scripts/dedupe-recipes-by-title.mjs [--dry-run] [--starter-only]
 *
 * Requires .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const STARTER_PREFIX = "c0ffe000-0000-4000-8000-";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const starterOnly = args.has("--starter-only");

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

function normTitle(title) {
  return title.trim().toLowerCase();
}

function starterSeq(id) {
  if (!id.startsWith(STARTER_PREFIX)) return null;
  const tail = id.slice(STARTER_PREFIX.length);
  const n = Number.parseInt(tail, 10);
  return Number.isFinite(n) ? n : null;
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PAGE = 1000;
const rows = [];
let from = 0;

while (true) {
  const { data, error } = await supabase
    .from("recipes")
    .select("id,title")
    .order("id", { ascending: true })
    .range(from, from + PAGE - 1);

  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  const batch = data ?? [];
  rows.push(...batch);
  if (batch.length < PAGE) break;
  from += batch.length;
}

const filtered = starterOnly
  ? rows.filter((r) => r.id.startsWith(STARTER_PREFIX))
  : rows;

const groups = new Map();
for (const r of filtered) {
  const key = normTitle(r.title);
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r);
}

const toDelete = [];
for (const [title, list] of groups) {
  if (list.length < 2) continue;
  list.sort((a, b) => {
    const sa = starterSeq(a.id);
    const sb = starterSeq(b.id);
    if (sa != null && sb != null) return sa - sb;
    return a.id.localeCompare(b.id);
  });
  const keep = list[0];
  for (const dup of list.slice(1)) {
    toDelete.push({ title, keep: keep.id, id: dup.id });
  }
}

console.log(
  `Scanned ${filtered.length} recipes; ${groups.size} unique titles; ${toDelete.length} duplicates to remove`,
);

if (toDelete.length === 0) {
  process.exit(0);
}

for (const row of toDelete) {
  console.log(`  DELETE ${row.id}  (${row.title})  keep ${row.keep}`);
}

if (dryRun) {
  console.log("\nDry run — no rows deleted.");
  process.exit(0);
}

const ids = toDelete.map((r) => r.id);
const { error: delErr } = await supabase.from("recipes").delete().in("id", ids);
if (delErr) {
  console.error("Delete failed:", delErr.message);
  process.exit(1);
}

console.log(`\nDeleted ${ids.length} duplicate recipe(s).`);
