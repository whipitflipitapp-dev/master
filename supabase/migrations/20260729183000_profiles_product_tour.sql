-- Feature tour: show at most twice until completed (dismiss_count < 2).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS product_tour_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS product_tour_dismiss_count smallint NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_product_tour_dismiss_count_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_product_tour_dismiss_count_check CHECK (
    product_tour_dismiss_count >= 0
    AND product_tour_dismiss_count <= 2
  );

COMMENT ON COLUMN public.profiles.product_tour_completed_at IS
  'When the user finished the in-app feature tour.';
COMMENT ON COLUMN public.profiles.product_tour_dismiss_count IS
  'How many times the user dismissed the tour before completing (max 2 prompts).';
