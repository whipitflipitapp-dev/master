import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DashboardTopSavedRecipesStat } from "@/components/dashboard/DashboardTopSavedRecipesStat";
import { RecipeUploadQuotaNotice } from "@/components/billing/RecipeUploadQuotaNotice";
import { CreatorBadgeLevelUpCelebration } from "@/components/creator/CreatorBadgeLevelUpCelebration";
import { RecipeUploadBadge } from "@/components/creator/RecipeUploadBadge";
import { SuggestionBox } from "@/components/dashboard/SuggestionBox";
import { ContentPageBackdrop } from "@/components/layout/ContentPageBackdrop";
import { resolveRecipeDisplayImageUrl } from "@/lib/demo-recipe-cover-images";
import type { CommonJson } from "@/lib/i18n/server";
import { getRecipeUploadQuotaForUi } from "@/lib/recipe-upload-limit";
import {
  parseCelebratedUploadBadgeTier,
  recipeUploadBadgeLabelKey,
  resolveRecipeUploadBadgeTier,
  shouldCelebrateUploadBadge,
} from "@/lib/recipe-upload-badges";
import { dictText, getDictionary, resolveAppLocale } from "@/lib/i18n/server";
import { isProOrAbove } from "@/lib/plan";
import { GENERIC_LOAD_ERROR, logServerError } from "@/lib/server-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DashboardRecipeRow = {
  id: string;
  title: string;
  image_url: string | null;
  favorites_count: number | null;
  difficulty: string | null;
  cook_time_minutes: number | null;
  created_at: string;
};

function formatRecipeDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function difficultyLabel(dict: CommonJson, difficulty: string | null): string | null {
  const normalized = difficulty?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "easy" || normalized === "medium" || normalized === "hard") {
    return dictText(dict, `add_recipe_difficulty_${normalized}`);
  }
  return `${normalized.slice(0, 1).toUpperCase()}${normalized.slice(1)}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  return {
    title: dictText(dict, "dashboard_meta_title", { brand: dict.brand }),
    description: dictText(dict, "dashboard_meta_desc"),
  };
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return (
      <ContentPageBackdrop pageKey="/dashboard">
      <main className="mx-auto flex max-w-lg flex-1 flex-col gap-4 px-5 py-8">
        <h1 className="text-2xl font-bold tracking-tight">
          {dictText(dict, "dashboard_title")}
        </h1>
        <p className="text-sm text-[var(--muted)]">
          {dictText(dict, "dashboard_env_hint")}
        </p>
      </main>
      </ContentPageBackdrop>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const [favCountRes, authoredRes, uploadQuota, profileRes] = await Promise.all([
    supabase
      .from("favorites")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("recipes")
      .select(
        "id,title,image_url,favorites_count,difficulty,cook_time_minutes,created_at",
      )
      .eq("created_by", user.id)
      .order("created_at", { ascending: false }),
    getRecipeUploadQuotaForUi(supabase, user.id),
    supabase
      .from("profiles")
      .select("celebrated_upload_badge_tier")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (favCountRes.error) {
    logServerError("dashboard.favorite_count", favCountRes.error);
    return (
      <ContentPageBackdrop pageKey="/dashboard">
      <main className="mx-auto flex max-w-lg flex-1 flex-col gap-4 px-5 py-8">
        <h1 className="text-2xl font-bold tracking-tight">
          {dictText(dict, "dashboard_title")}
        </h1>
        <p className="text-sm text-[var(--danger)]" role="alert">
          {GENERIC_LOAD_ERROR}
        </p>
      </main>
      </ContentPageBackdrop>
    );
  }

  if (authoredRes.error) {
    logServerError("dashboard.authored_recipes", authoredRes.error);
    return (
      <ContentPageBackdrop pageKey="/dashboard">
      <main className="mx-auto flex max-w-lg flex-1 flex-col gap-4 px-5 py-8">
        <h1 className="text-2xl font-bold tracking-tight">
          {dictText(dict, "dashboard_title")}
        </h1>
        <p className="text-sm text-[var(--danger)]" role="alert">
          {GENERIC_LOAD_ERROR}
        </p>
      </main>
      </ContentPageBackdrop>
    );
  }

  const savedCount =
    typeof favCountRes.count === "number" ? favCountRes.count : 0;
  const authored = (authoredRes.data ?? []) as DashboardRecipeRow[];
  const canEditUploadedRecipes = isProOrAbove(uploadQuota.plan);

  let savesReceivedTotal = 0;
  for (const row of authored) {
    savesReceivedTotal +=
      typeof row.favorites_count === "number" ? row.favorites_count : 0;
  }

  const topSavedRecipes = [...authored]
    .sort((a, b) => {
      const savesA = a.favorites_count ?? 0;
      const savesB = b.favorites_count ?? 0;
      if (savesB !== savesA) return savesB - savesA;
      return a.title.localeCompare(b.title, locale);
    })
    .slice(0, 10)
    .map((recipe) => {
      const savesCount = recipe.favorites_count ?? 0;
      return {
        id: recipe.id,
        title: recipe.title,
        imageUrl: resolveRecipeDisplayImageUrl(recipe.id, recipe.image_url),
        savesCount,
        savesLabel:
          savesCount === 1
            ? dictText(dict, "dashboard_my_recipes_favorite_one", {
                count: savesCount,
              })
            : dictText(dict, "dashboard_my_recipes_favorite_many", {
                count: savesCount,
              }),
      };
    });

  const uploadBadgeTier = resolveRecipeUploadBadgeTier(authored.length);
  const uploadBadgeLabel =
    uploadBadgeTier != null
      ? dictText(dict, recipeUploadBadgeLabelKey(uploadBadgeTier))
      : null;
  const celebratedUploadBadgeTier = parseCelebratedUploadBadgeTier(
    profileRes.data?.celebrated_upload_badge_tier,
  );
  const showBadgeCelebration =
    uploadBadgeTier != null &&
    uploadBadgeLabel != null &&
    shouldCelebrateUploadBadge(uploadBadgeTier, celebratedUploadBadgeTier);

  return (
    <ContentPageBackdrop pageKey="/dashboard">
    {showBadgeCelebration ? (
      <CreatorBadgeLevelUpCelebration
        tier={uploadBadgeTier}
        celebratedTier={celebratedUploadBadgeTier}
        levelLabel={uploadBadgeLabel}
        title={dictText(dict, "creator_badge_celebration_title")}
        body={dictText(dict, "creator_badge_celebration_body", {
          level: uploadBadgeLabel,
        })}
        dismissLabel={dictText(dict, "creator_badge_celebration_dismiss")}
      />
    ) : null}
    <main className="mx-auto flex max-w-lg flex-1 flex-col gap-6 px-5 py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {dictText(dict, "dashboard_title")}
        </h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          {dictText(dict, "dashboard_subtitle")}
        </p>
      </header>

      <RecipeUploadQuotaNotice dict={dict} quota={uploadQuota} />

      <dl className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-baseline justify-between gap-3 border-b border-[var(--border)] pb-3">
          <dt className="text-sm font-semibold text-[var(--text)]">
            {dictText(dict, "dashboard_stat_saved")}
          </dt>
          <dd className="text-lg font-bold tabular-nums text-[var(--primary)]">
            {savedCount}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-b border-[var(--border)] pb-3">
          <dt className="text-sm font-semibold text-[var(--text)]">
            {dictText(dict, "dashboard_stat_uploaded")}
          </dt>
          <dd className="text-lg font-bold tabular-nums text-[var(--primary)]">
            {authored.length}
          </dd>
        </div>
        <div className="border-t border-[var(--border)] pt-3">
          <DashboardTopSavedRecipesStat
            totalSaves={savesReceivedTotal}
            recipes={topSavedRecipes}
            labels={{
              statLabel: dictText(dict, "dashboard_stat_saves_on_yours"),
              dialogTitle: dictText(dict, "dashboard_top_saved_title"),
              dialogSubtitle: dictText(dict, "dashboard_top_saved_subtitle"),
              empty: dictText(dict, "dashboard_top_saved_empty"),
              close: dictText(dict, "dashboard_top_saved_close"),
            }}
          />
        </div>
      </dl>

      {uploadBadgeTier && uploadBadgeLabel ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]">
          <p className="text-sm font-semibold text-[var(--text)]">
            {dictText(dict, "dashboard_creator_badge_heading")}
          </p>
          <div className="mt-3">
            <RecipeUploadBadge tier={uploadBadgeTier} label={uploadBadgeLabel} />
          </div>
        </div>
      ) : null}

      <nav className="flex flex-wrap gap-3">
        <Link
          href="/saved"
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] shadow-[0_1px_0_rgba(28,25,23,0.04)] hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))]"
        >
          {dictText(dict, "dashboard_open_saved")}
        </Link>
        <Link
          href="/dashboard/cookbooks"
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] shadow-[0_1px_0_rgba(28,25,23,0.04)] hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))]"
        >
          {dictText(dict, "dashboard_cookbooks")}
        </Link>
        <Link
          href="/dashboard/analytics"
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] shadow-[0_1px_0_rgba(28,25,23,0.04)] hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))]"
        >
          {dictText(dict, "dashboard_creator_analytics")}
        </Link>
        <Link
          href="/recipes"
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] shadow-[0_1px_0_rgba(28,25,23,0.04)] hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))]"
        >
          {dictText(dict, "dashboard_browse_recipes")}
        </Link>
        <Link
          href="/add"
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] shadow-[0_1px_0_rgba(28,25,23,0.04)] hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))]"
        >
          {dictText(dict, "dashboard_add_recipe")}
        </Link>
      </nav>

      <SuggestionBox
        labels={{
          title: dictText(dict, "dashboard_suggestion_title"),
          subtitle: dictText(dict, "dashboard_suggestion_subtitle"),
          label: dictText(dict, "dashboard_suggestion_label"),
          placeholder: dictText(dict, "dashboard_suggestion_placeholder"),
          counter: dictText(dict, "dashboard_suggestion_counter", {
            count: "{{count}}",
            max: 300,
          }),
          submit: dictText(dict, "dashboard_suggestion_submit"),
          submitting: dictText(dict, "dashboard_suggestion_submitting"),
          success: dictText(dict, "dashboard_suggestion_success"),
          errors: {
            auth: dictText(dict, "dashboard_suggestion_error_auth"),
            config: dictText(dict, "dashboard_suggestion_error_config"),
            empty: dictText(dict, "dashboard_suggestion_error_empty"),
            generic: dictText(dict, "dashboard_suggestion_error_generic"),
            rate_limited: dictText(dict, "dashboard_suggestion_error_rate_limited"),
            too_long: dictText(dict, "dashboard_suggestion_error_too_long"),
            profanity: dictText(dict, "dashboard_suggestion_error_profanity"),
          },
        }}
      />

      <section
        className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]"
        aria-labelledby="dashboard-my-recipes-heading"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="dashboard-my-recipes-heading"
              className="text-xl font-semibold tracking-tight text-[var(--text)]"
            >
              {dictText(dict, "dashboard_my_recipes_title")}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
              {dictText(dict, "dashboard_my_recipes_subtitle")}
            </p>
          </div>
          <Link
            href="/add"
            className="shrink-0 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))]"
          >
            {dictText(dict, "dashboard_my_recipes_add")}
          </Link>
        </div>

        {authored.length > 0 ? (
          <ul className="mt-5 grid gap-3">
            {authored.map((recipe) => {
              const imageUrl = resolveRecipeDisplayImageUrl(
                recipe.id,
                recipe.image_url,
              );
              const detailHref = `/recipes/${recipe.id}`;
              const editHref = `${detailHref}?edit=1`;
              const metaParts = [
                difficultyLabel(dict, recipe.difficulty),
                recipe.cook_time_minutes != null
                  ? dictText(dict, "dashboard_my_recipes_cook_time", {
                      minutes: recipe.cook_time_minutes,
                    })
                  : null,
                dictText(dict, "dashboard_my_recipes_created", {
                  date: formatRecipeDate(recipe.created_at, locale),
                }),
                (recipe.favorites_count ?? 0) === 1
                  ? dictText(dict, "dashboard_my_recipes_favorite_one", {
                      count: 1,
                    })
                  : dictText(dict, "dashboard_my_recipes_favorite_many", {
                      count: recipe.favorites_count ?? 0,
                    }),
              ].filter((item): item is string => Boolean(item));

              return (
                <li
                  key={recipe.id}
                  className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3"
                >
                  <Link
                    href={detailHref}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[color-mix(in_srgb,var(--muted)_12%,var(--card))]"
                    aria-label={dictText(dict, "dashboard_my_recipes_view_named", {
                      title: recipe.title,
                    })}
                  >
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Recipe images are user-provided Supabase URLs.
                      <img
                        src={imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span
                        className="flex h-full w-full items-center justify-center text-2xl opacity-40"
                        aria-hidden
                      >
                        W
                      </span>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={detailHref}
                      className="line-clamp-2 font-semibold leading-snug text-[var(--text)] underline-offset-4 hover:underline"
                    >
                      {recipe.title}
                    </Link>
                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">
                      {metaParts.join(" · ")}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Link
                        href={detailHref}
                        className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))]"
                      >
                        {dictText(dict, "dashboard_my_recipes_view")}
                      </Link>
                      {canEditUploadedRecipes ? (
                        <Link
                          href={editHref}
                          className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--primary-hover)]"
                        >
                          {dictText(dict, "dashboard_my_recipes_edit")}
                        </Link>
                      ) : (
                        <span className="text-xs leading-relaxed text-[var(--muted)]">
                          {dictText(dict, "dashboard_my_recipes_edit_locked")}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg)] p-5">
            <p className="font-semibold text-[var(--text)]">
              {dictText(dict, "dashboard_my_recipes_empty_title")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              {dictText(dict, "dashboard_my_recipes_empty_body")}
            </p>
            <Link
              href="/add"
              className="mt-4 inline-flex rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
            >
              {dictText(dict, "dashboard_my_recipes_empty_cta")}
            </Link>
          </div>
        )}
      </section>
    </main>
    </ContentPageBackdrop>
  );
}
