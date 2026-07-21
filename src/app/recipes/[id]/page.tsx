import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AffiliateOutboundLink } from "@/components/affiliate/AffiliateOutboundLink";
import { ContentPageBackdrop } from "@/components/layout/ContentPageBackdrop";
import { ChefAvatar } from "@/components/chef/ChefAvatar";
import { CreatorBadgeLevelUpCelebration } from "@/components/creator/CreatorBadgeLevelUpCelebration";
import { RecipeUploadBadge } from "@/components/creator/RecipeUploadBadge";
import { RecipeDetailIngredientsSection } from "@/components/recipe/RecipeDetailIngredientsSection";
import { RecipeDetailMedia } from "@/components/recipe/RecipeDetailMedia";
import { RecipeDetailReelSection } from "@/components/recipe/RecipeDetailReelSection";
import { RecipeExperienceForm } from "@/components/recipe/RecipeExperienceForm";
import { RecipeExcludeButton } from "@/components/recipe/RecipeExcludeButton";
import { RecipeFavoriteButton } from "@/components/recipe/RecipeFavoriteButton";
import { RecipeIncludeAgainButton } from "@/components/recipe/RecipeIncludeAgainButton";
import { RecipePremiumTools } from "@/components/recipe/RecipePremiumTools";
import { RecipeViewTelemetry } from "@/components/recipe/RecipeViewTelemetry";
import { RecipeCommunityWinePairingsSection } from "@/components/recipe/RecipeCommunityWinePairingsSection";
import {
  RecipeWinePairingsSection,
  type WinePairingRow,
} from "@/components/recipe/RecipeWinePairingsSection";
import {
  aggregateWineTypeCounts,
  type UserWinePairingRow,
} from "@/lib/user-wine-pairings";
import { CURATED_WINE_TYPES } from "@/lib/wine-types";
import type { RecipeExperienceRow } from "@/app/actions/recipe-experiences";
import { resolveRecipeDisplayImageUrl } from "@/lib/demo-recipe-cover-images";
import { isAmazonAffiliateProductUrl } from "@/lib/amazon-affiliate-url";
import {
  isProOrAbove,
  winePairingsUnlockedForPlan,
  type PlanType,
} from "@/lib/plan";
import { getCurrentUserPlanType } from "@/lib/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dictText, getDictionary, resolveAppLocale } from "@/lib/i18n/server";
import {
  matchedOtherAllergenTokens,
  parseOtherAllergenTokens,
} from "@/lib/allergy-other";
import { resolvePantryIngredientTokens } from "@/lib/pantry-ingredient-resolve";
import { parseRecipeVideoUrl } from "@/lib/video-url";
import {
  parseCelebratedUploadBadgeTier,
  recipeUploadBadgeLabelKey,
  resolveRecipeUploadBadgeTier,
  shouldCelebrateUploadBadge,
} from "@/lib/recipe-upload-badges";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; review?: string; edit?: string }>;
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
      "id,title,instructions,image_url,video_url,hosted_reel_url,favorites_count,difficulty,cook_time_minutes,created_at,created_by,moderation_status,moderation_reason",
    )
    .eq("id", id)
    .maybeSingle();

  if (rErr || !recipe) return null;

  const { data: galleryRows } = await supabase
    .from("recipe_images")
    .select("id,image_url,sort_order")
    .eq("recipe_id", id)
    .order("sort_order", { ascending: true });

  const galleryPhotos = (galleryRows ?? [])
    .map((row: { id: string; image_url: string | null }) => ({
      id: row.id,
      imageUrl: row.image_url?.trim() ?? "",
    }))
    .filter((row) => row.imageUrl.length > 0);

  const galleryImageUrls = galleryPhotos.map((row) => row.imageUrl);

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
    .select("quantity,sort_order,ingredient_id,price_cents")
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
    price_cents: number | null;
  }[] = (ri ?? []).map(
    (row: {
      quantity: string | null;
      sort_order: number;
      ingredient_id: string;
      price_cents: number | null;
    }) => ({
      ingredient_id: row.ingredient_id,
      quantity: row.quantity,
      sort_order: row.sort_order,
      price_cents: row.price_cents,
      name: nameById.get(row.ingredient_id) ?? "unknown",
    }),
  );

  let pantryHaveIngredientIds: Set<string> | null = null;
  const pantryText = options?.pantryMatchText?.trim();
  if (pantryText) {
    const resolved = await resolvePantryIngredientTokens(supabase, pantryText);
    if (resolved.ok) {
      pantryHaveIngredientIds = resolved.data.userUnion;
    }
  }

  const planForWine = await getCurrentUserPlanType(supabase);
  const wineUnlockedForLoad = planForWine
    ? winePairingsUnlockedForPlan(planForWine)
    : false;

  let wines: WinePairingRow[] = [];
  let winePairingCount = 0;
  if (wineUnlockedForLoad) {
    const { data: wineRows } = await supabase
      .from("wine_pairings")
      .select("id,wine_type,wine_name,notes,description,purchase_url")
      .eq("recipe_id", id)
      .eq("source", "ai");
    wines = (wineRows ?? []) as WinePairingRow[];
  } else {
    const { count } = await supabase
      .from("wine_pairings")
      .select("id", { count: "exact", head: true })
      .eq("recipe_id", id)
      .eq("source", "ai");
    winePairingCount = typeof count === "number" && count > 0 ? count : 0;
  }

  const { data: communityWineRows } = await supabase
    .from("wine_pairings")
    .select(
      "id,wine_type,wine_type_slug,wine_name,why_blurb,created_at,user_id",
    )
    .eq("recipe_id", id)
    .eq("source", "user")
    .order("created_at", { ascending: false });

  const communityWines: UserWinePairingRow[] = (communityWineRows ?? []).map(
    (row: {
      id: string;
      wine_type: string;
      wine_type_slug: string | null;
      wine_name: string | null;
      why_blurb: string | null;
      created_at: string;
      user_id: string | null;
    }) => ({
      id: row.id,
      wine_type: row.wine_type,
      wine_type_slug: row.wine_type_slug,
      wine_name: row.wine_name,
      why_blurb: row.why_blurb,
      created_at: row.created_at,
      user_id: row.user_id ?? "",
      submitter_name: null,
    }),
  );
  const communityWineTypeCounts = aggregateWineTypeCounts(communityWines);

  let allergyBanner: { variant: "strict" | "warn"; names: string[] } | null =
    null;
  let chefProfileHref: string | null = null;
  let chefDisplayName: string | null = null;
  let chefAvatarUrl: string | null = null;
  let chefUploadedRecipeCount = 0;
  let uploaderCookbook: {
    id: string;
    title: string;
    cover_image_url: string | null;
    external_link: string;
  } | null = null;
  let recipeExperience: RecipeExperienceRow | null = null;
  let celebratedUploadBadgeTierRaw: string | null = null;
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

    const { count: chefRecipeCount } = await supabase
      .from("recipes")
      .select("*", { count: "exact", head: true })
      .eq("created_by", createdBy);
    if (typeof chefRecipeCount === "number" && chefRecipeCount >= 0) {
      chefUploadedRecipeCount = chefRecipeCount;
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
    if (createdBy && user.id === createdBy) {
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("celebrated_upload_badge_tier")
        .eq("id", user.id)
        .maybeSingle();
      celebratedUploadBadgeTierRaw =
        ownerProfile?.celebrated_upload_badge_tier ?? null;
    }

    const { data: expRow } = await supabase
      .from("user_recipe_experiences")
      .select("made_recipe, rating, spent_cents, review_text, review_moderation_status")
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
        reviewText:
          typeof expRow.review_text === "string" && expRow.review_text.trim()
            ? expRow.review_text.trim()
            : null,
        reviewPendingReview: expRow.review_moderation_status === "pending_review",
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
    wines,
    winePairingCount,
    communityWines,
    communityWineTypeCounts,
    planForWine,
    currentUserId: user?.id ?? null,
    favoredByUser,
    excludedByUser,
    authenticated: Boolean(user),
    allergyBanner,
    chefProfileHref,
    chefDisplayName,
    chefAvatarUrl,
    chefUploadedRecipeCount,
    uploaderCookbook,
    recipeExperience,
    whipFlipCount,
    galleryImageUrls,
    galleryPhotos,
    celebratedUploadBadgeTierRaw,
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

  const {
    recipe,
    ingredientsList,
    pantryHaveIngredientIds,
    wines,
    winePairingCount,
    communityWines,
    communityWineTypeCounts,
    planForWine,
    currentUserId,
    favoredByUser,
    excludedByUser,
    authenticated,
    allergyBanner,
    chefProfileHref,
    chefDisplayName,
    chefAvatarUrl,
    chefUploadedRecipeCount,
    uploaderCookbook,
    recipeExperience,
    whipFlipCount,
    galleryImageUrls,
    galleryPhotos,
    celebratedUploadBadgeTierRaw,
  } = payload;
  const showReviewPendingBanner =
    sp.review === "pending" ||
    (recipe as { moderation_status?: string }).moderation_status ===
      "pending_review";
  const editMode = sp.edit === "1" || sp.edit === "true";
  const recipeViewParams = new URLSearchParams();
  if (qRaw) recipeViewParams.set("q", qRaw);
  const recipeViewQs = recipeViewParams.toString();
  const recipeViewPath = recipeViewQs
    ? `/recipes/${recipe.id}?${recipeViewQs}`
    : `/recipes/${recipe.id}`;
  const editRecipeParams = new URLSearchParams(recipeViewParams);
  editRecipeParams.set("edit", "1");
  const editRecipePath = `/recipes/${recipe.id}?${editRecipeParams.toString()}`;
  const loginNextPath =
    qRaw.length > 0 ? `/recipes/${recipe.id}?q=${encodeURIComponent(qRaw)}` : `/recipes/${recipe.id}`;
  const detailIngredients = ingredientsList.map((ing) => ({
    ingredientId: ing.ingredient_id,
    name: ing.name,
    quantity: ing.quantity,
    sortOrder: ing.sort_order,
    priceCents: ing.price_cents,
  }));
  const initialHaveIngredientIds = pantryHaveIngredientIds
    ? [...pantryHaveIngredientIds]
    : [];
  const displayImageUrl = resolveRecipeDisplayImageUrl(
    recipe.id,
    recipe.image_url,
  );
  const galleryDisplayUrls = (
    galleryImageUrls.length > 0
      ? galleryImageUrls
      : recipe.image_url
        ? [recipe.image_url]
        : []
  )
    .map((url) => resolveRecipeDisplayImageUrl(recipe.id, url) ?? url.trim())
    .filter((url) => url.length > 0);

  const galleryPhotosForEdit =
    galleryPhotos.length > 0
      ? galleryPhotos
      : recipe.image_url?.trim()
        ? [
            {
              id: `legacy-${recipe.id}`,
              imageUrl: recipe.image_url.trim(),
            },
          ]
        : [];
  const recipeVideo = parseRecipeVideoUrl(recipe.video_url);
  const wineUnlocked = planForWine
    ? winePairingsUnlockedForPlan(planForWine)
    : false;
  const wineUpgradePlan: PlanType = planForWine ?? "free";
  const premiumToolsPlan: PlanType = planForWine ?? "free";
  const premiumToolsUnlocked = isProOrAbove(premiumToolsPlan);
  const canEditRecipe =
    currentUserId != null && recipe.created_by === currentUserId;
  const chefUploadBadgeTier = resolveRecipeUploadBadgeTier(
    chefUploadedRecipeCount,
  );
  const chefUploadBadgeLabel =
    chefUploadBadgeTier != null
      ? dictText(dict, recipeUploadBadgeLabelKey(chefUploadBadgeTier))
      : null;
  const celebratedUploadBadgeTier = parseCelebratedUploadBadgeTier(
    celebratedUploadBadgeTierRaw,
  );
  const showOwnerBadgeCelebration =
    canEditRecipe &&
    chefUploadBadgeTier != null &&
    chefUploadBadgeLabel != null &&
    shouldCelebrateUploadBadge(
      chefUploadBadgeTier,
      celebratedUploadBadgeTier,
    );
  const wineTypeLabels = Object.fromEntries(
    CURATED_WINE_TYPES.map((t) => [
      t.slug,
      dictText(dict, t.labelKey),
    ]),
  );

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
    {showOwnerBadgeCelebration && chefUploadBadgeTier && chefUploadBadgeLabel ? (
      <CreatorBadgeLevelUpCelebration
        tier={chefUploadBadgeTier}
        celebratedTier={celebratedUploadBadgeTier}
        levelLabel={chefUploadBadgeLabel}
        title={dictText(dict, "creator_badge_celebration_title")}
        body={dictText(dict, "creator_badge_celebration_body", {
          level: chefUploadBadgeLabel,
        })}
        dismissLabel={dictText(dict, "creator_badge_celebration_dismiss")}
      />
    ) : null}
    <article className="mx-auto w-full max-w-2xl flex-1 px-5 pb-12 pt-8">
      <RecipeViewTelemetry recipeId={recipe.id} />
      <RecipeDetailMedia
        title={recipe.title}
        imageUrl={displayImageUrl}
        galleryImageUrls={galleryDisplayUrls}
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

      {showReviewPendingBanner && canEditRecipe ? (
        <div
          className="mt-6 rounded-xl border border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[var(--primary-muted)] px-4 py-3 text-sm leading-relaxed text-[var(--text)]"
          role="status"
        >
          <p className="font-semibold text-[var(--primary-hover)]">
            Pending review
          </p>
          <p className="mt-1 text-[var(--muted)]">
            This recipe is saved but hidden from browse and search until an admin
            approves the language. You can still view and edit it here.
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
        {chefProfileHref ? (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex items-center gap-3">
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
                  {chefDisplayName ??
                    dictText(dict, "recipe_detail_view_profile")}
                </Link>
              </p>
            </div>
            {chefUploadBadgeTier && chefUploadBadgeLabel ? (
              <RecipeUploadBadge
                tier={chefUploadBadgeTier}
                label={chefUploadBadgeLabel}
                size="sm"
              />
            ) : null}
          </div>
        ) : null}
      </header>

      <RecipeDetailReelSection
        videoFrameTitle={dictText(dict, "recipe_detail_video_frame_title")}
        posterUrl={displayImageUrl}
        hostedReelUrl={
          typeof recipe.hosted_reel_url === "string"
            ? recipe.hosted_reel_url
            : null
        }
        hostedReelHint={dictText(dict, "recipe_detail_hosted_reel_hint")}
        instagramEmbedSrc={
          recipeVideo?.provider === "instagram"
            ? recipeVideo.instagram.embedSrc
            : null
        }
        instagramInAppHint={dictText(
          dict,
          "recipe_detail_instagram_in_app_hint",
        )}
        instagramTapForSoundHint={dictText(
          dict,
          "recipe_detail_video_tap_for_sound",
        )}
        youtubeId={
          recipeVideo?.provider === "youtube" ? recipeVideo.youtubeId : null
        }
        youtubeTapForSoundHint={dictText(
          dict,
          "recipe_detail_video_tap_for_sound",
        )}
      />

      <RecipeDetailIngredientsSection
        ingredients={detailIngredients}
        initialHaveIngredientIds={initialHaveIngredientIds}
        labels={{
          sectionTitle: dictText(dict, "recipe_detail_section_ingredients"),
          ingredientsHint: dictText(dict, "recipe_detail_ingredients_have_hint"),
          estimatedToWhipCost: dictText(dict, "recipe_detail_estimated_to_whip_cost", {
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

      {(premiumToolsUnlocked || canEditRecipe) ? (
      <RecipePremiumTools
        recipe={{
          id: recipe.id,
          title: recipe.title,
          instructions: recipe.instructions,
          videoUrl: recipe.video_url,
          hostedReelUrl: recipe.hosted_reel_url,
        }}
        galleryPhotos={galleryPhotosForEdit}
        ingredients={detailIngredients}
        planType={premiumToolsPlan}
        canUseTools={premiumToolsUnlocked}
        canEdit={canEditRecipe}
        showEditForm={canEditRecipe && editMode && premiumToolsUnlocked}
        editRecipeHref={editRecipePath}
        doneEditingHref={recipeViewPath}
        labels={{
          heading: dictText(dict, "recipe_tools_heading"),
          lockedTitle: dictText(dict, "recipe_tools_locked_title"),
          lockedBody: dictText(dict, "recipe_tools_locked_body"),
          exportIntro: dictText(dict, "recipe_tools_export_intro"),
          print: dictText(dict, "recipe_tools_print"),
          downloadMarkdown: dictText(dict, "recipe_tools_download_markdown"),
          downloadCsv: dictText(dict, "recipe_tools_download_csv"),
          editHeading: dictText(dict, "recipe_tools_edit_heading"),
          editRecipeButton: dictText(dict, "recipe_tools_edit_recipe_button"),
          doneEditing: dictText(dict, "recipe_tools_done_editing"),
          titleLabel: dictText(dict, "recipe_tools_title_label"),
          ingredientsLabel: dictText(dict, "recipe_tools_ingredients_label"),
          instructionsLabel: dictText(dict, "recipe_tools_instructions_label"),
          videoLabel: dictText(dict, "recipe_tools_video_label"),
          videoHint: dictText(dict, "recipe_tools_video_hint"),
          videoPlaceholder: dictText(dict, "recipe_tools_video_placeholder"),
          save: dictText(dict, "recipe_tools_save"),
          saving: dictText(dict, "recipe_tools_saving"),
          saved: dictText(dict, "recipe_tools_saved"),
          ownerOnly: dictText(dict, "recipe_tools_owner_only"),
          planRequiredError: dictText(dict, "recipe_tools_plan_required_error"),
          galleryHeading: dictText(dict, "recipe_tools_gallery_heading"),
          galleryHint: dictText(dict, "recipe_tools_gallery_hint"),
          galleryCoverLabel: dictText(dict, "recipe_tools_gallery_cover"),
          gallerySetCoverLabel: dictText(dict, "recipe_tools_gallery_set_cover"),
          galleryMoveEarlier: dictText(dict, "recipe_tools_gallery_move_earlier"),
          galleryMoveLater: dictText(dict, "recipe_tools_gallery_move_later"),
          hostedReelLabel: dictText(dict, "add_recipe_hosted_reel_label"),
          hostedReelHint: dictText(dict, "add_recipe_hosted_reel_hint"),
          hostedReelCurrent: dictText(dict, "recipe_tools_hosted_reel_current"),
          uploadProgressTitle: dictText(dict, "add_recipe_save_progress_title"),
          uploadingReelLabel: dictText(
            dict,
            "add_recipe_save_progress_uploading_reel",
          ),
          uploadWarning: dictText(
            dict,
            "add_recipe_save_progress_upload_warning",
          ),
          uploadFailedTitle: dictText(dict, "add_recipe_upload_failed_title"),
          uploadRetry: dictText(dict, "add_recipe_upload_retry"),
        }}
      />
      ) : null}

      <RecipeWinePairingsSection
        recipeId={recipe.id}
        wineUnlocked={wineUnlocked}
        wineUpgradePlan={wineUpgradePlan}
        pairings={wines}
        lockedPlaceholderCount={winePairingCount}
        labels={{
          sectionTitle: dictText(dict, "recipe_detail_section_wine_suggested"),
          empty: dictText(dict, "recipe_detail_wine_empty"),
          unlockPrompt: dictText(dict, "recipe_detail_wine_unlock_prompt"),
          shop: dictText(dict, "recipe_detail_wine_shop"),
          generate: dictText(dict, "recipe_detail_wine_generate"),
          regenerate: dictText(dict, "recipe_detail_wine_regenerate"),
          generating: dictText(dict, "recipe_detail_wine_generating"),
          errGeneric: dictText(dict, "recipe_detail_wine_generate_err"),
          errNetwork: dictText(dict, "recipe_detail_wine_generate_err_network"),
        }}
      />
      <RecipeCommunityWinePairingsSection
        recipeId={recipe.id}
        authenticated={authenticated}
        currentUserId={currentUserId}
        loginNextPath={loginNextPath}
        pairings={communityWines}
        typeCounts={communityWineTypeCounts}
        wineTypeLabels={wineTypeLabels}
        labels={{
          sectionTitle: dictText(dict, "recipe_detail_section_wine_community"),
          empty: dictText(dict, "recipe_detail_wine_community_empty"),
          popularTypes: dictText(dict, "recipe_detail_wine_popular_types"),
          expandTypes: dictText(dict, "recipe_detail_wine_expand_types"),
          collapseTypes: dictText(dict, "recipe_detail_wine_collapse_types"),
          addYours: dictText(dict, "recipe_detail_wine_add_yours"),
          wineNameLabel: dictText(dict, "recipe_detail_wine_name_label"),
          wineNamePlaceholder: dictText(
            dict,
            "recipe_detail_wine_name_placeholder",
          ),
          whyBlurbLabel: dictText(dict, "recipe_detail_wine_why_label"),
          whyBlurbPlaceholder: dictText(
            dict,
            "recipe_detail_wine_why_placeholder",
          ),
          charCounter: dictText(dict, "recipe_detail_wine_why_char_counter"),
          expandPairing: dictText(dict, "recipe_detail_wine_expand_pairing"),
          collapsePairing: dictText(
            dict,
            "recipe_detail_wine_collapse_pairing",
          ),
          whyBlurbHeading: dictText(dict, "recipe_detail_wine_why_heading"),
          submit: dictText(dict, "recipe_detail_wine_submit"),
          submitting: dictText(dict, "recipe_detail_wine_submitting"),
          saved: dictText(dict, "recipe_detail_wine_saved"),
          signInLink: dictText(dict, "profile_sign_in_link"),
          signInPrompt: dictText(dict, "recipe_detail_wine_sign_in_prompt"),
          remove: dictText(dict, "recipe_detail_wine_remove"),
          selectedType: dictText(dict, "recipe_detail_wine_selected_type"),
          pickTypeFirst: dictText(dict, "recipe_detail_wine_pick_type_first"),
          cancel: dictText(dict, "recipe_detail_wine_cancel"),
        }}
      />
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
          reviewLabel: dictText(dict, "recipe_experience_review_label"),
          reviewHint: dictText(dict, "recipe_experience_review_hint"),
          reviewPlaceholder: dictText(dict, "recipe_experience_review_placeholder"),
          pendingReview: dictText(dict, "recipe_experience_pending_review"),
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
