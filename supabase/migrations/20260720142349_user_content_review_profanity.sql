-- Optional recipe try-it reviews + moderation on community wine blurbs.

ALTER TABLE public.user_recipe_experiences
  ADD COLUMN IF NOT EXISTS review_text text,
  ADD COLUMN IF NOT EXISTS review_moderation_status text NOT NULL DEFAULT 'published';

ALTER TABLE public.user_recipe_experiences
  DROP CONSTRAINT IF EXISTS user_recipe_experiences_review_moderation_status_check;

ALTER TABLE public.user_recipe_experiences
  ADD CONSTRAINT user_recipe_experiences_review_moderation_status_check CHECK (
    review_moderation_status IN ('published', 'pending_review', 'hidden')
  );

ALTER TABLE public.user_recipe_experiences
  DROP CONSTRAINT IF EXISTS user_recipe_experiences_review_text_length_check;

ALTER TABLE public.user_recipe_experiences
  ADD CONSTRAINT user_recipe_experiences_review_text_length_check CHECK (
    review_text IS NULL OR char_length(review_text) <= 2000
  );

ALTER TABLE public.wine_pairings
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'published';

ALTER TABLE public.wine_pairings
  DROP CONSTRAINT IF EXISTS wine_pairings_moderation_status_check;

ALTER TABLE public.wine_pairings
  ADD CONSTRAINT wine_pairings_moderation_status_check CHECK (
    moderation_status IN ('published', 'pending_review', 'hidden')
  );

DROP POLICY IF EXISTS "wine_pairings_select_all" ON public.wine_pairings;

CREATE POLICY "wine_pairings_select_moderated" ON public.wine_pairings
  FOR SELECT
  USING (
    source = 'ai'
    OR moderation_status = 'published'
    OR user_id = auth.uid ()
    OR public.is_request_user_admin ());

COMMENT ON COLUMN public.user_recipe_experiences.review_text IS
  'Optional post-cook review; profanity filter may set review_moderation_status to pending_review.';

COMMENT ON COLUMN public.wine_pairings.moderation_status IS
  'User submissions may be pending_review until language is approved.';
