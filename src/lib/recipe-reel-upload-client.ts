import type { SupabaseClient } from "@supabase/supabase-js";

import {
  RECIPE_REEL_BUCKET,
  recipeReelStorageExtensionFromMime,
  validateRecipeReelDurationSeconds,
  validateRecipeReelFile,
} from "@/lib/recipe-reel";
import {
  measureVideoFileDurationSeconds,
  validateRecipeReelFileDuration,
} from "@/lib/recipe-reel-duration-client";
import {
  type StorageUploadProgress,
  uploadStorageObjectWithProgress,
} from "@/lib/supabase/storage-upload-with-progress";

const REEL_UPLOAD_ERROR =
  "Could not upload your reel. Check the file and try again.";

/** Browser-only: upload one reel file and set hidden form fields for the server action. */
export async function attachHostedReelToFormData(args: {
  supabase: SupabaseClient;
  userId: string;
  file: File | null;
  formData: FormData;
  knownDurationSeconds?: number | null;
  onUploadProgress?: (progress: StorageUploadProgress) => void;
}): Promise<string | null> {
  const { supabase, userId, file, formData, knownDurationSeconds, onUploadProgress } =
    args;
  formData.delete("hosted_reel_url");
  formData.delete("hosted_reel_object_path");
  formData.delete("hosted_reel_duration_seconds");

  if (!file || file.size <= 0) {
    return null;
  }

  let durationSeconds = knownDurationSeconds ?? null;
  if (durationSeconds == null) {
    const durationErr = await validateRecipeReelFileDuration(file);
    if (durationErr) {
      return durationErr;
    }
    durationSeconds = await measureVideoFileDurationSeconds(file);
  } else {
    const durationErr = validateRecipeReelDurationSeconds(durationSeconds);
    if (durationErr) {
      return durationErr;
    }
  }

  const mimeErr = validateRecipeReelFile(file, durationSeconds);
  if (mimeErr) {
    return mimeErr;
  }

  const ext = recipeReelStorageExtensionFromMime(file.type);
  if (!ext) {
    return "Reels must be MP4, MOV, or WebM.";
  }

  const objectPath = `${userId}/${crypto.randomUUID()}.${ext}`;
  const uploadResult = await uploadStorageObjectWithProgress({
    supabase,
    bucket: RECIPE_REEL_BUCKET,
    objectPath,
    file,
    cacheControl: "public, max-age=31536000, immutable",
    onProgress: onUploadProgress,
  });

  if (!uploadResult.ok) {
    return uploadResult.message || REEL_UPLOAD_ERROR;
  }

  const { data: pub } = supabase.storage
    .from(RECIPE_REEL_BUCKET)
    .getPublicUrl(objectPath);

  formData.set("hosted_reel_url", pub.publicUrl);
  formData.set("hosted_reel_object_path", objectPath);
  formData.set("hosted_reel_duration_seconds", String(durationSeconds));
  return null;
}
