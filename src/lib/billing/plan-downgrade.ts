import "server-only";

import type Stripe from "stripe";

import { checkoutErrorMessage } from "@/lib/billing/checkout-session";
import { isDowngrade, parsePlanType, type PlanType } from "@/lib/plan";
import { STRIPE_PRICE_ENV_KEYS, TIER_IDS } from "@/lib/pricing";
import {
  getStripe,
  getStripePriceId,
  getTierForPriceId,
  isPaidTier,
  type CheckoutInterval,
  type PaidTier,
} from "@/lib/stripe";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ScheduleDowngradeResult =
  | { ok: true; effectiveAt: string; pendingPlan: PlanType }
  | { ok: false; error: string };

function inferIntervalFromPriceId(priceId: string): CheckoutInterval | null {
  const monthly = [
    process.env[STRIPE_PRICE_ENV_KEYS.proMonthly],
    process.env[STRIPE_PRICE_ENV_KEYS.aiChefMonthly],
  ]
    .filter(Boolean)
    .map((id) => id!.trim());
  const yearly = [
    process.env[STRIPE_PRICE_ENV_KEYS.proYearly],
    process.env[STRIPE_PRICE_ENV_KEYS.aiChefYearly],
  ]
    .filter(Boolean)
    .map((id) => id!.trim());

  const trimmed = priceId.trim();
  if (monthly.includes(trimmed)) {
    return "monthly";
  }
  if (yearly.includes(trimmed)) {
    return "yearly";
  }
  return null;
}

function periodEndIso(subscription: Stripe.Subscription): string | null {
  const end = subscription.items.data[0]?.current_period_end;
  if (typeof end !== "number" || !Number.isFinite(end)) {
    return null;
  }
  return new Date(end * 1000).toISOString();
}

async function persistPendingPlanChange(
  userId: string,
  pendingPlan: PlanType,
  effectiveAt: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) {
    return {
      ok: false,
      error: "Could not save scheduled downgrade.",
    };
  }
  const { error } = await supabase
    .from("profiles")
    .update({
      pending_plan_type: pendingPlan,
      plan_change_effective_at: effectiveAt,
    })
    .eq("id", userId);
  if (error) {
    return { ok: false, error: "Could not save scheduled downgrade." };
  }
  return { ok: true };
}

async function scheduleCancelAtPeriodEnd(
  stripe: Stripe,
  subscriptionId: string,
  userId: string,
): Promise<ScheduleDowngradeResult> {
  let subscription: Stripe.Subscription;
  try {
    subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
      metadata: {
        pending_downgrade_plan: TIER_IDS.free,
        supabase_user_id: userId,
      },
    });
  } catch (err) {
    return {
      ok: false,
      error: checkoutErrorMessage(
        err,
        "Could not schedule subscription cancellation.",
      ),
    };
  }

  const effectiveAt = periodEndIso(subscription);
  if (!effectiveAt) {
    return {
      ok: false,
      error: "Could not determine when your billing period ends.",
    };
  }

  const saved = await persistPendingPlanChange(userId, TIER_IDS.free, effectiveAt);
  if (!saved.ok) {
    return { ok: false, error: saved.error ?? "Could not save scheduled downgrade." };
  }

  return { ok: true, effectiveAt, pendingPlan: TIER_IDS.free };
}

async function schedulePaidTierDowngrade(
  stripe: Stripe,
  subscription: Stripe.Subscription,
  userId: string,
  targetPlan: PaidTier,
): Promise<ScheduleDowngradeResult> {
  const currentPriceId = subscription.items.data[0]?.price?.id;
  if (!currentPriceId) {
    return { ok: false, error: "Subscription has no billable price." };
  }

  const interval = inferIntervalFromPriceId(currentPriceId);
  if (!interval) {
    return {
      ok: false,
      error: "Could not match your subscription billing interval.",
    };
  }

  const nextPriceId = getStripePriceId(targetPlan, interval);
  if (!nextPriceId) {
    return {
      ok: false,
      error: "Downgrade pricing is not configured on the server.",
    };
  }

  const effectiveAt = periodEndIso(subscription);
  if (!effectiveAt) {
    return {
      ok: false,
      error: "Could not determine when your billing period ends.",
    };
  }

  const periodStart = subscription.items.data[0]?.current_period_start;
  const periodEnd = subscription.items.data[0]?.current_period_end;

  if (
    typeof periodStart !== "number" ||
    typeof periodEnd !== "number" ||
    !Number.isFinite(periodStart) ||
    !Number.isFinite(periodEnd)
  ) {
    return {
      ok: false,
      error: "Subscription billing period is unavailable.",
    };
  }

  try {
    const existingScheduleId =
      typeof subscription.schedule === "string"
        ? subscription.schedule
        : subscription.schedule?.id;

    if (existingScheduleId) {
      await stripe.subscriptionSchedules.update(existingScheduleId, {
        end_behavior: "release",
        phases: [
          {
            items: [{ price: currentPriceId, quantity: 1 }],
            start_date: periodStart,
            end_date: periodEnd,
          },
          {
            items: [{ price: nextPriceId, quantity: 1 }],
            start_date: periodEnd,
          },
        ],
        metadata: {
          pending_downgrade_plan: targetPlan,
          supabase_user_id: userId,
        },
      });
    } else {
      const schedule = await stripe.subscriptionSchedules.create({
        from_subscription: subscription.id,
      });
      await stripe.subscriptionSchedules.update(schedule.id, {
        end_behavior: "release",
        phases: [
          {
            items: [{ price: currentPriceId, quantity: 1 }],
            start_date: periodStart,
            end_date: periodEnd,
          },
          {
            items: [{ price: nextPriceId, quantity: 1 }],
            start_date: periodEnd,
          },
        ],
        metadata: {
          pending_downgrade_plan: targetPlan,
          supabase_user_id: userId,
        },
      });
    }

    await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: false,
      metadata: {
        pending_downgrade_plan: targetPlan,
        supabase_user_id: userId,
      },
    });
  } catch (err) {
    return {
      ok: false,
      error: checkoutErrorMessage(
        err,
        "Could not schedule plan change at period end.",
      ),
    };
  }

  const saved = await persistPendingPlanChange(userId, targetPlan, effectiveAt);
  if (!saved.ok) {
    return { ok: false, error: saved.error ?? "Could not save scheduled downgrade." };
  }

  return { ok: true, effectiveAt, pendingPlan: targetPlan };
}

/**
 * Schedule a downgrade to take effect at the end of the current Stripe billing period.
 * Keeps the current plan active until then; persists pending state on the profile.
 */
export async function runSchedulePlanDowngrade(
  targetPlanRaw: unknown,
): Promise<ScheduleDowngradeResult> {
  const targetPlan = parsePlanType(
    typeof targetPlanRaw === "string" ? targetPlanRaw.trim().toLowerCase() : null,
  );
  if (!targetPlan || targetPlan === "ai_chef") {
    return { ok: false, error: "Choose Pro or cancel your subscription." };
  }

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
      error: "Your session expired. Sign in again, then try scheduling the change.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan_type,stripe_subscription_id,pending_plan_type")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false,
      error: "Could not load your billing profile. Try again in a moment.",
    };
  }

  const currentPlan = parsePlanType(profile?.plan_type) ?? TIER_IDS.free;
  if (currentPlan === TIER_IDS.free) {
    return { ok: false, error: "You do not have an active subscription to change." };
  }

  if (!isDowngrade(currentPlan, targetPlan)) {
    return {
      ok: false,
      error: "That is not a lower plan than your current subscription.",
    };
  }

  if (profile?.pending_plan_type) {
    return {
      ok: false,
      error: "A plan change is already scheduled. It takes effect at the end of your billing period.",
    };
  }

  const subscriptionId = profile?.stripe_subscription_id;
  if (!subscriptionId) {
    return {
      ok: false,
      error: "No active subscription found. Use Manage billing on your profile or contact support.",
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

  let subscription: Stripe.Subscription;
  try {
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
  } catch (err) {
    return {
      ok: false,
      error: checkoutErrorMessage(err, "Could not load your subscription."),
    };
  }

  if (subscription.status !== "active" && subscription.status !== "trialing") {
    return {
      ok: false,
      error: "Your subscription is not active. Manage billing from your profile.",
    };
  }

  const liveTier = (() => {
    const meta = subscription.metadata?.plan;
    if (typeof meta === "string" && isPaidTier(meta)) {
      return meta;
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
    return currentPlan;
  })();

  if (!isDowngrade(liveTier, targetPlan)) {
    return {
      ok: false,
      error: "That is not a lower plan than your current subscription.",
    };
  }

  if (targetPlan === TIER_IDS.free) {
    return scheduleCancelAtPeriodEnd(stripe, subscriptionId, user.id);
  }

  if (targetPlan === TIER_IDS.pro) {
    return schedulePaidTierDowngrade(stripe, subscription, user.id, TIER_IDS.pro);
  }

  return { ok: false, error: "Unsupported downgrade target." };
}
