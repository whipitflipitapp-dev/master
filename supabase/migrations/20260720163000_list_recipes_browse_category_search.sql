-- Browse search: match recipe category tags (tags.name), not only title.

DROP FUNCTION IF EXISTS public.list_recipes_for_browse (integer, text, uuid[], text[]);

CREATE OR REPLACE FUNCTION public.list_recipes_for_browse(
  p_limit integer,
  p_title_search text,
  p_exclude_allergen_ids uuid[],
  p_tag_names text[] DEFAULT NULL
)
  RETURNS TABLE (
    id uuid,
    title text,
    image_url text,
    video_url text,
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
    r.video_url,
    r.favorites_count,
    r.difficulty,
    r.cook_time_minutes,
    r.created_at
  FROM
    public.recipes r
  WHERE (p_title_search IS NULL
    OR trim(p_title_search) = ''
    OR r.title ILIKE ('%' || trim(p_title_search) || '%')
    OR EXISTS (
      SELECT
        1
      FROM
        public.recipe_tags rt
        INNER JOIN public.tags t ON t.id = rt.tag_id
      WHERE
        rt.recipe_id = r.id
        AND (
          t.name ILIKE ('%' || trim(p_title_search) || '%')
          OR lower(regexp_replace(trim(p_title_search), '[\s-]+', '_', 'g')) = lower(t.name))))
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
  AND (p_tag_names IS NULL
    OR cardinality(p_tag_names) = 0
    OR EXISTS (
      SELECT
        1
      FROM
        public.recipe_tags rt
        INNER JOIN public.tags t ON t.id = rt.tag_id
      WHERE
        rt.recipe_id = r.id
        AND t.name = ANY (p_tag_names)))
  ORDER BY
    (r.id = ANY (ARRAY[
      'e2a7c0d1-5b3e-4a11-8f00-000000000001'::uuid,
      'e2a7c0d1-5b3e-4a11-8f00-000000000002'::uuid,
      'e2a7c0d1-5b3e-4a11-8f00-000000000003'::uuid
    ])) DESC,
    (r.video_url ILIKE '%instagram.com/reel/%') DESC,
    r.created_at DESC,
    r.id ASC
  LIMIT greatest(1, coalesce(p_limit, 24));
$$;

REVOKE ALL ON FUNCTION public.list_recipes_for_browse (integer, text, uuid[], text[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.list_recipes_for_browse (integer, text, uuid[], text[]) TO anon,
  authenticated;
