import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { logAiUsageEvent } from "@/lib/ai/log-ai-event";
import { getAiCompletionModel, getOpenAi } from "@/lib/ai/openai";
import { parseLooseJsonObject } from "@/lib/ai/parse-model-json";
import { requireAiChefRequest } from "@/lib/ai/require-ai-chef";
import {
  sanitizeCameraCheckInOutput,
  type CameraCheckInShape,
} from "@/lib/ai/sanitize-output";
import { loadAiChefUserContext } from "@/lib/ai/user-context";
import { rejectOversizedRequest } from "@/lib/http/request-size";
import { GENERIC_SERVER_ERROR, logServerError } from "@/lib/server-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** AI Chef camera check-ins allowed per user per UTC calendar month. */
export const CAMERA_CHECK_IN_MONTHLY_LIMIT = 25;

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_MULTIPART_BYTES = MAX_BYTES + 128 * 1024;
const MAX_QUESTION = 500;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const EVENT_TYPE = "ai_camera_check_in";

function currentUtcMonthBounds(): { startIso: string; endExclusiveIso: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  return {
    startIso: new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)).toISOString(),
    endExclusiveIso: new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0)).toISOString(),
  };
}

async function countCurrentMonthCheckIns(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ count: number; error: string | null }> {
  const { startIso, endExclusiveIso } = currentUtcMonthBounds();
  const { count, error } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", EVENT_TYPE)
    .gte("created_at", startIso)
    .lt("created_at", endExclusiveIso);

  if (error) {
    logServerError("camera_check_in.usage_count", error);
    return { count: 0, error: GENERIC_SERVER_ERROR };
  }

  return { count: typeof count === "number" ? count : 0, error: null };
}

function bufferToBase64(buf: Buffer): string {
  return buf.toString("base64");
}

function readQuestion(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_QUESTION) : "";
}

function coerceCheckInOutput(parsed: unknown): CameraCheckInShape | null {
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const row = parsed as Record<string, unknown>;
  return {
    guidance: String(row.guidance ?? ""),
    food_safety_caution:
      row.food_safety_caution == null ? null : String(row.food_safety_caution ?? ""),
    next_step: String(row.next_step ?? ""),
  };
}

export async function POST(req: NextRequest) {
  const ctx = await requireAiChefRequest();
  if ("error" in ctx) {
    return ctx.error;
  }

  const oversized = rejectOversizedRequest(req, MAX_MULTIPART_BYTES);
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
      { error: "Only JPEG, PNG, or WebP images are supported." },
      { status: 400 },
    );
  }

  const ab = await file.arrayBuffer();
  if (ab.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image too large (max 5MB)." },
      { status: 400 },
    );
  }

  const question = readQuestion(fd.get("question"));
  const usage = await countCurrentMonthCheckIns(ctx.supabase, ctx.userId);
  if (usage.error) {
    return NextResponse.json(
      { error: "Could not verify camera check-in usage right now." },
      { status: 503 },
    );
  }
  if (usage.count >= CAMERA_CHECK_IN_MONTHLY_LIMIT) {
    return NextResponse.json(
      {
        error: `Monthly camera check-in limit reached (${CAMERA_CHECK_IN_MONTHLY_LIMIT}/month). Try again next month.`,
        code: "camera_check_in_monthly_limit",
        limit: CAMERA_CHECK_IN_MONTHLY_LIMIT,
      },
      { status: 429 },
    );
  }

  const base64 = bufferToBase64(Buffer.from(ab));
  const dataUrl = `data:${mime};base64,${base64}`;
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
            "You are a concise cooking camera check-in assistant. Return JSON only matching " +
            '{"guidance":string,"food_safety_caution":string|null,"next_step":string}. ' +
            "Answer the user's question from the photo when possible. Keep guidance short and practical. " +
            "Include a food_safety_caution when doneness, meat, seafood, eggs, allergens, spoilage, or cross-contact may matter. " +
            "Do not claim certainty about internal temperature from an image; recommend a thermometer or safer check when relevant.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: JSON.stringify({
                question: question || "What should I do next?",
                user_context: userContext,
              }),
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
      temperature: 0.25,
      max_tokens: 360,
    });
    content = completion.choices[0]?.message?.content?.trim() ?? "";
  } catch {
    return NextResponse.json(
      { error: "Could not check this photo right now." },
      { status: 502 },
    );
  }

  const raw = coerceCheckInOutput(parseLooseJsonObject(content));
  if (!raw) {
    return NextResponse.json(
      { error: "Model returned an unexpected format." },
      { status: 502 },
    );
  }

  const answer = sanitizeCameraCheckInOutput(raw);
  if (!answer.guidance || !answer.next_step) {
    return NextResponse.json(
      { error: "Model returned an empty check-in." },
      { status: 502 },
    );
  }

  await logAiUsageEvent(ctx.supabase, ctx.userId, EVENT_TYPE, {
    mime,
    bytes: ab.byteLength,
    has_question: Boolean(question),
    monthly_limit: CAMERA_CHECK_IN_MONTHLY_LIMIT,
  });

  return NextResponse.json({
    ...answer,
    usage: {
      used: usage.count + 1,
      limit: CAMERA_CHECK_IN_MONTHLY_LIMIT,
    },
  });
}
