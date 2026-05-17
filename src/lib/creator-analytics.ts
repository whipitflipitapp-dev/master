export type CreatorAnalyticsTopRecipe = {
  id: string;
  title: string;
  views: number;
  viewsSince: number;
  saves: number;
  affiliateClicksSince: number;
};

export type CreatorAnalyticsDay = {
  day: string;
  views: number;
};

export type CreatorAnalyticsLocked = {
  locked: true;
  planType: "free" | "pro" | "ai_chef";
};

export type CreatorAnalyticsUnlocked = {
  locked: false;
  planType: "pro" | "ai_chef";
  since: string;
  publishedCount: number;
  totalViews: number;
  viewsSince: number;
  savesTotal: number;
  affiliateClicksSince: number;
  cookbookClicksSince: number;
  topRecipes: CreatorAnalyticsTopRecipe[];
  viewsByDay: CreatorAnalyticsDay[];
};

export type CreatorAnalyticsOverview =
  | CreatorAnalyticsLocked
  | CreatorAnalyticsUnlocked;

function finiteNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function parseTopRecipe(row: unknown): CreatorAnalyticsTopRecipe | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.title !== "string") return null;
  return {
    id: r.id,
    title: r.title,
    views: finiteNumber(r.views),
    viewsSince: finiteNumber(r.views_since),
    saves: finiteNumber(r.saves),
    affiliateClicksSince: finiteNumber(r.affiliate_clicks_since),
  };
}

function parseViewsByDay(row: unknown): CreatorAnalyticsDay | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  if (typeof r.day !== "string") return null;
  return {
    day: r.day,
    views: finiteNumber(r.views),
  };
}

export function parseCreatorAnalyticsOverview(
  raw: unknown,
): CreatorAnalyticsOverview | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const rawPlan = r.plan_type;
  const planType =
    rawPlan === "pro" || rawPlan === "ai_chef" || rawPlan === "free"
      ? rawPlan
      : "free";

  if (r.locked === true) {
    return { locked: true, planType };
  }

  if (planType === "free") {
    return { locked: true, planType };
  }

  return {
    locked: false,
    planType,
    since: typeof r.since === "string" ? r.since : "",
    publishedCount: finiteNumber(r.published_count),
    totalViews: finiteNumber(r.total_views),
    viewsSince: finiteNumber(r.views_since),
    savesTotal: finiteNumber(r.saves_total),
    affiliateClicksSince: finiteNumber(r.affiliate_clicks_since),
    cookbookClicksSince: finiteNumber(r.cookbook_clicks_since),
    topRecipes: Array.isArray(r.top_recipes)
      ? r.top_recipes
          .map(parseTopRecipe)
          .filter((x): x is CreatorAnalyticsTopRecipe => x != null)
      : [],
    viewsByDay: Array.isArray(r.views_by_day)
      ? r.views_by_day
          .map(parseViewsByDay)
          .filter((x): x is CreatorAnalyticsDay => x != null)
      : [],
  };
}
