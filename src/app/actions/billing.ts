"use server";

import { redirect } from "next/navigation";
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
import { logCheckoutStarted } from "@/lib/telemetry";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CheckoutFailure = { ok: false; error: string };
export type CheckoutSessionState = CheckoutFailure | { ok: true; url: string };

function checkoutErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return fallback;
}

function isMissingStripeCustomer(err: unknown): boolean {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: string }).code;
    if (code === "resource_missing") {
      return true;
    }
  }
  return (
    err instanceof Error && /no such customer/i.test(err.message)
  );
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

async function runCreateCheckoutSession(
  formData: FormData,
): Promise<CheckoutSessionState> {
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

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return {
      ok: false,
      error: "Could not verify your session. Refresh the page and try again.",
    };
  }
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
      error: "This plan is not available yet — pricing is still being set up.",
    };
  }

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    return {
      ok: false,
      error: checkoutErrorMessage(err, "Stripe is not configured."),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
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
    return {
      ok: false,
      error: checkoutErrorMessage(
        err,
        "Could not start checkout. Try again in a moment.",
      ),
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
}

/**
 * Create a Stripe Checkout Session for the signed-in user.
 *
 * Bound to `useActionState` on `/upgrade` (prevState, formData). Returns
 * `{ ok: true, url }` for client navigation — never call `redirect()` here.
 */
export async function createCheckoutSession(
  _prev: CheckoutSessionState | undefined,
  formData: FormData,
): Promise<CheckoutSessionState> {
  try {
    return await runCreateCheckoutSession(formData);
  } catch (err) {
    return {
      ok: false,
      error: checkoutErrorMessage(
        err,
        "Something went wrong starting checkout. Try again.",
      ),
    };
  }
}

/**
 * Open the Stripe Customer Portal for the signed-in user.
 *
 * Used as a `<form action={openBillingPortal}>` handler. Returns
 * `{ ok: false, error }` when no Stripe customer is linked yet (e.g. user
 * never completed checkout) so the UI can prompt the user to upgrade first.
 */
export async function openBillingPortal(): Promise<CheckoutFailure | undefined> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/profile")}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    return {
      ok: false,
      error: "No billing customer linked yet. Start a subscription first.",
    };
  }

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Stripe is not configured.",
    };
  }

  let portal: Stripe.BillingPortal.Session;
  try {
    portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${resolveSiteUrl()}/profile`,
    });
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Could not open the billing portal.",
    };
  }

  redirect(portal.url);
}
