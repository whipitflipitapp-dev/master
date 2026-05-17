"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import type Stripe from "stripe";

import {
  checkoutErrorMessage,
  runCheckoutSession,
  type CheckoutSessionResult,
} from "@/lib/billing/checkout-session";
import { getStripe, resolveSiteUrl } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CheckoutFailure = { ok: false; error: string };
export type CheckoutSessionState = CheckoutFailure | { ok: true; url: string };

/**
 * Create a Stripe Checkout Session for the signed-in user.
 *
 * Legacy server-action entry point; `/upgrade` uses `POST /api/checkout` instead.
 * Returns `{ ok: true, url }` for client navigation — never call `redirect()` here.
 */
export async function createCheckoutSession(
  _prev: CheckoutSessionState | null,
  formData: FormData,
): Promise<CheckoutSessionState> {
  const result: CheckoutSessionResult = await runCheckoutSession(formData);
  return result;
}

/**
 * Open the Stripe Customer Portal for the signed-in user.
 *
 * Used as a `<form action={openBillingPortal}>` handler. Returns
 * `{ ok: false, error }` when no Stripe customer is linked yet (e.g. user
 * never completed checkout) so the UI can prompt the user to upgrade first.
 */
export async function openBillingPortal(): Promise<CheckoutFailure | undefined> {
  try {
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
        error: checkoutErrorMessage(err, "Stripe is not configured."),
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
        error: checkoutErrorMessage(
          err,
          "Could not open the billing portal.",
        ),
      };
    }

    if (!portal.url) {
      return {
        ok: false,
        error: "Stripe did not return a billing portal URL.",
      };
    }

    redirect(portal.url);
  } catch (err) {
    if (isRedirectError(err)) {
      throw err;
    }
    return {
      ok: false,
      error: checkoutErrorMessage(
        err,
        "Could not open the billing portal. Try again.",
      ),
    };
  }
}
