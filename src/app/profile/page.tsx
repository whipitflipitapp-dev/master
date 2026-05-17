import Link from "next/link";
import type { Metadata } from "next";

import { signOut } from "@/app/actions/auth";
import { ContentPageBackdrop } from "@/components/layout/ContentPageBackdrop";
import { listExcludedRecipes } from "@/app/actions/excluded-recipes";
import { ProfileAllergiesForm } from "@/components/profile/ProfileAllergiesForm";
import { ProfileExcludedRecipes } from "@/components/profile/ProfileExcludedRecipes";
import { ProfileDisplayNameForm } from "@/components/profile/ProfileDisplayNameForm";
import { dictText, getDictionary, resolveAppLocale } from "@/lib/i18n/server";
import { UpgradePitch } from "@/components/billing/UpgradePitch";
import { planTypeBadgeLabel, type PlanType } from "@/lib/plan";
import { getCurrentProfile } from "@/lib/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  return {
    title: dictText(dict, "profile_meta_title", { brand: dict.brand }),
    description: dictText(dict, "profile_meta_desc"),
  };
}

async function loadProfileContent() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      supabaseConfigured: false as const,
      session: null as Awaited<ReturnType<typeof getCurrentProfile>>,
      allergens: [] as { id: string; name: string }[],
      selected: [] as string[],
      allergyMode: "strict" as const,
      firstName: null as string | null,
      allergyOther: null as string | null,
    };
  }

  const session = await getCurrentProfile(supabase);

  const { data: allergens } = await supabase
    .from("allergens")
    .select("id,name")
    .order("name");

  if (!session?.user) {
    return {
      supabaseConfigured: true as const,
      session: null,
      allergens: (allergens ?? []) as { id: string; name: string }[],
      selected: [],
      allergyMode: "strict" as const,
      firstName: null,
      allergyOther: null,
    };
  }

  const { user, profile } = session;

  const { data: ua } = await supabase
    .from("user_allergies")
    .select("allergen_id")
    .eq("user_id", user.id);

  const { data: nameRow } = await supabase
    .from("profiles")
    .select("first_name, allergy_other")
    .eq("id", user.id)
    .maybeSingle();

  const allergyOtherRaw = nameRow?.allergy_other;
  const allergyOther =
    typeof allergyOtherRaw === "string" && allergyOtherRaw.trim()
      ? allergyOtherRaw
      : null;

  return {
    supabaseConfigured: true as const,
    session,
    allergens: (allergens ?? []) as { id: string; name: string }[],
    selected: (ua ?? []).map((r: { allergen_id: string }) => r.allergen_id),
    allergyMode: profile.allergy_mode,
    firstName:
      typeof nameRow?.first_name === "string" && nameRow.first_name.trim()
        ? nameRow.first_name.trim()
        : null,
    allergyOther,
  };
}

function PlanBadge({ plan }: { plan: PlanType }) {
  const isTop = plan === "ai_chef";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[length:var(--text-meta)] font-semibold tracking-tight ${
        isTop
          ? "border-[color-mix(in_srgb,var(--primary)_42%,var(--border))] bg-[var(--primary-muted)] text-[var(--primary)]"
          : "border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_88%,var(--bg))] text-[var(--text)]"
      }`}
    >
      {planTypeBadgeLabel(plan)}
    </span>
  );
}

export default async function ProfilePage() {
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  const {
    supabaseConfigured,
    session,
    allergens,
    selected,
    allergyMode,
    firstName,
    allergyOther,
  } = await loadProfileContent();

  const excludedRecipes =
    session?.user != null
      ? (await listExcludedRecipes()).items
      : [];

  const user = session?.user ?? null;
  const profile = session?.profile ?? null;
  const preferredName =
    profile?.display_name?.trim() ||
    user?.email ||
    user?.id ||
    "";
  const plan: PlanType = profile?.plan_type ?? "free";
  const showUpgradePitch = !!user && plan !== "ai_chef";
  const welcomeName =
    firstName ||
    (profile?.display_name?.trim() ? profile.display_name.trim().split(/\s+/)[0] ?? "" : "");

  return (
    <ContentPageBackdrop pageKey="/profile">
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 py-8">
      <header className="border-b border-[var(--border)] pb-5">
        {user && welcomeName ? (
          <p className="text-[length:var(--text-meta)] font-semibold uppercase tracking-wide text-[var(--primary)]">
            {dictText(dict, "profile_welcome_kicker", { firstName: welcomeName })}
          </p>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
          {dictText(dict, "profile_title")}
        </h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          {dictText(dict, "profile_subtitle")}
        </p>
      </header>

      {!supabaseConfigured ? (
        <p className="mt-6 text-sm text-[var(--muted)]">
          {dictText(dict, "profile_supabase_missing")}
        </p>
      ) : null}

      {!supabaseConfigured ? null : !user ? (
        <p className="mt-6 text-sm text-[var(--muted)]">
          <Link
            href="/login?next=/profile"
            className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
          >
            {dictText(dict, "profile_sign_in_link")}
          </Link>{" "}
          {dictText(dict, "profile_sign_in_suffix")}
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--text)] shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center gap-2">
              <PlanBadge plan={plan} />
              {profile?.is_admin ? (
                <>
                  <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_10%,var(--card))] px-2.5 py-0.5 text-[length:var(--text-caption)] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {dictText(dict, "profile_badge_admin")}
                  </span>
                  <Link
                    href="/admin"
                    className="text-[length:var(--text-caption)] font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
                  >
                    {dictText(dict, "profile_admin_link")}
                  </Link>
                </>
              ) : null}
            </div>
            <p className="mt-3">
              <span className="text-[var(--muted)]">
                {dictText(dict, "profile_signed_in_as")}{" "}
              </span>
              <span className="font-semibold text-[var(--text)]">
                {preferredName}
              </span>
            </p>
            {user.email && profile?.display_name?.trim() ? (
              <p className="mt-1 text-[length:var(--text-meta)] text-[var(--muted)]">
                {user.email}
              </p>
            ) : null}

            <ProfileDisplayNameForm defaultName={profile?.display_name ?? ""} />
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm font-semibold text-[var(--text)] shadow-[var(--shadow-card)] transition-[background-color,border-color,transform] duration-200 hover:border-[color-mix(in_srgb,var(--muted)_45%,var(--border))] active:scale-[0.99]"
            >
              {dictText(dict, "profile_sign_out")}
            </button>
          </form>
        </div>
      )}

      {user ? (
        <section className="mt-8" aria-labelledby="excluded-recipes-heading">
          <h2
            id="excluded-recipes-heading"
            className="text-lg font-semibold text-[var(--text)]"
          >
            {dictText(dict, "profile_excluded_heading")}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {dictText(dict, "profile_excluded_intro")}
          </p>
          <ProfileExcludedRecipes
            items={excludedRecipes}
            includeLabel={dictText(dict, "recipe_exclude_include_again")}
            includingLabel={dictText(dict, "recipe_exclude_including")}
            emptyLabel={dictText(dict, "profile_excluded_empty")}
          />
        </section>
      ) : null}

      <section className="mt-8" aria-labelledby="allergies-heading">
        <h2
          id="allergies-heading"
          className="text-lg font-semibold text-[var(--text)]"
        >
          {dictText(dict, "profile_allergies_heading")}
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {dictText(dict, "profile_allergies_intro")}
        </p>
        <p className="mt-3">
          <Link
            href="/learn/allergies"
            className="text-sm font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
          >
            {dictText(dict, "profile_learn_allergies")}
          </Link>
        </p>

        {user ? (
          <ProfileAllergiesForm
            allergens={allergens}
            selectedIds={selected}
            defaultAllergyMode={allergyMode}
            otherSection={{
              defaultText: allergyOther ?? "",
              legend: dictText(dict, "profile_allergy_other_legend"),
              checkboxLabel: dictText(dict, "profile_allergy_other_checkbox"),
              placeholder: dictText(dict, "profile_allergy_other_placeholder"),
              disclaimerTitle: dictText(dict, "profile_allergies_disclaimer_title"),
              disclaimerBody: dictText(dict, "profile_allergies_disclaimer_body"),
            }}
          />
        ) : (
          <p className="mt-3 text-sm text-[var(--muted)]">
            {dictText(dict, "profile_allergies_sign_in_note")}
          </p>
        )}
      </section>

      <div className="mt-8 flex flex-col gap-3">
        {showUpgradePitch ? <UpgradePitch currentPlan={plan} /> : null}
        <Link
          href="/"
          className="text-center text-sm font-medium text-[var(--muted)] underline-offset-4 hover:text-[var(--text)] hover:underline"
        >
          {dictText(dict, "profile_back_home")}
        </Link>
      </div>
    </main>
    </ContentPageBackdrop>
  );
}
