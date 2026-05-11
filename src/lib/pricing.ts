/**
 * Central product tiers and prices for UI and Stripe (amounts in USD cents).
 */

export const TIER_IDS = {
  free: "free",
  pro: "pro",
  ai_chef: "ai_chef",
} as const;

export type TierId = (typeof TIER_IDS)[keyof typeof TIER_IDS];

/** Stripe Dashboard Price IDs — set in env (see `.env.example`). */
export const STRIPE_PRICE_ENV_KEYS = {
  proMonthly: "STRIPE_PRICE_PRO_MONTHLY",
  proYearly: "STRIPE_PRICE_PRO_YEARLY",
  aiChefMonthly: "STRIPE_PRICE_AI_CHEF_MONTHLY",
  aiChefYearly: "STRIPE_PRICE_AI_CHEF_YEARLY",
} as const;

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatUsdFromCents(cents: number): string {
  return usd.format(cents / 100);
}

/** Per-tier amounts in USD cents (Stripe unit_amount). */
export const STRIPE_CENTS = {
  pro: { monthly: 399, yearly: 3600 },
  ai_chef: { monthly: 599, yearly: 4900 },
} as const;

export const PRICING = {
  pro: {
    monthlyCents: STRIPE_CENTS.pro.monthly,
    yearlyCents: STRIPE_CENTS.pro.yearly,
    monthlyDisplay: formatUsdFromCents(STRIPE_CENTS.pro.monthly),
    yearlyDisplay: formatUsdFromCents(STRIPE_CENTS.pro.yearly),
    monthlyLabel: `${formatUsdFromCents(STRIPE_CENTS.pro.monthly)}/mo`,
    yearlyLabel: `${formatUsdFromCents(STRIPE_CENTS.pro.yearly)}/yr`,
  },
  ai_chef: {
    monthlyCents: STRIPE_CENTS.ai_chef.monthly,
    yearlyCents: STRIPE_CENTS.ai_chef.yearly,
    monthlyDisplay: formatUsdFromCents(STRIPE_CENTS.ai_chef.monthly),
    yearlyDisplay: formatUsdFromCents(STRIPE_CENTS.ai_chef.yearly),
    monthlyLabel: `${formatUsdFromCents(STRIPE_CENTS.ai_chef.monthly)}/mo`,
    yearlyLabel: `${formatUsdFromCents(STRIPE_CENTS.ai_chef.yearly)}/yr`,
  },
} as const;
