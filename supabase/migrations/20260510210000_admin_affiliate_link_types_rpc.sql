-- Admin: top affiliate link_type breakdown for a rolling window.
-- SECURITY DEFINER + is_request_user_admin() gate so the browser-side
-- anon client (with admin user JWT) can call it without service role.

CREATE OR REPLACE FUNCTION public.admin_affiliate_link_types_recent (
  p_since timestamptz DEFAULT (timezone ('utc', now()) - INTERVAL '7 days'))
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  IF NOT public.is_request_user_admin () THEN
    RAISE EXCEPTION 'not authorized'
      USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE (
    (
      SELECT
        json_agg (row_to_json (q))
      FROM (
        SELECT
          t.link_type,
          t.ct AS count
        FROM (
          SELECT
            ac.link_type,
            COUNT (*)::bigint AS ct
          FROM
            public.affiliate_clicks ac
          WHERE
            ac.created_at >= p_since
          GROUP BY
            ac.link_type) t
        ORDER BY
          t.ct DESC,
          t.link_type ASC
        LIMIT 25) q),
    '[]'::json);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_affiliate_link_types_recent(timestamptz) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_affiliate_link_types_recent(timestamptz) TO authenticated;

COMMENT ON FUNCTION public.admin_affiliate_link_types_recent(timestamptz) IS 'Top affiliate link types since p_since; requires authenticated admin (is_request_user_admin).';
