-- Recurring recipe giveaway: 60-day entry cycles, admin-managed winners.

CREATE TABLE IF NOT EXISTS public.giveaway_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_start timestamptz NOT NULL,
  entry_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active',
  winners_announced_at timestamptz,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  CONSTRAINT giveaway_cycles_status_check CHECK (
    status IN ('active', 'closed', 'completed')
  ),
  CONSTRAINT giveaway_cycles_dates_check CHECK (entry_end > entry_start)
);

CREATE INDEX IF NOT EXISTS giveaway_cycles_entry_end_idx ON public.giveaway_cycles (entry_end DESC);

CREATE INDEX IF NOT EXISTS giveaway_cycles_status_idx ON public.giveaway_cycles (status);

COMMENT ON TABLE public.giveaway_cycles IS
  '60-day recipe giveaway entry periods; admin is source of truth for dates and status.';

CREATE TABLE IF NOT EXISTS public.giveaway_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.giveaway_cycles (id) ON DELETE CASCADE,
  display_name text NOT NULL,
  prize_amount_cents integer NOT NULL,
  prize_rank smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  CONSTRAINT giveaway_winners_prize_amount_check CHECK (prize_amount_cents > 0),
  CONSTRAINT giveaway_winners_prize_rank_check CHECK (
    prize_rank >= 1
    AND prize_rank <= 5
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS giveaway_winners_cycle_rank_idx ON public.giveaway_winners (cycle_id, prize_rank);

COMMENT ON TABLE public.giveaway_winners IS
  'Published winner display names (first name + last initial) per cycle; no PII beyond display_name.';

ALTER TABLE public.giveaway_cycles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.giveaway_winners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "giveaway_cycles_public_read" ON public.giveaway_cycles;

CREATE POLICY "giveaway_cycles_public_read" ON public.giveaway_cycles
  FOR SELECT
  USING (status IN ('active', 'closed', 'completed'));

DROP POLICY IF EXISTS "giveaway_cycles_admin_all" ON public.giveaway_cycles;

CREATE POLICY "giveaway_cycles_admin_all" ON public.giveaway_cycles
  FOR ALL
  USING (public.is_request_user_admin ())
  WITH CHECK (public.is_request_user_admin ());

DROP POLICY IF EXISTS "giveaway_winners_public_read" ON public.giveaway_winners;

CREATE POLICY "giveaway_winners_public_read" ON public.giveaway_winners
  FOR SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.giveaway_cycles c
      WHERE
        c.id = cycle_id
        AND c.status = 'completed'));

DROP POLICY IF EXISTS "giveaway_winners_admin_all" ON public.giveaway_winners;

CREATE POLICY "giveaway_winners_admin_all" ON public.giveaway_winners
  FOR ALL
  USING (public.is_request_user_admin ())
  WITH CHECK (public.is_request_user_admin ());

-- Count users who meet technical entry criteria (no identities returned).
CREATE OR REPLACE FUNCTION public.giveaway_qualifying_entrant_count (
  p_entry_start timestamptz,
  p_entry_end timestamptz
)
  RETURNS integer
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT
    coalesce(count(*), 0)::integer
  FROM (
    SELECT
      r.created_by
    FROM
      public.recipes r
    WHERE
      r.created_by IS NOT NULL
      AND r.moderation_status <> 'removed'
      AND r.created_at >= p_entry_start
      AND r.created_at <= p_entry_end
    GROUP BY
      r.created_by
    HAVING
      count(*) >= 3
      AND count(*) FILTER (
        WHERE coalesce(trim(r.video_url), '') <> ''
          OR coalesce(trim(r.hosted_reel_url), '') <> '') >= 1) q;
$$;

REVOKE ALL ON FUNCTION public.giveaway_qualifying_entrant_count (timestamptz, timestamptz) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.giveaway_qualifying_entrant_count (timestamptz, timestamptz) TO anon,
  authenticated;

COMMENT ON FUNCTION public.giveaway_qualifying_entrant_count (timestamptz, timestamptz) IS
  'Giveaway page: count of accounts with 3+ recipes and 1+ video in the entry window.';
