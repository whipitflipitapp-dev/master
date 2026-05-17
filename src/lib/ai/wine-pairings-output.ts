const MAX_WINE_TYPE = 80;
const MAX_WINE_NAME = 120;
const MAX_DESCRIPTION = 500;
const MAX_NOTES = 240;
const MAX_PAIRINGS = 3;

export type WinePairingGenerated = {
  wine_type: string;
  wine_name: string | null;
  description: string;
  notes: string | null;
  purchase_url: string | null;
};

function clip(s: string, max: number): string {
  const t = s.trim();
  return t.length <= max ? t : t.slice(0, max);
}

function optionalClip(v: unknown, max: number): string | null {
  if (v == null) {
    return null;
  }
  const t = clip(String(v), max);
  return t.length > 0 ? t : null;
}

export function coerceWinePairingsResponse(parsed: unknown): WinePairingGenerated[] | null {
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const raw = (parsed as Record<string, unknown>).pairings;
  if (!Array.isArray(raw) || raw.length === 0) {
    return null;
  }
  const out: WinePairingGenerated[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const o = item as Record<string, unknown>;
    const wine_type = clip(String(o.wine_type ?? ""), MAX_WINE_TYPE);
    if (!wine_type) {
      continue;
    }
    const description = clip(String(o.description ?? ""), MAX_DESCRIPTION);
    if (!description) {
      continue;
    }
    out.push({
      wine_type,
      wine_name: optionalClip(o.wine_name, MAX_WINE_NAME),
      description,
      notes: optionalClip(o.notes, MAX_NOTES),
      purchase_url: null,
    });
    if (out.length >= MAX_PAIRINGS) {
      break;
    }
  }
  return out.length > 0 ? out : null;
}

export function sanitizeWinePairings(
  pairings: WinePairingGenerated[],
): WinePairingGenerated[] {
  return pairings.map((p) => ({
    wine_type: clip(p.wine_type, MAX_WINE_TYPE),
    wine_name: p.wine_name ? clip(p.wine_name, MAX_WINE_NAME) : null,
    description: clip(p.description, MAX_DESCRIPTION),
    notes: p.notes ? clip(p.notes, MAX_NOTES) : null,
    purchase_url: null,
  }));
}
