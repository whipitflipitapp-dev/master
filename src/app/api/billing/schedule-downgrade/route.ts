import { NextResponse, type NextRequest } from "next/server";

import { runSchedulePlanDowngrade } from "@/lib/billing/plan-downgrade";
import { checkoutFailureHttpStatus } from "@/lib/billing/checkout-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DowngradeBody = {
  targetPlan?: unknown;
};

async function readBody(req: NextRequest): Promise<DowngradeBody> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return (await req.json()) as DowngradeBody;
    } catch {
      return {};
    }
  }
  try {
    const fd = await req.formData();
    return { targetPlan: fd.get("targetPlan") };
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  const body = await readBody(req);
  const result = await runSchedulePlanDowngrade(body.targetPlan);

  if (!result.ok) {
    const status = checkoutFailureHttpStatus(result.error);
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    effectiveAt: result.effectiveAt,
    pendingPlan: result.pendingPlan,
  });
}
