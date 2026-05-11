import Stripe from "stripe";

import {
  PRICING,
  STRIPE_PRICE_ENV_KEYS,
  TIER_IDS,
  type TierId,
} from "@/lib/pricing";

/**
 * Stripe API version pinned to the SDK shipped in package.json (stripe@22.1.1).
 * Bump together with the SDK so generated types stay in sync.
 */
export const STRIPE_API_VERSION = "2026-04-22.dahlia" as const;

export type CheckoutInterval = "monthly" | "yearly";
export type PaidTier = Exclude<TierId, typeof TIER_IDS.free>;

let cached: Stripe | null = null;

/**
 * Lazily-created server-only Stripe client. Throws when STRIPE_SECRET_KEY is
 * missing so callers (route handlers / server actions) fail loudly during
 * configuration rather than silently no-op.
 */
export function getStripe(): Stripe {
  if (cached) {
    return cached;
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to your environment to enable billing.",
    );
  }

  cached = new Stripe(secret, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
    appInfo: {
      name: "Whip It Flip It",
      version: "0.1.0",
    },
  });

  return cached;
}

/** Available paid tiers, in display order. */
export const PAID_TIERS: ReadonlyArray<PaidTier> = [
  TIER_IDS.pro,
  TIER_IDS.ai_chef,
] as const;

export function isPaidTier(value: unknown): value is PaidTier {
  return value === TIER_IDS.pro || value === TIER_IDS.ai_chef;
}

export function isCheckoutInterval(value: unknown): value is CheckoutInterval {
  return value === "monthly" || value === "yearly";
}

/**
 * Resolve the env Price ID for a tier + interval. Returns null when the env
 * var is missing so callers can return a 400 instead of leaking config errors.
 */
export function getStripePriceId(
  tier: PaidTier,
  interval: CheckoutInterval,
): string | null {
  let envKey: string;
  if (tier === TIER_IDS.pro) {
    envKey =
      interval === "monthly"
        ? STRIPE_PRICE_ENV_KEYS.proMonthly
        : STRIPE_PRICE_ENV_KEYS.proYearly;
  } else {
    envKey =
      interval === "monthly"
        ? STRIPE_PRICE_ENV_KEYS.aiChefMonthly
        : STRIPE_PRICE_ENV_KEYS.aiChefYearly;
  }

  const value = process.env[envKey];
  return value && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Reverse-map a Stripe Price ID → app tier. Used by the webhook to pick a tier
 * when subscription items don't carry our `plan` metadata.
 */
export function getTierForPriceId(priceId: string): PaidTier | null {
  const trimmed = priceId.trim();
  if (!trimmed) {
    return null;
  }

  const proIds = [
    process.env[STRIPE_PRICE_ENV_KEYS.proMonthly],
    process.env[STRIPE_PRICE_ENV_KEYS.proYearly],
  ];
  if (proIds.includes(trimmed)) {
    return TIER_IDS.pro;
  }

  const chefIds = [
    process.env[STRIPE_PRICE_ENV_KEYS.aiChefMonthly],
    process.env[STRIPE_PRICE_ENV_KEYS.aiChefYearly],
  ];
  if (chefIds.includes(trimmed)) {
    return TIER_IDS.ai_chef;
  }

  return null;
}

/** Resolve the public site URL for Stripe success/cancel redirects. */
export function resolveSiteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "";
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

/**
 * Display-only price snapshot — kept here so server callers (logs, emails)
 * can describe what the user is buying without re-importing pricing.ts.
 */
export function describeTierPrice(
  tier: PaidTier,
  interval: CheckoutInterval,
): { cents: number; label: string } {
  const block = tier === TIER_IDS.pro ? PRICING.pro : PRICING.ai_chef;
  if (interval === "monthly") {
    return { cents: block.monthlyCents, label: block.monthlyLabel };
  }
  return { cents: block.yearlyCents, label: block.yearlyLabel };
}
