import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { TIER_IDS } from "@/lib/pricing";
import {
  describeTierPrice,
  getStripe,
  getStripePriceId,
  isCheckoutInterval,
  isPaidTier,
  resolveSiteUrl,
  type CheckoutInterval,
  type PaidTier,
} from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logCheckoutStarted } from "@/lib/telemetry";

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
  // FormData (e.g. <form action="/api/checkout" method="post">) and
  // application/x-www-form-urlencoded both round-trip through formData().
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
  // HTML form submissions get a 303 to the Stripe Checkout URL; XHR/fetch
  // callers receive JSON so they can handle errors inline.
  return accept.includes("text/html") && !accept.includes("application/json");
}

export async function POST(req: NextRequest) {
  const body = await readBody(req);

  const tierRaw =
    typeof body.tier === "string" ? body.tier.trim().toLowerCase() : "";
  const intervalRaw =
    typeof body.interval === "string" ? body.interval.trim().toLowerCase() : "";

  if (!isPaidTier(tierRaw)) {
    return NextResponse.json(
      { error: "Invalid tier. Use 'pro' or 'ai_chef'." },
      { status: 400 },
    );
  }
  if (!isCheckoutInterval(intervalRaw)) {
    return NextResponse.json(
      { error: "Invalid interval. Use 'monthly' or 'yearly'." },
      { status: 400 },
    );
  }

  const tier: PaidTier = tierRaw;
  const interval: CheckoutInterval = intervalRaw;

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json(
      { error: "You must be signed in to start checkout." },
      { status: 401 },
    );
  }

  const priceId = getStripePriceId(tier, interval);
  if (!priceId) {
    return NextResponse.json(
      { error: "Pricing for that tier is not configured yet." },
      { status: 503 },
    );
  }

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Stripe is not configured.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id,display_name")
    .eq("id", user.id)
    .maybeSingle();

  const existingCustomerId = profile?.stripe_customer_id ?? null;
  const siteUrl = resolveSiteUrl();
  const priceSnapshot = describeTierPrice(tier, interval);

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // Reuse an existing Stripe Customer when we already linked one via the
      // webhook; otherwise prefill the email and let Stripe create one.
      ...(existingCustomerId
        ? { customer: existingCustomerId }
        : user.email
          ? { customer_email: user.email }
          : {}),
      client_reference_id: user.id,
      // Both subscription_data.metadata (carried on the Subscription) and
      // top-level metadata (Checkout Session) so the webhook can fall back
      // either way.
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan: tier,
          interval,
        },
      },
      metadata: {
        supabase_user_id: user.id,
        plan: tier,
        interval,
        price_label: priceSnapshot.label,
      },
      allow_promotion_codes: true,
      automatic_tax: { enabled: false },
      success_url: `${siteUrl}/profile?checkout=success&tier=${tier}`,
      cancel_url: `${siteUrl}/upgrade?checkout=cancelled`,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create checkout session.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL." },
      { status: 502 },
    );
  }

  await logCheckoutStarted(supabase, tier, interval);

  if (wantsRedirect(req, body)) {
    return NextResponse.redirect(session.url, { status: 303 });
  }

  return NextResponse.json({ url: session.url, id: session.id });
}
