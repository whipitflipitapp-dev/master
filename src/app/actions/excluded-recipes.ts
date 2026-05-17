"use server";

import { revalidatePath } from "next/cache";

import { resolveRecipeDisplayImageUrl } from "@/lib/demo-recipe-cover-images";
import { GENERIC_SERVER_ERROR, logServerError } from "@/lib/server-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ExcludedRecipeListItem = {
  recipeId: string;
  title: string;
  imageUrl: string | null;
  excludedAt: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function revalidateExcludedRecipePaths(recipeId?: string) {
  revalidatePath("/profile");
  revalidatePath("/recipes");
  revalidatePath("/help-me-cook");
  if (recipeId) {
    revalidatePath(`/recipes/${recipeId}`);
  }
}

export async function excludeRecipe(recipeId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sign in to hide recipes." };
  }

  const rid = recipeId.trim();
  if (!UUID_RE.test(rid)) {
    return { ok: false, error: "Invalid recipe." };
  }

  const { error } = await supabase.from("user_excluded_recipes").insert({
    user_id: user.id,
    recipe_id: rid,
  });

  if (error) {
    if (error.code === "23505") {
      revalidateExcludedRecipePaths(rid);
      return { ok: true };
    }
    logServerError("excluded_recipes.exclude", error);
    return { ok: false, error: GENERIC_SERVER_ERROR };
  }

  revalidateExcludedRecipePaths(rid);
  return { ok: true };
}

export async function includeRecipe(recipeId: string): Promise<{
  ok: boolean;
  error?: string;
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

  const rid = recipeId.trim();
  if (!UUID_RE.test(rid)) {
    return { ok: false, error: "Invalid recipe." };
  }

  const { error } = await supabase
    .from("user_excluded_recipes")
    .delete()
    .eq("user_id", user.id)
    .eq("recipe_id", rid);

  if (error) {
    logServerError("excluded_recipes.include", error);
    return { ok: false, error: GENERIC_SERVER_ERROR };
  }

  revalidateExcludedRecipePaths(rid);
  return { ok: true };
}

export async function listExcludedRecipes(): Promise<{
  items: ExcludedRecipeListItem[];
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

  const { data: rows, error } = await supabase
    .from("user_excluded_recipes")
    .select(
      `
      created_at,
      recipe_id,
      recipes (
        id,
        title,
        image_url
      )
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    logServerError("excluded_recipes.list", error);
    return { items: [], error: GENERIC_SERVER_ERROR };
  }

  type Embed = {
    id: string;
    title: string;
    image_url: string | null;
  };

  const items: ExcludedRecipeListItem[] = [];

  for (const row of rows ?? []) {
    const embed = row.recipes as Embed | Embed[] | null;
    const recipe = Array.isArray(embed) ? embed[0] ?? null : embed;
    if (!recipe?.id || !recipe.title) continue;
    const rawImg =
      typeof recipe.image_url === "string" && recipe.image_url.trim()
        ? recipe.image_url.trim()
        : null;
    items.push({
      recipeId: recipe.id,
      title: recipe.title,
      imageUrl: resolveRecipeDisplayImageUrl(recipe.id, rawImg),
      excludedAt:
        typeof row.created_at === "string" ? row.created_at : String(row.created_at),
    });
  }

  return { items, error: null };
}
