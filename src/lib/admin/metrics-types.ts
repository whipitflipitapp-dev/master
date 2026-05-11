import type { Json } from "@/lib/supabase/database.types";

export type AdminEventTypeBreakdownRow = {
  event_type: string;
  count: number;
};

export type AdminSignupDayRow = {
  day: string;
  count: number;
};

/** Shape returned by RPC `admin_metrics_overview`; validate at runtime before use. */
export type AdminMetricsOverview = {
  profile_count: number;
  recipe_count: number;
  favorites_total: number;
  events_since_count: number;
  affiliate_clicks_since: number;
  event_types_since: AdminEventTypeBreakdownRow[];
  user_signups_by_day: AdminSignupDayRow[];
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

export function parseAdminMetricsOverview(raw: unknown): AdminMetricsOverview | null {
  if (!isRecord(raw)) {
    return null;
  }
  const num = (k: string) =>
    typeof raw[k] === "number" && Number.isFinite(raw[k] as number)
      ? (raw[k] as number)
      : null;

  const et = raw.event_types_since;
  const su = raw.user_signups_by_day;

  let event_types_since: AdminEventTypeBreakdownRow[] = [];
  if (Array.isArray(et)) {
    event_types_since = et.filter(isRecord).map((row) => ({
      event_type: typeof row.event_type === "string" ? row.event_type : "",
      count:
        typeof row.count === "number" && Number.isFinite(row.count) ? row.count : 0,
    }));
  }

  let user_signups_by_day: AdminSignupDayRow[] = [];
  if (Array.isArray(su)) {
    user_signups_by_day = su.filter(isRecord).map((row) => ({
      day: typeof row.day === "string" ? row.day : "",
      count:
        typeof row.count === "number" && Number.isFinite(row.count) ? row.count : 0,
    }));
  }

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

  return {
    profile_count: pc,
    recipe_count: rc,
    favorites_total: ft,
    events_since_count: ec,
    affiliate_clicks_since: ac,
    event_types_since,
    user_signups_by_day,
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
