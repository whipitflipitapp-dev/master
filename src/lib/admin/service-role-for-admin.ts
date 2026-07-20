import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { requireAdminSession } from "@/lib/admin/require-admin-session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";

export class AdminServiceUnavailableError extends Error {
  constructor() {
    super(
      "Admin tools need SUPABASE_SERVICE_ROLE_KEY on the server (same as Stripe webhooks).",
    );
    this.name = "AdminServiceUnavailableError";
  }
}

/** Trusted admin session + service role for cross-user writes (bypasses RLS). */
export async function createAdminServiceRoleContext(): Promise<{
  supabase: SupabaseClient;
  adminUserId: string;
}> {
  const { user } = await requireAdminSession();
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) {
    throw new AdminServiceUnavailableError();
  }
  return { supabase, adminUserId: user.id };
}
