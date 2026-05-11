/**
 * Supabase clients expect the **project origin** (e.g. https://xyz.supabase.co).
 * If `NEXT_PUBLIC_SUPABASE_URL` mistakenly includes `/rest/v1`, requests become
 * `/rest/v1/rest/v1/...` and the API may respond with "Invalid path specified in request URL".
 */
export function normalizeSupabaseProjectUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  try {
    const u = new URL(trimmed);
    const path = (u.pathname || "").replace(/\/+$/, "") || "";
    if (path === "/rest/v1" || path.endsWith("/rest/v1")) {
      return u.origin;
    }
  } catch {
    /* keep trimmed */
  }
  return trimmed;
}
