-- Public-facing creator names for recipes without exposing full profiles rows to anon users.
CREATE OR REPLACE FUNCTION public.recipe_creator_names_for(recipe_ids uuid[])
  RETURNS TABLE (
    recipe_id uuid,
    creator_name text
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT
    r.id AS recipe_id,
    p.display_name AS creator_name
  FROM
    public.recipes r
    LEFT JOIN public.profiles p ON p.id = r.created_by
  WHERE
    r.id = ANY (recipe_ids);
$$;

REVOKE ALL ON FUNCTION public.recipe_creator_names_for(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recipe_creator_names_for(uuid[]) TO anon, authenticated;
