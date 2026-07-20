import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";

/** Apply a pending complimentary-email grant after sign-in / sign-up (service role). */
export async function redeemComplimentaryGrantForUser(
  userId: string,
): Promise<boolean> {
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase || !userId.trim()) {
    return false;
  }
  const { data, error } = await supabase.rpc(
    "try_redeem_complimentary_grant_for_user",
    { p_user_id: userId },
  );
  if (error) {
    return false;
  }
  return Boolean(data);
}
