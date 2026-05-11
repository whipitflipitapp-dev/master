const MAX_TITLE = 120;
const MAX_INGREDIENT_LEN = 80;
const MAX_INGREDIENTS = 30;
const MAX_STEP_LEN = 500;
const MAX_STEPS = 25;
const COOK_TIME_MIN = 1;
const COOK_TIME_MAX = 480;

const MAX_SUB_LINE = 160;
const MAX_SUB_LINES = 10;

const MAX_VISION_ITEM = 60;
const MAX_VISION_ITEMS = 40;

export type RecipeGenerateShape = {
  title: string;
  ingredients: string[];
  steps: string[];
  cook_time_minutes: number;
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

export function sanitizeIngredientList(items: string[]): string[] {
  return items
    .map((x) => clip(String(x ?? ""), MAX_VISION_ITEM))
    .filter(Boolean)
    .slice(0, MAX_VISION_ITEMS);
}
