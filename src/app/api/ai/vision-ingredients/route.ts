import { NextResponse, type NextRequest } from "next/server";

import { logAiUsageEvent } from "@/lib/ai/log-ai-event";
import { getAiCompletionModel, getOpenAi } from "@/lib/ai/openai";
import { parseLooseJsonObject } from "@/lib/ai/parse-model-json";
import { requireAiChefRequest } from "@/lib/ai/require-ai-chef";
import { sanitizeIngredientList } from "@/lib/ai/sanitize-output";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png"]);

function bufferToBase64(buf: Buffer): string {
  return buf.toString("base64");
}

function coerceIngredientArray(parsed: unknown): string[] {
  if (!parsed || typeof parsed !== "object") {
    return [];
  }
  const o = parsed as Record<string, unknown>;
  if (!Array.isArray(o.ingredients)) {
    return [];
  }
  return (o.ingredients as unknown[]).map((x) => String(x ?? ""));
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

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Could not read upload (size or format)." },
      { status: 400 },
    );
  }

  const file = fd.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing image field (multipart file named image)." },
      { status: 400 },
    );
  }

  const mime = (file.type || "").toLowerCase().split(";")[0].trim();
  if (!ALLOWED_TYPES.has(mime)) {
    return NextResponse.json(
      { error: "Only JPEG or PNG images are supported." },
      { status: 400 },
    );
  }

  const ab = await file.arrayBuffer();
  if (ab.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image too large (max 4MB)." },
      { status: 400 },
    );
  }

  const base64 = bufferToBase64(Buffer.from(ab));
  const mediaType = mime === "image/jpeg" ? "image/jpeg" : "image/png";
  const dataUrl = `data:${mediaType};base64,${base64}`;

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
            'Identify visible raw ingredients suitable for cooking. Respond with JSON {"ingredients": string[]} — ' +
            "common pantry names only, lowercase where natural, deduplicated. " +
            "If unsure, omit rather than hallucinate packaged brand names.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "List cooking ingredients visible in this image.",
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 600,
    });
    content = completion.choices[0]?.message?.content?.trim() ?? "";
  } catch {
    return NextResponse.json(
      { error: "Could not read ingredients from image right now." },
      { status: 502 },
    );
  }

  const parsedUnknown = parseLooseJsonObject(content);
  const ingredients = sanitizeIngredientList(
    coerceIngredientArray(parsedUnknown),
  );

  if (ingredients.length === 0) {
    return NextResponse.json(
      { error: "No ingredients extracted. Try another photo." },
      { status: 422 },
    );
  }

  await logAiUsageEvent(ctx.supabase, ctx.userId, "ai_vision_ingredients", {
    mime: mediaType,
    bytes: ab.byteLength,
  });

  return NextResponse.json({ ingredients });
}
