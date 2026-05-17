-- Distinguish AI suggestions from community (user) wine pairings.

CREATE TYPE public.wine_pairing_source AS ENUM ('ai', 'user');

ALTER TABLE public.wine_pairings
  ADD COLUMN IF NOT EXISTS source public.wine_pairing_source NOT NULL DEFAULT 'ai',
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS wine_type_slug text;

ALTER TABLE public.wine_pairings
  ADD CONSTRAINT wine_pairings_source_user_id_check CHECK (
    (
      source = 'user'
      AND user_id IS NOT NULL
    )
    OR (
      source = 'ai'
      AND user_id IS NULL
    )
  );

CREATE INDEX IF NOT EXISTS wine_pairings_recipe_source_idx ON public.wine_pairings (recipe_id, source);

CREATE INDEX IF NOT EXISTS wine_pairings_user_id_idx ON public.wine_pairings (user_id)
WHERE
  user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS wine_pairings_user_recipe_type_slug_idx ON public.wine_pairings (recipe_id, user_id, wine_type_slug)
WHERE
  source = 'user'
  AND wine_type_slug IS NOT NULL;

COMMENT ON COLUMN public.wine_pairings.source IS 'ai = Pro-generated suggestions; user = community submission.';
COMMENT ON COLUMN public.wine_pairings.wine_type_slug IS 'Curated type key for user submissions (e.g. chardonnay).';

DROP POLICY IF EXISTS "wine_pairings_write_if_recipe_owner" ON public.wine_pairings;

CREATE POLICY "wine_pairings_insert_user_own" ON public.wine_pairings
  FOR INSERT
  WITH CHECK (
    source = 'user'
    AND user_id = auth.uid ()
  );

CREATE POLICY "wine_pairings_update_user_own" ON public.wine_pairings
  FOR UPDATE
  USING (
    source = 'user'
    AND user_id = auth.uid ()
  )
  WITH CHECK (
    source = 'user'
    AND user_id = auth.uid ()
  );

CREATE POLICY "wine_pairings_delete_user_own" ON public.wine_pairings
  FOR DELETE
  USING (
    source = 'user'
    AND user_id = auth.uid ()
  );
