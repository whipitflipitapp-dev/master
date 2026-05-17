-- Per-user hidden recipes (browse surfaces filter these out).

CREATE TABLE public.user_excluded_recipes (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES public.recipes (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, recipe_id)
);

CREATE INDEX user_excluded_recipes_recipe_id_idx ON public.user_excluded_recipes (recipe_id);

ALTER TABLE public.user_excluded_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_excluded_recipes_select_own" ON public.user_excluded_recipes
  FOR SELECT
  USING (user_id = auth.uid ());

CREATE POLICY "user_excluded_recipes_insert_own" ON public.user_excluded_recipes
  FOR INSERT
  WITH CHECK (user_id = auth.uid ());

CREATE POLICY "user_excluded_recipes_delete_own" ON public.user_excluded_recipes
  FOR DELETE
  USING (user_id = auth.uid ());
