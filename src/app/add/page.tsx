import Link from "next/link";
import type { Metadata } from "next";

import { AddRecipeForm } from "@/app/add/add-recipe-form";
import { ContentPageBackdrop } from "@/components/layout/ContentPageBackdrop";
import { dictText, getDictionary, resolveAppLocale } from "@/lib/i18n/server";
import {
  RECIPE_CATEGORY_VALUES,
  recipeCategoryI18nKey,
} from "@/lib/recipe-categories";
import { RecipeUploadQuotaNotice } from "@/components/billing/RecipeUploadQuotaNotice";
import {
  getRecipeUploadLimitStateForUi,
  getRecipeUploadQuotaForUi,
} from "@/lib/recipe-upload-limit";
import { isProOrAbove } from "@/lib/plan";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  return {
    title: dictText(dict, "add_meta_title", { brand: dict.brand }),
    description: dictText(dict, "add_meta_desc"),
  };
}

async function loadAllergens(): Promise<{ id: string; name: string }[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("allergens")
    .select("id,name")
    .order("name");
  return (data ?? []) as { id: string; name: string }[];
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function AddRecipePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; recipeLimit?: string }>;
}) {
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  const { error: errorRaw, recipeLimit: recipeLimitRaw } = await searchParams;
  const decodedError =
    typeof errorRaw === "string" && errorRaw.trim().length > 0
      ? safeDecodeURIComponent(errorRaw.trim())
      : null;

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return (
      <ContentPageBackdrop pageKey="/add">
      <main className="mx-auto max-w-lg flex-1 px-5 py-12">
        <h1 className="text-2xl font-bold text-[var(--text)]">
          {dictText(dict, "add_supabase_title")}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {dictText(dict, "add_supabase_body")}
        </p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
        >
          {dictText(dict, "add_back_home")}
        </Link>
      </main>
      </ContentPageBackdrop>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <ContentPageBackdrop pageKey="/add">
      <main className="mx-auto max-w-lg flex-1 px-5 py-12 text-center">
        <h1 className="text-2xl font-bold text-[var(--text)]">
          {dictText(dict, "add_sign_in_required_title")}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {dictText(dict, "add_sign_in_required_body")}
        </p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
        >
          {dictText(dict, "add_back_home")}
        </Link>
      </main>
      </ContentPageBackdrop>
    );
  }

  const allergens = await loadAllergens();

  const [limitState, uploadQuota] = await Promise.all([
    getRecipeUploadLimitStateForUi(supabase, user.id),
    getRecipeUploadQuotaForUi(supabase, user.id),
  ]);
  const fromQuery =
    typeof recipeLimitRaw === "string" &&
    (recipeLimitRaw === "1" || recipeLimitRaw.toLowerCase() === "true");
  const atLimit =
    limitState.atLimit ||
    (fromQuery && !isProOrAbove(limitState.plan));
  const limitNotice = dictText(dict, "add_recipe_monthly_limit_notice");
  const submitBlockedLabel = dictText(dict, "add_recipe_submit_blocked_limit");
  const categoryOptions = RECIPE_CATEGORY_VALUES.map((value) => ({
    value,
    label: dictText(dict, recipeCategoryI18nKey(value)),
  }));

  return (
    <ContentPageBackdrop pageKey="/add">
    <main className="mx-auto w-full max-w-lg flex-1 px-5 py-8 pb-14">
      <header className="border-b border-[var(--border)] pb-6">
        <p className="text-[length:var(--text-caption)] font-semibold uppercase tracking-[0.08em] text-[var(--primary)]">
          {dictText(dict, "add_kicker")}
        </p>
        <h1 className="mt-2 text-[1.625rem] font-bold leading-snug tracking-tight text-[var(--text)]">
          {dictText(dict, "add_title")}
        </h1>
        <p className="mt-2 max-w-xl text-[length:var(--text-meta)] text-[var(--muted)]">
          {dictText(dict, "add_subtitle")}
        </p>
      </header>

      {!atLimit ? (
        <div className="mt-6">
          <RecipeUploadQuotaNotice dict={dict} quota={uploadQuota} />
        </div>
      ) : null}

      <AddRecipeForm
        userId={user.id}
        allergens={allergens}
        categoryOptions={categoryOptions}
        categoriesLabel={dictText(dict, "add_recipe_categories_label")}
        categoriesHint={dictText(dict, "add_recipe_categories_hint")}
        otherCategoryLabel={dictText(dict, "add_recipe_other_category_label")}
        otherCategoryHint={dictText(dict, "add_recipe_other_category_hint")}
        otherCategoryPlaceholder={dictText(
          dict,
          "add_recipe_other_category_placeholder",
        )}
        detailsLabel={dictText(dict, "add_recipe_details_label")}
        detailsHint={dictText(dict, "add_recipe_details_hint")}
        difficultyLabel={dictText(dict, "add_recipe_difficulty_label")}
        difficultyUnspecifiedLabel={dictText(
          dict,
          "add_recipe_difficulty_unspecified",
        )}
        difficultyEasyLabel={dictText(dict, "add_recipe_difficulty_easy")}
        difficultyMediumLabel={dictText(dict, "add_recipe_difficulty_medium")}
        difficultyHardLabel={dictText(dict, "add_recipe_difficulty_hard")}
        cookTimeLabel={dictText(dict, "add_recipe_cook_time_label")}
        cookTimePlaceholder={dictText(dict, "add_recipe_cook_time_placeholder")}
        extraTagsLabel={dictText(dict, "add_recipe_extra_tags_label")}
        extraTagsHint={dictText(dict, "add_recipe_extra_tags_hint")}
        extraTagsPlaceholder={dictText(dict, "add_recipe_extra_tags_placeholder")}
        saveProgressTitle={dictText(dict, "add_recipe_save_progress_title")}
        saveProgressCheckingAccountLabel={dictText(
          dict,
          "add_recipe_save_progress_checking",
        )}
        saveProgressUploadingImageLabel={dictText(
          dict,
          "add_recipe_save_progress_uploading_image",
        )}
        saveProgressSavingRecipeLabel={dictText(
          dict,
          "add_recipe_save_progress_saving_recipe",
        )}
        saveProgressFinishingLabel={dictText(
          dict,
          "add_recipe_save_progress_finishing",
        )}
        saveProgressNote={dictText(dict, "add_recipe_save_progress_note")}
        saveButtonLabel={dictText(dict, "add_recipe_save_button")}
        savingButtonLabel={dictText(dict, "add_recipe_saving_button")}
        videoUrlLabel={dictText(dict, "add_recipe_video_label")}
        videoUrlHint={dictText(dict, "add_recipe_video_hint")}
        videoUrlPlaceholder={dictText(dict, "add_recipe_video_placeholder")}
        initialError={decodedError}
        atLimit={atLimit}
        limitNotice={limitNotice}
        submitBlockedLabel={submitBlockedLabel}
        planForPitch={limitState.plan}
      />

      <p className="mt-8 border-t border-dashed border-[var(--border)] pt-6 text-[length:var(--text-caption)] text-[var(--muted)]">
        {dictText(dict, "add_footer_note")}
      </p>
    </main>
    </ContentPageBackdrop>
  );
}
