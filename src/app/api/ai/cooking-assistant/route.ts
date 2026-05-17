import { NextResponse, type NextRequest } from "next/server";

import { logAiUsageEvent } from "@/lib/ai/log-ai-event";
import { getAiCompletionModel, getOpenAi } from "@/lib/ai/openai";
import { parseLooseJsonObject } from "@/lib/ai/parse-model-json";
import { requireAiChefRequest } from "@/lib/ai/require-ai-chef";
import {
  sanitizeCookingAssistantOutput,
  type CookingAssistantShape,
} from "@/lib/ai/sanitize-output";
import { loadAiChefUserContext } from "@/lib/ai/user-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_QUESTION = 800;
const MAX_ITEM = 80;
const MAX_ITEMS = 24;

function readString(value: unknown, max: number): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, max);
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }
    const trimmed = item.trim().slice(0, MAX_ITEM);
    if (!trimmed || out.includes(trimmed)) {
      continue;
    }
    out.push(trimmed);
    if (out.length >= MAX_ITEMS) {
      break;
    }
  }
  return out;
}

function coerceAssistant(parsed: unknown): CookingAssistantShape | null {
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const row = parsed as Record<string, unknown>;
  return {
    answer: String(row.answer ?? ""),
    suggested_meals: Array.isArray(row.suggested_meals)
      ? (row.suggested_meals as unknown[]).map((x) => String(x ?? ""))
      : [],
    used_pantry_items: Array.isArray(row.used_pantry_items)
      ? (row.used_pantry_items as unknown[]).map((x) => String(x ?? ""))
      : [],
    next_steps: Array.isArray(row.next_steps)
      ? (row.next_steps as unknown[]).map((x) => String(x ?? ""))
      : [],
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
  const question = readString(b.question, MAX_QUESTION);
  const currentIngredients = readStringArray(b.currentIngredients);
  if (!question && currentIngredients.length === 0) {
    return NextResponse.json(
      { error: "Ask a cooking question or provide ingredients." },
      { status: 400 },
    );
  }

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
            "You are a pantry-aware cooking assistant for home cooks. Return JSON only matching " +
            '{"answer":string,"suggested_meals":string[],"used_pantry_items":string[],"next_steps":string[]}. ' +
            "Use saved pantry and current ingredients first. Respect allergy and preference context. " +
            "Do not provide medical advice; when allergy risk is unclear, recommend checking labels and choosing a safe alternative.",
        },
        {
          role: "user",
          content: JSON.stringify({
            question: question || null,
            current_ingredients: currentIngredients,
            user_context: userContext,
          }),
        },
      ],
      temperature: 0.45,
      max_tokens: 900,
    });
    content = completion.choices[0]?.message?.content?.trim() ?? "";
  } catch {
    return NextResponse.json(
      { error: "Could not answer right now." },
      { status: 502 },
    );
  }

  const parsedUnknown = parseLooseJsonObject(content);
  const raw = coerceAssistant(parsedUnknown);
  if (!raw) {
    return NextResponse.json(
      { error: "Model returned an unexpected format." },
      { status: 502 },
    );
  }

  const answer = sanitizeCookingAssistantOutput(raw);
  if (!answer.answer) {
    return NextResponse.json(
      { error: "Model returned an empty answer." },
      { status: 502 },
    );
  }

  await logAiUsageEvent(ctx.supabase, ctx.userId, "ai_cooking_assistant_answered", {
    has_question: Boolean(question),
    current_ingredient_count: currentIngredients.length,
    pantry_count: userContext.pantryItems.length,
  });

  return NextResponse.json(answer);
}
