import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppLocale } from "@/lib/i18n/locale";
import { normalizeLocale } from "@/lib/i18n/locale";
import { parsePlanType, type PlanType } from "@/lib/plan";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AllergyMode = "strict" | "warn";

export type CurrentProfileRow = {
  display_name: string | null;
  plan_type: PlanType;
  is_admin: boolean;
  allergy_mode: AllergyMode;
  language: AppLocale;
};

function parseAllergyMode(raw: string | null | undefined): AllergyMode {
  return raw === "warn" ? "warn" : "strict";
}

/**
 * Signed-in user plus normalized profile row (plan_type coerced to a known tier).
 * Returns null when Supabase is not configured, auth has no user, or getUser fails.
 */
export async function getCurrentProfile(
  supabase?: SupabaseClient | null,
): Promise<{ user: User; profile: CurrentProfileRow } | null> {
  const client = supabase ?? (await createSupabaseServerClient());
  if (!client) {
    return null;
  }

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();
  if (userError || !user) {
    return null;
  }

  const { data: row } = await client
    .from("profiles")
    .select("display_name,plan_type,is_admin,allergy_mode,language")
    .eq("id", user.id)
    .maybeSingle();

  const parsed = parsePlanType(row?.plan_type);
  const plan_type: PlanType = parsed ?? "free";

  return {
    user,
    profile: {
      display_name: row?.display_name ?? null,
      plan_type,
      is_admin: Boolean(row?.is_admin),
      allergy_mode: parseAllergyMode(
        typeof row?.allergy_mode === "string" ? row.allergy_mode : undefined,
      ),
      language: normalizeLocale(
        typeof row?.language === "string" ? row.language : undefined,
      ),
    },
  };
}

/** Plan tier for feature gating; null when signed out or Supabase unavailable. */
export async function getCurrentUserPlanType(
  supabase?: SupabaseClient | null,
): Promise<PlanType | null> {
  const ctx = await getCurrentProfile(supabase);
  return ctx?.profile.plan_type ?? null;
}
