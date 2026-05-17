"use server";

import { revalidatePath } from "next/cache";

import { parseIngredientInput } from "@/lib/ingredients";
import { GENERIC_SERVER_ERROR, logServerError } from "@/lib/server-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PANTRY_INPUT_MAX = 4000;
const PANTRY_TOKEN_MAX = 80;
const PANTRY_SYNC_MAX_ITEMS = 100;

export type PantryRow = {
  id: string;
  ingredient: string;
  sort_order: number;
};

export async function listPantry(): Promise<{
  items: PantryRow[];
  error: string | null;
}> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { items: [], error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { items: [], error: null };
  }

  const { data, error } = await supabase
    .from("user_pantry")
    .select("id,ingredient,sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .order("ingredient", { ascending: true });

  if (error) {
    logServerError("pantry.list", error);
    return { items: [], error: GENERIC_SERVER_ERROR };
  }

  return { items: (data ?? []) as PantryRow[], error: null };
}

export async function addPantryItem(
  ingredient: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sign in to save pantry items." };
  }

  if (ingredient.length > PANTRY_INPUT_MAX) {
    return { ok: false, error: "Ingredient name is too long." };
  }

  const tokens = parseIngredientInput(ingredient);
  const name = tokens[0];
  if (!name) {
    return { ok: false, error: "Enter an ingredient name." };
  }
  if (name.length > PANTRY_TOKEN_MAX) {
    return { ok: false, error: "Ingredient name is too long." };
  }

  const { data: maxRow } = await supabase
    .from("user_pantry")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder =
    typeof maxRow?.sort_order === "number" ? maxRow.sort_order + 1 : 0;

  const { error } = await supabase.from("user_pantry").insert({
    user_id: user.id,
    ingredient: name,
    sort_order: nextOrder,
  });

  if (error) {
    if (error.code === "23505") {
      revalidatePath("/help-me-cook");
      return { ok: true };
    }
    logServerError("pantry.add", error);
    return { ok: false, error: GENERIC_SERVER_ERROR };
  }

  revalidatePath("/help-me-cook");
  return { ok: true };
}

export async function removePantryItem(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sign in to edit pantry." };
  }

  const rid = id.trim();
  if (!rid) {
    return { ok: false, error: "Invalid item." };
  }

  const { error } = await supabase
    .from("user_pantry")
    .delete()
    .eq("id", rid)
    .eq("user_id", user.id);

  if (error) {
    logServerError("pantry.remove", error);
    return { ok: false, error: GENERIC_SERVER_ERROR };
  }

  revalidatePath("/help-me-cook");
  return { ok: true };
}

/**
 * Merges unique normalized tokens into the user's pantry without removing existing rows.
 */
export async function syncPantryFromCommaString(
  raw: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sign in to save your pantry." };
  }

  if (raw.length > PANTRY_INPUT_MAX) {
    return { ok: false, error: "Pantry list is too long." };
  }

  const tokens = parseIngredientInput(raw).slice(0, PANTRY_SYNC_MAX_ITEMS);

  const { data: existing, error: listErr } = await supabase
    .from("user_pantry")
    .select("ingredient,sort_order")
    .eq("user_id", user.id);

  if (listErr) {
    logServerError("pantry.sync_list", listErr);
    return { ok: false, error: GENERIC_SERVER_ERROR };
  }

  const rows = existing ?? [];
  const have = new Set(
    rows.map((r: { ingredient: string }) => r.ingredient.toLowerCase()),
  );
  let maxSort = rows.reduce(
    (acc: number, r: { sort_order?: number }) =>
      typeof r.sort_order === "number" && r.sort_order > acc ? r.sort_order : acc,
    -1,
  );

  for (const t of tokens) {
    const key = t.toLowerCase();
    if (have.has(key)) continue;
    maxSort += 1;
    const { error } = await supabase.from("user_pantry").insert({
      user_id: user.id,
      ingredient: t,
      sort_order: maxSort,
    });
    if (error) {
      if (error.code === "23505") {
        have.add(key);
        continue;
      }
      logServerError("pantry.sync_insert", error);
      return { ok: false, error: GENERIC_SERVER_ERROR };
    }
    have.add(key);
  }

  revalidatePath("/help-me-cook");
  return { ok: true };
}
