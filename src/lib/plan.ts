/** Matches `profiles.plan_type` check constraint in Supabase migrations. */
export type PlanType = "free" | "pro" | "ai_chef";

const PLAN_ORDER: Record<PlanType, number> = {
  free: 0,
  pro: 1,
  ai_chef: 2,
};

export function parsePlanType(value: unknown): PlanType | null {
  if (typeof value !== "string") {
    return null;
  }
  const v = value.trim();
  if (v === "free" || v === "pro" || v === "ai_chef") {
    return v;
  }
  return null;
}

export function planTypeBadgeLabel(plan: PlanType): string {
  switch (plan) {
    case "free":
      return "Free";
    case "pro":
      return "Pro";
    case "ai_chef":
      return "AI Chef";
  }
}

export function isProOrAbove(plan: PlanType): boolean {
  return PLAN_ORDER[plan] >= PLAN_ORDER.pro;
}

/** Wine pairings (and other Pro-tier extras): Pro and AI Chef both qualify. */
export function winePairingsUnlockedForPlan(plan: PlanType): boolean {
  return isProOrAbove(plan);
}

export function isAiChef(plan: PlanType): boolean {
  return plan === "ai_chef";
}

export function hasTier(plan: PlanType, minimum: PlanType): boolean {
  return PLAN_ORDER[plan] >= PLAN_ORDER[minimum];
}
