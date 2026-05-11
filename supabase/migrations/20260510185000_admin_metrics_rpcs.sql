-- Admin dashboards: SECURITY DEFINER aggregates gated by public.is_request_user_admin().
-- Use from server-side Supabase anon client with authenticated admin JWT (no service role in browser).

CREATE OR REPLACE FUNCTION public.admin_metrics_overview (
  p_since timestamptz DEFAULT (timezone ('utc', now()) - INTERVAL '7 days'))
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_signups_start timestamptz := timezone ('utc', now()) - INTERVAL '29 days';
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
      '[]'::json));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_recent_events (
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_lim integer := LEAST (GREATEST (p_limit, 1), 200);
  v_off integer := GREATEST (p_offset, 0);
BEGIN
  IF NOT public.is_request_user_admin () THEN
    RAISE EXCEPTION 'not authorized'
      USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE (
    (
      SELECT
        jsonb_agg (
          jsonb_build_object(
            'id', q.id, 'user_id', q.user_id, 'event_type', q.event_type,
            'metadata', q.metadata, 'created_at', q.created_at)
          ORDER BY
            q.created_at DESC)
      FROM (
        SELECT
          ev.id,
          ev.user_id,
          ev.event_type,
          ev.metadata,
          ev.created_at
        FROM public.events ev
        ORDER BY
          ev.created_at DESC
        LIMIT v_lim OFFSET v_off) q),
    '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_metrics_overview(timestamptz) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.admin_recent_events(integer, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_metrics_overview(timestamptz) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_recent_events(integer, integer) TO authenticated;

COMMENT ON FUNCTION public.admin_metrics_overview(timestamptz) IS 'Aggregate admin metrics; requires authenticated admin (is_request_user_admin).';

COMMENT ON FUNCTION public.admin_recent_events(integer, integer) IS 'Paginated events for admin tooling; requires authenticated admin (is_request_user_admin).';
