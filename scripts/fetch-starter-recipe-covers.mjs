#!/usr/bin/env node
/**
 * Downloads 100 distinct food-themed placeholder JPEGs into public/recipes/.
 * Uses Lorem Picsum (stable seed per file). Requires network.
 *
 *   node scripts/fetch-starter-recipe-covers.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "recipes");
const COUNT = 100;
const WIDTH = 800;
const HEIGHT = 600;

async function fetchOne(n) {
  const name = `starter-${String(n).padStart(3, "0")}.jpg`;
  const seed = `whipit-starter-${n}`;
  const url = `https://picsum.photos/seed/${encodeURIComponent(seed)}/${WIDTH}/${HEIGHT}.jpg`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`${name}: HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(join(OUT_DIR, name), buf);
  return name;
}

await mkdir(OUT_DIR, { recursive: true });

for (let n = 1; n <= COUNT; n += 1) {
  const name = await fetchOne(n);
  process.stdout.write(`\r${name} (${n}/${COUNT})`);
}
process.stdout.write("\nDone.\n");
