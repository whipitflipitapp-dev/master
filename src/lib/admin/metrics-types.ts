import type { Json } from "@/lib/supabase/database.types";

export type AdminEventTypeBreakdownRow = {
  event_type: string;
  count: number;
};

export type AdminDayCountRow = {
  day: string;
  count: number;
};

/** @deprecated alias */
export type AdminSignupDayRow = AdminDayCountRow;

/** Shape returned by RPC `admin_metrics_overview`; validate at runtime before use. */
export type AdminMetricsOverview = {
  profile_count: number;
  recipe_count: number;
  favorites_total: number;
  events_since_count: number;
  affiliate_clicks_since: number;
  plan_free_count: number;
  plan_pro_count: number;
  plan_ai_chef_count: number;
  stripe_customer_count: number;
  recipes_created_since: number;
  recipe_views_since: number;
  checkout_started_since: number;
  ai_events_since: number;
  instagram_reel_recipe_count: number;
  suggestions_open_count: number;
  suggestions_total_count: number;
  event_types_since: AdminEventTypeBreakdownRow[];
  ai_event_types_since: AdminEventTypeBreakdownRow[];
  user_signups_by_day: AdminDayCountRow[];
  recipes_created_by_day: AdminDayCountRow[];
  recipe_views_by_day: AdminDayCountRow[];
};

export type AdminRecentEventRow = {
  id: string;
  user_id: string | null;
  event_type: string;
  metadata: Json;
  created_at: string;
};

export type AdminAffiliateLinkTypeRow = {
  link_type: string;
  count: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseDayCountRows(raw: unknown): AdminDayCountRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRecord).map((row) => ({
    day: typeof row.day === "string" ? row.day : "",
    count:
      typeof row.count === "number" && Number.isFinite(row.count) ? row.count : 0,
  }));
}

function parseEventTypeRows(raw: unknown): AdminEventTypeBreakdownRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRecord).map((row) => ({
    event_type: typeof row.event_type === "string" ? row.event_type : "",
    count:
      typeof row.count === "number" && Number.isFinite(row.count) ? row.count : 0,
  }));
}

export function parseAdminMetricsOverview(raw: unknown): AdminMetricsOverview | null {
  if (!isRecord(raw)) {
    return null;
  }
  const num = (k: string) =>
    typeof raw[k] === "number" && Number.isFinite(raw[k] as number)
      ? (raw[k] as number)
      : null;

  const event_types_since = parseEventTypeRows(raw.event_types_since);
  const ai_event_types_since = parseEventTypeRows(raw.ai_event_types_since);
  const user_signups_by_day = parseDayCountRows(raw.user_signups_by_day);
  const recipes_created_by_day = parseDayCountRows(raw.recipes_created_by_day);
  const recipe_views_by_day = parseDayCountRows(raw.recipe_views_by_day);

  const pc = num("profile_count");
  const rc = num("recipe_count");
  const ft = num("favorites_total");
  const ec = num("events_since_count");
  const ac = num("affiliate_clicks_since");

  if (
    pc === null ||
    rc === null ||
    ft === null ||
    ec === null ||
    ac === null
  ) {
    return null;
  }

  const plan_free_count = num("plan_free_count") ?? pc;
  const plan_pro_count = num("plan_pro_count") ?? 0;
  const plan_ai_chef_count = num("plan_ai_chef_count") ?? 0;

  return {
    profile_count: pc,
    recipe_count: rc,
    favorites_total: ft,
    events_since_count: ec,
    affiliate_clicks_since: ac,
    plan_free_count,
    plan_pro_count,
    plan_ai_chef_count,
    stripe_customer_count: num("stripe_customer_count") ?? 0,
    recipes_created_since: num("recipes_created_since") ?? 0,
    recipe_views_since: num("recipe_views_since") ?? 0,
    checkout_started_since: num("checkout_started_since") ?? 0,
    ai_events_since: num("ai_events_since") ?? 0,
    instagram_reel_recipe_count: num("instagram_reel_recipe_count") ?? 0,
    suggestions_open_count: num("suggestions_open_count") ?? 0,
    suggestions_total_count: num("suggestions_total_count") ?? 0,
    event_types_since,
    ai_event_types_since,
    user_signups_by_day,
    recipes_created_by_day,
    recipe_views_by_day,
  };
}

export function parseAdminAffiliateLinkTypes(
  raw: unknown,
): AdminAffiliateLinkTypeRow[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: AdminAffiliateLinkTypeRow[] = [];
  for (const row of raw) {
    if (!isRecord(row)) continue;
    const link_type =
      typeof row.link_type === "string" ? row.link_type : null;
    const count =
      typeof row.count === "number" && Number.isFinite(row.count)
        ? row.count
        : null;
    if (!link_type || count === null) continue;
    out.push({ link_type, count });
  }
  return out;
}

export function parseAdminRecentEvents(raw: unknown): AdminRecentEventRow[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: AdminRecentEventRow[] = [];
  for (const row of raw) {
    if (!isRecord(row)) {
      continue;
    }
    const id = typeof row.id === "string" ? row.id : null;
    const event_type =
      typeof row.event_type === "string" ? row.event_type : null;
    const created_at =
      typeof row.created_at === "string" ? row.created_at : null;
    if (!id || !event_type || !created_at) {
      continue;
    }
    const user_id =
      row.user_id === null || typeof row.user_id === "string"
        ? row.user_id
        : null;
    out.push({
      id,
      user_id,
      event_type,
      metadata: row.metadata as Json,
      created_at,
    });
  }
  return out;
}
