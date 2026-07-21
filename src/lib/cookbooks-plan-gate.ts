import { isProOrAbove, type PlanType } from "@/lib/plan";

/** Stable message returned by cookbook server actions when plan is insufficient (compare on client for localized display). */
export const COOKBOOK_PLAN_REQUIRED_ERROR =
  "Cookbook links require a Pro or AI Chef plan.";

/** Only Pro and AI Chef may publish cookbook affiliate links on profile, chef page, and recipes. */
export function canSellCookbooks(plan: PlanType): boolean {
  return isProOrAbove(plan);
}
