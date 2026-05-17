import { NextResponse, type NextRequest } from "next/server";

import { logAiUsageEvent } from "@/lib/ai/log-ai-event";
import { getAiCompletionModel, getOpenAi } from "@/lib/ai/openai";
import { parseLooseJsonObject } from "@/lib/ai/parse-model-json";
import { requireAiChefRequest } from "@/lib/ai/require-ai-chef";
import {
  sanitizeRecipeOutput,
  type RecipeGenerateShape,
} from "@/lib/ai/sanitize-output";
import { loadAiChefUserContext } from "@/lib/ai/user-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_INGREDIENT_INPUT = 24;
const MAX_INGREDIENT_TOKEN = 48;
const MAX_OPTIONAL_FIELD = 200;

function readIngredients(v: unknown): string[] {
  if (!Array.isArray(v)) {
    return [];
  }
  const out: string[] = [];
  for (const x of v) {
    if (typeof x !== "string") {
      continue;
    }
    const t = x.trim().slice(0, MAX_INGREDIENT_TOKEN);
    if (t) {
      out.push(t);
    }
    if (out.length >= MAX_INGREDIENT_INPUT) {
      break;
    }
  }
  return out;
}

function readOptionalStr(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") {
    return undefined;
  }
  const t = v.trim().slice(0, max);
  return t.length > 0 ? t : undefined;
}

function coerceRecipe(parsed: unknown): RecipeGenerateShape | null {
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const o = parsed as Record<string, unknown>;
  return {
    title: String(o.title ?? ""),
    ingredients: Array.isArray(o.ingredients)
      ? (o.ingredients as unknown[]).map((x) => String(x ?? ""))
      : [],
    steps: Array.isArray(o.steps)
      ? (o.steps as unknown[]).map((x) => String(x ?? ""))
      : [],
    cook_time_minutes: Number(o.cook_time_minutes),
  };
}

export async function POST(req: NextRequest) {
  const ctx = await requireAiChefRequest();
  if ("error" in ctx) {
    return ctx.error;
  }

  const openai = getOpenAi();
  if (!openai) {
    return NextResponse.json(
      { error: "AI service is not configured." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const ingredients = readIngredients(b.ingredients);
  if (ingredients.length === 0) {
    return NextResponse.json(
      { error: "Provide a non-empty ingredients array." },
      { status: 400 },
    );
  }

  const cuisine = readOptionalStr(b.cuisine, MAX_OPTIONAL_FIELD);
  const difficulty = readOptionalStr(b.difficulty, MAX_OPTIONAL_FIELD);
  const allergyNotes = readOptionalStr(b.allergyNotes, MAX_OPTIONAL_FIELD);
  const userContext = await loadAiChefUserContext(ctx.supabase, ctx.userId);

  const model = getAiCompletionModel();

  let content: string;
  try {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a careful cooking assistant. Respond with JSON only matching this shape: " +
            '{"title":string,"ingredients":string[],"steps":string[],"cook_time_minutes":number}. ' +
            "Steps should be concise but complete. Honor allergy notes by avoiding risky ingredients " +
            "and calling out safe alternatives inline in ingredients where helpful. Use the supplied user context " +
            "to tailor cuisine, difficulty, pantry usage, and preferences. Avoid recipes similar to hidden recipes. Keep language practical.",
        },
        {
          role: "user",
          content: JSON.stringify({
            ingredients,
            cuisine: cuisine ?? null,
            difficulty: difficulty ?? null,
            allergy_notes: allergyNotes ?? null,
            user_context: userContext,
          }),
        },
      ],
      temperature: 0.6,
      max_tokens: 1200,
    });
    content = completion.choices[0]?.message?.content?.trim() ?? "";
  } catch {
    return NextResponse.json(
      { error: "Could not generate a recipe right now." },
      { status: 502 },
    );
  }

  const parsedUnknown = parseLooseJsonObject(content);
  const rawRecipe = coerceRecipe(parsedUnknown);
  if (!rawRecipe) {
    return NextResponse.json(
      { error: "Model returned an unexpected format." },
      { status: 502 },
    );
  }

  const recipe = sanitizeRecipeOutput(rawRecipe);

  await logAiUsageEvent(ctx.supabase, ctx.userId, "ai_recipe_generated", {
    ingredient_count: ingredients.length,
    has_cuisine: Boolean(cuisine),
    has_allergy_notes: Boolean(allergyNotes),
    pantry_count: userContext.pantryItems.length,
    saved_recipe_count: userContext.savedRecipeTitles.length,
  });

  return NextResponse.json(recipe);
}
