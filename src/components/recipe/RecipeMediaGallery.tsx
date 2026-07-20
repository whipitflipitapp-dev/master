"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { normalizeRecipeCoverImgSrc } from "@/lib/demo-recipe-cover-images";

const BLUR_FALLBACK =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSI4IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlN2U1ZTQiLz48L3N2Zz4";

const AUTO_ADVANCE_MS = 4000;
const SLIDE_FADE_MS = 600;
const AUTO_PAUSE_AFTER_INTERACTION_MS = 12_000;

export type RecipeMediaSlide = { kind: "image"; url: string };

type RecipeMediaGalleryProps = {
  title: string;
  imageAlt: string;
  slides: RecipeMediaSlide[];
};

function imageSlidesOnly(slides: RecipeMediaSlide[]): string[] {
  return slides
    .map((s) => normalizeRecipeCoverImgSrc(s.url.trim()))
    .filter(Boolean);
}

export function RecipeMediaGallery({
  title,
  imageAlt,
  slides,
}: RecipeMediaGalleryProps) {
  const { t } = useTranslation("common");
  const regionId = useId();
  const [index, setIndex] = useState(0);
  const [lightboxImageIndex, setLightboxImageIndex] = useState<number | null>(
    null,
  );
  const [autoplayPausedUntil, setAutoplayPausedUntil] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const count = slides.length;
  const safeIndex = count > 0 ? Math.min(index, count - 1) : 0;
  const imageUrls = imageSlidesOnly(slides);

  const pauseAutoplay = useCallback(() => {
    setAutoplayPausedUntil(Date.now() + AUTO_PAUSE_AFTER_INTERACTION_MS);
  }, []);

  const goPrev = useCallback(() => {
    pauseAutoplay();
    setIndex((i) => (count <= 1 ? i : i <= 0 ? count - 1 : i - 1));
  }, [count, pauseAutoplay]);

  const goNext = useCallback(() => {
    pauseAutoplay();
    setIndex((i) => (count <= 1 ? i : i >= count - 1 ? 0 : i + 1));
  }, [count, pauseAutoplay]);

  useEffect(() => {
    if (count <= 1) return;
    const timer = window.setInterval(() => {
      if (Date.now() < autoplayPausedUntil) return;
      if (lightboxImageIndex !== null) return;
      setIndex((i) => (i >= count - 1 ? 0 : i + 1));
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [
    count,
    autoplayPausedUntil,
    lightboxImageIndex,
  ]);

  useEffect(() => {
    if (lightboxImageIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxImageIndex(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [lightboxImageIndex]);

  const openLightboxForSlide = (slideIndex: number) => {
    pauseAutoplay();
    setLightboxImageIndex(slideIndex);
  };

  if (count === 0) {
    return null;
  }

  const showControls = count > 1;

  return (
    <>
      <section
        className="relative w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_12%,var(--card))] shadow-[var(--shadow-card)]"
        aria-labelledby={regionId}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
          pauseAutoplay();
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          if (start == null || count <= 1) return;
          const endX = e.changedTouches[0]?.clientX ?? start;
          const dx = endX - start;
          if (Math.abs(dx) < 48) return;
          if (dx > 0) goPrev();
          else goNext();
        }}
      >
        <h2 id={regionId} className="sr-only">
          {t("recipe_gallery_heading")}
        </h2>

        {count > 0 ? (
          <div className="relative aspect-[16/10] w-full">
            {slides.map((slide, slideIndex) => {
              const src = normalizeRecipeCoverImgSrc(slide.url.trim());
              const isActive = slideIndex === safeIndex;
              return (
                <div
                  key={`${slide.url}-${slideIndex}`}
                  className={`absolute inset-0 transition-opacity ease-in-out motion-reduce:transition-none ${
                    isActive ? "z-[1] opacity-100" : "z-0 opacity-0"
                  }`}
                  style={{ transitionDuration: `${SLIDE_FADE_MS}ms` }}
                  aria-hidden={!isActive}
                >
                  <Image
                    src={src}
                    alt={
                      count > 1
                        ? t("recipe_gallery_slide_alt", {
                            title,
                            index: slideIndex + 1,
                            count,
                          })
                        : imageAlt || title
                    }
                    fill
                    className="object-cover"
                    sizes="(max-width: 672px) 100vw, 672px"
                    priority={slideIndex === 0}
                    placeholder="blur"
                    blurDataURL={BLUR_FALLBACK}
                  />
                </div>
              );
            })}
            <button
              type="button"
              className="absolute inset-0 z-[2] block w-full cursor-zoom-in"
              aria-label={t("recipe_gallery_lightbox_open")}
              onClick={() => openLightboxForSlide(safeIndex)}
            />
          </div>
        ) : null}

        {showControls ? (
          <div className="flex flex-col gap-2 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] px-3 py-2.5">
            <p className="text-center text-[10px] text-[var(--muted)]">
              {t("recipe_gallery_swipe_hint")}
            </p>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={goPrev}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-[length:var(--text-caption)] font-semibold text-[var(--text)] shadow-[var(--shadow-card)] transition-[background-color,transform] hover:bg-[color-mix(in_srgb,var(--card)_88%,var(--text))] active:scale-[0.98]"
              >
                {t("recipe_gallery_prev")}
              </button>
              <p className="text-[length:var(--text-caption)] tabular-nums text-[var(--muted)]">
                {t("recipe_gallery_position", {
                  current: safeIndex + 1,
                  total: count,
                })}
              </p>
              <button
                type="button"
                onClick={goNext}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-[length:var(--text-caption)] font-semibold text-[var(--text)] shadow-[var(--shadow-card)] transition-[background-color,transform] hover:bg-[color-mix(in_srgb,var(--card)_88%,var(--text))] active:scale-[0.98]"
              >
                {t("recipe_gallery_next")}
              </button>
            </div>
            <div
              className="flex flex-wrap justify-center gap-1.5"
              role="tablist"
              aria-label={t("recipe_gallery_dots_label")}
            >
              {slides.map((slide, dotIndex) => (
                <button
                  key={`${slide.url}-${dotIndex}`}
                  type="button"
                  role="tab"
                  aria-selected={dotIndex === safeIndex}
                  aria-label={t("recipe_gallery_dot_aria", {
                    index: dotIndex + 1,
                    total: count,
                  })}
                  onClick={() => {
                    pauseAutoplay();
                    setIndex(dotIndex);
                  }}
                  className={`h-2 w-2 rounded-full transition-[transform,background-color] ${
                    dotIndex === safeIndex
                      ? "scale-110 bg-[var(--primary)]"
                      : "bg-[color-mix(in_srgb,var(--muted)_55%,transparent)]"
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="border-t border-[var(--border)] px-3 py-2 text-center text-[10px] text-[var(--muted)]">
            {t("recipe_gallery_lightbox_open_hint")}
          </p>
        )}
      </section>

      {lightboxImageIndex !== null && imageUrls.length > 0 ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/88 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("recipe_gallery_lightbox_title")}
          onClick={() => setLightboxImageIndex(null)}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-zoom-out"
            aria-label={t("recipe_gallery_lightbox_close")}
          />
          <div
            className="relative z-[1] flex max-h-[92vh] max-w-[min(100%,56rem)] flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute -top-10 right-0 rounded-lg bg-white/15 px-3 py-1 text-sm font-semibold text-white hover:bg-white/25"
              onClick={() => setLightboxImageIndex(null)}
            >
              {t("recipe_gallery_lightbox_close")}
            </button>
            <div className="relative max-h-[80vh] w-full min-w-[min(100%,20rem)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- lightbox uses full-res remote URL */}
              <img
                src={imageUrls[lightboxImageIndex] ?? imageUrls[0]}
                alt={imageAlt || title}
                className="mx-auto max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
              />
            </div>
            {imageUrls.length > 1 ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold text-white"
                  onClick={() =>
                    setLightboxImageIndex((i) =>
                      i === null || i <= 0 ? imageUrls.length - 1 : i - 1,
                    )
                  }
                >
                  {t("recipe_gallery_prev")}
                </button>
                <span className="text-sm tabular-nums text-white/80">
                  {lightboxImageIndex + 1} / {imageUrls.length}
                </span>
                <button
                  type="button"
                  className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold text-white"
                  onClick={() =>
                    setLightboxImageIndex((i) =>
                      i === null || i >= imageUrls.length - 1 ? 0 : i + 1,
                    )
                  }
                >
                  {t("recipe_gallery_next")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
