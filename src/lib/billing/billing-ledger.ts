import "server-only";

import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

import { classifyRevenueTypeFromPriceId } from "@/lib/billing/revenue-type";
import { logServerError } from "@/lib/server-error";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";

export type BillingLedgerInsert = {
  stripe_event_id: string;
  kind: "invoice_paid" | "refund_created";
  amount_cents: number;
  currency: string;
  revenue_type: string;
  stripe_price_id: string | null;
  stripe_customer_id: string | null;
  stripe_invoice_id: string | null;
  stripe_charge_id: string | null;
  stripe_refund_id: string | null;
  user_id: string | null;
  occurred_at: string;
};

function customerIdFromStripe(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): string | null {
  if (!customer) return null;
  if (typeof customer === "string") return customer;
  if ("deleted" in customer && customer.deleted) return null;
  return customer.id ?? null;
}

function priceIdFromInvoice(invoice: Stripe.Invoice): string {
  const line = invoice.lines?.data?.[0];
  if (!line) return "";

  const legacyPrice = (line as { price?: string | { id?: string } | null }).price;
  if (typeof legacyPrice === "string") return legacyPrice;
  if (legacyPrice && typeof legacyPrice === "object" && legacyPrice.id) {
    return legacyPrice.id;
  }

  const pricing = (
    line as {
      pricing?: { price_details?: { price?: string | null } | null } | null;
    }
  ).pricing;
  const modernPrice = pricing?.price_details?.price;
  return typeof modernPrice === "string" ? modernPrice : "";
}

export function priceIdFromInvoiceForLedger(invoice: Stripe.Invoice): string {
  return priceIdFromInvoice(invoice);
}

async function resolveUserIdForCustomer(
  supabase: SupabaseClient,
  customerId: string | null,
): Promise<string | null> {
  if (!customerId) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function insertBillingLedgerRow(
  row: BillingLedgerInsert,
): Promise<{ ok: true; duplicate: boolean } | { ok: false; error: string }> {
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Supabase service role is not configured." };
  }

  const { error } = await supabase.from("billing_events").insert({
    stripe_event_id: row.stripe_event_id,
    kind: row.kind,
    amount_cents: row.amount_cents,
    currency: row.currency.toLowerCase(),
    revenue_type: row.revenue_type,
    stripe_price_id: row.stripe_price_id,
    stripe_customer_id: row.stripe_customer_id,
    stripe_invoice_id: row.stripe_invoice_id,
    stripe_charge_id: row.stripe_charge_id,
    stripe_refund_id: row.stripe_refund_id,
    user_id: row.user_id,
    occurred_at: row.occurred_at,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: true, duplicate: true };
    }
    logServerError("billing_ledger.insert", error);
    return { ok: false, error: "Could not persist billing ledger row." };
  }

  return { ok: true, duplicate: false };
}

export async function recordInvoicePaidLedgerEntry(args: {
  stripeEventId: string;
  invoice: Stripe.Invoice;
}): Promise<{ ok: boolean; error?: string }> {
  const amount = args.invoice.amount_paid ?? 0;
  if (amount <= 0) {
    return { ok: true };
  }

  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Supabase service role is not configured." };
  }

  const customerId = customerIdFromStripe(args.invoice.customer ?? null);
  const userId = await resolveUserIdForCustomer(supabase, customerId);
  const priceId = priceIdFromInvoice(args.invoice);
  const revenueType = classifyRevenueTypeFromPriceId(priceId);

  const paidAt = args.invoice.status_transitions?.paid_at;
  const occurredAt =
    typeof paidAt === "number" && paidAt > 0
      ? new Date(paidAt * 1000).toISOString()
      : typeof args.invoice.created === "number"
        ? new Date(args.invoice.created * 1000).toISOString()
        : new Date().toISOString();

  const chargeRaw = (args.invoice as { charge?: string | { id?: string } | null })
    .charge;
  const chargeId =
    typeof chargeRaw === "string"
      ? chargeRaw
      : chargeRaw && typeof chargeRaw === "object"
        ? chargeRaw.id ?? null
        : null;

  const result = await insertBillingLedgerRow({
    stripe_event_id: args.stripeEventId,
    kind: "invoice_paid",
    amount_cents: amount,
    currency: args.invoice.currency ?? "usd",
    revenue_type: revenueType,
    stripe_price_id: priceId || null,
    stripe_customer_id: customerId,
    stripe_invoice_id: args.invoice.id,
    stripe_charge_id: chargeId,
    stripe_refund_id: null,
    user_id: userId,
    occurred_at: occurredAt,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}

export async function recordRefundLedgerEntry(args: {
  stripeEventId: string;
  refund: Stripe.Refund;
  stripe: Stripe;
}): Promise<{ ok: boolean; error?: string }> {
  const amount = args.refund.amount ?? 0;
  if (amount <= 0) {
    return { ok: true };
  }

  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Supabase service role is not configured." };
  }

  let priceId = "";
  let customerId: string | null = null;
  let invoiceId: string | null = null;
  const chargeId =
    typeof args.refund.charge === "string"
      ? args.refund.charge
      : args.refund.charge?.id ?? null;

  if (chargeId) {
    try {
      const charge = await args.stripe.charges.retrieve(chargeId, {
        expand: ["invoice"],
      });
      customerId = customerIdFromStripe(charge.customer ?? null);
      const invRaw = (charge as { invoice?: string | Stripe.Invoice | null }).invoice;
      if (invRaw && typeof invRaw === "object" && "lines" in invRaw) {
        invoiceId = invRaw.id ?? null;
        priceId = priceIdFromInvoice(invRaw);
      } else if (typeof invRaw === "string") {
        invoiceId = invRaw;
      }
    } catch (e: unknown) {
      logServerError("billing_ledger.refund_charge_lookup", e);
    }
  }

  const userId = await resolveUserIdForCustomer(supabase, customerId);
  const revenueType = classifyRevenueTypeFromPriceId(priceId);

  const occurredAt =
    typeof args.refund.created === "number"
      ? new Date(args.refund.created * 1000).toISOString()
      : new Date().toISOString();

  const result = await insertBillingLedgerRow({
    stripe_event_id: args.stripeEventId,
    kind: "refund_created",
    amount_cents: -amount,
    currency: args.refund.currency ?? "usd",
    revenue_type: revenueType,
    stripe_price_id: priceId || null,
    stripe_customer_id: customerId,
    stripe_invoice_id: invoiceId,
    stripe_charge_id: chargeId,
    stripe_refund_id: args.refund.id,
    user_id: userId,
    occurred_at: occurredAt,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}

/** charge.refunded fallback when refund.created was not processed. */
export async function recordChargeRefundedLedgerFallback(args: {
  stripeEventId: string;
  charge: Stripe.Charge;
}): Promise<{ ok: boolean; error?: string }> {
  const refund = args.charge.refunds?.data?.[0];
  if (!refund?.id || !(refund.amount > 0)) {
    return { ok: true };
  }

  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Supabase service role is not configured." };
  }

  const { data: existing } = await supabase
    .from("billing_events")
    .select("id")
    .eq("stripe_refund_id", refund.id)
    .maybeSingle();

  if (existing) {
    return { ok: true };
  }

  const customerId = customerIdFromStripe(args.charge.customer ?? null);
  const userId = await resolveUserIdForCustomer(supabase, customerId);

  const chargeInvoice = (args.charge as { invoice?: string | { id?: string } | null })
    .invoice;
  const invoiceIdFromCharge =
    typeof chargeInvoice === "string"
      ? chargeInvoice
      : chargeInvoice && typeof chargeInvoice === "object"
        ? chargeInvoice.id ?? null
        : null;

  const result = await insertBillingLedgerRow({
    stripe_event_id: args.stripeEventId,
    kind: "refund_created",
    amount_cents: -(refund.amount ?? 0),
    currency: args.charge.currency ?? "usd",
    revenue_type: "other",
    stripe_price_id: null,
    stripe_customer_id: customerId,
    stripe_invoice_id: invoiceIdFromCharge,
    stripe_charge_id: args.charge.id,
    stripe_refund_id: refund.id,
    user_id: userId,
    occurred_at:
      typeof refund.created === "number"
        ? new Date(refund.created * 1000).toISOString()
        : new Date().toISOString(),
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}
