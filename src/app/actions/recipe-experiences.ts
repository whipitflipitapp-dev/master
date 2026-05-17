"use server";

import { revalidatePath } from "next/cache";

import { resolveRecipeDisplayImageUrl } from "@/lib/demo-recipe-cover-images";
import { GENERIC_SERVER_ERROR, logServerError } from "@/lib/server-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type RecipeExperienceRow = {
  madeRecipe: boolean;
  rating: number | null;
  spentCents: number | null;
};

export type WhippedRecipeListItem = {
  recipeId: string;
  title: string;
  imageUrl: string | null;
  madeRecipe: boolean;
  rating: number | null;
  spentCents: number | null;
  createdAt: string;
  updatedAt: string;
};

function revalidateExperiencePaths(recipeId?: string) {
  revalidatePath("/profile");
  if (recipeId) {
    revalidatePath(`/recipes/${recipeId}`);
  }
}

function parseRating(raw: string | null): number | null {
  if (raw == null || raw.trim() === "") return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1 || n > 10) return null;
  return n;
}

function parseSpentCentsFromDollars(raw: string | null): number | null {
  if (raw == null || raw.trim() === "") return null;
  const dollars = Number.parseFloat(raw);
  if (!Number.isFinite(dollars) || dollars < 0) return null;
  return Math.round(dollars * 100);
}

export async function saveRecipeExperience(
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
    return { ok: false, error: "Sign in to save your feedback." };
  }

  const recipeId = String(formData.get("recipe_id") ?? "").trim();
  if (!recipeId) {
    return { ok: false, error: "Invalid recipe." };
  }

  const madeRecipe = formData.get("made_recipe") === "on";
  const ratingRaw = formData.get("rating");
  const parsedRating = parseRating(
    typeof ratingRaw === "string" ? ratingRaw : null,
  );
  const rating = madeRecipe ? parsedRating : null;
  if (
    madeRecipe &&
    ratingRaw != null &&
    String(ratingRaw).trim() !== "" &&
    parsedRating === null
  ) {
    return { ok: false, error: "Rating must be a whole number from 1 to 10." };
  }

  const spentRaw = formData.get("spent_usd");
  const spentCents = parseSpentCentsFromDollars(
    typeof spentRaw === "string" ? spentRaw : null,
  );
  if (
    spentRaw != null &&
    String(spentRaw).trim() !== "" &&
    spentCents === null
  ) {
    return { ok: false, error: "Amount spent must be zero or greater." };
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("user_recipe_experiences").upsert(
    {
      user_id: user.id,
      recipe_id: recipeId,
      made_recipe: madeRecipe,
      rating,
      spent_cents: spentCents,
      updated_at: now,
    },
    { onConflict: "user_id,recipe_id" },
  );

  if (error) {
    logServerError("recipe_experiences.save", error);
    return { ok: false, error: GENERIC_SERVER_ERROR };
  }

  revalidateExperiencePaths(recipeId);
  return { ok: true, error: null };
}

export async function listMyRecipeExperiences(): Promise<{
  items: WhippedRecipeListItem[];
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
    .from("user_recipe_experiences")
    .select(
      `
      made_recipe,
      rating,
      spent_cents,
      created_at,
      updated_at,
      recipe_id,
      recipes (
        id,
        title,
        image_url
      )
    `,
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    logServerError("recipe_experiences.list", error);
    return { items: [], error: GENERIC_SERVER_ERROR };
  }

  type Embed = {
    id: string;
    title: string;
    image_url: string | null;
  };

  const items: WhippedRecipeListItem[] = [];

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
      madeRecipe: Boolean(row.made_recipe),
      rating:
        typeof row.rating === "number" && row.rating >= 1 && row.rating <= 10
          ? row.rating
          : null,
      spentCents:
        typeof row.spent_cents === "number" && row.spent_cents >= 0
          ? row.spent_cents
          : null,
      createdAt:
        typeof row.created_at === "string"
          ? row.created_at
          : String(row.created_at),
      updatedAt:
        typeof row.updated_at === "string"
          ? row.updated_at
          : String(row.updated_at),
    });
  }

  return { items, error: null };
}
