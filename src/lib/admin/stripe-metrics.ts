import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import { priceIdFromInvoiceForLedger } from "@/lib/billing/billing-ledger";
import {
  classifyRevenueTypeFromPriceId,
  REVENUE_TYPE_LABELS,
  type AdminRevenueTypeKey,
} from "@/lib/billing/revenue-type";
import {
  parseAdminBillingLedgerSummary,
  type AdminBillingLedgerSummary,
} from "@/lib/admin/billing-ledger-types";
import { STRIPE_CENTS } from "@/lib/pricing";
import { getStripe } from "@/lib/stripe";

export type { AdminRevenueTypeKey } from "@/lib/billing/revenue-type";
export { classifyRevenueTypeFromPriceId as classifyAdminRevenueType } from "@/lib/billing/revenue-type";

export type AdminRevenueTypeRow = {
  key: AdminRevenueTypeKey;
  label: string;
  collected30dCents: number;
  activeSubscriptions: number;
  mrrCents: number;
};

export type AdminStripeBusinessMetrics = {
  configured: boolean;
  error: string | null;
  ledgerPowered: boolean;
  ledgerEntryCount: number;
  mrrCents: number;
  arrCents: number;
  grossCollected7dCents: number;
  grossCollected30dCents: number;
  grossCollected90dCents: number;
  netCollected7dCents: number;
  netCollected30dCents: number;
  netCollected90dCents: number;
  refunds7dCents: number;
  refunds30dCents: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  pastDueSubscriptions: number;
  revenueByType: AdminRevenueTypeRow[];
  revenueByDay30d: { day: string; amountCents: number }[];
};

const REVENUE_LABELS = REVENUE_TYPE_LABELS;

function monthlyCentsForPrice(price: Stripe.Price | null | undefined): number {
  if (!price?.unit_amount || price.unit_amount <= 0) {
    return 0;
  }
  const amount = price.unit_amount;
  const interval = price.recurring?.interval;
  if (interval === "year") {
    return Math.round(amount / 12);
  }
  if (interval === "month") {
    return amount;
  }
  return 0;
}

function fallbackMonthlyCents(key: AdminRevenueTypeKey): number {
  switch (key) {
    case "pro_monthly":
      return STRIPE_CENTS.pro.monthly;
    case "pro_yearly":
      return Math.round(STRIPE_CENTS.pro.yearly / 12);
    case "ai_chef_monthly":
      return STRIPE_CENTS.ai_chef.monthly;
    case "ai_chef_yearly":
      return Math.round(STRIPE_CENTS.ai_chef.yearly / 12);
    default:
      return 0;
  }
}

async function paginateStripe<T extends { id: string }>(
  listFn: (params: Stripe.PaginationParams) => Promise<Stripe.ApiList<T>>,
  maxPages = 25,
): Promise<T[]> {
  const out: T[] = [];
  let startingAfter: string | undefined;
  for (let page = 0; page < maxPages; page += 1) {
    const batch = await listFn({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    out.push(...batch.data);
    if (!batch.has_more || batch.data.length === 0) {
      break;
    }
    startingAfter = batch.data[batch.data.length - 1]?.id;
  }
  return out;
}

function emptyMetrics(error: string | null): AdminStripeBusinessMetrics {
  return {
    configured: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    error,
    ledgerPowered: false,
    ledgerEntryCount: 0,
    mrrCents: 0,
    arrCents: 0,
    grossCollected7dCents: 0,
    grossCollected30dCents: 0,
    grossCollected90dCents: 0,
    netCollected7dCents: 0,
    netCollected30dCents: 0,
    netCollected90dCents: 0,
    refunds7dCents: 0,
    refunds30dCents: 0,
    activeSubscriptions: 0,
    trialingSubscriptions: 0,
    pastDueSubscriptions: 0,
    revenueByType: (
      Object.keys(REVENUE_LABELS) as AdminRevenueTypeKey[]
    ).map((key) => ({
      key,
      label: REVENUE_LABELS[key],
      collected30dCents: 0,
      activeSubscriptions: 0,
      mrrCents: 0,
    })),
    revenueByDay30d: [],
  };
}

function mergeLedgerCashMetrics(
  typeMap: Map<AdminRevenueTypeKey, AdminRevenueTypeRow>,
  ledger: AdminBillingLedgerSummary,
): { revenueByDay30d: { day: string; amountCents: number }[] } {
  for (const row of ledger.revenue_by_type) {
    const key = (
      Object.keys(REVENUE_LABELS) as AdminRevenueTypeKey[]
    ).includes(row.revenue_type as AdminRevenueTypeKey)
      ? (row.revenue_type as AdminRevenueTypeKey)
      : "other";
    const target = typeMap.get(key)!;
    target.collected30dCents = row.gross_30d_cents;
  }

  const revenueByDay30d = ledger.revenue_by_day.map((row) => ({
    day: row.day,
    amountCents: row.net_cents,
  }));

  return { revenueByDay30d };
}

/** Stripe subscription metrics + cash from billing_events ledger (fallback: Stripe invoices). */
export async function fetchAdminStripeBusinessMetrics(
  supabase: SupabaseClient,
): Promise<AdminStripeBusinessMetrics> {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return emptyMetrics("STRIPE_SECRET_KEY is not configured in this environment.");
  }

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not initialize Stripe.";
    return emptyMetrics(message);
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const since7 = nowSec - 7 * 86400;
  const since30 = nowSec - 30 * 86400;
  const since90 = nowSec - 90 * 86400;

  const typeMap = new Map<AdminRevenueTypeKey, AdminRevenueTypeRow>();
  for (const key of Object.keys(REVENUE_LABELS) as AdminRevenueTypeKey[]) {
    typeMap.set(key, {
      key,
      label: REVENUE_LABELS[key],
      collected30dCents: 0,
      activeSubscriptions: 0,
      mrrCents: 0,
    });
  }

  let ledgerSummary: AdminBillingLedgerSummary | null = null;
  const ledgerRes = await supabase.rpc("admin_billing_ledger_summary");
  if (!ledgerRes.error) {
    ledgerSummary = parseAdminBillingLedgerSummary(ledgerRes.data);
  }

  const ledgerPowered = Boolean(
    ledgerSummary && ledgerSummary.ledger_entry_count > 0,
  );

  try {
    const statuses: Stripe.SubscriptionListParams["status"][] = [
      "active",
      "trialing",
      "past_due",
    ];
    let activeSubscriptions = 0;
    let trialingSubscriptions = 0;
    let pastDueSubscriptions = 0;
    let mrrCents = 0;

    for (const status of statuses) {
      const subs = await paginateStripe((params) =>
        stripe.subscriptions.list({
          ...params,
          status,
          expand: ["data.items.data.price"],
        }),
      );
      for (const sub of subs) {
        if (status === "active") activeSubscriptions += 1;
        if (status === "trialing") trialingSubscriptions += 1;
        if (status === "past_due") pastDueSubscriptions += 1;

        const item = sub.items.data[0];
        const price = item?.price;
        const priceId = price?.id ?? "";
        const key = classifyRevenueTypeFromPriceId(priceId);
        const row = typeMap.get(key)!;
        row.activeSubscriptions += 1;

        let monthly = monthlyCentsForPrice(price ?? undefined);
        if (monthly <= 0 && key !== "other") {
          monthly = fallbackMonthlyCents(key);
        }
        row.mrrCents += monthly;
        mrrCents += monthly;
      }
    }

    let gross7 = 0;
    let gross30 = 0;
    let gross90 = 0;
    let net7 = 0;
    let net30 = 0;
    let net90 = 0;
    let refunds7 = 0;
    let refunds30 = 0;
    let revenueByDay30d: { day: string; amountCents: number }[] = [];

    if (ledgerPowered && ledgerSummary) {
      gross7 = ledgerSummary.gross_collected_7d_cents;
      gross30 = ledgerSummary.gross_collected_30d_cents;
      gross90 = ledgerSummary.gross_collected_90d_cents;
      net7 = ledgerSummary.net_7d_cents;
      net30 = ledgerSummary.net_30d_cents;
      net90 = ledgerSummary.net_90d_cents;
      refunds7 = ledgerSummary.refunds_7d_cents;
      refunds30 = ledgerSummary.refunds_30d_cents;
      const merged = mergeLedgerCashMetrics(typeMap, ledgerSummary);
      revenueByDay30d = merged.revenueByDay30d;
    } else {
      const revenueByDay = new Map<string, number>();
      const invoices = await paginateStripe((params) =>
        stripe.invoices.list({
          ...params,
          status: "paid",
          created: { gte: since90 },
        }),
      );

      for (const inv of invoices) {
        const paid = typeof inv.amount_paid === "number" ? inv.amount_paid : 0;
        if (paid <= 0) continue;
        const created = inv.created ?? 0;
        if (created >= since90) gross90 += paid;
        if (created >= since30) gross30 += paid;
        if (created >= since7) gross7 += paid;

        if (created >= since30) {
          const day = new Date(created * 1000).toISOString().slice(0, 10);
          revenueByDay.set(day, (revenueByDay.get(day) ?? 0) + paid);

          const priceId = priceIdFromInvoiceForLedger(inv);
          const key = classifyRevenueTypeFromPriceId(priceId);
          const row = typeMap.get(key)!;
          row.collected30dCents += paid;
        }
      }

      net7 = gross7;
      net30 = gross30;
      net90 = gross90;
      revenueByDay30d = [...revenueByDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, amountCents]) => ({ day, amountCents }));
    }

    return {
      configured: true,
      error: null,
      ledgerPowered,
      ledgerEntryCount: ledgerSummary?.ledger_entry_count ?? 0,
      mrrCents,
      arrCents: mrrCents * 12,
      grossCollected7dCents: gross7,
      grossCollected30dCents: gross30,
      grossCollected90dCents: gross90,
      netCollected7dCents: net7,
      netCollected30dCents: net30,
      netCollected90dCents: net90,
      refunds7dCents: refunds7,
      refunds30dCents: refunds30,
      activeSubscriptions,
      trialingSubscriptions,
      pastDueSubscriptions,
      revenueByType: [...typeMap.values()],
      revenueByDay30d,
    };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Stripe metrics request failed.";
    return { ...emptyMetrics(message), configured: true };
  }
}
