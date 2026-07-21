-- Optional cookbook to feature on a recipe detail page (author must own the cookbook).
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS featured_cookbook_id uuid
  REFERENCES public.cookbooks (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS recipes_featured_cookbook_id_idx
  ON public.recipes (featured_cookbook_id)
  WHERE featured_cookbook_id IS NOT NULL;

COMMENT ON COLUMN public.recipes.featured_cookbook_id IS
  'Cookbook affiliate link highlighted on this recipe; must belong to created_by.';
