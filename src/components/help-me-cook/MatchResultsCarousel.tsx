"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import type { RecipeMatchResult } from "@/app/actions/recipes";
import { RecipeListCard } from "@/components/recipe/RecipeListCard";
import { PANTRY_MATCH_MIN_PERCENT } from "@/lib/pantry";

export type MatchResultsCarouselProps = {
  /** Same text used for matching — drives “new results” scroll detection. */
  searchKey: string;
  matches: RecipeMatchResult[];
};

/**
 * Results region with smooth scroll-into-view on new non-empty matches,
 * horizontal scroll-snap carousel, and optional tap feedback via framer-motion.
 */
export function HelpMeCookMatchResultsSection({
  searchKey,
  matches,
}: MatchResultsCarouselProps) {
  const { t } = useTranslation("common");
  const reduceMotion = useReducedMotion();
  const headingId = useId();
  const regionRef = useRef<HTMLElement | null>(null);
  const lastScrollSignatureRef = useRef<string>("");

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
      ) : (
        <div
          className="mt-4 min-w-0 w-full overflow-x-auto scroll-smooth pb-2 [-webkit-overflow-scrolling:touch] snap-x snap-mandatory [container-type:inline-size] motion-reduce:scroll-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
          tabIndex={0}
          aria-label={t("help_cook_results_carousel_label")}
        >
          <ul
            role="list"
            className="flex w-max flex-row gap-4 pe-1 ps-0.5 pt-0.5 [scrollbar-width:thin]"
          >
            {matches.map((m) => (
              <motion.li
                key={m.recipeId}
                className="w-[min(92cqw,calc(100cqw-0.75rem))] shrink-0 snap-start sm:w-[calc((100cqw-1rem)/2)] md:w-[calc((100cqw-2rem)/3)]"
                whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                transition={{ type: "spring", stiffness: 520, damping: 32 }}
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
              </motion.li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** Alias for file-oriented imports; same component as {@link HelpMeCookMatchResultsSection}. */
export const MatchResultsCarousel = HelpMeCookMatchResultsSection;
