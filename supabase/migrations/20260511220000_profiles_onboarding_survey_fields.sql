-- Onboarding survey fields collected after sign-up.
-- All columns are nullable so existing users (with onboarding_completed_at backfilled)
-- keep working without forced reprompts. The protect_profile_privileged_columns
-- trigger ignores these new columns, so the standard "update own row" RLS lets
-- users save their own answers.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS birthdate date,
  ADD COLUMN IF NOT EXISTS foods_loved text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS foods_loved_other text,
  ADD COLUMN IF NOT EXISTS cooks_per_week smallint,
  ADD COLUMN IF NOT EXISTS allergy_other text,
  ADD COLUMN IF NOT EXISTS referral_source text;

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
      AND c.conname = 'profiles_cooks_per_week_range_check') THEN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_cooks_per_week_range_check
      CHECK (cooks_per_week IS NULL OR (cooks_per_week BETWEEN 0 AND 7));
END IF;
END
$$;

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
      AND c.conname = 'profiles_birthdate_sanity_check') THEN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_birthdate_sanity_check
      CHECK (birthdate IS NULL OR (birthdate >= DATE '1900-01-01' AND birthdate <= CURRENT_DATE));
END IF;
END
$$;

COMMENT ON COLUMN public.profiles.first_name IS 'Onboarding survey: given name (nullable; sensible default may be derived from display_name).';
COMMENT ON COLUMN public.profiles.last_name IS 'Onboarding survey: family name (nullable).';
COMMENT ON COLUMN public.profiles.birthdate IS 'Onboarding survey: date of birth.';
COMMENT ON COLUMN public.profiles.foods_loved IS 'Onboarding survey: cuisine/food category checkboxes (text[]).';
COMMENT ON COLUMN public.profiles.foods_loved_other IS 'Onboarding survey: free-text foods supplement to foods_loved.';
COMMENT ON COLUMN public.profiles.cooks_per_week IS 'Onboarding survey: days/week the user cooks at home (0–7).';
COMMENT ON COLUMN public.profiles.allergy_other IS 'Onboarding survey: free-text additional allergy info when the user picks "Other".';
COMMENT ON COLUMN public.profiles.referral_source IS 'Onboarding survey: how the user found Whip It Flip It (single label or short text).';
