-- Tighten events: only authenticated users may insert rows for themselves.
DROP POLICY IF EXISTS "events_insert_authenticated_or_anon_null_user" ON public.events;

CREATE POLICY "events_insert_authenticated_own_user" ON public.events
  FOR INSERT
  WITH CHECK (
    auth.uid () IS NOT NULL
    AND user_id = auth.uid ()
  );

COMMENT ON POLICY "events_insert_authenticated_own_user" ON public.events IS 'Authenticated inserts only; user_id must match JWT subject.';

-- Affiliate clicks: signed-in rows must attach to auth.uid(); anonymous inserts keep user_id null.
DROP POLICY IF EXISTS "affiliate_clicks_insert_any" ON public.affiliate_clicks;

CREATE POLICY "affiliate_clicks_insert_own_or_anonymous" ON public.affiliate_clicks
  FOR INSERT
  WITH CHECK (
    (
      auth.uid () IS NOT NULL
      AND user_id = auth.uid ()
    )
    OR (
      auth.uid () IS NULL
      AND user_id IS NULL
    )
  );

COMMENT ON POLICY "affiliate_clicks_insert_own_or_anonymous" ON public.affiliate_clicks IS 'Owners log as themselves; unsigned visitors insert with user_id NULL.';

ALTER TABLE public.wine_pairings
  ADD COLUMN IF NOT EXISTS purchase_url text;

COMMENT ON COLUMN public.wine_pairings.purchase_url IS 'Optional HTTPS affiliate/product URL shown when unlocked (Pro / AI Chef).';
