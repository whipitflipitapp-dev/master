import { NextResponse, type NextRequest } from "next/server";

import { logAiUsageEvent } from "@/lib/ai/log-ai-event";
import { getAiCompletionModel, getOpenAi } from "@/lib/ai/openai";
import { parseLooseJsonObject } from "@/lib/ai/parse-model-json";
import { requireAiChefRequest } from "@/lib/ai/require-ai-chef";
import { sanitizeSubstitutionLines } from "@/lib/ai/sanitize-output";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_INGREDIENT = 120;
const MAX_CONTEXT = 400;
const MAX_ALLERGY = 400;

function readStr(v: unknown, max: number): string {
  if (typeof v !== "string") {
    return "";
  }
  return v.trim().slice(0, max);
}

function coerceSuggestions(parsed: unknown): string[] {
  if (!parsed || typeof parsed !== "object") {
    return [];
  }
  const o = parsed as Record<string, unknown>;
  if (Array.isArray(o.suggestions)) {
    return o.suggestions.map((x) => String(x ?? ""));
  }
  if (typeof o.suggestions === "string") {
    return o.suggestions
      .split(/[\n;•]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
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
  const ingredient = readStr(b.ingredient, MAX_INGREDIENT);
  if (!ingredient) {
    return NextResponse.json(
      { error: "Provide a non-empty ingredient string." },
      { status: 400 },
    );
  }

  const context = readStr(b.context, MAX_CONTEXT);
  const allergyNotes = readStr(b.allergyNotes, MAX_ALLERGY);

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
            'You suggest short cooking substitutions. Return JSON: {"suggestions": string[]} with 3–8 brief lines. ' +
            "If allergy notes are provided, every suggestion must be safe for those constraints or clearly state why it may not work. " +
            "No medical claims; practical kitchen guidance only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            ingredient,
            dish_or_context: context || null,
            allergy_notes: allergyNotes || null,
          }),
        },
      ],
      temperature: 0.5,
      max_tokens: 500,
    });
    content = completion.choices[0]?.message?.content?.trim() ?? "";
  } catch {
    return NextResponse.json(
      { error: "Could not suggest substitutions right now." },
      { status: 502 },
    );
  }

  const parsedUnknown = parseLooseJsonObject(content);
  const lines = sanitizeSubstitutionLines(coerceSuggestions(parsedUnknown));

  if (lines.length === 0) {
    return NextResponse.json(
      { error: "Model returned an unexpected format." },
      { status: 502 },
    );
  }

  await logAiUsageEvent(ctx.supabase, ctx.userId, "ai_substitution_suggested", {
    has_context: Boolean(context),
    has_allergy_notes: Boolean(allergyNotes),
  });

  return NextResponse.json({ suggestions: lines });
}
