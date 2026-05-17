import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { logServerError } from "@/lib/server-error";
import { getStripe, resolveSiteUrl } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function wantsRedirect(req: NextRequest): boolean {
  const accept = req.headers.get("accept") ?? "";
  return accept.includes("text/html") && !accept.includes("application/json");
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to open the billing portal." },
      { status: 401 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    return NextResponse.json(
      { error: "No Stripe customer linked to this account yet." },
      { status: 400 },
    );
  }

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    logServerError("billing_portal.stripe_config", err);
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 503 },
    );
  }

  let session: Stripe.BillingPortal.Session;
  try {
    session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${resolveSiteUrl()}/profile`,
    });
  } catch (err) {
    logServerError("billing_portal.session_create", err);
    return NextResponse.json(
      { error: "Failed to open billing portal." },
      { status: 502 },
    );
  }

  if (wantsRedirect(req)) {
    return NextResponse.redirect(session.url, { status: 303 });
  }

  return NextResponse.json({ url: session.url });
}
