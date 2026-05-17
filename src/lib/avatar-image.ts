export const AVATAR_IMAGE_BUCKET = "avatars";

export const AVATAR_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export const AVATAR_IMAGE_ACCEPT = "image/png,image/jpeg";

const ALLOWED_MIMES = new Set(["image/png", "image/jpeg"]);

function extensionFromFileName(fileName: string): string | null {
  const i = fileName.lastIndexOf(".");
  if (i < 0 || i === fileName.length - 1) return null;
  return fileName.slice(i + 1).toLowerCase();
}

const DISALLOWED_EXT =
  /\.(gif|webp|bmp|tif|tiff|svg|heic|heif|avif|mp4|webm|mov|m4v|mkv)(\?.*)?$/i;

export function isAllowedAvatarImageExtension(
  ext: string | null,
): ext is "png" | "jpg" | "jpeg" {
  return ext === "png" || ext === "jpg" || ext === "jpeg";
}

export function avatarStorageExtensionFromMime(
  mimeType: string,
): "png" | "jpg" | null {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpg";
  return null;
}

export function validateAvatarImageFile(file: File): string | null {
  if (file.size > AVATAR_IMAGE_MAX_BYTES) {
    return "Photo must be 2MB or smaller.";
  }
  if (!ALLOWED_MIMES.has(file.type)) {
    return "Only PNG or JPEG images are allowed.";
  }
  const ext = extensionFromFileName(file.name);
  if (!isAllowedAvatarImageExtension(ext)) {
    return "File extension must be .png, .jpg, or .jpeg.";
  }
  const base = file.name.split(/[/\\]/).pop()?.toLowerCase() ?? "";
  if (DISALLOWED_EXT.test(base)) {
    return "GIF, WebP, and video files are not allowed.";
  }
  return null;
}

const storagePublicPathRegex =
  /^\/storage\/v1\/object\/public\/avatars\/([^?#]+)$/;

export function validateStoredAvatarUrl(args: {
  avatarUrlRaw: string | null | undefined;
  userId: string;
  supabaseProjectOrigin: string;
  rejectPlainDataUrls: boolean;
}):
  | { ok: true; url: string | null }
  | { ok: false; message: string } {
  const trimmed = args.avatarUrlRaw?.trim();
  if (!trimmed) {
    return { ok: true, url: null };
  }

  if (args.rejectPlainDataUrls && trimmed.toLowerCase().startsWith("data:")) {
    return {
      ok: false,
      message:
        "Profile photos cannot use embedded data URLs. Upload a PNG or JPEG to storage.",
    };
  }

  let img: URL;
  try {
    img = new URL(trimmed);
  } catch {
    return { ok: false, message: "Invalid profile photo URL." };
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
      message: "Profile photo URL must come from this app’s Supabase storage.",
    };
  }

  const m = storagePublicPathRegex.exec(img.pathname);
  if (!m) {
    return {
      ok: false,
      message: "Profile photo URL must point to the avatars bucket.",
    };
  }

  const objectPath = decodeURIComponent(m[1]);
  if (
    objectPath.includes("..")
    || objectPath.includes("//")
    || objectPath.includes("\\")
    || DISALLOWED_EXT.test(objectPath)
  ) {
    return { ok: false, message: "Invalid profile photo path." };
  }

  const firstSlash = objectPath.indexOf("/");
  if (firstSlash < 0) {
    return {
      ok: false,
      message: "Profile photos must live under your user folder.",
    };
  }

  const folder = objectPath.slice(0, firstSlash);
  if (folder !== args.userId) {
    return {
      ok: false,
      message: "Profile photo must belong to your upload folder.",
    };
  }

  const rest = objectPath.slice(firstSlash + 1);
  if (!rest) {
    return { ok: false, message: "Invalid profile photo path." };
  }

  const ext = extensionFromFileName(rest);
  if (!isAllowedAvatarImageExtension(ext)) {
    return { ok: false, message: "Profile photo must be PNG or JPEG." };
  }

  return { ok: true, url: trimmed };
}
