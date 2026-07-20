"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  saveRecipeExperience,
  type RecipeExperienceRow,
} from "@/app/actions/recipe-experiences";

type RecipeExperienceFormProps = {
  recipeId: string;
  authenticated: boolean;
  loginNextPath: string;
  initial: RecipeExperienceRow | null;
  labels: {
    sectionTitle: string;
    madeLabel: string;
    ratingLabel: string;
    ratingHint: string;
    spentLabel: string;
    spentHint: string;
    reviewLabel: string;
    reviewHint: string;
    reviewPlaceholder: string;
    pendingReview: string;
    save: string;
    saving: string;
    signInPrompt: string;
    signInLink: string;
    saved: string;
  };
};

function spentDollarsDefault(cents: number | null): string {
  if (cents == null || cents < 0) return "";
  return (cents / 100).toFixed(2);
}

export function RecipeExperienceForm({
  recipeId,
  authenticated,
  loginNextPath,
  initial,
  labels,
}: RecipeExperienceFormProps) {
  const [state, formAction, pending] = useActionState(saveRecipeExperience, {
    ok: false,
    error: null as string | null,
    notice: null as string | null,
  });

  if (!authenticated) {
    const next = `/login?next=${encodeURIComponent(loginNextPath)}`;
    return (
      <section className="mt-12" aria-labelledby="recipe-experience-heading">
        <h2
          id="recipe-experience-heading"
          className="text-xl font-semibold tracking-tight text-[var(--text)]"
        >
          {labels.sectionTitle}
        </h2>
        <p className="mt-3 text-sm text-[var(--muted)]">
          <Link
            href={next}
            className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
          >
            {labels.signInLink}
          </Link>{" "}
          {labels.signInPrompt}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-12" aria-labelledby="recipe-experience-heading">
      <h2
        id="recipe-experience-heading"
        className="text-xl font-semibold tracking-tight text-[var(--text)]"
      >
        {labels.sectionTitle}
      </h2>
      <form
        action={formAction}
        className="mt-4 space-y-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)]"
      >
        <input type="hidden" name="recipe_id" value={recipeId} />

        <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--text)]">
          <input
            type="checkbox"
            name="made_recipe"
            defaultChecked={initial?.madeRecipe ?? false}
            className="mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 accent-[var(--primary)]"
          />
          <span className="font-medium">{labels.madeLabel}</span>
        </label>

        <div className="space-y-1.5">
          <label
            htmlFor="recipe-experience-rating"
            className="block text-sm font-medium text-[var(--text)]"
          >
            {labels.ratingLabel}
          </label>
          <input
            id="recipe-experience-rating"
            name="rating"
            type="number"
            min={1}
            max={10}
            step={1}
            inputMode="numeric"
            defaultValue={initial?.rating ?? ""}
            placeholder="1–10"
            className="w-full max-w-[8rem] rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] shadow-[var(--shadow-card)] outline-none transition-[border-color] focus:border-[color-mix(in_srgb,var(--primary)_45%,var(--border))]"
          />
          <p className="text-[length:var(--text-caption)] text-[var(--muted)]">
            {labels.ratingHint}
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="recipe-experience-spent"
            className="block text-sm font-medium text-[var(--text)]"
          >
            {labels.spentLabel}
          </label>
          <div className="relative max-w-xs">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--muted)]">
              $
            </span>
            <input
              id="recipe-experience-spent"
              name="spent_usd"
              type="number"
              min={0}
              step={0.01}
              inputMode="decimal"
              defaultValue={spentDollarsDefault(initial?.spentCents ?? null)}
              placeholder="0.00"
              className="w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] py-2.5 pl-7 pr-3 text-sm text-[var(--text)] shadow-[var(--shadow-card)] outline-none transition-[border-color] focus:border-[color-mix(in_srgb,var(--primary)_45%,var(--border))]"
            />
          </div>
          <p className="text-[length:var(--text-caption)] text-[var(--muted)]">
            {labels.spentHint}
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="recipe-experience-review"
            className="block text-sm font-medium text-[var(--text)]"
          >
            {labels.reviewLabel}
          </label>
          <textarea
            id="recipe-experience-review"
            name="review_text"
            rows={4}
            maxLength={2000}
            defaultValue={initial?.reviewText ?? ""}
            placeholder={labels.reviewPlaceholder}
            className="w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] shadow-[var(--shadow-card)] outline-none transition-[border-color] focus:border-[color-mix(in_srgb,var(--primary)_45%,var(--border))]"
          />
          <p className="text-[length:var(--text-caption)] text-[var(--muted)]">
            {labels.reviewHint}
          </p>
          {initial?.reviewPendingReview ? (
            <p className="text-[length:var(--text-caption)] font-medium text-[var(--primary)]">
              {labels.pendingReview}
            </p>
          ) : null}
        </div>

        {state.error ? (
          <p className="text-xs font-medium text-[var(--danger)]" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.ok ? (
          <p className="text-xs font-medium text-[var(--success)]" role="status">
            {state.notice ?? labels.saved}
          </p>
        ) : null}
        {state.notice && !state.ok ? (
          <p className="text-xs font-medium text-[var(--primary)]" role="status">
            {state.notice}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm font-semibold text-[var(--text)] shadow-[var(--shadow-card)] transition-[background-color,border-color,transform] duration-200 hover:border-[color-mix(in_srgb,var(--muted)_45%,var(--border))] active:scale-[0.99] disabled:opacity-60"
        >
          {pending ? labels.saving : labels.save}
        </button>
      </form>
    </section>
  );
}
