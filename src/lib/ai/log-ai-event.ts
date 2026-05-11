import type { SupabaseClient } from "@supabase/supabase-js";

import {
  type AiUsageEventType,
  logEventForVerifiedUser,
} from "@/lib/telemetry";

/** @deprecated Prefer importing AiUsageEventType from `@/lib/telemetry`. */
export type AiEventType = AiUsageEventType;

export async function logAiUsageEvent(
  supabase: SupabaseClient,
  userId: string,
  eventType: AiUsageEventType,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await logEventForVerifiedUser(supabase, {
    userId,
    type: eventType,
    metadata,
  });
}
