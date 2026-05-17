import { NextResponse, type NextRequest } from "next/server";

import { logAiUsageEvent } from "@/lib/ai/log-ai-event";
import { getAiCompletionModel, getOpenAi } from "@/lib/ai/openai";
import { parseLooseJsonObject } from "@/lib/ai/parse-model-json";
import { requireAiChefRequest } from "@/lib/ai/require-ai-chef";
import {
  sanitizeSubstitutionLines,
  sanitizeSubstitutions,
  type SubstitutionSuggestion,
} from "@/lib/ai/sanitize-output";
import { loadAiChefUserContext } from "@/lib/ai/user-context";
import { rejectOversizedRequest } from "@/lib/http/request-size";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_INGREDIENT = 120;
const MAX_CONTEXT = 400;
const MAX_ALLERGY = 400;
const MAX_JSON_BODY_BYTES = 2 * 1024;

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

function coerceSubstitutions(parsed: unknown): SubstitutionSuggestion[] {
  if (!parsed || typeof parsed !== "object") {
    return [];
  }
  const o = parsed as Record<string, unknown>;
  if (!Array.isArray(o.substitutions)) {
    return [];
  }
  return o.substitutions.map((item) => {
    const row =
      item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      ingredient: String(row.ingredient ?? ""),
      quantity_guidance: String(row.quantity_guidance ?? ""),
      rationale: String(row.rationale ?? ""),
      dietary_notes:
        row.dietary_notes == null ? null : String(row.dietary_notes ?? ""),
    };
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requireAiChefRequest();
  if ("error" in ctx) {
    return ctx.error;
  }

  const oversized = rejectOversizedRequest(req, MAX_JSON_BODY_BYTES);
  if (oversized) {
    return oversized;
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
            'You suggest practical cooking substitutions. Return JSON: {"substitutions":[{"ingredient":string,"quantity_guidance":string,"rationale":string,"dietary_notes":string|null}]} with 3-6 options. ' +
            "Quantity guidance should explain ratios or adjustment amounts. Rationale should mention flavor, texture, or chemistry. " +
            "Dietary notes should reflect supplied allergy/profile context when relevant. No medical claims; practical kitchen guidance only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            ingredient,
            dish_or_context: context || null,
            allergy_notes: allergyNotes || null,
            user_context: userContext,
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
  const substitutions = sanitizeSubstitutions(coerceSubstitutions(parsedUnknown));
  const lines =
    substitutions.length > 0
      ? substitutions.map((item) =>
          [
            item.ingredient,
            item.quantity_guidance,
            item.rationale,
            item.dietary_notes,
          ]
            .filter(Boolean)
            .join(" - "),
        )
      : sanitizeSubstitutionLines(coerceSuggestions(parsedUnknown));

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

  return NextResponse.json({
    substitutions,
    suggestions: lines,
  });
}
