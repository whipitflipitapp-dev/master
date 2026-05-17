-- Optional community "why this wine" blurb (max 200 characters).

ALTER TABLE public.wine_pairings
  ADD COLUMN IF NOT EXISTS why_blurb varchar(200);

ALTER TABLE public.wine_pairings
  ADD CONSTRAINT wine_pairings_why_blurb_length_check CHECK (
    why_blurb IS NULL
    OR char_length(why_blurb) <= 200
  );

ALTER TABLE public.wine_pairings
  ADD CONSTRAINT wine_pairings_why_blurb_user_only_check CHECK (
    why_blurb IS NULL
    OR source = 'user'
  );

COMMENT ON COLUMN public.wine_pairings.why_blurb IS 'Optional user explanation why this wine pairs (max 200 chars).';
