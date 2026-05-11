-- User preference: strict allergy matching (hide) vs warn (show with banner/badge).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS allergy_mode text NOT NULL DEFAULT 'strict'
    CHECK (allergy_mode IN ('strict', 'warn'));

COMMENT ON COLUMN public.profiles.allergy_mode IS 'strict: exclude conflicting recipes in lists; warn: show with warnings.';
