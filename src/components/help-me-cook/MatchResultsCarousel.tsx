"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { RecipeMatchResult } from "@/app/actions/recipes";
import { RecipeFavoriteButton } from "@/components/recipe/RecipeFavoriteButton";
import { RecipeListCard } from "@/components/recipe/RecipeListCard";
import { PANTRY_MATCH_MIN_PERCENT } from "@/lib/pantry";

const SWIPE_THRESHOLD_PX = 40;
const DRAG_CONSTRAINT = 140;

export type HelpMeCookMatchFavoriteSnapshot = {
  favoritesCount: number;
  favoredByUser: boolean;
};

export type MatchResultsCarouselProps = {
  /** Same text used for matching — drives “new results” scroll detection. */
  searchKey: string;
  matches: RecipeMatchResult[];
  authenticated: boolean;
  favoriteByRecipeId: Record<string, HelpMeCookMatchFavoriteSnapshot>;
  loginNextPath: string;
};

/**
 * Results region with smooth scroll-into-view on new non-empty matches,
 * one recipe per view with swipe or prev/next, and save (favorite) for the visible recipe.
 */
export function HelpMeCookMatchResultsSection({
  searchKey,
  matches,
  authenticated,
  favoriteByRecipeId,
  loginNextPath,
}: MatchResultsCarouselProps) {
  const { t } = useTranslation("common");
  const reduceMotion = useReducedMotion();
  const headingId = useId();
  const carouselId = useId();
  const regionRef = useRef<HTMLElement | null>(null);
  const lastScrollSignatureRef = useRef<string>("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [searchKey]);

  useEffect(() => {
    setCurrentIndex((i) =>
      Math.max(0, Math.min(i, Math.max(0, matches.length - 1))),
    );
  }, [matches.length]);

  useLayoutEffect(() => {
    if (matches.length === 0) {
      lastScrollSignatureRef.current = "";
      return;
    }

    const signature = `${searchKey}::${matches.map((m) => m.recipeId).join(",")}`;
    if (signature === lastScrollSignatureRef.current) {
      return;
    }
    lastScrollSignatureRef.current = signature;

    regionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [matches, searchKey]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(matches.length - 1, i + 1));
  }, [matches.length]);

  const m = matches[currentIndex];
  const snap =
    m && favoriteByRecipeId[m.recipeId]
      ? favoriteByRecipeId[m.recipeId]
      : { favoritesCount: 0, favoredByUser: false };

  return (
    <section
      ref={regionRef}
      aria-live="polite"
      role="region"
      aria-labelledby={headingId}
      aria-roledescription={t("help_cook_results_region_roledescription")}
      className="mt-4 scroll-mt-4"
    >
      <h2
        id={headingId}
        className="text-lg font-semibold text-[var(--text)]"
      >
        {t("help_cook_results_title")}
      </h2>
      {matches.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--muted)]">
          {t("help_cook_no_matches", { percent: PANTRY_MATCH_MIN_PERCENT })}
        </p>
      ) : m ? (
        <div className="mt-4 min-w-0 w-full max-w-lg">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentIndex <= 0}
              className="inline-flex min-h-[44px] shrink-0 items-center rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[var(--text)] shadow-[var(--shadow-card)] transition-colors hover:bg-[color-mix(in_srgb,var(--card)_88%,var(--text))] disabled:pointer-events-none disabled:opacity-45"
            >
              {t("help_cook_carousel_prev")}
            </button>
            <p
              className="min-w-0 flex-1 text-center text-sm font-medium text-[var(--muted)]"
              aria-live="polite"
              aria-atomic="true"
            >
              {t("help_cook_carousel_position", {
                current: currentIndex + 1,
                total: matches.length,
              })}
            </p>
            <div className="shrink-0 [&_button]:min-h-[44px] [&_a]:min-h-[44px]">
              <RecipeFavoriteButton
                key={`${m.recipeId}-${snap.favoredByUser}-${snap.favoritesCount}`}
                recipeId={m.recipeId}
                loginNextPath={loginNextPath}
                authenticated={authenticated}
                initialFavored={snap.favoredByUser}
                initialCount={snap.favoritesCount}
              />
            </div>
            <button
              type="button"
              onClick={goNext}
              disabled={currentIndex >= matches.length - 1}
              className="inline-flex min-h-[44px] shrink-0 items-center rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[var(--text)] shadow-[var(--shadow-card)] transition-colors hover:bg-[color-mix(in_srgb,var(--card)_88%,var(--text))] disabled:pointer-events-none disabled:opacity-45"
            >
              {t("help_cook_carousel_next")}
            </button>
          </div>

          {matches.length > 1 ? (
            <nav
              className="mt-3 flex flex-wrap justify-center gap-2"
              aria-label={t("help_cook_carousel_dots_label")}
            >
              {matches.map((recipe, i) => (
                <button
                  key={recipe.recipeId}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={`h-2.5 rounded-full transition-[width,background-color] ${
                    i === currentIndex
                      ? "w-7 bg-[var(--primary)]"
                      : "w-2.5 bg-[color-mix(in_srgb,var(--muted)_45%,var(--border))] hover:bg-[color-mix(in_srgb,var(--muted)_65%,var(--border))]"
                  }`}
                  aria-label={t("help_cook_carousel_dot_aria", {
                    n: i + 1,
                    title: recipe.title,
                  })}
                  aria-current={i === currentIndex ? "true" : undefined}
                />
              ))}
            </nav>
          ) : null}

          {!reduceMotion ? (
            <p className="mt-2 text-center text-[length:var(--text-caption)] text-[var(--muted)]">
              {t("help_cook_carousel_swipe_hint")}
            </p>
          ) : null}

          <motion.div
            id={carouselId}
            role="group"
            aria-label={t("help_cook_carousel_slide_aria", {
              title: m.title,
              current: currentIndex + 1,
              total: matches.length,
            })}
            key={m.recipeId}
            className="mt-3 min-w-0 w-full cursor-grab touch-pan-y active:cursor-grabbing"
            drag={reduceMotion ? false : "x"}
            dragConstraints={{ left: -DRAG_CONSTRAINT, right: DRAG_CONSTRAINT }}
            dragElastic={0.14}
            whileTap={reduceMotion ? undefined : { scale: 0.995 }}
            transition={{ type: "spring", stiffness: 520, damping: 34 }}
            onDragEnd={(_, info) => {
              if (reduceMotion) return;
              const { offset, velocity } = info;
              const vx = velocity.x;
              if (
                offset.x <= -SWIPE_THRESHOLD_PX ||
                vx < -380
              ) {
                if (currentIndex < matches.length - 1) goNext();
              } else if (offset.x >= SWIPE_THRESHOLD_PX || vx > 380) {
                if (currentIndex > 0) goPrev();
              }
            }}
          >
            <RecipeListCard
              href={`/recipes/${m.recipeId}`}
              title={m.title}
              imageUrl={m.image_url}
              trailing={
                <span className="flex max-w-[min(100%,12rem)] flex-col items-end gap-1 text-right">
                  {m.allergyOverlapNames?.length ? (
                    <span
                      className="inline-block rounded-full border border-[color-mix(in_srgb,var(--danger)_38%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-2 py-0.5 text-[length:var(--text-caption)] font-semibold leading-tight text-[var(--danger)]"
                      title={`Contains allergens you track: ${m.allergyOverlapNames.join(", ")}`}
                    >
                      {m.allergyOverlapNames.join(", ")}
                    </span>
                  ) : null}
                  <span className="inline-block rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-2 py-0.5 text-xs font-semibold text-[var(--primary)]">
                    {t("help_cook_match_percent", { percent: m.matchPercent })}
                  </span>
                </span>
              }
              footer={
                m.missingIngredients.length > 0 ? (
                  <>
                    {t("help_cook_missing_prefix")}{" "}
                    {m.missingIngredients.join(", ")}
                  </>
                ) : (
                  <span className="text-[var(--success)]">
                    {t("help_cook_have_all_ingredients")}
                  </span>
                )
              }
            />
          </motion.div>
        </div>
      ) : null}
    </section>
  );
}

/** Alias for file-oriented imports; same component as {@link HelpMeCookMatchResultsSection}. */
export const MatchResultsCarousel = HelpMeCookMatchResultsSection;
