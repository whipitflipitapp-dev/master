-- Extend admin_metrics_overview with plan mix, product growth, and engagement series.

CREATE OR REPLACE FUNCTION public.admin_metrics_overview (
  p_since timestamptz DEFAULT (timezone ('utc', now()) - INTERVAL '7 days'))
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_signups_start timestamptz := timezone ('utc', now()) - INTERVAL '29 days';
  v_ai_types text[] := ARRAY[
    'ai_recipe_generated',
    'ai_substitution_suggested',
    'ai_vision_ingredients',
    'ai_camera_check_in',
    'ai_cooking_assistant_answered',
    'ai_wine_pairings_generated'
  ];
BEGIN
  IF NOT public.is_request_user_admin () THEN
    RAISE EXCEPTION 'not authorized'
      USING ERRCODE = '42501';
  END IF;

  RETURN json_build_object(
    'profile_count',
    (
      SELECT
        COUNT (*)::bigint
      FROM public.profiles),
    'recipe_count',
    (
      SELECT
        COUNT (*)::bigint
      FROM public.recipes),
    'favorites_total',
    (
      SELECT
        COUNT (*)::bigint
      FROM public.favorites),
    'events_since_count',
    (
      SELECT
        COUNT (*)::bigint
      FROM public.events e
      WHERE
        e.created_at >= p_since),
    'affiliate_clicks_since',
    (
      SELECT
        COUNT (*)::bigint
      FROM public.affiliate_clicks ac
      WHERE
        ac.created_at >= p_since),
    'plan_free_count',
    (
      SELECT
        COUNT (*)::bigint
      FROM public.profiles p
      WHERE
        COALESCE(p.plan_type, 'free') = 'free'),
    'plan_pro_count',
    (
      SELECT
        COUNT (*)::bigint
      FROM public.profiles p
      WHERE
        p.plan_type = 'pro'),
    'plan_ai_chef_count',
    (
      SELECT
        COUNT (*)::bigint
      FROM public.profiles p
      WHERE
        p.plan_type = 'ai_chef'),
    'stripe_customer_count',
    (
      SELECT
        COUNT (*)::bigint
      FROM public.profiles p
      WHERE
        p.stripe_customer_id IS NOT NULL
        AND btrim(p.stripe_customer_id) <> ''),
    'recipes_created_since',
    (
      SELECT
        COUNT (*)::bigint
      FROM public.recipes r
      WHERE
        r.created_at >= p_since),
    'recipe_views_since',
    (
      SELECT
        COUNT (*)::bigint
      FROM public.events e
      WHERE
        e.created_at >= p_since
        AND e.event_type = 'recipe_viewed'),
    'checkout_started_since',
    (
      SELECT
        COUNT (*)::bigint
      FROM public.events e
      WHERE
        e.created_at >= p_since
        AND e.event_type = 'checkout_started'),
    'ai_events_since',
    (
      SELECT
        COUNT (*)::bigint
      FROM public.events e
      WHERE
        e.created_at >= p_since
        AND e.event_type = ANY (v_ai_types)),
    'instagram_reel_recipe_count',
    (
      SELECT
        COUNT (*)::bigint
      FROM public.recipes r
      WHERE
        r.video_url ILIKE '%instagram.com/reel/%'),
    'suggestions_open_count',
    (
      SELECT
        COUNT (*)::bigint
      FROM public.suggestions s
      WHERE
        s.status = 'new'),
    'suggestions_total_count',
    (
      SELECT
        COUNT (*)::bigint
      FROM public.suggestions),
    'event_types_since',
    COALESCE (
      (
        SELECT
          json_agg (row_to_json (q))
        FROM (
          SELECT
            t.event_type,
            t.ct AS count
          FROM (
            SELECT
              e.event_type,
              COUNT (*)::bigint AS ct
            FROM
              public.events e
            WHERE
              e.created_at >= p_since
            GROUP BY
              e.event_type) t
          ORDER BY
            t.ct DESC) q),
      '[]'::json),
    'ai_event_types_since',
    COALESCE (
      (
        SELECT
          json_agg (row_to_json (q))
        FROM (
          SELECT
            t.event_type,
            t.ct AS count
          FROM (
            SELECT
              e.event_type,
              COUNT (*)::bigint AS ct
            FROM
              public.events e
            WHERE
              e.created_at >= p_since
              AND e.event_type = ANY (v_ai_types)
            GROUP BY
              e.event_type) t
          ORDER BY
            t.ct DESC) q),
      '[]'::json),
    'user_signups_by_day',
    COALESCE (
      (
        SELECT
          json_agg (row_to_json (s))
        FROM (
          SELECT
            (timezone ('utc', p.created_at))::date AS day,
            COUNT (*)::bigint AS count
          FROM
            public.profiles p
          WHERE
            p.created_at >= v_signups_start
          GROUP BY
            (timezone ('utc', p.created_at))::date
          ORDER BY
            (timezone ('utc', p.created_at))::date ASC) s),
      '[]'::json),
    'recipes_created_by_day',
    COALESCE (
      (
        SELECT
          json_agg (row_to_json (s))
        FROM (
          SELECT
            (timezone ('utc', r.created_at))::date AS day,
            COUNT (*)::bigint AS count
          FROM
            public.recipes r
          WHERE
            r.created_at >= v_signups_start
          GROUP BY
            (timezone ('utc', r.created_at))::date
          ORDER BY
            (timezone ('utc', r.created_at))::date ASC) s),
      '[]'::json),
    'recipe_views_by_day',
    COALESCE (
      (
        SELECT
          json_agg (row_to_json (s))
        FROM (
          SELECT
            (timezone ('utc', e.created_at))::date AS day,
            COUNT (*)::bigint AS count
          FROM
            public.events e
          WHERE
            e.created_at >= v_signups_start
            AND e.event_type = 'recipe_viewed'
          GROUP BY
            (timezone ('utc', e.created_at))::date
          ORDER BY
            (timezone ('utc', e.created_at))::date ASC) s),
      '[]'::json));
END;
$$;

COMMENT ON FUNCTION public.admin_metrics_overview(timestamptz) IS
  'Aggregate admin + business metrics; requires authenticated admin (is_request_user_admin).';
