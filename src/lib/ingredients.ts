/** Normalize ingredient tokens for matching (lowercase, trim). */
export function normalizeIngredientToken(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Split recipe ingredient textarea into lines. Prefer newlines (one ingredient per line).
 * Commas inside parentheses stay on one line; comma-split only for single-line lists.
 */
export function splitRecipeIngredientInput(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (/\r?\n/.test(trimmed)) {
    return trimmed
      .split(/\r?\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  return splitOnCommasOutsideParentheses(trimmed);
}

function splitOnCommasOutsideParentheses(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === "(") depth += 1;
    else if (c === ")") depth = Math.max(0, depth - 1);
    else if ((c === "," || c === ";") && depth === 0) {
      const piece = text.slice(start, i).trim();
      if (piece) parts.push(piece);
      start = i + 1;
    }
  }
  const tail = text.slice(start).trim();
  if (tail) parts.push(tail);
  return parts;
}

/**
 * Lines that are usually parsing artifacts, not purchasable items (cost + display).
 */
export function isIngredientLineNoise(name: string): boolean {
  const key = normalizeIngredientToken(name);
  if (!key || key.length < 2) return true;
  if (/^[\)\(,.\-]+$/.test(key)) return true;
  if (key.length <= 3 && !/^[a-z]{2,3}$/i.test(key)) return true;

  const noise = [
    /^to taste$/,
    /^for serving$/,
    /^optional$/,
    /^as needed$/,
    /^finely chopped$/,
    /^roughly chopped$/,
    /^pitted and diced$/,
    /^peeled and diced$/,
    /^chopped\)?$/,
    /^\)?$/,
    /^diced$/,
    /^sliced$/,
    /^minced$/,
    /^grated$/,
    /^crumbled$/,
    /^halved$/,
  ];
  return noise.some((re) => re.test(key));
}

/** Escape `%`, `_`, and `\` for use inside PostgreSQL ILIKE patterns wrapped with `%`. */
export function escapeIlikePercentPattern(token: string): string {
  return token
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

/** Strip leading amounts/units so pantry tokens align with canonical `ingredients.name`. */
export function stripIngredientQuantityPrefix(raw: string): string {
  let t = raw.trim();
  for (let i = 0; i < 8; i++) {
    const before = t;
    t = t.replace(/^[\s]*[\u00BC-\u00BE\u2150-\u215E]\s*/u, "");
    t = t.replace(
      /^\s*(?:\d+(?:\/\d+)?(?:\.\d+)?(?:\s*-\s*\d+(?:\/\d+)?)?)\s*/u,
      "",
    );
    t = t.replace(
      /^\s*(?:(?:cup|cups|c\.|tbsp|tbs\.?|tsp|ts\.|tablespoons?|teaspoons?|ounces?|oz\.?|lb\.?|lbs\.?|pounds?|grams?|g\b|kg\.?|ml\b|m[lL]\b|liter|liters|litre|litres)\b\.?)\s*/iu,
      "",
    );
    if (t === before) break;
  }
  return t.trim();
}

/** Strip trailing optional price (e.g. `| $16`, `@ $16.99`, `($12)`). */
export function parseIngredientLinePriceCents(raw: string): {
  lineWithoutPrice: string;
  priceCents: number | null;
} {
  let line = raw.trim();
  let priceCents: number | null = null;

  const patterns = [
    /\s*[\|\-–—@]\s*\$?\s*(\d+(?:\.\d{1,2})?)\s*$/,
    /\s*\(\s*\$?\s*(\d+(?:\.\d{1,2})?)\s*\)\s*$/,
    /\s+\$\s*(\d+(?:\.\d{1,2})?)\s*$/,
  ] as const;

  for (const re of patterns) {
    const m = line.match(re);
    if (!m || m.index == null) continue;
    const dollars = Number.parseFloat(m[1]!);
    if (!Number.isFinite(dollars) || dollars < 0 || dollars > 9999) continue;
    priceCents = Math.round(dollars * 100);
    line = line.slice(0, m.index).trim();
    break;
  }

  return { lineWithoutPrice: line, priceCents };
}

/** Quantity text before the canonical ingredient name (for display / cost). */
export function ingredientQuantityFromRaw(raw: string): string | null {
  const t = raw.trim();
  const stripped = stripIngredientQuantityPrefix(t);
  if (stripped === t) return null;
  const qty = t.slice(0, t.length - stripped.length).trim().replace(/[,|@\-–—]+$/u, "").trim();
  return qty || null;
}

/** Rebuild a recipe-ingredients textarea line (quantity + name + optional price). */
export function formatIngredientLineForRecipeInput(args: {
  name: string;
  quantity?: string | null;
  priceCents?: number | null;
}): string {
  const name = args.name.trim();
  const qty = args.quantity?.trim();
  let line = qty ? `${qty} ${name}` : name;
  const cents = args.priceCents;
  if (cents != null && cents > 0) {
    const dollars =
      cents % 100 === 0
        ? String(cents / 100)
        : (cents / 100).toFixed(2).replace(/\.?0+$/, "");
    line = `${line} | $${dollars}`;
  }
  return line;
}

/** Canonical name for database rows — same normalization Help Me Cook matches on. */
export function ingredientCanonicalName(rawLine: string): string {
  const { lineWithoutPrice } = parseIngredientLinePriceCents(rawLine);
  const stripped = stripIngredientQuantityPrefix(lineWithoutPrice);
  const fromStripped = normalizeIngredientToken(stripped);
  if (fromStripped) return fromStripped;
  return normalizeIngredientToken(lineWithoutPrice);
}

/**
 * Split user ingredient input into lines for recipe save / pantry overlap.
 * Dedupes by canonical name; preserves first-seen order for sort_order.
 */
export function parseIngredientLinesForRecipe(text: string): {
  raw: string;
  canonical: string;
  quantity: string | null;
  priceCents: number | null;
}[] {
  const parts = splitRecipeIngredientInput(text);
  const seen = new Set<string>();
  const out: {
    raw: string;
    canonical: string;
    quantity: string | null;
    priceCents: number | null;
  }[] = [];
  for (const raw of parts) {
    const { lineWithoutPrice, priceCents } = parseIngredientLinePriceCents(raw);
    const canonical = ingredientCanonicalName(raw);
    if (!canonical || seen.has(canonical) || isIngredientLineNoise(canonical)) {
      continue;
    }
    seen.add(canonical);
    out.push({
      raw,
      canonical,
      quantity: ingredientQuantityFromRaw(lineWithoutPrice),
      priceCents,
    });
  }
  return out;
}

/** Split user textarea into normalized unique ingredient names. */
export function parseIngredientInput(text: string): string[] {
  const parts = text
    .split(/[\n,;]+/)
    .map((p) => normalizeIngredientToken(p))
    .filter(Boolean);
  return [...new Set(parts)];
}

/** Merge normalized unique tokens; earlier groups win ordering. */
export function mergeIngredientTokens(...groups: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const g of groups) {
    for (const t of g) {
      const k = t.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(t);
    }
  }
  return out;
}
