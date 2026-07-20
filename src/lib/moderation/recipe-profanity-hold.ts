import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  recipeProfanityReviewReason,
  scanProfanityInFields,
  type ProfanityScanResult,
} from "@/lib/moderation/profanity";

export async function applyRecipeProfanityHoldIfNeeded(
  supabase: SupabaseClient,
  recipeId: string,
  fields: readonly string[],
): Promise<{ held: boolean; scan: ProfanityScanResult }> {
  const scan = scanProfanityInFields(fields);
  const reason = recipeProfanityReviewReason(scan);
  if (!reason) {
    return { held: false, scan };
  }

  const { error } = await supabase
    .from("recipes")
    .update({
      moderation_status: "pending_review",
      moderation_reason: reason,
      moderated_at: new Date().toISOString(),
      moderated_by: null,
    })
    .eq("id", recipeId);

  if (error) {
    return { held: false, scan };
  }

  return { held: true, scan };
}
