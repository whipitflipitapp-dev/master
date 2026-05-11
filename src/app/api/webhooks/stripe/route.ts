import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { TIER_IDS, type TierId } from "@/lib/pricing";
import {
  getStripe,
  getTierForPriceId,
  isPaidTier,
  type PaidTier,
} from "@/lib/stripe";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfilePatch = {
  plan_type?: TierId;
  stripe_customer_id?: string;
  stripe_subscription_id?: string | null;
};

function pickTierFromSubscription(
  subscription: Stripe.Subscription,
): PaidTier | null {
  const metaPlan = subscription.metadata?.plan;
  if (typeof metaPlan === "string" && isPaidTier(metaPlan)) {
    return metaPlan;
  }
  for (const item of subscription.items.data) {
    const priceId = item.price?.id;
    if (priceId) {
      const tier = getTierForPriceId(priceId);
      if (tier) {
        return tier;
      }
    }
  }
  return null;
}

function isActiveSubscriptionStatus(status: Stripe.Subscription.Status): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}

async function findUserIdByCustomerId(
  customerId: string,
): Promise<string | null> {
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) {
    return null;
  }
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

async function applyProfilePatch(
  userId: string,
  patch: ProfilePatch,
): Promise<{ ok: boolean; error?: string }> {
  if (Object.keys(patch).length === 0) {
    return { ok: true };
  }
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) {
    return {
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY is not configured.",
    };
  }
  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

async function handleCheckoutCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
): Promise<{ ok: boolean; error?: string }> {
  // We only care about subscription-mode sessions.
  if (session.mode !== "subscription") {
    return { ok: true };
  }

  const userId =
    (typeof session.client_reference_id === "string"
      ? session.client_reference_id
      : null) ??
    (typeof session.metadata?.supabase_user_id === "string"
      ? session.metadata.supabase_user_id
      : null);

  if (!userId) {
    return { ok: false, error: "Checkout session missing supabase user id." };
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : (session.customer?.id ?? null);

  let tier: PaidTier | null = null;
  const metaPlan = session.metadata?.plan;
  if (typeof metaPlan === "string" && isPaidTier(metaPlan)) {
    tier = metaPlan;
  }

  let subscriptionId: string | null = null;
  if (typeof session.subscription === "string") {
    subscriptionId = session.subscription;
  } else if (session.subscription && "id" in session.subscription) {
    subscriptionId = session.subscription.id;
  }

  // If we still don't know the tier, fetch the subscription and read prices.
  if (!tier && subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      tier = pickTierFromSubscription(sub);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load subscription.";
      return { ok: false, error: message };
    }
  }

  const patch: ProfilePatch = {};
  if (tier) {
    patch.plan_type = tier;
  }
  if (customerId) {
    patch.stripe_customer_id = customerId;
  }
  if (subscriptionId) {
    patch.stripe_subscription_id = subscriptionId;
  }

  return applyProfilePatch(userId, patch);
}

async function handleSubscriptionUpserted(
  subscription: Stripe.Subscription,
): Promise<{ ok: boolean; error?: string }> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : (subscription.customer?.id ?? null);

  const userId =
    (typeof subscription.metadata?.supabase_user_id === "string"
      ? subscription.metadata.supabase_user_id
      : null) ?? (customerId ? await findUserIdByCustomerId(customerId) : null);

  if (!userId) {
    return {
      ok: false,
      error: "Subscription event has no resolvable supabase user.",
    };
  }

  const patch: ProfilePatch = {};
  if (customerId) {
    patch.stripe_customer_id = customerId;
  }

  if (isActiveSubscriptionStatus(subscription.status)) {
    const tier = pickTierFromSubscription(subscription);
    if (tier) {
      patch.plan_type = tier;
    }
    patch.stripe_subscription_id = subscription.id;
  } else {
    // canceled, unpaid, incomplete*, paused → drop to free.
    patch.plan_type = TIER_IDS.free;
    patch.stripe_subscription_id = null;
  }

  return applyProfilePatch(userId, patch);
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<{ ok: boolean; error?: string }> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : (subscription.customer?.id ?? null);

  const userId =
    (typeof subscription.metadata?.supabase_user_id === "string"
      ? subscription.metadata.supabase_user_id
      : null) ?? (customerId ? await findUserIdByCustomerId(customerId) : null);

  if (!userId) {
    return {
      ok: false,
      error: "Cancelled subscription has no resolvable supabase user.",
    };
  }

  return applyProfilePatch(userId, {
    plan_type: TIER_IDS.free,
    stripe_subscription_id: null,
  });
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new NextResponse("Webhook secret not configured.", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new NextResponse("Missing Stripe-Signature header.", { status: 400 });
  }

  // Stripe verifies the *raw* request body — do NOT parse JSON first.
  const payload = await req.text();

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Stripe is not configured.";
    return new NextResponse(message, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Invalid Stripe signature.";
    return new NextResponse(`Webhook signature verification failed: ${message}`, {
      status: 400,
    });
  }

  let result: { ok: boolean; error?: string } = { ok: true };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        result = await handleCheckoutCompleted(
          stripe,
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        result = await handleSubscriptionUpserted(
          event.data.object as Stripe.Subscription,
        );
        break;
      }
      case "customer.subscription.deleted": {
        result = await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      }
      default: {
        // Ignore other event types — Stripe will keep redelivering until 2xx.
        break;
      }
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unhandled webhook error.";
    return new NextResponse(`Webhook handler error: ${message}`, {
      status: 500,
    });
  }

  if (!result.ok) {
    // Returning 500 lets Stripe retry the delivery.
    return new NextResponse(
      `Webhook processing failed: ${result.error ?? "unknown error"}`,
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
