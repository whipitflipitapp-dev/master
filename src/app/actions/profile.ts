"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { sanitizeOtherAllergenInput } from "@/lib/allergy-other";
import { LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n/locale";
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
        return { ok: false, error: error.message };
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

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/profile");
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
    return { error: delErr.message };
  }

  if (allergenIds.length > 0) {
    const { error: insErr } = await supabase.from("user_allergies").insert(
      allergenIds.map((allergen_id) => ({
        user_id: user.id,
        allergen_id,
      })),
    );
    if (insErr) {
      return { error: insErr.message };
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
    return { error: profErr.message };
  }

  revalidatePath("/profile");
  revalidatePath("/help-me-cook");
  revalidatePath("/recipes");
  return { error: null };
}
