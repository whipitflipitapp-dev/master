import { NextResponse, type NextRequest } from "next/server";

import { runCheckoutSession } from "@/lib/billing/checkout-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckoutBody = {
  tier?: unknown;
  interval?: unknown;
};

async function readBody(req: NextRequest): Promise<CheckoutBody> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return (await req.json()) as CheckoutBody;
    } catch {
      return {};
    }
  }
  try {
    const fd = await req.formData();
    return {
      tier: fd.get("tier"),
      interval: fd.get("interval"),
    };
  } catch {
    return {};
  }
}

function wantsRedirect(req: NextRequest, body: CheckoutBody): boolean {
  if (typeof (body as { redirect?: unknown }).redirect === "string") {
    return (body as { redirect?: string }).redirect !== "false";
  }
  const accept = req.headers.get("accept") ?? "";
  return accept.includes("text/html") && !accept.includes("application/json");
}

export async function POST(req: NextRequest) {
  const body = await readBody(req);

  const formData = new FormData();
  if (typeof body.tier === "string") {
    formData.set("tier", body.tier);
  }
  if (typeof body.interval === "string") {
    formData.set("interval", body.interval);
  }

  const result = await runCheckoutSession(formData);

  if (!result.ok) {
    const status =
      result.error.includes("session expired") ||
      result.error.includes("Sign in again")
        ? 401
        : result.error.includes("not configured") ||
            result.error.includes("not available")
          ? 503
          : 400;
    if (wantsRedirect(req, body)) {
      const upgrade = new URL("/upgrade", req.url);
      upgrade.searchParams.set("checkout", "error");
      return NextResponse.redirect(upgrade, { status: 303 });
    }
    return NextResponse.json({ error: result.error }, { status });
  }

  if (wantsRedirect(req, body)) {
    return NextResponse.redirect(result.url, { status: 303 });
  }

  return NextResponse.json({ url: result.url });
}
