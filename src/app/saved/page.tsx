import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ContentPageBackdrop } from "@/components/layout/ContentPageBackdrop";
import { RecipeListCard } from "@/components/recipe/RecipeListCard";
import { RecipeCreatorAttribution } from "@/components/recipe/RecipeCreatorAttribution";
import { resolveRecipeDisplayImageUrl } from "@/lib/demo-recipe-cover-images";
import { dictText, getDictionary, resolveAppLocale } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  return {
    title: dictText(dict, "saved_meta_title", { brand: dict.brand }),
    description: dictText(dict, "saved_meta_desc"),
  };
}

export const dynamic = "force-dynamic";

type EmbeddedRecipe = {
  id: string;
  title: string;
  image_url: string | null;
  favorites_count: number;
  difficulty: string | null;
  cook_time_minutes: number | null;
  created_at: string;
};

function normalizeEmbeddedRecipe(
  embed: EmbeddedRecipe | EmbeddedRecipe[] | null,
): EmbeddedRecipe | null {
  if (!embed) return null;
  const row = Array.isArray(embed) ? embed[0] ?? null : embed;
  if (!row) return null;
  const img =
    typeof row.image_url === "string" && row.image_url.trim().length > 0
      ? row.image_url.trim()
      : null;
  return { ...row, image_url: img };
}

export default async function SavedPage() {
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return (
      <ContentPageBackdrop pageKey="/saved">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-5 py-8">
        <header className="border-b border-[var(--border)] pb-6">
          <h1 className="text-[1.625rem] font-bold tracking-tight text-[var(--text)] sm:text-3xl">
            {dictText(dict, "saved_title")}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
            {dictText(dict, "saved_subtitle_env")}
          </p>
        </header>
        <p className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted)] shadow-[var(--shadow-card)]">
          {dictText(dict, "recipes_supabase_env_hint")}
        </p>
      </main>
      </ContentPageBackdrop>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/saved");
  }

  const { data: favRowsRaw, error: favErr } = await supabase
    .from("favorites")
    .select(
      `
      recipe_id,
      created_at,
      recipes (
        id,
        title,
        image_url,
        favorites_count,
        difficulty,
        cook_time_minutes,
        created_at
      )
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (favErr) {
    return (
      <ContentPageBackdrop pageKey="/saved">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-5 py-8">
        <header className="border-b border-[var(--border)] pb-6">
          <h1 className="text-[1.625rem] font-bold tracking-tight text-[var(--text)] sm:text-3xl">
            {dictText(dict, "saved_title")}
          </h1>
        </header>
        <p className="text-sm text-[var(--danger)]" role="alert">
          {favErr.message}
        </p>
      </main>
      </ContentPageBackdrop>
    );
  }

  const favRows = favRowsRaw ?? [];
  const items: { recipe: EmbeddedRecipe }[] = [];
  for (const row of favRows as {
    recipe_id: string;
    created_at: string;
    recipes: EmbeddedRecipe | EmbeddedRecipe[] | null;
  }[]) {
    const recipe = normalizeEmbeddedRecipe(row.recipes);
    if (recipe) items.push({ recipe });
  }

  type CreatorRow = {
    recipe_id: string;
    creator_name: string | null;
    creator_id: string | null;
    creator_avatar_url: string | null;
  };
  type CreatorMeta = {
    name: string | null;
    id: string | null;
    avatarUrl: string | null;
  };
  const creatorByRecipeId = new Map<string, CreatorMeta>();
  if (items.length > 0) {
    const { data: creators, error: creatorErr } = await supabase.rpc(
      "recipe_creator_names_for",
      { recipe_ids: items.map((x) => x.recipe.id) },
    );
    if (!creatorErr && Array.isArray(creators)) {
      for (const c of creators as CreatorRow[]) {
        creatorByRecipeId.set(c.recipe_id, {
          name: c.creator_name ?? null,
          id: c.creator_id ?? null,
          avatarUrl: c.creator_avatar_url ?? null,
        });
      }
    }
  }

  return (
    <ContentPageBackdrop pageKey="/saved">
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-5 py-8">
      <header className="border-b border-[var(--border)] pb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[1.625rem] font-bold tracking-tight text-[var(--text)] sm:text-3xl">
              {dictText(dict, "saved_title")}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
              {dictText(dict, "saved_subtitle")}
            </p>
          </div>
          {items.length > 0 ? (
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <p className="text-[length:var(--text-caption)] font-medium uppercase tracking-wide text-[var(--muted-light)]">
                {items.length === 1
                  ? dictText(dict, "saved_count_one")
                  : dictText(dict, "saved_count_many", {
                      count: items.length,
                    })}
              </p>
              <Link
                href="/grocery-list"
                className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_1px_0_rgba(28,25,23,0.06)] hover:bg-[var(--primary-hover)]"
              >
                {dictText(dict, "saved_make_grocery_list")}
              </Link>
            </div>
          ) : null}
        </div>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-card)] border border-dashed border-[color-mix(in_srgb,var(--muted)_35%,var(--border))] bg-[color-mix(in_srgb,var(--card)_98%,var(--bg))] px-6 py-16 text-center shadow-[var(--shadow-card)]">
          <span className="text-4xl opacity-50" aria-hidden>
            ♡
          </span>
          <div className="max-w-sm space-y-2">
            <p className="text-base font-semibold text-[var(--text)]">
              {dictText(dict, "saved_empty_title")}
            </p>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              {dictText(dict, "saved_empty_sub")}
            </p>
          </div>
          <Link
            href="/recipes"
            className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_1px_0_rgba(28,25,23,0.06)] hover:bg-[var(--primary-hover)]"
          >
            {dictText(dict, "saved_browse_recipes")}
          </Link>
        </div>
      ) : (
        <ul className="grid list-none gap-4 sm:grid-cols-2 sm:gap-5">
          {items.map(({ recipe }) => {
            const creator = creatorByRecipeId.get(recipe.id);
            const creatorName = creator?.name?.trim();
            const savesLabel =
              recipe.favorites_count === 1
                ? dictText(dict, "recipe_detail_save_one", {
                    count: recipe.favorites_count,
                  })
                : dictText(dict, "recipe_detail_save_many", {
                    count: recipe.favorites_count,
                  });
            return (
              <li key={recipe.id} className="min-w-0">
                <RecipeListCard
                  href={`/recipes/${recipe.id}`}
                  title={recipe.title}
                  imageUrl={resolveRecipeDisplayImageUrl(
                    recipe.id,
                    recipe.image_url,
                  )}
                  meta={
                    <>
                      {recipe.difficulty ? (
                        <span className="capitalize">{recipe.difficulty}</span>
                      ) : null}
                      {recipe.cook_time_minutes != null ? (
                        <span>{recipe.cook_time_minutes} min</span>
                      ) : null}
                      <span>{savesLabel}</span>
                    </>
                  }
                  footer={
                    creatorName || creator?.id ? (
                      <RecipeCreatorAttribution
                        chefId={creator?.id}
                        displayName={creator?.name}
                        avatarUrl={creator?.avatarUrl}
                        byPrefix={dictText(dict, "recipe_creator_by_prefix")}
                      />
                    ) : undefined
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </main>
    </ContentPageBackdrop>
  );
}
