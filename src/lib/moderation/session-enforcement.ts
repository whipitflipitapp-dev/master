import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import {
  isEmailOnBanList,
  normalizeEmailForBanList,
} from "@/lib/moderation/access-control";

export type AccountAccessDenial = "banned" | "email_blocked";

export async function getAccountAccessDenial(
  supabase: SupabaseClient,
  user: User,
): Promise<AccountAccessDenial | null> {
  const email = user.email ? normalizeEmailForBanList(user.email) : "";
  if (email && (await isEmailOnBanList(email, supabase))) {
    return "email_blocked";
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("banned_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.banned_at) {
    return "banned";
  }

  return null;
}
