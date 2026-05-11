-- Whip It Flip It — schema, RLS, favorites_count trigger, allergen seed.
-- Trusted admin dashboards that bypass RLS should use the Supabase service role key server-side only — never expose it to the client.

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  plan_type text NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'ai_chef')),
  language text NOT NULL DEFAULT 'en',
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now ()
);

CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  title text NOT NULL,
  instructions text NOT NULL DEFAULT '',
  image_url text,
  video_url text,
  favorites_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  difficulty text,
  cook_time_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now ()
);

CREATE INDEX recipes_created_by_idx ON public.recipes (created_by);
CREATE INDEX recipes_created_at_idx ON public.recipes (created_at DESC);

CREATE TABLE public.ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  name text NOT NULL UNIQUE
);

CREATE TABLE public.recipe_ingredients (
  recipe_id uuid NOT NULL REFERENCES public.recipes (id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients (id) ON DELETE CASCADE,
  quantity text,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (recipe_id, ingredient_id)
);

CREATE INDEX recipe_ingredients_ingredient_id_idx ON public.recipe_ingredients (ingredient_id);

CREATE TABLE public.favorites (
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES public.recipes (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now (),
  PRIMARY KEY (user_id, recipe_id)
);

CREATE INDEX favorites_recipe_id_idx ON public.favorites (recipe_id);

CREATE TABLE public.allergens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  name text NOT NULL UNIQUE
);

CREATE TABLE public.user_allergies (
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  allergen_id uuid NOT NULL REFERENCES public.allergens (id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, allergen_id)
);

CREATE TABLE public.recipe_allergens (
  recipe_id uuid NOT NULL REFERENCES public.recipes (id) ON DELETE CASCADE,
  allergen_id uuid NOT NULL REFERENCES public.allergens (id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, allergen_id)
);

CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  name text NOT NULL UNIQUE
);

CREATE TABLE public.recipe_tags (
  recipe_id uuid NOT NULL REFERENCES public.recipes (id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags (id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, tag_id)
);

CREATE TABLE public.wine_pairings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  recipe_id uuid NOT NULL REFERENCES public.recipes (id) ON DELETE CASCADE,
  wine_type text NOT NULL,
  wine_name text,
  notes text,
  description text
);

CREATE INDEX wine_pairings_recipe_id_idx ON public.wine_pairings (recipe_id);

CREATE TABLE public.cookbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  title text NOT NULL,
  description text,
  price_cents integer,
  cover_image_url text,
  file_url text,
  external_link text,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL
);

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now ()
);

CREATE INDEX events_user_id_idx ON public.events (user_id);
CREATE INDEX events_created_at_idx ON public.events (created_at DESC);

CREATE TABLE public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  recipe_id uuid REFERENCES public.recipes (id) ON DELETE SET NULL,
  link_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now ()
);

CREATE OR REPLACE FUNCTION public.handle_new_user ()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user ();

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns ()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  actor_admin boolean;
BEGIN
  SELECT COALESCE(is_admin, FALSE)
  INTO actor_admin
  FROM public.profiles
  WHERE id = auth.uid ();
  IF actor_admin IS DISTINCT FROM TRUE THEN
    NEW.is_admin := OLD.is_admin;
    NEW.plan_type := OLD.plan_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_protect_privileged
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileged_columns ();

CREATE OR REPLACE FUNCTION public.recipe_favorites_count_sync ()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.recipes
      SET favorites_count = favorites_count + 1
      WHERE id = NEW.recipe_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.recipes
      SET favorites_count = GREATEST(0, favorites_count - 1)
      WHERE id = OLD.recipe_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_favorites_count_ins
  AFTER INSERT ON public.favorites
  FOR EACH ROW
  EXECUTE FUNCTION public.recipe_favorites_count_sync ();

CREATE TRIGGER trg_favorites_count_del
  AFTER DELETE ON public.favorites
  FOR EACH ROW
  EXECUTE FUNCTION public.recipe_favorites_count_sync ();

CREATE OR REPLACE FUNCTION public.is_request_user_admin ()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT COALESCE((
      SELECT
        p.is_admin
      FROM public.profiles p
      WHERE
        p.id = auth.uid ()), FALSE);
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allergens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_allergens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wine_pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cookbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT
  USING (auth.uid () = id OR public.is_request_user_admin ());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (auth.uid () = id)
  WITH CHECK (auth.uid () = id);

CREATE POLICY "recipes_select_public" ON public.recipes
  FOR SELECT
  USING (TRUE);

CREATE POLICY "recipes_insert_authenticated_owner" ON public.recipes
  FOR INSERT
  WITH CHECK (auth.uid () IS NOT NULL AND created_by = auth.uid ());

CREATE POLICY "recipes_update_owner_or_admin" ON public.recipes
  FOR UPDATE
  USING (created_by = auth.uid () OR public.is_request_user_admin ());

CREATE POLICY "recipes_delete_owner_or_admin" ON public.recipes
  FOR DELETE
  USING (created_by = auth.uid () OR public.is_request_user_admin ());

CREATE POLICY "ingredients_select_all" ON public.ingredients
  FOR SELECT
  USING (TRUE);

CREATE POLICY "ingredients_insert_authenticated" ON public.ingredients
  FOR INSERT
  WITH CHECK (auth.uid () IS NOT NULL);

CREATE POLICY "recipe_ingredients_select_all" ON public.recipe_ingredients
  FOR SELECT
  USING (TRUE);

CREATE POLICY "recipe_ingredients_insert_if_recipe_owner" ON public.recipe_ingredients
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT
      1
    FROM
      public.recipes r
    WHERE
      r.id = recipe_id AND (r.created_by = auth.uid () OR public.is_request_user_admin ())));

CREATE POLICY "recipe_ingredients_update_if_recipe_owner" ON public.recipe_ingredients
  FOR UPDATE
  USING (EXISTS (
    SELECT
      1
    FROM
      public.recipes r
    WHERE
      r.id = recipe_id AND (r.created_by = auth.uid () OR public.is_request_user_admin ())));

CREATE POLICY "recipe_ingredients_delete_if_recipe_owner" ON public.recipe_ingredients
  FOR DELETE
  USING (EXISTS (
    SELECT
      1
    FROM
      public.recipes r
    WHERE
      r.id = recipe_id AND (r.created_by = auth.uid () OR public.is_request_user_admin ())));

CREATE POLICY "favorites_select_own" ON public.favorites
  FOR SELECT
  USING (user_id = auth.uid ());

CREATE POLICY "favorites_insert_own" ON public.favorites
  FOR INSERT
  WITH CHECK (user_id = auth.uid ());

CREATE POLICY "favorites_delete_own" ON public.favorites
  FOR DELETE
  USING (user_id = auth.uid ());

CREATE POLICY "allergens_select_all" ON public.allergens
  FOR SELECT
  USING (TRUE);

CREATE POLICY "user_allergies_select_own" ON public.user_allergies
  FOR SELECT
  USING (user_id = auth.uid ());

CREATE POLICY "user_allergies_insert_own" ON public.user_allergies
  FOR INSERT
  WITH CHECK (user_id = auth.uid ());

CREATE POLICY "user_allergies_delete_own" ON public.user_allergies
  FOR DELETE
  USING (user_id = auth.uid ());

CREATE POLICY "user_allergies_update_own" ON public.user_allergies
  FOR UPDATE
  USING (user_id = auth.uid ())
  WITH CHECK (user_id = auth.uid ());

CREATE POLICY "recipe_allergens_select_all" ON public.recipe_allergens
  FOR SELECT
  USING (TRUE);

CREATE POLICY "recipe_allergens_write_if_recipe_owner" ON public.recipe_allergens
  FOR ALL
  USING (EXISTS (
    SELECT
      1
    FROM
      public.recipes r
    WHERE
      r.id = recipe_id AND (r.created_by = auth.uid () OR public.is_request_user_admin ())))
  WITH CHECK (EXISTS (
    SELECT
      1
    FROM
      public.recipes r
    WHERE
      r.id = recipe_id AND (r.created_by = auth.uid () OR public.is_request_user_admin ())));

CREATE POLICY "tags_select_all" ON public.tags
  FOR SELECT
  USING (TRUE);

CREATE POLICY "tags_insert_authenticated" ON public.tags
  FOR INSERT
  WITH CHECK (auth.uid () IS NOT NULL);

CREATE POLICY "recipe_tags_select_all" ON public.recipe_tags
  FOR SELECT
  USING (TRUE);

CREATE POLICY "recipe_tags_write_if_recipe_owner" ON public.recipe_tags
  FOR ALL
  USING (EXISTS (
    SELECT
      1
    FROM
      public.recipes r
    WHERE
      r.id = recipe_id AND (r.created_by = auth.uid () OR public.is_request_user_admin ())))
  WITH CHECK (EXISTS (
    SELECT
      1
    FROM
      public.recipes r
    WHERE
      r.id = recipe_id AND (r.created_by = auth.uid () OR public.is_request_user_admin ())));

CREATE POLICY "wine_pairings_select_all" ON public.wine_pairings
  FOR SELECT
  USING (TRUE);

CREATE POLICY "wine_pairings_write_if_recipe_owner" ON public.wine_pairings
  FOR ALL
  USING (EXISTS (
    SELECT
      1
    FROM
      public.recipes r
    WHERE
      r.id = recipe_id AND (r.created_by = auth.uid () OR public.is_request_user_admin ())))
  WITH CHECK (EXISTS (
    SELECT
      1
    FROM
      public.recipes r
    WHERE
      r.id = recipe_id AND (r.created_by = auth.uid () OR public.is_request_user_admin ())));

CREATE POLICY "cookbooks_select_all" ON public.cookbooks
  FOR SELECT
  USING (TRUE);

CREATE POLICY "cookbooks_insert_owner" ON public.cookbooks
  FOR INSERT
  WITH CHECK (auth.uid () IS NOT NULL AND created_by = auth.uid ());

CREATE POLICY "cookbooks_update_owner_or_admin" ON public.cookbooks
  FOR UPDATE
  USING (created_by = auth.uid () OR public.is_request_user_admin ());

CREATE POLICY "cookbooks_delete_owner_or_admin" ON public.cookbooks
  FOR DELETE
  USING (created_by = auth.uid () OR public.is_request_user_admin ());

CREATE POLICY "events_insert_authenticated_or_anon_null_user" ON public.events
  FOR INSERT
  WITH CHECK (CASE WHEN auth.uid () IS NULL THEN
      user_id IS NULL
    WHEN auth.uid () IS NOT NULL THEN
      user_id IS NULL
      OR user_id = auth.uid ()
    ELSE
      FALSE
    END);

CREATE POLICY "events_select_own_or_admin" ON public.events
  FOR SELECT
  USING (user_id = auth.uid ()
    OR public.is_request_user_admin ());

CREATE POLICY "affiliate_clicks_insert_any" ON public.affiliate_clicks
  FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "affiliate_clicks_select_admin" ON public.affiliate_clicks
  FOR SELECT
  USING (public.is_request_user_admin ());

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

INSERT INTO public.allergens (name)
  VALUES ('peanuts'),
('tree nuts'),
('milk'),
('eggs'),
('soy'),
('wheat'),
('fish'),
('shellfish'),
('sesame'),
('mustard'),
('sulfites'),
('gluten'),
('celery'),
('lupin'),
('corn');

COMMENT ON TABLE public.profiles IS 'plan_type and is_admin protected from non-admin updates via trigger.';
COMMENT ON FUNCTION public.is_request_user_admin () IS 'SECURITY DEFINER helper for RLS; service role still bypasses RLS for admin backends.';
