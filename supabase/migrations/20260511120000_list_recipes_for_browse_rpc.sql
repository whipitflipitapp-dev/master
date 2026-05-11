-- Browse recipes with optional title search and allergen exclusion.
-- Runs server-side so filters are not serialized into a long GET URL (avoids proxy / URL limits).

CREATE OR REPLACE FUNCTION public.list_recipes_for_browse(
  p_limit integer,
  p_title_search text,
  p_exclude_allergen_ids uuid[]
)
  RETURNS TABLE (
    id uuid,
    title text,
    image_url text,
    favorites_count integer,
    difficulty text,
    cook_time_minutes integer,
    created_at timestamptz
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT
    r.id,
    r.title,
    r.image_url,
    r.favorites_count,
    r.difficulty,
    r.cook_time_minutes,
    r.created_at
  FROM
    public.recipes r
  WHERE (p_title_search IS NULL
    OR trim(p_title_search) = ''
    OR r.title ILIKE ('%' || trim(p_title_search) || '%'))
  AND (p_exclude_allergen_ids IS NULL
    OR cardinality(p_exclude_allergen_ids) = 0
    OR NOT EXISTS (
      SELECT
        1
      FROM
        public.recipe_allergens ra
      WHERE
        ra.recipe_id = r.id
        AND ra.allergen_id = ANY (p_exclude_allergen_ids)))
  ORDER BY
    r.created_at DESC
  LIMIT greatest(1, coalesce(p_limit, 24));
$$;

REVOKE ALL ON FUNCTION public.list_recipes_for_browse (integer, text, uuid[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.list_recipes_for_browse (integer, text, uuid[]) TO anon,
  authenticated;
