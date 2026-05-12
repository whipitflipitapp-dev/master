"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { UpgradePitch } from "@/components/billing/UpgradePitch";
import type { RecipeGenerateShape } from "@/lib/ai/sanitize-output";
import type { PlanType } from "@/lib/plan";
import { isAiChef } from "@/lib/plan";

type Props = {
  planType: PlanType;
  suggestedAllergyNotes: string;
};

function parseIngredientsInput(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 24);
}

export function AiChefWorkbench(props: Props) {
  const { planType, suggestedAllergyNotes } = props;
  const { t } = useTranslation("common");
  const unlocked = isAiChef(planType);

  const [recipeIngText, setRecipeIngText] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [recipeAllergy, setRecipeAllergy] = useState(suggestedAllergyNotes);

  const [subIngredient, setSubIngredient] = useState("");
  const [subContext, setSubContext] = useState("");
  const [subAllergy, setSubAllergy] = useState(suggestedAllergyNotes);

  const [recipeResult, setRecipeResult] = useState<RecipeGenerateShape | null>(
    null,
  );
  const [subResult, setSubResult] = useState<string[] | null>(null);
  const [visionResult, setVisionResult] = useState<string[] | null>(null);

  const [recipeErr, setRecipeErr] = useState<string | null>(null);
  const [subErr, setSubErr] = useState<string | null>(null);
  const [visionErr, setVisionErr] = useState<string | null>(null);

  const [recipeBusy, setRecipeBusy] = useState(false);
  const [subBusy, setSubBusy] = useState(false);
  const [visionBusy, setVisionBusy] = useState(false);

  const runRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlocked) {
      return;
    }
    setRecipeErr(null);
    setRecipeResult(null);
    const ingredients = parseIngredientsInput(recipeIngText);
    if (ingredients.length === 0) {
      setRecipeErr(t("ai_chef_err_need_ingredient"));
      return;
    }
    setRecipeBusy(true);
    try {
      const res = await fetch("/api/ai/recipe-generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients,
          cuisine: cuisine.trim() || undefined,
          difficulty: difficulty.trim() || undefined,
          allergyNotes: recipeAllergy.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        title?: string;
        ingredients?: string[];
        steps?: string[];
        cook_time_minutes?: number;
      };
      if (!res.ok) {
        setRecipeErr(data.error ?? t("ai_chef_err_generic"));
        return;
      }
      setRecipeResult({
        title: data.title ?? "",
        ingredients: data.ingredients ?? [],
        steps: data.steps ?? [],
        cook_time_minutes: Number(data.cook_time_minutes ?? 0),
      });
    } catch {
      setRecipeErr(t("ai_chef_err_network"));
    } finally {
      setRecipeBusy(false);
    }
  };

  const runSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlocked) {
      return;
    }
    setSubErr(null);
    setSubResult(null);
    const ingredient = subIngredient.trim();
    if (!ingredient) {
      setSubErr(t("ai_chef_err_need_replace"));
      return;
    }
    setSubBusy(true);
    try {
      const res = await fetch("/api/ai/substitutions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredient,
          context: subContext.trim() || undefined,
          allergyNotes: subAllergy.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        suggestions?: string[];
      };
      if (!res.ok) {
        setSubErr(data.error ?? t("ai_chef_err_generic"));
        return;
      }
      setSubResult(data.suggestions ?? []);
    } catch {
      setSubErr(t("ai_chef_err_network"));
    } finally {
      setSubBusy(false);
    }
  };

  const runVision = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!unlocked) {
      return;
    }
    setVisionErr(null);
    setVisionResult(null);
    const input = e.currentTarget.elements.namedItem(
      "image",
    ) as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      setVisionErr(t("ai_chef_err_pick_photo"));
      return;
    }
    const fd = new FormData();
    fd.set("image", file);
    setVisionBusy(true);
    try {
      const res = await fetch("/api/ai/vision-ingredients", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = (await res.json()) as {
        error?: string;
        ingredients?: string[];
      };
      if (!res.ok) {
        setVisionErr(data.error ?? t("ai_chef_err_generic"));
        return;
      }
      setVisionResult(data.ingredients ?? []);
      e.currentTarget.reset();
    } catch {
      setVisionErr(t("ai_chef_err_network"));
    } finally {
      setVisionBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-10">
      {!unlocked ? (
        <aside
          className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--primary)_38%,var(--border))] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]"
          aria-live="polite"
        >
          <p className="text-sm font-semibold text-[var(--text)]">
            {t("ai_chef_unlock_title")}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {t("ai_chef_unlock_body")}
          </p>
          <div className="mt-4">
            <UpgradePitch currentPlan={planType} />
          </div>
        </aside>
      ) : null}

      <section
        className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]"
        aria-labelledby="ai-chef-recipe"
      >
        <h2
          id="ai-chef-recipe"
          className="text-lg font-semibold text-[var(--text)]"
        >
          {t("ai_chef_section_recipe_title")}
        </h2>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          {t("ai_chef_section_recipe_sub")}
        </p>
        <form onSubmit={runRecipe} className="mt-4 flex flex-col gap-3">
          <label className="text-sm font-medium text-[var(--text)]" htmlFor="ai-ingredients">
            {t("ai_chef_label_ingredients")}
          </label>
          <textarea
            id="ai-ingredients"
            rows={4}
            value={recipeIngText}
            onChange={(ev) => setRecipeIngText(ev.target.value)}
            placeholder={t("ai_chef_placeholder_ingredients")}
            disabled={!unlocked}
            className="w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--primary)]/25 focus:ring-2 disabled:opacity-60"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--text)]" htmlFor="ai-cuisine">
                {t("ai_chef_label_cuisine_optional")}
              </label>
              <input
                id="ai-cuisine"
                value={cuisine}
                onChange={(ev) => setCuisine(ev.target.value)}
                placeholder={t("ai_chef_placeholder_cuisine")}
                disabled={!unlocked}
                className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--primary)]/25 focus:ring-2 disabled:opacity-60"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                className="text-sm font-medium text-[var(--text)]"
                htmlFor="ai-difficulty"
              >
                {t("ai_chef_label_difficulty_optional")}
              </label>
              <input
                id="ai-difficulty"
                value={difficulty}
                onChange={(ev) => setDifficulty(ev.target.value)}
                placeholder={t("ai_chef_placeholder_difficulty")}
                disabled={!unlocked}
                className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--primary)]/25 focus:ring-2 disabled:opacity-60"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--text)]" htmlFor="ai-recipe-allergy">
              {t("ai_chef_label_allergy_notes")}
            </label>
            <textarea
              id="ai-recipe-allergy"
              rows={2}
              value={recipeAllergy}
              onChange={(ev) => setRecipeAllergy(ev.target.value)}
              placeholder={t("ai_chef_placeholder_allergy_avoid")}
              disabled={!unlocked}
              className="w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--primary)]/25 focus:ring-2 disabled:opacity-60"
            />
          </div>
          <button
            type="submit"
            disabled={!unlocked || recipeBusy}
            className="rounded-[var(--radius-card)] bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[var(--primary-hover)] active:scale-[0.99] disabled:opacity-60"
          >
            {recipeBusy ? t("ai_chef_btn_generate_pending") : t("ai_chef_btn_generate")}
          </button>
          {recipeErr ? (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {recipeErr}
            </p>
          ) : null}
        </form>
        {recipeResult ? (
          <article className="mt-5 border-t border-[var(--border)] pt-5">
            <h3 className="text-base font-semibold text-[var(--text)]">
              {recipeResult.title || t("ai_chef_result_suggested_recipe")}
            </h3>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {t("ai_chef_result_time_note", {
                minutes: recipeResult.cook_time_minutes,
              })}
            </p>
            <h4 className="mt-4 text-sm font-semibold text-[var(--text)]">
              {t("ai_chef_label_ingredients")}
            </h4>
            <ul className="mt-2 list-inside list-disc text-sm text-[var(--text)]">
              {recipeResult.ingredients.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h4 className="mt-4 text-sm font-semibold text-[var(--text)]">
              {t("ai_chef_result_steps")}
            </h4>
            <ol className="mt-2 list-inside list-decimal space-y-2 text-sm text-[var(--text)]">
              {recipeResult.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </article>
        ) : null}
      </section>

      <section
        className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]"
        aria-labelledby="ai-chef-sub"
      >
        <h2 id="ai-chef-sub" className="text-lg font-semibold text-[var(--text)]">
          {t("ai_chef_section_sub_title")}
        </h2>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          {t("ai_chef_section_sub_sub")}
        </p>
        <form onSubmit={runSub} className="mt-4 flex flex-col gap-3">
          <label className="text-sm font-medium text-[var(--text)]" htmlFor="sub-ingredient">
            {t("ai_chef_label_ingredient_replace")}
          </label>
          <input
            id="sub-ingredient"
            value={subIngredient}
            onChange={(ev) => setSubIngredient(ev.target.value)}
            placeholder={t("ai_chef_placeholder_sub_replace")}
            disabled={!unlocked}
            className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--primary)]/25 focus:ring-2 disabled:opacity-60"
          />
          <label className="text-sm font-medium text-[var(--text)]" htmlFor="sub-context">
            {t("ai_chef_label_context_optional")}
          </label>
          <input
            id="sub-context"
            value={subContext}
            onChange={(ev) => setSubContext(ev.target.value)}
            placeholder={t("ai_chef_placeholder_sub_context")}
            disabled={!unlocked}
            className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--primary)]/25 focus:ring-2 disabled:opacity-60"
          />
          <label className="text-sm font-medium text-[var(--text)]" htmlFor="sub-allergy">
            {t("ai_chef_label_allergy_notes")}
          </label>
          <textarea
            id="sub-allergy"
            rows={2}
            value={subAllergy}
            onChange={(ev) => setSubAllergy(ev.target.value)}
            placeholder={t("ai_chef_placeholder_sub_allergy")}
            disabled={!unlocked}
            className="w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--primary)]/25 focus:ring-2 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!unlocked || subBusy}
            className="rounded-[var(--radius-card)] bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[var(--primary-hover)] active:scale-[0.99] disabled:opacity-60"
          >
            {subBusy ? t("ai_chef_btn_substitutions_pending") : t("ai_chef_btn_substitutions")}
          </button>
          {subErr ? (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {subErr}
            </p>
          ) : null}
        </form>
        {subResult?.length ? (
          <ul className="mt-4 list-inside list-disc space-y-1.5 border-t border-[var(--border)] pt-4 text-sm text-[var(--text)]">
            {subResult.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section
        className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]"
        aria-labelledby="ai-chef-vision"
      >
        <h2
          id="ai-chef-vision"
          className="text-lg font-semibold text-[var(--text)]"
        >
          {t("ai_chef_section_vision_title")}
        </h2>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          {t("ai_chef_section_vision_sub")}
        </p>
        <form onSubmit={runVision} className="mt-4 flex flex-col gap-3" encType="multipart/form-data">
          <label className="text-sm font-medium text-[var(--text)]" htmlFor="ai-vision-photo">
            {t("ai_chef_label_image")}
          </label>
          <input
            id="ai-vision-photo"
            name="image"
            type="file"
            accept="image/jpeg,image/png"
            capture="environment"
            disabled={!unlocked}
            className="text-sm text-[var(--text)] file:mr-3 file:rounded-[var(--radius-card)] file:border file:border-[var(--border)] file:bg-[var(--bg)] file:px-3 file:py-2 file:text-sm file:font-medium disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!unlocked || visionBusy}
            className="rounded-[var(--radius-card)] bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[var(--primary-hover)] active:scale-[0.99] disabled:opacity-60"
          >
            {visionBusy ? t("ai_chef_btn_vision_pending") : t("ai_chef_btn_vision")}
          </button>
          {visionErr ? (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {visionErr}
            </p>
          ) : null}
        </form>
        {visionResult?.length ? (
          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {t("ai_chef_vision_suggested_items")}
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {visionResult.map((ing) => (
                <li
                  key={ing}
                  className="rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--primary-muted)_42%,transparent)] px-3 py-1 text-xs font-semibold text-[var(--primary)]"
                >
                  {ing}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
