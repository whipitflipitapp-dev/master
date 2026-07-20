export const RECIPE_REEL_BUCKET = "recipe-videos";

/** Max reel length (matches client probe + server form field). */
export const RECIPE_REEL_MAX_DURATION_SECONDS = 3 * 60;

/** ~50 MiB — aligns with Supabase bucket limit; keeps storage and mobile loads reasonable. */
export const RECIPE_REEL_MAX_BYTES = 50 * 1024 * 1024;

export const RECIPE_REEL_ACCEPT = "video/mp4,video/quicktime,video/webm";

const ALLOWED_MIMES = new Set(["video/mp4", "video/quicktime", "video/webm"]);

function extensionFromFileName(fileName: string): string | null {
  const i = fileName.lastIndexOf(".");
  if (i < 0 || i === fileName.length - 1) return null;
  return fileName.slice(i + 1).toLowerCase();
}

export function isAllowedRecipeReelExtension(
  ext: string | null,
): ext is "mp4" | "mov" | "webm" {
  return ext === "mp4" || ext === "mov" || ext === "webm";
}

export function recipeReelStorageExtensionFromMime(
  mimeType: string,
): "mp4" | "mov" | "webm" | null {
  if (mimeType === "video/mp4") return "mp4";
  if (mimeType === "video/quicktime") return "mov";
  if (mimeType === "video/webm") return "webm";
  return null;
}

export function validateRecipeReelDurationSeconds(
  durationSeconds: number,
): string | null {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return "Could not read reel length. Try another file.";
  }
  if (durationSeconds > RECIPE_REEL_MAX_DURATION_SECONDS) {
    return "Reels must be 3 minutes or shorter.";
  }
  return null;
}

export function validateRecipeReelUploadMeta(meta: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds?: number | null;
}): string | null {
  if (meta.sizeBytes > RECIPE_REEL_MAX_BYTES) {
    return "Reel must be 50MB or smaller.";
  }
  if (!ALLOWED_MIMES.has(meta.mimeType)) {
    return "Reels must be MP4, MOV, or WebM.";
  }
  const ext = extensionFromFileName(meta.fileName);
  if (!isAllowedRecipeReelExtension(ext)) {
    return "File extension must be .mp4, .mov, or .webm.";
  }
  if (meta.durationSeconds != null) {
    const durationErr = validateRecipeReelDurationSeconds(meta.durationSeconds);
    if (durationErr) return durationErr;
  }
  return null;
}

export function validateRecipeReelFile(
  file: File,
  durationSeconds?: number | null,
): string | null {
  return validateRecipeReelUploadMeta({
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    durationSeconds,
  });
}

const storagePublicPathRegex =
  /^\/storage\/v1\/object\/public\/recipe-videos\/([^?#]+)$/;

export function validateStoredRecipeReelUrl(args: {
  reelUrlRaw: string | null | undefined;
  objectPathRaw: string | null | undefined;
  userId: string;
  supabaseProjectOrigin: string;
}):
  | { ok: true; url: null; objectPath: null }
  | { ok: true; url: string; objectPath: string }
  | { ok: false; message: string } {
  const trimmedUrl = args.reelUrlRaw?.trim();
  const trimmedPath = args.objectPathRaw?.trim();
  if (!trimmedUrl && !trimmedPath) {
    return { ok: true, url: null, objectPath: null };
  }
  if (!trimmedUrl || !trimmedPath) {
    return { ok: false, message: "Reel upload metadata is incomplete." };
  }

  let reelUrl: URL;
  try {
    reelUrl = new URL(trimmedUrl);
  } catch {
    return { ok: false, message: "Invalid reel URL." };
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(args.supabaseProjectOrigin);
  } catch {
    return { ok: false, message: "Invalid Supabase configuration." };
  }

  if (reelUrl.origin !== baseUrl.origin) {
    return {
      ok: false,
      message: "Reel URL must come from this app’s Supabase storage.",
    };
  }

  const m = storagePublicPathRegex.exec(reelUrl.pathname);
  if (!m) {
    return {
      ok: false,
      message: "Reel URL must point to the recipe-videos bucket.",
    };
  }

  const objectPath = decodeURIComponent(m[1]);
  if (objectPath !== trimmedPath) {
    return { ok: false, message: "Reel URL does not match the uploaded file." };
  }

  if (
    objectPath.includes("..")
    || objectPath.includes("//")
    || objectPath.includes("\\")
  ) {
    return { ok: false, message: "Invalid reel path." };
  }

  const firstSlash = objectPath.indexOf("/");
  if (firstSlash < 0) {
    return { ok: false, message: "Reels must live under your user folder." };
  }

  const folder = objectPath.slice(0, firstSlash);
  if (folder !== args.userId) {
    return { ok: false, message: "Reel must belong to your upload folder." };
  }

  const ext = extensionFromFileName(objectPath.slice(firstSlash + 1));
  if (!isAllowedRecipeReelExtension(ext)) {
    return { ok: false, message: "Reel must be MP4, MOV, or WebM." };
  }

  return { ok: true, url: trimmedUrl, objectPath: trimmedPath };
}

export function parseHostedReelDurationFormField(raw: unknown): number | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const n = Number(text);
  if (!Number.isFinite(n)) return null;
  return n;
}

export const HOSTED_REEL_PLAN_REQUIRED_ERROR =
  "Uploading a recipe reel requires Pro or AI Chef.";

export const HOSTED_REEL_DURATION_REQUIRED_ERROR =
  "Reel length must be verified before upload. Re-select your file.";
