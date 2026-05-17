"use client";

import Image from "next/image";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useEffect, useId, useMemo, useState } from "react";

import { createRecipeFromForm } from "@/app/actions/recipes";
import { UpgradePitch } from "@/components/billing/UpgradePitch";
import { suggestAllergenIdsFromText } from "@/lib/allergen-detect";
import type { PlanType } from "@/lib/plan";
import {
  RECIPE_IMAGE_ACCEPT,
  RECIPE_IMAGE_BUCKET,
  RECIPE_IMAGE_MAX_BYTES,
  recipeStorageExtensionFromMime,
  validateRecipeImageFile,
} from "@/lib/recipe-image";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Allergen = { id: string; name: string };

type CategoryOption = { value: string; label: string };

export function AddRecipeForm({
  allergens,
  categoryOptions,
  categoriesLabel,
  categoriesHint,
  extraTagsLabel,
  extraTagsHint,
  extraTagsPlaceholder,
  initialError,
  atLimit,
  limitNotice,
  submitBlockedLabel,
  planForPitch,
}: {
  allergens: Allergen[];
  categoryOptions: CategoryOption[];
  categoriesLabel: string;
  categoriesHint: string;
  extraTagsLabel: string;
  extraTagsHint: string;
  extraTagsPlaceholder: string;
  /** Already decoded route error query (if present). */
  initialError: string | null;
  /** Free tier reached monthly recipe cap (server); disables submit. */
  atLimit?: boolean;
  /** Localized notice when `atLimit`. */
  limitNotice?: string;
  submitBlockedLabel?: string;
  /** Plan for upgrade pitch (typically `free` when capped). */
  planForPitch?: PlanType;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ingredientDraft, setIngredientDraft] = useState("");
  const [allergenSelected, setAllergenSelected] = useState<Set<string>>(
    () => new Set(),
  );
  const [categoriesSelected, setCategoriesSelected] = useState<Set<string>>(
    () => new Set(),
  );
  const categoriesLabelId = useId();

  const suggestionIds = useMemo(
    () => suggestAllergenIdsFromText(ingredientDraft, allergens),
    [ingredientDraft, allergens],
  );
  const suggestionLabels = useMemo(() => {
    const idToName = new Map(allergens.map((a) => [a.id, a.name] as const));
    return suggestionIds.map((id) => idToName.get(id)).filter(Boolean) as string[];
  }, [suggestionIds, allergens]);

  const busy = submitting;
  const capped = Boolean(atLimit);
  const pitchPlan = planForPitch ?? "free";
  const allergensPresentLabelId = useId();

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  function handleFileChange(ev: React.ChangeEvent<HTMLInputElement>) {
    setLocalError(null);
    const next = ev.target.files?.[0];
    ev.target.value = "";
    if (!next) {
      setFile(null);
      setPreview((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    const err = validateRecipeImageFile(next);
    if (err) {
      setLocalError(err);
      setFile(null);
      setPreview((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    setFile(next);
    setPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(next);
    });
  }

  async function handleSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (capped || busy) return;
    setLocalError(null);
    setSubmitting(true);

    const form = ev.currentTarget;
    const formData = new FormData(form);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      setSubmitting(false);
      setLocalError("Sign in required to add a recipe.");
      return;
    }

    if (file) {
      const mimeErr = validateRecipeImageFile(file);
      if (mimeErr) {
        setSubmitting(false);
        setLocalError(mimeErr);
        return;
      }
      const ext = recipeStorageExtensionFromMime(file.type);
      if (!ext) {
        setSubmitting(false);
        setLocalError("Only PNG or JPEG images are allowed.");
        return;
      }

      const objectPath = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(RECIPE_IMAGE_BUCKET)
        .upload(objectPath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        setSubmitting(false);
        setLocalError(uploadError.message);
        return;
      }

      const { data: pub } = supabase.storage.from(RECIPE_IMAGE_BUCKET).getPublicUrl(objectPath);
      formData.set("image_url", pub.publicUrl);
    } else {
      formData.delete("image_url");
    }

    try {
      await createRecipeFromForm(formData);
    } catch (e: unknown) {
      if (!isRedirectError(e)) {
        setSubmitting(false);
      }
      throw e;
    }
  }

  const banner =
    initialError !== null &&
    typeof initialError === "string" &&
    initialError.length > 0
      ? initialError
      : null;

  const errorText = localError ?? banner;

  return (
    <form className="mt-8 flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
      {errorText ? (
        <p
          className="rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 py-2 text-[length:var(--text-meta)] text-[var(--danger)]"
          role="alert"
        >
          {errorText}
        </p>
      ) : null}

      {capped ? (
        <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)]">
          <p className="text-sm leading-relaxed text-[var(--text)]">
            {limitNotice ??
              "You've reached this month's recipe limit on the Free plan. Upgrade for unlimited uploads."}
          </p>
          <UpgradePitch currentPlan={pitchPlan} compact showLogo={false} />
        </div>
      ) : null}

      <section className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[length:var(--text-meta)] font-semibold text-[var(--text)]">
            Recipe photo
          </h2>
          <span className="text-[length:var(--text-caption)] text-[var(--muted)]">Optional</span>
        </div>
        <p className="text-[length:var(--text-caption)] text-[var(--muted)]">
          PNG or JPEG, up to {Math.round(RECIPE_IMAGE_MAX_BYTES / (1024 * 1024))}MB. Paste a video link
          below — no video uploads.
        </p>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row">
          <label className="flex min-h-[11rem] max-w-md flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] px-4 py-6 text-center transition-[border-color] hover:border-[var(--primary)]">
            <input
              type="file"
              accept={RECIPE_IMAGE_ACCEPT}
              className="sr-only"
              disabled={capped}
              onChange={handleFileChange}
            />
            <span className="text-sm font-semibold text-[var(--primary)]">
              Choose image
            </span>
            <span className="mt-2 text-[length:var(--text-caption)] text-[var(--muted)]">
              .png · .jpg · .jpeg — GIF and WebP not supported
            </span>
          </label>

          {preview ? (
            <div className="relative h-44 w-full max-w-[16rem] overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--muted)_30%,transparent)] bg-[color-mix(in_srgb,var(--bg)_94%,transparent)] shadow-[var(--shadow-card)] sm:h-auto sm:flex-1 sm:self-stretch">
              <Image
                src={preview}
                alt="Recipe preview"
                fill
                sizes="(max-width: 640px) 100vw, 16rem"
                className="object-cover"
                unoptimized={preview.startsWith("blob:")}
              />
              <button
                type="button"
                aria-label="Remove selected recipe photo"
                disabled={capped}
                className="absolute right-2 top-2 rounded-lg bg-black/55 px-2 py-1 text-[length:var(--text-caption)] font-medium text-white disabled:opacity-50"
                onClick={() => {
                  setFile(null);
                  setPreview((prev) => {
                    if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
                    return null;
                  });
                }}
      >
        Remove photo
              </button>
            </div>
          ) : (
            <p className="flex flex-1 items-center rounded-xl bg-[color-mix(in_srgb,var(--primary-muted)_52%,transparent)] px-4 py-3 text-[length:var(--text-caption)] leading-relaxed text-[var(--muted)]">
              Recipe cards load faster when you attach a thumbnail — like cookbook covers on Cookpad,
              minus the glare.
            </p>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm font-medium text-[var(--text)]">
          Recipe title
        </label>
        <input
          id="title"
          name="title"
          required
          disabled={busy || capped}
          className="rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--primary)]/30 focus:ring-2"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="ingredients" className="text-sm font-medium text-[var(--text)]">
          Ingredients
        </label>
        <textarea
          id="ingredients"
          name="ingredients"
          required
          disabled={busy || capped}
          rows={6}
          value={ingredientDraft}
          onChange={(e) => setIngredientDraft(e.target.value)}
          placeholder={"2 cups flour, salt, olive oil\nor one item per line"}
          className="rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--primary)]/30 focus:ring-2"
        />
        <span className="text-[length:var(--text-caption)] text-[var(--muted)]">
          Separate with commas, semicolons, or new lines — saved for Help me cook matching.
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="instructions" className="text-sm font-medium text-[var(--text)]">
          Directions
        </label>
        <textarea
          id="instructions"
          name="instructions"
          required
          disabled={busy || capped}
          rows={8}
          placeholder="Explain each step plainly — timings and heat matter."
          className="rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--primary)]/30 focus:ring-2"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="video_url" className="text-sm font-medium text-[var(--text)]">
          YouTube URL
        </label>
        <p className="text-[length:var(--text-caption)] text-[var(--muted)]">
          Paste only a YouTube link — there is no video upload field.
        </p>
        <input
          id="video_url"
          name="video_url"
          type="url"
          disabled={busy || capped}
          placeholder="https://www.youtube.com/watch?v=..."
          className="rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--primary)]/30 focus:ring-2"
        />
      </div>

      <fieldset
        className="rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] p-4"
        aria-labelledby={categoriesLabelId}
      >
        <p
          id={categoriesLabelId}
          className="mb-1 text-sm font-medium text-[var(--text)]"
        >
          {categoriesLabel}
        </p>
        <p className="mb-3 text-[length:var(--text-caption)] text-[var(--muted)]">
          {categoriesHint}
        </p>
        <motion className="grid max-h-52 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-2">
          {categoryOptions.map((c) => (
            <label
              key={c.value}
              className="flex items-center gap-2 text-sm text-[var(--text)]"
            >
              <input
                type="checkbox"
                name="recipe_category"
                value={c.value}
                disabled={busy || capped}
                checked={categoriesSelected.has(c.value)}
                onChange={(e) => {
                  setCategoriesSelected((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(c.value);
                    else next.delete(c.value);
                    return next;
                  });
                }}
              />
              <span>{c.label}</span>
            </label>
          ))}
        </motion>
      </fieldset>

      <motion className="flex flex-col gap-2">
        <label htmlFor="tags" className="text-sm font-medium text-[var(--text)]">
          {extraTagsLabel}
        </label>
        <input
          id="tags"
          name="tags"
          disabled={busy || capped}
          placeholder={extraTagsPlaceholder}
          className="rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--primary)]/30 focus:ring-2"
        />
        <span className="text-[length:var(--text-caption)] text-[var(--muted)]">
          {extraTagsHint}
        </span>
      </motion>

      <fieldset
        className="rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] p-4"
        aria-labelledby={allergensPresentLabelId}
      >
        <p
          id={allergensPresentLabelId}
          className="mb-2 text-sm font-medium text-[var(--text)]"
        >
          Allergens present
        </p>
        <p className="mb-3 text-[length:var(--text-caption)] text-[var(--muted)]">
          Select allergens this recipe contains (seed list). Keyword hints from the
          ingredients field are suggestions only.
        </p>
        {suggestionLabels.length > 0 ? (
          <div className="mb-3 flex flex-col gap-2 rounded-lg border border-[color-mix(in_srgb,var(--primary)_28%,var(--border))] bg-[color-mix(in_srgb,var(--primary-muted)_40%,transparent)] px-3 py-2 text-[length:var(--text-caption)] text-[var(--text)]">
            <span className="text-[var(--muted)]">
              Suggested from ingredients: {suggestionLabels.join(", ")}
            </span>
            <button
              type="button"
              disabled={busy || capped}
              onClick={() => {
                setAllergenSelected((prev) => {
                  const next = new Set(prev);
                  for (const sid of suggestionIds) next.add(sid);
                  return next;
                });
              }}
              className="self-start rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-60"
            >
              Add suggested to selection
            </button>
          </div>
        ) : null}
        <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
          {allergens.map((a) => (
            <label key={a.id} className="flex items-center gap-2 text-sm text-[var(--text)]">
              <input
                type="checkbox"
                name="allergen_id"
                value={a.id}
                disabled={busy || capped}
                checked={allergenSelected.has(a.id)}
                onChange={(e) => {
                  setAllergenSelected((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(a.id);
                    else next.delete(a.id);
                    return next;
                  });
                }}
              />
              <span>{a.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={busy || capped}
        className="rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {capped
          ? (submitBlockedLabel ?? "Monthly limit reached")
          : busy
            ? "Saving recipe…"
            : "Save recipe"}
      </button>
    </form>
  );
}
