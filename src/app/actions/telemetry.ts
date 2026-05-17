"use server";

import {
  type ClientTelemetryEventName,
  CLIENT_TELEMETRY_EVENT_NAMES,
  recordClientTelemetryEvent,
} from "@/lib/telemetry/client-events";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/telemetry";

export { CLIENT_TELEMETRY_EVENT_NAMES, type ClientTelemetryEventName };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Server-trusted outbound affiliate classifications. */
export type AffiliateLinkType = "wine_buy" | "cookbook_amazon";

function sanitizeRecipeIdForAffiliate(raw: string | null): string | null {
  if (raw == null || raw === "") return null;
  const t = raw.trim();
  return UUID_RE.test(t) ? t : null;
}

export async function trackClientEvent(rawName: string): Promise<void> {
  await recordClientTelemetryEvent(rawName);
}

/**
 * Record an outbound affiliate click. Inserts the canonical
 * `affiliate_clicks` row (anon → user_id null; signed-in → user_id = JWT)
 * and, when authenticated, also writes a duplicate `affiliate_click`
 * row to `events` for unified analytics. RLS is the source of truth:
 * `affiliate_clicks_insert_own_or_anonymous` and
 * `events_insert_authenticated_own_user` enforce ownership server-side.
 */
export async function recordAffiliateClick(input: {
  linkType: AffiliateLinkType;
  recipeId?: string | null;
}): Promise<void> {
  const { linkType } = input;
  if (linkType !== "wine_buy" && linkType !== "cookbook_amazon") {
    return;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rid = sanitizeRecipeIdForAffiliate(input.recipeId ?? null);

  await supabase.from("affiliate_clicks").insert({
    user_id: user?.id ?? null,
    recipe_id: rid,
    link_type: linkType,
  });

  if (user) {
    await logEvent(supabase, {
      type: "affiliate_click",
      metadata: {
        link_type: linkType,
        ...(rid ? { recipe_id: rid } : {}),
      },
    });
  }
}

/**
 * Backwards-compatible positional wrapper retained for existing callers
 * (`AffiliateOutboundLink`, etc.). New code should call
 * {@link recordAffiliateClick} directly.
 */
export async function logAffiliateClick(
  recipeId: string | null,
  linkType: AffiliateLinkType,
): Promise<void> {
  await recordAffiliateClick({ linkType, recipeId });
}
