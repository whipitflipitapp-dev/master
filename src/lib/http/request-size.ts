import { NextResponse, type NextRequest } from "next/server";

export function rejectOversizedRequest(
  req: NextRequest,
  maxBytes: number,
): NextResponse | null {
  const raw = req.headers.get("content-length");
  if (!raw) {
    return null;
  }
  const length = Number(raw);
  if (!Number.isFinite(length) || length <= maxBytes) {
    return null;
  }
  return NextResponse.json({ error: "Payload too large." }, { status: 413 });
}
