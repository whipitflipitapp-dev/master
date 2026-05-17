-- Pro creator analytics: aggregate only the caller's own recipe performance.
-- SECURITY DEFINER is required because recipe views/clicks belong to viewers,
-- not the recipe owner; the function gates by caller plan and recipe ownership.

CREATE INDEX IF NOT EXISTS events_recipe_id_event_type_created_at_idx
  ON public.events ((metadata ->> 'recipe_id'), event_type, created_at DESC)
  WHERE metadata ? 'recipe_id';

CREATE INDEX IF NOT EXISTS affiliate_clicks_recipe_id_link_type_created_at_idx
  ON public.affiliate_clicks (recipe_id, link_type, created_at DESC)
  WHERE recipe_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.creator_analytics_overview (
  p_since timestamptz DEFAULT (timezone ('utc', now()) - INTERVAL '30 days'))
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_user_id uuid := auth.uid ();
  v_plan text;
  v_since timestamptz := COALESCE(p_since, timezone ('utc', now()) - INTERVAL '30 days');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authorized'
      USING ERRCODE = '42501';
  END IF;

  SELECT p.plan_type
  INTO v_plan
  FROM public.profiles p
  WHERE p.id = v_user_id;

  IF COALESCE(v_plan, 'free') NOT IN ('pro', 'ai_chef') THEN
    RETURN jsonb_build_object(
      'locked', TRUE,
      'plan_type', COALESCE(v_plan, 'free'));
  END IF;

  RETURN jsonb_build_object(
    'locked', FALSE,
    'plan_type', v_plan,
    'since', v_since,
    'published_count',
    (
      SELECT COUNT (*)::bigint
      FROM public.recipes r
      WHERE r.created_by = v_user_id
    ),
    'total_views',
    (
      SELECT COUNT (*)::bigint
      FROM public.events e
      JOIN public.recipes r
        ON r.id::text = e.metadata ->> 'recipe_id'
      WHERE r.created_by = v_user_id
        AND e.event_type = 'recipe_viewed'
    ),
    'views_since',
    (
      SELECT COUNT (*)::bigint
      FROM public.events e
      JOIN public.recipes r
        ON r.id::text = e.metadata ->> 'recipe_id'
      WHERE r.created_by = v_user_id
        AND e.event_type = 'recipe_viewed'
        AND e.created_at >= v_since
    ),
    'saves_total',
    (
      SELECT COALESCE(SUM(r.favorites_count), 0)::bigint
      FROM public.recipes r
      WHERE r.created_by = v_user_id
    ),
    'affiliate_clicks_since',
    (
      SELECT COUNT (*)::bigint
      FROM public.affiliate_clicks ac
      JOIN public.recipes r
        ON r.id = ac.recipe_id
      WHERE r.created_by = v_user_id
        AND ac.created_at >= v_since
    ),
    'cookbook_clicks_since',
    (
      SELECT COUNT (*)::bigint
      FROM public.affiliate_clicks ac
      JOIN public.recipes r
        ON r.id = ac.recipe_id
      WHERE r.created_by = v_user_id
        AND ac.link_type = 'cookbook_amazon'
        AND ac.created_at >= v_since
    ),
    'top_recipes',
    COALESCE (
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', q.id,
            'title', q.title,
            'views', q.views,
            'views_since', q.views_since,
            'saves', q.saves,
            'affiliate_clicks_since', q.affiliate_clicks_since)
          ORDER BY q.views DESC, q.saves DESC, q.title ASC)
        FROM (
          SELECT
            r.id,
            r.title,
            r.favorites_count::bigint AS saves,
            COUNT(e.id) FILTER (WHERE e.event_type = 'recipe_viewed')::bigint AS views,
            COUNT(e.id) FILTER (
              WHERE e.event_type = 'recipe_viewed'
                AND e.created_at >= v_since
            )::bigint AS views_since,
            (
              SELECT COUNT (*)::bigint
              FROM public.affiliate_clicks ac
              WHERE ac.recipe_id = r.id
                AND ac.created_at >= v_since
            ) AS affiliate_clicks_since
          FROM public.recipes r
          LEFT JOIN public.events e
            ON r.id::text = e.metadata ->> 'recipe_id'
          WHERE r.created_by = v_user_id
          GROUP BY r.id, r.title, r.favorites_count
          ORDER BY views DESC, saves DESC, r.title ASC
          LIMIT 8
        ) q
      ),
      '[]'::jsonb
    ),
    'views_by_day',
    COALESCE (
      (
        SELECT jsonb_agg(
          jsonb_build_object('day', d.day, 'views', d.views)
          ORDER BY d.day ASC)
        FROM (
          SELECT
            (timezone ('utc', e.created_at))::date AS day,
            COUNT (*)::bigint AS views
          FROM public.events e
          JOIN public.recipes r
            ON r.id::text = e.metadata ->> 'recipe_id'
          WHERE r.created_by = v_user_id
            AND e.event_type = 'recipe_viewed'
            AND e.created_at >= v_since
          GROUP BY (timezone ('utc', e.created_at))::date
          ORDER BY (timezone ('utc', e.created_at))::date ASC
        ) d
      ),
      '[]'::jsonb
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.creator_analytics_overview(timestamptz) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.creator_analytics_overview(timestamptz) TO authenticated;

COMMENT ON FUNCTION public.creator_analytics_overview(timestamptz) IS 'Pro/AI Chef creator analytics for auth.uid() owned recipes only; returns locked for free users.';
