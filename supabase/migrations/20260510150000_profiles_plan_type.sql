-- Ensure profiles.plan_type stays aligned with app tiers (free | pro | ai_chef).
-- Idempotent: safe when 20260510120000_initial_schema.sql already applied.

COMMENT ON COLUMN public.profiles.plan_type IS 'Subscription tier: free | pro | ai_chef.';

UPDATE public.profiles
SET plan_type = 'free'
WHERE plan_type IS NULL OR plan_type NOT IN ('free', 'pro', 'ai_chef');

ALTER TABLE public.profiles
  ALTER COLUMN plan_type SET DEFAULT 'free';

ALTER TABLE public.profiles
  ALTER COLUMN plan_type SET NOT NULL;

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
      AND c.conname = 'profiles_plan_type_check') THEN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_plan_type_check CHECK (plan_type IN ('free', 'pro', 'ai_chef'));
END IF;
END
$$;
