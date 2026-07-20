-- Allow auto-flagged recipes awaiting admin review (e.g. profanity scan).

ALTER TABLE public.recipes
  DROP CONSTRAINT IF EXISTS recipes_moderation_status_check;

ALTER TABLE public.recipes
  ADD CONSTRAINT recipes_moderation_status_check CHECK (
    moderation_status IN ('published', 'pending_review', 'hidden', 'removed')
  );

COMMENT ON COLUMN public.recipes.moderation_status IS
  'published = public; pending_review = held for admin (auto or manual); hidden/removed = moderated off-site.';
