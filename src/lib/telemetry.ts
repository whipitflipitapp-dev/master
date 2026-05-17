import type { SupabaseClient } from "@supabase/supabase-js";

export type AiUsageEventType =
  | "ai_recipe_generated"
  | "ai_substitution_suggested"
  | "ai_vision_ingredients"
  | "ai_camera_check_in"
  | "ai_cooking_assistant_answered"
  | "ai_wine_pairings_generated";

/** Server-trusted outbound affiliate classifications. */
export type AffiliateLinkType = "wine_buy" | "cookbook_amazon";

/** Safe, shallow metadata for JSONB — no arbitrary nested blobs. */
export function sanitizeEventMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (k.length > 48) continue;
    if (typeof v === "string") {
      out[k] = v.slice(0, 480);
      continue;
    }
    if (typeof v === "number" && Number.isFinite(v)) {
      out[k] = v;
      continue;
    }
    if (typeof v === "boolean") {
      out[k] = v;
      continue;
    }
  }
  return out;
}

async function insertEventRow(
  supabase: SupabaseClient,
  userId: string,
  eventType: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const meta = sanitizeEventMetadata(metadata);
  await supabase.from("events").insert({
    user_id: userId,
    event_type: eventType,
    metadata: meta,
  });
}

/**
 * Log an event for the currently authenticated Supabase session user.
 * No-op when signed out. Anonymous telemetry is intentionally not inserted.
 */
export async function logEvent(
  supabase: SupabaseClient,
  options: { type: string; metadata?: Record<string, unknown> },
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await insertEventRow(supabase, user.id, options.type, options.metadata ?? {});
}

/**
 * Log when the JWT user matches `userId`. Used by AI routes that already
 * verified the chef session so we never attach events to someone else.
 */
export async function logEventForVerifiedUser(
  supabase: SupabaseClient,
  options: {
    type: AiUsageEventType;
    metadata?: Record<string, unknown>;
    userId: string;
  },
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== options.userId) return;
  await insertEventRow(supabase, user.id, options.type, options.metadata ?? {});
}

export async function logCheckoutStarted(
  supabase: SupabaseClient,
  tier: string,
  interval: string,
): Promise<void> {
  await logEvent(supabase, {
    type: "checkout_started",
    metadata: { tier, interval },
  });
}
