-- Point demo recipe rows at bundled hero JPEGs in Next.js `public/recipes/`.
-- Unsplash License: https://unsplash.com/license (free for commercial and non-commercial use; attribution appreciated).
-- Source URLs on Unsplash CDN (same photos as the JPEGs in `public/recipes/`):
--   demo-beef-ribs.jpg:     https://images.unsplash.com/photo-1544025162-d76694265947
--   demo-salmon.jpg:        https://images.unsplash.com/photo-1467003909585-2f8a72700288
--   demo-chicken-rice.jpg: https://images.unsplash.com/photo-1596797038530-2c107229654b (one-pan savory meal; illustrative for the seeded “Brazilian rice and chicken” demo)

UPDATE public.recipes
SET
  image_url = '/recipes/demo-beef-ribs.jpg'
WHERE
  id = 'e2a7c0d1-5b3e-4a11-8f00-000000000001'::uuid;

UPDATE public.recipes
SET
  image_url = '/recipes/demo-salmon.jpg'
WHERE
  id = 'e2a7c0d1-5b3e-4a11-8f00-000000000002'::uuid;

UPDATE public.recipes
SET
  image_url = '/recipes/demo-chicken-rice.jpg'
WHERE
  id = 'e2a7c0d1-5b3e-4a11-8f00-000000000003'::uuid;
