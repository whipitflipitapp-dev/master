"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export function createSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return null;
  }
  return createBrowserClient(url, anon) as SupabaseClient;
}

/** @deprecated Prefer createSupabaseBrowserClient */
export function createClient(): SupabaseClient | null {
  return createSupabaseBrowserClient();
}
