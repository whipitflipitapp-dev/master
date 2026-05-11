import type { Metadata } from "next";
import Link from "next/link";

import { listPantry } from "@/app/actions/pantry";
import { matchRecipesForPantry } from "@/app/actions/recipes";
import { HelpMeCookPantry } from "@/components/help-me-cook/HelpMeCookPantry";
import { ContentPageBackdrop } from "@/components/layout/ContentPageBackdrop";
import { RecipeListCard } from "@/components/recipe/RecipeListCard";
import { dictText, getDictionary, resolveAppLocale } from "@/lib/i18n/server";
import { mergeIngredientTokens, parseIngredientInput } from "@/lib/ingredients";
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
  let allergyNote: string | null = null;
  let loggedIn = false;
  let allergyMode: "strict" | "warn" = "strict";

  let planIsAiChef = false;
  if (supabase) {
    const ctx = await getCurrentProfile(supabase);
    loggedIn = Boolean(ctx?.user);
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
      allergyNote = !excludeAllergenIds.length
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

  const { matches, error: matchError } = effectiveMatchText
    ? await matchRecipesForPantry(effectiveMatchText, {
        excludeAllergenIds,
        allergyMode,
      })
    : { matches: [], error: null };

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
          <section aria-live="polite" className="mt-4">
            <h2 className="text-lg font-semibold text-[var(--text)]">
              {dictText(dict, "help_cook_results_title")}
            </h2>
            {matches.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--muted)]">
                {dictText(dict, "help_cook_no_matches", {
                  percent: PANTRY_MATCH_MIN_PERCENT,
                })}
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-4">
                {matches.map((m) => (
                  <li key={m.recipeId}>
                    <RecipeListCard
                      href={`/recipes/${m.recipeId}`}
                      title={m.title}
                      imageUrl={m.image_url}
                      trailing={
                        <span className="flex max-w-[min(100%,12rem)] flex-col items-end gap-1 text-right">
                          {m.allergyOverlapNames?.length ? (
                            <span
                              className="inline-block rounded-full border border-[color-mix(in_srgb,var(--danger)_38%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-2 py-0.5 text-[length:var(--text-caption)] font-semibold leading-tight text-[var(--danger)]"
                              title={`Contains allergens you track: ${m.allergyOverlapNames.join(", ")}`}
                            >
                              {m.allergyOverlapNames.join(", ")}
                            </span>
                          ) : null}
                          <span className="inline-block rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-2 py-0.5 text-xs font-semibold text-[var(--primary)]">
                            {dictText(dict, "help_cook_match_percent", {
                              percent: m.matchPercent,
                            })}
                          </span>
                        </span>
                      }
                      footer={
                        m.missingIngredients.length > 0 ? (
                          <>
                            {dictText(dict, "help_cook_missing_prefix")}{" "}
                            {m.missingIngredients.join(", ")}
                          </>
                        ) : (
                          <span className="text-[var(--success)]">
                            {dictText(dict, "help_cook_have_all_ingredients")}
                          </span>
                        )
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </HelpMeCookPantry>
    </main>
    </ContentPageBackdrop>
  );
}
