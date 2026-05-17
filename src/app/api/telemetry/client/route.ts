import { NextResponse, type NextRequest } from "next/server";

import { recordClientTelemetryEvent } from "@/lib/telemetry/client-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TelemetryBody = {
  event?: unknown;
};

export async function POST(req: NextRequest) {
  let body: TelemetryBody = {};
  try {
    body = (await req.json()) as TelemetryBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  await recordClientTelemetryEvent(
    typeof body.event === "string" ? body.event : "",
  );

  return NextResponse.json({ ok: true });
}
