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

/**
 * Create a Stripe Checkout Session for the signed-in user.
 *
 * Used with `useActionState` on `/upgrade`. Returns `{ ok: true, url }` so the
 * client can navigate to Stripe (server `redirect()` inside action state handlers
 * surfaces as an error boundary instead of leaving the page).
 */
export async function createCheckoutSession(
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

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
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
      error: err instanceof Error ? err.message : "Stripe is not configured.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
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
    });
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Could not start checkout. Try again in a moment.",
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
