-- Add Stripe customer/subscription identifiers to profiles for billing sync.
-- The Stripe webhook (service role) is the only writer for these columns and plan_type;
-- end users cannot change them through the standard authenticated client.
--
-- Idempotent so repeated CI runs are safe.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

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
      AND c.conname = 'profiles_stripe_customer_id_key') THEN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_stripe_customer_id_key UNIQUE (stripe_customer_id);
END IF;
END
$$;

CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

COMMENT ON COLUMN public.profiles.stripe_customer_id IS
  'Stripe Customer id; written only by service role (webhook).';
COMMENT ON COLUMN public.profiles.stripe_subscription_id IS
  'Most recent Stripe Subscription id; written only by service role (webhook). Null when no active subscription.';

-- Re-create the privileged-column protection trigger to (a) cover the new
-- stripe_* columns and (b) bypass when the request runs as service_role
-- (Stripe webhook server-side). auth.role() returns 'service_role' for the
-- service role JWT and 'authenticated'/'anon' otherwise.
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

  -- Service role (Stripe webhook) is the only writer for billing sync.
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
  END IF;
  RETURN NEW;
END;
$$;
