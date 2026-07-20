import {
  RECIPE_REEL_MAX_DURATION_SECONDS,
  validateRecipeReelDurationSeconds,
} from "@/lib/recipe-reel";

/** Read duration from a local video file (browser only). */
export function measureVideoFileDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    };

    video.onloadedmetadata = () => {
      const duration = video.duration;
      cleanup();
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error("invalid_duration"));
        return;
      }
      resolve(duration);
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("metadata_error"));
    };

    video.src = objectUrl;
  });
}

export async function validateRecipeReelFileDuration(
  file: File,
): Promise<string | null> {
  try {
    const seconds = await measureVideoFileDurationSeconds(file);
    return validateRecipeReelDurationSeconds(seconds);
  } catch {
    return "Could not read reel length. Try MP4 or re-export the video.";
  }
}

export function formatReelMaxDurationLabel(): string {
  const minutes = RECIPE_REEL_MAX_DURATION_SECONDS / 60;
  return `${minutes} min`;
}
