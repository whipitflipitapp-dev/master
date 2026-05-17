-- Distinct cover path per starter recipe (public/recipes/starter-001.jpg … starter-100.jpg).
-- JPEGs are not committed; add files locally or run: node scripts/fetch-starter-recipe-covers.mjs
-- See src/lib/demo-recipe-cover-images.ts for UUID → path fallback when image_url is blank.

UPDATE public.recipes
SET image_url = '/recipes/starter-' || lpad(split_part(id::text, '-', 5)::int::text, 3, '0') || '.jpg'
WHERE id::text ~ '^c0ffe000-0000-4000-8000-[0-9a-f]+$'
  AND split_part(id::text, '-', 5)::int BETWEEN 1 AND 100;
