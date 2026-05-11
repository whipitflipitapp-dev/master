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
    .select("onboarding_completed_at")
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

  return (
    <OnboardingWizard
      allergens={(allergens ?? []) as { id: string; name: string }[]}
      selectedIds={(ua ?? []).map((r: { allergen_id: string }) => r.allergen_id)}
      defaultAllergyMode={session.profile.allergy_mode}
    />
  );
}
