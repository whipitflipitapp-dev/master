import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";

export function normalizeEmailForBanList(email: string): string {
  return email.trim().toLowerCase();
}

export async function isEmailOnBanList(
  email: string,
  supabase?: SupabaseClient | null,
): Promise<boolean> {
  const client = supabase ?? createSupabaseServiceRoleClient();
  if (!client) {
    return false;
  }
  const normalized = normalizeEmailForBanList(email);
  if (!normalized.includes("@")) {
    return false;
  }
  const { data, error } = await client.rpc("is_email_banned", {
    p_email: normalized,
  });
  if (error) {
    return false;
  }
  return Boolean(data);
}

export async function isProfileBanned(
  userId: string,
  supabase?: SupabaseClient | null,
): Promise<boolean> {
  const client = supabase ?? createSupabaseServiceRoleClient();
  if (!client) {
    return false;
  }
  const { data } = await client
    .from("profiles")
    .select("banned_at")
    .eq("id", userId)
    .maybeSingle();
  return Boolean(data?.banned_at);
}
