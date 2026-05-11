/** Extract YouTube embed ID from common URL shapes; returns null if not recognized. */
export function parseYoutubeVideoId(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const u = raw.trim();
  try {
    const url = new URL(u.startsWith("http") ? u : `https://${u}`);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.replace(/^\//, "").split("/")[0];
      return id || null;
    }
    if (host.endsWith("youtube.com")) {
      if (url.pathname.startsWith("/watch")) {
        return url.searchParams.get("v");
      }
      if (url.pathname.startsWith("/embed/")) {
        return url.pathname.split("/")[2] ?? null;
      }
      if (url.pathname.startsWith("/shorts/")) {
        return url.pathname.split("/")[2] ?? null;
      }
    }
  } catch {
    return null;
  }
  return null;
}
