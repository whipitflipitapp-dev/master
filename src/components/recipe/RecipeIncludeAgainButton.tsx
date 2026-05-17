"use client";

import { useTransition } from "react";

import { includeRecipe } from "@/app/actions/excluded-recipes";

type RecipeIncludeAgainButtonProps = {
  recipeId: string;
  label: string;
  pendingLabel: string;
  className?: string;
};

export function RecipeIncludeAgainButton({
  recipeId,
  label,
  pendingLabel,
  className = "",
}: RecipeIncludeAgainButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await includeRecipe(recipeId);
        });
      }}
      className={
        className ||
        "inline-flex items-center rounded-xl border border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[var(--primary-muted)] px-3.5 py-2 text-[length:var(--text-meta)] font-semibold text-[var(--primary)] transition-colors hover:border-[color-mix(in_srgb,var(--primary)_50%,var(--border))] disabled:opacity-55"
      }
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
