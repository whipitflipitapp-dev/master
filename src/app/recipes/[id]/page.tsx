import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AffiliateOutboundLink } from "@/components/affiliate/AffiliateOutboundLink";
import { ContentPageBackdrop } from "@/components/layout/ContentPageBackdrop";
import { RecipeDetailHero } from "@/components/recipe/RecipeDetailHero";
import { RecipeFavoriteButton } from "@/components/recipe/RecipeFavoriteButton";
import { isAmazonAffiliateProductUrl } from "@/lib/amazon-affiliate-url";
import { winePairingsUnlockedForPlan } from "@/lib/plan";
import { getCurrentUserPlanType } from "@/lib/profile";
import { logEvent } from "@/lib/telemetry";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dictText, getDictionary, resolveAppLocale } from "@/lib/i18n/server";
import { parseYoutubeVideoId } from "@/lib/youtube";

type Props = { params: Promise<{ id: string }> };

function summarizeForMeta(text: string, max = 160): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length <= max
    ? normalized
    : `${normalized.slice(0, Math.max(0, max - 1))}\u2026`;
}

async function loadRecipe(id: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: recipe, error: rErr } = await supabase
    .from("recipes")
    .select(
      "id,title,instructions,image_url,video_url,favorites_count,difficulty,cook_time_minutes,created_at,created_by",
    )
    .eq("id", id)
    .maybeSingle();

  if (rErr || !recipe) return null;

  let favoredByUser = false;
  if (user) {
    const { data: fav } = await supabase
      .from("favorites")
      .select("recipe_id")
      .eq("recipe_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    favoredByUser = Boolean(fav);
  }

  const { data: ri } = await supabase
    .from("recipe_ingredients")
    .select("quantity,sort_order,ingredient_id")
    .eq("recipe_id", id)
    .order("sort_order", { ascending: true });

  const ingredientIds = [
    ...new Set(
      (ri ?? []).map((x: { ingredient_id: string }) => x.ingredient_id),
    ),
  ];
  const { data: ings } = ingredientIds.length
    ? await supabase.from("ingredients").select("id,name").in("id", ingredientIds)
    : { data: [] };

  const nameById = new Map(
    (ings ?? []).map((i: { id: string; name: string }) => [i.id, i.name] as const),
  );

  const ingredientsList: {
    quantity: string | null;
    sort_order: number;
    name: string;
  }[] = (ri ?? []).map(
    (row: {
      quantity: string | null;
      sort_order: number;
      ingredient_id: string;
    }) => ({
      quantity: row.quantity,
      sort_order: row.sort_order,
      name: nameById.get(row.ingredient_id) ?? "unknown",
    }),
  );

  const { data: wines } = await supabase
    .from("wine_pairings")
    .select("id,wine_type,wine_name,notes,description,purchase_url")
    .eq("recipe_id", id);

  const { data: tagsJoin } = await supabase
    .from("recipe_tags")
    .select("tag_id")
    .eq("recipe_id", id);

  const tagIds = [
    ...new Set((tagsJoin ?? []).map((t: { tag_id: string }) => t.tag_id)),
  ];
  let tagRows: { id: string; name: string }[] = [];
  if (tagIds.length > 0) {
    const res = await supabase.from("tags").select("id,name").in("id", tagIds);
    tagRows = res.data ?? [];
  }

  const planForWine = await getCurrentUserPlanType(supabase);

  let allergyBanner: { variant: "strict" | "warn"; names: string[] } | null =
    null;
  let chefProfileHref: string | null = null;
  let chefDisplayName: string | null = null;
  const createdBy =
    recipe && "created_by" in recipe && recipe.created_by
      ? (recipe.created_by as string)
      : null;
  if (createdBy) {
    chefProfileHref = `/chef/${createdBy}`;
    const { data: chefRows } = await supabase.rpc("chef_public_profile", {
      p_user_id: createdBy,
    });
    if (Array.isArray(chefRows) && chefRows.length > 0) {
      const row = chefRows[0] as { display_name: string | null };
      chefDisplayName = row.display_name?.trim() || null;
    }
  }

  if (user) {
    const { data: raRows } = await supabase
      .from("recipe_allergens")
      .select("allergen_id")
      .eq("recipe_id", id);
    const recipeAllergenIds = (raRows ?? []).map(
      (r: { allergen_id: string }) => r.allergen_id,
    );
    if (recipeAllergenIds.length > 0) {
      const { data: uaRows } = await supabase
        .from("user_allergies")
        .select("allergen_id")
        .eq("user_id", user.id);
      const userAllergenSet = new Set(
        (uaRows ?? []).map((r: { allergen_id: string }) => r.allergen_id),
      );
      const overlapIds = recipeAllergenIds.filter((aid) =>
        userAllergenSet.has(aid),
      );
      if (overlapIds.length > 0) {
        const { data: nameRows } = await supabase
          .from("allergens")
          .select("name")
          .in("id", overlapIds);
        const names = (nameRows ?? [])
          .map((n: { name: string }) => n.name)
          .sort((a, b) => a.localeCompare(b));
        const { data: profRow } = await supabase
          .from("profiles")
          .select("allergy_mode")
          .eq("id", user.id)
          .maybeSingle();
        const variant =
          profRow?.allergy_mode === "warn" ? "warn" : "strict";
        allergyBanner = { variant, names };
      }
    }
  }

  return {
    recipe,
    ingredientsList,
    wines: wines ?? [],
    tags: tagRows,
    planForWine,
    favoredByUser,
    authenticated: Boolean(user),
    allergyBanner,
    chefProfileHref,
    chefDisplayName,
  };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params;
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  const brand = dict.brand;
  const data = await loadRecipe(id);

  let metadataBase: URL | undefined;
  const siteRaw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteRaw?.length) {
    try {
      metadataBase = new URL(siteRaw);
    } catch {
      metadataBase = undefined;
    }
  }

  if (!data) {
    return {
      ...(metadataBase ? { metadataBase } : {}),
      title: dictText(dict, "recipe_meta_missing", { brand }),
    };
  }

  const desc = summarizeForMeta(
    data.recipe.instructions?.trim()?.length
      ? data.recipe.instructions
      : data.recipe.title,
  );
  const ogImages = data.recipe.image_url
    ? [{ url: data.recipe.image_url }]
    : undefined;

  return {
    ...(metadataBase ? { metadataBase } : {}),
    title: dictText(dict, "recipe_meta_detail", {
      title: data.recipe.title,
      brand,
    }),
    description: desc,
    openGraph: {
      title: data.recipe.title,
      description: desc,
      type: "article",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: data.recipe.title,
      description: desc,
      ...(ogImages ? { images: ogImages } : {}),
    },
  };
}

export default async function RecipeDetailPage(props: Props) {
  const { id } = await props.params;
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  const payload = await loadRecipe(id);

  if (!payload) {
    notFound();
  }

  const supabaseForTelemetry = await createSupabaseServerClient();
  if (supabaseForTelemetry && payload.authenticated) {
    await logEvent(supabaseForTelemetry, {
      type: "recipe_viewed",
      metadata: { recipe_id: payload.recipe.id },
    });
  }

  const {
    recipe,
    ingredientsList,
    wines,
    tags,
    planForWine,
    favoredByUser,
    authenticated,
    allergyBanner,
    chefProfileHref,
    chefDisplayName,
  } = payload;
  const yt = parseYoutubeVideoId(recipe.video_url);
  const wineUnlocked = planForWine
    ? winePairingsUnlockedForPlan(planForWine)
    : false;

  const difficultyLabel =
    recipe.difficulty && recipe.difficulty.trim()
      ? `${recipe.difficulty.trim().slice(0, 1).toUpperCase()}${recipe.difficulty.trim().slice(1)}`
      : null;
  const savesLabel =
    recipe.favorites_count === 1
      ? dictText(dict, "recipe_detail_save_one", {
          count: recipe.favorites_count,
        })
      : dictText(dict, "recipe_detail_save_many", {
          count: recipe.favorites_count,
        });

  const metaSentence = [
    difficultyLabel,
    recipe.cook_time_minutes != null ? `${recipe.cook_time_minutes} min` : null,
    savesLabel,
  ]
    .filter((x): x is string => Boolean(x))
    .join(" · ");

  return (
    <ContentPageBackdrop pageKey={`/recipes/detail|${id}`}>
    <article className="mx-auto w-full max-w-2xl flex-1 px-5 pb-12 pt-8">
      <RecipeDetailHero
        title={recipe.title}
        imageUrl={recipe.image_url}
        imageAlt={
          recipe.image_url
            ? dictText(dict, "recipe_detail_photo_alt", { title: recipe.title })
            : ""
        }
      />

      {allergyBanner ? (
        <div
          className={`mt-6 rounded-xl border px-4 py-3 text-sm leading-relaxed ${
            allergyBanner.variant === "strict"
              ? "border-[color-mix(in_srgb,var(--danger)_40%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]"
              : "border-[color-mix(in_srgb,var(--muted)_45%,var(--border))] bg-[color-mix(in_srgb,var(--muted)_14%,var(--card))] text-[var(--text)]"
          }`}
          role="alert"
        >
          <p className="font-semibold">
            {allergyBanner.variant === "strict"
              ? dictText(dict, "recipe_detail_allergen_alert_title")
              : dictText(dict, "recipe_detail_allergen_notice_title")}
          </p>
          <p className="mt-1">
            {dictText(dict, "recipe_detail_allergen_intro")}{" "}
            {allergyBanner.names.join(", ")}.
            {allergyBanner.variant === "strict"
              ? ` ${dictText(dict, "recipe_detail_allergen_strict_note")}`
              : ` ${dictText(dict, "recipe_detail_allergen_warn_note")}`}
          </p>
        </div>
      ) : null}

      <header className="mt-8">
        <h1 className="text-[1.75rem] font-bold tracking-tight text-[var(--text)] sm:text-4xl">
          {recipe.title}
        </h1>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[length:var(--text-meta)] leading-relaxed tracking-tight text-[var(--muted)]">
            {metaSentence}
          </p>
          <RecipeFavoriteButton
            key={`${recipe.id}-${favoredByUser}-${recipe.favorites_count}`}
            recipeId={recipe.id}
            loginNextPath={`/recipes/${recipe.id}`}
            authenticated={authenticated}
            initialFavored={favoredByUser}
            initialCount={recipe.favorites_count}
          />
        </div>
        {tags.length > 0 ? (
          <ul className="mt-5 flex flex-wrap gap-2">
            {tags.map((t) => (
              <li
                key={t.id}
                className="rounded-full bg-[color-mix(in_srgb,var(--muted)_25%,transparent)] px-2.5 py-0.5 text-xs font-semibold tracking-tight text-[var(--text)]"
              >
                {t.name}
              </li>
            ))}
          </ul>
        ) : null}
        {chefProfileHref ? (
          <p className="mt-5 text-sm text-[var(--muted)]">
            <span className="text-[var(--muted)]">
              {dictText(dict, "recipe_detail_chef_label")}{" "}
            </span>
            <Link
              href={chefProfileHref}
              className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
            >
              {chefDisplayName ?? dictText(dict, "recipe_detail_view_profile")}
            </Link>
          </p>
        ) : null}
      </header>

      <section className="mt-11" aria-labelledby="ingredients-heading">
        <h2
          id="ingredients-heading"
          className="text-xl font-semibold tracking-tight text-[var(--text)]"
        >
          {dictText(dict, "recipe_detail_section_ingredients")}
        </h2>
        <ul className="mt-4 space-y-3">
          {ingredientsList.map((ing, idx) => (
            <li
              key={`${ing.sort_order}-${ing.name}-${idx}`}
              className="flex gap-3 rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] px-4 py-3 shadow-[0_1px_0_rgba(28,25,23,0.03)]"
            >
              <input
                type="checkbox"
                className="mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 accent-[var(--primary)]"
                aria-label={ing.name}
              />
              <span className="text-[0.9375rem] leading-relaxed text-[var(--text)]">
                {ing.quantity ? (
                  <span className="font-medium text-[var(--muted)]">
                    {ing.quantity}{" "}
                  </span>
                ) : null}
                <span>{ing.name}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="instructions-heading">
        <h2
          id="instructions-heading"
          className="text-xl font-semibold tracking-tight text-[var(--text)]"
        >
          {dictText(dict, "recipe_detail_section_instructions")}
        </h2>
        <div className="mt-4 whitespace-pre-wrap text-[0.9375rem] leading-[1.72] tracking-tight text-[var(--text)]">
          {recipe.instructions}
        </div>
      </section>

      {yt ? (
        <section className="mt-12" aria-labelledby="video-heading">
          <h2
            id="video-heading"
            className="text-xl font-semibold tracking-tight text-[var(--text)]"
          >
            {dictText(dict, "recipe_detail_section_video")}
          </h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-black shadow-[var(--shadow-card)]">
            <div className="aspect-video w-full">
              <iframe
                title={dictText(dict, "recipe_detail_video_frame_title")}
                src={`https://www.youtube.com/embed/${yt}`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-12" aria-labelledby="wine-heading">
        <h2
          id="wine-heading"
          className="text-xl font-semibold tracking-tight text-[var(--text)]"
        >
          {dictText(dict, "recipe_detail_section_wine")}
        </h2>
        {wines.length === 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            {dictText(dict, "recipe_detail_wine_empty")}
          </p>
        ) : (
          <div
            className={`relative mt-4 rounded-xl border border-[color-mix(in_srgb,var(--muted)_35%,transparent)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)] ${wineUnlocked ? "" : "overflow-hidden"}`}
          >
            <ul
              className={`space-y-3 text-sm leading-relaxed ${wineUnlocked ? "" : "blur-sm select-none"}`}
            >
              {wines.map(
                (w: {
                  id: string;
                  wine_type: string;
                  wine_name: string | null;
                  notes: string | null;
                  description: string | null;
                  purchase_url: string | null;
                }) => {
                  const buyUrl =
                    wineUnlocked &&
                    w.purchase_url &&
                    isAmazonAffiliateProductUrl(w.purchase_url)
                      ? w.purchase_url
                      : null;
                  return (
                    <li key={w.id}>
                      <p className="font-semibold text-[var(--text)]">
                        {w.wine_type}
                        {w.wine_name ? ` — ${w.wine_name}` : ""}
                      </p>
                      {w.description ? (
                        <p className="mt-1 text-[var(--muted)]">{w.description}</p>
                      ) : null}
                      {w.notes ? (
                        <p className="mt-1 text-[length:var(--text-caption)] text-[var(--muted)]">
                          {w.notes}
                        </p>
                      ) : null}
                      {buyUrl ? (
                        <p className="mt-2">
                          <AffiliateOutboundLink
                            href={buyUrl}
                            recipeId={recipe.id}
                            linkType="wine_buy"
                            className="text-sm font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
                          >
                            {dictText(dict, "recipe_detail_wine_shop")}
                          </AffiliateOutboundLink>
                        </p>
                      ) : null}
                    </li>
                  );
                },
              )}
            </ul>
            {!wineUnlocked ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[color-mix(in_srgb,var(--bg)_65%,transparent)] px-4 text-center backdrop-blur-[2px]">
                <p className="text-sm font-medium leading-relaxed text-[var(--text)]">
                  {dictText(dict, "recipe_detail_wine_unlock_prompt")}
                </p>
                <Link
                  href="/upgrade"
                  className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
                >
                  {dictText(dict, "recipe_detail_wine_view_plans")}
                </Link>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <footer className="mt-16 border-t border-[var(--border)] pt-10">
        <Link
          href="/recipes"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] underline-offset-4 hover:text-[var(--text)] hover:underline"
        >
          <span aria-hidden>←</span>
          {dictText(dict, "recipe_detail_back_recipes")}
        </Link>
      </footer>
    </article>
    </ContentPageBackdrop>
  );
}
