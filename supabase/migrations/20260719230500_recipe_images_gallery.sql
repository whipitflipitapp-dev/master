-- Multi-photo gallery per recipe (thumbnail remains recipes.image_url = first photo).

CREATE TABLE public.recipe_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes (id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recipe_images_url_nonempty CHECK (length(btrim(image_url)) > 0),
  CONSTRAINT recipe_images_sort_order_range CHECK (sort_order >= 0 AND sort_order < 50)
);

CREATE UNIQUE INDEX recipe_images_recipe_sort_idx ON public.recipe_images (recipe_id, sort_order);

CREATE INDEX recipe_images_recipe_id_idx ON public.recipe_images (recipe_id);

ALTER TABLE public.recipe_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipe_images_select_all" ON public.recipe_images
  FOR SELECT
  USING (TRUE);

CREATE POLICY "recipe_images_write_if_recipe_owner" ON public.recipe_images
  FOR ALL
  USING (EXISTS (
    SELECT
      1
    FROM
      public.recipes r
    WHERE
      r.id = recipe_id AND (r.created_by = auth.uid () OR public.is_request_user_admin ())))
  WITH CHECK (EXISTS (
    SELECT
      1
    FROM
      public.recipes r
    WHERE
      r.id = recipe_id AND (r.created_by = auth.uid () OR public.is_request_user_admin ())));

INSERT INTO public.recipe_images (recipe_id, image_url, sort_order)
SELECT
  r.id,
  btrim(r.image_url),
  0
FROM
  public.recipes r
WHERE
  r.image_url IS NOT NULL
  AND btrim(r.image_url) <> ''
  AND NOT EXISTS (
    SELECT
      1
    FROM
      public.recipe_images ri
    WHERE
      ri.recipe_id = r.id);
