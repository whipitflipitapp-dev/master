"use client";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { createRecipeFromForm } from "@/app/actions/recipes";
import { UpgradePitch } from "@/components/billing/UpgradePitch";
import type {
  CameraCheckInShape,
  CookingAssistantShape,
  RecipeGenerateShape,
  SubstitutionSuggestion,
  VisionIngredientsShape,
} from "@/lib/ai/sanitize-output";
import type { PlanType } from "@/lib/plan";
import { isAiChef } from "@/lib/plan";

type Props = {
  planType: PlanType;
  suggestedAllergyNotes: string;
  initialPantryItems: string[];
};

function parseIngredientsInput(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 24);
}

export function AiChefWorkbench(props: Props) {
  const { planType, suggestedAllergyNotes, initialPantryItems } = props;
  const { t } = useTranslation("common");
  const unlocked = isAiChef(planType);
  const pantryText = initialPantryItems.join(", ");

  const [recipeIngText, setRecipeIngText] = useState(pantryText);
  const [cuisine, setCuisine] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [recipeAllergy, setRecipeAllergy] = useState(suggestedAllergyNotes);

  const [subIngredient, setSubIngredient] = useState("");
  const [subContext, setSubContext] = useState("");
  const [subAllergy, setSubAllergy] = useState(suggestedAllergyNotes);
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantIngredients, setAssistantIngredients] = useState(pantryText);
  const [checkInQuestion, setCheckInQuestion] = useState("");

  const [recipeResult, setRecipeResult] = useState<RecipeGenerateShape | null>(
    null,
  );
  const [subResult, setSubResult] = useState<SubstitutionSuggestion[] | null>(
    null,
  );
  const [visionResult, setVisionResult] = useState<VisionIngredientsShape | null>(
    null,
  );
  const [assistantResult, setAssistantResult] =
    useState<CookingAssistantShape | null>(null);
  const [checkInResult, setCheckInResult] = useState<
    (CameraCheckInShape & { usage?: { used: number; limit: number } }) | null
  >(null);

  const [recipeErr, setRecipeErr] = useState<string | null>(null);
  const [subErr, setSubErr] = useState<string | null>(null);
  const [visionErr, setVisionErr] = useState<string | null>(null);
  const [assistantErr, setAssistantErr] = useState<string | null>(null);
  const [checkInErr, setCheckInErr] = useState<string | null>(null);

  const [recipeBusy, setRecipeBusy] = useState(false);
  const [subBusy, setSubBusy] = useState(false);
  const [visionBusy, setVisionBusy] = useState(false);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [checkInBusy, setCheckInBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

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
        substitutions?: SubstitutionSuggestion[];
      };
      if (!res.ok) {
        setSubErr(data.error ?? t("ai_chef_err_generic"));
        return;
      }
      setSubResult(data.substitutions ?? []);
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
        dish_name?: string | null;
        suggested_actions?: string[];
      };
      if (!res.ok) {
        setVisionErr(data.error ?? t("ai_chef_err_generic"));
        return;
      }
      const nextVision = {
        dish_name: data.dish_name ?? null,
        ingredients: data.ingredients ?? [],
        suggested_actions: data.suggested_actions ?? [],
      };
      setVisionResult(nextVision);
      if (nextVision.ingredients.length > 0) {
        setRecipeIngText(nextVision.ingredients.join(", "));
        setAssistantIngredients(nextVision.ingredients.join(", "));
      }
      e.currentTarget.reset();
    } catch {
      setVisionErr(t("ai_chef_err_network"));
    } finally {
      setVisionBusy(false);
    }
  };

  const runAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlocked) {
      return;
    }
    setAssistantErr(null);
    setAssistantResult(null);
    const currentIngredients = parseIngredientsInput(assistantIngredients);
    const question = assistantQuestion.trim();
    if (!question && currentIngredients.length === 0) {
      setAssistantErr(t("ai_chef_err_need_assistant_input"));
      return;
    }
    setAssistantBusy(true);
    try {
      const res = await fetch("/api/ai/cooking-assistant", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question || undefined,
          currentIngredients,
        }),
      });
      const data = (await res.json()) as Partial<CookingAssistantShape> & {
        error?: string;
      };
      if (!res.ok) {
        setAssistantErr(data.error ?? t("ai_chef_err_generic"));
        return;
      }
      setAssistantResult({
        answer: data.answer ?? "",
        suggested_meals: data.suggested_meals ?? [],
        used_pantry_items: data.used_pantry_items ?? [],
        next_steps: data.next_steps ?? [],
      });
    } catch {
      setAssistantErr(t("ai_chef_err_network"));
    } finally {
      setAssistantBusy(false);
    }
  };

  const runCheckIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!unlocked) {
      return;
    }
    setCheckInErr(null);
    setCheckInResult(null);
    const input = e.currentTarget.elements.namedItem(
      "image",
    ) as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      setCheckInErr(t("ai_chef_err_pick_check_in_photo"));
      return;
    }
    if (!file.type.toLowerCase().startsWith("image/")) {
      setCheckInErr(t("ai_chef_err_check_in_type"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCheckInErr(t("ai_chef_err_check_in_size"));
      return;
    }
    const question = checkInQuestion.trim().slice(0, 500);
    const fd = new FormData();
    fd.set("image", file);
    if (question) {
      fd.set("question", question);
    }
    setCheckInBusy(true);
    try {
      const res = await fetch("/api/ai/camera-check-in", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = (await res.json()) as Partial<CameraCheckInShape> & {
        error?: string;
        code?: string;
        usage?: { used?: number; limit?: number };
      };
      if (!res.ok) {
        if (data.code === "camera_check_in_monthly_limit") {
          setCheckInErr(t("ai_chef_err_check_in_monthly_limit"));
          return;
        }
        setCheckInErr(data.error ?? t("ai_chef_err_generic"));
        return;
      }
      setCheckInResult({
        guidance: data.guidance ?? "",
        food_safety_caution: data.food_safety_caution ?? null,
        next_step: data.next_step ?? "",
        usage:
          typeof data.usage?.used === "number" &&
          typeof data.usage?.limit === "number"
            ? { used: data.usage.used, limit: data.usage.limit }
            : undefined,
      });
      e.currentTarget.reset();
      setCheckInQuestion("");
    } catch {
      setCheckInErr(t("ai_chef_err_network"));
    } finally {
      setCheckInBusy(false);
    }
  };

  const saveGeneratedRecipe = async () => {
    if (!recipeResult || saveBusy) {
      return;
    }
    setRecipeErr(null);
    setSaveBusy(true);
    const formData = new FormData();
    formData.set("title", recipeResult.title || t("ai_chef_result_suggested_recipe"));
    formData.set("ingredients", recipeResult.ingredients.join("\n"));
    formData.set("instructions", recipeResult.steps.join("\n\n"));
    if (
      Number.isInteger(recipeResult.cook_time_minutes) &&
      recipeResult.cook_time_minutes > 0
    ) {
      formData.set("cook_time_minutes", String(recipeResult.cook_time_minutes));
    }
    const normalizedDifficulty = difficulty.trim().toLowerCase();
    if (["easy", "medium", "hard"].includes(normalizedDifficulty)) {
      formData.set("difficulty", normalizedDifficulty);
    }
    formData.set("tags", "AI Chef");
    try {
      const result = await createRecipeFromForm(formData);
      if (result?.error) {
        setRecipeErr(result.error);
        setSaveBusy(false);
      }
    } catch (err) {
      if (!isRedirectError(err)) {
        setRecipeErr(t("ai_chef_err_save_recipe"));
        setSaveBusy(false);
        return;
      }
      throw err;
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
            <button
              type="button"
              onClick={saveGeneratedRecipe}
              disabled={saveBusy}
              className="mt-5 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_10%,var(--bg))] disabled:opacity-60"
            >
              {saveBusy
                ? t("ai_chef_btn_save_recipe_pending")
                : t("ai_chef_btn_save_recipe")}
            </button>
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
          <ul className="mt-4 space-y-3 border-t border-[var(--border)] pt-4 text-sm text-[var(--text)]">
            {subResult.map((item) => (
              <li
                key={`${item.ingredient}-${item.quantity_guidance}`}
                className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] p-3"
              >
                <p className="font-semibold">{item.ingredient}</p>
                <p className="mt-1">{item.quantity_guidance}</p>
                <p className="mt-1 text-[var(--muted)]">{item.rationale}</p>
                {item.dietary_notes ? (
                  <p className="mt-1 text-[var(--muted)]">
                    {item.dietary_notes}
                  </p>
                ) : null}
              </li>
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
        {visionResult ? (
          <div className="mt-4 border-t border-[var(--border)] pt-4">
            {visionResult.dish_name ? (
              <p className="mb-3 text-sm font-semibold text-[var(--text)]">
                {t("ai_chef_vision_dish_label")}: {visionResult.dish_name}
              </p>
            ) : null}
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {t("ai_chef_vision_suggested_items")}
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {visionResult.ingredients.map((ing) => (
                <li
                  key={ing}
                  className="rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--primary-muted)_42%,transparent)] px-3 py-1 text-xs font-semibold text-[var(--primary)]"
                >
                  {ing}
                </li>
              ))}
            </ul>
            {visionResult.suggested_actions.length ? (
              <ul className="mt-4 list-inside list-disc space-y-1.5 text-sm text-[var(--text)]">
                {visionResult.suggested_actions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            ) : null}
            {visionResult.ingredients.length ? (
              <button
                type="button"
                onClick={() => {
                  const text = visionResult.ingredients.join(", ");
                  setRecipeIngText(text);
                  setAssistantIngredients(text);
                }}
                className="mt-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_10%,var(--bg))]"
              >
                {t("ai_chef_btn_use_detected")}
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      <section
        className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]"
        aria-labelledby="ai-chef-camera-check-in"
      >
        <h2
          id="ai-chef-camera-check-in"
          className="text-lg font-semibold text-[var(--text)]"
        >
          {t("ai_chef_section_check_in_title")}
        </h2>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          {t("ai_chef_section_check_in_sub")}
        </p>
        <form
          onSubmit={runCheckIn}
          className="mt-4 flex flex-col gap-3"
          encType="multipart/form-data"
        >
          <label className="text-sm font-medium text-[var(--text)]" htmlFor="ai-check-in-photo">
            {t("ai_chef_label_check_in_image")}
          </label>
          <input
            id="ai-check-in-photo"
            name="image"
            type="file"
            accept="image/*"
            capture="environment"
            disabled={!unlocked}
            className="text-sm text-[var(--text)] file:mr-3 file:rounded-[var(--radius-card)] file:border file:border-[var(--border)] file:bg-[var(--bg)] file:px-3 file:py-2 file:text-sm file:font-medium disabled:opacity-60"
          />
          <label className="text-sm font-medium text-[var(--text)]" htmlFor="ai-check-in-question">
            {t("ai_chef_label_check_in_question")}
          </label>
          <textarea
            id="ai-check-in-question"
            rows={3}
            maxLength={500}
            value={checkInQuestion}
            onChange={(ev) => setCheckInQuestion(ev.target.value)}
            placeholder={t("ai_chef_placeholder_check_in_question")}
            disabled={!unlocked}
            className="w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--primary)]/25 focus:ring-2 disabled:opacity-60"
          />
          <div className="flex flex-wrap gap-2" aria-label={t("ai_chef_check_in_examples_label")}>
            {[
              "ai_chef_check_in_example_browned",
              "ai_chef_check_in_example_next",
              "ai_chef_check_in_example_done",
            ].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setCheckInQuestion(t(key))}
                disabled={!unlocked}
                className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_10%,var(--bg))] disabled:opacity-60"
              >
                {t(key)}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--muted)]">
            {t("ai_chef_check_in_limit_note")}
          </p>
          <button
            type="submit"
            disabled={!unlocked || checkInBusy}
            className="rounded-[var(--radius-card)] bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[var(--primary-hover)] active:scale-[0.99] disabled:opacity-60"
          >
            {checkInBusy
              ? t("ai_chef_btn_check_in_pending")
              : t("ai_chef_btn_check_in")}
          </button>
          {checkInErr ? (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {checkInErr}
            </p>
          ) : null}
        </form>
        {checkInResult ? (
          <article className="mt-5 border-t border-[var(--border)] pt-5 text-sm text-[var(--text)]">
            <h3 className="font-semibold">
              {t("ai_chef_check_in_guidance")}
            </h3>
            <p className="mt-2 whitespace-pre-wrap leading-relaxed">
              {checkInResult.guidance}
            </p>
            {checkInResult.food_safety_caution ? (
              <>
                <h3 className="mt-4 font-semibold">
                  {t("ai_chef_check_in_safety")}
                </h3>
                <p className="mt-2 leading-relaxed">
                  {checkInResult.food_safety_caution}
                </p>
              </>
            ) : null}
            <h3 className="mt-4 font-semibold">
              {t("ai_chef_check_in_next_step")}
            </h3>
            <p className="mt-2 leading-relaxed">{checkInResult.next_step}</p>
            {checkInResult.usage ? (
              <p className="mt-4 text-xs text-[var(--muted)]">
                {t("ai_chef_check_in_usage", {
                  used: checkInResult.usage.used,
                  limit: checkInResult.usage.limit,
                })}
              </p>
            ) : null}
          </article>
        ) : null}
      </section>

      <section
        className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]"
        aria-labelledby="ai-chef-assistant"
      >
        <h2
          id="ai-chef-assistant"
          className="text-lg font-semibold text-[var(--text)]"
        >
          {t("ai_chef_section_assistant_title")}
        </h2>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          {t("ai_chef_section_assistant_sub")}
        </p>
        <form onSubmit={runAssistant} className="mt-4 flex flex-col gap-3">
          <label
            className="text-sm font-medium text-[var(--text)]"
            htmlFor="assistant-question"
          >
            {t("ai_chef_label_assistant_question")}
          </label>
          <textarea
            id="assistant-question"
            rows={3}
            value={assistantQuestion}
            onChange={(ev) => setAssistantQuestion(ev.target.value)}
            placeholder={t("ai_chef_placeholder_assistant_question")}
            disabled={!unlocked}
            className="w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--primary)]/25 focus:ring-2 disabled:opacity-60"
          />
          <label
            className="text-sm font-medium text-[var(--text)]"
            htmlFor="assistant-ingredients"
          >
            {t("ai_chef_label_assistant_ingredients")}
          </label>
          <textarea
            id="assistant-ingredients"
            rows={3}
            value={assistantIngredients}
            onChange={(ev) => setAssistantIngredients(ev.target.value)}
            placeholder={t("ai_chef_placeholder_assistant_ingredients")}
            disabled={!unlocked}
            className="w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--primary)]/25 focus:ring-2 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!unlocked || assistantBusy}
            className="rounded-[var(--radius-card)] bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[var(--primary-hover)] active:scale-[0.99] disabled:opacity-60"
          >
            {assistantBusy
              ? t("ai_chef_btn_assistant_pending")
              : t("ai_chef_btn_assistant")}
          </button>
          {assistantErr ? (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {assistantErr}
            </p>
          ) : null}
        </form>
        {assistantResult ? (
          <article className="mt-5 border-t border-[var(--border)] pt-5 text-sm text-[var(--text)]">
            <p className="whitespace-pre-wrap leading-relaxed">
              {assistantResult.answer}
            </p>
            {assistantResult.suggested_meals.length ? (
              <>
                <h3 className="mt-4 font-semibold">
                  {t("ai_chef_result_suggested_meals")}
                </h3>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {assistantResult.suggested_meals.map((meal) => (
                    <li key={meal}>{meal}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {assistantResult.used_pantry_items.length ? (
              <>
                <h3 className="mt-4 font-semibold">
                  {t("ai_chef_result_used_pantry")}
                </h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {assistantResult.used_pantry_items.map((item) => (
                    <li
                      key={item}
                      className="rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--primary-muted)_42%,transparent)] px-3 py-1 text-xs font-semibold text-[var(--primary)]"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {assistantResult.next_steps.length ? (
              <>
                <h3 className="mt-4 font-semibold">
                  {t("ai_chef_result_next_steps")}
                </h3>
                <ol className="mt-2 list-inside list-decimal space-y-1">
                  {assistantResult.next_steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </>
            ) : null}
          </article>
        ) : null}
      </section>
    </div>
  );
}
