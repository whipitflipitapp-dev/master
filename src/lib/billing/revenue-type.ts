import { STRIPE_PRICE_ENV_KEYS, TIER_IDS } from "@/lib/pricing";
import { getTierForPriceId } from "@/lib/stripe";

export type AdminRevenueTypeKey =
  | "pro_monthly"
  | "pro_yearly"
  | "ai_chef_monthly"
  | "ai_chef_yearly"
  | "other";

export const REVENUE_TYPE_LABELS: Record<AdminRevenueTypeKey, string> = {
  pro_monthly: "Pro · monthly subscriptions",
  pro_yearly: "Pro · yearly subscriptions",
  ai_chef_monthly: "AI Chef · monthly subscriptions",
  ai_chef_yearly: "AI Chef · yearly subscriptions",
  other: "Other Stripe prices",
};

function priceEnv(id: keyof typeof STRIPE_PRICE_ENV_KEYS): string | null {
  const v = process.env[STRIPE_PRICE_ENV_KEYS[id]]?.trim();
  return v && v.length > 0 ? v : null;
}

export function classifyRevenueTypeFromPriceId(priceId: string): AdminRevenueTypeKey {
  const id = priceId.trim();
  if (!id) return "other";
  if (id === priceEnv("proMonthly")) return "pro_monthly";
  if (id === priceEnv("proYearly")) return "pro_yearly";
  if (id === priceEnv("aiChefMonthly")) return "ai_chef_monthly";
  if (id === priceEnv("aiChefYearly")) return "ai_chef_yearly";
  if (getTierForPriceId(id) === TIER_IDS.pro) {
    return id.includes("year") ? "pro_yearly" : "pro_monthly";
  }
  if (getTierForPriceId(id) === TIER_IDS.ai_chef) {
    return id.includes("year") ? "ai_chef_yearly" : "ai_chef_monthly";
  }
  return "other";
}

/** @deprecated use classifyRevenueTypeFromPriceId */
export const classifyAdminRevenueType = classifyRevenueTypeFromPriceId;
