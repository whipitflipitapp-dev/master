-- Last creator upload-badge tier the user dismissed in the level-up celebration splash.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS celebrated_upload_badge_tier text
  CONSTRAINT profiles_celebrated_upload_badge_tier_check CHECK (
    celebrated_upload_badge_tier IS NULL
    OR celebrated_upload_badge_tier IN (
      'tier_1_5',
      'tier_6_10',
      'tier_11_20',
      'tier_21_40',
      'tier_41_50',
      'tier_50_plus'
    )
  );

COMMENT ON COLUMN public.profiles.celebrated_upload_badge_tier IS
  'Highest creator upload-badge tier for which the user dismissed the level-up celebration.';
