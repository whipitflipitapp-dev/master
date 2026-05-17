-- Remove starter browse seed from 20260517140000_seed_starter_recipes_100.sql
-- (and follow-ups 20260517141000 / 20260517142000).
-- Fixed UUID prefix c0ffe000-0000-4000-8000-000001 … 000100; child rows CASCADE.
-- Safe to re-run: deletes only starter-prefix rows and orphan starter cover paths.

DELETE FROM public.recipes
WHERE
  id::text ~ '^c0ffe000-0000-4000-8000-[0-9a-f]+$';

-- Orphans from an older seed pass (duplicate titles before dedupe) that kept starter JPEG paths.
DELETE FROM public.recipes
WHERE
  image_url LIKE '/recipes/starter-%'
  AND id::text !~ '^e2a7c0d1-5b3e-4a11-8f00-';
