-- Public aggregate: users who cooked a recipe and left a rating.

CREATE INDEX user_recipe_experiences_recipe_id_idx ON public.user_recipe_experiences (recipe_id);

CREATE OR REPLACE FUNCTION public.recipe_whip_flip_count (p_recipe_id uuid)
  RETURNS bigint
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT
    count(*)::bigint
  FROM
    public.user_recipe_experiences e
  WHERE
    e.recipe_id = p_recipe_id
    AND e.made_recipe = true
    AND e.rating IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.recipe_whip_flip_count (uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.recipe_whip_flip_count (uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.recipe_whip_flip_count (uuid) IS 'Count of users who marked made_recipe and submitted a rating for the recipe.';
