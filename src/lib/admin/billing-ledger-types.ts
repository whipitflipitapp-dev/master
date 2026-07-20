import type { AdminRevenueTypeKey } from "@/lib/billing/revenue-type";

export type AdminBillingLedgerSummary = {
  ledger_entry_count: number;
  net_7d_cents: number;
  net_30d_cents: number;
  net_90d_cents: number;
  gross_collected_7d_cents: number;
  gross_collected_30d_cents: number;
  gross_collected_90d_cents: number;
  refunds_7d_cents: number;
  refunds_30d_cents: number;
  revenue_by_type: {
    revenue_type: string;
    net_30d_cents: number;
    gross_30d_cents: number;
  }[];
  revenue_by_day: {
    day: string;
    net_cents: number;
    gross_cents: number;
  }[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function num(raw: Record<string, unknown>, key: string): number | null {
  const v = raw[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function parseAdminBillingLedgerSummary(
  raw: unknown,
): AdminBillingLedgerSummary | null {
  if (!isRecord(raw)) return null;

  const ledger_entry_count = num(raw, "ledger_entry_count");
  const net_7d_cents = num(raw, "net_7d_cents");
  const net_30d_cents = num(raw, "net_30d_cents");
  const net_90d_cents = num(raw, "net_90d_cents");
  const gross_collected_7d_cents = num(raw, "gross_collected_7d_cents");
  const gross_collected_30d_cents = num(raw, "gross_collected_30d_cents");
  const gross_collected_90d_cents = num(raw, "gross_collected_90d_cents");
  const refunds_7d_cents = num(raw, "refunds_7d_cents");
  const refunds_30d_cents = num(raw, "refunds_30d_cents");

  if (
    ledger_entry_count === null ||
    net_7d_cents === null ||
    net_30d_cents === null ||
    net_90d_cents === null ||
    gross_collected_7d_cents === null ||
    gross_collected_30d_cents === null ||
    gross_collected_90d_cents === null ||
    refunds_7d_cents === null ||
    refunds_30d_cents === null
  ) {
    return null;
  }

  const revenue_by_type: AdminBillingLedgerSummary["revenue_by_type"] = [];
  if (Array.isArray(raw.revenue_by_type)) {
    for (const row of raw.revenue_by_type) {
      if (!isRecord(row)) continue;
      const revenue_type =
        typeof row.revenue_type === "string" ? row.revenue_type : "other";
      const net_30d = num(row, "net_30d_cents") ?? 0;
      const gross_30d = num(row, "gross_30d_cents") ?? 0;
      revenue_by_type.push({
        revenue_type,
        net_30d_cents: net_30d,
        gross_30d_cents: gross_30d,
      });
    }
  }

  const revenue_by_day: AdminBillingLedgerSummary["revenue_by_day"] = [];
  if (Array.isArray(raw.revenue_by_day)) {
    for (const row of raw.revenue_by_day) {
      if (!isRecord(row)) continue;
      const day = typeof row.day === "string" ? row.day : "";
      if (!day) continue;
      revenue_by_day.push({
        day,
        net_cents: num(row, "net_cents") ?? 0,
        gross_cents: num(row, "gross_cents") ?? 0,
      });
    }
  }

  return {
    ledger_entry_count,
    net_7d_cents,
    net_30d_cents,
    net_90d_cents,
    gross_collected_7d_cents,
    gross_collected_30d_cents,
    gross_collected_90d_cents,
    refunds_7d_cents,
    refunds_30d_cents,
    revenue_by_type,
    revenue_by_day,
  };
}

export function isAdminRevenueTypeKey(v: string): v is AdminRevenueTypeKey {
  return (
    v === "pro_monthly" ||
    v === "pro_yearly" ||
    v === "ai_chef_monthly" ||
    v === "ai_chef_yearly" ||
    v === "other"
  );
}
