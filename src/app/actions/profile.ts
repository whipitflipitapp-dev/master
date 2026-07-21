"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  RECIPE_UPLOAD_BADGE_TIER_ORDER,
  resolveRecipeUploadBadgeTier,
  type RecipeUploadBadgeTierId,
} from "@/lib/recipe-upload-badges";
import { sanitizeOtherAllergenInput } from "@/lib/allergy-other";
import { validateStoredAvatarUrl } from "@/lib/avatar-image";
import { displayNameProfanityError } from "@/lib/moderation/profanity";
import { LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n/locale";
import { GENERIC_SERVER_ERROR, logServerError } from "@/lib/server-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DISPLAY_NAME_MAX_LEN = 80;

export async function setProfileLanguage(
  lang: string,
): Promise<{ ok: boolean; error?: string }> {
  const locale = normalizeLocale(lang);
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from("profiles")
        .update({ language: locale })
        .eq("id", user.id);
      if (error) {
        logServerError("profile.language_update", error);
        return { ok: false, error: GENERIC_SERVER_ERROR };
      }
    }
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateDisplayName(
  formData: FormData,
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/profile");
  }

  const raw = formData.get("display_name");
  const name =
    typeof raw === "string"
      ? raw.trim().replace(/\s+/g, " ")
      : String(raw ?? "").trim();

  if (!name) {
    return { error: "Enter a display name." };
  }
  if (name.length > DISPLAY_NAME_MAX_LEN) {
    return { error: `Use at most ${DISPLAY_NAME_MAX_LEN} characters.` };
  }

  const profanityError = displayNameProfanityError(name);
  if (profanityError) {
    return { error: profanityError };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name })
    .eq("id", user.id);

  if (error) {
    logServerError("profile.display_name_update", error);
    return { error: GENERIC_SERVER_ERROR };
  }

  revalidatePath("/profile");
  revalidatePath(`/chef/${user.id}`);
  revalidatePath("/recipes");
  return { error: null };
}

export async function updateAvatarUrl(
  avatarUrl: string | null,
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/profile");
  }

  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!origin) {
    return { error: "Supabase URL is not configured." };
  }

  const validated = validateStoredAvatarUrl({
    avatarUrlRaw: avatarUrl,
    userId: user.id,
    supabaseProjectOrigin: origin,
    rejectPlainDataUrls: true,
  });
  if (!validated.ok) {
    return { error: validated.message };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: validated.url })
    .eq("id", user.id);

  if (error) {
    logServerError("profile.avatar_update", error);
    return { error: GENERIC_SERVER_ERROR };
  }

  revalidatePath("/profile");
  revalidatePath(`/chef/${user.id}`);
  revalidatePath("/recipes");
  return { error: null };
}

export async function saveUserAllergies(
  formData: FormData,
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/profile");
  }

  const allergenIds = formData.getAll("allergen_id").map(String).filter(Boolean);

  const hasOtherSection = formData.get("allergy_other_section") === "1";
  let allergy_other: string | null | undefined;
  if (hasOtherSection) {
    const otherChecked = formData.get("allergy_other_check") === "1";
    if (otherChecked) {
      const cleaned = sanitizeOtherAllergenInput(
        formData.get("allergy_other"),
      );
      if (!cleaned) {
        return {
          error:
            "Enter your other allergens, or uncheck Other.",
        };
      }
      allergy_other = cleaned;
    } else {
      allergy_other = null;
    }
  }

  const { error: delErr } = await supabase
    .from("user_allergies")
    .delete()
    .eq("user_id", user.id);

  if (delErr) {
    logServerError("profile.allergies_delete", delErr);
    return { error: GENERIC_SERVER_ERROR };
  }

  if (allergenIds.length > 0) {
    const { error: insErr } = await supabase.from("user_allergies").insert(
      allergenIds.map((allergen_id) => ({
        user_id: user.id,
        allergen_id,
      })),
    );
    if (insErr) {
      logServerError("profile.allergies_insert", insErr);
      return { error: GENERIC_SERVER_ERROR };
    }
  }

  const modeRaw = String(formData.get("allergy_mode") ?? "strict").toLowerCase();
  const allergy_mode = modeRaw === "warn" ? "warn" : "strict";
  const profilePatch: { allergy_mode: "strict" | "warn"; allergy_other?: string | null } =
    { allergy_mode };
  if (allergy_other !== undefined) {
    profilePatch.allergy_other = allergy_other;
  }

  const { error: profErr } = await supabase
    .from("profiles")
    .update(profilePatch)
    .eq("id", user.id);

  if (profErr) {
    logServerError("profile.allergy_profile_update", profErr);
    return { error: GENERIC_SERVER_ERROR };
  }

  revalidatePath("/profile");
  revalidatePath("/help-me-cook");
  revalidatePath("/recipes");
  return { error: null };
}

export async function markCelebratedUploadBadgeTier(
  tier: RecipeUploadBadgeTierId,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/dashboard");
  }

  if (!RECIPE_UPLOAD_BADGE_TIER_ORDER.includes(tier)) {
    return { ok: false, error: GENERIC_SERVER_ERROR };
  }

  const { count, error: countErr } = await supabase
    .from("recipes")
    .select("*", { count: "exact", head: true })
    .eq("created_by", user.id);

  if (countErr) {
    logServerError("profile.badge_celebration_count", countErr);
    return { ok: false, error: GENERIC_SERVER_ERROR };
  }

  const uploadCount = typeof count === "number" && count >= 0 ? count : 0;
  const currentTier = resolveRecipeUploadBadgeTier(uploadCount);
  if (currentTier !== tier) {
    return { ok: false, error: GENERIC_SERVER_ERROR };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ celebrated_upload_badge_tier: tier })
    .eq("id", user.id);

  if (error) {
    logServerError("profile.badge_celebration_update", error);
    return { ok: false, error: GENERIC_SERVER_ERROR };
  }

  revalidatePath("/dashboard");
  revalidatePath("/recipes", "layout");
  return { ok: true };
}
