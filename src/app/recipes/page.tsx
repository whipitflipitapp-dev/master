import Link from "next/link";
import type { Metadata } from "next";

import { listRecipes } from "@/app/actions/recipes";
import { ContentPageBackdrop } from "@/components/layout/ContentPageBackdrop";
import { RecipeListCard } from "@/components/recipe/RecipeListCard";
import { dictText, getDictionary, resolveAppLocale } from "@/lib/i18n/server";
import type { AllergyMode } from "@/lib/profile";
import { getCurrentProfile } from "@/lib/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RecipesPageProps = {
  searchParams?: Promise<{
    q?: string | string[] | undefined;
    safe?: string | string[] | undefined;
  }>;
};

function firstQuery(q: string | string[] | undefined): string | undefined {
  if (typeof q === "string") return q;
  if (Array.isArray(q) && q.length > 0) return q[0];
  return undefined;
}

export async function generateMetadata({
  searchParams,
}: RecipesPageProps): Promise<Metadata> {
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  const brand = dict.brand;
  const sp = await searchParams;
  const q = firstQuery(sp?.q)?.trim() ?? "";
  const qMeta = q.length > 38 ? `${q.slice(0, 38)}…` : q;
  const title =
    q.length > 0
      ? dictText(dict, "recipes_meta_title_query", { q: qMeta, brand })
      : dictText(dict, "recipes_meta_title", { brand });

  const description =
    q.length > 0
      ? dictText(dict, "recipes_meta_desc_query", {
          q: q.slice(0, 120),
        })
      : dictText(dict, "recipes_meta_desc");

  return {
    title,
    description,
  };
}

export default async function RecipesBrowsePage({ searchParams }: RecipesPageProps) {
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  const sp = await searchParams;
  const qRaw = firstQuery(sp?.q);
  const safeRaw = firstQuery(sp?.safe);

  const supabase = await createSupabaseServerClient();
  let isLoggedIn = false;
  let excludeAllergenIds: string[] = [];
  let allergyMode: AllergyMode = "strict";
  if (supabase) {
    const ctx = await getCurrentProfile(supabase);
    isLoggedIn = Boolean(ctx?.user);
    if (ctx?.user) {
      allergyMode = ctx.profile.allergy_mode;
      const { data: ua } = await supabase
        .from("user_allergies")
        .select("allergen_id")
        .eq("user_id", ctx.user.id);
      excludeAllergenIds = (ua ?? []).map(
        (r: { allergen_id: string }) => r.allergen_id,
      );
    }
  }

  const explicitSafe = safeRaw === "1" || safeRaw === "true";
  const explicitUnsafe = safeRaw === "0" || safeRaw === "false";
  const defaultSafe =
    allergyMode === "strict" && excludeAllergenIds.length > 0;
  const useSafeFilter = explicitUnsafe
    ? false
    : explicitSafe || defaultSafe;

  const { recipes, error } = await listRecipes(48, {
    query: qRaw,
    excludeAllergenIds: useSafeFilter ? excludeAllergenIds : undefined,
  });

  const paramsShowAll = new URLSearchParams();
  if (qRaw?.trim()) paramsShowAll.set("q", qRaw.trim());
  paramsShowAll.set("safe", "0");
  const hrefShowAll = `/recipes?${paramsShowAll.toString()}`;

  const paramsSafeOnly = new URLSearchParams();
  if (qRaw?.trim()) paramsSafeOnly.set("q", qRaw.trim());
  paramsSafeOnly.set("safe", "1");
  const hrefSafeOn = `/recipes?${paramsSafeOnly.toString()}`;

  const backdropKey = `/recipes|q=${qRaw?.trim() ?? ""}|safe=${useSafeFilter ? "1" : "0"}`;

  return (
    <ContentPageBackdrop pageKey={backdropKey}>
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-5 py-8">
      <header className="border-b border-[var(--border)] pb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[1.625rem] font-bold tracking-tight text-[var(--text)] sm:text-3xl">
              {dictText(dict, "recipes_title")}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
              {dictText(dict, "recipes_subtitle")}
            </p>
          </div>
          {error !== "missing_env" && recipes.length > 0 ? (
            <p className="text-[length:var(--text-caption)] font-medium uppercase tracking-wide text-[var(--muted-light)]">
              {dictText(dict, "recipes_sorted_newest")}
            </p>
          ) : null}
        </div>

        <form
          action="/recipes"
          method="GET"
          className="relative mt-5 max-w-md"
          role="search"
        >
          {useSafeFilter ? (
            <input type="hidden" name="safe" value="1" />
          ) : null}
          <label htmlFor="recipe-search" className="sr-only">
            {dictText(dict, "recipes_search_aria")}
          </label>
          <input
            id="recipe-search"
            type="search"
            name="q"
            placeholder={dictText(dict, "recipes_search_placeholder")}
            defaultValue={qRaw ?? ""}
            maxLength={100}
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 pr-10 text-sm text-[var(--text)] shadow-[0_1px_0_rgba(28,25,23,0.03)] outline-none ring-[var(--primary)] placeholder:text-[var(--muted-light)] focus:border-[color-mix(in_srgb,var(--primary)_42%,var(--border))] focus:ring-2"
          />
          <button
            type="submit"
            className="absolute inset-y-1 right-1 inline-flex items-center rounded-lg px-3 text-[length:var(--text-caption)] font-semibold text-[var(--primary)] hover:bg-[var(--primary-muted)]"
          >
            {dictText(dict, "recipes_search_submit")}
          </button>
        </form>

        {isLoggedIn && excludeAllergenIds.length > 0 ? (
          <p className="mt-3 max-w-xl text-[length:var(--text-caption)] leading-relaxed text-[var(--muted)]">
            {useSafeFilter ? (
              <>
                {dictText(dict, "recipes_allergen_banner_filtering")}{" "}
                <code className="rounded bg-[var(--bg)] px-1 text-xs">
                  {dictText(dict, "recipes_allergen_safe_param")}
                </code>
                {dictText(dict, "recipes_allergen_banner_filtering_suffix")}{" "}
                <Link
                  href={hrefShowAll}
                  className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
                >
                  {dictText(dict, "recipes_link_show_all_recipes")}
                </Link>
              </>
            ) : (
              <>
                {dictText(dict, "recipes_allergen_banner_showing_all")}{" "}
                <Link
                  href={hrefSafeOn}
                  className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
                >
                  {dictText(dict, "recipes_link_hide_allergen_recipes")}
                </Link>
              </>
            )}
          </p>
        ) : null}
      </header>

      {error === "missing_env" ? (
        <p className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted)] shadow-[var(--shadow-card)]">
          {dictText(dict, "recipes_supabase_env_hint")}
        </p>
      ) : error === "browse_unavailable" ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {dictText(dict, "recipes_browse_unavailable")}
        </p>
      ) : error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : recipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-card)] border border-dashed border-[color-mix(in_srgb,var(--muted)_35%,var(--border))] bg-[color-mix(in_srgb,var(--card)_98%,var(--bg))] px-6 py-16 text-center shadow-[var(--shadow-card)]">
          <span className="text-4xl opacity-50" aria-hidden>
            🥘
          </span>
          <div className="max-w-sm space-y-2">
            <p className="text-base font-semibold text-[var(--text)]">
              {qRaw?.trim()
                ? dictText(dict, "recipes_empty_search_title")
                : dictText(dict, "recipes_empty_default_title")}
            </p>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              {qRaw?.trim()
                ? dictText(dict, "recipes_empty_search_sub")
                : dictText(dict, "recipes_empty_default_sub")}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {qRaw?.trim() ? (
              <Link
                href="/recipes"
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] shadow-[0_1px_0_rgba(28,25,23,0.04)] hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))]"
              >
                {dictText(dict, "recipes_clear_search")}
              </Link>
            ) : null}
            {isLoggedIn ? (
              <Link
                href="/add"
                className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_1px_0_rgba(28,25,23,0.06)] hover:bg-[var(--primary-hover)]"
              >
                {dictText(dict, "recipes_add_recipe")}
              </Link>
            ) : (
              <Link
                href="/login?next=/add"
                className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_1px_0_rgba(28,25,23,0.06)] hover:bg-[var(--primary-hover)]"
              >
                {dictText(dict, "recipes_sign_in_add")}
              </Link>
            )}
          </div>
        </div>
      ) : (
        <ul className="grid list-none gap-4 sm:grid-cols-2 sm:gap-5">
          {recipes.map((r) => (
            <li key={r.id} className="min-w-0">
              <RecipeListCard
                href={`/recipes/${r.id}`}
                title={r.title}
                imageUrl={r.image_url}
                meta={
                  <>
                    {r.difficulty ? (
                      <span className="capitalize">{r.difficulty}</span>
                    ) : null}
                    {r.cook_time_minutes != null ? (
                      <span>{r.cook_time_minutes} min</span>
                    ) : null}
                    <span>
                      {r.favorites_count} save{r.favorites_count === 1 ? "" : "s"}
                    </span>
                  </>
                }
                footer={
                  r.creator_display_name?.trim()
                    ? dictText(dict, "recipe_list_by", {
                        name: r.creator_display_name.trim(),
                      })
                    : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}
    </main>
    </ContentPageBackdrop>
  );
}
