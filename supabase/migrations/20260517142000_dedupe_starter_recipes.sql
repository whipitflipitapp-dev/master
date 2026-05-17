-- Rewrite starter slots that duplicated titles (buildStarterRecipes queue recycling).
-- Keeps lowest-seq row per title; replaces higher-seq rows with unique catalog entries.
-- Safe to re-run: targets fixed UUIDs only.

INSERT INTO public.ingredients (name)
VALUES
  ('apple'),
  ('apple cider vinegar'),
  ('avocado'),
  ('baby arugula'),
  ('baby spinach'),
  ('beets'),
  ('black beans'),
  ('bourbon'),
  ('breadcrumbs'),
  ('butternut squash'),
  ('canned chickpeas'),
  ('cauliflower'),
  ('chicken pieces'),
  ('coconut milk'),
  ('coleslaw mix'),
  ('corn kernels'),
  ('corn tortillas'),
  ('crushed tomatoes'),
  ('diced tomatoes'),
  ('eggs'),
  ('extra-virgin olive oil'),
  ('farro'),
  ('feta cheese'),
  ('fresh cilantro'),
  ('fresh ginger'),
  ('fresh mint'),
  ('fresh parsley'),
  ('garlic cloves'),
  ('goat cheese'),
  ('ground cumin'),
  ('ground lamb'),
  ('ground nutmeg'),
  ('ground turkey'),
  ('heavy cream'),
  ('Kalamata olives'),
  ('kale'),
  ('kidney beans'),
  ('lemon'),
  ('low-sodium chicken broth'),
  ('lump crab meat'),
  ('maple syrup'),
  ('mayonnaise'),
  ('mussels'),
  ('orange juice'),
  ('orzo'),
  ('pecans'),
  ('pinto beans'),
  ('plain Greek yogurt'),
  ('pork spare ribs'),
  ('red lentils'),
  ('smoked paprika'),
  ('sun-dried tomatoes'),
  ('sweet potato'),
  ('tahini'),
  ('white wine'),
  ('whole-wheat pita'),
  ('yellow onion'),
  ('young jackfruit')
ON CONFLICT (name) DO NOTHING;

-- seq 70: Lamb kofta with tzatziki
UPDATE public.recipes
SET
  title = 'Lamb kofta with tzatziki',
  instructions = $instr$Mix ground lamb with spices, shape into skewers, and grill. Serve with cucumber yogurt sauce.$instr$,
  image_url = '/recipes/starter-070.jpg',
  difficulty = 'medium',
  cook_time_minutes = 40
WHERE id = 'c0ffe000-0000-4000-8000-000000000070'::uuid;

DELETE FROM public.recipe_ingredients WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000070'::uuid;
DELETE FROM public.recipe_tags WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000070'::uuid;

INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, sort_order)
VALUES
  ('c0ffe000-0000-4000-8000-000000000070'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ground lamb' LIMIT 1), '1 lb', 0),
  ('c0ffe000-0000-4000-8000-000000000070'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ground cumin' LIMIT 1), '1 tsp', 1),
  ('c0ffe000-0000-4000-8000-000000000070'::uuid, (SELECT id FROM public.ingredients WHERE name = 'plain Greek yogurt' LIMIT 1), '1 cup', 2),
  ('c0ffe000-0000-4000-8000-000000000070'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fresh mint' LIMIT 1), '¼ cup', 3)
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;

INSERT INTO public.recipe_tags (recipe_id, tag_id)
SELECT 'c0ffe000-0000-4000-8000-000000000070'::uuid, t.id FROM public.tags t WHERE t.name = 'mediterranean'
ON CONFLICT (recipe_id, tag_id) DO NOTHING;

-- seq 74: Jackfruit carnitas tacos
UPDATE public.recipes
SET
  title = 'Jackfruit carnitas tacos',
  instructions = $instr$Shred jackfruit, simmer with orange and spices, crisp in a skillet. Serve in tortillas.$instr$,
  image_url = '/recipes/starter-074.jpg',
  difficulty = 'medium',
  cook_time_minutes = 35
WHERE id = 'c0ffe000-0000-4000-8000-000000000074'::uuid;

DELETE FROM public.recipe_ingredients WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000074'::uuid;
DELETE FROM public.recipe_tags WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000074'::uuid;

INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, sort_order)
VALUES
  ('c0ffe000-0000-4000-8000-000000000074'::uuid, (SELECT id FROM public.ingredients WHERE name = 'young jackfruit' LIMIT 1), '2 cans', 0),
  ('c0ffe000-0000-4000-8000-000000000074'::uuid, (SELECT id FROM public.ingredients WHERE name = 'orange juice' LIMIT 1), '½ cup', 1),
  ('c0ffe000-0000-4000-8000-000000000074'::uuid, (SELECT id FROM public.ingredients WHERE name = 'corn tortillas' LIMIT 1), '12', 2),
  ('c0ffe000-0000-4000-8000-000000000074'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fresh cilantro' LIMIT 1), '1 bunch', 3)
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;

INSERT INTO public.recipe_tags (recipe_id, tag_id)
SELECT 'c0ffe000-0000-4000-8000-000000000074'::uuid, t.id FROM public.tags t WHERE t.name = 'vegan'
ON CONFLICT (recipe_id, tag_id) DO NOTHING;

-- seq 76: Garlic butter mussels
UPDATE public.recipes
SET
  title = 'Garlic butter mussels',
  instructions = $instr$Steam mussels in white wine and garlic, finish with butter and parsley.$instr$,
  image_url = '/recipes/starter-076.jpg',
  difficulty = 'easy',
  cook_time_minutes = 20
WHERE id = 'c0ffe000-0000-4000-8000-000000000076'::uuid;

DELETE FROM public.recipe_ingredients WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000076'::uuid;
DELETE FROM public.recipe_tags WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000076'::uuid;

INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, sort_order)
VALUES
  ('c0ffe000-0000-4000-8000-000000000076'::uuid, (SELECT id FROM public.ingredients WHERE name = 'mussels' LIMIT 1), '2 lb cleaned', 0),
  ('c0ffe000-0000-4000-8000-000000000076'::uuid, (SELECT id FROM public.ingredients WHERE name = 'white wine' LIMIT 1), '1 cup', 1),
  ('c0ffe000-0000-4000-8000-000000000076'::uuid, (SELECT id FROM public.ingredients WHERE name = 'garlic cloves' LIMIT 1), '4', 2),
  ('c0ffe000-0000-4000-8000-000000000076'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fresh parsley' LIMIT 1), '¼ cup', 3)
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;

INSERT INTO public.recipe_tags (recipe_id, tag_id)
SELECT 'c0ffe000-0000-4000-8000-000000000076'::uuid, t.id FROM public.tags t WHERE t.name = 'seafood'
ON CONFLICT (recipe_id, tag_id) DO NOTHING;

-- seq 82: Italian wedding soup
UPDATE public.recipes
SET
  title = 'Italian wedding soup',
  instructions = $instr$Simmer mini meatballs and greens in chicken broth with orzo.$instr$,
  image_url = '/recipes/starter-082.jpg',
  difficulty = 'medium',
  cook_time_minutes = 45
WHERE id = 'c0ffe000-0000-4000-8000-000000000082'::uuid;

DELETE FROM public.recipe_ingredients WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000082'::uuid;
DELETE FROM public.recipe_tags WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000082'::uuid;

INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, sort_order)
VALUES
  ('c0ffe000-0000-4000-8000-000000000082'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ground turkey' LIMIT 1), '½ lb', 0),
  ('c0ffe000-0000-4000-8000-000000000082'::uuid, (SELECT id FROM public.ingredients WHERE name = 'orzo' LIMIT 1), '½ cup', 1),
  ('c0ffe000-0000-4000-8000-000000000082'::uuid, (SELECT id FROM public.ingredients WHERE name = 'baby spinach' LIMIT 1), '4 cups', 2),
  ('c0ffe000-0000-4000-8000-000000000082'::uuid, (SELECT id FROM public.ingredients WHERE name = 'low-sodium chicken broth' LIMIT 1), '6 cups', 3)
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;

INSERT INTO public.recipe_tags (recipe_id, tag_id)
SELECT 'c0ffe000-0000-4000-8000-000000000082'::uuid, t.id FROM public.tags t WHERE t.name = 'soups'
ON CONFLICT (recipe_id, tag_id) DO NOTHING;

-- seq 84: Falafel pita pockets
UPDATE public.recipes
SET
  title = 'Falafel pita pockets',
  instructions = $instr$Blend chickpeas with herbs, form balls, and bake until crisp. Stuff in pita with tahini sauce.$instr$,
  image_url = '/recipes/starter-084.jpg',
  difficulty = 'medium',
  cook_time_minutes = 35
WHERE id = 'c0ffe000-0000-4000-8000-000000000084'::uuid;

DELETE FROM public.recipe_ingredients WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000084'::uuid;
DELETE FROM public.recipe_tags WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000084'::uuid;

INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, sort_order)
VALUES
  ('c0ffe000-0000-4000-8000-000000000084'::uuid, (SELECT id FROM public.ingredients WHERE name = 'canned chickpeas' LIMIT 1), '2 cans', 0),
  ('c0ffe000-0000-4000-8000-000000000084'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fresh parsley' LIMIT 1), '1 cup', 1),
  ('c0ffe000-0000-4000-8000-000000000084'::uuid, (SELECT id FROM public.ingredients WHERE name = 'whole-wheat pita' LIMIT 1), '4', 2),
  ('c0ffe000-0000-4000-8000-000000000084'::uuid, (SELECT id FROM public.ingredients WHERE name = 'tahini' LIMIT 1), '3 tbsp', 3)
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;

INSERT INTO public.recipe_tags (recipe_id, tag_id)
SELECT 'c0ffe000-0000-4000-8000-000000000084'::uuid, t.id FROM public.tags t WHERE t.name = 'mediterranean'
ON CONFLICT (recipe_id, tag_id) DO NOTHING;

-- seq 85: Coconut red lentil dal
UPDATE public.recipes
SET
  title = 'Coconut red lentil dal',
  instructions = $instr$Cook red lentils with coconut milk, ginger, and tomatoes until creamy.$instr$,
  image_url = '/recipes/starter-085.jpg',
  difficulty = 'easy',
  cook_time_minutes = 35
WHERE id = 'c0ffe000-0000-4000-8000-000000000085'::uuid;

DELETE FROM public.recipe_ingredients WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000085'::uuid;
DELETE FROM public.recipe_tags WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000085'::uuid;

INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, sort_order)
VALUES
  ('c0ffe000-0000-4000-8000-000000000085'::uuid, (SELECT id FROM public.ingredients WHERE name = 'red lentils' LIMIT 1), '1 cup', 0),
  ('c0ffe000-0000-4000-8000-000000000085'::uuid, (SELECT id FROM public.ingredients WHERE name = 'coconut milk' LIMIT 1), '1 can', 1),
  ('c0ffe000-0000-4000-8000-000000000085'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fresh ginger' LIMIT 1), '1 tbsp', 2),
  ('c0ffe000-0000-4000-8000-000000000085'::uuid, (SELECT id FROM public.ingredients WHERE name = 'crushed tomatoes' LIMIT 1), '1 can', 3)
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;

INSERT INTO public.recipe_tags (recipe_id, tag_id)
SELECT 'c0ffe000-0000-4000-8000-000000000085'::uuid, t.id FROM public.tags t WHERE t.name = 'vegan'
ON CONFLICT (recipe_id, tag_id) DO NOTHING;

-- seq 87: Maple bourbon ribs
UPDATE public.recipes
SET
  title = 'Maple bourbon ribs',
  instructions = $instr$Rub ribs with brown sugar and spice, smoke low and slow, glaze with maple and bourbon.$instr$,
  image_url = '/recipes/starter-087.jpg',
  difficulty = 'hard',
  cook_time_minutes = 240
WHERE id = 'c0ffe000-0000-4000-8000-000000000087'::uuid;

DELETE FROM public.recipe_ingredients WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000087'::uuid;
DELETE FROM public.recipe_tags WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000087'::uuid;

INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, sort_order)
VALUES
  ('c0ffe000-0000-4000-8000-000000000087'::uuid, (SELECT id FROM public.ingredients WHERE name = 'pork spare ribs' LIMIT 1), '2 racks', 0),
  ('c0ffe000-0000-4000-8000-000000000087'::uuid, (SELECT id FROM public.ingredients WHERE name = 'maple syrup' LIMIT 1), '½ cup', 1),
  ('c0ffe000-0000-4000-8000-000000000087'::uuid, (SELECT id FROM public.ingredients WHERE name = 'bourbon' LIMIT 1), '¼ cup', 2),
  ('c0ffe000-0000-4000-8000-000000000087'::uuid, (SELECT id FROM public.ingredients WHERE name = 'smoked paprika' LIMIT 1), '1 tbsp', 3)
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;

INSERT INTO public.recipe_tags (recipe_id, tag_id)
SELECT 'c0ffe000-0000-4000-8000-000000000087'::uuid, t.id FROM public.tags t WHERE t.name = 'bbq'
ON CONFLICT (recipe_id, tag_id) DO NOTHING;

-- seq 88: Kale apple salad
UPDATE public.recipes
SET
  title = 'Kale apple salad',
  instructions = $instr$Massage kale with lemon dressing, toss with sliced apple and toasted pecans.$instr$,
  image_url = '/recipes/starter-088.jpg',
  difficulty = 'easy',
  cook_time_minutes = 12
WHERE id = 'c0ffe000-0000-4000-8000-000000000088'::uuid;

DELETE FROM public.recipe_ingredients WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000088'::uuid;
DELETE FROM public.recipe_tags WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000088'::uuid;

INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, sort_order)
VALUES
  ('c0ffe000-0000-4000-8000-000000000088'::uuid, (SELECT id FROM public.ingredients WHERE name = 'kale' LIMIT 1), '1 bunch', 0),
  ('c0ffe000-0000-4000-8000-000000000088'::uuid, (SELECT id FROM public.ingredients WHERE name = 'apple' LIMIT 1), '2 sliced', 1),
  ('c0ffe000-0000-4000-8000-000000000088'::uuid, (SELECT id FROM public.ingredients WHERE name = 'pecans' LIMIT 1), '½ cup toasted', 2),
  ('c0ffe000-0000-4000-8000-000000000088'::uuid, (SELECT id FROM public.ingredients WHERE name = 'lemon' LIMIT 1), '1 juiced', 3)
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;

INSERT INTO public.recipe_tags (recipe_id, tag_id)
SELECT 'c0ffe000-0000-4000-8000-000000000088'::uuid, t.id FROM public.tags t WHERE t.name = 'salads'
ON CONFLICT (recipe_id, tag_id) DO NOTHING;

-- seq 89: Roasted cauliflower steaks
UPDATE public.recipes
SET
  title = 'Roasted cauliflower steaks',
  instructions = $instr$Slice cauliflower into thick slabs, roast with smoked paprika until caramelized.$instr$,
  image_url = '/recipes/starter-089.jpg',
  difficulty = 'easy',
  cook_time_minutes = 35
WHERE id = 'c0ffe000-0000-4000-8000-000000000089'::uuid;

DELETE FROM public.recipe_ingredients WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000089'::uuid;
DELETE FROM public.recipe_tags WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000089'::uuid;

INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, sort_order)
VALUES
  ('c0ffe000-0000-4000-8000-000000000089'::uuid, (SELECT id FROM public.ingredients WHERE name = 'cauliflower' LIMIT 1), '2 heads', 0),
  ('c0ffe000-0000-4000-8000-000000000089'::uuid, (SELECT id FROM public.ingredients WHERE name = 'smoked paprika' LIMIT 1), '1 tbsp', 1),
  ('c0ffe000-0000-4000-8000-000000000089'::uuid, (SELECT id FROM public.ingredients WHERE name = 'extra-virgin olive oil' LIMIT 1), '3 tbsp', 2),
  ('c0ffe000-0000-4000-8000-000000000089'::uuid, (SELECT id FROM public.ingredients WHERE name = 'lemon' LIMIT 1), '1', 3)
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;

INSERT INTO public.recipe_tags (recipe_id, tag_id)
SELECT 'c0ffe000-0000-4000-8000-000000000089'::uuid, t.id FROM public.tags t WHERE t.name = 'vegetarian'
ON CONFLICT (recipe_id, tag_id) DO NOTHING;

-- seq 90: Stuffed sweet potatoes
UPDATE public.recipes
SET
  title = 'Stuffed sweet potatoes',
  instructions = $instr$Bake sweet potatoes until tender, fill with black beans, corn, and avocado.$instr$,
  image_url = '/recipes/starter-090.jpg',
  difficulty = 'easy',
  cook_time_minutes = 50
WHERE id = 'c0ffe000-0000-4000-8000-000000000090'::uuid;

DELETE FROM public.recipe_ingredients WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000090'::uuid;
DELETE FROM public.recipe_tags WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000090'::uuid;

INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, sort_order)
VALUES
  ('c0ffe000-0000-4000-8000-000000000090'::uuid, (SELECT id FROM public.ingredients WHERE name = 'sweet potato' LIMIT 1), '4 large', 0),
  ('c0ffe000-0000-4000-8000-000000000090'::uuid, (SELECT id FROM public.ingredients WHERE name = 'black beans' LIMIT 1), '1 can', 1),
  ('c0ffe000-0000-4000-8000-000000000090'::uuid, (SELECT id FROM public.ingredients WHERE name = 'corn kernels' LIMIT 1), '1 cup', 2),
  ('c0ffe000-0000-4000-8000-000000000090'::uuid, (SELECT id FROM public.ingredients WHERE name = 'avocado' LIMIT 1), '2', 3)
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;

INSERT INTO public.recipe_tags (recipe_id, tag_id)
SELECT 'c0ffe000-0000-4000-8000-000000000090'::uuid, t.id FROM public.tags t WHERE t.name = 'vegan'
ON CONFLICT (recipe_id, tag_id) DO NOTHING;

-- seq 91: Mediterranean orzo bake
UPDATE public.recipes
SET
  title = 'Mediterranean orzo bake',
  instructions = $instr$Toss cooked orzo with feta, sun-dried tomatoes, and olives. Bake until golden on top.$instr$,
  image_url = '/recipes/starter-091.jpg',
  difficulty = 'easy',
  cook_time_minutes = 45
WHERE id = 'c0ffe000-0000-4000-8000-000000000091'::uuid;

DELETE FROM public.recipe_ingredients WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000091'::uuid;
DELETE FROM public.recipe_tags WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000091'::uuid;

INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, sort_order)
VALUES
  ('c0ffe000-0000-4000-8000-000000000091'::uuid, (SELECT id FROM public.ingredients WHERE name = 'orzo' LIMIT 1), '8 oz', 0),
  ('c0ffe000-0000-4000-8000-000000000091'::uuid, (SELECT id FROM public.ingredients WHERE name = 'feta cheese' LIMIT 1), '6 oz', 1),
  ('c0ffe000-0000-4000-8000-000000000091'::uuid, (SELECT id FROM public.ingredients WHERE name = 'sun-dried tomatoes' LIMIT 1), '½ cup', 2),
  ('c0ffe000-0000-4000-8000-000000000091'::uuid, (SELECT id FROM public.ingredients WHERE name = 'Kalamata olives' LIMIT 1), '1 cup', 3)
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;

INSERT INTO public.recipe_tags (recipe_id, tag_id)
SELECT 'c0ffe000-0000-4000-8000-000000000091'::uuid, t.id FROM public.tags t WHERE t.name = 'mediterranean'
ON CONFLICT (recipe_id, tag_id) DO NOTHING;

-- seq 92: Roasted butternut squash soup
UPDATE public.recipes
SET
  title = 'Roasted butternut squash soup',
  instructions = $instr$Roast squash, blend with broth and cream, season with nutmeg.$instr$,
  image_url = '/recipes/starter-092.jpg',
  difficulty = 'easy',
  cook_time_minutes = 50
WHERE id = 'c0ffe000-0000-4000-8000-000000000092'::uuid;

DELETE FROM public.recipe_ingredients WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000092'::uuid;
DELETE FROM public.recipe_tags WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000092'::uuid;

INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, sort_order)
VALUES
  ('c0ffe000-0000-4000-8000-000000000092'::uuid, (SELECT id FROM public.ingredients WHERE name = 'butternut squash' LIMIT 1), '1 large', 0),
  ('c0ffe000-0000-4000-8000-000000000092'::uuid, (SELECT id FROM public.ingredients WHERE name = 'heavy cream' LIMIT 1), '½ cup', 1),
  ('c0ffe000-0000-4000-8000-000000000092'::uuid, (SELECT id FROM public.ingredients WHERE name = 'yellow onion' LIMIT 1), '1', 2),
  ('c0ffe000-0000-4000-8000-000000000092'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ground nutmeg' LIMIT 1), '¼ tsp', 3)
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;

INSERT INTO public.recipe_tags (recipe_id, tag_id)
SELECT 'c0ffe000-0000-4000-8000-000000000092'::uuid, t.id FROM public.tags t WHERE t.name = 'soups'
ON CONFLICT (recipe_id, tag_id) DO NOTHING;

-- seq 93: Farro beet salad
UPDATE public.recipes
SET
  title = 'Farro beet salad',
  instructions = $instr$Cook farro, toss with roasted beets, goat cheese, and arugula.$instr$,
  image_url = '/recipes/starter-093.jpg',
  difficulty = 'medium',
  cook_time_minutes = 35
WHERE id = 'c0ffe000-0000-4000-8000-000000000093'::uuid;

DELETE FROM public.recipe_ingredients WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000093'::uuid;
DELETE FROM public.recipe_tags WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000093'::uuid;

INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, sort_order)
VALUES
  ('c0ffe000-0000-4000-8000-000000000093'::uuid, (SELECT id FROM public.ingredients WHERE name = 'farro' LIMIT 1), '1 cup dry', 0),
  ('c0ffe000-0000-4000-8000-000000000093'::uuid, (SELECT id FROM public.ingredients WHERE name = 'beets' LIMIT 1), '3 roasted', 1),
  ('c0ffe000-0000-4000-8000-000000000093'::uuid, (SELECT id FROM public.ingredients WHERE name = 'goat cheese' LIMIT 1), '4 oz', 2),
  ('c0ffe000-0000-4000-8000-000000000093'::uuid, (SELECT id FROM public.ingredients WHERE name = 'baby arugula' LIMIT 1), '4 cups', 3)
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;

INSERT INTO public.recipe_tags (recipe_id, tag_id)
SELECT 'c0ffe000-0000-4000-8000-000000000093'::uuid, t.id FROM public.tags t WHERE t.name = 'salads'
ON CONFLICT (recipe_id, tag_id) DO NOTHING;

-- seq 94: Alabama white BBQ chicken
UPDATE public.recipes
SET
  title = 'Alabama white BBQ chicken',
  instructions = $instr$Grill chicken pieces, toss in tangy mayo-vinegar white sauce before serving.$instr$,
  image_url = '/recipes/starter-094.jpg',
  difficulty = 'medium',
  cook_time_minutes = 50
WHERE id = 'c0ffe000-0000-4000-8000-000000000094'::uuid;

DELETE FROM public.recipe_ingredients WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000094'::uuid;
DELETE FROM public.recipe_tags WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000094'::uuid;

INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, sort_order)
VALUES
  ('c0ffe000-0000-4000-8000-000000000094'::uuid, (SELECT id FROM public.ingredients WHERE name = 'chicken pieces' LIMIT 1), '3 lb', 0),
  ('c0ffe000-0000-4000-8000-000000000094'::uuid, (SELECT id FROM public.ingredients WHERE name = 'mayonnaise' LIMIT 1), '1 cup', 1),
  ('c0ffe000-0000-4000-8000-000000000094'::uuid, (SELECT id FROM public.ingredients WHERE name = 'apple cider vinegar' LIMIT 1), '3 tbsp', 2),
  ('c0ffe000-0000-4000-8000-000000000094'::uuid, (SELECT id FROM public.ingredients WHERE name = 'coleslaw mix' LIMIT 1), '4 cups', 3)
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;

INSERT INTO public.recipe_tags (recipe_id, tag_id)
SELECT 'c0ffe000-0000-4000-8000-000000000094'::uuid, t.id FROM public.tags t WHERE t.name = 'bbq'
ON CONFLICT (recipe_id, tag_id) DO NOTHING;

-- seq 97: Crab cakes with remoulade
UPDATE public.recipes
SET
  title = 'Crab cakes with remoulade',
  instructions = $instr$Mix crab with binder, pan-fry cakes until golden. Serve with tangy remoulade.$instr$,
  image_url = '/recipes/starter-097.jpg',
  difficulty = 'medium',
  cook_time_minutes = 35
WHERE id = 'c0ffe000-0000-4000-8000-000000000097'::uuid;

DELETE FROM public.recipe_ingredients WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000097'::uuid;
DELETE FROM public.recipe_tags WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000097'::uuid;

INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, sort_order)
VALUES
  ('c0ffe000-0000-4000-8000-000000000097'::uuid, (SELECT id FROM public.ingredients WHERE name = 'lump crab meat' LIMIT 1), '1 lb', 0),
  ('c0ffe000-0000-4000-8000-000000000097'::uuid, (SELECT id FROM public.ingredients WHERE name = 'breadcrumbs' LIMIT 1), '½ cup', 1),
  ('c0ffe000-0000-4000-8000-000000000097'::uuid, (SELECT id FROM public.ingredients WHERE name = 'eggs' LIMIT 1), '1', 2),
  ('c0ffe000-0000-4000-8000-000000000097'::uuid, (SELECT id FROM public.ingredients WHERE name = 'lemon' LIMIT 1), '1', 3)
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;

INSERT INTO public.recipe_tags (recipe_id, tag_id)
SELECT 'c0ffe000-0000-4000-8000-000000000097'::uuid, t.id FROM public.tags t WHERE t.name = 'seafood'
ON CONFLICT (recipe_id, tag_id) DO NOTHING;

-- seq 100: Three-bean chili
UPDATE public.recipes
SET
  title = 'Three-bean chili',
  instructions = $instr$Simmer kidney, black, and pinto beans with tomatoes and chili spices.$instr$,
  image_url = '/recipes/starter-100.jpg',
  difficulty = 'easy',
  cook_time_minutes = 40
WHERE id = 'c0ffe000-0000-4000-8000-000000000100'::uuid;

DELETE FROM public.recipe_ingredients WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000100'::uuid;
DELETE FROM public.recipe_tags WHERE recipe_id = 'c0ffe000-0000-4000-8000-000000000100'::uuid;

INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, sort_order)
VALUES
  ('c0ffe000-0000-4000-8000-000000000100'::uuid, (SELECT id FROM public.ingredients WHERE name = 'kidney beans' LIMIT 1), '1 can', 0),
  ('c0ffe000-0000-4000-8000-000000000100'::uuid, (SELECT id FROM public.ingredients WHERE name = 'black beans' LIMIT 1), '1 can', 1),
  ('c0ffe000-0000-4000-8000-000000000100'::uuid, (SELECT id FROM public.ingredients WHERE name = 'pinto beans' LIMIT 1), '1 can', 2),
  ('c0ffe000-0000-4000-8000-000000000100'::uuid, (SELECT id FROM public.ingredients WHERE name = 'diced tomatoes' LIMIT 1), '1 can', 3)
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;

INSERT INTO public.recipe_tags (recipe_id, tag_id)
SELECT 'c0ffe000-0000-4000-8000-000000000100'::uuid, t.id FROM public.tags t WHERE t.name = 'vegetarian'
ON CONFLICT (recipe_id, tag_id) DO NOTHING;

