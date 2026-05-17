import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AffiliateOutboundLink } from "@/components/affiliate/AffiliateOutboundLink";
import { UpgradePitch } from "@/components/billing/UpgradePitch";
import { ContentPageBackdrop } from "@/components/layout/ContentPageBackdrop";
import { ChefAvatar } from "@/components/chef/ChefAvatar";
import { RecipeDetailHero } from "@/components/recipe/RecipeDetailHero";
import { RecipeDetailIngredientsSection } from "@/components/recipe/RecipeDetailIngredientsSection";
import { RecipeExperienceForm } from "@/components/recipe/RecipeExperienceForm";
import { RecipeExcludeButton } from "@/components/recipe/RecipeExcludeButton";
import { RecipeFavoriteButton } from "@/components/recipe/RecipeFavoriteButton";
import { RecipeIncludeAgainButton } from "@/components/recipe/RecipeIncludeAgainButton";
import type { RecipeExperienceRow } from "@/app/actions/recipe-experiences";
import { resolveRecipeDisplayImageUrl } from "@/lib/demo-recipe-cover-images";
import { isAmazonAffiliateProductUrl } from "@/lib/amazon-affiliate-url";
import { winePairingsUnlockedForPlan, type PlanType } from "@/lib/plan";
import { getCurrentUserPlanType } from "@/lib/profile";
import { logEvent } from "@/lib/telemetry";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dictText, getDictionary, resolveAppLocale } from "@/lib/i18n/server";
import {
  matchedOtherAllergenTokens,
  parseOtherAllergenTokens,
} from "@/lib/allergy-other";
import { resolvePantryUserIngredientIds } from "@/lib/pantry-ingredient-resolve";
import { parseYoutubeVideoId } from "@/lib/youtube";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
};

function summarizeForMeta(text: string, max = 160): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length <= max
    ? normalized
    : `${normalized.slice(0, Math.max(0, max - 1))}\u2026`;
}

async function loadRecipe(
  id: string,
  options?: { pantryMatchText?: string },
) {
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

  const { data: whipFlipCountRaw, error: whipFlipErr } = await supabase.rpc(
    "recipe_whip_flip_count",
    { p_recipe_id: id },
  );
  const whipFlipCount =
    !whipFlipErr && typeof whipFlipCountRaw === "number" && whipFlipCountRaw >= 0
      ? whipFlipCountRaw
      : 0;

  let favoredByUser = false;
  let excludedByUser = false;
  if (user) {
    const [{ data: fav }, { data: excl }] = await Promise.all([
      supabase
        .from("favorites")
        .select("recipe_id")
        .eq("recipe_id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("user_excluded_recipes")
        .select("recipe_id")
        .eq("recipe_id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    favoredByUser = Boolean(fav);
    excludedByUser = Boolean(excl);
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
    ingredient_id: string;
    quantity: string | null;
    sort_order: number;
    name: string;
  }[] = (ri ?? []).map(
    (row: {
      quantity: string | null;
      sort_order: number;
      ingredient_id: string;
    }) => ({
      ingredient_id: row.ingredient_id,
      quantity: row.quantity,
      sort_order: row.sort_order,
      name: nameById.get(row.ingredient_id) ?? "unknown",
    }),
  );

  let pantryHaveIngredientIds: Set<string> | null = null;
  const pantryText = options?.pantryMatchText?.trim();
  if (pantryText) {
    const resolved = await resolvePantryUserIngredientIds(supabase, pantryText);
    if (resolved.ok) {
      pantryHaveIngredientIds = resolved.userIngredientIds;
    }
  }

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
  let chefAvatarUrl: string | null = null;
  let uploaderCookbook: {
    id: string;
    title: string;
    cover_image_url: string | null;
    external_link: string;
  } | null = null;
  let recipeExperience: RecipeExperienceRow | null = null;
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
      const row = chefRows[0] as {
        display_name: string | null;
        avatar_url: string | null;
      };
      chefDisplayName = row.display_name?.trim() || null;
      chefAvatarUrl = row.avatar_url?.trim() || null;
    }

    const { data: cookbookRows } = await supabase
      .from("cookbooks")
      .select("id,title,cover_image_url,external_link")
      .eq("created_by", createdBy)
      .not("external_link", "is", null)
      .order("title", { ascending: true })
      .limit(1);
    if (Array.isArray(cookbookRows) && cookbookRows.length > 0) {
      const row = cookbookRows[0] as {
        id: string;
        title: string;
        cover_image_url: string | null;
        external_link: string | null;
      };
      const link = row.external_link?.trim();
      if (link && isAmazonAffiliateProductUrl(link)) {
        uploaderCookbook = {
          id: row.id,
          title: row.title,
          cover_image_url: row.cover_image_url,
          external_link: link,
        };
      }
    }
  }

  if (user) {
    const { data: expRow } = await supabase
      .from("user_recipe_experiences")
      .select("made_recipe, rating, spent_cents")
      .eq("user_id", user.id)
      .eq("recipe_id", id)
      .maybeSingle();
    if (expRow) {
      recipeExperience = {
        madeRecipe: Boolean(expRow.made_recipe),
        rating:
          typeof expRow.rating === "number" &&
          expRow.rating >= 1 &&
          expRow.rating <= 10
            ? expRow.rating
            : null,
        spentCents:
          typeof expRow.spent_cents === "number" && expRow.spent_cents >= 0
            ? expRow.spent_cents
            : null,
      };
    }

    const { data: profRow } = await supabase
      .from("profiles")
      .select("allergy_mode, allergy_other")
      .eq("id", user.id)
      .maybeSingle();
    const variant =
      profRow?.allergy_mode === "warn" ? "warn" : "strict";

    const overlapNames: string[] = [];

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
        overlapNames.push(
          ...(nameRows ?? []).map((n: { name: string }) => n.name),
        );
      }
    }

    const otherToks = parseOtherAllergenTokens(profRow?.allergy_other);
    const ingredientNames = ingredientsList.map((x) => x.name);
    if (otherToks.length > 0 && ingredientNames.length > 0) {
      overlapNames.push(
        ...matchedOtherAllergenTokens(ingredientNames, otherToks),
      );
    }

    const names = [...new Set(overlapNames)].sort((a, b) =>
      a.localeCompare(b),
    );
    if (names.length > 0) {
      allergyBanner = { variant, names };
    }
  }

  return {
    recipe,
    ingredientsList,
    pantryHaveIngredientIds,
    wines: wines ?? [],
    tags: tagRows,
    planForWine,
    favoredByUser,
    excludedByUser,
    authenticated: Boolean(user),
    allergyBanner,
    chefProfileHref,
    chefDisplayName,
    chefAvatarUrl,
    uploaderCookbook,
    recipeExperience,
    whipFlipCount,
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
  const displayImageUrl = resolveRecipeDisplayImageUrl(
    data.recipe.id,
    data.recipe.image_url,
  );
  const ogImages = displayImageUrl ? [{ url: displayImageUrl }] : undefined;

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
  const sp = await props.searchParams;
  const qRaw = typeof sp.q === "string" ? sp.q.trim() : "";
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  const payload = await loadRecipe(id, {
    pantryMatchText: qRaw || undefined,
  });

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
    pantryHaveIngredientIds,
    wines,
    tags,
    planForWine,
    favoredByUser,
    excludedByUser,
    authenticated,
    allergyBanner,
    chefProfileHref,
    chefDisplayName,
    chefAvatarUrl,
    uploaderCookbook,
    recipeExperience,
    whipFlipCount,
  } = payload;
  const loginNextPath =
    qRaw.length > 0 ? `/recipes/${recipe.id}?q=${encodeURIComponent(qRaw)}` : `/recipes/${recipe.id}`;
  const detailIngredients = ingredientsList.map((ing) => ({
    ingredientId: ing.ingredient_id,
    name: ing.name,
    quantity: ing.quantity,
    sortOrder: ing.sort_order,
  }));
  const initialHaveIngredientIds = pantryHaveIngredientIds
    ? [...pantryHaveIngredientIds]
    : [];
  const displayImageUrl = resolveRecipeDisplayImageUrl(
    recipe.id,
    recipe.image_url,
  );
  const yt = parseYoutubeVideoId(recipe.video_url);
  const wineUnlocked = planForWine
    ? winePairingsUnlockedForPlan(planForWine)
    : false;
  const wineUpgradePlan: PlanType = planForWine ?? "free";

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
  const whipFlipLabel =
    whipFlipCount > 0
      ? whipFlipCount === 1
        ? dictText(dict, "recipe_detail_whip_flip_one", { count: whipFlipCount })
        : dictText(dict, "recipe_detail_whip_flip_many", {
            count: whipFlipCount,
          })
      : null;

  const metaSentence = [
    difficultyLabel,
    recipe.cook_time_minutes != null ? `${recipe.cook_time_minutes} min` : null,
    savesLabel,
    whipFlipLabel,
  ]
    .filter((x): x is string => Boolean(x))
    .join(" · ");

  return (
    <ContentPageBackdrop pageKey={`/recipes/detail|${id}`}>
    <article className="mx-auto w-full max-w-2xl flex-1 px-5 pb-12 pt-8">
      <RecipeDetailHero
        title={recipe.title}
        imageUrl={displayImageUrl}
        imageAlt={
          displayImageUrl
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
          <div className="flex flex-wrap items-center justify-end gap-2">
            <RecipeFavoriteButton
              key={`${recipe.id}-${favoredByUser}-${recipe.favorites_count}`}
              recipeId={recipe.id}
              loginNextPath={`/recipes/${recipe.id}`}
              authenticated={authenticated}
              initialFavored={favoredByUser}
              initialCount={recipe.favorites_count}
            />
            {excludedByUser ? (
              <RecipeIncludeAgainButton
                recipeId={recipe.id}
                label={dictText(dict, "recipe_exclude_include_again")}
                pendingLabel={dictText(dict, "recipe_exclude_including")}
              />
            ) : (
              <RecipeExcludeButton
                recipeId={recipe.id}
                loginNextPath={`/recipes/${recipe.id}`}
                authenticated={authenticated}
                redirectAfterExclude="/recipes"
                label={dictText(dict, "recipe_exclude_hide")}
                pendingLabel={dictText(dict, "recipe_exclude_hiding")}
              />
            )}
          </div>
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
          <div className="mt-5 flex items-center gap-3">
            <ChefAvatar
              avatarUrl={chefAvatarUrl}
              displayName={chefDisplayName}
              href={chefProfileHref}
              size="md"
            />
            <p className="text-sm text-[var(--muted)]">
              <span>{dictText(dict, "recipe_detail_chef_label")} </span>
              <Link
                href={chefProfileHref}
                className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
              >
                {chefDisplayName ?? dictText(dict, "recipe_detail_view_profile")}
              </Link>
            </p>
          </div>
        ) : null}
      </header>

      <RecipeDetailIngredientsSection
        ingredients={detailIngredients}
        initialHaveIngredientIds={initialHaveIngredientIds}
        labels={{
          sectionTitle: dictText(dict, "recipe_detail_section_ingredients"),
          estimatedMissingCost: dictText(dict, "help_cook_estimated_missing_cost", {
            amount: "{{amount}}",
          }),
          costDisclaimer: dictText(dict, "help_cook_cost_estimate_disclaimer"),
          haveAllIngredients: dictText(dict, "help_cook_have_all_ingredients"),
        }}
      />

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
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-[color-mix(in_srgb,var(--bg)_65%,transparent)] px-4 py-4 text-center backdrop-blur-[2px]">
                <p className="text-sm font-medium leading-relaxed text-[var(--text)]">
                  {dictText(dict, "recipe_detail_wine_unlock_prompt")}
                </p>
                <UpgradePitch
                  currentPlan={wineUpgradePlan}
                  compact
                  className="max-w-sm"
                />
              </div>
            ) : null}
          </div>
        )}
      </section>

      {uploaderCookbook ? (
        <section className="mt-12" aria-labelledby="uploader-cookbook-heading">
          <h2
            id="uploader-cookbook-heading"
            className="text-xl font-semibold tracking-tight text-[var(--text)]"
          >
            {dictText(dict, "recipe_detail_section_cookbook")}
          </h2>
          <AffiliateOutboundLink
            href={uploaderCookbook.external_link}
            recipeId={recipe.id}
            linkType="cookbook_amazon"
            className="group mt-4 flex items-center gap-4 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-3 shadow-[var(--shadow-card)] transition-[border-color,box-shadow,transform] duration-200 hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] hover:shadow-[var(--shadow-card-hover)] active:scale-[0.992] md:active:scale-100"
          >
            <div className="relative aspect-[3/4] h-24 w-auto shrink-0 overflow-hidden rounded-md bg-[color-mix(in_srgb,var(--muted)_12%,var(--card))]">
              {uploaderCookbook.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- Amazon / arbitrary HTTPS covers
                <img
                  src={uploaderCookbook.cover_image_url}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-2xl opacity-[0.35]"
                  aria-hidden
                >
                  📚
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {chefDisplayName ? (
                <p className="text-[length:var(--text-caption)] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {dictText(dict, "recipe_detail_cookbook_by", {
                    name: chefDisplayName,
                  })}
                </p>
              ) : null}
              <p className="mt-1 line-clamp-2 text-base font-semibold leading-snug text-[var(--text)]">
                {uploaderCookbook.title}
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
                {dictText(dict, "recipe_detail_cookbook_cta")}
              </p>
            </div>
          </AffiliateOutboundLink>
        </section>
      ) : null}

      <RecipeExperienceForm
        recipeId={recipe.id}
        authenticated={authenticated}
        loginNextPath={loginNextPath}
        initial={recipeExperience}
        labels={{
          sectionTitle: dictText(dict, "recipe_experience_heading"),
          madeLabel: dictText(dict, "recipe_experience_made_label"),
          ratingLabel: dictText(dict, "recipe_experience_rating_label"),
          ratingHint: dictText(dict, "recipe_experience_rating_hint"),
          spentLabel: dictText(dict, "recipe_experience_spent_label"),
          spentHint: dictText(dict, "recipe_experience_spent_hint"),
          save: dictText(dict, "recipe_experience_save"),
          saving: dictText(dict, "recipe_experience_saving"),
          signInPrompt: dictText(dict, "recipe_experience_sign_in_suffix"),
          signInLink: dictText(dict, "profile_sign_in_link"),
          saved: dictText(dict, "recipe_experience_saved"),
        }}
      />

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
