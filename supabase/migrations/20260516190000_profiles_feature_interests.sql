-- Onboarding: which product capabilities appeal to the user (multi-select).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS feature_interests text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.profiles.feature_interests IS 'Onboarding survey: feature appeal checkboxes (upload recipes, pantry match, cookbook, AI Chef, favorites).';
