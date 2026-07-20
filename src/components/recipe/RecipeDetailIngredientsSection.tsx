"use client";

import { useMemo, useState } from "react";

import {
  estimateMissingIngredientsCostCents,
  formatEstimatedMissingCostDisplay,
} from "@/lib/ingredient-cost-estimates";
import { isIngredientLineNoise } from "@/lib/ingredients";

export type RecipeDetailIngredient = {
  ingredientId: string;
  name: string;
  quantity: string | null;
  sortOrder: number;
  priceCents?: number | null;
};

type RecipeDetailIngredientsSectionProps = {
  ingredients: RecipeDetailIngredient[];
  /** Ingredient IDs the user already has (pantry `?q=` match on first paint). */
  initialHaveIngredientIds: string[];
  labels: {
    sectionTitle: string;
    ingredientsHint: string;
    estimatedToWhipCost: string;
    costDisclaimer: string;
    haveAllIngredients: string;
  };
};

export function RecipeDetailIngredientsSection({
  ingredients,
  initialHaveIngredientIds,
  labels,
}: RecipeDetailIngredientsSectionProps) {
  const [haveIds, setHaveIds] = useState(
    () => new Set(initialHaveIngredientIds),
  );

  const displayIngredients = useMemo(
    () => ingredients.filter((ing) => !isIngredientLineNoise(ing.name)),
    [ingredients],
  );

  const { missingNames, estimatedCents } = useMemo(() => {
    const missingLines: {
      name: string;
      quantity: string | null;
      priceCents: number | null;
    }[] = [];
    for (const ing of displayIngredients) {
      if (!haveIds.has(ing.ingredientId)) {
        missingLines.push({
          name: ing.name,
          quantity: ing.quantity,
          priceCents: ing.priceCents ?? null,
        });
      }
    }
    return {
      missingNames: missingLines.map((l) => l.name),
      estimatedCents: estimateMissingIngredientsCostCents(missingLines),
    };
  }, [displayIngredients, haveIds]);

  const toggleHave = (ingredientId: string, checked: boolean) => {
    setHaveIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(ingredientId);
      } else {
        next.delete(ingredientId);
      }
      return next;
    });
  };

  return (
    <section className="mt-11" aria-labelledby="ingredients-heading">
      <h2
        id="ingredients-heading"
        className="text-xl font-semibold tracking-tight text-[var(--text)]"
      >
        {labels.sectionTitle}
      </h2>
      <p className="mt-3 text-[length:var(--text-caption)] leading-relaxed text-[var(--muted)]">
        {labels.ingredientsHint}
      </p>
      <ul className="mt-4 space-y-3">
        {displayIngredients.map((ing, idx) => (
          <li
            key={`${ing.sortOrder}-${ing.ingredientId}-${idx}`}
            className="flex gap-3 rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] px-4 py-3 shadow-[0_1px_0_rgba(28,25,23,0.03)]"
          >
            <input
              type="checkbox"
              className="mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 accent-[var(--primary)]"
              aria-label={ing.name}
              checked={haveIds.has(ing.ingredientId)}
              onChange={(e) => toggleHave(ing.ingredientId, e.target.checked)}
            />
            <span className="text-[0.9375rem] leading-relaxed text-[var(--text)]">
              {ing.quantity ? (
                <span className="font-medium text-[var(--muted)]">
                  {ing.quantity}{" "}
                </span>
              ) : null}
              <span>{ing.name}</span>
            </span>
          </li>
        ))}
      </ul>
      <CostSummary
        missingCount={missingNames.length}
        estimatedCents={estimatedCents}
        labels={labels}
      />
    </section>
  );
}

function CostSummary({
  missingCount,
  estimatedCents,
  labels,
}: {
  missingCount: number;
  estimatedCents: number;
  labels: RecipeDetailIngredientsSectionProps["labels"];
}) {
  if (missingCount === 0) {
    return (
      <p className="mt-4 text-sm font-medium text-[var(--success)]">
        {labels.haveAllIngredients}
      </p>
    );
  }

  const amount = formatEstimatedMissingCostDisplay(estimatedCents);
  return (
    <div className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[color-mix(in_srgb,var(--muted)_8%,var(--card))] px-4 py-3">
      <p className="text-sm font-semibold text-[var(--text)]">
        {labels.estimatedToWhipCost.replace("{{amount}}", amount)}
      </p>
      <p className="mt-1 text-[length:var(--text-caption)] leading-relaxed text-[var(--muted)]">
        {labels.costDisclaimer}
      </p>
    </div>
  );
}
