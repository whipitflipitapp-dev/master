-- Canonical demo recipe cover URLs matching files in `public/recipes/`.
-- Idempotent; reconciles older migration paths (e.g. demo-salmon.jpg) with repo assets.

UPDATE public.recipes
SET
  image_url = '/recipes/demo-beef-ribs.jpg'
WHERE
  id = 'e2a7c0d1-5b3e-4a11-8f00-000000000001'::uuid
  AND image_url IS DISTINCT FROM '/recipes/demo-beef-ribs.jpg';

UPDATE public.recipes
SET
  image_url = '/recipes/demo-salmon-rosemary.jpg'
WHERE
  id = 'e2a7c0d1-5b3e-4a11-8f00-000000000002'::uuid
  AND image_url IS DISTINCT FROM '/recipes/demo-salmon-rosemary.jpg';

UPDATE public.recipes
SET
  image_url = '/recipes/demo-brazilian-chicken-rice.jpg'
WHERE
  id = 'e2a7c0d1-5b3e-4a11-8f00-000000000003'::uuid
  AND image_url IS DISTINCT FROM '/recipes/demo-brazilian-chicken-rice.jpg';
