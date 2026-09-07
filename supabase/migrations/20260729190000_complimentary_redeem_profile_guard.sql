-- Only mark a complimentary grant redeemed when the profile plan update succeeds.

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
  v_updated integer;
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

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RETURN FALSE;
  END IF;

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
