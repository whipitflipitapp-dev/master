import { NextResponse, type NextRequest } from "next/server";

import { consumeRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import {
  isClientTelemetryEventName,
  recordClientTelemetryEvent,
} from "@/lib/telemetry/client-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TELEMETRY_WINDOW_MS = 15 * 60 * 1000;
const TELEMETRY_MAX_PER_WINDOW = 30;
const MAX_BODY_BYTES = 512;
const MAX_EVENT_NAME_LENGTH = 64;

type TelemetryBody = {
  event?: unknown;
};

function requestIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwarded ||
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const length = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }

  const limit = consumeRateLimit({
    key: `telemetry:${requestIp(req)}`,
    windowMs: TELEMETRY_WINDOW_MS,
    max: TELEMETRY_MAX_PER_WINDOW,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many telemetry events." },
      { status: 429, headers: rateLimitHeaders(limit) },
    );
  }

  let body: TelemetryBody = {};
  try {
    body = (await req.json()) as TelemetryBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (
    typeof body.event !== "string" ||
    body.event.length > MAX_EVENT_NAME_LENGTH ||
    !isClientTelemetryEventName(body.event)
  ) {
    return NextResponse.json({ error: "Unsupported event." }, { status: 400 });
  }

  await recordClientTelemetryEvent(body.event);

  return NextResponse.json({ ok: true });
}
