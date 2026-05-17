-- Scheduled plan downgrades (effective at Stripe subscription period end).
-- Written only by service role (webhook + billing server actions).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pending_plan_type text,
  ADD COLUMN IF NOT EXISTS plan_change_effective_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE
      n.nspname = 'public'
      AND t.relname = 'profiles'
      AND c.conname = 'profiles_pending_plan_type_check') THEN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_pending_plan_type_check CHECK (
      pending_plan_type IS NULL
      OR pending_plan_type IN ('free', 'pro', 'ai_chef'));
END IF;
END
$$;

COMMENT ON COLUMN public.profiles.pending_plan_type IS
  'Plan tier after the current billing period when a downgrade is scheduled; null when none.';
COMMENT ON COLUMN public.profiles.plan_change_effective_at IS
  'UTC timestamp when pending_plan_type takes effect; null when none.';

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns ()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  actor_admin boolean;
  actor_role text;
BEGIN
  actor_role := COALESCE(auth.role(), '');

  IF actor_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT
    COALESCE(is_admin, FALSE)
  INTO actor_admin
  FROM
    public.profiles
  WHERE
    id = auth.uid ();

  IF actor_admin IS DISTINCT FROM TRUE THEN
    NEW.is_admin := OLD.is_admin;
    NEW.plan_type := OLD.plan_type;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.stripe_subscription_id := OLD.stripe_subscription_id;
    NEW.pending_plan_type := OLD.pending_plan_type;
    NEW.plan_change_effective_at := OLD.plan_change_effective_at;
  END IF;
  RETURN NEW;
END;
$$;
