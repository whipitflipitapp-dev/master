import type { SupabaseClient } from "@supabase/supabase-js";

export const GROCERY_LIST_TITLE = "Whip It Flip It Grocery List";
export const GROCERY_LIST_LOGO_PATH = "/images/upgrade-pitch-logo.png";

export type GroceryListIngredient = {
  ingredientId: string;
  name: string;
  quantity: string | null;
  sortOrder: number;
};

export type GroceryListRecipe = {
  id: string;
  title: string;
  ingredients: GroceryListIngredient[];
};

export type GroceryListItem = {
  key: string;
  name: string;
  notes: string[];
  text: string;
};

type FavoriteRecipeRow = {
  recipe_id: string;
  created_at: string;
  recipes:
    | {
        id: string;
        title: string;
      }
    | {
        id: string;
        title: string;
      }[]
    | null;
};

function normalizeEmbeddedRecipe(row: FavoriteRecipeRow["recipes"]) {
  if (!row) return null;
  return Array.isArray(row) ? row[0] ?? null : row;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function selectedRecipeIdSet(
  recipeIds: string[],
  availableRecipes: GroceryListRecipe[],
): Set<string> {
  const available = new Set(availableRecipes.map((recipe) => recipe.id));
  const selected = new Set<string>();
  for (const id of recipeIds) {
    if (available.has(id)) {
      selected.add(id);
    }
  }
  return selected;
}

export async function loadSavedGroceryListRecipes(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ recipes: GroceryListRecipe[]; error: string | null }> {
  const { data: favoriteRows, error: favoritesError } = await supabase
    .from("favorites")
    .select(
      `
      recipe_id,
      created_at,
      recipes (
        id,
        title
      )
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (favoritesError) {
    return { recipes: [], error: favoritesError.message };
  }

  const recipes = (favoriteRows ?? [])
    .map((row) => normalizeEmbeddedRecipe((row as FavoriteRecipeRow).recipes))
    .filter((row): row is { id: string; title: string } => Boolean(row))
    .map((row) => ({ id: row.id, title: row.title, ingredients: [] }));

  const recipeIds = recipes.map((recipe) => recipe.id);
  if (recipeIds.length === 0) {
    return { recipes, error: null };
  }

  const { data: recipeIngredientRows, error: recipeIngredientError } =
    await supabase
      .from("recipe_ingredients")
      .select("recipe_id,ingredient_id,quantity,sort_order")
      .in("recipe_id", recipeIds)
      .order("sort_order", { ascending: true });

  if (recipeIngredientError) {
    return { recipes: [], error: recipeIngredientError.message };
  }

  const ingredientIds = [
    ...new Set(
      (recipeIngredientRows ?? []).map(
        (row: { ingredient_id: string }) => row.ingredient_id,
      ),
    ),
  ];

  const { data: ingredientRows, error: ingredientsError } = ingredientIds.length
    ? await supabase.from("ingredients").select("id,name").in("id", ingredientIds)
    : { data: [] as { id: string; name: string }[], error: null };

  if (ingredientsError) {
    return { recipes: [], error: ingredientsError.message };
  }

  const ingredientNameById = new Map(
    (ingredientRows ?? []).map((row: { id: string; name: string }) => [
      row.id,
      row.name,
    ]),
  );
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));

  for (const row of recipeIngredientRows ?? []) {
    const typed = row as {
      recipe_id: string;
      ingredient_id: string;
      quantity: string | null;
      sort_order: number;
    };
    const recipe = recipeById.get(typed.recipe_id);
    if (!recipe) continue;
    recipe.ingredients.push({
      ingredientId: typed.ingredient_id,
      name: ingredientNameById.get(typed.ingredient_id) ?? "unknown",
      quantity: typed.quantity,
      sortOrder: typed.sort_order,
    });
  }

  for (const recipe of recipes) {
    recipe.ingredients.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return { recipes, error: null };
}

export function buildGroceryItems(
  recipes: GroceryListRecipe[],
  selectedRecipeIds: Set<string>,
): GroceryListItem[] {
  const items = new Map<
    string,
    GroceryListItem & { firstRecipeIndex: number; firstIngredientIndex: number }
  >();

  recipes.forEach((recipe, recipeIndex) => {
    if (!selectedRecipeIds.has(recipe.id)) return;

    recipe.ingredients.forEach((ingredient, ingredientIndex) => {
      const name = ingredient.name.trim();
      if (!name) return;

      const key = normalizeKey(name);
      const quantity = ingredient.quantity?.trim();
      const existing =
        items.get(key) ??
        ({
          key,
          name,
          notes: [],
          text: name,
          firstRecipeIndex: recipeIndex,
          firstIngredientIndex: ingredientIndex,
        } satisfies GroceryListItem & {
          firstRecipeIndex: number;
          firstIngredientIndex: number;
        });

      if (quantity) {
        const note = `${quantity} (${recipe.title})`;
        if (!existing.notes.includes(note)) {
          existing.notes.push(note);
        }
      }
      existing.text =
        existing.notes.length > 0
          ? `${existing.name} - ${existing.notes.join("; ")}`
          : existing.name;
      items.set(key, existing);
    });
  });

  return [...items.values()]
    .sort((a, b) => {
      if (a.firstRecipeIndex !== b.firstRecipeIndex) {
        return a.firstRecipeIndex - b.firstRecipeIndex;
      }
      return a.firstIngredientIndex - b.firstIngredientIndex;
    })
    .map(({ firstRecipeIndex: _r, firstIngredientIndex: _i, ...item }) => item);
}

export function buildGroceryListText(
  recipes: GroceryListRecipe[],
  selectedRecipeIds: Set<string>,
  items: GroceryListItem[],
): string {
  const selectedTitles = recipes
    .filter((recipe) => selectedRecipeIds.has(recipe.id))
    .map((recipe) => recipe.title);
  const lines = [
    GROCERY_LIST_TITLE,
    selectedTitles.length ? `Recipes: ${selectedTitles.join(", ")}` : "",
    "",
    ...items.map((item) => `[ ] ${item.text}`),
  ];
  return lines.filter((line, index) => line || index > 1).join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildGroceryListEmailHtml({
  recipes,
  selectedRecipeIds,
  items,
  logoUrl,
}: {
  recipes: GroceryListRecipe[];
  selectedRecipeIds: Set<string>;
  items: GroceryListItem[];
  logoUrl: string | null;
}): string {
  const selectedTitles = recipes
    .filter((recipe) => selectedRecipeIds.has(recipe.id))
    .map((recipe) => recipe.title);

  const recipeHtml = selectedTitles.length
    ? `<p style="margin:0 0 24px;color:#78716c;font-size:14px;line-height:1.5;">Recipes: ${escapeHtml(selectedTitles.join(", "))}</p>`
    : "";

  const listHtml = items
    .map(
      (item) => `
        <li style="display:flex;gap:12px;align-items:flex-start;margin:0 0 12px;padding:12px;border:1px solid #e7e5e4;border-radius:14px;background:#fffdf8;">
          <span aria-hidden="true" style="font-size:20px;line-height:1;color:#f97316;">&#9744;</span>
          <span style="font-size:16px;line-height:1.45;color:#292524;">${escapeHtml(item.text)}</span>
        </li>`,
    )
    .join("");

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#faf8f5;font-family:Arial,Helvetica,sans-serif;color:#292524;">
    <main style="max-width:640px;margin:0 auto;padding:28px 18px;">
      <section style="border:1px solid #e7e5e4;border-radius:24px;background:#ffffff;padding:28px;box-shadow:0 8px 30px rgba(28,25,23,0.08);">
        <div style="text-align:center;margin-bottom:18px;">
          ${
            logoUrl
              ? `<img src="${escapeHtml(logoUrl)}" alt="Whip It Flip It" width="96" style="display:inline-block;width:96px;height:auto;object-fit:contain;" />`
              : `<div style="font-weight:800;font-size:18px;color:#f97316;">Whip It Flip It</div>`
          }
        </div>
        <h1 style="margin:0 0 10px;text-align:center;font-size:28px;line-height:1.15;color:#1c1917;">${GROCERY_LIST_TITLE}</h1>
        ${recipeHtml}
        <ul style="list-style:none;margin:0;padding:0;">${listHtml}</ul>
      </section>
    </main>
  </body>
</html>`;
}

export function groceryListLogoUrl(): string | null {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "";
  if (!origin) return null;

  try {
    return new URL(GROCERY_LIST_LOGO_PATH, origin).toString();
  } catch {
    return null;
  }
}
