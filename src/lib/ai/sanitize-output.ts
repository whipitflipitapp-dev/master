const MAX_TITLE = 120;
const MAX_INGREDIENT_LEN = 80;
const MAX_INGREDIENTS = 30;
const MAX_STEP_LEN = 500;
const MAX_STEPS = 25;
const COOK_TIME_MIN = 1;
const COOK_TIME_MAX = 480;

const MAX_SUB_LINE = 160;
const MAX_SUB_LINES = 10;
const MAX_SUB_NAME = 80;
const MAX_SUB_FIELD = 180;
const MAX_SUBSTITUTIONS = 8;

const MAX_VISION_ITEM = 60;
const MAX_VISION_ITEMS = 40;
const MAX_VISION_ACTION = 120;
const MAX_VISION_ACTIONS = 6;

const MAX_ASSISTANT_TEXT = 1200;
const MAX_ASSISTANT_ITEM = 100;
const MAX_ASSISTANT_ITEMS = 8;

export type RecipeGenerateShape = {
  title: string;
  ingredients: string[];
  steps: string[];
  cook_time_minutes: number;
};

export type SubstitutionSuggestion = {
  ingredient: string;
  quantity_guidance: string;
  rationale: string;
  dietary_notes: string | null;
};

export type VisionIngredientsShape = {
  dish_name: string | null;
  ingredients: string[];
  suggested_actions: string[];
};

export type CookingAssistantShape = {
  answer: string;
  suggested_meals: string[];
  used_pantry_items: string[];
  next_steps: string[];
};

function clip(s: string, max: number): string {
  const t = s.trim();
  return t.length <= max ? t : t.slice(0, max);
}

export function sanitizeRecipeOutput(raw: RecipeGenerateShape): RecipeGenerateShape {
  const title = clip(String(raw.title ?? ""), MAX_TITLE);
  const ingredients = (Array.isArray(raw.ingredients) ? raw.ingredients : [])
    .map((x) => clip(String(x ?? ""), MAX_INGREDIENT_LEN))
    .filter(Boolean)
    .slice(0, MAX_INGREDIENTS);
  const steps = (Array.isArray(raw.steps) ? raw.steps : [])
    .map((x) => clip(String(x ?? ""), MAX_STEP_LEN))
    .filter(Boolean)
    .slice(0, MAX_STEPS);
  let cook = Number(raw.cook_time_minutes);
  if (!Number.isFinite(cook)) {
    cook = 30;
  }
  cook = Math.round(cook);
  cook = Math.min(COOK_TIME_MAX, Math.max(COOK_TIME_MIN, cook));
  return { title, ingredients, steps, cook_time_minutes: cook };
}

export function sanitizeSubstitutionLines(lines: string[]): string[] {
  return lines
    .map((x) => clip(String(x ?? ""), MAX_SUB_LINE))
    .filter(Boolean)
    .slice(0, MAX_SUB_LINES);
}

export function sanitizeSubstitutions(
  raw: SubstitutionSuggestion[],
): SubstitutionSuggestion[] {
  return (Array.isArray(raw) ? raw : [])
    .map((item) => ({
      ingredient: clip(String(item?.ingredient ?? ""), MAX_SUB_NAME),
      quantity_guidance: clip(String(item?.quantity_guidance ?? ""), MAX_SUB_FIELD),
      rationale: clip(String(item?.rationale ?? ""), MAX_SUB_FIELD),
      dietary_notes:
        item?.dietary_notes == null
          ? null
          : clip(String(item.dietary_notes ?? ""), MAX_SUB_FIELD) || null,
    }))
    .filter((item) => item.ingredient && item.quantity_guidance && item.rationale)
    .slice(0, MAX_SUBSTITUTIONS);
}

export function sanitizeIngredientList(items: string[]): string[] {
  return items
    .map((x) => clip(String(x ?? ""), MAX_VISION_ITEM))
    .filter(Boolean)
    .slice(0, MAX_VISION_ITEMS);
}

export function sanitizeVisionOutput(
  raw: VisionIngredientsShape,
): VisionIngredientsShape {
  const dish = raw.dish_name == null ? null : clip(String(raw.dish_name), 80) || null;
  const ingredients = sanitizeIngredientList(raw.ingredients);
  const suggested_actions = (Array.isArray(raw.suggested_actions)
    ? raw.suggested_actions
    : []
  )
    .map((x) => clip(String(x ?? ""), MAX_VISION_ACTION))
    .filter(Boolean)
    .slice(0, MAX_VISION_ACTIONS);
  return { dish_name: dish, ingredients, suggested_actions };
}

export function sanitizeCookingAssistantOutput(
  raw: CookingAssistantShape,
): CookingAssistantShape {
  const shortList = (items: string[]) =>
    (Array.isArray(items) ? items : [])
      .map((x) => clip(String(x ?? ""), MAX_ASSISTANT_ITEM))
      .filter(Boolean)
      .slice(0, MAX_ASSISTANT_ITEMS);

  return {
    answer: clip(String(raw.answer ?? ""), MAX_ASSISTANT_TEXT),
    suggested_meals: shortList(raw.suggested_meals),
    used_pantry_items: shortList(raw.used_pantry_items),
    next_steps: shortList(raw.next_steps),
  };
}
