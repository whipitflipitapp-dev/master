"use client";

import Image from "next/image";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

import { createRecipeFromForm } from "@/app/actions/recipes";
import { UpgradePitch } from "@/components/billing/UpgradePitch";
import { suggestAllergenIdsFromText } from "@/lib/allergen-detect";
import type { PlanType } from "@/lib/plan";
import {
  RECIPE_GALLERY_MAX_IMAGES,
  RECIPE_IMAGE_ACCEPT,
  RECIPE_IMAGE_BUCKET,
  RECIPE_IMAGE_MAX_BYTES,
  recipeStorageExtensionFromMime,
  validateRecipeImageFile,
} from "@/lib/recipe-image";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type SelectedRecipePhoto = {
  file: File;
  previewUrl: string;
};

type Allergen = { id: string; name: string };

type CategoryOption = { value: string; label: string };

const GENERIC_SAVE_ERROR = "Could not save this recipe. Please try again.";
const IMAGE_UPLOAD_ERROR =
  "Could not upload recipe photos. Check the files and try again.";
const COOK_TIME_MINUTES_MIN = 1;
const COOK_TIME_MINUTES_MAX = 1440;
const DIFFICULTY_VALUES = ["easy", "medium", "hard"] as const;
const ADD_RECIPE_DRAFT_VERSION = 2;

type RecipeDifficulty = (typeof DIFFICULTY_VALUES)[number];
type DraftDifficulty = "" | RecipeDifficulty;
type SavePhase = "idle" | "checking" | "uploading" | "saving" | "finishing";

type AddRecipeDraft = {
  version: typeof ADD_RECIPE_DRAFT_VERSION;
  savedAt: string;
  title: string;
  ingredients: string;
  instructions: string;
  videoUrl: string;
  difficulty: DraftDifficulty;
  cookTimeMinutes: string;
  tags: string;
  allergenIds: string[];
  categoryValues: string[];
  otherCategory: string;
  hadImage: boolean;
};

function addRecipeDraftStorageKey(userId: string) {
  return `whipitflipit:add-recipe-draft:v${ADD_RECIPE_DRAFT_VERSION}:${userId}`;
}

function stringFromDraft(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stringArrayFromDraft(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function isDraftDifficulty(value: string): value is DraftDifficulty {
  return (
    value === "" ||
    DIFFICULTY_VALUES.includes(value as RecipeDifficulty)
  );
}

function hasRecipeDraftContent(draft: AddRecipeDraft) {
  return (
    draft.title.trim().length > 0 ||
    draft.ingredients.trim().length > 0 ||
    draft.instructions.trim().length > 0 ||
    draft.videoUrl.trim().length > 0 ||
    draft.difficulty.length > 0 ||
    draft.cookTimeMinutes.trim().length > 0 ||
    draft.tags.trim().length > 0 ||
    draft.allergenIds.length > 0 ||
    draft.categoryValues.length > 0 ||
    draft.otherCategory.trim().length > 0 ||
    draft.hadImage
  );
}

function RecipeSaveProgress({
  title,
  phaseLabel,
  note,
}: {
  title: string;
  phaseLabel: string;
  note: string;
}) {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className="overflow-hidden rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--primary)_28%,var(--border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary-muted)_74%,var(--card)),var(--card))] p-4 shadow-[var(--shadow-card)]"
      role="status"
    >
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <div
          aria-hidden="true"
          className="relative h-24 w-28 shrink-0 overflow-hidden rounded-3xl bg-[color-mix(in_srgb,var(--primary-muted)_70%,white)]"
        >
          <div className="absolute left-1/2 top-3 h-8 w-14 -translate-x-1/2">
            <span className="absolute left-0 top-3 h-6 w-6 rounded-full border border-white/80 bg-white shadow-sm" />
            <span className="absolute left-4 top-0 h-8 w-8 rounded-full border border-white/80 bg-white shadow-sm" />
            <span className="absolute right-0 top-3 h-6 w-6 rounded-full border border-white/80 bg-white shadow-sm" />
          </div>
          <div className="absolute left-1/2 top-10 h-9 w-10 -translate-x-1/2 rounded-full bg-[color-mix(in_srgb,var(--accent)_28%,white)] shadow-sm" />
          <div className="absolute left-1/2 top-[3.65rem] h-6 w-14 -translate-x-1/2 rounded-t-full bg-[var(--primary)]" />
          <div className="absolute bottom-5 left-1/2 h-8 w-16 -translate-x-1/2 rounded-b-2xl rounded-t-lg border border-[color-mix(in_srgb,var(--text)_18%,transparent)] bg-[color-mix(in_srgb,var(--text)_82%,var(--primary))] shadow-md" />
          <div className="absolute bottom-[3.05rem] left-1/2 h-2 w-20 -translate-x-1/2 rounded-full bg-[color-mix(in_srgb,var(--text)_75%,var(--primary))]" />
          <span className="recipe-save-steam absolute bottom-14 left-9 h-5 w-2 rounded-full bg-white/80" />
          <span className="recipe-save-steam absolute bottom-14 left-14 h-6 w-2 rounded-full bg-white/80 [animation-delay:180ms]" />
          <span className="recipe-save-steam absolute bottom-14 left-[4.4rem] h-5 w-2 rounded-full bg-white/80 [animation-delay:360ms]" />
          <div className="recipe-save-ladle absolute bottom-9 right-4 h-9 w-1 origin-bottom rounded-full bg-[color-mix(in_srgb,var(--text)_70%,white)]">
            <span className="absolute -left-2 -top-2 h-4 w-5 rounded-full border-2 border-[color-mix(in_srgb,var(--text)_70%,white)]" />
          </div>
        </div>

        <div className="w-full min-w-0">
          <p className="text-sm font-semibold text-[var(--text)]">{title}</p>
          <p className="mt-1 text-[length:var(--text-meta)] text-[var(--primary)]">
            {phaseLabel}
          </p>
          <p className="mt-1 text-[length:var(--text-caption)] leading-relaxed text-[var(--muted)]">
            {note}
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--primary)_16%,var(--border))]">
            <span className="recipe-save-progress block h-full w-1/3 rounded-full bg-[linear-gradient(90deg,var(--primary),var(--accent),var(--primary))]" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function AddRecipeForm({
  userId,
  allergens,
  categoryOptions,
  categoriesLabel,
  categoriesHint,
  otherCategoryLabel,
  otherCategoryHint,
  otherCategoryPlaceholder,
  detailsLabel,
  detailsHint,
  difficultyLabel,
  difficultyUnspecifiedLabel,
  difficultyEasyLabel,
  difficultyMediumLabel,
  difficultyHardLabel,
  cookTimeLabel,
  cookTimePlaceholder,
  extraTagsLabel,
  extraTagsHint,
  extraTagsPlaceholder,
  saveProgressTitle,
  saveProgressCheckingAccountLabel,
  saveProgressUploadingImageLabel,
  saveProgressSavingRecipeLabel,
  saveProgressFinishingLabel,
  saveProgressNote,
  saveButtonLabel,
  savingButtonLabel,
  videoUrlLabel,
  videoUrlHint,
  videoUrlPlaceholder,
  initialError,
  atLimit,
  limitNotice,
  submitBlockedLabel,
  planForPitch,
}: {
  userId: string;
  allergens: Allergen[];
  categoryOptions: CategoryOption[];
  categoriesLabel: string;
  categoriesHint: string;
  otherCategoryLabel: string;
  otherCategoryHint: string;
  otherCategoryPlaceholder: string;
  detailsLabel: string;
  detailsHint: string;
  difficultyLabel: string;
  difficultyUnspecifiedLabel: string;
  difficultyEasyLabel: string;
  difficultyMediumLabel: string;
  difficultyHardLabel: string;
  cookTimeLabel: string;
  cookTimePlaceholder: string;
  extraTagsLabel: string;
  extraTagsHint: string;
  extraTagsPlaceholder: string;
  saveProgressTitle: string;
  saveProgressCheckingAccountLabel: string;
  saveProgressUploadingImageLabel: string;
  saveProgressSavingRecipeLabel: string;
  saveProgressFinishingLabel: string;
  saveProgressNote: string;
  saveButtonLabel: string;
  savingButtonLabel: string;
  videoUrlLabel: string;
  videoUrlHint: string;
  videoUrlPlaceholder: string;
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
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedRecipePhoto[]>(
    [],
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savePhase, setSavePhase] = useState<SavePhase>("idle");
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [imageReselectNeeded, setImageReselectNeeded] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [ingredientDraft, setIngredientDraft] = useState("");
  const [instructionsDraft, setInstructionsDraft] = useState("");
  const [videoUrlDraft, setVideoUrlDraft] = useState("");
  const [difficultyDraft, setDifficultyDraft] = useState<DraftDifficulty>("");
  const [cookTimeMinutesDraft, setCookTimeMinutesDraft] = useState("");
  const [tagsDraft, setTagsDraft] = useState("");
  const [allergenSelected, setAllergenSelected] = useState<Set<string>>(
    () => new Set(),
  );
  const [categoriesSelected, setCategoriesSelected] = useState<Set<string>>(
    () => new Set(),
  );
  const [otherCategoryEnabled, setOtherCategoryEnabled] = useState(false);
  const [otherCategoryDraft, setOtherCategoryDraft] = useState("");
  const categoriesLabelId = useId();
  const draftStorageKey = useMemo(() => addRecipeDraftStorageKey(userId), [userId]);
  const validAllergenIds = useMemo(
    () => new Set(allergens.map((a) => a.id)),
    [allergens],
  );
  const validCategoryValues = useMemo(
    () => new Set(categoryOptions.map((c) => c.value)),
    [categoryOptions],
  );

  const suggestionIds = useMemo(
    () => suggestAllergenIdsFromText(ingredientDraft, allergens),
    [ingredientDraft, allergens],
  );
  const suggestionLabels = useMemo(() => {
    const idToName = new Map(allergens.map((a) => [a.id, a.name] as const));
    return suggestionIds.map((id) => idToName.get(id)).filter(Boolean) as string[];
  }, [suggestionIds, allergens]);

  const busy = submitting;
  const savePhaseLabel =
    savePhase === "checking"
      ? saveProgressCheckingAccountLabel
      : savePhase === "uploading"
        ? saveProgressUploadingImageLabel
        : savePhase === "saving"
          ? saveProgressSavingRecipeLabel
          : savePhase === "finishing"
            ? saveProgressFinishingLabel
            : saveProgressSavingRecipeLabel;
  const capped = Boolean(atLimit);
  const pitchPlan = planForPitch ?? "free";
  const allergensPresentLabelId = useId();
  const currentDraft = useMemo<AddRecipeDraft>(
    () => ({
      version: ADD_RECIPE_DRAFT_VERSION,
      savedAt: new Date().toISOString(),
      title: titleDraft,
      ingredients: ingredientDraft,
      instructions: instructionsDraft,
      videoUrl: videoUrlDraft,
      difficulty: difficultyDraft,
      cookTimeMinutes: cookTimeMinutesDraft,
      tags: tagsDraft,
      allergenIds: [...allergenSelected].sort(),
      categoryValues: [...categoriesSelected].sort(),
      otherCategory: otherCategoryDraft,
      hadImage: selectedPhotos.length > 0 || imageReselectNeeded,
    }),
    [
      titleDraft,
      ingredientDraft,
      instructionsDraft,
      videoUrlDraft,
      difficultyDraft,
      cookTimeMinutesDraft,
      tagsDraft,
      allergenSelected,
      categoriesSelected,
      otherCategoryDraft,
      selectedPhotos,
      imageReselectNeeded,
    ],
  );
  const hasCurrentDraft = hasRecipeDraftContent(currentDraft);

  const clearDraftStorage = useCallback(() => {
    try {
      window.localStorage.removeItem(draftStorageKey);
    } catch {
      // Storage may be unavailable in private browsing or restricted contexts.
    }
  }, [draftStorageKey]);

  const clearSelectedPhotos = useCallback(() => {
    setSelectedPhotos((prev) => {
      for (const photo of prev) {
        if (photo.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(photo.previewUrl);
        }
      }
      return [];
    });
    setImageReselectNeeded(false);
  }, []);

  const removeSelectedPhotoAt = useCallback((index: number) => {
    setSelectedPhotos((prev) => {
      const next = [...prev];
      const removed = next.splice(index, 1)[0];
      if (removed?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return next;
    });
  }, []);

  const reorderSelectedPhotos = useCallback((fromIndex: number, toIndex: number) => {
    setSelectedPhotos((prev) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex >= prev.length
      ) {
        return prev;
      }
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }, []);

  const setPhotoAsCover = useCallback(
    (index: number) => {
      if (index <= 0) return;
      reorderSelectedPhotos(index, 0);
    },
    [reorderSelectedPhotos],
  );

  const movePhotoBy = useCallback(
    (index: number, delta: -1 | 1) => {
      reorderSelectedPhotos(index, index + delta);
    },
    [reorderSelectedPhotos],
  );

  const [dragPhotoIndex, setDragPhotoIndex] = useState<number | null>(null);

  const resetDraftFields = useCallback(() => {
    setTitleDraft("");
    setIngredientDraft("");
    setInstructionsDraft("");
    setVideoUrlDraft("");
    setDifficultyDraft("");
    setCookTimeMinutesDraft("");
    setTagsDraft("");
    setAllergenSelected(new Set());
    setCategoriesSelected(new Set());
    setOtherCategoryEnabled(false);
    setOtherCategoryDraft("");
    setDraftRestored(false);
    setLocalError(null);
    clearSelectedPhotos();
  }, [clearSelectedPhotos]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(draftStorageKey);
        if (!raw) return;

        const parsed = JSON.parse(raw) as Partial<AddRecipeDraft>;
        if (parsed.version !== ADD_RECIPE_DRAFT_VERSION) return;

        const difficultyRaw = stringFromDraft(parsed.difficulty);
        const nextDraft: AddRecipeDraft = {
          version: ADD_RECIPE_DRAFT_VERSION,
          savedAt: stringFromDraft(parsed.savedAt),
          title: stringFromDraft(parsed.title),
          ingredients: stringFromDraft(parsed.ingredients),
          instructions: stringFromDraft(parsed.instructions),
          videoUrl: stringFromDraft(parsed.videoUrl),
          difficulty: isDraftDifficulty(difficultyRaw) ? difficultyRaw : "",
          cookTimeMinutes: stringFromDraft(parsed.cookTimeMinutes),
          tags: stringFromDraft(parsed.tags),
          allergenIds: stringArrayFromDraft(parsed.allergenIds).filter((id) =>
            validAllergenIds.has(id),
          ),
          categoryValues: stringArrayFromDraft(parsed.categoryValues).filter(
            (value) => validCategoryValues.has(value),
          ),
          otherCategory: stringFromDraft(parsed.otherCategory),
          hadImage: parsed.hadImage === true,
        };

        if (!hasRecipeDraftContent(nextDraft)) return;

        setTitleDraft(nextDraft.title);
        setIngredientDraft(nextDraft.ingredients);
        setInstructionsDraft(nextDraft.instructions);
        setVideoUrlDraft(nextDraft.videoUrl);
        setDifficultyDraft(nextDraft.difficulty);
        setCookTimeMinutesDraft(nextDraft.cookTimeMinutes);
        setTagsDraft(nextDraft.tags);
        setAllergenSelected(new Set(nextDraft.allergenIds));
        setCategoriesSelected(new Set(nextDraft.categoryValues));
        const otherCat = nextDraft.otherCategory.trim();
        setOtherCategoryDraft(nextDraft.otherCategory);
        setOtherCategoryEnabled(otherCat.length > 0);
        setImageReselectNeeded(nextDraft.hadImage);
        setDraftRestored(true);
      } catch {
        // Ignore malformed or inaccessible drafts; the user can continue fresh.
      } finally {
        setDraftHydrated(true);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [draftStorageKey, validAllergenIds, validCategoryValues]);

  useEffect(() => {
    if (!draftHydrated) return;

    const timeoutId = window.setTimeout(() => {
      try {
        if (hasRecipeDraftContent(currentDraft)) {
          window.localStorage.setItem(
            draftStorageKey,
            JSON.stringify({ ...currentDraft, savedAt: new Date().toISOString() }),
          );
        } else {
          window.localStorage.removeItem(draftStorageKey);
        }
      } catch {
        // Failing to persist should not block the recipe form.
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [currentDraft, draftHydrated, draftStorageKey]);

  useEffect(() => {
    return () => {
      for (const photo of selectedPhotos) {
        if (photo.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(photo.previewUrl);
        }
      }
    };
  }, [selectedPhotos]);

  function handleFileChange(ev: React.ChangeEvent<HTMLInputElement>) {
    setLocalError(null);
    const picked = ev.target.files ? [...ev.target.files] : [];
    ev.target.value = "";
    if (picked.length === 0) {
      return;
    }

    setSelectedPhotos((prev) => {
      const room = RECIPE_GALLERY_MAX_IMAGES - prev.length;
      if (room <= 0) {
        setLocalError(`You can add up to ${RECIPE_GALLERY_MAX_IMAGES} photos per recipe.`);
        return prev;
      }
      const toAdd = picked.slice(0, room);
      if (picked.length > room) {
        setLocalError(`Only ${room} more photo(s) fit (max ${RECIPE_GALLERY_MAX_IMAGES}).`);
      }
      const next: SelectedRecipePhoto[] = [...prev];
      for (const file of toAdd) {
        const err = validateRecipeImageFile(file);
        if (err) {
          setLocalError(err);
          continue;
        }
        next.push({
          file,
          previewUrl: URL.createObjectURL(file),
        });
      }
      if (next.length > prev.length) {
        setImageReselectNeeded(false);
      }
      return next;
    });
  }

  function handleDiscardDraft() {
    if (!hasCurrentDraft) return;
    if (!window.confirm("Discard this recipe draft?")) return;
    clearDraftStorage();
    resetDraftFields();
  }

  async function handleSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (capped || busy) return;
    setLocalError(null);
    setSubmitting(true);
    setSavePhase("checking");

    const form = ev.currentTarget;
    const formData = new FormData(form);

    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) {
        setLocalError("Sign in required to add a recipe.");
        return;
      }

      if (selectedPhotos.length > 0) {
        setSavePhase("uploading");
        const publicUrls: string[] = [];
        const objectPaths: string[] = [];

        for (const photo of selectedPhotos) {
          const mimeErr = validateRecipeImageFile(photo.file);
          if (mimeErr) {
            setLocalError(mimeErr);
            return;
          }
          const ext = recipeStorageExtensionFromMime(photo.file.type);
          if (!ext) {
            setLocalError("Only PNG or JPEG images are allowed.");
            return;
          }

          const objectPath = `${user.id}/${crypto.randomUUID()}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from(RECIPE_IMAGE_BUCKET)
            .upload(objectPath, photo.file, {
              contentType: photo.file.type,
              upsert: false,
            });

          if (uploadError) {
            setLocalError(IMAGE_UPLOAD_ERROR);
            return;
          }

          const { data: pub } = supabase.storage
            .from(RECIPE_IMAGE_BUCKET)
            .getPublicUrl(objectPath);
          publicUrls.push(pub.publicUrl);
          objectPaths.push(objectPath);
        }

        formData.set("gallery_image_urls", JSON.stringify(publicUrls));
        formData.set("gallery_image_object_paths", JSON.stringify(objectPaths));
      } else {
        formData.delete("gallery_image_urls");
        formData.delete("gallery_image_object_paths");
        formData.delete("image_url");
        formData.delete("image_object_path");
      }

      setSavePhase("saving");
      const result = await createRecipeFromForm(formData);
      if (result?.error) {
        setLocalError(result.error);
        return;
      }
      setSavePhase("finishing");
      clearDraftStorage();
    } catch (e: unknown) {
      if (isRedirectError(e)) {
        clearDraftStorage();
        throw e;
      }
      setLocalError(GENERIC_SAVE_ERROR);
    } finally {
      setSubmitting(false);
      setSavePhase("idle");
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

      {draftRestored ? (
        <p
          className="rounded-xl border border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[color-mix(in_srgb,var(--primary-muted)_45%,transparent)] px-3 py-2 text-[length:var(--text-meta)] text-[var(--text)]"
          role="status"
        >
          Draft restored. It will stay on this device until the recipe saves or
          you discard it.
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
            Recipe photos
          </h2>
          <span className="text-[length:var(--text-caption)] text-[var(--muted)]">
            Optional · up to {RECIPE_GALLERY_MAX_IMAGES}
          </span>
        </div>
        <p className="text-[length:var(--text-caption)] text-[var(--muted)]">
          PNG or JPEG, up to {Math.round(RECIPE_IMAGE_MAX_BYTES / (1024 * 1024))}MB each. Drag
          photos to reorder, or use the buttons — the{" "}
          <span className="font-medium text-[var(--text)]">first photo</span> is the browse-card
          thumbnail. Paste a video link below — no video uploads.
        </p>
        <p className="text-[length:var(--text-caption)] text-[var(--muted)]">
          Drafts save recipe text and selections on this device. Image files are not saved and must
          be reselected after a reload.
        </p>
        {imageReselectNeeded ? (
          <p
            className="rounded-lg bg-[color-mix(in_srgb,var(--primary-muted)_52%,transparent)] px-3 py-2 text-[length:var(--text-caption)] text-[var(--text)]"
            role="status"
          >
            Your draft had selected photos. Choose them again before saving if you still want a
            gallery.
          </p>
        ) : null}

        <div className="mt-3 flex flex-col gap-4">
          <label className="flex min-h-[9rem] max-w-md cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] px-4 py-5 text-center transition-[border-color] hover:border-[var(--primary)]">
            <input
              type="file"
              accept={RECIPE_IMAGE_ACCEPT}
              multiple
              className="sr-only"
              disabled={capped || selectedPhotos.length >= RECIPE_GALLERY_MAX_IMAGES}
              onChange={handleFileChange}
            />
            <span className="text-sm font-semibold text-[var(--primary)]">
              Choose photos
            </span>
            <span className="mt-2 text-[length:var(--text-caption)] text-[var(--muted)]">
              .png · .jpg · .jpeg — {selectedPhotos.length}/{RECIPE_GALLERY_MAX_IMAGES} selected
            </span>
          </label>

          {selectedPhotos.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {selectedPhotos.map((photo, index) => (
                <li
                  key={photo.previewUrl}
                  draggable={!capped && !busy}
                  onDragStart={() => setDragPhotoIndex(index)}
                  onDragEnd={() => setDragPhotoIndex(null)}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragPhotoIndex !== null) {
                      reorderSelectedPhotos(dragPhotoIndex, index);
                    }
                    setDragPhotoIndex(null);
                  }}
                  className={`relative aspect-[4/3] overflow-hidden rounded-xl border bg-[color-mix(in_srgb,var(--bg)_94%,transparent)] shadow-[var(--shadow-card)] ${
                    dragPhotoIndex === index
                      ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/35"
                      : "border-[color-mix(in_srgb,var(--muted)_30%,transparent)]"
                  } ${!capped && !busy ? "cursor-grab active:cursor-grabbing" : ""}`}
                >
                  <Image
                    src={photo.previewUrl}
                    alt={
                      index === 0
                        ? "Recipe thumbnail preview"
                        : `Recipe photo ${index + 1} preview`
                    }
                    fill
                    sizes="(max-width: 640px) 45vw, 12rem"
                    className="pointer-events-none object-cover"
                    unoptimized
                  />
                  {index === 0 ? (
                    <span className="absolute left-2 top-2 rounded-md bg-[var(--primary)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                      Cover
                    </span>
                  ) : (
                    <span className="absolute left-2 top-2 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white">
                      {index + 1}
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={`Remove photo ${index + 1}`}
                    disabled={capped || busy}
                    className="absolute right-2 top-2 rounded-lg bg-black/55 px-2 py-1 text-[length:var(--text-caption)] font-medium text-white disabled:opacity-50"
                    onClick={() => removeSelectedPhotoAt(index)}
                  >
                    Remove
                  </button>
                  <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-1 bg-gradient-to-t from-black/75 via-black/45 to-transparent px-2 pb-2 pt-8">
                    {index > 0 ? (
                      <>
                        <button
                          type="button"
                          disabled={capped || busy}
                          onClick={() => setPhotoAsCover(index)}
                          className="rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[var(--text)] hover:bg-white disabled:opacity-50"
                        >
                          Set cover
                        </button>
                        <button
                          type="button"
                          disabled={capped || busy}
                          aria-label={`Move photo ${index + 1} earlier`}
                          onClick={() => movePhotoBy(index, -1)}
                          className="rounded-md bg-white/90 px-2 py-0.5 text-xs font-semibold text-[var(--text)] hover:bg-white disabled:opacity-50"
                        >
                          ←
                        </button>
                      </>
                    ) : null}
                    {index < selectedPhotos.length - 1 ? (
                      <button
                        type="button"
                        disabled={capped || busy}
                        aria-label={`Move photo ${index + 1} later`}
                        onClick={() => movePhotoBy(index, 1)}
                        className="rounded-md bg-white/90 px-2 py-0.5 text-xs font-semibold text-[var(--text)] hover:bg-white disabled:opacity-50"
                      >
                        →
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl bg-[color-mix(in_srgb,var(--primary-muted)_52%,transparent)] px-4 py-3 text-[length:var(--text-caption)] leading-relaxed text-[var(--muted)]">
              Recipe cards load faster with a thumbnail — add several angles for a swipe gallery on
              the recipe page.
            </p>
          )}
        </div>
      </section>

      {busy ? (
        <RecipeSaveProgress
          title={saveProgressTitle}
          phaseLabel={savePhaseLabel}
          note={saveProgressNote}
        />
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm font-medium text-[var(--text)]">
          Recipe title
        </label>
        <input
          id="title"
          name="title"
          required
          disabled={busy || capped}
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
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
          value={instructionsDraft}
          onChange={(e) => setInstructionsDraft(e.target.value)}
          placeholder="Explain each step plainly — timings and heat matter."
          className="rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--primary)]/30 focus:ring-2"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="video_url" className="text-sm font-medium text-[var(--text)]">
          {videoUrlLabel}
        </label>
        <p className="text-[length:var(--text-caption)] text-[var(--muted)]">
          {videoUrlHint}
        </p>
        <input
          id="video_url"
          name="video_url"
          type="url"
          disabled={busy || capped}
          value={videoUrlDraft}
          onChange={(e) => setVideoUrlDraft(e.target.value)}
          placeholder={videoUrlPlaceholder}
          className="rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--primary)]/30 focus:ring-2"
        />
      </div>

      <fieldset className="rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] p-4">
        <p className="mb-1 text-sm font-medium text-[var(--text)]">
          {detailsLabel}
        </p>
        <p className="mb-3 text-[length:var(--text-caption)] text-[var(--muted)]">
          {detailsHint}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="difficulty" className="text-sm font-medium text-[var(--text)]">
              {difficultyLabel}
            </label>
            <select
              id="difficulty"
              name="difficulty"
              disabled={busy || capped}
              value={difficultyDraft}
              onChange={(e) => {
                const next = e.target.value;
                setDifficultyDraft(isDraftDifficulty(next) ? next : "");
              }}
              className="rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--primary)]/30 focus:ring-2"
            >
              <option value="">{difficultyUnspecifiedLabel}</option>
              {DIFFICULTY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {value === "easy"
                    ? difficultyEasyLabel
                    : value === "medium"
                      ? difficultyMediumLabel
                      : difficultyHardLabel}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="cook_time_minutes" className="text-sm font-medium text-[var(--text)]">
              {cookTimeLabel}
            </label>
            <input
              id="cook_time_minutes"
              name="cook_time_minutes"
              type="number"
              inputMode="numeric"
              min={COOK_TIME_MINUTES_MIN}
              max={COOK_TIME_MINUTES_MAX}
              step={1}
              disabled={busy || capped}
              value={cookTimeMinutesDraft}
              onChange={(e) => setCookTimeMinutesDraft(e.target.value)}
              placeholder={cookTimePlaceholder}
              className="rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--primary)]/30 focus:ring-2"
            />
          </div>
        </div>
      </fieldset>

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
        <div className="grid max-h-52 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-2">
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
        </div>
        <div className="mt-3 border-t border-[color-mix(in_srgb,var(--muted)_22%,transparent)] pt-3">
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">
            <input
              type="checkbox"
              disabled={busy || capped}
              checked={otherCategoryEnabled}
              onChange={(e) => {
                const on = e.target.checked;
                setOtherCategoryEnabled(on);
                if (!on) setOtherCategoryDraft("");
              }}
            />
            {otherCategoryLabel}
          </label>
          {otherCategoryEnabled ? (
            <div className="mt-2 flex flex-col gap-1.5">
              <input
                id="recipe_category_other"
                name="recipe_category_other"
                type="text"
                disabled={busy || capped}
                value={otherCategoryDraft}
                onChange={(e) => setOtherCategoryDraft(e.target.value)}
                placeholder={otherCategoryPlaceholder}
                className="rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--primary)]/30 focus:ring-2"
              />
              <span className="text-[length:var(--text-caption)] text-[var(--muted)]">
                {otherCategoryHint}
              </span>
            </div>
          ) : null}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="tags" className="text-sm font-medium text-[var(--text)]">
          {extraTagsLabel}
        </label>
        <input
          id="tags"
          name="tags"
          disabled={busy || capped}
          value={tagsDraft}
          onChange={(e) => setTagsDraft(e.target.value)}
          placeholder={extraTagsPlaceholder}
          className="rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--primary)]/30 focus:ring-2"
        />
        <span className="text-[length:var(--text-caption)] text-[var(--muted)]">
          {extraTagsHint}
        </span>
      </div>

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

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          disabled={busy || !hasCurrentDraft}
          onClick={handleDiscardDraft}
          className="rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] px-4 py-3 text-sm font-semibold text-[var(--text)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Discard draft
        </button>
        <button
          type="submit"
          disabled={busy || capped}
          className="rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-40"
        >
          {capped
            ? (submitBlockedLabel ?? "Monthly limit reached")
            : busy
              ? savingButtonLabel
              : saveButtonLabel}
        </button>
      </div>
    </form>
  );
}
