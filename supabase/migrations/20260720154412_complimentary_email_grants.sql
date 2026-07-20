-- Pre-signup complimentary plan invites: admin adds email + tier; applied on first session (service role).

CREATE TABLE IF NOT EXISTS public.complimentary_email_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  email text NOT NULL,
  plan_type text NOT NULL DEFAULT 'pro',
  note text,
  created_at timestamptz NOT NULL DEFAULT now (),
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  redeemed_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL
);

ALTER TABLE public.complimentary_email_grants
  DROP CONSTRAINT IF EXISTS complimentary_email_grants_plan_type_check;

ALTER TABLE public.complimentary_email_grants
  ADD CONSTRAINT complimentary_email_grants_plan_type_check CHECK (
    plan_type IN ('free', 'pro', 'ai_chef')
  );

CREATE UNIQUE INDEX IF NOT EXISTS complimentary_email_grants_pending_email_idx ON public.complimentary_email_grants (
  lower(trim(email))
)
WHERE
  redeemed_at IS NULL;

COMMENT ON TABLE public.complimentary_email_grants IS
  'Pending complimentary tiers by email; redeemed when the user signs in (service-role redeem RPC).';

ALTER TABLE public.complimentary_email_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "complimentary_email_grants_admin_all" ON public.complimentary_email_grants;

CREATE POLICY "complimentary_email_grants_admin_all" ON public.complimentary_email_grants
  FOR ALL
  USING (public.is_request_user_admin ())
  WITH CHECK (public.is_request_user_admin ());

CREATE OR REPLACE FUNCTION public.try_redeem_complimentary_grant_for_user (p_user_id uuid)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, auth
  AS $$
DECLARE
  v_email text;
  v_grant_id uuid;
  v_plan text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  SELECT
    u.email INTO v_email
  FROM
    auth.users u
  WHERE
    u.id = p_user_id;
  IF v_email IS NULL OR trim(v_email) = '' THEN
    RETURN FALSE;
  END IF;
  SELECT
    g.id,
    g.plan_type INTO v_grant_id,
    v_plan
  FROM
    public.complimentary_email_grants g
  WHERE
    lower(trim(g.email)) = lower(trim(v_email))
    AND g.redeemed_at IS NULL
  ORDER BY
    g.created_at ASC
  LIMIT 1
  FOR UPDATE;
  IF v_grant_id IS NULL THEN
    RETURN FALSE;
  END IF;
  UPDATE
    public.profiles
  SET
    plan_type = v_plan,
    plan_billing_source = 'complimentary',
    pending_plan_type = NULL,
    plan_change_effective_at = NULL
  WHERE
    id = p_user_id;
  UPDATE
    public.complimentary_email_grants
  SET
    redeemed_at = now(),
    redeemed_by = p_user_id
  WHERE
    id = v_grant_id;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.try_redeem_complimentary_grant_for_user (uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.try_redeem_complimentary_grant_for_user (uuid) TO service_role;

COMMENT ON FUNCTION public.try_redeem_complimentary_grant_for_user (uuid) IS
  'Apply pending complimentary grant for auth.users email; call with service_role (profile plan trigger).';

CREATE OR REPLACE FUNCTION public.auth_user_id_for_email (p_email text)
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = auth, public
  AS $$
  SELECT
    u.id
  FROM
    auth.users u
  WHERE
    lower(trim(u.email)) = lower(trim(p_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.auth_user_id_for_email (text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.auth_user_id_for_email (text) TO service_role;
