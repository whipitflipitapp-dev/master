-- Admin moderation: account bans, email blocklist, recipe moderation, complimentary plan grants.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned_at timestamptz,
  ADD COLUMN IF NOT EXISTS ban_reason text,
  ADD COLUMN IF NOT EXISTS banned_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_billing_source text NOT NULL DEFAULT 'self';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_billing_source_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_billing_source_check CHECK (
    plan_billing_source IN ('self', 'complimentary')
  );

COMMENT ON COLUMN public.profiles.plan_billing_source IS
  'complimentary = plan_type managed by admin (chef grants); Stripe webhooks must not overwrite plan_type.';

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS moderation_reason text,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

ALTER TABLE public.recipes
  DROP CONSTRAINT IF EXISTS recipes_moderation_status_check;

ALTER TABLE public.recipes
  ADD CONSTRAINT recipes_moderation_status_check CHECK (
    moderation_status IN ('published', 'hidden', 'removed')
  );

CREATE INDEX IF NOT EXISTS recipes_moderation_status_idx ON public.recipes (moderation_status);

CREATE TABLE IF NOT EXISTS public.banned_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  email text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now (),
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS banned_emails_email_lower_idx ON public.banned_emails (lower(trim(email)));

ALTER TABLE public.banned_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "banned_emails_admin_all" ON public.banned_emails;

CREATE POLICY "banned_emails_admin_all" ON public.banned_emails
  FOR ALL
  USING (public.is_request_user_admin ())
  WITH CHECK (public.is_request_user_admin ());

DROP POLICY IF EXISTS "recipes_select_public" ON public.recipes;

CREATE POLICY "recipes_select_moderated" ON public.recipes
  FOR SELECT
  USING (
    moderation_status = 'published'
    OR created_by = auth.uid ()
    OR public.is_request_user_admin ());

-- Browse RPC: hide non-published recipes from public catalog.
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
  WHERE
    r.moderation_status = 'published'
    AND (p_title_search IS NULL
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
    AND (p_tag_names IS NULL
      OR cardinality(p_tag_names) = 0
      OR EXISTS (
        SELECT
          1
        FROM
          public.recipe_tags rt
          JOIN public.tags t ON t.id = rt.tag_id
        WHERE
          rt.recipe_id = r.id
          AND lower(t.name) = ANY (
            SELECT
              lower(trim(x))
            FROM
              unnest(p_tag_names) AS x)))
  ORDER BY
    CASE WHEN r.video_url IS NOT NULL AND r.video_url ~* 'instagram\.com/(reel|reels|p)/' THEN
      0
    ELSE
      1
    END,
    r.favorites_count DESC,
    r.created_at DESC
  LIMIT greatest(1, least(coalesce(p_limit, 24), 100));
$$;

REVOKE ALL ON FUNCTION public.list_recipes_for_browse (integer, text, uuid[], text[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.list_recipes_for_browse (integer, text, uuid[], text[]) TO anon,
  authenticated;

CREATE OR REPLACE FUNCTION public.normalize_banned_email (p_email text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  AS $$
  SELECT
    lower(trim(p_email));
$$;

CREATE OR REPLACE FUNCTION public.is_email_banned (p_email text)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT
    EXISTS (
      SELECT
        1
      FROM
        public.banned_emails b
      WHERE
        lower(trim(b.email)) = public.normalize_banned_email (p_email));
$$;

REVOKE ALL ON FUNCTION public.is_email_banned (text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_email_banned (text) TO anon,
  authenticated;

CREATE OR REPLACE FUNCTION public.admin_search_users (
  p_query text,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
  RETURNS TABLE (
    id uuid,
    email text,
    display_name text,
    plan_type text,
    plan_billing_source text,
    is_admin boolean,
    banned_at timestamptz,
    ban_reason text,
    created_at timestamptz
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  IF NOT public.is_request_user_admin () THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT
    p.id,
    u.email::text,
    p.display_name,
    p.plan_type,
    p.plan_billing_source,
    p.is_admin,
    p.banned_at,
    p.ban_reason,
    p.created_at
  FROM
    public.profiles p
    JOIN auth.users u ON u.id = p.id
  WHERE
    p_query IS NULL
    OR trim(p_query) = ''
    OR u.email ILIKE ('%' || trim(p_query) || '%')
    OR coalesce(p.display_name, '') ILIKE ('%' || trim(p_query) || '%')
    OR p.id::text = trim(p_query)
  ORDER BY
    p.created_at DESC
  LIMIT greatest(1, least(coalesce(p_limit, 25), 100))
  OFFSET greatest(0, coalesce(p_offset, 0));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_search_recipes (
  p_query text,
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
  RETURNS TABLE (
    id uuid,
    title text,
    moderation_status text,
    moderation_reason text,
    created_by uuid,
    creator_email text,
    created_at timestamptz
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  IF NOT public.is_request_user_admin () THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT
    r.id,
    r.title,
    r.moderation_status,
    r.moderation_reason,
    r.created_by,
    u.email::text AS creator_email,
    r.created_at
  FROM
    public.recipes r
    LEFT JOIN auth.users u ON u.id = r.created_by
  WHERE (p_status IS NULL
    OR trim(p_status) = ''
    OR r.moderation_status = trim(p_status))
  AND (p_query IS NULL
    OR trim(p_query) = ''
    OR r.title ILIKE ('%' || trim(p_query) || '%')
    OR r.id::text = trim(p_query))
  ORDER BY
    r.created_at DESC
  LIMIT greatest(1, least(coalesce(p_limit, 25), 100))
  OFFSET greatest(0, coalesce(p_offset, 0));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_search_users (text, integer, integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_search_recipes (text, text, integer, integer) TO authenticated;
