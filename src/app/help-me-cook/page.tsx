import type { Metadata } from "next";
import Link from "next/link";

import { listPantry } from "@/app/actions/pantry";
import { matchRecipesForPantry } from "@/app/actions/recipes";
import { HelpMeCookPantry } from "@/components/help-me-cook/HelpMeCookPantry";
import { ContentPageBackdrop } from "@/components/layout/ContentPageBackdrop";
import {
  MatchResultsCarousel,
  type HelpMeCookMatchFavoriteSnapshot,
} from "@/components/help-me-cook/MatchResultsCarousel";
import { dictText, getDictionary, resolveAppLocale } from "@/lib/i18n/server";
import { mergeIngredientTokens, parseIngredientInput } from "@/lib/ingredients";
import { profileHasAllergenSelections } from "@/lib/allergy-other";
import { PANTRY_MATCH_MIN_PERCENT } from "@/lib/pantry";
import { isAiChef } from "@/lib/plan";
import { getCurrentProfile } from "@/lib/profile";
import { logEvent } from "@/lib/telemetry";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  return {
    title: dictText(dict, "help_cook_meta_title", { brand: dict.brand }),
    description: dictText(dict, "help_cook_meta_desc"),
  };
}

type SearchParams = { q?: string; pantry_only?: string };

export default async function HelpMeCookPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const qRaw = typeof sp.q === "string" ? sp.q.trim() : "";
  const qProvided = qRaw.length > 0;

  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);

  const supabase = await createSupabaseServerClient();
  let excludeAllergenIds: string[] = [];
  let allergyOtherRaw: string | null = null;
  let allergyNote: string | null = null;
  let loggedIn = false;
  let userId: string | null = null;
  let allergyMode: "strict" | "warn" = "strict";

  let planIsAiChef = false;
  if (supabase) {
    const ctx = await getCurrentProfile(supabase);
    loggedIn = Boolean(ctx?.user);
    userId = ctx?.user?.id ?? null;
    planIsAiChef = Boolean(ctx?.user && isAiChef(ctx.profile.plan_type));
    if (ctx?.user) {
      allergyMode = ctx.profile.allergy_mode;
      const { data: rows } = await supabase
        .from("user_allergies")
        .select("allergen_id")
        .eq("user_id", ctx.user.id);
      excludeAllergenIds = (rows ?? []).map(
        (r: { allergen_id: string }) => r.allergen_id,
      );
      const { data: profExtra } = await supabase
        .from("profiles")
        .select("allergy_other")
        .eq("id", ctx.user.id)
        .maybeSingle();
      allergyOtherRaw =
        typeof profExtra?.allergy_other === "string"
          ? profExtra.allergy_other
          : null;
      allergyNote = !profileHasAllergenSelections(
        excludeAllergenIds,
        allergyOtherRaw,
      )
        ? dictText(dict, "help_cook_allergy_none_profile")
        : allergyMode === "strict"
          ? dictText(dict, "help_cook_allergy_strict")
          : dictText(dict, "help_cook_allergy_warn");
    }
  }

  const pantryList = loggedIn ? await listPantry() : { items: [], error: null };
  const pantryItems = pantryList.items.map((i) => i.ingredient);
  const pantryError = pantryList.error;

  const pantryTokens = parseIngredientInput(pantryItems.join(","));
  const qTokens = parseIngredientInput(qRaw);
  const mergedTokens = mergeIngredientTokens(pantryTokens, qTokens);
  /** Only run matching after an explicit `q` param (Find / shared link). Pantry still pre-fills the textarea. */
  const effectiveMatchText = qProvided ? mergedTokens.join(", ") : "";

  const pantryOnlyChecked =
    sp.pantry_only === "1" || sp.pantry_only === "true";

  const initialTextarea = mergedTokens.join(", ");

  const { matches, error: matchError, unmatchedTokens } = effectiveMatchText
    ? await matchRecipesForPantry(effectiveMatchText, {
        excludeAllergenIds,
        allergyMode,
        allergyOtherRaw,
      })
    : { matches: [], error: null, unmatchedTokens: undefined };

  const favoriteByRecipeId: Record<string, HelpMeCookMatchFavoriteSnapshot> = {};

  if (
    supabase &&
    effectiveMatchText &&
    !matchError &&
    !pantryError &&
    matches.length > 0
  ) {
    const ids = matches.map((m) => m.recipeId);
    for (const id of ids) {
      favoriteByRecipeId[id] = { favoritesCount: 0, favoredByUser: false };
    }
    const { data: countRows } = await supabase
      .from("recipes")
      .select("id,favorites_count")
      .in("id", ids);
    for (const r of countRows ?? []) {
      const row = r as { id: string; favorites_count: number | null };
      const raw = row.favorites_count;
      const favoritesCount =
        typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
      if (favoriteByRecipeId[row.id]) {
        favoriteByRecipeId[row.id] = {
          ...favoriteByRecipeId[row.id],
          favoritesCount,
        };
      }
    }
    if (userId) {
      const { data: favRows } = await supabase
        .from("favorites")
        .select("recipe_id")
        .eq("user_id", userId)
        .in("recipe_id", ids);
      const favored = new Set(
        (favRows ?? []).map((f: { recipe_id: string }) => f.recipe_id),
      );
      for (const id of ids) {
        favoriteByRecipeId[id] = {
          ...favoriteByRecipeId[id],
          favoredByUser: favored.has(id),
        };
      }
    }
  }

  if (
    supabase &&
    loggedIn &&
    effectiveMatchText.length > 0 &&
    !matchError
  ) {
    await logEvent(supabase, {
      type: "help_me_cook_search",
      metadata: {
        pantry_ingredient_count: mergedTokens.length,
        recipe_match_count: matches.length,
      },
    });
  }

  const pantryEmptyLoggedIn =
    loggedIn &&
    !pantryError &&
    pantryItems.length === 0 &&
    !qProvided;

  const formResetKey = `${qRaw}:${pantryOnlyChecked ? "1" : "0"}:${pantryItems.join("|")}`;
  const backdropKey = `/help-me-cook|q=${qRaw}|pantry_only=${pantryOnlyChecked ? "1" : "0"}`;
  const loginQs = new URLSearchParams();
  if (qRaw) loginQs.set("q", qRaw);
  if (pantryOnlyChecked) loginQs.set("pantry_only", "1");
  const helpCookLoginNext =
    loginQs.size > 0
      ? `/help-me-cook?${loginQs.toString()}`
      : "/help-me-cook";

  return (
    <ContentPageBackdrop pageKey={backdropKey}>
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-5 py-8">
      <header className="border-b border-[var(--border)] pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
          {dictText(dict, "help_cook_title")}
        </h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          {dictText(dict, "help_cook_intro", {
            percent: PANTRY_MATCH_MIN_PERCENT,
          })}
        </p>
      </header>

      {pantryError ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {pantryError}
        </p>
      ) : null}

      <HelpMeCookPantry
        key={formResetKey}
        loggedIn={loggedIn}
        pantryItems={pantryItems}
        urlQRaw={qRaw}
        initialTextarea={initialTextarea}
        initialPantryOnly={pantryOnlyChecked}
        matchError={matchError}
        unmatchedTokens={unmatchedTokens}
        allergyNote={allergyNote}
        afterFindMatches={
          <section
            className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)]"
            aria-label={dictText(dict, "help_cook_ai_card_title")}
          >
            <p className="text-sm font-semibold text-[var(--text)]">
              {dictText(dict, "help_cook_ai_card_title")}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {loggedIn && planIsAiChef
                ? dictText(dict, "help_cook_ai_signed_tier")
                : loggedIn
                  ? dictText(dict, "help_cook_ai_signed_free")
                  : dictText(dict, "help_cook_ai_anon")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {loggedIn && planIsAiChef ? (
                <Link
                  href="/ai-chef"
                  className="inline-flex min-h-[44px] items-center rounded-[var(--radius-card)] bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition-[background-color,transform] hover:bg-[var(--primary-hover)] active:scale-[0.99]"
                >
                  {dictText(dict, "help_cook_open_ai_chef")}
                </Link>
              ) : (
                <Link
                  href="/upgrade"
                  className="inline-flex min-h-[44px] items-center rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] shadow-[var(--shadow-card)] transition-colors hover:bg-[color-mix(in_srgb,var(--card)_88%,var(--text))] active:scale-[0.99]"
                >
                  {dictText(dict, "help_cook_upgrade_ai_chef")}
                </Link>
              )}
            </div>
          </section>
        }
      >
        {pantryEmptyLoggedIn ? (
          <section className="mt-2 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]">
            {dictText(dict, "help_cook_pantry_empty_hint")}
          </section>
        ) : null}

        {effectiveMatchText && !matchError && !pantryError ? (
          <MatchResultsCarousel
            key={`${effectiveMatchText}|${matches.map((x) => x.recipeId).join(",")}`}
            searchKey={effectiveMatchText}
            matches={matches}
            authenticated={loggedIn}
            favoriteByRecipeId={favoriteByRecipeId}
            loginNextPath={helpCookLoginNext}
          />
        ) : null}
      </HelpMeCookPantry>
    </main>
    </ContentPageBackdrop>
  );
}
