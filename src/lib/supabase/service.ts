import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses RLS — never expose this client or
 * `SUPABASE_SERVICE_ROLE_KEY` to the browser. Intended ONLY for trusted
 * server-side code paths such as the Stripe webhook handler.
 *
 * Returns null when the required env is missing so callers can fail gracefully
 * (e.g. webhook returns 500 with an explicit message instead of crashing the
 * route module at import time).
 */
export function createSupabaseServiceRoleClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "X-Client-Info": "whip-it-flip-it/stripe-webhook",
      },
    },
  });
}
