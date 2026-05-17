-- Starter browse recipes (~100) for local/staging. Idempotent (fixed UUIDs + ON CONFLICT DO NOTHING).
-- Category slugs match src/lib/recipe-categories.ts (tags.name).
-- Image paths: /recipes/starter-001.jpg … starter-100.jpg (patched in 20260517141000; see demo-recipe-cover-images.ts).
-- Applied as migration role (bypasses RLS); anon SELECT on recipes is open.

INSERT INTO public.ingredients (name)
VALUES
  ('all-purpose flour'),
  ('anchovy paste'),
  ('apple cider vinegar'),
  ('arborio rice'),
  ('avocado'),
  ('baby spinach'),
  ('bacon'),
  ('balsamic glaze'),
  ('balsamic vinegar'),
  ('basil pesto'),
  ('basmati rice'),
  ('BBQ sauce'),
  ('bell pepper'),
  ('bell peppers'),
  ('bird''s eye chilies'),
  ('black beans'),
  ('black pepper'),
  ('blue cheese'),
  ('bone-in chicken thighs'),
  ('breadcrumbs'),
  ('broccoli florets'),
  ('brown lentils'),
  ('brown sugar'),
  ('burger buns'),
  ('buttermilk'),
  ('canned chickpeas'),
  ('canned chopped clams'),
  ('canned tuna'),
  ('cannellini beans'),
  ('capers'),
  ('carrots'),
  ('celery'),
  ('cherry tomatoes'),
  ('chia seeds'),
  ('chicken breast'),
  ('chicken breast cutlets'),
  ('chicken pieces'),
  ('chili powder'),
  ('chipotle in adobo'),
  ('chives'),
  ('chocolate chips'),
  ('ciabatta bread'),
  ('coconut milk'),
  ('cod fillets'),
  ('coleslaw mix'),
  ('cooked chicken breast'),
  ('cooked jasmine rice'),
  ('cooked rice'),
  ('cooked shrimp'),
  ('corn kernels'),
  ('corn on the cob'),
  ('corn tortillas'),
  ('cotija cheese'),
  ('cremini mushrooms'),
  ('croutons'),
  ('crushed tomatoes'),
  ('cucumber'),
  ('curry powder'),
  ('day-old bread'),
  ('diced tomatoes'),
  ('dried oregano'),
  ('dried wakame'),
  ('dry sea scallops'),
  ('egg noodles'),
  ('eggplant'),
  ('eggs'),
  ('elbow macaroni'),
  ('english cucumber'),
  ('extra-firm tofu'),
  ('extra-virgin olive oil'),
  ('farro'),
  ('feta cheese'),
  ('fine cornmeal'),
  ('fish sauce'),
  ('flour tortillas'),
  ('fresh basil'),
  ('fresh berries'),
  ('fresh cilantro'),
  ('fresh dill'),
  ('fresh ginger'),
  ('fresh mint'),
  ('fresh mozzarella'),
  ('fresh parsley'),
  ('fresh thyme'),
  ('frozen mixed vegetables'),
  ('frozen peas'),
  ('frozen spinach'),
  ('fusilli'),
  ('garam masala'),
  ('garlic cloves'),
  ('garlic powder'),
  ('ghee'),
  ('goat cheese'),
  ('green beans'),
  ('green onion'),
  ('ground beef'),
  ('ground chicken'),
  ('ground cumin'),
  ('ground pork'),
  ('ground turkey'),
  ('ground turmeric'),
  ('halloumi cheese'),
  ('hamburger buns'),
  ('hard-boiled eggs'),
  ('heavy cream'),
  ('heirloom tomatoes'),
  ('honey'),
  ('jalapeño'),
  ('Kalamata olives'),
  ('ketchup'),
  ('kosher salt'),
  ('lager beer'),
  ('large shrimp peeled'),
  ('lemon'),
  ('lemons'),
  ('light brown sugar'),
  ('lime'),
  ('lime juice'),
  ('long-grain rice'),
  ('low-sodium vegetable broth'),
  ('maple syrup'),
  ('marinara sauce'),
  ('mixed berries'),
  ('Monterey Jack cheese'),
  ('naan flatbread'),
  ('niçoise olives'),
  ('nutritional yeast'),
  ('oat milk'),
  ('orange juice'),
  ('paprika'),
  ('parmesan cheese'),
  ('part-skim mozzarella'),
  ('peach preserves'),
  ('pecorino romano'),
  ('penne'),
  ('phyllo dough'),
  ('pico de gallo'),
  ('pine nuts'),
  ('pita bread'),
  ('plain Greek yogurt'),
  ('plain yogurt'),
  ('pork shoulder'),
  ('pork spare ribs'),
  ('portobello mushrooms'),
  ('powdered sugar'),
  ('quinoa'),
  ('ramen noodles'),
  ('raw cashews'),
  ('red lentils'),
  ('red onion'),
  ('red pepper flakes'),
  ('red wine'),
  ('red wine vinegar'),
  ('rice noodles'),
  ('rice vinegar'),
  ('ripe avocados'),
  ('ripe banana'),
  ('ripe bananas'),
  ('ripe tomatoes'),
  ('rolled oats'),
  ('roma tomato'),
  ('roma tomatoes'),
  ('romaine hearts'),
  ('romaine lettuce'),
  ('russet potatoes'),
  ('saffron threads'),
  ('scallions'),
  ('seedless watermelon'),
  ('sesame seeds'),
  ('sharp cheddar'),
  ('sherry vinegar'),
  ('shredded cabbage'),
  ('shredded cooked chicken'),
  ('silken tofu'),
  ('skin-on salmon fillets'),
  ('sliced almonds'),
  ('small pasta shells'),
  ('smoked paprika'),
  ('soft-boiled eggs'),
  ('sour cream'),
  ('sourdough bread'),
  ('soy sauce'),
  ('spaghetti'),
  ('spinach'),
  ('strawberries'),
  ('sushi rice'),
  ('sushi-grade tuna'),
  ('sweet potato'),
  ('sweetened condensed milk'),
  ('tagliatelle'),
  ('tahini'),
  ('tamari'),
  ('tandoori spice blend'),
  ('Thai basil'),
  ('toasted sesame oil'),
  ('tomato passata'),
  ('unsalted butter'),
  ('vanilla extract'),
  ('vodka'),
  ('walnuts'),
  ('white miso paste'),
  ('white onion'),
  ('whole chicken'),
  ('whole milk'),
  ('whole milk yogurt'),
  ('whole sea bass'),
  ('whole-wheat pita'),
  ('yellow onion'),
  ('zucchini')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.tags (name)
VALUES
  ('italian'),
  ('mexican'),
  ('asian'),
  ('mediterranean'),
  ('indian'),
  ('american_comfort'),
  ('bbq'),
  ('seafood'),
  ('vegetarian'),
  ('vegan'),
  ('gluten_free'),
  ('soups'),
  ('salads'),
  ('pasta'),
  ('breakfast'),
  ('desserts')
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
VALUES
(
  'c0ffe000-0000-4000-8000-000000000001'::uuid,
  'Margherita flatbread',
  $instr$Brush naan with olive oil. Top with crushed tomatoes, torn mozzarella, and basil. Bake at 450°F until cheese bubbles, 8–10 minutes.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'easy',
  25
),
(
  'c0ffe000-0000-4000-8000-000000000002'::uuid,
  'Street corn salad',
  $instr$Char corn, toss with mayo, cotija, lime, and chili powder.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'easy',
  15
),
(
  'c0ffe000-0000-4000-8000-000000000003'::uuid,
  'Ginger scallion salmon',
  $instr$Steam or pan-sear salmon; top with hot oil over ginger and scallions.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'easy',
  25
),
(
  'c0ffe000-0000-4000-8000-000000000004'::uuid,
  'Greek chicken souvlaki',
  $instr$Marinate chicken cubes in lemon, oregano, and olive oil. Grill and serve with tzatziki.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'medium',
  35
),
(
  'c0ffe000-0000-4000-8000-000000000005'::uuid,
  'Chana masala',
  $instr$Sauté onion and spices, add tomatoes and chickpeas. Simmer 20 minutes.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'easy',
  35
),
(
  'c0ffe000-0000-4000-8000-000000000006'::uuid,
  'Classic mac and cheese',
  $instr$Make a roux, whisk in milk and cheese. Fold in cooked macaroni and bake until golden.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'easy',
  35
),
(
  'c0ffe000-0000-4000-8000-000000000007'::uuid,
  'Smoky grilled chicken thighs',
  $instr$Rub thighs with paprika and brown sugar. Grill over medium heat until 165°F.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'easy',
  35
),
(
  'c0ffe000-0000-4000-8000-000000000008'::uuid,
  'Lemon garlic shrimp skewers',
  $instr$Marinate shrimp briefly, thread on skewers, grill 2 minutes per side.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'easy',
  20
),
(
  'c0ffe000-0000-4000-8000-000000000009'::uuid,
  'Caprese stuffed avocados',
  $instr$Fill avocado halves with mozzarella, tomato, and basil; drizzle balsamic.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'easy',
  15
),
(
  'c0ffe000-0000-4000-8000-000000000010'::uuid,
  'Chickpea curry',
  $instr$Sauté onion, add spices, tomatoes, and chickpeas. Simmer and finish with coconut milk.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'easy',
  30
),
(
  'c0ffe000-0000-4000-8000-000000000011'::uuid,
  'Quinoa tabbouleh',
  $instr$Cook quinoa, cool, toss with parsley, tomato, cucumber, and lemon.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'easy',
  25
),
(
  'c0ffe000-0000-4000-8000-000000000012'::uuid,
  'Gazpacho',
  $instr$Blend ripe tomatoes, cucumber, pepper, and bread until smooth. Chill at least 2 hours.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'easy',
  15
),
(
  'c0ffe000-0000-4000-8000-000000000013'::uuid,
  'Summer watermelon feta salad',
  $instr$Toss cubed watermelon with feta, mint, and lime. Serve chilled.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'easy',
  10
),
(
  'c0ffe000-0000-4000-8000-000000000014'::uuid,
  'Spaghetti aglio e olio',
  $instr$Cook spaghetti, toss with olive oil, garlic, chili flakes, and parsley.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'easy',
  20
),
(
  'c0ffe000-0000-4000-8000-000000000015'::uuid,
  'Fluffy scrambled eggs',
  $instr$Whisk eggs with a splash of cream, cook low and slow, finish with butter.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'easy',
  10
),
(
  'c0ffe000-0000-4000-8000-000000000016'::uuid,
  'Chocolate chip cookies',
  $instr$Cream butter and sugars, fold in flour and chips, bake until edges set.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'easy',
  25
),
(
  'c0ffe000-0000-4000-8000-000000000017'::uuid,
  'Cacio e pepe',
  $instr$Cook spaghetti in well-salted water. Toast coarsely ground pepper in butter. Toss hot pasta with pasta water, pecorino, and pepper until creamy.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'medium',
  20
),
(
  'c0ffe000-0000-4000-8000-000000000018'::uuid,
  'Chicken tinga tacos',
  $instr$Simmer shredded chicken in chipotle-tomato sauce. Serve in warm tortillas with onion and cilantro.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'medium',
  40
),
(
  'c0ffe000-0000-4000-8000-000000000019'::uuid,
  'Chicken noodle soup',
  $instr$Simmer chicken with carrots, celery, and onion; add egg noodles until tender.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'easy',
  45
),
(
  'c0ffe000-0000-4000-8000-000000000020'::uuid,
  'Horiatiki salad',
  $instr$Combine tomato, cucumber, onion, olives, and feta. Dress with olive oil and oregano.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'easy',
  15
),
(
  'c0ffe000-0000-4000-8000-000000000021'::uuid,
  'Tandoori-style chicken thighs',
  $instr$Marinate thighs in yogurt and spices. Roast at 425°F until charred at edges.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'medium',
  45
),
(
  'c0ffe000-0000-4000-8000-000000000022'::uuid,
  'Lentil walnut Bolognese',
  $instr$Simmer lentils with crushed tomatoes and walnuts until thick. Toss with pasta.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'medium',
  40
),
(
  'c0ffe000-0000-4000-8000-000000000023'::uuid,
  'BBQ pulled pork sandwiches',
  $instr$Rub shoulder with spice blend, slow-cook until shreddable. Toss with BBQ sauce.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'medium',
  240
),
(
  'c0ffe000-0000-4000-8000-000000000024'::uuid,
  'Fish tacos with slaw',
  $instr$Grill white fish, flake into tortillas with cabbage slaw and lime crema.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'easy',
  25
),
(
  'c0ffe000-0000-4000-8000-000000000025'::uuid,
  'Classic Caesar salad',
  $instr$Toss romaine with anchovy dressing, parmesan, and croutons.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'easy',
  15
),
(
  'c0ffe000-0000-4000-8000-000000000026'::uuid,
  'Tofu scramble',
  $instr$Crumble tofu with turmeric, nutritional yeast, and vegetables until heated through.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'easy',
  15
),
(
  'c0ffe000-0000-4000-8000-000000000027'::uuid,
  'GF chicken stir-fry',
  $instr$Stir-fry chicken and vegetables in tamari; serve over rice noodles.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'easy',
  25
),
(
  'c0ffe000-0000-4000-8000-000000000028'::uuid,
  'Shakshuka',
  $instr$Simmer peppers and tomatoes, poach eggs in the sauce. Serve with crusty bread.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'easy',
  30
),
(
  'c0ffe000-0000-4000-8000-000000000029'::uuid,
  'Asian slaw',
  $instr$Shred cabbage and carrots, dress with ginger-soy vinaigrette.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'easy',
  15
),
(
  'c0ffe000-0000-4000-8000-000000000030'::uuid,
  'Penne alla vodka',
  $instr$Sauté onion, add vodka and tomatoes, stir in cream and penne.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'medium',
  30
),
(
  'c0ffe000-0000-4000-8000-000000000031'::uuid,
  'Grilled corn with herb butter',
  $instr$Grill shucked corn, brush with compound butter of parsley and garlic.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'easy',
  20
),
(
  'c0ffe000-0000-4000-8000-000000000032'::uuid,
  'Berry crisp',
  $instr$Toss berries with sugar, top with oat crumble, bake until bubbling.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'easy',
  45
),
(
  'c0ffe000-0000-4000-8000-000000000033'::uuid,
  'Chicken piccata',
  $instr$Pound cutlets thin, dredge in flour. Sear in butter. Deglaze with lemon, capers, and white wine; finish with parsley.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'medium',
  35
),
(
  'c0ffe000-0000-4000-8000-000000000034'::uuid,
  'Clam chowder',
  $instr$Cook bacon, sauté aromatics, add potatoes, broth, and clams; finish with cream.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'medium',
  45
),
(
  'c0ffe000-0000-4000-8000-000000000035'::uuid,
  'Vegetable fried rice',
  $instr$Stir-fry day-old rice with mixed vegetables, egg, and soy sauce.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'easy',
  25
),
(
  'c0ffe000-0000-4000-8000-000000000036'::uuid,
  'Grilled halloumi skewers',
  $instr$Thread halloumi and vegetables; grill until charred. Drizzle with lemon.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'easy',
  20
),
(
  'c0ffe000-0000-4000-8000-000000000037'::uuid,
  'Spinach feta pie',
  $instr$Sauté spinach with onion, mix with feta and eggs, bake in phyllo until golden.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'medium',
  50
),
(
  'c0ffe000-0000-4000-8000-000000000038'::uuid,
  'Meatloaf with glaze',
  $instr$Mix beef with breadcrumbs and egg, shape loaf, bake with ketchup-brown sugar glaze.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'medium',
  60
),
(
  'c0ffe000-0000-4000-8000-000000000039'::uuid,
  'Beer-can chicken',
  $instr$Season whole chicken, perch on half-filled beer can, grill indirect until done.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'medium',
  90
),
(
  'c0ffe000-0000-4000-8000-000000000040'::uuid,
  'Tomato basil soup',
  $instr$Cook onions, add tomatoes and broth, blend smooth. Stir in cream and basil.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'easy',
  30
),
(
  'c0ffe000-0000-4000-8000-000000000041'::uuid,
  'Roasted vegetable grain bowl',
  $instr$Roast seasonal vegetables, serve over farro with tahini dressing.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'easy',
  40
),
(
  'c0ffe000-0000-4000-8000-000000000042'::uuid,
  'Vegan Caesar salad',
  $instr$Toss romaine with cashew-based dressing and chickpea croutons.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'easy',
  15
),
(
  'c0ffe000-0000-4000-8000-000000000043'::uuid,
  'Sweet potato black bean tacos',
  $instr$Roast cubed sweet potato, fill tortillas with beans, salsa, and cilantro.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'easy',
  30
),
(
  'c0ffe000-0000-4000-8000-000000000044'::uuid,
  'Corn chowder',
  $instr$Sauté corn and potatoes in butter, add broth, blend half for creaminess.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'medium',
  40
),
(
  'c0ffe000-0000-4000-8000-000000000045'::uuid,
  'Nicoise salad',
  $instr$Arrange potatoes, green beans, eggs, tuna, and olives over lettuce.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'medium',
  25
),
(
  'c0ffe000-0000-4000-8000-000000000046'::uuid,
  'Strawberry spinach salad',
  $instr$Toss spinach with strawberries, goat cheese, and poppy seed dressing.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'easy',
  12
),
(
  'c0ffe000-0000-4000-8000-000000000047'::uuid,
  'Banana pancakes',
  $instr$Mix batter, cook on a buttered griddle, serve with maple syrup.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'easy',
  20
),
(
  'c0ffe000-0000-4000-8000-000000000048'::uuid,
  'Lemon bars',
  $instr$Press shortbread base, bake, pour lemon custard, bake again until set.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'medium',
  50
),
(
  'c0ffe000-0000-4000-8000-000000000049'::uuid,
  'Baked sea bass with herbs',
  $instr$Stuff fish cavity with lemon and herbs. Roast at 400°F until flaky.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'medium',
  30
),
(
  'c0ffe000-0000-4000-8000-000000000050'::uuid,
  'Black bean quesadillas',
  $instr$Mash beans with cumin, fill tortillas with cheese, griddle until crisp.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'easy',
  20
),
(
  'c0ffe000-0000-4000-8000-000000000051'::uuid,
  'Miso soup',
  $instr$Simmer dashi, whisk in miso off heat. Add tofu and wakame.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'easy',
  15
),
(
  'c0ffe000-0000-4000-8000-000000000052'::uuid,
  'Grilled portobello caps',
  $instr$Marinate mushrooms in balsamic and oil; grill 4 minutes per side.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'easy',
  15
),
(
  'c0ffe000-0000-4000-8000-000000000053'::uuid,
  'Dal tadka',
  $instr$Cook red lentils until soft. Bloom cumin and garlic in ghee, stir into dal.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'easy',
  40
),
(
  'c0ffe000-0000-4000-8000-000000000054'::uuid,
  'Buttermilk fried chicken',
  $instr$Soak chicken in buttermilk, dredge in seasoned flour, fry until golden and cooked through.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'hard',
  50
),
(
  'c0ffe000-0000-4000-8000-000000000055'::uuid,
  'Seared scallops',
  $instr$Pat scallops dry, sear in hot butter 90 seconds per side. Serve with pea purée.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'medium',
  15
),
(
  'c0ffe000-0000-4000-8000-000000000056'::uuid,
  'Tuna poke bowl',
  $instr$Cube sushi-grade tuna, toss with soy and sesame. Serve over rice with avocado.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'easy',
  20
),
(
  'c0ffe000-0000-4000-8000-000000000057'::uuid,
  'Mushroom risotto',
  $instr$Toast arborio, add warm broth ladle by ladle, fold in sautéed mushrooms and parmesan.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'medium',
  45
),
(
  'c0ffe000-0000-4000-8000-000000000058'::uuid,
  'Black bean burgers',
  $instr$Mash beans with oats and spices, form patties, pan-sear until crisp.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'medium',
  30
),
(
  'c0ffe000-0000-4000-8000-000000000059'::uuid,
  'Baked cod with tomatoes',
  $instr$Nestle cod in a dish of cherry tomatoes, garlic, and olive oil. Bake at 400°F.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'easy',
  28
),
(
  'c0ffe000-0000-4000-8000-000000000060'::uuid,
  'Miso ramen bowl',
  $instr$Simmer broth with miso, cook noodles, top with soft egg and greens.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'medium',
  35
),
(
  'c0ffe000-0000-4000-8000-000000000061'::uuid,
  'Lentil soup',
  $instr$Cook lentils with carrots, cumin, and tomatoes until thick and hearty.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'easy',
  40
),
(
  'c0ffe000-0000-4000-8000-000000000062'::uuid,
  'Bolognese',
  $instr$Brown beef and pork with soffritto, simmer with wine and tomatoes 1 hour.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'medium',
  90
),
(
  'c0ffe000-0000-4000-8000-000000000063'::uuid,
  'Avocado toast',
  $instr$Mash avocado with lemon, spread on toasted sourdough, top with chili flakes.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'easy',
  10
),
(
  'c0ffe000-0000-4000-8000-000000000064'::uuid,
  'Overnight oats',
  $instr$Combine oats, plant milk, chia, and maple. Refrigerate overnight; top with berries.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'easy',
  5
),
(
  'c0ffe000-0000-4000-8000-000000000065'::uuid,
  'Minestrone',
  $instr$Sauté onion, carrot, celery. Add beans, tomatoes, broth, and pasta. Simmer until vegetables are tender.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'easy',
  45
),
(
  'c0ffe000-0000-4000-8000-000000000066'::uuid,
  'Shrimp ceviche',
  $instr$Marinate poached shrimp in lime juice with tomato, onion, and jalapeño. Chill 20 minutes.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'medium',
  30
),
(
  'c0ffe000-0000-4000-8000-000000000067'::uuid,
  'Cobb salad',
  $instr$Layer lettuce with chicken, bacon, egg, avocado, and blue cheese.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'easy',
  20
),
(
  'c0ffe000-0000-4000-8000-000000000068'::uuid,
  'Hummus platter',
  $instr$Blend chickpeas with tahini, lemon, and garlic. Serve with vegetables and pita.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'easy',
  10
),
(
  'c0ffe000-0000-4000-8000-000000000069'::uuid,
  'Vegetable biryani',
  $instr$Layer spiced rice with sautéed mixed vegetables; steam covered 25 minutes.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'medium',
  55
),
(
  'c0ffe000-0000-4000-8000-000000000070'::uuid,
  'Greek chicken souvlaki',
  $instr$Marinate chicken cubes in lemon, oregano, and olive oil. Grill and serve with tzatziki.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'medium',
  35
),
(
  'c0ffe000-0000-4000-8000-000000000071'::uuid,
  'Peach BBQ glaze ribs',
  $instr$Smoke or bake ribs low and slow; glaze with peach preserves and vinegar in the last 30 minutes.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'hard',
  210
),
(
  'c0ffe000-0000-4000-8000-000000000072'::uuid,
  'Grilled salmon with dill',
  $instr$Oil salmon, grill skin-side down. Top with dill yogurt and lemon.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'easy',
  22
),
(
  'c0ffe000-0000-4000-8000-000000000073'::uuid,
  'Grilled vegetable platter',
  $instr$Toss zucchini, peppers, and onion in oil; grill until tender with char marks.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'easy',
  25
),
(
  'c0ffe000-0000-4000-8000-000000000074'::uuid,
  'Chickpea curry',
  $instr$Sauté onion, add spices, tomatoes, and chickpeas. Simmer and finish with coconut milk.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'easy',
  30
),
(
  'c0ffe000-0000-4000-8000-000000000075'::uuid,
  'Stuffed bell peppers',
  $instr$Fill peppers with ground turkey, rice, and spices; bake until peppers soften.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'medium',
  50
),
(
  'c0ffe000-0000-4000-8000-000000000076'::uuid,
  'Lemon garlic shrimp skewers',
  $instr$Marinate shrimp briefly, thread on skewers, grill 2 minutes per side.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'easy',
  20
),
(
  'c0ffe000-0000-4000-8000-000000000077'::uuid,
  'Panzanella',
  $instr$Toss torn bread with tomatoes, cucumber, red onion, and vinaigrette.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'easy',
  20
),
(
  'c0ffe000-0000-4000-8000-000000000078'::uuid,
  'Pesto pasta',
  $instr$Toss hot pasta with basil pesto and pasta water; top with parmesan.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'easy',
  15
),
(
  'c0ffe000-0000-4000-8000-000000000079'::uuid,
  'Zucchini fritters',
  $instr$Grate zucchini, squeeze dry, mix with egg and flour, pan-fry until golden.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'easy',
  25
),
(
  'c0ffe000-0000-4000-8000-000000000080'::uuid,
  'Banana bread',
  $instr$Mash bananas into batter, bake in a loaf pan until a tester comes out clean.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'easy',
  65
),
(
  'c0ffe000-0000-4000-8000-000000000081'::uuid,
  'Eggplant parmigiana',
  $instr$Salt eggplant slices, roast until golden. Layer with marinara and mozzarella; bake until bubbling.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'medium',
  60
),
(
  'c0ffe000-0000-4000-8000-000000000082'::uuid,
  'Gazpacho',
  $instr$Blend ripe tomatoes, cucumber, pepper, and bread until smooth. Chill at least 2 hours.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'easy',
  15
),
(
  'c0ffe000-0000-4000-8000-000000000083'::uuid,
  'Thai basil chicken',
  $instr$Stir-fry ground chicken with garlic, chilies, and fish sauce. Finish with basil.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'medium',
  20
),
(
  'c0ffe000-0000-4000-8000-000000000084'::uuid,
  'Horiatiki salad',
  $instr$Combine tomato, cucumber, onion, olives, and feta. Dress with olive oil and oregano.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'easy',
  15
),
(
  'c0ffe000-0000-4000-8000-000000000085'::uuid,
  'Lentil walnut Bolognese',
  $instr$Simmer lentils with crushed tomatoes and walnuts until thick. Toss with pasta.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'medium',
  40
),
(
  'c0ffe000-0000-4000-8000-000000000086'::uuid,
  'Cornbread',
  $instr$Mix cornmeal batter, bake in a hot skillet until edges crisp.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'easy',
  30
),
(
  'c0ffe000-0000-4000-8000-000000000087'::uuid,
  'Smoky grilled chicken thighs',
  $instr$Rub thighs with paprika and brown sugar. Grill over medium heat until 165°F.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'easy',
  35
),
(
  'c0ffe000-0000-4000-8000-000000000088'::uuid,
  'Summer watermelon feta salad',
  $instr$Toss cubed watermelon with feta, mint, and lime. Serve chilled.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'easy',
  10
),
(
  'c0ffe000-0000-4000-8000-000000000089'::uuid,
  'Caprese stuffed avocados',
  $instr$Fill avocado halves with mozzarella, tomato, and basil; drizzle balsamic.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'easy',
  15
),
(
  'c0ffe000-0000-4000-8000-000000000090'::uuid,
  'Tofu scramble',
  $instr$Crumble tofu with turmeric, nutritional yeast, and vegetables until heated through.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'easy',
  15
),
(
  'c0ffe000-0000-4000-8000-000000000091'::uuid,
  'Shakshuka',
  $instr$Simmer peppers and tomatoes, poach eggs in the sauce. Serve with crusty bread.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'easy',
  30
),
(
  'c0ffe000-0000-4000-8000-000000000092'::uuid,
  'Chicken noodle soup',
  $instr$Simmer chicken with carrots, celery, and onion; add egg noodles until tender.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'easy',
  45
),
(
  'c0ffe000-0000-4000-8000-000000000093'::uuid,
  'Classic Caesar salad',
  $instr$Toss romaine with anchovy dressing, parmesan, and croutons.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'easy',
  15
),
(
  'c0ffe000-0000-4000-8000-000000000094'::uuid,
  'BBQ pulled pork sandwiches',
  $instr$Rub shoulder with spice blend, slow-cook until shreddable. Toss with BBQ sauce.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'medium',
  240
),
(
  'c0ffe000-0000-4000-8000-000000000095'::uuid,
  'Overnight chia pudding',
  $instr$Mix chia, milk, and vanilla; refrigerate overnight. Top with fruit.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'easy',
  5
),
(
  'c0ffe000-0000-4000-8000-000000000096'::uuid,
  'No-churn vanilla ice cream',
  $instr$Whip cream, fold with sweetened condensed milk and vanilla. Freeze 6 hours.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'easy',
  360
),
(
  'c0ffe000-0000-4000-8000-000000000097'::uuid,
  'Fish tacos with slaw',
  $instr$Grill white fish, flake into tortillas with cabbage slaw and lime crema.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'easy',
  25
),
(
  'c0ffe000-0000-4000-8000-000000000098'::uuid,
  'Pork carnitas bowl',
  $instr$Slow-cook pork shoulder with orange and spices until shreddable. Serve over rice with salsa.$instr$,
  '/recipes/demo-salmon-rosemary.jpg',
  NULL,
  0,
  NULL,
  'medium',
  90
),
(
  'c0ffe000-0000-4000-8000-000000000099'::uuid,
  'Cucumber sesame salad',
  $instr$Toss sliced cucumber with rice vinegar, sesame oil, and seeds.$instr$,
  '/recipes/demo-brazilian-chicken-rice.jpg',
  NULL,
  0,
  NULL,
  'easy',
  10
),
(
  'c0ffe000-0000-4000-8000-000000000100'::uuid,
  'Spinach feta pie',
  $instr$Sauté spinach with onion, mix with feta and eggs, bake in phyllo until golden.$instr$,
  '/recipes/demo-beef-ribs.jpg',
  NULL,
  0,
  NULL,
  'medium',
  50
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, sort_order)
VALUES
  ('c0ffe000-0000-4000-8000-000000000001'::uuid, (SELECT id FROM public.ingredients WHERE name = 'naan flatbread' LIMIT 1), '2 pieces', 0),
  ('c0ffe000-0000-4000-8000-000000000001'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fresh mozzarella' LIMIT 1), '8 oz', 1),
  ('c0ffe000-0000-4000-8000-000000000001'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fresh basil' LIMIT 1), '1 bunch', 2),
  ('c0ffe000-0000-4000-8000-000000000001'::uuid, (SELECT id FROM public.ingredients WHERE name = 'crushed tomatoes' LIMIT 1), '1 cup', 3),
  ('c0ffe000-0000-4000-8000-000000000002'::uuid, (SELECT id FROM public.ingredients WHERE name = 'corn kernels' LIMIT 1), '4 cups', 0),
  ('c0ffe000-0000-4000-8000-000000000002'::uuid, (SELECT id FROM public.ingredients WHERE name = 'cotija cheese' LIMIT 1), '½ cup', 1),
  ('c0ffe000-0000-4000-8000-000000000002'::uuid, (SELECT id FROM public.ingredients WHERE name = 'lime' LIMIT 1), '2 juiced', 2),
  ('c0ffe000-0000-4000-8000-000000000002'::uuid, (SELECT id FROM public.ingredients WHERE name = 'chili powder' LIMIT 1), '1 tsp', 3),
  ('c0ffe000-0000-4000-8000-000000000003'::uuid, (SELECT id FROM public.ingredients WHERE name = 'skin-on salmon fillets' LIMIT 1), '4', 0),
  ('c0ffe000-0000-4000-8000-000000000003'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fresh ginger' LIMIT 1), '2 tbsp minced', 1),
  ('c0ffe000-0000-4000-8000-000000000003'::uuid, (SELECT id FROM public.ingredients WHERE name = 'scallions' LIMIT 1), '6 sliced', 2),
  ('c0ffe000-0000-4000-8000-000000000003'::uuid, (SELECT id FROM public.ingredients WHERE name = 'soy sauce' LIMIT 1), '3 tbsp', 3),
  ('c0ffe000-0000-4000-8000-000000000004'::uuid, (SELECT id FROM public.ingredients WHERE name = 'chicken breast' LIMIT 1), '1.5 lb cubed', 0),
  ('c0ffe000-0000-4000-8000-000000000004'::uuid, (SELECT id FROM public.ingredients WHERE name = 'dried oregano' LIMIT 1), '2 tsp', 1),
  ('c0ffe000-0000-4000-8000-000000000004'::uuid, (SELECT id FROM public.ingredients WHERE name = 'plain Greek yogurt' LIMIT 1), '1 cup for tzatziki', 2),
  ('c0ffe000-0000-4000-8000-000000000004'::uuid, (SELECT id FROM public.ingredients WHERE name = 'pita bread' LIMIT 1), '4', 3),
  ('c0ffe000-0000-4000-8000-000000000005'::uuid, (SELECT id FROM public.ingredients WHERE name = 'canned chickpeas' LIMIT 1), '2', 0),
  ('c0ffe000-0000-4000-8000-000000000005'::uuid, (SELECT id FROM public.ingredients WHERE name = 'garam masala' LIMIT 1), '2 tsp', 1),
  ('c0ffe000-0000-4000-8000-000000000005'::uuid, (SELECT id FROM public.ingredients WHERE name = 'crushed tomatoes' LIMIT 1), '1 can', 2),
  ('c0ffe000-0000-4000-8000-000000000005'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fresh cilantro' LIMIT 1), 'for garnish', 3),
  ('c0ffe000-0000-4000-8000-000000000006'::uuid, (SELECT id FROM public.ingredients WHERE name = 'elbow macaroni' LIMIT 1), '1 lb', 0),
  ('c0ffe000-0000-4000-8000-000000000006'::uuid, (SELECT id FROM public.ingredients WHERE name = 'sharp cheddar' LIMIT 1), '3 cups grated', 1),
  ('c0ffe000-0000-4000-8000-000000000006'::uuid, (SELECT id FROM public.ingredients WHERE name = 'whole milk' LIMIT 1), '2 cups', 2),
  ('c0ffe000-0000-4000-8000-000000000006'::uuid, (SELECT id FROM public.ingredients WHERE name = 'unsalted butter' LIMIT 1), '4 tbsp', 3),
  ('c0ffe000-0000-4000-8000-000000000007'::uuid, (SELECT id FROM public.ingredients WHERE name = 'bone-in chicken thighs' LIMIT 1), '8', 0),
  ('c0ffe000-0000-4000-8000-000000000007'::uuid, (SELECT id FROM public.ingredients WHERE name = 'smoked paprika' LIMIT 1), '2 tbsp', 1),
  ('c0ffe000-0000-4000-8000-000000000007'::uuid, (SELECT id FROM public.ingredients WHERE name = 'light brown sugar' LIMIT 1), '1 tbsp', 2),
  ('c0ffe000-0000-4000-8000-000000000007'::uuid, (SELECT id FROM public.ingredients WHERE name = 'kosher salt' LIMIT 1), 'to taste', 3),
  ('c0ffe000-0000-4000-8000-000000000008'::uuid, (SELECT id FROM public.ingredients WHERE name = 'large shrimp peeled' LIMIT 1), '1.5 lb', 0),
  ('c0ffe000-0000-4000-8000-000000000008'::uuid, (SELECT id FROM public.ingredients WHERE name = 'garlic cloves' LIMIT 1), '4 minced', 1),
  ('c0ffe000-0000-4000-8000-000000000008'::uuid, (SELECT id FROM public.ingredients WHERE name = 'lemon' LIMIT 1), '2', 2),
  ('c0ffe000-0000-4000-8000-000000000008'::uuid, (SELECT id FROM public.ingredients WHERE name = 'extra-virgin olive oil' LIMIT 1), '3 tbsp', 3),
  ('c0ffe000-0000-4000-8000-000000000009'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ripe avocados' LIMIT 1), '4', 0),
  ('c0ffe000-0000-4000-8000-000000000009'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fresh mozzarella' LIMIT 1), '8 oz', 1),
  ('c0ffe000-0000-4000-8000-000000000009'::uuid, (SELECT id FROM public.ingredients WHERE name = 'balsamic glaze' LIMIT 1), '2 tbsp', 2),
  ('c0ffe000-0000-4000-8000-000000000009'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fresh basil' LIMIT 1), 'handful', 3),
  ('c0ffe000-0000-4000-8000-000000000010'::uuid, (SELECT id FROM public.ingredients WHERE name = 'canned chickpeas' LIMIT 1), '2', 0),
  ('c0ffe000-0000-4000-8000-000000000010'::uuid, (SELECT id FROM public.ingredients WHERE name = 'coconut milk' LIMIT 1), '1 can', 1),
  ('c0ffe000-0000-4000-8000-000000000010'::uuid, (SELECT id FROM public.ingredients WHERE name = 'curry powder' LIMIT 1), '2 tbsp', 2),
  ('c0ffe000-0000-4000-8000-000000000010'::uuid, (SELECT id FROM public.ingredients WHERE name = 'spinach' LIMIT 1), '4 cups', 3),
  ('c0ffe000-0000-4000-8000-000000000011'::uuid, (SELECT id FROM public.ingredients WHERE name = 'quinoa' LIMIT 1), '1 cup dry', 0),
  ('c0ffe000-0000-4000-8000-000000000011'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fresh parsley' LIMIT 1), '2 cups', 1),
  ('c0ffe000-0000-4000-8000-000000000011'::uuid, (SELECT id FROM public.ingredients WHERE name = 'lemon' LIMIT 1), '2 juiced', 2),
  ('c0ffe000-0000-4000-8000-000000000011'::uuid, (SELECT id FROM public.ingredients WHERE name = 'english cucumber' LIMIT 1), '1 diced', 3),
  ('c0ffe000-0000-4000-8000-000000000012'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ripe tomatoes' LIMIT 1), '2 lb', 0),
  ('c0ffe000-0000-4000-8000-000000000012'::uuid, (SELECT id FROM public.ingredients WHERE name = 'english cucumber' LIMIT 1), '1', 1),
  ('c0ffe000-0000-4000-8000-000000000012'::uuid, (SELECT id FROM public.ingredients WHERE name = 'day-old bread' LIMIT 1), '2 slices', 2),
  ('c0ffe000-0000-4000-8000-000000000012'::uuid, (SELECT id FROM public.ingredients WHERE name = 'sherry vinegar' LIMIT 1), '2 tbsp', 3),
  ('c0ffe000-0000-4000-8000-000000000013'::uuid, (SELECT id FROM public.ingredients WHERE name = 'seedless watermelon' LIMIT 1), '4 cups cubed', 0),
  ('c0ffe000-0000-4000-8000-000000000013'::uuid, (SELECT id FROM public.ingredients WHERE name = 'feta cheese' LIMIT 1), '4 oz', 1),
  ('c0ffe000-0000-4000-8000-000000000013'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fresh mint' LIMIT 1), '¼ cup', 2),
  ('c0ffe000-0000-4000-8000-000000000013'::uuid, (SELECT id FROM public.ingredients WHERE name = 'lime' LIMIT 1), '1', 3),
  ('c0ffe000-0000-4000-8000-000000000014'::uuid, (SELECT id FROM public.ingredients WHERE name = 'spaghetti' LIMIT 1), '12 oz', 0),
  ('c0ffe000-0000-4000-8000-000000000014'::uuid, (SELECT id FROM public.ingredients WHERE name = 'garlic cloves' LIMIT 1), '6 sliced', 1),
  ('c0ffe000-0000-4000-8000-000000000014'::uuid, (SELECT id FROM public.ingredients WHERE name = 'extra-virgin olive oil' LIMIT 1), '½ cup', 2),
  ('c0ffe000-0000-4000-8000-000000000014'::uuid, (SELECT id FROM public.ingredients WHERE name = 'red pepper flakes' LIMIT 1), '½ tsp', 3),
  ('c0ffe000-0000-4000-8000-000000000015'::uuid, (SELECT id FROM public.ingredients WHERE name = 'eggs' LIMIT 1), '6', 0),
  ('c0ffe000-0000-4000-8000-000000000015'::uuid, (SELECT id FROM public.ingredients WHERE name = 'heavy cream' LIMIT 1), '2 tbsp', 1),
  ('c0ffe000-0000-4000-8000-000000000015'::uuid, (SELECT id FROM public.ingredients WHERE name = 'unsalted butter' LIMIT 1), '2 tbsp', 2),
  ('c0ffe000-0000-4000-8000-000000000015'::uuid, (SELECT id FROM public.ingredients WHERE name = 'chives' LIMIT 1), 'for garnish', 3),
  ('c0ffe000-0000-4000-8000-000000000016'::uuid, (SELECT id FROM public.ingredients WHERE name = 'all-purpose flour' LIMIT 1), '2¼ cups', 0),
  ('c0ffe000-0000-4000-8000-000000000016'::uuid, (SELECT id FROM public.ingredients WHERE name = 'chocolate chips' LIMIT 1), '2 cups', 1),
  ('c0ffe000-0000-4000-8000-000000000016'::uuid, (SELECT id FROM public.ingredients WHERE name = 'unsalted butter' LIMIT 1), '1 cup', 2),
  ('c0ffe000-0000-4000-8000-000000000016'::uuid, (SELECT id FROM public.ingredients WHERE name = 'brown sugar' LIMIT 1), '¾ cup', 3),
  ('c0ffe000-0000-4000-8000-000000000017'::uuid, (SELECT id FROM public.ingredients WHERE name = 'spaghetti' LIMIT 1), '12 oz', 0),
  ('c0ffe000-0000-4000-8000-000000000017'::uuid, (SELECT id FROM public.ingredients WHERE name = 'pecorino romano' LIMIT 1), '1 cup grated', 1),
  ('c0ffe000-0000-4000-8000-000000000017'::uuid, (SELECT id FROM public.ingredients WHERE name = 'black pepper' LIMIT 1), '2 tbsp coarsely ground', 2),
  ('c0ffe000-0000-4000-8000-000000000017'::uuid, (SELECT id FROM public.ingredients WHERE name = 'unsalted butter' LIMIT 1), '3 tbsp', 3),
  ('c0ffe000-0000-4000-8000-000000000018'::uuid, (SELECT id FROM public.ingredients WHERE name = 'shredded cooked chicken' LIMIT 1), '3 cups', 0),
  ('c0ffe000-0000-4000-8000-000000000018'::uuid, (SELECT id FROM public.ingredients WHERE name = 'chipotle in adobo' LIMIT 1), '2 tbsp', 1),
  ('c0ffe000-0000-4000-8000-000000000018'::uuid, (SELECT id FROM public.ingredients WHERE name = 'corn tortillas' LIMIT 1), '12', 2),
  ('c0ffe000-0000-4000-8000-000000000018'::uuid, (SELECT id FROM public.ingredients WHERE name = 'white onion' LIMIT 1), '1 diced', 3),
  ('c0ffe000-0000-4000-8000-000000000019'::uuid, (SELECT id FROM public.ingredients WHERE name = 'bone-in chicken thighs' LIMIT 1), '4', 0),
  ('c0ffe000-0000-4000-8000-000000000019'::uuid, (SELECT id FROM public.ingredients WHERE name = 'egg noodles' LIMIT 1), '8 oz', 1),
  ('c0ffe000-0000-4000-8000-000000000019'::uuid, (SELECT id FROM public.ingredients WHERE name = 'carrots' LIMIT 1), '3 sliced', 2),
  ('c0ffe000-0000-4000-8000-000000000019'::uuid, (SELECT id FROM public.ingredients WHERE name = 'celery' LIMIT 1), '3 stalks', 3),
  ('c0ffe000-0000-4000-8000-000000000020'::uuid, (SELECT id FROM public.ingredients WHERE name = 'roma tomatoes' LIMIT 1), '4', 0),
  ('c0ffe000-0000-4000-8000-000000000020'::uuid, (SELECT id FROM public.ingredients WHERE name = 'english cucumber' LIMIT 1), '1', 1),
  ('c0ffe000-0000-4000-8000-000000000020'::uuid, (SELECT id FROM public.ingredients WHERE name = 'Kalamata olives' LIMIT 1), '1 cup', 2),
  ('c0ffe000-0000-4000-8000-000000000020'::uuid, (SELECT id FROM public.ingredients WHERE name = 'feta cheese' LIMIT 1), '8 oz', 3),
  ('c0ffe000-0000-4000-8000-000000000021'::uuid, (SELECT id FROM public.ingredients WHERE name = 'bone-in chicken thighs' LIMIT 1), '6', 0),
  ('c0ffe000-0000-4000-8000-000000000021'::uuid, (SELECT id FROM public.ingredients WHERE name = 'plain yogurt' LIMIT 1), '1 cup', 1),
  ('c0ffe000-0000-4000-8000-000000000021'::uuid, (SELECT id FROM public.ingredients WHERE name = 'tandoori spice blend' LIMIT 1), '3 tbsp', 2),
  ('c0ffe000-0000-4000-8000-000000000021'::uuid, (SELECT id FROM public.ingredients WHERE name = 'lemon' LIMIT 1), '1', 3),
  ('c0ffe000-0000-4000-8000-000000000022'::uuid, (SELECT id FROM public.ingredients WHERE name = 'brown lentils' LIMIT 1), '1 cup', 0),
  ('c0ffe000-0000-4000-8000-000000000022'::uuid, (SELECT id FROM public.ingredients WHERE name = 'walnuts' LIMIT 1), '1 cup chopped', 1),
  ('c0ffe000-0000-4000-8000-000000000022'::uuid, (SELECT id FROM public.ingredients WHERE name = 'spaghetti' LIMIT 1), '12 oz', 2),
  ('c0ffe000-0000-4000-8000-000000000022'::uuid, (SELECT id FROM public.ingredients WHERE name = 'crushed tomatoes' LIMIT 1), '1 can', 3),
  ('c0ffe000-0000-4000-8000-000000000023'::uuid, (SELECT id FROM public.ingredients WHERE name = 'pork shoulder' LIMIT 1), '4 lb', 0),
  ('c0ffe000-0000-4000-8000-000000000023'::uuid, (SELECT id FROM public.ingredients WHERE name = 'BBQ sauce' LIMIT 1), '2 cups', 1),
  ('c0ffe000-0000-4000-8000-000000000023'::uuid, (SELECT id FROM public.ingredients WHERE name = 'hamburger buns' LIMIT 1), '12', 2),
  ('c0ffe000-0000-4000-8000-000000000023'::uuid, (SELECT id FROM public.ingredients WHERE name = 'coleslaw mix' LIMIT 1), '4 cups', 3),
  ('c0ffe000-0000-4000-8000-000000000024'::uuid, (SELECT id FROM public.ingredients WHERE name = 'cod fillets' LIMIT 1), '1.5 lb', 0),
  ('c0ffe000-0000-4000-8000-000000000024'::uuid, (SELECT id FROM public.ingredients WHERE name = 'corn tortillas' LIMIT 1), '12', 1),
  ('c0ffe000-0000-4000-8000-000000000024'::uuid, (SELECT id FROM public.ingredients WHERE name = 'shredded cabbage' LIMIT 1), '4 cups', 2),
  ('c0ffe000-0000-4000-8000-000000000024'::uuid, (SELECT id FROM public.ingredients WHERE name = 'sour cream' LIMIT 1), '½ cup', 3),
  ('c0ffe000-0000-4000-8000-000000000025'::uuid, (SELECT id FROM public.ingredients WHERE name = 'romaine hearts' LIMIT 1), '2', 0),
  ('c0ffe000-0000-4000-8000-000000000025'::uuid, (SELECT id FROM public.ingredients WHERE name = 'parmesan cheese' LIMIT 1), '½ cup', 1),
  ('c0ffe000-0000-4000-8000-000000000025'::uuid, (SELECT id FROM public.ingredients WHERE name = 'croutons' LIMIT 1), '2 cups', 2),
  ('c0ffe000-0000-4000-8000-000000000025'::uuid, (SELECT id FROM public.ingredients WHERE name = 'anchovy paste' LIMIT 1), '1 tsp', 3),
  ('c0ffe000-0000-4000-8000-000000000026'::uuid, (SELECT id FROM public.ingredients WHERE name = 'extra-firm tofu' LIMIT 1), '14 oz', 0),
  ('c0ffe000-0000-4000-8000-000000000026'::uuid, (SELECT id FROM public.ingredients WHERE name = 'nutritional yeast' LIMIT 1), '3 tbsp', 1),
  ('c0ffe000-0000-4000-8000-000000000026'::uuid, (SELECT id FROM public.ingredients WHERE name = 'bell pepper' LIMIT 1), '1 diced', 2),
  ('c0ffe000-0000-4000-8000-000000000026'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ground turmeric' LIMIT 1), '½ tsp', 3),
  ('c0ffe000-0000-4000-8000-000000000027'::uuid, (SELECT id FROM public.ingredients WHERE name = 'chicken breast' LIMIT 1), '1 lb sliced', 0),
  ('c0ffe000-0000-4000-8000-000000000027'::uuid, (SELECT id FROM public.ingredients WHERE name = 'tamari' LIMIT 1), '3 tbsp', 1),
  ('c0ffe000-0000-4000-8000-000000000027'::uuid, (SELECT id FROM public.ingredients WHERE name = 'rice noodles' LIMIT 1), '8 oz', 2),
  ('c0ffe000-0000-4000-8000-000000000027'::uuid, (SELECT id FROM public.ingredients WHERE name = 'broccoli florets' LIMIT 1), '3 cups', 3),
  ('c0ffe000-0000-4000-8000-000000000028'::uuid, (SELECT id FROM public.ingredients WHERE name = 'eggs' LIMIT 1), '6', 0),
  ('c0ffe000-0000-4000-8000-000000000028'::uuid, (SELECT id FROM public.ingredients WHERE name = 'bell peppers' LIMIT 1), '2 sliced', 1),
  ('c0ffe000-0000-4000-8000-000000000028'::uuid, (SELECT id FROM public.ingredients WHERE name = 'crushed tomatoes' LIMIT 1), '1 can', 2),
  ('c0ffe000-0000-4000-8000-000000000028'::uuid, (SELECT id FROM public.ingredients WHERE name = 'smoked paprika' LIMIT 1), '1 tsp', 3),
  ('c0ffe000-0000-4000-8000-000000000029'::uuid, (SELECT id FROM public.ingredients WHERE name = 'shredded cabbage' LIMIT 1), '4 cups', 0),
  ('c0ffe000-0000-4000-8000-000000000029'::uuid, (SELECT id FROM public.ingredients WHERE name = 'carrots' LIMIT 1), '2 grated', 1),
  ('c0ffe000-0000-4000-8000-000000000029'::uuid, (SELECT id FROM public.ingredients WHERE name = 'rice vinegar' LIMIT 1), '3 tbsp', 2),
  ('c0ffe000-0000-4000-8000-000000000029'::uuid, (SELECT id FROM public.ingredients WHERE name = 'toasted sesame oil' LIMIT 1), '1 tbsp', 3),
  ('c0ffe000-0000-4000-8000-000000000030'::uuid, (SELECT id FROM public.ingredients WHERE name = 'penne' LIMIT 1), '12 oz', 0),
  ('c0ffe000-0000-4000-8000-000000000030'::uuid, (SELECT id FROM public.ingredients WHERE name = 'tomato passata' LIMIT 1), '2 cups', 1),
  ('c0ffe000-0000-4000-8000-000000000030'::uuid, (SELECT id FROM public.ingredients WHERE name = 'vodka' LIMIT 1), '¼ cup', 2),
  ('c0ffe000-0000-4000-8000-000000000030'::uuid, (SELECT id FROM public.ingredients WHERE name = 'heavy cream' LIMIT 1), '½ cup', 3),
  ('c0ffe000-0000-4000-8000-000000000031'::uuid, (SELECT id FROM public.ingredients WHERE name = 'corn on the cob' LIMIT 1), '6', 0),
  ('c0ffe000-0000-4000-8000-000000000031'::uuid, (SELECT id FROM public.ingredients WHERE name = 'unsalted butter' LIMIT 1), '½ cup softened', 1),
  ('c0ffe000-0000-4000-8000-000000000031'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fresh parsley' LIMIT 1), '¼ cup', 2),
  ('c0ffe000-0000-4000-8000-000000000031'::uuid, (SELECT id FROM public.ingredients WHERE name = 'garlic cloves' LIMIT 1), '2 minced', 3),
  ('c0ffe000-0000-4000-8000-000000000032'::uuid, (SELECT id FROM public.ingredients WHERE name = 'mixed berries' LIMIT 1), '6 cups', 0),
  ('c0ffe000-0000-4000-8000-000000000032'::uuid, (SELECT id FROM public.ingredients WHERE name = 'rolled oats' LIMIT 1), '1 cup', 1),
  ('c0ffe000-0000-4000-8000-000000000032'::uuid, (SELECT id FROM public.ingredients WHERE name = 'all-purpose flour' LIMIT 1), '1 cup', 2),
  ('c0ffe000-0000-4000-8000-000000000032'::uuid, (SELECT id FROM public.ingredients WHERE name = 'unsalted butter' LIMIT 1), '½ cup', 3),
  ('c0ffe000-0000-4000-8000-000000000033'::uuid, (SELECT id FROM public.ingredients WHERE name = 'chicken breast cutlets' LIMIT 1), '1.5 lb', 0),
  ('c0ffe000-0000-4000-8000-000000000033'::uuid, (SELECT id FROM public.ingredients WHERE name = 'all-purpose flour' LIMIT 1), '½ cup', 1),
  ('c0ffe000-0000-4000-8000-000000000033'::uuid, (SELECT id FROM public.ingredients WHERE name = 'capers' LIMIT 1), '3 tbsp', 2),
  ('c0ffe000-0000-4000-8000-000000000033'::uuid, (SELECT id FROM public.ingredients WHERE name = 'lemon' LIMIT 1), '2', 3),
  ('c0ffe000-0000-4000-8000-000000000034'::uuid, (SELECT id FROM public.ingredients WHERE name = 'canned chopped clams' LIMIT 1), '2', 0),
  ('c0ffe000-0000-4000-8000-000000000034'::uuid, (SELECT id FROM public.ingredients WHERE name = 'russet potatoes' LIMIT 1), '3 diced', 1),
  ('c0ffe000-0000-4000-8000-000000000034'::uuid, (SELECT id FROM public.ingredients WHERE name = 'heavy cream' LIMIT 1), '1 cup', 2),
  ('c0ffe000-0000-4000-8000-000000000034'::uuid, (SELECT id FROM public.ingredients WHERE name = 'celery' LIMIT 1), '3 stalks', 3),
  ('c0ffe000-0000-4000-8000-000000000035'::uuid, (SELECT id FROM public.ingredients WHERE name = 'cooked jasmine rice' LIMIT 1), '4 cups cold', 0),
  ('c0ffe000-0000-4000-8000-000000000035'::uuid, (SELECT id FROM public.ingredients WHERE name = 'frozen mixed vegetables' LIMIT 1), '2 cups', 1),
  ('c0ffe000-0000-4000-8000-000000000035'::uuid, (SELECT id FROM public.ingredients WHERE name = 'eggs' LIMIT 1), '3 beaten', 2),
  ('c0ffe000-0000-4000-8000-000000000035'::uuid, (SELECT id FROM public.ingredients WHERE name = 'soy sauce' LIMIT 1), '3 tbsp', 3),
  ('c0ffe000-0000-4000-8000-000000000036'::uuid, (SELECT id FROM public.ingredients WHERE name = 'halloumi cheese' LIMIT 1), '12 oz', 0),
  ('c0ffe000-0000-4000-8000-000000000036'::uuid, (SELECT id FROM public.ingredients WHERE name = 'cherry tomatoes' LIMIT 1), '2 cups', 1),
  ('c0ffe000-0000-4000-8000-000000000036'::uuid, (SELECT id FROM public.ingredients WHERE name = 'zucchini' LIMIT 1), '2 chunked', 2),
  ('c0ffe000-0000-4000-8000-000000000036'::uuid, (SELECT id FROM public.ingredients WHERE name = 'lemon' LIMIT 1), '1', 3),
  ('c0ffe000-0000-4000-8000-000000000037'::uuid, (SELECT id FROM public.ingredients WHERE name = 'frozen spinach' LIMIT 1), '16 oz thawed', 0),
  ('c0ffe000-0000-4000-8000-000000000037'::uuid, (SELECT id FROM public.ingredients WHERE name = 'feta cheese' LIMIT 1), '8 oz', 1),
  ('c0ffe000-0000-4000-8000-000000000037'::uuid, (SELECT id FROM public.ingredients WHERE name = 'phyllo dough' LIMIT 1), '1 package', 2),
  ('c0ffe000-0000-4000-8000-000000000037'::uuid, (SELECT id FROM public.ingredients WHERE name = 'eggs' LIMIT 1), '3', 3),
  ('c0ffe000-0000-4000-8000-000000000038'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ground beef' LIMIT 1), '2 lb', 0),
  ('c0ffe000-0000-4000-8000-000000000038'::uuid, (SELECT id FROM public.ingredients WHERE name = 'breadcrumbs' LIMIT 1), '1 cup', 1),
  ('c0ffe000-0000-4000-8000-000000000038'::uuid, (SELECT id FROM public.ingredients WHERE name = 'eggs' LIMIT 1), '2', 2),
  ('c0ffe000-0000-4000-8000-000000000038'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ketchup' LIMIT 1), '½ cup for glaze', 3),
  ('c0ffe000-0000-4000-8000-000000000039'::uuid, (SELECT id FROM public.ingredients WHERE name = 'whole chicken' LIMIT 1), '4 lb', 0),
  ('c0ffe000-0000-4000-8000-000000000039'::uuid, (SELECT id FROM public.ingredients WHERE name = 'lager beer' LIMIT 1), '1 can', 1),
  ('c0ffe000-0000-4000-8000-000000000039'::uuid, (SELECT id FROM public.ingredients WHERE name = 'garlic powder' LIMIT 1), '1 tbsp', 2),
  ('c0ffe000-0000-4000-8000-000000000039'::uuid, (SELECT id FROM public.ingredients WHERE name = 'lemon' LIMIT 1), '1 in cavity', 3),
  ('c0ffe000-0000-4000-8000-000000000040'::uuid, (SELECT id FROM public.ingredients WHERE name = 'crushed tomatoes' LIMIT 1), '2 cans', 0),
  ('c0ffe000-0000-4000-8000-000000000040'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fresh basil' LIMIT 1), '1 cup', 1),
  ('c0ffe000-0000-4000-8000-000000000040'::uuid, (SELECT id FROM public.ingredients WHERE name = 'heavy cream' LIMIT 1), '½ cup', 2),
  ('c0ffe000-0000-4000-8000-000000000040'::uuid, (SELECT id FROM public.ingredients WHERE name = 'yellow onion' LIMIT 1), '1', 3),
  ('c0ffe000-0000-4000-8000-000000000041'::uuid, (SELECT id FROM public.ingredients WHERE name = 'farro' LIMIT 1), '1 cup dry', 0),
  ('c0ffe000-0000-4000-8000-000000000041'::uuid, (SELECT id FROM public.ingredients WHERE name = 'sweet potato' LIMIT 1), '2 cubed', 1),
  ('c0ffe000-0000-4000-8000-000000000041'::uuid, (SELECT id FROM public.ingredients WHERE name = 'broccoli florets' LIMIT 1), '3 cups', 2),
  ('c0ffe000-0000-4000-8000-000000000041'::uuid, (SELECT id FROM public.ingredients WHERE name = 'tahini' LIMIT 1), '3 tbsp', 3),
  ('c0ffe000-0000-4000-8000-000000000042'::uuid, (SELECT id FROM public.ingredients WHERE name = 'romaine hearts' LIMIT 1), '3 chopped', 0),
  ('c0ffe000-0000-4000-8000-000000000042'::uuid, (SELECT id FROM public.ingredients WHERE name = 'raw cashews' LIMIT 1), '½ cup soaked', 1),
  ('c0ffe000-0000-4000-8000-000000000042'::uuid, (SELECT id FROM public.ingredients WHERE name = 'canned chickpeas' LIMIT 1), '1 can roasted', 2),
  ('c0ffe000-0000-4000-8000-000000000042'::uuid, (SELECT id FROM public.ingredients WHERE name = 'lemon' LIMIT 1), '1 juiced', 3),
  ('c0ffe000-0000-4000-8000-000000000043'::uuid, (SELECT id FROM public.ingredients WHERE name = 'sweet potato' LIMIT 1), '2 large', 0),
  ('c0ffe000-0000-4000-8000-000000000043'::uuid, (SELECT id FROM public.ingredients WHERE name = 'black beans' LIMIT 1), '2 cans', 1),
  ('c0ffe000-0000-4000-8000-000000000043'::uuid, (SELECT id FROM public.ingredients WHERE name = 'corn tortillas' LIMIT 1), '12', 2),
  ('c0ffe000-0000-4000-8000-000000000043'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fresh cilantro' LIMIT 1), '1 bunch', 3),
  ('c0ffe000-0000-4000-8000-000000000044'::uuid, (SELECT id FROM public.ingredients WHERE name = 'corn kernels' LIMIT 1), '4 cups', 0),
  ('c0ffe000-0000-4000-8000-000000000044'::uuid, (SELECT id FROM public.ingredients WHERE name = 'russet potatoes' LIMIT 1), '2', 1),
  ('c0ffe000-0000-4000-8000-000000000044'::uuid, (SELECT id FROM public.ingredients WHERE name = 'heavy cream' LIMIT 1), '1 cup', 2),
  ('c0ffe000-0000-4000-8000-000000000044'::uuid, (SELECT id FROM public.ingredients WHERE name = 'bacon' LIMIT 1), '4 slices', 3),
  ('c0ffe000-0000-4000-8000-000000000045'::uuid, (SELECT id FROM public.ingredients WHERE name = 'canned tuna' LIMIT 1), '2', 0),
  ('c0ffe000-0000-4000-8000-000000000045'::uuid, (SELECT id FROM public.ingredients WHERE name = 'green beans' LIMIT 1), '1 lb blanched', 1),
  ('c0ffe000-0000-4000-8000-000000000045'::uuid, (SELECT id FROM public.ingredients WHERE name = 'hard-boiled eggs' LIMIT 1), '4', 2),
  ('c0ffe000-0000-4000-8000-000000000045'::uuid, (SELECT id FROM public.ingredients WHERE name = 'niçoise olives' LIMIT 1), '1 cup', 3),
  ('c0ffe000-0000-4000-8000-000000000046'::uuid, (SELECT id FROM public.ingredients WHERE name = 'baby spinach' LIMIT 1), '6 cups', 0),
  ('c0ffe000-0000-4000-8000-000000000046'::uuid, (SELECT id FROM public.ingredients WHERE name = 'strawberries' LIMIT 1), '2 cups sliced', 1),
  ('c0ffe000-0000-4000-8000-000000000046'::uuid, (SELECT id FROM public.ingredients WHERE name = 'goat cheese' LIMIT 1), '4 oz', 2),
  ('c0ffe000-0000-4000-8000-000000000046'::uuid, (SELECT id FROM public.ingredients WHERE name = 'sliced almonds' LIMIT 1), '¼ cup', 3),
  ('c0ffe000-0000-4000-8000-000000000047'::uuid, (SELECT id FROM public.ingredients WHERE name = 'all-purpose flour' LIMIT 1), '1½ cups', 0),
  ('c0ffe000-0000-4000-8000-000000000047'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ripe banana' LIMIT 1), '2 mashed', 1),
  ('c0ffe000-0000-4000-8000-000000000047'::uuid, (SELECT id FROM public.ingredients WHERE name = 'eggs' LIMIT 1), '2', 2),
  ('c0ffe000-0000-4000-8000-000000000047'::uuid, (SELECT id FROM public.ingredients WHERE name = 'maple syrup' LIMIT 1), 'for serving', 3),
  ('c0ffe000-0000-4000-8000-000000000048'::uuid, (SELECT id FROM public.ingredients WHERE name = 'all-purpose flour' LIMIT 1), '2 cups', 0),
  ('c0ffe000-0000-4000-8000-000000000048'::uuid, (SELECT id FROM public.ingredients WHERE name = 'lemons' LIMIT 1), '4 juiced', 1),
  ('c0ffe000-0000-4000-8000-000000000048'::uuid, (SELECT id FROM public.ingredients WHERE name = 'eggs' LIMIT 1), '4', 2),
  ('c0ffe000-0000-4000-8000-000000000048'::uuid, (SELECT id FROM public.ingredients WHERE name = 'powdered sugar' LIMIT 1), 'for dusting', 3),
  ('c0ffe000-0000-4000-8000-000000000049'::uuid, (SELECT id FROM public.ingredients WHERE name = 'whole sea bass' LIMIT 1), '2 small', 0),
  ('c0ffe000-0000-4000-8000-000000000049'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fresh dill' LIMIT 1), '¼ cup', 1),
  ('c0ffe000-0000-4000-8000-000000000049'::uuid, (SELECT id FROM public.ingredients WHERE name = 'lemon' LIMIT 1), '2', 2),
  ('c0ffe000-0000-4000-8000-000000000049'::uuid, (SELECT id FROM public.ingredients WHERE name = 'extra-virgin olive oil' LIMIT 1), '3 tbsp', 3),
  ('c0ffe000-0000-4000-8000-000000000050'::uuid, (SELECT id FROM public.ingredients WHERE name = 'black beans' LIMIT 1), '2 cans drained', 0),
  ('c0ffe000-0000-4000-8000-000000000050'::uuid, (SELECT id FROM public.ingredients WHERE name = 'Monterey Jack cheese' LIMIT 1), '2 cups', 1),
  ('c0ffe000-0000-4000-8000-000000000050'::uuid, (SELECT id FROM public.ingredients WHERE name = 'flour tortillas' LIMIT 1), '8', 2),
  ('c0ffe000-0000-4000-8000-000000000050'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ground cumin' LIMIT 1), '1 tsp', 3),
  ('c0ffe000-0000-4000-8000-000000000051'::uuid, (SELECT id FROM public.ingredients WHERE name = 'white miso paste' LIMIT 1), '3 tbsp', 0),
  ('c0ffe000-0000-4000-8000-000000000051'::uuid, (SELECT id FROM public.ingredients WHERE name = 'silken tofu' LIMIT 1), '8 oz cubed', 1),
  ('c0ffe000-0000-4000-8000-000000000051'::uuid, (SELECT id FROM public.ingredients WHERE name = 'dried wakame' LIMIT 1), '2 tbsp', 2),
  ('c0ffe000-0000-4000-8000-000000000051'::uuid, (SELECT id FROM public.ingredients WHERE name = 'green onion' LIMIT 1), '2 sliced', 3),
  ('c0ffe000-0000-4000-8000-000000000052'::uuid, (SELECT id FROM public.ingredients WHERE name = 'portobello mushrooms' LIMIT 1), '4 large', 0),
  ('c0ffe000-0000-4000-8000-000000000052'::uuid, (SELECT id FROM public.ingredients WHERE name = 'balsamic vinegar' LIMIT 1), '¼ cup', 1),
  ('c0ffe000-0000-4000-8000-000000000052'::uuid, (SELECT id FROM public.ingredients WHERE name = 'extra-virgin olive oil' LIMIT 1), '3 tbsp', 2),
  ('c0ffe000-0000-4000-8000-000000000052'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fresh thyme' LIMIT 1), '2 tsp', 3),
  ('c0ffe000-0000-4000-8000-000000000053'::uuid, (SELECT id FROM public.ingredients WHERE name = 'red lentils' LIMIT 1), '1 cup', 0),
  ('c0ffe000-0000-4000-8000-000000000053'::uuid, (SELECT id FROM public.ingredients WHERE name = 'yellow onion' LIMIT 1), '1 diced', 1),
  ('c0ffe000-0000-4000-8000-000000000053'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ghee' LIMIT 1), '2 tbsp', 2),
  ('c0ffe000-0000-4000-8000-000000000053'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ground turmeric' LIMIT 1), '½ tsp', 3),
  ('c0ffe000-0000-4000-8000-000000000054'::uuid, (SELECT id FROM public.ingredients WHERE name = 'chicken pieces' LIMIT 1), '3 lb', 0),
  ('c0ffe000-0000-4000-8000-000000000054'::uuid, (SELECT id FROM public.ingredients WHERE name = 'buttermilk' LIMIT 1), '2 cups', 1),
  ('c0ffe000-0000-4000-8000-000000000054'::uuid, (SELECT id FROM public.ingredients WHERE name = 'all-purpose flour' LIMIT 1), '2 cups', 2),
  ('c0ffe000-0000-4000-8000-000000000054'::uuid, (SELECT id FROM public.ingredients WHERE name = 'paprika' LIMIT 1), '2 tsp', 3),
  ('c0ffe000-0000-4000-8000-000000000055'::uuid, (SELECT id FROM public.ingredients WHERE name = 'dry sea scallops' LIMIT 1), '12', 0),
  ('c0ffe000-0000-4000-8000-000000000055'::uuid, (SELECT id FROM public.ingredients WHERE name = 'frozen peas' LIMIT 1), '2 cups', 1),
  ('c0ffe000-0000-4000-8000-000000000055'::uuid, (SELECT id FROM public.ingredients WHERE name = 'unsalted butter' LIMIT 1), '3 tbsp', 2),
  ('c0ffe000-0000-4000-8000-000000000055'::uuid, (SELECT id FROM public.ingredients WHERE name = 'lemon' LIMIT 1), '1', 3),
  ('c0ffe000-0000-4000-8000-000000000056'::uuid, (SELECT id FROM public.ingredients WHERE name = 'sushi-grade tuna' LIMIT 1), '12 oz', 0),
  ('c0ffe000-0000-4000-8000-000000000056'::uuid, (SELECT id FROM public.ingredients WHERE name = 'soy sauce' LIMIT 1), '3 tbsp', 1),
  ('c0ffe000-0000-4000-8000-000000000056'::uuid, (SELECT id FROM public.ingredients WHERE name = 'avocado' LIMIT 1), '2', 2),
  ('c0ffe000-0000-4000-8000-000000000056'::uuid, (SELECT id FROM public.ingredients WHERE name = 'sushi rice' LIMIT 1), '3 cups cooked', 3),
  ('c0ffe000-0000-4000-8000-000000000057'::uuid, (SELECT id FROM public.ingredients WHERE name = 'arborio rice' LIMIT 1), '1½ cups', 0),
  ('c0ffe000-0000-4000-8000-000000000057'::uuid, (SELECT id FROM public.ingredients WHERE name = 'cremini mushrooms' LIMIT 1), '12 oz', 1),
  ('c0ffe000-0000-4000-8000-000000000057'::uuid, (SELECT id FROM public.ingredients WHERE name = 'parmesan cheese' LIMIT 1), '½ cup', 2),
  ('c0ffe000-0000-4000-8000-000000000057'::uuid, (SELECT id FROM public.ingredients WHERE name = 'low-sodium vegetable broth' LIMIT 1), '5 cups hot', 3),
  ('c0ffe000-0000-4000-8000-000000000058'::uuid, (SELECT id FROM public.ingredients WHERE name = 'black beans' LIMIT 1), '2 cans', 0),
  ('c0ffe000-0000-4000-8000-000000000058'::uuid, (SELECT id FROM public.ingredients WHERE name = 'rolled oats' LIMIT 1), '1 cup', 1),
  ('c0ffe000-0000-4000-8000-000000000058'::uuid, (SELECT id FROM public.ingredients WHERE name = 'burger buns' LIMIT 1), '6', 2),
  ('c0ffe000-0000-4000-8000-000000000058'::uuid, (SELECT id FROM public.ingredients WHERE name = 'smoked paprika' LIMIT 1), '1 tsp', 3),
  ('c0ffe000-0000-4000-8000-000000000059'::uuid, (SELECT id FROM public.ingredients WHERE name = 'cod fillets' LIMIT 1), '4', 0),
  ('c0ffe000-0000-4000-8000-000000000059'::uuid, (SELECT id FROM public.ingredients WHERE name = 'cherry tomatoes' LIMIT 1), '2 cups', 1),
  ('c0ffe000-0000-4000-8000-000000000059'::uuid, (SELECT id FROM public.ingredients WHERE name = 'garlic cloves' LIMIT 1), '4', 2),
  ('c0ffe000-0000-4000-8000-000000000059'::uuid, (SELECT id FROM public.ingredients WHERE name = 'extra-virgin olive oil' LIMIT 1), '3 tbsp', 3),
  ('c0ffe000-0000-4000-8000-000000000060'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ramen noodles' LIMIT 1), '4 packs', 0),
  ('c0ffe000-0000-4000-8000-000000000060'::uuid, (SELECT id FROM public.ingredients WHERE name = 'white miso paste' LIMIT 1), '3 tbsp', 1),
  ('c0ffe000-0000-4000-8000-000000000060'::uuid, (SELECT id FROM public.ingredients WHERE name = 'soft-boiled eggs' LIMIT 1), '4', 2),
  ('c0ffe000-0000-4000-8000-000000000060'::uuid, (SELECT id FROM public.ingredients WHERE name = 'baby spinach' LIMIT 1), '4 cups', 3),
  ('c0ffe000-0000-4000-8000-000000000061'::uuid, (SELECT id FROM public.ingredients WHERE name = 'brown lentils' LIMIT 1), '1 cup', 0),
  ('c0ffe000-0000-4000-8000-000000000061'::uuid, (SELECT id FROM public.ingredients WHERE name = 'carrots' LIMIT 1), '3 diced', 1),
  ('c0ffe000-0000-4000-8000-000000000061'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ground cumin' LIMIT 1), '1 tsp', 2),
  ('c0ffe000-0000-4000-8000-000000000061'::uuid, (SELECT id FROM public.ingredients WHERE name = 'crushed tomatoes' LIMIT 1), '1 can', 3),
  ('c0ffe000-0000-4000-8000-000000000062'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ground beef' LIMIT 1), '1 lb', 0),
  ('c0ffe000-0000-4000-8000-000000000062'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ground pork' LIMIT 1), '½ lb', 1),
  ('c0ffe000-0000-4000-8000-000000000062'::uuid, (SELECT id FROM public.ingredients WHERE name = 'tagliatelle' LIMIT 1), '12 oz', 2),
  ('c0ffe000-0000-4000-8000-000000000062'::uuid, (SELECT id FROM public.ingredients WHERE name = 'red wine' LIMIT 1), '1 cup', 3),
  ('c0ffe000-0000-4000-8000-000000000063'::uuid, (SELECT id FROM public.ingredients WHERE name = 'sourdough bread' LIMIT 1), '4 slices', 0),
  ('c0ffe000-0000-4000-8000-000000000063'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ripe avocados' LIMIT 1), '2', 1),
  ('c0ffe000-0000-4000-8000-000000000063'::uuid, (SELECT id FROM public.ingredients WHERE name = 'lemon' LIMIT 1), '1', 2),
  ('c0ffe000-0000-4000-8000-000000000063'::uuid, (SELECT id FROM public.ingredients WHERE name = 'red pepper flakes' LIMIT 1), 'pinch', 3),
  ('c0ffe000-0000-4000-8000-000000000064'::uuid, (SELECT id FROM public.ingredients WHERE name = 'rolled oats' LIMIT 1), '1 cup', 0),
  ('c0ffe000-0000-4000-8000-000000000064'::uuid, (SELECT id FROM public.ingredients WHERE name = 'oat milk' LIMIT 1), '1½ cups', 1),
  ('c0ffe000-0000-4000-8000-000000000064'::uuid, (SELECT id FROM public.ingredients WHERE name = 'chia seeds' LIMIT 1), '2 tbsp', 2),
  ('c0ffe000-0000-4000-8000-000000000064'::uuid, (SELECT id FROM public.ingredients WHERE name = 'mixed berries' LIMIT 1), '1 cup', 3),
  ('c0ffe000-0000-4000-8000-000000000065'::uuid, (SELECT id FROM public.ingredients WHERE name = 'cannellini beans' LIMIT 1), '1 can', 0),
  ('c0ffe000-0000-4000-8000-000000000065'::uuid, (SELECT id FROM public.ingredients WHERE name = 'small pasta shells' LIMIT 1), '1 cup', 1),
  ('c0ffe000-0000-4000-8000-000000000065'::uuid, (SELECT id FROM public.ingredients WHERE name = 'zucchini' LIMIT 1), '2 diced', 2),
  ('c0ffe000-0000-4000-8000-000000000065'::uuid, (SELECT id FROM public.ingredients WHERE name = 'low-sodium vegetable broth' LIMIT 1), '6 cups', 3),
  ('c0ffe000-0000-4000-8000-000000000066'::uuid, (SELECT id FROM public.ingredients WHERE name = 'cooked shrimp' LIMIT 1), '1 lb', 0),
  ('c0ffe000-0000-4000-8000-000000000066'::uuid, (SELECT id FROM public.ingredients WHERE name = 'lime juice' LIMIT 1), '1 cup', 1),
  ('c0ffe000-0000-4000-8000-000000000066'::uuid, (SELECT id FROM public.ingredients WHERE name = 'roma tomato' LIMIT 1), '2 diced', 2),
  ('c0ffe000-0000-4000-8000-000000000066'::uuid, (SELECT id FROM public.ingredients WHERE name = 'jalapeño' LIMIT 1), '1 minced', 3),
  ('c0ffe000-0000-4000-8000-000000000067'::uuid, (SELECT id FROM public.ingredients WHERE name = 'romaine lettuce' LIMIT 1), '1 head', 0),
  ('c0ffe000-0000-4000-8000-000000000067'::uuid, (SELECT id FROM public.ingredients WHERE name = 'cooked chicken breast' LIMIT 1), '2 cups', 1),
  ('c0ffe000-0000-4000-8000-000000000067'::uuid, (SELECT id FROM public.ingredients WHERE name = 'avocado' LIMIT 1), '2', 2),
  ('c0ffe000-0000-4000-8000-000000000067'::uuid, (SELECT id FROM public.ingredients WHERE name = 'blue cheese' LIMIT 1), '4 oz', 3),
  ('c0ffe000-0000-4000-8000-000000000068'::uuid, (SELECT id FROM public.ingredients WHERE name = 'canned chickpeas' LIMIT 1), '2 cans', 0),
  ('c0ffe000-0000-4000-8000-000000000068'::uuid, (SELECT id FROM public.ingredients WHERE name = 'tahini' LIMIT 1), '¼ cup', 1),
  ('c0ffe000-0000-4000-8000-000000000068'::uuid, (SELECT id FROM public.ingredients WHERE name = 'garlic cloves' LIMIT 1), '2', 2),
  ('c0ffe000-0000-4000-8000-000000000068'::uuid, (SELECT id FROM public.ingredients WHERE name = 'whole-wheat pita' LIMIT 1), '4', 3),
  ('c0ffe000-0000-4000-8000-000000000069'::uuid, (SELECT id FROM public.ingredients WHERE name = 'basmati rice' LIMIT 1), '2 cups', 0),
  ('c0ffe000-0000-4000-8000-000000000069'::uuid, (SELECT id FROM public.ingredients WHERE name = 'frozen mixed vegetables' LIMIT 1), '3 cups', 1),
  ('c0ffe000-0000-4000-8000-000000000069'::uuid, (SELECT id FROM public.ingredients WHERE name = 'whole milk yogurt' LIMIT 1), '½ cup', 2),
  ('c0ffe000-0000-4000-8000-000000000069'::uuid, (SELECT id FROM public.ingredients WHERE name = 'saffron threads' LIMIT 1), 'pinch', 3),
  ('c0ffe000-0000-4000-8000-000000000070'::uuid, (SELECT id FROM public.ingredients WHERE name = 'chicken breast' LIMIT 1), '1.5 lb cubed', 0),
  ('c0ffe000-0000-4000-8000-000000000070'::uuid, (SELECT id FROM public.ingredients WHERE name = 'dried oregano' LIMIT 1), '2 tsp', 1),
  ('c0ffe000-0000-4000-8000-000000000070'::uuid, (SELECT id FROM public.ingredients WHERE name = 'plain Greek yogurt' LIMIT 1), '1 cup for tzatziki', 2),
  ('c0ffe000-0000-4000-8000-000000000070'::uuid, (SELECT id FROM public.ingredients WHERE name = 'pita bread' LIMIT 1), '4', 3),
  ('c0ffe000-0000-4000-8000-000000000071'::uuid, (SELECT id FROM public.ingredients WHERE name = 'pork spare ribs' LIMIT 1), '2 racks', 0),
  ('c0ffe000-0000-4000-8000-000000000071'::uuid, (SELECT id FROM public.ingredients WHERE name = 'peach preserves' LIMIT 1), '1 cup', 1),
  ('c0ffe000-0000-4000-8000-000000000071'::uuid, (SELECT id FROM public.ingredients WHERE name = 'apple cider vinegar' LIMIT 1), '¼ cup', 2),
  ('c0ffe000-0000-4000-8000-000000000071'::uuid, (SELECT id FROM public.ingredients WHERE name = 'smoked paprika' LIMIT 1), '1 tbsp', 3),
  ('c0ffe000-0000-4000-8000-000000000072'::uuid, (SELECT id FROM public.ingredients WHERE name = 'skin-on salmon fillets' LIMIT 1), '4', 0),
  ('c0ffe000-0000-4000-8000-000000000072'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fresh dill' LIMIT 1), '¼ cup', 1),
  ('c0ffe000-0000-4000-8000-000000000072'::uuid, (SELECT id FROM public.ingredients WHERE name = 'plain Greek yogurt' LIMIT 1), '½ cup', 2),
  ('c0ffe000-0000-4000-8000-000000000072'::uuid, (SELECT id FROM public.ingredients WHERE name = 'cucumber' LIMIT 1), '1 diced', 3),
  ('c0ffe000-0000-4000-8000-000000000073'::uuid, (SELECT id FROM public.ingredients WHERE name = 'zucchini' LIMIT 1), '3 sliced', 0),
  ('c0ffe000-0000-4000-8000-000000000073'::uuid, (SELECT id FROM public.ingredients WHERE name = 'bell peppers' LIMIT 1), '3', 1),
  ('c0ffe000-0000-4000-8000-000000000073'::uuid, (SELECT id FROM public.ingredients WHERE name = 'red onion' LIMIT 1), '2 thick slices', 2),
  ('c0ffe000-0000-4000-8000-000000000073'::uuid, (SELECT id FROM public.ingredients WHERE name = 'extra-virgin olive oil' LIMIT 1), '¼ cup', 3),
  ('c0ffe000-0000-4000-8000-000000000074'::uuid, (SELECT id FROM public.ingredients WHERE name = 'canned chickpeas' LIMIT 1), '2', 0),
  ('c0ffe000-0000-4000-8000-000000000074'::uuid, (SELECT id FROM public.ingredients WHERE name = 'coconut milk' LIMIT 1), '1 can', 1),
  ('c0ffe000-0000-4000-8000-000000000074'::uuid, (SELECT id FROM public.ingredients WHERE name = 'curry powder' LIMIT 1), '2 tbsp', 2),
  ('c0ffe000-0000-4000-8000-000000000074'::uuid, (SELECT id FROM public.ingredients WHERE name = 'spinach' LIMIT 1), '4 cups', 3),
  ('c0ffe000-0000-4000-8000-000000000075'::uuid, (SELECT id FROM public.ingredients WHERE name = 'bell peppers' LIMIT 1), '6', 0),
  ('c0ffe000-0000-4000-8000-000000000075'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ground turkey' LIMIT 1), '1 lb', 1),
  ('c0ffe000-0000-4000-8000-000000000075'::uuid, (SELECT id FROM public.ingredients WHERE name = 'cooked rice' LIMIT 1), '2 cups', 2),
  ('c0ffe000-0000-4000-8000-000000000075'::uuid, (SELECT id FROM public.ingredients WHERE name = 'diced tomatoes' LIMIT 1), '1 can', 3),
  ('c0ffe000-0000-4000-8000-000000000076'::uuid, (SELECT id FROM public.ingredients WHERE name = 'large shrimp peeled' LIMIT 1), '1.5 lb', 0),
  ('c0ffe000-0000-4000-8000-000000000076'::uuid, (SELECT id FROM public.ingredients WHERE name = 'garlic cloves' LIMIT 1), '4 minced', 1),
  ('c0ffe000-0000-4000-8000-000000000076'::uuid, (SELECT id FROM public.ingredients WHERE name = 'lemon' LIMIT 1), '2', 2),
  ('c0ffe000-0000-4000-8000-000000000076'::uuid, (SELECT id FROM public.ingredients WHERE name = 'extra-virgin olive oil' LIMIT 1), '3 tbsp', 3),
  ('c0ffe000-0000-4000-8000-000000000077'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ciabatta bread' LIMIT 1), '4 cups cubed', 0),
  ('c0ffe000-0000-4000-8000-000000000077'::uuid, (SELECT id FROM public.ingredients WHERE name = 'heirloom tomatoes' LIMIT 1), '4', 1),
  ('c0ffe000-0000-4000-8000-000000000077'::uuid, (SELECT id FROM public.ingredients WHERE name = 'red onion' LIMIT 1), '½ sliced', 2),
  ('c0ffe000-0000-4000-8000-000000000077'::uuid, (SELECT id FROM public.ingredients WHERE name = 'red wine vinegar' LIMIT 1), '3 tbsp', 3),
  ('c0ffe000-0000-4000-8000-000000000078'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fusilli' LIMIT 1), '12 oz', 0),
  ('c0ffe000-0000-4000-8000-000000000078'::uuid, (SELECT id FROM public.ingredients WHERE name = 'basil pesto' LIMIT 1), '½ cup', 1),
  ('c0ffe000-0000-4000-8000-000000000078'::uuid, (SELECT id FROM public.ingredients WHERE name = 'parmesan cheese' LIMIT 1), '¼ cup', 2),
  ('c0ffe000-0000-4000-8000-000000000078'::uuid, (SELECT id FROM public.ingredients WHERE name = 'pine nuts' LIMIT 1), '2 tbsp', 3),
  ('c0ffe000-0000-4000-8000-000000000079'::uuid, (SELECT id FROM public.ingredients WHERE name = 'zucchini' LIMIT 1), '3 large', 0),
  ('c0ffe000-0000-4000-8000-000000000079'::uuid, (SELECT id FROM public.ingredients WHERE name = 'eggs' LIMIT 1), '2', 1),
  ('c0ffe000-0000-4000-8000-000000000079'::uuid, (SELECT id FROM public.ingredients WHERE name = 'all-purpose flour' LIMIT 1), '½ cup', 2),
  ('c0ffe000-0000-4000-8000-000000000079'::uuid, (SELECT id FROM public.ingredients WHERE name = 'sour cream' LIMIT 1), 'for serving', 3),
  ('c0ffe000-0000-4000-8000-000000000080'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ripe bananas' LIMIT 1), '4', 0),
  ('c0ffe000-0000-4000-8000-000000000080'::uuid, (SELECT id FROM public.ingredients WHERE name = 'all-purpose flour' LIMIT 1), '2 cups', 1),
  ('c0ffe000-0000-4000-8000-000000000080'::uuid, (SELECT id FROM public.ingredients WHERE name = 'eggs' LIMIT 1), '2', 2),
  ('c0ffe000-0000-4000-8000-000000000080'::uuid, (SELECT id FROM public.ingredients WHERE name = 'walnuts' LIMIT 1), '1 cup optional', 3),
  ('c0ffe000-0000-4000-8000-000000000081'::uuid, (SELECT id FROM public.ingredients WHERE name = 'eggplant' LIMIT 1), '2 medium', 0),
  ('c0ffe000-0000-4000-8000-000000000081'::uuid, (SELECT id FROM public.ingredients WHERE name = 'marinara sauce' LIMIT 1), '3 cups', 1),
  ('c0ffe000-0000-4000-8000-000000000081'::uuid, (SELECT id FROM public.ingredients WHERE name = 'part-skim mozzarella' LIMIT 1), '12 oz', 2),
  ('c0ffe000-0000-4000-8000-000000000081'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fresh basil' LIMIT 1), 'for garnish', 3),
  ('c0ffe000-0000-4000-8000-000000000082'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ripe tomatoes' LIMIT 1), '2 lb', 0),
  ('c0ffe000-0000-4000-8000-000000000082'::uuid, (SELECT id FROM public.ingredients WHERE name = 'english cucumber' LIMIT 1), '1', 1),
  ('c0ffe000-0000-4000-8000-000000000082'::uuid, (SELECT id FROM public.ingredients WHERE name = 'day-old bread' LIMIT 1), '2 slices', 2),
  ('c0ffe000-0000-4000-8000-000000000082'::uuid, (SELECT id FROM public.ingredients WHERE name = 'sherry vinegar' LIMIT 1), '2 tbsp', 3),
  ('c0ffe000-0000-4000-8000-000000000083'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ground chicken' LIMIT 1), '1 lb', 0),
  ('c0ffe000-0000-4000-8000-000000000083'::uuid, (SELECT id FROM public.ingredients WHERE name = 'Thai basil' LIMIT 1), '2 cups', 1),
  ('c0ffe000-0000-4000-8000-000000000083'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fish sauce' LIMIT 1), '2 tbsp', 2),
  ('c0ffe000-0000-4000-8000-000000000083'::uuid, (SELECT id FROM public.ingredients WHERE name = 'bird''s eye chilies' LIMIT 1), '3 sliced', 3),
  ('c0ffe000-0000-4000-8000-000000000084'::uuid, (SELECT id FROM public.ingredients WHERE name = 'roma tomatoes' LIMIT 1), '4', 0),
  ('c0ffe000-0000-4000-8000-000000000084'::uuid, (SELECT id FROM public.ingredients WHERE name = 'english cucumber' LIMIT 1), '1', 1),
  ('c0ffe000-0000-4000-8000-000000000084'::uuid, (SELECT id FROM public.ingredients WHERE name = 'Kalamata olives' LIMIT 1), '1 cup', 2),
  ('c0ffe000-0000-4000-8000-000000000084'::uuid, (SELECT id FROM public.ingredients WHERE name = 'feta cheese' LIMIT 1), '8 oz', 3),
  ('c0ffe000-0000-4000-8000-000000000085'::uuid, (SELECT id FROM public.ingredients WHERE name = 'brown lentils' LIMIT 1), '1 cup', 0),
  ('c0ffe000-0000-4000-8000-000000000085'::uuid, (SELECT id FROM public.ingredients WHERE name = 'walnuts' LIMIT 1), '1 cup chopped', 1),
  ('c0ffe000-0000-4000-8000-000000000085'::uuid, (SELECT id FROM public.ingredients WHERE name = 'spaghetti' LIMIT 1), '12 oz', 2),
  ('c0ffe000-0000-4000-8000-000000000085'::uuid, (SELECT id FROM public.ingredients WHERE name = 'crushed tomatoes' LIMIT 1), '1 can', 3),
  ('c0ffe000-0000-4000-8000-000000000086'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fine cornmeal' LIMIT 1), '1 cup', 0),
  ('c0ffe000-0000-4000-8000-000000000086'::uuid, (SELECT id FROM public.ingredients WHERE name = 'all-purpose flour' LIMIT 1), '1 cup', 1),
  ('c0ffe000-0000-4000-8000-000000000086'::uuid, (SELECT id FROM public.ingredients WHERE name = 'buttermilk' LIMIT 1), '1½ cups', 2),
  ('c0ffe000-0000-4000-8000-000000000086'::uuid, (SELECT id FROM public.ingredients WHERE name = 'honey' LIMIT 1), '2 tbsp', 3),
  ('c0ffe000-0000-4000-8000-000000000087'::uuid, (SELECT id FROM public.ingredients WHERE name = 'bone-in chicken thighs' LIMIT 1), '8', 0),
  ('c0ffe000-0000-4000-8000-000000000087'::uuid, (SELECT id FROM public.ingredients WHERE name = 'smoked paprika' LIMIT 1), '2 tbsp', 1),
  ('c0ffe000-0000-4000-8000-000000000087'::uuid, (SELECT id FROM public.ingredients WHERE name = 'light brown sugar' LIMIT 1), '1 tbsp', 2),
  ('c0ffe000-0000-4000-8000-000000000087'::uuid, (SELECT id FROM public.ingredients WHERE name = 'kosher salt' LIMIT 1), 'to taste', 3),
  ('c0ffe000-0000-4000-8000-000000000088'::uuid, (SELECT id FROM public.ingredients WHERE name = 'seedless watermelon' LIMIT 1), '4 cups cubed', 0),
  ('c0ffe000-0000-4000-8000-000000000088'::uuid, (SELECT id FROM public.ingredients WHERE name = 'feta cheese' LIMIT 1), '4 oz', 1),
  ('c0ffe000-0000-4000-8000-000000000088'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fresh mint' LIMIT 1), '¼ cup', 2),
  ('c0ffe000-0000-4000-8000-000000000088'::uuid, (SELECT id FROM public.ingredients WHERE name = 'lime' LIMIT 1), '1', 3),
  ('c0ffe000-0000-4000-8000-000000000089'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ripe avocados' LIMIT 1), '4', 0),
  ('c0ffe000-0000-4000-8000-000000000089'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fresh mozzarella' LIMIT 1), '8 oz', 1),
  ('c0ffe000-0000-4000-8000-000000000089'::uuid, (SELECT id FROM public.ingredients WHERE name = 'balsamic glaze' LIMIT 1), '2 tbsp', 2),
  ('c0ffe000-0000-4000-8000-000000000089'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fresh basil' LIMIT 1), 'handful', 3),
  ('c0ffe000-0000-4000-8000-000000000090'::uuid, (SELECT id FROM public.ingredients WHERE name = 'extra-firm tofu' LIMIT 1), '14 oz', 0),
  ('c0ffe000-0000-4000-8000-000000000090'::uuid, (SELECT id FROM public.ingredients WHERE name = 'nutritional yeast' LIMIT 1), '3 tbsp', 1),
  ('c0ffe000-0000-4000-8000-000000000090'::uuid, (SELECT id FROM public.ingredients WHERE name = 'bell pepper' LIMIT 1), '1 diced', 2),
  ('c0ffe000-0000-4000-8000-000000000090'::uuid, (SELECT id FROM public.ingredients WHERE name = 'ground turmeric' LIMIT 1), '½ tsp', 3),
  ('c0ffe000-0000-4000-8000-000000000091'::uuid, (SELECT id FROM public.ingredients WHERE name = 'eggs' LIMIT 1), '6', 0),
  ('c0ffe000-0000-4000-8000-000000000091'::uuid, (SELECT id FROM public.ingredients WHERE name = 'bell peppers' LIMIT 1), '2 sliced', 1),
  ('c0ffe000-0000-4000-8000-000000000091'::uuid, (SELECT id FROM public.ingredients WHERE name = 'crushed tomatoes' LIMIT 1), '1 can', 2),
  ('c0ffe000-0000-4000-8000-000000000091'::uuid, (SELECT id FROM public.ingredients WHERE name = 'smoked paprika' LIMIT 1), '1 tsp', 3),
  ('c0ffe000-0000-4000-8000-000000000092'::uuid, (SELECT id FROM public.ingredients WHERE name = 'bone-in chicken thighs' LIMIT 1), '4', 0),
  ('c0ffe000-0000-4000-8000-000000000092'::uuid, (SELECT id FROM public.ingredients WHERE name = 'egg noodles' LIMIT 1), '8 oz', 1),
  ('c0ffe000-0000-4000-8000-000000000092'::uuid, (SELECT id FROM public.ingredients WHERE name = 'carrots' LIMIT 1), '3 sliced', 2),
  ('c0ffe000-0000-4000-8000-000000000092'::uuid, (SELECT id FROM public.ingredients WHERE name = 'celery' LIMIT 1), '3 stalks', 3),
  ('c0ffe000-0000-4000-8000-000000000093'::uuid, (SELECT id FROM public.ingredients WHERE name = 'romaine hearts' LIMIT 1), '2', 0),
  ('c0ffe000-0000-4000-8000-000000000093'::uuid, (SELECT id FROM public.ingredients WHERE name = 'parmesan cheese' LIMIT 1), '½ cup', 1),
  ('c0ffe000-0000-4000-8000-000000000093'::uuid, (SELECT id FROM public.ingredients WHERE name = 'croutons' LIMIT 1), '2 cups', 2),
  ('c0ffe000-0000-4000-8000-000000000093'::uuid, (SELECT id FROM public.ingredients WHERE name = 'anchovy paste' LIMIT 1), '1 tsp', 3),
  ('c0ffe000-0000-4000-8000-000000000094'::uuid, (SELECT id FROM public.ingredients WHERE name = 'pork shoulder' LIMIT 1), '4 lb', 0),
  ('c0ffe000-0000-4000-8000-000000000094'::uuid, (SELECT id FROM public.ingredients WHERE name = 'BBQ sauce' LIMIT 1), '2 cups', 1),
  ('c0ffe000-0000-4000-8000-000000000094'::uuid, (SELECT id FROM public.ingredients WHERE name = 'hamburger buns' LIMIT 1), '12', 2),
  ('c0ffe000-0000-4000-8000-000000000094'::uuid, (SELECT id FROM public.ingredients WHERE name = 'coleslaw mix' LIMIT 1), '4 cups', 3),
  ('c0ffe000-0000-4000-8000-000000000095'::uuid, (SELECT id FROM public.ingredients WHERE name = 'chia seeds' LIMIT 1), '½ cup', 0),
  ('c0ffe000-0000-4000-8000-000000000095'::uuid, (SELECT id FROM public.ingredients WHERE name = 'whole milk' LIMIT 1), '2 cups', 1),
  ('c0ffe000-0000-4000-8000-000000000095'::uuid, (SELECT id FROM public.ingredients WHERE name = 'vanilla extract' LIMIT 1), '1 tsp', 2),
  ('c0ffe000-0000-4000-8000-000000000095'::uuid, (SELECT id FROM public.ingredients WHERE name = 'fresh berries' LIMIT 1), '1 cup', 3),
  ('c0ffe000-0000-4000-8000-000000000096'::uuid, (SELECT id FROM public.ingredients WHERE name = 'heavy cream' LIMIT 1), '2 cups', 0),
  ('c0ffe000-0000-4000-8000-000000000096'::uuid, (SELECT id FROM public.ingredients WHERE name = 'sweetened condensed milk' LIMIT 1), '1 can', 1),
  ('c0ffe000-0000-4000-8000-000000000096'::uuid, (SELECT id FROM public.ingredients WHERE name = 'vanilla extract' LIMIT 1), '2 tsp', 2),
  ('c0ffe000-0000-4000-8000-000000000096'::uuid, (SELECT id FROM public.ingredients WHERE name = 'kosher salt' LIMIT 1), 'pinch', 3),
  ('c0ffe000-0000-4000-8000-000000000097'::uuid, (SELECT id FROM public.ingredients WHERE name = 'cod fillets' LIMIT 1), '1.5 lb', 0),
  ('c0ffe000-0000-4000-8000-000000000097'::uuid, (SELECT id FROM public.ingredients WHERE name = 'corn tortillas' LIMIT 1), '12', 1),
  ('c0ffe000-0000-4000-8000-000000000097'::uuid, (SELECT id FROM public.ingredients WHERE name = 'shredded cabbage' LIMIT 1), '4 cups', 2),
  ('c0ffe000-0000-4000-8000-000000000097'::uuid, (SELECT id FROM public.ingredients WHERE name = 'sour cream' LIMIT 1), '½ cup', 3),
  ('c0ffe000-0000-4000-8000-000000000098'::uuid, (SELECT id FROM public.ingredients WHERE name = 'pork shoulder' LIMIT 1), '3 lb', 0),
  ('c0ffe000-0000-4000-8000-000000000098'::uuid, (SELECT id FROM public.ingredients WHERE name = 'orange juice' LIMIT 1), '1 cup', 1),
  ('c0ffe000-0000-4000-8000-000000000098'::uuid, (SELECT id FROM public.ingredients WHERE name = 'long-grain rice' LIMIT 1), '2 cups cooked', 2),
  ('c0ffe000-0000-4000-8000-000000000098'::uuid, (SELECT id FROM public.ingredients WHERE name = 'pico de gallo' LIMIT 1), '2 cups', 3),
  ('c0ffe000-0000-4000-8000-000000000099'::uuid, (SELECT id FROM public.ingredients WHERE name = 'english cucumber' LIMIT 1), '2 sliced', 0),
  ('c0ffe000-0000-4000-8000-000000000099'::uuid, (SELECT id FROM public.ingredients WHERE name = 'rice vinegar' LIMIT 1), '3 tbsp', 1),
  ('c0ffe000-0000-4000-8000-000000000099'::uuid, (SELECT id FROM public.ingredients WHERE name = 'toasted sesame oil' LIMIT 1), '1 tbsp', 2),
  ('c0ffe000-0000-4000-8000-000000000099'::uuid, (SELECT id FROM public.ingredients WHERE name = 'sesame seeds' LIMIT 1), '2 tbsp', 3),
  ('c0ffe000-0000-4000-8000-000000000100'::uuid, (SELECT id FROM public.ingredients WHERE name = 'frozen spinach' LIMIT 1), '16 oz thawed', 0),
  ('c0ffe000-0000-4000-8000-000000000100'::uuid, (SELECT id FROM public.ingredients WHERE name = 'feta cheese' LIMIT 1), '8 oz', 1),
  ('c0ffe000-0000-4000-8000-000000000100'::uuid, (SELECT id FROM public.ingredients WHERE name = 'phyllo dough' LIMIT 1), '1 package', 2),
  ('c0ffe000-0000-4000-8000-000000000100'::uuid, (SELECT id FROM public.ingredients WHERE name = 'eggs' LIMIT 1), '3', 3)
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;

INSERT INTO public.recipe_tags (recipe_id, tag_id)
SELECT 'c0ffe000-0000-4000-8000-000000000001'::uuid, t.id FROM public.tags t WHERE t.name = 'italian'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000002'::uuid, t.id FROM public.tags t WHERE t.name = 'mexican'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000003'::uuid, t.id FROM public.tags t WHERE t.name = 'asian'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000004'::uuid, t.id FROM public.tags t WHERE t.name = 'mediterranean'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000005'::uuid, t.id FROM public.tags t WHERE t.name = 'indian'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000006'::uuid, t.id FROM public.tags t WHERE t.name = 'american_comfort'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000007'::uuid, t.id FROM public.tags t WHERE t.name = 'bbq'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000008'::uuid, t.id FROM public.tags t WHERE t.name = 'seafood'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000009'::uuid, t.id FROM public.tags t WHERE t.name = 'vegetarian'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000010'::uuid, t.id FROM public.tags t WHERE t.name = 'vegan'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000011'::uuid, t.id FROM public.tags t WHERE t.name = 'gluten_free'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000012'::uuid, t.id FROM public.tags t WHERE t.name = 'soups'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000013'::uuid, t.id FROM public.tags t WHERE t.name = 'salads'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000014'::uuid, t.id FROM public.tags t WHERE t.name = 'pasta'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000015'::uuid, t.id FROM public.tags t WHERE t.name = 'breakfast'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000016'::uuid, t.id FROM public.tags t WHERE t.name = 'desserts'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000017'::uuid, t.id FROM public.tags t WHERE t.name = 'italian'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000018'::uuid, t.id FROM public.tags t WHERE t.name = 'mexican'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000019'::uuid, t.id FROM public.tags t WHERE t.name = 'soups'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000020'::uuid, t.id FROM public.tags t WHERE t.name = 'mediterranean'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000021'::uuid, t.id FROM public.tags t WHERE t.name = 'indian'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000022'::uuid, t.id FROM public.tags t WHERE t.name = 'vegan'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000023'::uuid, t.id FROM public.tags t WHERE t.name = 'bbq'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000024'::uuid, t.id FROM public.tags t WHERE t.name = 'seafood'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000025'::uuid, t.id FROM public.tags t WHERE t.name = 'salads'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000026'::uuid, t.id FROM public.tags t WHERE t.name = 'vegan'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000027'::uuid, t.id FROM public.tags t WHERE t.name = 'gluten_free'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000028'::uuid, t.id FROM public.tags t WHERE t.name = 'mediterranean'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000029'::uuid, t.id FROM public.tags t WHERE t.name = 'salads'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000030'::uuid, t.id FROM public.tags t WHERE t.name = 'pasta'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000031'::uuid, t.id FROM public.tags t WHERE t.name = 'bbq'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000032'::uuid, t.id FROM public.tags t WHERE t.name = 'desserts'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000033'::uuid, t.id FROM public.tags t WHERE t.name = 'italian'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000034'::uuid, t.id FROM public.tags t WHERE t.name = 'seafood'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000035'::uuid, t.id FROM public.tags t WHERE t.name = 'asian'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000036'::uuid, t.id FROM public.tags t WHERE t.name = 'mediterranean'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000037'::uuid, t.id FROM public.tags t WHERE t.name = 'vegetarian'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000038'::uuid, t.id FROM public.tags t WHERE t.name = 'american_comfort'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000039'::uuid, t.id FROM public.tags t WHERE t.name = 'bbq'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000040'::uuid, t.id FROM public.tags t WHERE t.name = 'soups'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000041'::uuid, t.id FROM public.tags t WHERE t.name = 'vegetarian'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000042'::uuid, t.id FROM public.tags t WHERE t.name = 'vegan'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000043'::uuid, t.id FROM public.tags t WHERE t.name = 'vegan'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000044'::uuid, t.id FROM public.tags t WHERE t.name = 'soups'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000045'::uuid, t.id FROM public.tags t WHERE t.name = 'salads'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000046'::uuid, t.id FROM public.tags t WHERE t.name = 'salads'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000047'::uuid, t.id FROM public.tags t WHERE t.name = 'breakfast'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000048'::uuid, t.id FROM public.tags t WHERE t.name = 'desserts'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000049'::uuid, t.id FROM public.tags t WHERE t.name = 'mediterranean'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000050'::uuid, t.id FROM public.tags t WHERE t.name = 'mexican'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000051'::uuid, t.id FROM public.tags t WHERE t.name = 'asian'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000052'::uuid, t.id FROM public.tags t WHERE t.name = 'bbq'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000053'::uuid, t.id FROM public.tags t WHERE t.name = 'indian'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000054'::uuid, t.id FROM public.tags t WHERE t.name = 'american_comfort'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000055'::uuid, t.id FROM public.tags t WHERE t.name = 'seafood'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000056'::uuid, t.id FROM public.tags t WHERE t.name = 'seafood'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000057'::uuid, t.id FROM public.tags t WHERE t.name = 'vegetarian'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000058'::uuid, t.id FROM public.tags t WHERE t.name = 'vegetarian'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000059'::uuid, t.id FROM public.tags t WHERE t.name = 'gluten_free'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000060'::uuid, t.id FROM public.tags t WHERE t.name = 'soups'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000061'::uuid, t.id FROM public.tags t WHERE t.name = 'soups'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000062'::uuid, t.id FROM public.tags t WHERE t.name = 'pasta'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000063'::uuid, t.id FROM public.tags t WHERE t.name = 'breakfast'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000064'::uuid, t.id FROM public.tags t WHERE t.name = 'vegan'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000065'::uuid, t.id FROM public.tags t WHERE t.name = 'italian'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000066'::uuid, t.id FROM public.tags t WHERE t.name = 'mexican'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000067'::uuid, t.id FROM public.tags t WHERE t.name = 'salads'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000068'::uuid, t.id FROM public.tags t WHERE t.name = 'mediterranean'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000069'::uuid, t.id FROM public.tags t WHERE t.name = 'indian'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000070'::uuid, t.id FROM public.tags t WHERE t.name = 'mediterranean'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000071'::uuid, t.id FROM public.tags t WHERE t.name = 'bbq'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000072'::uuid, t.id FROM public.tags t WHERE t.name = 'seafood'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000073'::uuid, t.id FROM public.tags t WHERE t.name = 'bbq'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000074'::uuid, t.id FROM public.tags t WHERE t.name = 'vegan'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000075'::uuid, t.id FROM public.tags t WHERE t.name = 'gluten_free'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000076'::uuid, t.id FROM public.tags t WHERE t.name = 'seafood'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000077'::uuid, t.id FROM public.tags t WHERE t.name = 'salads'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000078'::uuid, t.id FROM public.tags t WHERE t.name = 'pasta'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000079'::uuid, t.id FROM public.tags t WHERE t.name = 'vegetarian'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000080'::uuid, t.id FROM public.tags t WHERE t.name = 'desserts'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000081'::uuid, t.id FROM public.tags t WHERE t.name = 'italian'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000082'::uuid, t.id FROM public.tags t WHERE t.name = 'soups'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000083'::uuid, t.id FROM public.tags t WHERE t.name = 'asian'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000084'::uuid, t.id FROM public.tags t WHERE t.name = 'mediterranean'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000085'::uuid, t.id FROM public.tags t WHERE t.name = 'vegan'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000086'::uuid, t.id FROM public.tags t WHERE t.name = 'american_comfort'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000087'::uuid, t.id FROM public.tags t WHERE t.name = 'bbq'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000088'::uuid, t.id FROM public.tags t WHERE t.name = 'salads'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000089'::uuid, t.id FROM public.tags t WHERE t.name = 'vegetarian'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000090'::uuid, t.id FROM public.tags t WHERE t.name = 'vegan'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000091'::uuid, t.id FROM public.tags t WHERE t.name = 'mediterranean'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000092'::uuid, t.id FROM public.tags t WHERE t.name = 'soups'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000093'::uuid, t.id FROM public.tags t WHERE t.name = 'salads'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000094'::uuid, t.id FROM public.tags t WHERE t.name = 'bbq'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000095'::uuid, t.id FROM public.tags t WHERE t.name = 'breakfast'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000096'::uuid, t.id FROM public.tags t WHERE t.name = 'desserts'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000097'::uuid, t.id FROM public.tags t WHERE t.name = 'seafood'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000098'::uuid, t.id FROM public.tags t WHERE t.name = 'mexican'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000099'::uuid, t.id FROM public.tags t WHERE t.name = 'asian'
UNION ALL
SELECT 'c0ffe000-0000-4000-8000-000000000100'::uuid, t.id FROM public.tags t WHERE t.name = 'vegetarian'
ON CONFLICT (recipe_id, tag_id) DO NOTHING;

