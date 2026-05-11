-- Track first-run onboarding (allergies + plan awareness). NULL = not finished.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

COMMENT ON COLUMN public.profiles.onboarding_completed_at IS
  'Set when the user finishes or skips onboarding; NULL triggers redirect from proxy.';

-- Existing users: do not force onboarding retroactively.
UPDATE public.profiles
SET
  onboarding_completed_at = COALESCE(onboarding_completed_at, now())
WHERE
  onboarding_completed_at IS NULL;
