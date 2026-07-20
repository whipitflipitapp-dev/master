import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeSupabaseProjectUrl } from "@/lib/supabase/project-url";

export type StorageUploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

type UploadResult = { ok: true } | { ok: false; message: string };

/**
 * Supabase Storage upload with XMLHttpRequest so we can report byte progress in the browser.
 * Matches the FormData shape used by supabase-js for Blob uploads.
 */
export async function uploadStorageObjectWithProgress(args: {
  supabase: SupabaseClient;
  bucket: string;
  objectPath: string;
  file: File;
  cacheControl?: string;
  onProgress?: (progress: StorageUploadProgress) => void;
}): Promise<UploadResult> {
  const projectUrl = normalizeSupabaseProjectUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  );
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!projectUrl || !anonKey) {
    return { ok: false, message: "Upload is not configured." };
  }

  const {
    data: { session },
  } = await args.supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) {
    return { ok: false, message: "Sign in required to upload." };
  }

  const cacheControl = args.cacheControl ?? "3600";
  const url = `${projectUrl}/storage/v1/object/${args.bucket}/${args.objectPath}`;

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", anonKey);
    xhr.setRequestHeader("x-upsert", "false");

    xhr.upload.onprogress = (event) => {
      if (!args.onProgress) return;
      if (event.lengthComputable && event.total > 0) {
        args.onProgress({
          loaded: event.loaded,
          total: event.total,
          percent: Math.min(100, Math.round((event.loaded / event.total) * 100)),
        });
      } else {
        args.onProgress({
          loaded: event.loaded,
          total: 0,
          percent: 0,
        });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        args.onProgress?.({ loaded: args.file.size, total: args.file.size, percent: 100 });
        resolve({ ok: true });
        return;
      }
      resolve({
        ok: false,
        message: "Upload failed. Check your connection and try again.",
      });
    };

    xhr.onerror = () => {
      resolve({
        ok: false,
        message: "Upload failed. Check your connection and try again.",
      });
    };

    xhr.onabort = () => {
      resolve({
        ok: false,
        message: "Upload was cancelled.",
      });
    };

    const body = new FormData();
    body.append("cacheControl", cacheControl);
    body.append("", args.file);
    xhr.send(body);
  });
}

/** Weighted progress across multiple files (by byte size). */
export function combineUploadProgress(args: {
  fileSizes: number[];
  fileIndex: number;
  fileProgress: StorageUploadProgress;
}): number {
  const { fileSizes, fileIndex, fileProgress } = args;
  const total = fileSizes.reduce((sum, n) => sum + n, 0);
  if (total <= 0) return fileProgress.percent;

  let completed = 0;
  for (let i = 0; i < fileIndex; i++) {
    completed += fileSizes[i] ?? 0;
  }
  const currentLoaded =
    fileProgress.total > 0
      ? Math.min(fileProgress.loaded, fileProgress.total)
      : (fileSizes[fileIndex] ?? 0) * (fileProgress.percent / 100);

  return Math.min(100, Math.round(((completed + currentLoaded) / total) * 100));
}
