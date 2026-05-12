-- Point demo seed recipes at bundled hero JPEGs under Next.js `public/recipes/`.
-- Idempotent: fixed UUIDs from 20260511140000_seed_demo_recipes.sql.
--
-- Unsplash License (free use): https://unsplash.com/license
--
-- 1) Beef spare ribs — You Le, "Barbecue ribs with fries and salad"
--    Page: https://unsplash.com/photos/barbecue-ribs-with-fries-and-salad-vEXn-JXxhKU
--    Source file: https://images.unsplash.com/photo-1766050588893-b095ceaef1fb
--
-- 2) Salmon and rosemary — Caroline Attwood, "grilled fish, cooked vegetables, and fork on plate" (salmon-tagged)
--    Page: https://unsplash.com/photos/grilled-fish-cooked-vegetables-and-fork-on-plate-bpPTlXWTOvg
--    Source file: https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2
--
-- 3) Brazilian rice and chicken — Pablo Arroyo, "a pan filled with rice and chicken on top of a table"
--    Page: https://unsplash.com/photos/a-pan-filled-with-rice-and-chicken-on-top-of-a-table-cwbA14iDDP4
--    Source file: https://images.unsplash.com/photo-1714383611437-485d97141913

UPDATE public.recipes
SET
  image_url = '/recipes/demo-beef-ribs.jpg'
WHERE
  id = 'e2a7c0d1-5b3e-4a11-8f00-000000000001'::uuid;

UPDATE public.recipes
SET
  image_url = '/recipes/demo-salmon-rosemary.jpg'
WHERE
  id = 'e2a7c0d1-5b3e-4a11-8f00-000000000002'::uuid;

UPDATE public.recipes
SET
  image_url = '/recipes/demo-brazilian-chicken-rice.jpg'
WHERE
  id = 'e2a7c0d1-5b3e-4a11-8f00-000000000003'::uuid;
