"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { InstagramEmbed } from "@/components/recipe/InstagramEmbed";

/** Half of the previous 400px reel column — compact under photos. */
const COMPACT_REEL_MAX = "min(100%,200px)";

type RecipeDetailReelSectionProps = {
  videoFrameTitle: string;
  posterUrl?: string | null;
  hostedReelUrl?: string | null;
  hostedReelHint?: string;
  instagramEmbedSrc?: string | null;
  instagramInAppHint?: string;
  instagramTapForSoundHint?: string;
};

export function RecipeDetailReelSection({
  videoFrameTitle,
  posterUrl,
  hostedReelUrl,
  hostedReelHint,
  instagramEmbedSrc,
  instagramInAppHint,
  instagramTapForSoundHint,
}: RecipeDetailReelSectionProps) {
  const { t } = useTranslation();
  const hosted = hostedReelUrl?.trim() || null;
  const instagram =
    !hosted && instagramEmbedSrc?.trim() ? instagramEmbedSrc.trim() : null;
  const poster = posterUrl?.trim() || null;

  const [lightboxOpen, setLightboxOpen] = useState(false);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, closeLightbox]);

  if (!hosted && !instagram) return null;

  return (
    <section
      className="mx-auto w-full max-w-[min(100%,200px)] space-y-2"
      aria-label={videoFrameTitle}
    >
      {hosted ? (
        <>
          <button
            type="button"
            className="group block w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-black text-left shadow-[var(--shadow-card)] transition-[transform,border-color] duration-200 hover:border-[color-mix(in_srgb,var(--primary)_45%,var(--border))] active:scale-[0.98]"
            aria-label={t("recipe_reel_lightbox_open")}
            onClick={() => setLightboxOpen(true)}
          >
            <span
              className="relative mx-auto block aspect-[9/16] w-full"
              style={{ maxWidth: COMPACT_REEL_MAX }}
            >
              {poster ? (
                // eslint-disable-next-line @next/next/no-img-element -- reel poster from storage
                <img
                  src={poster}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <span className="absolute inset-0 bg-neutral-900" aria-hidden />
              )}
              <span
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20"
                aria-hidden
              />
              <span
                className="pointer-events-none absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/50 text-lg text-white shadow-md backdrop-blur-[2px] transition-transform group-hover:scale-105"
                aria-hidden
              >
                ▶
              </span>
            </span>
          </button>
          {hostedReelHint ? (
            <p className="text-center text-[length:var(--text-caption)] text-[var(--muted)]">
              {hostedReelHint}
            </p>
          ) : (
            <p className="text-center text-[10px] text-[var(--muted)]">
              {t("recipe_reel_lightbox_open_hint")}
            </p>
          )}
        </>
      ) : (
        <InstagramEmbed
          embedSrc={instagram!}
          title={videoFrameTitle}
          priority
          variant="reel"
          compact
          inAppHint={instagramInAppHint}
          tapForSoundHint={instagramTapForSoundHint}
        />
      )}

      {lightboxOpen && hosted ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/88 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("recipe_reel_lightbox_title")}
          onClick={closeLightbox}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label={t("recipe_gallery_lightbox_close")}
            onClick={closeLightbox}
          />
          <div
            className="relative z-[1] flex max-h-[92vh] w-full max-w-[min(100%,400px)] flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute -top-10 right-0 rounded-lg bg-white/15 px-3 py-1 text-sm font-semibold text-white hover:bg-white/25"
              onClick={closeLightbox}
            >
              {t("recipe_gallery_lightbox_close")}
            </button>
            <div className="relative aspect-[9/16] max-h-[80vh] w-full overflow-hidden rounded-xl border border-white/15 bg-black shadow-2xl">
              <video
                className="absolute inset-0 h-full w-full object-contain"
                src={hosted}
                title={videoFrameTitle}
                controls
                playsInline
                autoPlay
                preload="auto"
                poster={poster ?? undefined}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
