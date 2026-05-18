export const RECIPE_IMAGE_BUCKET = "recipe-images";

export const RECIPE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const RECIPE_IMAGE_ACCEPT = "image/png,image/jpeg";

const ALLOWED_MIMES = new Set(["image/png", "image/jpeg"]);

/** Lowercase suffix after last dot (no leading dot). */
function extensionFromFileName(fileName: string): string | null {
  const i = fileName.lastIndexOf(".");
  if (i < 0 || i === fileName.length - 1) return null;
  return fileName.slice(i + 1).toLowerCase();
}

const DISALLOWED_EXT = /\.(gif|webp|bmp|tif|tiff|svg|heic|heif|avif|mp4|webm|mov|m4v|mkv)(\?.*)?$/i;

export function isAllowedRecipeImageExtension(ext: string | null): ext is "png" | "jpg" | "jpeg" {
  return ext === "png" || ext === "jpg" || ext === "jpeg";
}

export function recipeStorageExtensionFromMime(mimeType: string): "png" | "jpg" | null {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpg";
  return null;
}

/**
 * Validates file metadata for recipe cover uploads (PNG/JPEG only).
 * Call from the browser before uploading; call from servers if a route accepts `File`.
 */
export function validateRecipeImageUploadMeta(meta: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}): string | null {
  if (meta.sizeBytes > RECIPE_IMAGE_MAX_BYTES) {
    return "Image must be 5MB or smaller.";
  }
  if (!ALLOWED_MIMES.has(meta.mimeType)) {
    return "Only PNG or JPEG images are allowed.";
  }
  const ext = extensionFromFileName(meta.fileName);
  if (!isAllowedRecipeImageExtension(ext)) {
    return "File extension must be .png, .jpg, or .jpeg.";
  }
  const base = meta.fileName.split(/[/\\]/).pop()?.toLowerCase() ?? "";
  if (DISALLOWED_EXT.test(base)) {
    return "GIF, WebP, and video files are not allowed.";
  }
  return null;
}

export function validateRecipeImageFile(file: File): string | null {
  return validateRecipeImageUploadMeta({
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  });
}

export function validateRecipeImageObjectPath(args: {
  objectPathRaw: string | null | undefined;
  userId: string;
}):
  | { ok: true; objectPath: string | null }
  | { ok: false; message: string } {
  const objectPath = args.objectPathRaw?.trim();
  if (!objectPath) {
    return { ok: true, objectPath: null };
  }

  if (
    objectPath.includes("..")
    || objectPath.includes("//")
    || objectPath.includes("\\")
    || DISALLOWED_EXT.test(objectPath)
  ) {
    return { ok: false, message: "Invalid recipe image path." };
  }

  const firstSlash = objectPath.indexOf("/");
  if (firstSlash < 0) {
    return { ok: false, message: "Recipe images must live under your user folder." };
  }

  const folder = objectPath.slice(0, firstSlash);
  if (folder !== args.userId) {
    return { ok: false, message: "Recipe image must belong to your upload folder." };
  }

  const rest = objectPath.slice(firstSlash + 1);
  if (!rest) {
    return { ok: false, message: "Invalid recipe image path." };
  }

  const ext = extensionFromFileName(rest);
  if (!isAllowedRecipeImageExtension(ext)) {
    return { ok: false, message: "Recipe image must be PNG or JPEG." };
  }

  return { ok: true, objectPath };
}

/** Public object URL segment after hostname for our bucket */
const storagePublicPathRegex = /^\/storage\/v1\/object\/public\/recipe-images\/([^?#]+)$/;

/**
 * Validates that `imageUrl` points at `recipe-images` on this project's Supabase host and
 * at `userId/...(.png|.jpg|.jpeg)`. Rejects `data:` blobs; optional production-only strictness elsewhere.
 */
export function validateStoredRecipeImageUrl(args: {
  imageUrlRaw: string | null | undefined;
  userId: string;
  supabaseProjectOrigin: string;
  rejectPlainDataUrls: boolean;
}):
  | { ok: true; url: string | null }
  | { ok: true; url: string; objectPath: string }
  | { ok: false; message: string } {
  const trimmed = args.imageUrlRaw?.trim();
  if (!trimmed) {
    return { ok: true, url: null };
  }

  if (args.rejectPlainDataUrls && trimmed.toLowerCase().startsWith("data:")) {
    return {
      ok: false,
      message: "Recipe images cannot use embedded data URLs. Upload a PNG or JPEG to storage.",
    };
  }

  let img: URL;
  try {
    img = new URL(trimmed);
  } catch {
    return { ok: false, message: "Invalid recipe image URL." };
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(args.supabaseProjectOrigin);
  } catch {
    return { ok: false, message: "Invalid Supabase configuration." };
  }

  if (img.origin !== baseUrl.origin) {
    return {
      ok: false,
      message: "Recipe image URL must come from this app’s Supabase storage.",
    };
  }

  const m = storagePublicPathRegex.exec(img.pathname);
  if (!m) {
    return {
      ok: false,
      message: "Recipe image URL must point to the recipe-images bucket.",
    };
  }

  const pathCheck = validateRecipeImageObjectPath({
    objectPathRaw: decodeURIComponent(m[1]),
    userId: args.userId,
  });
  if (!pathCheck.ok) {
    return pathCheck;
  }

  return { ok: true, url: trimmed, objectPath: pathCheck.objectPath! };
}
