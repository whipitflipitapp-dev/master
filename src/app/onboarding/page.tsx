import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { dictText, getDictionary, resolveAppLocale } from "@/lib/i18n/server";
import { getCurrentProfile } from "@/lib/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveAppLocale();
  const dict = await getDictionary(locale);
  return {
    title: dictText(dict, "onboarding_meta_title", { brand: dict.brand }),
    description: dictText(dict, "signup_meta_desc"),
  };
}

function splitDisplayName(value: string | null | undefined): {
  first: string;
  last: string;
} {
  const v = (value ?? "").trim();
  if (!v) return { first: "", last: "" };
  const parts = v.split(/\s+/);
  const first = parts[0] ?? "";
  const last = parts.slice(1).join(" ");
  return { first, last };
}

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect("/login?next=/onboarding");
  }

  const session = await getCurrentProfile(supabase);
  if (!session) {
    redirect("/login?next=/onboarding");
  }

  const { data: row } = await supabase
    .from("profiles")
    .select(
      "onboarding_completed_at,display_name,first_name,last_name,birthdate,feature_interests,foods_loved,foods_loved_other,cooks_per_week,allergy_other,referral_source",
    )
    .eq("id", session.user.id)
    .maybeSingle();

  if (row?.onboarding_completed_at) {
    redirect("/recipes");
  }

  const { data: allergens } = await supabase
    .from("allergens")
    .select("id,name")
    .order("name");

  const { data: ua } = await supabase
    .from("user_allergies")
    .select("allergen_id")
    .eq("user_id", session.user.id);

  const split = splitDisplayName(row?.display_name);

  const initial = {
    firstName: row?.first_name ?? split.first ?? "",
    lastName: row?.last_name ?? split.last ?? "",
    birthdate:
      typeof row?.birthdate === "string" ? row.birthdate.slice(0, 10) : "",
    featureInterests: Array.isArray(row?.feature_interests)
      ? (row.feature_interests as string[])
      : [],
    foodsLoved: Array.isArray(row?.foods_loved)
      ? (row.foods_loved as string[])
      : [],
    foodsLovedOther: row?.foods_loved_other ?? "",
    cooksPerWeek:
      typeof row?.cooks_per_week === "number" ? row.cooks_per_week : null,
    allergyOther: row?.allergy_other ?? "",
    referralSource: row?.referral_source ?? "",
  };

  return (
    <OnboardingWizard
      allergens={(allergens ?? []) as { id: string; name: string }[]}
      selectedIds={(ua ?? []).map((r: { allergen_id: string }) => r.allergen_id)}
      defaultAllergyMode={session.profile.allergy_mode}
      initial={initial}
    />
  );
}
