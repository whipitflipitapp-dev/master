-- Browse: keep seeded demo recipes visible (same UUIDs as 20260511140000_seed_demo_recipes.sql).
-- Previously ORDER BY created_at DESC only surfaced the N newest rows, so demos disappeared
-- once any newer user recipes existed.

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
    (r.id = ANY (ARRAY[
      'e2a7c0d1-5b3e-4a11-8f00-000000000001'::uuid,
      'e2a7c0d1-5b3e-4a11-8f00-000000000002'::uuid,
      'e2a7c0d1-5b3e-4a11-8f00-000000000003'::uuid
    ])) DESC,
    r.created_at DESC,
    r.id ASC
  LIMIT greatest(1, coalesce(p_limit, 24));
$$;

REVOKE ALL ON FUNCTION public.list_recipes_for_browse (integer, text, uuid[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.list_recipes_for_browse (integer, text, uuid[]) TO anon,
  authenticated;
