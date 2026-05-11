"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeSupabaseProjectUrl } from "@/lib/supabase/project-url";

export function createSupabaseBrowserClient(): SupabaseClient | null {
  const urlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = urlRaw ? normalizeSupabaseProjectUrl(urlRaw) : "";
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
