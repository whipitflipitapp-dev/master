import type { SupabaseClient } from "@supabase/supabase-js";

export const GROCERY_LIST_TITLE = "Whip It Flip It Grocery List";
export const GROCERY_LIST_LOGO_PATH = "/images/upgrade-pitch-logo.png";
const GENERIC_GROCERY_LOAD_ERROR =
  "Something went wrong. Please try again.";

export type GroceryListIngredient = {
  ingredientId: string;
  name: string;
  quantity: string | null;
  sortOrder: number;
};

export type GroceryListRecipe = {
  id: string;
  title: string;
  savedAt: string;
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
    return { recipes: [], error: GENERIC_GROCERY_LOAD_ERROR };
  }

  const recipes: GroceryListRecipe[] = (favoriteRows ?? [])
    .flatMap((row) => {
      const typed = row as FavoriteRecipeRow;
      const recipe = normalizeEmbeddedRecipe(typed.recipes);
      return recipe
        ? [
            {
              id: recipe.id,
              title: recipe.title,
              savedAt: typed.created_at,
              ingredients: [],
            },
          ]
        : [];
    })
    .sort(
      (a, b) =>
        new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
    );

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
    return { recipes: [], error: GENERIC_GROCERY_LOAD_ERROR };
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
    return { recipes: [], error: GENERIC_GROCERY_LOAD_ERROR };
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
    .map((item) => ({
      key: item.key,
      name: item.name,
      notes: item.notes,
      text: item.text,
    }));
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

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function buildGroceryListCsv(
  recipes: GroceryListRecipe[],
  selectedRecipeIds: Set<string>,
  items: GroceryListItem[],
): string {
  const selectedTitles = recipes
    .filter((recipe) => selectedRecipeIds.has(recipe.id))
    .map((recipe) => recipe.title)
    .join("; ");
  const header = ["checked", "item", "notes", "recipes"].map(csvCell).join(",");
  const rows = items.map((item) =>
    ["", item.name, item.notes.join("; "), selectedTitles].map(csvCell).join(","),
  );
  return [header, ...rows].join("\n");
}
