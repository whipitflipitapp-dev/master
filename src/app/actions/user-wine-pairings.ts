"use server";

import { revalidatePath } from "next/cache";

import {
  isCuratedWineTypeSlug,
  WINE_TYPE_CANONICAL_LABEL,
} from "@/lib/wine-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_WINE_NAME = 120;
const MAX_WHY_BLURB = 200;

function trimOptional(value: unknown, max: number): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const t = value.trim();
  if (!t.length) {
    return null;
  }
  return t.length <= max ? t : t.slice(0, max);
}

function revalidateRecipeWinePaths(recipeId: string) {
  revalidatePath(`/recipes/${recipeId}`);
}

export type UserWinePairingRow = {
  id: string;
  wine_type: string;
  wine_type_slug: string | null;
  wine_name: string | null;
  why_blurb: string | null;
  created_at: string;
  user_id: string;
  submitter_name: string | null;
};

export async function submitUserWinePairing(
  _prev: { ok: boolean; error: string | null },
  formData: FormData,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sign in to add your wine pairing." };
  }

  const recipeId = String(formData.get("recipe_id") ?? "").trim();
  if (!UUID_RE.test(recipeId)) {
    return { ok: false, error: "Invalid recipe." };
  }

  const slugRaw = String(formData.get("wine_type_slug") ?? "").trim();
  if (!isCuratedWineTypeSlug(slugRaw)) {
    return { ok: false, error: "Choose a wine type from the list." };
  }

  const wineName = trimOptional(formData.get("wine_name"), MAX_WINE_NAME);
  const whyBlurbRaw = formData.get("why_blurb");
  if (typeof whyBlurbRaw === "string" && whyBlurbRaw.trim().length > MAX_WHY_BLURB) {
    return {
      ok: false,
      error: `Why this wine must be ${MAX_WHY_BLURB} characters or fewer.`,
    };
  }
  const why_blurb = trimOptional(whyBlurbRaw, MAX_WHY_BLURB);

  const { data: recipe, error: recipeErr } = await supabase
    .from("recipes")
    .select("id")
    .eq("id", recipeId)
    .maybeSingle();

  if (recipeErr || !recipe) {
    return { ok: false, error: "Recipe not found." };
  }

  const payload = {
    wine_type: WINE_TYPE_CANONICAL_LABEL[slugRaw],
    wine_name: wineName,
    why_blurb,
    notes: null,
    description: null,
    purchase_url: null,
  };

  const { data: existing } = await supabase
    .from("wine_pairings")
    .select("id")
    .eq("recipe_id", recipeId)
    .eq("user_id", user.id)
    .eq("wine_type_slug", slugRaw)
    .eq("source", "user")
    .maybeSingle();

  if (existing?.id) {
    const { error: updErr } = await supabase
      .from("wine_pairings")
      .update(payload)
      .eq("id", existing.id);
    if (updErr) {
      return { ok: false, error: updErr.message };
    }
  } else {
    const { error: insErr } = await supabase.from("wine_pairings").insert({
      recipe_id: recipeId,
      source: "user",
      user_id: user.id,
      wine_type_slug: slugRaw,
      ...payload,
    });
    if (insErr) {
      return { ok: false, error: insErr.message };
    }
  }

  revalidateRecipeWinePaths(recipeId);
  return { ok: true, error: null };
}

export async function deleteUserWinePairing(pairingId: string): Promise<{
  ok: boolean;
  error: string | null;
}> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sign in required." };
  }

  const id = pairingId.trim();
  if (!UUID_RE.test(id)) {
    return { ok: false, error: "Invalid pairing." };
  }

  const { data: row, error: fetchErr } = await supabase
    .from("wine_pairings")
    .select("id,recipe_id,source,user_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !row || row.source !== "user" || row.user_id !== user.id) {
    return { ok: false, error: "Pairing not found." };
  }

  const { error: delErr } = await supabase
    .from("wine_pairings")
    .delete()
    .eq("id", id);

  if (delErr) {
    return { ok: false, error: delErr.message };
  }

  revalidateRecipeWinePaths(row.recipe_id);
  return { ok: true, error: null };
}

export type WineTypeCount = {
  slug: string;
  count: number;
};

export function aggregateWineTypeCounts(
  pairings: Pick<UserWinePairingRow, "wine_type_slug">[],
): WineTypeCount[] {
  const map = new Map<string, number>();
  for (const p of pairings) {
    const slug = p.wine_type_slug?.trim();
    if (!slug) continue;
    map.set(slug, (map.get(slug) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
}
