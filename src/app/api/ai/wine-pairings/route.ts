import { NextResponse, type NextRequest } from "next/server";

import { logAiUsageEvent } from "@/lib/ai/log-ai-event";
import { getAiCompletionModel, getOpenAi } from "@/lib/ai/openai";
import { parseLooseJsonObject } from "@/lib/ai/parse-model-json";
import { requireProWineRequest } from "@/lib/ai/require-pro-wine";
import {
  coerceWinePairingsResponse,
  sanitizeWinePairings,
  type WinePairingGenerated,
} from "@/lib/ai/wine-pairings-output";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readRecipeId(v: unknown): string | null {
  if (typeof v !== "string") {
    return null;
  }
  const id = v.trim();
  return UUID_RE.test(id) ? id : null;
}

export async function POST(req: NextRequest) {
  const ctx = await requireProWineRequest();
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

  const recipeId = readRecipeId((body as Record<string, unknown>).recipeId);
  if (!recipeId) {
    return NextResponse.json({ error: "Provide a valid recipeId." }, { status: 400 });
  }

  const { data: recipe, error: recipeErr } = await ctx.supabase
    .from("recipes")
    .select("id,title,instructions")
    .eq("id", recipeId)
    .maybeSingle();

  if (recipeErr || !recipe) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  const { data: ri } = await ctx.supabase
    .from("recipe_ingredients")
    .select("quantity,sort_order,ingredient_id")
    .eq("recipe_id", recipeId)
    .order("sort_order", { ascending: true });

  const ingredientIds = [
    ...new Set(
      (ri ?? []).map((x: { ingredient_id: string }) => x.ingredient_id),
    ),
  ];
  const { data: ings } = ingredientIds.length
    ? await ctx.supabase.from("ingredients").select("id,name").in("id", ingredientIds)
    : { data: [] };

  const nameById = new Map(
    (ings ?? []).map((i: { id: string; name: string }) => [i.id, i.name] as const),
  );

  const ingredients = (ri ?? [])
    .map(
      (row: {
        quantity: string | null;
        ingredient_id: string;
      }) => {
        const name = nameById.get(row.ingredient_id) ?? "unknown";
        const qty = row.quantity?.trim();
        return qty ? `${qty} ${name}` : name;
      },
    )
    .filter(Boolean);

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
            "You are a sommelier helping home cooks. Respond with JSON only: " +
            '{"pairings":[{"wine_type":string,"wine_name":string|null,"description":string,"notes":string|null}]} ' +
            "Suggest 1–3 pairings ranked best-first. wine_type is the style (e.g. Pinot Noir). " +
            "wine_name is an example bottle or producer when helpful, else null. " +
            "description explains why it works with the dish (2–3 sentences). " +
            "notes are optional serving tips (temperature, decanting). " +
            "Do not include purchase URLs or shopping links.",
        },
        {
          role: "user",
          content: JSON.stringify({
            title: recipe.title,
            instructions: recipe.instructions?.trim() || null,
            ingredients,
          }),
        },
      ],
      temperature: 0.55,
      max_tokens: 900,
    });
    content = completion.choices[0]?.message?.content?.trim() ?? "";
  } catch {
    return NextResponse.json(
      { error: "Could not generate wine pairings right now." },
      { status: 502 },
    );
  }

  const parsedUnknown = parseLooseJsonObject(content);
  const rawPairings = coerceWinePairingsResponse(parsedUnknown);
  if (!rawPairings) {
    return NextResponse.json(
      { error: "Model returned an unexpected format." },
      { status: 502 },
    );
  }

  const pairings: WinePairingGenerated[] = sanitizeWinePairings(rawPairings);

  const service = createSupabaseServiceRoleClient();
  if (!service) {
    return NextResponse.json(
      { error: "Service unavailable." },
      { status: 503 },
    );
  }

  const { error: delErr } = await service
    .from("wine_pairings")
    .delete()
    .eq("recipe_id", recipeId)
    .eq("source", "ai");
  if (delErr) {
    return NextResponse.json(
      { error: "Could not save wine pairings." },
      { status: 500 },
    );
  }

  const rows = pairings.map((p) => ({
    recipe_id: recipeId,
    source: "ai" as const,
    wine_type: p.wine_type,
    wine_name: p.wine_name,
    description: p.description,
    notes: p.notes,
    purchase_url: p.purchase_url,
  }));

  const { data: inserted, error: insErr } = await service
    .from("wine_pairings")
    .insert(rows)
    .select("id,wine_type,wine_name,notes,description,purchase_url");

  if (insErr || !inserted?.length) {
    return NextResponse.json(
      { error: "Could not save wine pairings." },
      { status: 500 },
    );
  }

  await logAiUsageEvent(ctx.supabase, ctx.userId, "ai_wine_pairings_generated", {
    recipe_id: recipeId,
    pairing_count: inserted.length,
  });

  return NextResponse.json({ pairings: inserted });
}
