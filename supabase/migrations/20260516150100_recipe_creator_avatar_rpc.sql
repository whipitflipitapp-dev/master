-- Browse cards: creator id + avatar for chef profile links and round avatars.
-- Return type changed from (recipe_id, creator_name) — must drop before recreate (42P13).

DROP FUNCTION IF EXISTS public.recipe_creator_names_for(uuid[]);

CREATE OR REPLACE FUNCTION public.recipe_creator_names_for(recipe_ids uuid[])
  RETURNS TABLE (
    recipe_id uuid,
    creator_name text,
    creator_id uuid,
    creator_avatar_url text
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT
    r.id AS recipe_id,
    p.display_name AS creator_name,
    r.created_by AS creator_id,
    p.avatar_url AS creator_avatar_url
  FROM
    public.recipes r
    LEFT JOIN public.profiles p ON p.id = r.created_by
  WHERE
    r.id = ANY (recipe_ids);
$$;

REVOKE ALL ON FUNCTION public.recipe_creator_names_for(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recipe_creator_names_for(uuid[]) TO anon, authenticated;
