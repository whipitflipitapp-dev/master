-- Standalone demo recipe seed (idempotent). Same logic as migration 20260511140000_seed_demo_recipes.sql.
-- Use when the remote database has schema from initial migrations but pending seed migration was never applied.
-- Run in Supabase Dashboard → SQL Editor (runs as postgres; bypasses RLS like migrations).
-- Prerequisite: public.allergens must include name 'fish' (seeded in 20260510120000_initial_schema.sql).

INSERT INTO public.ingredients (name)
VALUES
  ('beef spare ribs (3-4 lb rack)'),
  ('kosher salt'),
  ('black pepper freshly ground'),
  ('smoked paprika'),
  ('garlic powder'),
  ('light brown sugar'),
  ('yellow onion'),
  ('garlic cloves'),
  ('low-sodium beef broth'),
  ('dried bay leaves'),
  ('apple cider vinegar'),
  ('skin-on salmon fillets'),
  ('fresh rosemary sprigs'),
  ('lemon'),
  ('extra-virgin olive oil'),
  ('bone-in skin-on chicken thighs'),
  ('long-grain white rice'),
  ('red bell pepper'),
  ('canned diced tomatoes'),
  ('low-sodium chicken broth'),
  ('ground turmeric'),
  ('ground cumin'),
  ('sweet paprika'),
  ('frozen green peas'),
  ('lemon wedges for serving')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.recipes (
  id,
  title,
  instructions,
  image_url,
  video_url,
  favorites_count,
  created_by,
  difficulty,
  cook_time_minutes
)
VALUES (
  'e2a7c0d1-5b3e-4a11-8f00-000000000001'::uuid,
  'Beef spare ribs',
  $instr$1. Pat the ribs dry and remove the silverskin if your butcher has not. Season both sides lightly with kosher salt and pepper; rest 30 minutes at room temperature.

2. Mix smoked paprika, garlic powder, brown sugar, 1 tbsp kosher salt, and 1 tsp black pepper. Rub evenly over the meaty sides.

3. Preheat oven to 300°F (150°C). Slice onion and smash garlic. In a deep oven-safe pot, sear ribs meat-side down in a little oil until deeply browned; flip and sear the bone side briefly.

4. Pour in beef broth to come halfway up the ribs. Add onion, garlic, bay leaves, and vinegar. Cover tightly and braise 2½–3 hours until tender but not falling apart.

5. Rest 15 minutes, tented with foil. Slice between bones and serve with the strained braising juices spooned over.$instr$,
  NULL,
  NULL,
  0,
  NULL,
  'medium',
  210
),
(
  'e2a7c0d1-5b3e-4a11-8f00-000000000002'::uuid,
  'Salmon and rosemary',
  $instr$1. Heat oven to 425°F (220°C). Line a sheet pan with parchment.

2. Rub salmon with olive oil; season flesh with salt and pepper. Tuck a few rosemary leaves under the skin and press more on top with thin lemon slices.

3. Roast 12–16 minutes depending on thickness, until the fish flakes at the thickest part but stays moist in the center.

4. Finish with a squeeze of lemon and a drizzle of fresh olive oil. Serve immediately.$instr$,
  NULL,
  NULL,
  0,
  NULL,
  'easy',
  25
),
(
  'e2a7c0d1-5b3e-4a11-8f00-000000000003'::uuid,
  'Brazilian rice and chicken',
  $instr$A one-pot galinhada / arroz com frango–style dish: chicken, rice, and vegetables cook together so the rice absorbs savory chicken flavor.

1. Season chicken thighs with salt, cumin, sweet paprika, and turmeric. Brown skin-side down in olive oil in a large heavy pot; flip and cook 2 minutes more. Remove.

2. In the same pot, sauté diced onion, bell pepper, and minced garlic until softened. Add tomatoes and cook until jammy.

3. Stir in rice to coat, then nestle chicken on top. Add hot chicken broth (use roughly 1.5× the rice volume by weight—about 3 cups for 2 cups rice—adjust for your pot). Bring to a simmer, cover, and cook on low 18–22 minutes without lifting the lid.

4. Scatter peas on top in the last 3 minutes. Rest off heat 10 minutes. Fluff rice, serve with lemon wedges.$instr$,
  NULL,
  NULL,
  0,
  NULL,
  'medium',
  60
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, sort_order)
VALUES
  ('e2a7c0d1-5b3e-4a11-8f00-000000000001'::uuid, (SELECT id FROM public.ingredients WHERE name = 'beef spare ribs (3-4 lb rack)' LIMIT 1), '1 rack (3-4 lb)', 0),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000001'::uuid, (SELECT id FROM public.ingredients WHERE name = 'kosher salt' LIMIT 1), 'as needed', 1),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000001'::uuid, (SELECT id FROM public.ingredients WHERE name = 'black pepper freshly ground' LIMIT 1), 'as needed', 2),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000001'::uuid, (SELECT id FROM public.ingredients WHERE name = 'smoked paprika' LIMIT 1), '2 tbsp', 3),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000001'::uuid, (SELECT id FROM public.ingredients WHERE name = 'garlic powder' LIMIT 1), '1 tbsp', 4),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000001'::uuid, (SELECT id FROM public.ingredients WHERE name = 'light brown sugar' LIMIT 1), '2 tbsp packed', 5),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000001'::uuid, (SELECT id FROM public.ingredients WHERE name = 'yellow onion' LIMIT 1), '1 large, sliced', 6),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000001'::uuid, (SELECT id FROM public.ingredients WHERE name = 'garlic cloves' LIMIT 1), '6, smashed', 7),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000001'::uuid, (SELECT id FROM public.ingredients WHERE name = 'low-sodium beef broth' LIMIT 1), '4 cups', 8),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000001'::uuid, (SELECT id FROM public.ingredients WHERE name = 'dried bay leaves' LIMIT 1), '3', 9),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000001'::uuid, (SELECT id FROM public.ingredients WHERE name = 'apple cider vinegar' LIMIT 1), '2 tbsp', 10),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000002'::uuid, (SELECT id FROM public.ingredients WHERE name = 'skin-on salmon fillets' LIMIT 1), '4 fillets (6 oz each)', 0),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000002'::uuid, (SELECT id FROM public.ingredients WHERE name = 'extra-virgin olive oil' LIMIT 1), '3 tbsp', 1),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000002'::uuid, (SELECT id FROM public.ingredients WHERE name = 'kosher salt' LIMIT 1), 'to taste', 2),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000002'::uuid, (SELECT id FROM public.ingredients WHERE name = 'black pepper freshly ground' LIMIT 1), 'to taste', 3),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000002'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fresh rosemary sprigs' LIMIT 1), '4 sprigs, leaves picked', 4),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000002'::uuid, (SELECT id FROM public.ingredients WHERE name = 'lemon' LIMIT 1), '1, sliced and for juice', 5),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000002'::uuid, (SELECT id FROM public.ingredients WHERE name = 'garlic cloves' LIMIT 1), '2, thinly sliced', 6),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000003'::uuid, (SELECT id FROM public.ingredients WHERE name = 'bone-in skin-on chicken thighs' LIMIT 1), '6', 0),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000003'::uuid, (SELECT id FROM public.ingredients WHERE name = 'kosher salt' LIMIT 1), 'to taste', 1),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000003'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ground cumin' LIMIT 1), '1 tsp', 2),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000003'::uuid, (SELECT id FROM public.ingredients WHERE name = 'sweet paprika' LIMIT 1), '1 tsp', 3),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000003'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ground turmeric' LIMIT 1), '½ tsp', 4),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000003'::uuid, (SELECT id FROM public.ingredients WHERE name = 'extra-virgin olive oil' LIMIT 1), '3 tbsp', 5),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000003'::uuid, (SELECT id FROM public.ingredients WHERE name = 'yellow onion' LIMIT 1), '1 medium, diced', 6),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000003'::uuid, (SELECT id FROM public.ingredients WHERE name = 'red bell pepper' LIMIT 1), '1, diced', 7),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000003'::uuid, (SELECT id FROM public.ingredients WHERE name = 'garlic cloves' LIMIT 1), '4, minced', 8),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000003'::uuid, (SELECT id FROM public.ingredients WHERE name = 'canned diced tomatoes' LIMIT 1), '1 can (14.5 oz), drained', 9),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000003'::uuid, (SELECT id FROM public.ingredients WHERE name = 'long-grain white rice' LIMIT 1), '2 cups', 10),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000003'::uuid, (SELECT id FROM public.ingredients WHERE name = 'low-sodium chicken broth' LIMIT 1), 'about 3 cups, hot', 11),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000003'::uuid, (SELECT id FROM public.ingredients WHERE name = 'frozen green peas' LIMIT 1), '1 cup', 12),
  ('e2a7c0d1-5b3e-4a11-8f00-000000000003'::uuid, (SELECT id FROM public.ingredients WHERE name = 'lemon wedges for serving' LIMIT 1), 'for serving', 13)
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;

INSERT INTO public.recipe_allergens (recipe_id, allergen_id)
SELECT
  'e2a7c0d1-5b3e-4a11-8f00-000000000002'::uuid,
  a.id
FROM
  public.allergens a
WHERE
  a.name = 'fish'
ON CONFLICT (recipe_id, allergen_id) DO NOTHING;
