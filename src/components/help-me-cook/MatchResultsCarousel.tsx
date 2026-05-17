"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import type { RecipeMatchResult } from "@/app/actions/recipes";
import { RecipeFavoriteButton } from "@/components/recipe/RecipeFavoriteButton";
import { RecipeListCard } from "@/components/recipe/RecipeListCard";
import { formatEstimatedMissingCostDisplay } from "@/lib/ingredient-cost-estimates";
import { PANTRY_MATCH_MIN_PERCENT } from "@/lib/pantry";

const SWIPE_THRESHOLD_PX = 40;
const DRAG_CONSTRAINT = 140;

type HelpCookSortMode =
  | "best_match"
  | "fewest_missing"
  | "fewest_matched"
  | "most_on_hand"
  | "most_matched"
  | "lowest_cost"
  | "highest_cost";

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
  const sortSelectId = useId();
  const carouselId = useId();
  const regionRef = useRef<HTMLElement | null>(null);
  const lastScrollSignatureRef = useRef<string>("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sortMode, setSortMode] = useState<HelpCookSortMode>("best_match");

  const displayMatches = useMemo(() => {
    const tagged = matches.map((m, i) => ({ m, i }));
    switch (sortMode) {
      case "best_match":
        return tagged.sort((a, b) => a.i - b.i).map((x) => x.m);
      case "fewest_missing":
        return tagged
          .sort((a, b) => {
            const missA = a.m.missingIngredients.length;
            const missB = b.m.missingIngredients.length;
            return (
              missA - missB ||
              b.m.matchedIngredientCount - a.m.matchedIngredientCount ||
              a.m.title.localeCompare(b.m.title)
            );
          })
          .map((x) => x.m);
      case "fewest_matched":
        return tagged
          .sort((a, b) => {
            return (
              a.m.matchedIngredientCount - b.m.matchedIngredientCount ||
              a.m.missingIngredients.length - b.m.missingIngredients.length ||
              a.m.title.localeCompare(b.m.title)
            );
          })
          .map((x) => x.m);
      case "most_on_hand":
        return tagged
          .sort((a, b) => {
            return (
              b.m.matchedIngredientCount - a.m.matchedIngredientCount ||
              a.m.missingIngredients.length - b.m.missingIngredients.length ||
              a.m.title.localeCompare(b.m.title)
            );
          })
          .map((x) => x.m);
      case "most_matched":
        return tagged
          .sort((a, b) => {
            return (
              b.m.matchedIngredientCount - a.m.matchedIngredientCount ||
              b.m.matchPercent - a.m.matchPercent ||
              a.m.title.localeCompare(b.m.title)
            );
          })
          .map((x) => x.m);
      case "lowest_cost":
        return tagged
          .sort((a, b) => {
            return (
              a.m.estimatedMissingCostCents - b.m.estimatedMissingCostCents ||
              a.m.missingIngredients.length - b.m.missingIngredients.length ||
              b.m.matchPercent - a.m.matchPercent ||
              a.m.title.localeCompare(b.m.title)
            );
          })
          .map((x) => x.m);
      case "highest_cost":
        return tagged
          .sort((a, b) => {
            return (
              b.m.estimatedMissingCostCents - a.m.estimatedMissingCostCents ||
              b.m.missingIngredients.length - a.m.missingIngredients.length ||
              b.m.matchPercent - a.m.matchPercent ||
              a.m.title.localeCompare(b.m.title)
            );
          })
          .map((x) => x.m);
      default:
        return matches;
    }
  }, [matches, sortMode]);

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
    setCurrentIndex((i) => Math.min(displayMatches.length - 1, i + 1));
  }, [displayMatches.length]);

  const m = displayMatches[currentIndex];
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
      {matches.length > 1 ? (
        <div className="mt-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <label
            htmlFor={sortSelectId}
            className="text-xs font-medium text-[var(--muted)]"
          >
            {t("help_cook_sort_label")}
          </label>
          <select
            id={sortSelectId}
            value={sortMode}
            onChange={(e) => {
              setSortMode(e.target.value as HelpCookSortMode);
              setCurrentIndex(0);
            }}
            className="min-h-[44px] w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--text)] shadow-[var(--shadow-card)] outline-none ring-[var(--primary)]/25 focus:ring-2 sm:max-w-[min(100%,16rem)] sm:flex-1"
          >
            <option value="best_match">{t("help_cook_sort_best_match")}</option>
            <option value="fewest_missing">
              {t("help_cook_sort_fewest_missing")}
            </option>
            <option value="fewest_matched">
              {t("help_cook_sort_fewest_matched")}
            </option>
            <option value="most_on_hand">
              {t("help_cook_sort_most_on_hand")}
            </option>
            <option value="most_matched">
              {t("help_cook_sort_most_matched")}
            </option>
            <option value="lowest_cost">
              {t("help_cook_sort_lowest_cost")}
            </option>
            <option value="highest_cost">
              {t("help_cook_sort_highest_cost")}
            </option>
          </select>
        </div>
      ) : null}
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
                total: displayMatches.length,
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
              disabled={currentIndex >= displayMatches.length - 1}
              className="inline-flex min-h-[44px] shrink-0 items-center rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[var(--text)] shadow-[var(--shadow-card)] transition-colors hover:bg-[color-mix(in_srgb,var(--card)_88%,var(--text))] disabled:pointer-events-none disabled:opacity-45"
            >
              {t("help_cook_carousel_next")}
            </button>
          </div>

          {displayMatches.length > 1 ? (
            <nav
              className="mt-3 flex flex-wrap justify-center gap-2"
              aria-label={t("help_cook_carousel_dots_label")}
            >
              {displayMatches.map((recipe, i) => (
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
              total: displayMatches.length,
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
                if (currentIndex < displayMatches.length - 1) goNext();
              } else if (offset.x >= SWIPE_THRESHOLD_PX || vx > 380) {
                if (currentIndex > 0) goPrev();
              }
            }}
          >
            <RecipeListCard
              href={
                searchKey.trim().length > 0
                  ? `/recipes/${m.recipeId}?${new URLSearchParams({
                      q: searchKey,
                    }).toString()}`
                  : `/recipes/${m.recipeId}`
              }
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
                  {m.missingIngredients.length > 0 ? (
                    <span
                      className="inline-block rounded-full bg-[color-mix(in_srgb,var(--muted)_18%,transparent)] px-2 py-0.5 text-[length:var(--text-caption)] font-semibold leading-tight text-[var(--muted)]"
                      title={t("help_cook_cost_estimate_disclaimer")}
                    >
                      {t("help_cook_estimated_missing_cost", {
                        amount: formatEstimatedMissingCostDisplay(
                          m.estimatedMissingCostCents,
                        ),
                      })}
                    </span>
                  ) : null}
                </span>
              }
              footer={
                m.missingIngredients.length > 0 ? (
                  <>
                    {t("help_cook_missing_prefix")}{" "}
                    {m.missingIngredients.join(", ")}
                    <span className="mt-1 block text-[length:var(--text-caption)] text-[var(--muted)]">
                      {t("help_cook_cost_estimate_disclaimer")}
                    </span>
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
