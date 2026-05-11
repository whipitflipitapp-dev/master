-- User pantry (saved ingredients for Help Me Cook). MVP: plain text rows, optional FK to canonical ingredients later.

CREATE TABLE public.user_pantry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  ingredient text NOT NULL,
  ingredient_id uuid REFERENCES public.ingredients (id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now (),
  UNIQUE (user_id, ingredient)
);

CREATE INDEX user_pantry_user_id_idx ON public.user_pantry (user_id);
CREATE INDEX user_pantry_user_sort_idx ON public.user_pantry (user_id, sort_order);

CREATE OR REPLACE FUNCTION public.normalize_user_pantry_ingredient ()
  RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  NEW.ingredient := lower(trim(regexp_replace(trim(BOTH FROM NEW.ingredient), '\s+', ' ', 'g')));
  IF NEW.ingredient = '' THEN
    RAISE EXCEPTION 'Pantry ingredient cannot be empty';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_pantry_normalize_ingredient
  BEFORE INSERT OR UPDATE ON public.user_pantry
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_user_pantry_ingredient ();

ALTER TABLE public.user_pantry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_pantry_select_own"
  ON public.user_pantry
  FOR SELECT
  USING (user_id = auth.uid ());

CREATE POLICY "user_pantry_insert_own"
  ON public.user_pantry
  FOR INSERT
  WITH CHECK (user_id = auth.uid () AND auth.uid () IS NOT NULL);

CREATE POLICY "user_pantry_update_own"
  ON public.user_pantry
  FOR UPDATE
  USING (user_id = auth.uid ())
  WITH CHECK (user_id = auth.uid ());

CREATE POLICY "user_pantry_delete_own"
  ON public.user_pantry
  FOR DELETE
  USING (user_id = auth.uid ());

COMMENT ON TABLE public.user_pantry IS 'Signed-in pantry list for Help Me Cook; ingredient normalized to lowercase by trigger.';

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_pantry TO anon, authenticated;
