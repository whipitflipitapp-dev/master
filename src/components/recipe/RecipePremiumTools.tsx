"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";

import { updateRecipe } from "@/app/actions/recipes";
import { UpgradePitch } from "@/components/billing/UpgradePitch";
import { RecipeUploadProgressPanel } from "@/components/recipe/RecipeUploadProgressPanel";
import {
  RecipeGalleryReorder,
  type GalleryReorderItem,
} from "@/components/recipe/RecipeGalleryReorder";
import { PREMIUM_RECIPE_TOOLS_PLAN_REQUIRED_ERROR } from "@/lib/premium-recipe-tools-plan-gate";
import type { PlanType } from "@/lib/plan";
import { RECIPE_REEL_ACCEPT } from "@/lib/recipe-reel";
import { validateRecipeReelFileDuration } from "@/lib/recipe-reel-duration-client";
import { attachHostedReelToFormData } from "@/lib/recipe-reel-upload-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { formatIngredientLineForRecipeInput } from "@/lib/ingredients";
import { parseRecipeVideoUrl } from "@/lib/video-url";

type RecipeToolIngredient = {
  name: string;
  quantity: string | null;
  priceCents?: number | null;
};

type RecipePremiumToolsProps = {
  recipe: {
    id: string;
    title: string;
    instructions: string;
    videoUrl?: string | null;
    hostedReelUrl?: string | null;
  };
  ingredients: RecipeToolIngredient[];
  galleryPhotos: GalleryReorderItem[];
  planType: PlanType;
  canUseTools: boolean;
  canEdit: boolean;
  labels: {
    heading: string;
    lockedTitle: string;
    lockedBody: string;
    exportIntro: string;
    print: string;
    downloadMarkdown: string;
    downloadCsv: string;
    editHeading: string;
    titleLabel: string;
    ingredientsLabel: string;
    instructionsLabel: string;
    videoLabel: string;
    videoHint: string;
    videoPlaceholder: string;
    save: string;
    saving: string;
    saved: string;
    ownerOnly: string;
    planRequiredError: string;
    galleryHeading: string;
    galleryHint: string;
    galleryCoverLabel: string;
    gallerySetCoverLabel: string;
    galleryMoveEarlier: string;
    galleryMoveLater: string;
    hostedReelLabel: string;
    hostedReelHint: string;
    hostedReelCurrent: string;
    uploadProgressTitle: string;
    uploadingReelLabel: string;
    uploadWarning: string;
    uploadFailedTitle: string;
    uploadRetry: string;
  };
};

function slugForFileName(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "recipe";
}

function downloadTextFile(fileName: string, mimeType: string, text: string) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function RecipePremiumTools({
  recipe,
  ingredients,
  galleryPhotos,
  planType,
  canUseTools,
  canEdit,
  labels,
}: RecipePremiumToolsProps) {
  const [state, formAction, actionPending] = useActionState(updateRecipe, {
    error: null,
    success: null,
  });
  const [reelFile, setReelFile] = useState<File | null>(null);
  const [reelDurationSeconds, setReelDurationSeconds] = useState<number | null>(
    null,
  );
  const [reelProbeError, setReelProbeError] = useState<string | null>(null);
  const [reelUploadError, setReelUploadError] = useState<string | null>(null);
  const [reelUploadProgress, setReelUploadProgress] = useState<number | null>(
    null,
  );
  const [reelUploading, setReelUploading] = useState(false);
  const [transitionPending, startTransition] = useTransition();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const pending = actionPending || transitionPending;

  const [galleryItems, setGalleryItems] = useState<GalleryReorderItem[]>(
    galleryPhotos,
  );

  useEffect(() => {
    setGalleryItems(galleryPhotos);
  }, [galleryPhotos]);

  const galleryOrderJson = useMemo(
    () => JSON.stringify(galleryItems.map((item) => item.imageUrl)),
    [galleryItems],
  );

  const ingredientText = useMemo(
    () =>
      ingredients
        .map((ingredient) =>
          formatIngredientLineForRecipeInput({
            name: ingredient.name,
            quantity: ingredient.quantity,
            priceCents: ingredient.priceCents,
          }),
        )
        .join("\n"),
    [ingredients],
  );

  const videoUrlFieldDefault = useMemo(() => {
    const raw = recipe.videoUrl?.trim() ?? "";
    if (!raw) return "";
    const parsed = parseRecipeVideoUrl(raw);
    return parsed?.provider === "youtube" ? parsed.canonicalUrl : "";
  }, [recipe.videoUrl]);

  const markdown = useMemo(
    () =>
      [
        `# ${recipe.title}`,
        "",
        "## Ingredients",
        ...ingredients.map((ingredient) =>
          ingredient.quantity
            ? `- ${ingredient.quantity} ${ingredient.name}`
            : `- ${ingredient.name}`,
        ),
        "",
        "## Instructions",
        recipe.instructions,
      ].join("\n"),
    [ingredients, recipe.instructions, recipe.title],
  );

  const csv = useMemo(
    () =>
      [
        ["recipe_title", "section", "quantity", "item", "instructions"]
          .map(csvCell)
          .join(","),
        ...ingredients.map((ingredient) =>
          [
            recipe.title,
            "ingredient",
            ingredient.quantity ?? "",
            ingredient.name,
            "",
          ]
            .map(csvCell)
            .join(","),
        ),
        [recipe.title, "instructions", "", "", recipe.instructions]
          .map(csvCell)
          .join(","),
      ].join("\n"),
    [ingredients, recipe.instructions, recipe.title],
  );

  const fileSlug = slugForFileName(recipe.title);
  const errorDisplay =
    state.error === PREMIUM_RECIPE_TOOLS_PLAN_REQUIRED_ERROR
      ? labels.planRequiredError
      : state.error;

  if (!canUseTools) {
    return (
      <section
        id="premium-tools"
        className="mt-12 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]"
      >
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text)]">
          {labels.heading}
        </h2>
        <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] p-4">
          <p className="font-semibold text-[var(--text)]">{labels.lockedTitle}</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            {labels.lockedBody}
          </p>
          <div className="mt-4">
            <UpgradePitch currentPlan={planType} compact showLogo={false} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="premium-tools"
      className="mt-12 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]"
    >
      <h2 className="text-xl font-semibold tracking-tight text-[var(--text)]">
        {labels.heading}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
        {labels.exportIntro}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))]"
        >
          {labels.print}
        </button>
        <button
          type="button"
          onClick={() =>
            downloadTextFile(`${fileSlug}.md`, "text/markdown;charset=utf-8", markdown)
          }
          className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))]"
        >
          {labels.downloadMarkdown}
        </button>
        <button
          type="button"
          onClick={() =>
            downloadTextFile(`${fileSlug}.csv`, "text/csv;charset=utf-8", csv)
          }
          className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))]"
        >
          {labels.downloadCsv}
        </button>
      </div>

      <div className="mt-6 border-t border-[var(--border)] pt-5">
        <h3 className="text-lg font-semibold text-[var(--text)]">
          {labels.editHeading}
        </h3>
        {canEdit ? (
          <form
            className="mt-4 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setReelUploadError(null);
              setReelUploadProgress(null);
              const formData = new FormData(e.currentTarget);
              if (reelFile) {
                if (reelDurationSeconds == null) {
                  setReelUploadError(
                    "Wait for reel length to finish checking, or choose another file.",
                  );
                  return;
                }
                setReelUploading(true);
                const {
                  data: { user },
                } = await supabase.auth.getUser();
                if (!user) {
                  setReelUploadError("Sign in required.");
                  setReelUploading(false);
                  return;
                }
                const reelErr = await attachHostedReelToFormData({
                  supabase,
                  userId: user.id,
                  file: reelFile,
                  formData,
                  knownDurationSeconds: reelDurationSeconds,
                  onUploadProgress: (p) => setReelUploadProgress(p.percent),
                });
                setReelUploading(false);
                if (reelErr) {
                  setReelUploadError(reelErr);
                  return;
                }
              }
              startTransition(() => {
                formAction(formData);
              });
            }}
          >
            <input type="hidden" name="recipe_id" value={recipe.id} />
            {reelUploading ? (
              <RecipeUploadProgressPanel
                title={labels.uploadProgressTitle}
                phaseLabel={labels.uploadingReelLabel}
                warningText={labels.uploadWarning}
                progressPercent={reelUploadProgress}
              />
            ) : null}
            {reelUploadError && !reelUploading ? (
              <RecipeUploadProgressPanel
                title={labels.uploadFailedTitle}
                phaseLabel={labels.uploadFailedTitle}
                warningText=""
                progressPercent={reelUploadProgress}
                failed
                failedMessage={reelUploadError}
                retryLabel={labels.uploadRetry}
                onRetry={() => {
                  setReelUploadError(null);
                  setReelUploadProgress(null);
                }}
              />
            ) : null}
            {galleryItems.length > 0 ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
                <h4 className="text-sm font-semibold text-[var(--text)]">
                  {labels.galleryHeading}
                </h4>
                <div className="mt-3">
                  <RecipeGalleryReorder
                    items={galleryItems}
                    onChange={setGalleryItems}
                    disabled={pending}
                    hint={labels.galleryHint}
                    coverLabel={labels.galleryCoverLabel}
                    setCoverLabel={labels.gallerySetCoverLabel}
                    moveEarlierLabel={labels.galleryMoveEarlier}
                    moveLaterLabel={labels.galleryMoveLater}
                    allowRemove={false}
                  />
                </div>
                <input
                  type="hidden"
                  name="gallery_image_urls_order"
                  value={galleryOrderJson}
                  readOnly
                />
              </div>
            ) : null}
            <label className="block text-sm font-semibold text-[var(--text)]">
              {labels.titleLabel}
              <input
                name="title"
                required
                maxLength={200}
                defaultValue={recipe.title}
                className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)]"
              />
            </label>
            <label className="block text-sm font-semibold text-[var(--text)]">
              {labels.ingredientsLabel}
              <textarea
                name="ingredients"
                required
                rows={Math.min(10, Math.max(4, ingredients.length))}
                defaultValue={ingredientText}
                className="mt-1.5 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)]"
              />
            </label>
            <label className="block text-sm font-semibold text-[var(--text)]">
              {labels.instructionsLabel}
              <textarea
                name="instructions"
                required
                rows={6}
                maxLength={12000}
                defaultValue={recipe.instructions}
                className="mt-1.5 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)]"
              />
            </label>
            <label className="block text-sm font-semibold text-[var(--text)]">
              {labels.videoLabel}
              <span className="mt-1 block text-[length:var(--text-caption)] font-normal text-[var(--muted)]">
                {labels.videoHint}
              </span>
              <input
                name="video_url"
                type="text"
                inputMode="url"
                autoComplete="off"
                maxLength={2048}
                defaultValue={videoUrlFieldDefault}
                placeholder={labels.videoPlaceholder}
                className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)]"
              />
            </label>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
              <p className="text-sm font-semibold text-[var(--text)]">
                {labels.hostedReelLabel}
              </p>
              <p className="mt-1 text-[length:var(--text-caption)] text-[var(--muted)]">
                {labels.hostedReelHint}
              </p>
              {recipe.hostedReelUrl ? (
                <p className="mt-2 text-[length:var(--text-caption)] text-[var(--text)]">
                  {labels.hostedReelCurrent}
                </p>
              ) : null}
              <input
                type="file"
                accept={RECIPE_REEL_ACCEPT}
                disabled={pending}
                onChange={async (e) => {
                  const file = e.target.files?.[0] ?? null;
                  setReelFile(file);
                  setReelDurationSeconds(null);
                  setReelProbeError(null);
                  setReelUploadError(null);
                  if (!file) return;
                  const err = await validateRecipeReelFileDuration(file);
                  if (err) {
                    setReelProbeError(err);
                    setReelFile(null);
                    e.target.value = "";
                    return;
                  }
                  try {
                    const { measureVideoFileDurationSeconds } = await import(
                      "@/lib/recipe-reel-duration-client"
                    );
                    setReelDurationSeconds(
                      await measureVideoFileDurationSeconds(file),
                    );
                  } catch {
                    setReelProbeError(
                      "Could not read reel length. Try another file.",
                    );
                    setReelFile(null);
                    e.target.value = "";
                  }
                }}
                className="mt-3 text-sm text-[var(--text)] file:mr-3 file:rounded-lg file:border file:border-[var(--border)] file:bg-[var(--bg)] file:px-3 file:py-1.5 file:text-sm file:font-semibold"
              />
              {reelProbeError ? (
                <p className="mt-2 text-sm text-[var(--danger)]" role="alert">
                  {reelProbeError}
                </p>
              ) : null}
            </div>
            {reelUploadError ? (
              <p className="text-sm text-[var(--danger)]" role="alert">
                {reelUploadError}
              </p>
            ) : null}
            {errorDisplay ? (
              <p className="text-sm text-[var(--danger)]" role="alert">
                {errorDisplay}
              </p>
            ) : null}
            {state.success ? (
              <p className="text-sm font-medium text-[var(--primary)]" role="status">
                {labels.saved}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={pending || reelUploading}
              className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
            >
              {pending || reelUploading ? labels.saving : labels.save}
            </button>
          </form>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            {labels.ownerOnly}
          </p>
        )}
      </div>
    </section>
  );
}
