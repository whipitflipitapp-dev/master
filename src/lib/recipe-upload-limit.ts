import type { SupabaseClient } from "@supabase/supabase-js";

import { isProOrAbove, parsePlanType, type PlanType } from "@/lib/plan";

/** Free-tier cap on user-created recipes per UTC calendar month (see `checkMonthlyRecipeUploadAllowed`). */
export const FREE_MONTHLY_RECIPE_UPLOAD_CAP = 3;

/**
 * Monthly upload limits use **UTC calendar months**: from 00:00:00.000 UTC on the first day
 * through just before the first moment of the next month. Enforcement counts rows in `recipes`
 * where `created_by` is the user and `created_at` falls in that range (Postgres `timestamptz`).
 */
export function utcCalendarMonthBoundsNow(): {
  startIso: string;
  endExclusiveIso: string;
} {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  const endExclusive = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0));
  return {
    startIso: start.toISOString(),
    endExclusiveIso: endExclusive.toISOString(),
  };
}

export type MonthlyRecipeUploadGate =
  | { allowed: true; plan: PlanType }
  | { allowed: false; plan: PlanType; reason: "monthly_limit" }
  | { allowed: false; plan: PlanType; reason: "query_failed"; message: string };

export async function checkMonthlyRecipeUploadAllowed(
  supabase: SupabaseClient,
  userId: string,
): Promise<MonthlyRecipeUploadGate> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_type")
    .eq("id", userId)
    .maybeSingle();

  const plan = parsePlanType(profile?.plan_type) ?? "free";

  if (isProOrAbove(plan)) {
    return { allowed: true, plan };
  }

  const { startIso, endExclusiveIso } = utcCalendarMonthBoundsNow();
  const { count, error } = await supabase
    .from("recipes")
    .select("*", { count: "exact", head: true })
    .eq("created_by", userId)
    .gte("created_at", startIso)
    .lt("created_at", endExclusiveIso);

  if (error) {
    return {
      allowed: false,
      plan,
      reason: "query_failed",
      message: error.message,
    };
  }

  const n = typeof count === "number" ? count : 0;
  if (n >= FREE_MONTHLY_RECIPE_UPLOAD_CAP) {
    return { allowed: false, plan, reason: "monthly_limit" };
  }

  return { allowed: true, plan };
}

/** For UI: Pro+ never at limit; on count errors we do not block the form (server still enforces on submit). */
export async function getRecipeUploadLimitStateForUi(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ plan: PlanType; atLimit: boolean }> {
  const gate = await checkMonthlyRecipeUploadAllowed(supabase, userId);
  if (gate.allowed) {
    return { plan: gate.plan, atLimit: false };
  }
  if (gate.reason === "monthly_limit") {
    return { plan: gate.plan, atLimit: true };
  }
  return { plan: gate.plan, atLimit: false };
}
