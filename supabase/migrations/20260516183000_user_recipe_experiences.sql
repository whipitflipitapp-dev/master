-- Per-user recipe cook feedback (one row per user + recipe).

CREATE TABLE public.user_recipe_experiences (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES public.recipes (id) ON DELETE CASCADE,
  made_recipe boolean NOT NULL DEFAULT false,
  rating smallint,
  spent_cents integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, recipe_id),
  CONSTRAINT user_recipe_experiences_rating_range CHECK (
    rating IS NULL OR (rating >= 1 AND rating <= 10)
  ),
  CONSTRAINT user_recipe_experiences_spent_nonneg CHECK (
    spent_cents IS NULL OR spent_cents >= 0
  )
);

CREATE INDEX user_recipe_experiences_user_id_idx ON public.user_recipe_experiences (user_id);

ALTER TABLE public.user_recipe_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_recipe_experiences_select_own" ON public.user_recipe_experiences
  FOR SELECT
  USING (user_id = auth.uid ());

CREATE POLICY "user_recipe_experiences_insert_own" ON public.user_recipe_experiences
  FOR INSERT
  WITH CHECK (user_id = auth.uid ());

CREATE POLICY "user_recipe_experiences_update_own" ON public.user_recipe_experiences
  FOR UPDATE
  USING (user_id = auth.uid ())
  WITH CHECK (user_id = auth.uid ());

COMMENT ON TABLE public.user_recipe_experiences IS 'Signed-in user feedback after cooking a recipe (made, rating, spend).';
