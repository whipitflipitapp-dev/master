import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { normalizeSupabaseProjectUrl } from "@/lib/supabase/project-url";

/** Server Supabase client; returns null when env is not configured (CI / local without .env). */
export async function createSupabaseServerClient(): Promise<
  SupabaseClient | null
> {
  const urlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = urlRaw ? normalizeSupabaseProjectUrl(urlRaw) : "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch {
    return null;
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* Server Component render — edge proxy refreshes session when possible */
        }
      },
    },
  }) as SupabaseClient;
}

/** @deprecated Prefer createSupabaseServerClient — kept for older imports. */
export async function createClient(): Promise<SupabaseClient> {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return client;
}
