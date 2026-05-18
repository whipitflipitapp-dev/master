-- Extend atomic recipe creation to include optional recipe metadata saved by the add form.

DROP FUNCTION IF EXISTS public.create_recipe_atomic(
  text,
  text,
  text,
  text,
  jsonb,
  uuid[],
  text[]
);

CREATE OR REPLACE FUNCTION public.create_recipe_atomic(
  p_title text,
  p_instructions text,
  p_image_url text DEFAULT NULL,
  p_video_url text DEFAULT NULL,
  p_difficulty text DEFAULT NULL,
  p_cook_time_minutes integer DEFAULT NULL,
  p_ingredients jsonb DEFAULT '[]'::jsonb,
  p_allergen_ids uuid[] DEFAULT '{}'::uuid[],
  p_tag_names text[] DEFAULT '{}'::text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_recipe_id uuid;
  v_plan_type text;
  v_month_start timestamptz := date_trunc('month', now() AT TIME ZONE 'utc') AT TIME ZONE 'utc';
  v_month_end timestamptz := (date_trunc('month', now() AT TIME ZONE 'utc') + interval '1 month') AT TIME ZONE 'utc';
  v_monthly_count integer;
  v_ingredient_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = 'P0001';
  END IF;

  SELECT p.plan_type
  INTO v_plan_type
  FROM public.profiles p
  WHERE p.id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_required' USING ERRCODE = 'P0001';
  END IF;

  IF COALESCE(v_plan_type, 'free') NOT IN ('pro', 'ai_chef') THEN
    SELECT count(*)::integer
    INTO v_monthly_count
    FROM public.recipes r
    WHERE r.created_by = v_user_id
      AND r.created_at >= v_month_start
      AND r.created_at < v_month_end;

    IF v_monthly_count >= 3 THEN
      RAISE EXCEPTION 'monthly_recipe_limit' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF NULLIF(btrim(COALESCE(p_title, '')), '') IS NULL THEN
    RAISE EXCEPTION 'title_required' USING ERRCODE = 'P0001';
  END IF;

  IF NULLIF(btrim(COALESCE(p_instructions, '')), '') IS NULL THEN
    RAISE EXCEPTION 'instructions_required' USING ERRCODE = 'P0001';
  END IF;

  IF p_difficulty IS NOT NULL AND p_difficulty NOT IN ('easy', 'medium', 'hard') THEN
    RAISE EXCEPTION 'invalid_difficulty' USING ERRCODE = 'P0001';
  END IF;

  IF p_cook_time_minutes IS NOT NULL AND (p_cook_time_minutes < 1 OR p_cook_time_minutes > 1440) THEN
    RAISE EXCEPTION 'invalid_cook_time' USING ERRCODE = 'P0001';
  END IF;

  IF jsonb_typeof(COALESCE(p_ingredients, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'ingredients_must_be_array' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*)::integer
  INTO v_ingredient_count
  FROM jsonb_array_elements(COALESCE(p_ingredients, '[]'::jsonb)) ingredient(value)
  WHERE NULLIF(
    lower(regexp_replace(btrim(COALESCE(ingredient.value ->> 'name', '')), '\s+', ' ', 'g')),
    ''
  ) IS NOT NULL;

  IF v_ingredient_count = 0 THEN
    RAISE EXCEPTION 'ingredients_required' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.recipes (
    title,
    instructions,
    image_url,
    video_url,
    difficulty,
    cook_time_minutes,
    created_by
  )
  VALUES (
    btrim(p_title),
    btrim(p_instructions),
    NULLIF(btrim(COALESCE(p_image_url, '')), ''),
    NULLIF(btrim(COALESCE(p_video_url, '')), ''),
    NULLIF(btrim(COALESCE(p_difficulty, '')), ''),
    p_cook_time_minutes,
    v_user_id
  )
  RETURNING id INTO v_recipe_id;

  WITH input_ingredients AS (
    SELECT DISTINCT ON (name)
      lower(regexp_replace(btrim(COALESCE(elem.value ->> 'name', '')), '\s+', ' ', 'g')) AS name,
      NULLIF(btrim(COALESCE(elem.value ->> 'quantity', '')), '') AS quantity,
      COALESCE((elem.value ->> 'sort_order')::integer, elem.ordinality::integer - 1) AS sort_order
    FROM jsonb_array_elements(COALESCE(p_ingredients, '[]'::jsonb)) WITH ORDINALITY AS elem(value, ordinality)
    WHERE NULLIF(
      lower(regexp_replace(btrim(COALESCE(elem.value ->> 'name', '')), '\s+', ' ', 'g')),
      ''
    ) IS NOT NULL
    ORDER BY name, sort_order
  ),
  upserted_ingredients AS (
    INSERT INTO public.ingredients (name)
    SELECT name
    FROM input_ingredients
    ON CONFLICT (name) DO UPDATE
      SET name = EXCLUDED.name
    RETURNING id, name
  )
  INSERT INTO public.recipe_ingredients (
    recipe_id,
    ingredient_id,
    quantity,
    sort_order
  )
  SELECT
    v_recipe_id,
    ui.id,
    ii.quantity,
    ii.sort_order
  FROM input_ingredients ii
  JOIN upserted_ingredients ui ON ui.name = ii.name
  ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;

  WITH input_tags AS (
    SELECT DISTINCT
      lower(regexp_replace(btrim(tag_name), '\s+', ' ', 'g')) AS name
    FROM unnest(COALESCE(p_tag_names, '{}'::text[])) AS tag_name
    WHERE NULLIF(lower(regexp_replace(btrim(tag_name), '\s+', ' ', 'g')), '') IS NOT NULL
  ),
  upserted_tags AS (
    INSERT INTO public.tags (name)
    SELECT name
    FROM input_tags
    ON CONFLICT (name) DO UPDATE
      SET name = EXCLUDED.name
    RETURNING id, name
  )
  INSERT INTO public.recipe_tags (recipe_id, tag_id)
  SELECT v_recipe_id, ut.id
  FROM input_tags it
  JOIN upserted_tags ut ON ut.name = it.name
  ON CONFLICT (recipe_id, tag_id) DO NOTHING;

  INSERT INTO public.recipe_allergens (recipe_id, allergen_id)
  SELECT DISTINCT v_recipe_id, allergen_id
  FROM unnest(COALESCE(p_allergen_ids, '{}'::uuid[])) AS allergen_id
  WHERE allergen_id IS NOT NULL
  ON CONFLICT (recipe_id, allergen_id) DO NOTHING;

  RETURN v_recipe_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_recipe_atomic(
  text,
  text,
  text,
  text,
  text,
  integer,
  jsonb,
  uuid[],
  text[]
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_recipe_atomic(
  text,
  text,
  text,
  text,
  text,
  integer,
  jsonb,
  uuid[],
  text[]
) TO authenticated;
