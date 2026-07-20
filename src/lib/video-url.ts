import { parseYoutubeVideoId } from "@/lib/youtube";

export const RECIPE_VIDEO_URL_MAX = 2048;

export type RecipeVideoProvider = "youtube" | "instagram";

/** Homepage Reels strip item (poster links to recipe detail). */
export type HomeInstagramReelItem = {
  recipeId: string;
  title: string;
  imageUrl: string | null;
  permalink: string;
  createdAt: string;
};

export type ParsedInstagramPermalink = {
  type: "reel" | "p" | "tv";
  shortcode: string;
  /** Canonical permalink suitable for storage and embeds. */
  permalink: string;
  /** Instagram embed iframe path (no query). */
  embedSrc: string;
};

export type ParsedRecipeVideo =
  | {
      provider: "youtube";
      canonicalUrl: string;
      youtubeId: string;
    }
  | {
      provider: "instagram";
      canonicalUrl: string;
      instagram: ParsedInstagramPermalink;
    };

const INSTAGRAM_HOSTS = new Set([
  "instagram.com",
  "www.instagram.com",
  "instagr.am",
  "www.instagr.am",
]);

const INSTAGRAM_PATH = /^\/(reel|p|tv)\/([A-Za-z0-9_-]+)\/?$/i;

/** Normalize + validate an Instagram Reel, Post, or TV permalink. */
export function parseInstagramPermalink(
  raw: string | null | undefined,
): ParsedInstagramPermalink | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  if (trimmed.length > RECIPE_VIDEO_URL_MAX) return null;

  try {
    const url = new URL(
      trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
    );
    const host = url.hostname.toLowerCase();
    if (!INSTAGRAM_HOSTS.has(host) && !host.endsWith(".instagram.com")) {
      return null;
    }

    const match = INSTAGRAM_PATH.exec(url.pathname);
    if (!match) return null;

    const type = match[1]!.toLowerCase() as "reel" | "p" | "tv";
    const shortcode = match[2]!;
    if (!shortcode || shortcode.length > 64) return null;

    const permalink = `https://www.instagram.com/${type}/${shortcode}/`;
    const embedPath =
      type === "reel"
        ? `reel/${shortcode}/embed/captioned/`
        : `${type}/${shortcode}/embed`;
    return {
      type,
      shortcode,
      permalink,
      embedSrc: `https://www.instagram.com/${embedPath}`,
    };
  } catch {
    return null;
  }
}

/** True when video_url is an Instagram Reel permalink (matches browse RPC boost). */
export function isInstagramReelVideoUrl(
  raw: string | null | undefined,
): boolean {
  if (!raw?.trim()) return false;
  return /instagram\.com\/reel\//i.test(raw.trim());
}

/** Query params that encourage muted in-frame playback (best-effort; Instagram policy applies). */
export function buildInstagramEmbedIframeSrc(embedSrc: string): string {
  try {
    const url = new URL(embedSrc);
    url.searchParams.set("autoplay", "1");
    url.searchParams.set("mute", "1");
    url.searchParams.set("playsinline", "1");
    url.searchParams.set("embed_type", "video");
    return url.toString();
  } catch {
    const sep = embedSrc.includes("?") ? "&" : "?";
    return `${embedSrc}${sep}autoplay=1&mute=1&playsinline=1`;
  }
}

/** Detect YouTube or Instagram from a recipe video_url value. */
export function parseRecipeVideoUrl(
  raw: string | null | undefined,
): ParsedRecipeVideo | null {
  if (!raw?.trim()) return null;
  if (raw.trim().length > RECIPE_VIDEO_URL_MAX) return null;

  const youtubeId = parseYoutubeVideoId(raw);
  if (youtubeId) {
    return {
      provider: "youtube",
      canonicalUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
      youtubeId,
    };
  }

  const instagram = parseInstagramPermalink(raw);
  if (instagram) {
    return {
      provider: "instagram",
      canonicalUrl: instagram.permalink,
      instagram,
    };
  }

  return null;
}

/**
 * Server-side normalize for create/update. Empty → null.
 * Invalid non-empty → error message.
 */
export function normalizeRecipeVideoUrlInput(
  raw: string,
): { ok: true; video_url: string | null } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, video_url: null };
  }
  if (trimmed.length > RECIPE_VIDEO_URL_MAX) {
    return { ok: false, error: "Video URL is too long." };
  }
  const parsed = parseRecipeVideoUrl(trimmed);
  if (!parsed) {
    return {
      ok: false,
      error: "Paste a YouTube watch link (youtube.com or youtu.be).",
    };
  }
  if (parsed.provider === "instagram") {
    return {
      ok: false,
      error:
        "Instagram links are not embedded anymore. Pro members can upload a reel (max 3 minutes) on the recipe form.",
    };
  }
  return { ok: true, video_url: parsed.canonicalUrl };
}

/** YouTube hqdefault thumbnail when a recipe has no cover image. */
export function youtubeThumbnailUrl(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

/**
 * Resolve list-card preview image: recipe cover first, else YouTube thumb.
 * Instagram has no stable public thumbnail URL without oEmbed auth — callers
 * should fall back to a poster + play affordance.
 */
export function resolveRecipeCardPreviewImage(args: {
  imageUrl: string | null | undefined;
  videoUrl: string | null | undefined;
}): {
  imageUrl: string | null;
  hasVideo: boolean;
  provider: RecipeVideoProvider | null;
} {
  const parsed = parseRecipeVideoUrl(args.videoUrl);
  const cover =
    typeof args.imageUrl === "string" && args.imageUrl.trim().length > 0
      ? args.imageUrl.trim()
      : null;

  if (cover) {
    return {
      imageUrl: cover,
      hasVideo: parsed != null,
      provider: parsed?.provider ?? null,
    };
  }

  if (parsed?.provider === "youtube") {
    return {
      imageUrl: youtubeThumbnailUrl(parsed.youtubeId),
      hasVideo: true,
      provider: "youtube",
    };
  }

  return {
    imageUrl: null,
    hasVideo: parsed != null,
    provider: parsed?.provider ?? null,
  };
}
