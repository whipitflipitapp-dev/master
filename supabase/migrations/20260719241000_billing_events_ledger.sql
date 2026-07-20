-- Immutable Stripe cash ledger for admin revenue (written by webhook service role only).

CREATE TABLE public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('invoice_paid', 'refund_created')),
  amount_cents bigint NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  revenue_type text NOT NULL DEFAULT 'other',
  stripe_price_id text,
  stripe_customer_id text,
  stripe_invoice_id text,
  stripe_charge_id text,
  stripe_refund_id text,
  user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_events_stripe_event_id_unique UNIQUE (stripe_event_id),
  CONSTRAINT billing_events_refund_id_unique UNIQUE (stripe_refund_id)
);

CREATE INDEX billing_events_occurred_at_idx ON public.billing_events (occurred_at DESC);

CREATE INDEX billing_events_revenue_type_occurred_idx ON public.billing_events (revenue_type, occurred_at DESC);

CREATE INDEX billing_events_user_id_idx ON public.billing_events (user_id)
WHERE
  user_id IS NOT NULL;

CREATE UNIQUE INDEX billing_events_invoice_paid_once_idx ON public.billing_events (stripe_invoice_id)
WHERE
  kind = 'invoice_paid'
  AND stripe_invoice_id IS NOT NULL;

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_events_select_admin" ON public.billing_events
  FOR SELECT
  USING (public.is_request_user_admin ());

COMMENT ON TABLE public.billing_events IS
  'Append-only Stripe invoice/refund ledger; inserts via service role webhook only.';

CREATE OR REPLACE FUNCTION public.admin_billing_ledger_summary (
  p_since timestamptz DEFAULT (timezone ('utc', now()) - INTERVAL '7 days'))
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_now timestamptz := timezone ('utc', now());
  v_since_7 timestamptz := v_now - INTERVAL '7 days';
  v_since_30 timestamptz := v_now - INTERVAL '30 days';
  v_since_90 timestamptz := v_now - INTERVAL '90 days';
BEGIN
  IF NOT public.is_request_user_admin () THEN
    RAISE EXCEPTION 'not authorized'
      USING ERRCODE = '42501';
  END IF;

  RETURN json_build_object(
    'ledger_entry_count',
    (
      SELECT
        COUNT (*)::bigint
      FROM public.billing_events),
    'net_7d_cents',
    (
      SELECT
        COALESCE(SUM (be.amount_cents), 0)::bigint
      FROM public.billing_events be
      WHERE
        be.occurred_at >= v_since_7),
    'net_30d_cents',
    (
      SELECT
        COALESCE(SUM (be.amount_cents), 0)::bigint
      FROM public.billing_events be
      WHERE
        be.occurred_at >= v_since_30),
    'net_90d_cents',
    (
      SELECT
        COALESCE(SUM (be.amount_cents), 0)::bigint
      FROM public.billing_events be
      WHERE
        be.occurred_at >= v_since_90),
    'gross_collected_7d_cents',
    (
      SELECT
        COALESCE(SUM (be.amount_cents), 0)::bigint
      FROM public.billing_events be
      WHERE
        be.occurred_at >= v_since_7
        AND be.amount_cents > 0),
    'gross_collected_30d_cents',
    (
      SELECT
        COALESCE(SUM (be.amount_cents), 0)::bigint
      FROM public.billing_events be
      WHERE
        be.occurred_at >= v_since_30
        AND be.amount_cents > 0),
    'gross_collected_90d_cents',
    (
      SELECT
        COALESCE(SUM (be.amount_cents), 0)::bigint
      FROM public.billing_events be
      WHERE
        be.occurred_at >= v_since_90
        AND be.amount_cents > 0),
    'refunds_7d_cents',
    (
      SELECT
        COALESCE(SUM (be.amount_cents), 0)::bigint
      FROM public.billing_events be
      WHERE
        be.occurred_at >= v_since_7
        AND be.amount_cents < 0),
    'refunds_30d_cents',
    (
      SELECT
        COALESCE(SUM (be.amount_cents), 0)::bigint
      FROM public.billing_events be
      WHERE
        be.occurred_at >= v_since_30
        AND be.amount_cents < 0),
    'revenue_by_type',
    COALESCE (
      (
        SELECT
          json_agg (row_to_json (q))
        FROM (
          SELECT
            be.revenue_type,
            COALESCE(SUM (be.amount_cents) FILTER (WHERE be.occurred_at >= v_since_30), 0)::bigint AS net_30d_cents,
            COALESCE(SUM (be.amount_cents) FILTER (WHERE be.occurred_at >= v_since_30
                AND be.amount_cents > 0), 0)::bigint AS gross_30d_cents
          FROM
            public.billing_events be
          GROUP BY
            be.revenue_type
          ORDER BY
            gross_30d_cents DESC) q),
      '[]'::json),
    'revenue_by_day',
    COALESCE (
      (
        SELECT
          json_agg (row_to_json (d))
        FROM (
          SELECT
            (timezone ('utc', be.occurred_at))::date AS day,
            COALESCE(SUM (be.amount_cents), 0)::bigint AS net_cents,
            COALESCE(SUM (be.amount_cents) FILTER (WHERE be.amount_cents > 0), 0)::bigint AS gross_cents
          FROM
            public.billing_events be
          WHERE
            be.occurred_at >= v_since_30
          GROUP BY
            (timezone ('utc', be.occurred_at))::date
          ORDER BY
            (timezone ('utc', be.occurred_at))::date ASC) d),
      '[]'::json));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_billing_ledger_summary(timestamptz) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_billing_ledger_summary(timestamptz) TO authenticated;

COMMENT ON FUNCTION public.admin_billing_ledger_summary(timestamptz) IS
  'Admin revenue aggregates from billing_events ledger.';
