-- Tag demo recipes with canonical browse categories (tags.name = category slug).

INSERT INTO public.tags (name)
VALUES
  ('bbq'),
  ('american_comfort'),
  ('seafood'),
  ('mediterranean')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.recipe_tags (recipe_id, tag_id)
SELECT
  'e2a7c0d1-5b3e-4a11-8f00-000000000001'::uuid,
  t.id
FROM
  public.tags t
WHERE
  t.name IN ('bbq', 'american_comfort')
ON CONFLICT (recipe_id, tag_id) DO NOTHING;

INSERT INTO public.recipe_tags (recipe_id, tag_id)
SELECT
  'e2a7c0d1-5b3e-4a11-8f00-000000000002'::uuid,
  t.id
FROM
  public.tags t
WHERE
  t.name IN ('seafood', 'mediterranean')
ON CONFLICT (recipe_id, tag_id) DO NOTHING;

INSERT INTO public.recipe_tags (recipe_id, tag_id)
SELECT
  'e2a7c0d1-5b3e-4a11-8f00-000000000003'::uuid,
  t.id
FROM
  public.tags t
WHERE
  t.name IN ('american_comfort')
ON CONFLICT (recipe_id, tag_id) DO NOTHING;
