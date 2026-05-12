"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const NAME_MAX_LEN = 80;
const TEXT_MAX_LEN = 500;
const REFERRAL_MAX_LEN = 200;
const FOODS_MAX_ITEMS = 30;

export const FOOD_CATEGORY_VALUES = [
  "italian",
  "mexican",
  "asian",
  "mediterranean",
  "indian",
  "american_comfort",
  "bbq",
  "seafood",
  "vegetarian",
  "vegan",
  "desserts",
  "salads",
] as const;
export type FoodCategory = (typeof FOOD_CATEGORY_VALUES)[number];

export const REFERRAL_SOURCE_VALUES = [
  "friend",
  "search",
  "social",
  "app_store",
  "ad",
  "blog",
  "other",
] as const;
export type ReferralSource = (typeof REFERRAL_SOURCE_VALUES)[number];

function cleanShortString(raw: unknown, max: number): string | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim().replace(/\s+/g, " ");
  if (!v) return undefined;
  return v.length > max ? v.slice(0, max) : v;
}

function cleanLongString(raw: unknown, max: number): string | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim();
  if (!v) return undefined;
  return v.length > max ? v.slice(0, max) : v;
}

function cleanBirthdate(raw: unknown): string | null | undefined {
  if (raw === null) return null;
  if (typeof raw !== "string") return undefined;
  const v = raw.trim();
  if (!v) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return undefined;
  const year = d.getUTCFullYear();
  if (year < 1900) return undefined;
  const today = new Date();
  if (d.getTime() > today.getTime()) return undefined;
  return v;
}

function cleanFoodCategories(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const allowed = new Set<string>(FOOD_CATEGORY_VALUES);
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const v = item.trim();
    if (!v) continue;
    if (!allowed.has(v)) continue;
    if (out.includes(v)) continue;
    out.push(v);
    if (out.length >= FOODS_MAX_ITEMS) break;
  }
  return out;
}

function cleanCooksPerWeek(raw: unknown): number | null | undefined {
  if (raw === null) return null;
  if (raw === undefined || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return undefined;
  const int = Math.round(n);
  if (int < 0 || int > 7) return undefined;
  return int;
}

function cleanReferralSource(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim();
  if (!v) return undefined;
  const allowed = new Set<string>(REFERRAL_SOURCE_VALUES);
  if (allowed.has(v)) return v;
  return v.length > REFERRAL_MAX_LEN ? v.slice(0, REFERRAL_MAX_LEN) : v;
}

export type OnboardingInput = {
  firstName?: string;
  lastName?: string;
  birthdate?: string | null;
  foodsLoved?: string[];
  foodsLovedOther?: string;
  cooksPerWeek?: number | null;
  allergyOther?: string;
  referralSource?: string;
};

/**
 * Saves any provided survey fields and stamps onboarding_completed_at.
 * Backwards-compatible: calling with no arguments still works (skip survey).
 * All input is validated and silently normalized; unknown values are ignored.
 */
export async function completeOnboarding(
  input?: OnboardingInput,
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not signed in." };
  }

  const update: Record<string, unknown> = {
    onboarding_completed_at: new Date().toISOString(),
  };

  let firstName: string | undefined;
  let lastName: string | undefined;

  if (input) {
    firstName = cleanShortString(input.firstName, NAME_MAX_LEN);
    lastName = cleanShortString(input.lastName, NAME_MAX_LEN);
    const birthdate = cleanBirthdate(input.birthdate);
    const foodsLoved = cleanFoodCategories(input.foodsLoved);
    const foodsLovedOther = cleanLongString(input.foodsLovedOther, TEXT_MAX_LEN);
    const cooksPerWeek = cleanCooksPerWeek(input.cooksPerWeek);
    const allergyOther = cleanLongString(input.allergyOther, TEXT_MAX_LEN);
    const referralSource = cleanReferralSource(input.referralSource);

    if (firstName !== undefined) update.first_name = firstName;
    if (lastName !== undefined) update.last_name = lastName;
    if (birthdate !== undefined) update.birthdate = birthdate;
    if (foodsLoved !== undefined) update.foods_loved = foodsLoved;
    if (foodsLovedOther !== undefined)
      update.foods_loved_other = foodsLovedOther;
    if (cooksPerWeek !== undefined) update.cooks_per_week = cooksPerWeek;
    if (allergyOther !== undefined) update.allergy_other = allergyOther;
    if (referralSource !== undefined) update.referral_source = referralSource;
  }

  if (firstName || lastName) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    const existing =
      typeof prof?.display_name === "string" ? prof.display_name.trim() : "";
    if (!existing) {
      const combined = [firstName, lastName].filter(Boolean).join(" ").trim();
      if (combined) {
        update.display_name = combined.slice(0, NAME_MAX_LEN);
      }
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  revalidatePath("/onboarding");
  revalidatePath("/profile");
  return { error: null };
}
