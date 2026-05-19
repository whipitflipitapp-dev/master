"use server";

import { revalidatePath } from "next/cache";

import { consumeRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-error";
import {
  normalizeSuggestionText,
  SUGGESTION_MAX_LENGTH,
  SUGGESTION_RATE_LIMIT_MAX,
  SUGGESTION_RATE_LIMIT_WINDOW_MS,
  submitterNameFromProfile,
  type SubmitSuggestionState,
} from "@/lib/suggestions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const GENERIC_RESULT: SubmitSuggestionState = {
  ok: false,
  errorCode: "generic",
};

export async function submitSuggestion(
  _prevState: SubmitSuggestionState,
  formData: FormData,
): Promise<SubmitSuggestionState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, errorCode: "config" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, errorCode: "auth" };
  }

  const suggestion = normalizeSuggestionText(formData.get("suggestion"));
  if (!suggestion) {
    return { ok: false, errorCode: "empty" };
  }
  if (suggestion.length > SUGGESTION_MAX_LENGTH) {
    return { ok: false, errorCode: "too_long" };
  }

  const limit = consumeRateLimit({
    key: `suggestions:${user.id}`,
    windowMs: SUGGESTION_RATE_LIMIT_WINDOW_MS,
    max: SUGGESTION_RATE_LIMIT_MAX,
  });
  if (!limit.allowed) {
    return { ok: false, errorCode: "rate_limited" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name,first_name,last_name")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    logServerError("suggestions.profile_snapshot", profileError);
  }

  const { error } = await supabase.from("suggestions").insert({
    user_id: user.id,
    suggestion,
    submitter_email: user.email ?? "",
    submitter_name: submitterNameFromProfile(profile),
  });

  if (error) {
    logServerError("suggestions.submit", error);
    return GENERIC_RESULT;
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { ok: true, errorCode: null };
}
