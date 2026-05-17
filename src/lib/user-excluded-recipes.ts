import type { SupabaseClient } from "@supabase/supabase-js";

/** Recipe ids the signed-in user has hidden from browse surfaces. */
export async function getExcludedRecipeIdsForUser(
  supabase: SupabaseClient,
  userId: string | null | undefined,
): Promise<Set<string>> {
  if (!userId) return new Set();

  const { data, error } = await supabase
    .from("user_excluded_recipes")
    .select("recipe_id")
    .eq("user_id", userId);

  if (error) return new Set();

  return new Set(
    (data ?? []).map((row: { recipe_id: string }) => row.recipe_id),
  );
}
