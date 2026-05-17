import "server-only";

import type Stripe from "stripe";

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
import { logServerError } from "@/lib/server-error";
import { logCheckoutStarted } from "@/lib/telemetry";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CheckoutSessionResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export function checkoutErrorMessage(err: unknown, fallback: string): string {
  // Provider errors can contain request details or IDs. Keep client-facing
  // responses generic and only map known internal config errors explicitly.
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (
      typeof msg === "string" &&
      msg.startsWith("STRIPE_SECRET_KEY is not set.")
    ) {
      return "Stripe is not configured on the server.";
    }
  }
  return fallback;
}

/** Returns a user-facing error when required billing env is missing. */
export function validateCheckoutEnvironment(): string | null {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return "Checkout is temporarily unavailable.";
  }

  const siteUrl = resolveSiteUrl();
  if (
    process.env.NODE_ENV === "production" &&
    /^https?:\/\/localhost(:\d+)?$/i.test(siteUrl)
  ) {
    return "Checkout is temporarily unavailable.";
  }

  return null;
}

/** Maps checkout failure copy to an HTTP status for `/api/checkout`. */
export function checkoutFailureHttpStatus(error: string): number {
  const lower = error.toLowerCase();
  if (lower.includes("sign in") || lower.includes("session expired")) {
    return 401;
  }
  if (
    lower.includes("not configured") ||
    lower.includes("not available yet") ||
    lower.includes("pricing is still being set up")
  ) {
    return 503;
  }
  return 400;
}

function isMissingStripeCustomer(err: unknown): boolean {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: string }).code;
    if (code === "resource_missing") {
      return true;
    }
  }
  return err instanceof Error && /no such customer/i.test(err.message);
}

function buildCheckoutSessionParams(
  tier: PaidTier,
  interval: CheckoutInterval,
  user: { id: string; email?: string | null },
  priceId: string,
  existingCustomerId: string | null,
): Stripe.Checkout.SessionCreateParams {
  const siteUrl = resolveSiteUrl();
  const priceSnapshot = describeTierPrice(tier, interval);

  return {
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    ...(existingCustomerId
      ? { customer: existingCustomerId }
      : user.email
        ? { customer_email: user.email }
        : {}),
    client_reference_id: user.id,
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
  };
}

async function createStripeCheckoutSession(
  stripe: Stripe,
  params: Stripe.Checkout.SessionCreateParams,
  user: { id: string; email?: string | null },
  tier: PaidTier,
  interval: CheckoutInterval,
  priceId: string,
  existingCustomerId: string | null,
): Promise<Stripe.Checkout.Session> {
  try {
    return await stripe.checkout.sessions.create(params);
  } catch (err) {
    if (!existingCustomerId || !isMissingStripeCustomer(err)) {
      throw err;
    }
    const fallbackParams = buildCheckoutSessionParams(
      tier,
      interval,
      user,
      priceId,
      null,
    );
    return await stripe.checkout.sessions.create(fallbackParams);
  }
}

/**
 * Shared Stripe Checkout Session creation for server actions and `/api/checkout`.
 * Always returns a plain JSON-serializable result — never throws.
 */
export async function runCheckoutSession(
  formData: FormData,
): Promise<CheckoutSessionResult> {
  try {
    const envError = validateCheckoutEnvironment();
    if (envError) {
      return { ok: false, error: envError };
    }

    const tierRaw = String(formData.get("tier") ?? "")
      .trim()
      .toLowerCase();
    const intervalRaw = String(formData.get("interval") ?? "")
      .trim()
      .toLowerCase();

    if (!isPaidTier(tierRaw)) {
      return { ok: false, error: "Choose Pro or AI Chef." };
    }
    if (!isCheckoutInterval(intervalRaw)) {
      return { ok: false, error: "Choose monthly or yearly billing." };
    }

    const tier: PaidTier = tierRaw;
    const interval: CheckoutInterval = intervalRaw;

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return { ok: false, error: "Supabase is not configured." };
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return {
        ok: false,
        error: "Your session expired. Sign in again, then continue to checkout.",
      };
    }

    const priceId = getStripePriceId(tier, interval);
    if (!priceId) {
      return {
        ok: false,
        error:
          "Stripe pricing is still being set up. Try again later.",
      };
    }

    let stripe: Stripe;
    try {
      stripe = getStripe();
    } catch (err) {
      logServerError("checkout.stripe_config", err);
      return {
        ok: false,
        error: "Checkout is temporarily unavailable.",
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      logServerError("checkout.profile_lookup", profileError);
      return {
        ok: false,
        error: "Could not load your billing profile. Try again in a moment.",
      };
    }

    const existingCustomerId = profile?.stripe_customer_id ?? null;
    const sessionParams = buildCheckoutSessionParams(
      tier,
      interval,
      user,
      priceId,
      existingCustomerId,
    );

    let session: Stripe.Checkout.Session;
    try {
      session = await createStripeCheckoutSession(
        stripe,
        sessionParams,
        user,
        tier,
        interval,
        priceId,
        existingCustomerId,
      );
    } catch (err) {
      logServerError("checkout.session_create", err);
      return {
        ok: false,
        error: "Could not start checkout. Try again in a moment.",
      };
    }

    if (!session.url) {
      return { ok: false, error: "Stripe did not return a checkout URL." };
    }

    try {
      await logCheckoutStarted(supabase, tier, interval);
    } catch {
      // Checkout must succeed even if telemetry insert fails.
    }

    return { ok: true, url: session.url };
  } catch (err) {
    logServerError("checkout.unhandled", err);
    return {
      ok: false,
      error: "Something went wrong starting checkout. Try again.",
    };
  }
}
