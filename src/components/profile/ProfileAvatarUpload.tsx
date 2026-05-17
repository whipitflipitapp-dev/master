"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { updateAvatarUrl } from "@/app/actions/profile";
import {
  AVATAR_IMAGE_ACCEPT,
  AVATAR_IMAGE_BUCKET,
  avatarStorageExtensionFromMime,
  validateAvatarImageFile,
} from "@/lib/avatar-image";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function ProfileAvatarUpload({
  currentAvatarUrl,
  displayName,
  labels,
}: {
  currentAvatarUrl: string | null;
  displayName: string;
  labels: {
    heading: string;
    intro: string;
    choosePhoto: string;
    removePhoto: string;
    saving: string;
    savePhoto: string;
  };
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const displayPreview = preview ?? currentAvatarUrl;

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  async function handleSave() {
    setError(null);
    setBusy(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) {
        setError("Sign in required.");
        return;
      }

      if (!file) {
        setError("Choose a PNG or JPEG photo first.");
        return;
      }

      const mimeErr = validateAvatarImageFile(file);
      if (mimeErr) {
        setError(mimeErr);
        return;
      }

      const ext = avatarStorageExtensionFromMime(file.type);
      if (!ext) {
        setError("Only PNG or JPEG images are allowed.");
        return;
      }

      const objectPath = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_IMAGE_BUCKET)
        .upload(objectPath, file, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const { data: pub } = supabase.storage
        .from(AVATAR_IMAGE_BUCKET)
        .getPublicUrl(objectPath);

      const result = await updateAvatarUrl(pub.publicUrl);
      if (result.error) {
        setError(result.error);
        return;
      }

      setFile(null);
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
      setPreview(pub.publicUrl);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setBusy(true);
    try {
      const result = await updateAvatarUrl(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      setFile(null);
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
      setPreview(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function onFileChange(ev: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const next = ev.target.files?.[0] ?? null;
    setFile(next);
    if (preview?.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
    if (next) {
      setPreview(URL.createObjectURL(next));
    } else {
      setPreview(null);
    }
  }

  const initials =
    displayName.trim().slice(0, 1).toUpperCase() || "👨‍🍳";

  return (
    <section
      className="mt-4 border-t border-[var(--border)] pt-4"
      aria-labelledby="profile-avatar-heading"
    >
      <h3
        id="profile-avatar-heading"
        className="text-[length:var(--text-meta)] font-semibold text-[var(--text)]"
      >
        {labels.heading}
      </h3>
      <p className="mt-1 text-[length:var(--text-caption)] leading-relaxed text-[var(--muted)]">
        {labels.intro}
      </p>

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_88%,var(--bg))] shadow-[var(--shadow-card)]">
          {displayPreview ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob or Supabase avatar URL
            <img
              src={displayPreview}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span
              className="flex h-full w-full items-center justify-center text-3xl text-[var(--muted)]"
              aria-hidden
            >
              {initials.length === 1 && /[A-Z]/i.test(initials) ? initials : "👨‍🍳"}
            </span>
          )}
        </div>

        <div className="flex w-full min-w-0 flex-1 flex-col gap-2">
          <label className="text-[length:var(--text-caption)] font-medium text-[var(--text)]">
            <span className="sr-only">{labels.choosePhoto}</span>
            <input
              type="file"
              accept={AVATAR_IMAGE_ACCEPT}
              disabled={busy}
              onChange={onFileChange}
              className="block w-full max-w-full text-[length:var(--text-caption)] text-[var(--muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--primary-muted)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--primary)]"
            />
          </label>

          {error ? (
            <p className="text-xs font-medium text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !file}
              onClick={() => void handleSave()}
              className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] shadow-[var(--shadow-card)] transition-[border-color,transform] duration-200 hover:border-[color-mix(in_srgb,var(--muted)_45%,var(--border))] active:scale-[0.99] disabled:opacity-50"
            >
              {busy ? labels.saving : labels.savePhoto}
            </button>
            {currentAvatarUrl || preview ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRemove()}
                className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm font-semibold text-[var(--muted)] shadow-[var(--shadow-card)] transition-[border-color,transform] duration-200 hover:border-[color-mix(in_srgb,var(--muted)_45%,var(--border))] hover:text-[var(--text)] active:scale-[0.99] disabled:opacity-50"
              >
                {labels.removePhoto}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
