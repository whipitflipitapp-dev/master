"use client";

import Image from "next/image";
import { useCallback, useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { normalizeRecipeCoverImgSrc } from "@/lib/demo-recipe-cover-images";

const BLUR_FALLBACK =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSI4IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlN2U1ZTQiLz48L3N2Zz4";

type RecipePhotoCarouselProps = {
  title: string;
  imageUrls: string[];
  imageAlt: string;
};

export function RecipePhotoCarousel({
  title,
  imageUrls,
  imageAlt,
}: RecipePhotoCarouselProps) {
  const { t } = useTranslation("common");
  const regionId = useId();
  const [index, setIndex] = useState(0);

  const slides = imageUrls
    .map((url) =>
      typeof url === "string" && url.trim()
        ? normalizeRecipeCoverImgSrc(url.trim())
        : null,
    )
    .filter((url): url is string => Boolean(url));

  const count = slides.length;
  const safeIndex = count > 0 ? Math.min(index, count - 1) : 0;
  const currentSrc = count > 0 ? slides[safeIndex] : null;

  const goPrev = useCallback(() => {
    setIndex((i) => (count <= 1 ? i : i <= 0 ? count - 1 : i - 1));
  }, [count]);

  const goNext = useCallback(() => {
    setIndex((i) => (count <= 1 ? i : i >= count - 1 ? 0 : i + 1));
  }, [count]);

  if (!currentSrc) {
    return null;
  }

  return (
    <section
      className="relative w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_12%,var(--card))] shadow-[var(--shadow-card)]"
      aria-labelledby={regionId}
    >
      <h2 id={regionId} className="sr-only">
        {t("recipe_gallery_heading")}
      </h2>

      <div className="relative aspect-[16/10] w-full">
        <Image
          key={currentSrc}
          src={currentSrc}
          alt={
            count > 1
              ? t("recipe_gallery_slide_alt", {
                  title,
                  index: safeIndex + 1,
                  count,
                })
              : imageAlt || title
          }
          fill
          className="object-cover"
          sizes="(max-width: 672px) 100vw, 672px"
          priority={safeIndex === 0}
          placeholder="blur"
          blurDataURL={BLUR_FALLBACK}
        />
      </div>

      {count > 1 ? (
        <div className="flex flex-col gap-2 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] px-3 py-2.5">
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
            {slides.map((_, dotIndex) => (
              <button
                key={dotIndex}
                type="button"
                role="tab"
                aria-selected={dotIndex === safeIndex}
                aria-label={t("recipe_gallery_dot_aria", {
                  index: dotIndex + 1,
                  total: count,
                })}
                onClick={() => setIndex(dotIndex)}
                className={`h-2 w-2 rounded-full transition-[transform,background-color] ${
                  dotIndex === safeIndex
                    ? "scale-110 bg-[var(--primary)]"
                    : "bg-[color-mix(in_srgb,var(--muted)_55%,transparent)]"
                }`}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
