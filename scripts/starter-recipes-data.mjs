/**
 * Shared starter recipe catalog (seq 1–100 titles match seed migration).
 */
export const CATEGORIES = [
  "italian",
  "mexican",
  "asian",
  "mediterranean",
  "indian",
  "american_comfort",
  "bbq",
  "seafood",
  "vegetarian",
  "vegan",
  "gluten_free",
  "soups",
  "salads",
  "pasta",
  "breakfast",
  "desserts",
];

/** @type {Record<string, Array<{title: string, difficulty: string, minutes: number, instr: string, ings: [string, string][]}>>} */
export const BY_CATEGORY = {
  italian: [
    ["Margherita flatbread", "easy", 25, "Brush naan with olive oil. Top with crushed tomatoes, torn mozzarella, and basil. Bake at 450°F until cheese bubbles, 8–10 minutes.", [["naan flatbread", "2 pieces"], ["fresh mozzarella", "8 oz"], ["fresh basil", "1 bunch"], ["crushed tomatoes", "1 cup"]]],
    ["Cacio e pepe", "medium", 20, "Cook spaghetti in well-salted water. Toast coarsely ground pepper in butter. Toss hot pasta with pasta water, pecorino, and pepper until creamy.", [["spaghetti", "12 oz"], ["pecorino romano", "1 cup grated"], ["black pepper", "2 tbsp coarsely ground"], ["unsalted butter", "3 tbsp"]]],
    ["Chicken piccata", "medium", 35, "Pound cutlets thin, dredge in flour. Sear in butter. Deglaze with lemon, capers, and white wine; finish with parsley.", [["chicken breast cutlets", "1.5 lb"], ["all-purpose flour", "½ cup"], ["capers", "3 tbsp"], ["lemon", "2"]]],
    ["Minestrone", "easy", 45, "Sauté onion, carrot, celery. Add beans, tomatoes, broth, and pasta. Simmer until vegetables are tender.", [["cannellini beans", "1 can"], ["small pasta shells", "1 cup"], ["zucchini", "2 diced"], ["low-sodium vegetable broth", "6 cups"]]],
    ["Eggplant parmigiana", "medium", 60, "Salt eggplant slices, roast until golden. Layer with marinara and mozzarella; bake until bubbling.", [["eggplant", "2 medium"], ["marinara sauce", "3 cups"], ["part-skim mozzarella", "12 oz"], ["fresh basil", "for garnish"]]],
    ["Pesto orzo salad", "easy", 20, "Cook orzo, rinse cool. Toss with basil pesto, cherry tomatoes, and pine nuts.", [["orzo", "8 oz"], ["basil pesto", "½ cup"], ["cherry tomatoes", "2 cups halved"], ["pine nuts", "¼ cup toasted"]]],
  ],
  mexican: [
    ["Street corn salad", "easy", 15, "Char corn, toss with mayo, cotija, lime, and chili powder.", [["corn kernels", "4 cups"], ["cotija cheese", "½ cup"], ["lime", "2 juiced"], ["chili powder", "1 tsp"]]],
    ["Chicken tinga tacos", "medium", 40, "Simmer shredded chicken in chipotle-tomato sauce. Serve in warm tortillas with onion and cilantro.", [["shredded cooked chicken", "3 cups"], ["chipotle in adobo", "2 tbsp"], ["corn tortillas", "12"], ["white onion", "1 diced"]]],
    ["Black bean quesadillas", "easy", 20, "Mash beans with cumin, fill tortillas with cheese, griddle until crisp.", [["black beans", "2 cans drained"], ["Monterey Jack cheese", "2 cups"], ["flour tortillas", "8"], ["ground cumin", "1 tsp"]]],
    ["Shrimp ceviche", "medium", 30, "Marinate poached shrimp in lime juice with tomato, onion, and jalapeño. Chill 20 minutes.", [["cooked shrimp", "1 lb"], ["lime juice", "1 cup"], ["roma tomato", "2 diced"], ["jalapeño", "1 minced"]]],
    ["Pork carnitas bowl", "medium", 90, "Slow-cook pork shoulder with orange and spices until shreddable. Serve over rice with salsa.", [["pork shoulder", "3 lb"], ["orange juice", "1 cup"], ["long-grain rice", "2 cups cooked"], ["pico de gallo", "2 cups"]]],
    ["Mango salsa verde", "easy", 10, "Blend tomatillos, jalapeño, cilantro, and mango. Serve with chips or fish.", [["tomatillos", "6 husked"], ["ripe mango", "1 diced"], ["fresh cilantro", "1 cup"], ["tortilla chips", "for serving"]]],
  ],
  asian: [
    ["Ginger scallion salmon", "easy", 25, "Steam or pan-sear salmon; top with hot oil over ginger and scallions.", [["skin-on salmon fillets", "4"], ["fresh ginger", "2 tbsp minced"], ["scallions", "6 sliced"], ["soy sauce", "3 tbsp"]]],
    ["Vegetable fried rice", "easy", 25, "Stir-fry day-old rice with mixed vegetables, egg, and soy sauce.", [["cooked jasmine rice", "4 cups cold"], ["frozen mixed vegetables", "2 cups"], ["eggs", "3 beaten"], ["soy sauce", "3 tbsp"]]],
    ["Miso soup", "easy", 15, "Simmer dashi, whisk in miso off heat. Add tofu and wakame.", [["white miso paste", "3 tbsp"], ["silken tofu", "8 oz cubed"], ["dried wakame", "2 tbsp"], ["green onion", "2 sliced"]]],
    ["Thai basil chicken", "medium", 20, "Stir-fry ground chicken with garlic, chilies, and fish sauce. Finish with basil.", [["ground chicken", "1 lb"], ["Thai basil", "2 cups"], ["fish sauce", "2 tbsp"], ["bird's eye chilies", "3 sliced"]]],
    ["Cucumber sesame salad", "easy", 10, "Toss sliced cucumber with rice vinegar, sesame oil, and seeds.", [["English cucumber", "2 sliced"], ["rice vinegar", "3 tbsp"], ["toasted sesame oil", "1 tbsp"], ["sesame seeds", "2 tbsp"]]],
    ["Teriyaki tofu bowls", "easy", 30, "Bake tofu cubes, glaze with teriyaki, serve over rice with steamed broccoli.", [["extra-firm tofu", "14 oz"], ["teriyaki sauce", "½ cup"], ["broccoli florets", "4 cups"], ["jasmine rice", "2 cups cooked"]]],
  ],
  mediterranean: [
    ["Greek chicken souvlaki", "medium", 35, "Marinate chicken cubes in lemon, oregano, and olive oil. Grill and serve with tzatziki.", [["chicken breast", "1.5 lb cubed"], ["dried oregano", "2 tsp"], ["plain Greek yogurt", "1 cup for tzatziki"], ["pita bread", "4"]]],
    ["Horiatiki salad", "easy", 15, "Combine tomato, cucumber, onion, olives, and feta. Dress with olive oil and oregano.", [["roma tomatoes", "4"], ["English cucumber", "1"], ["Kalamata olives", "1 cup"], ["feta cheese", "8 oz"]]],
    ["Shakshuka", "easy", 30, "Simmer peppers and tomatoes, poach eggs in the sauce. Serve with crusty bread.", [["eggs", "6"], ["bell peppers", "2 sliced"], ["crushed tomatoes", "1 can"], ["smoked paprika", "1 tsp"]]],
    ["Grilled halloumi skewers", "easy", 20, "Thread halloumi and vegetables; grill until charred. Drizzle with lemon.", [["halloumi cheese", "12 oz"], ["cherry tomatoes", "2 cups"], ["zucchini", "2 chunked"], ["lemon", "1"]]],
    ["Baked sea bass with herbs", "medium", 30, "Stuff fish cavity with lemon and herbs. Roast at 400°F until flaky.", [["whole sea bass", "2 small"], ["fresh dill", "¼ cup"], ["lemon", "2"], ["extra-virgin olive oil", "3 tbsp"]]],
    ["Hummus platter", "easy", 10, "Blend chickpeas with tahini, lemon, and garlic. Serve with vegetables and pita.", [["canned chickpeas", "2 cans"], ["tahini", "¼ cup"], ["garlic cloves", "2"], ["whole-wheat pita", "4"]]],
  ],
  indian: [
    ["Chana masala", "easy", 35, "Sauté onion and spices, add tomatoes and chickpeas. Simmer 20 minutes.", [["canned chickpeas", "2"], ["garam masala", "2 tsp"], ["crushed tomatoes", "1 can"], ["fresh cilantro", "for garnish"]]],
    ["Tandoori-style chicken thighs", "medium", 45, "Marinate thighs in yogurt and spices. Roast at 425°F until charred at edges.", [["bone-in chicken thighs", "6"], ["plain yogurt", "1 cup"], ["tandoori spice blend", "3 tbsp"], ["lemon", "1"]]],
    ["Dal tadka", "easy", 40, "Cook red lentils until soft. Bloom cumin and garlic in ghee, stir into dal.", [["red lentils", "1 cup"], ["yellow onion", "1 diced"], ["ghee", "2 tbsp"], ["ground turmeric", "½ tsp"]]],
    ["Vegetable biryani", "medium", 55, "Layer spiced rice with sautéed mixed vegetables; steam covered 25 minutes.", [["basmati rice", "2 cups"], ["frozen mixed vegetables", "3 cups"], ["whole milk yogurt", "½ cup"], ["saffron threads", "pinch"]]],
    ["Raita", "easy", 5, "Stir cucumber and mint into yogurt with cumin. Chill until serving.", [["plain yogurt", "2 cups"], ["cucumber", "1 grated"], ["fresh mint", "¼ cup"], ["ground cumin", "½ tsp"]]],
  ],
  american_comfort: [
    ["Classic mac and cheese", "easy", 35, "Make a roux, whisk in milk and cheese. Fold in cooked macaroni and bake until golden.", [["elbow macaroni", "1 lb"], ["sharp cheddar", "3 cups grated"], ["whole milk", "2 cups"], ["unsalted butter", "4 tbsp"]]],
    ["Meatloaf with glaze", "medium", 60, "Mix beef with breadcrumbs and egg, shape loaf, bake with ketchup-brown sugar glaze.", [["ground beef", "2 lb"], ["breadcrumbs", "1 cup"], ["eggs", "2"], ["ketchup", "½ cup for glaze"]]],
    ["Buttermilk fried chicken", "hard", 50, "Soak chicken in buttermilk, dredge in seasoned flour, fry until golden and cooked through.", [["chicken pieces", "3 lb"], ["buttermilk", "2 cups"], ["all-purpose flour", "2 cups"], ["paprika", "2 tsp"]]],
    ["Cornbread", "easy", 30, "Mix cornmeal batter, bake in a hot skillet until edges crisp.", [["fine cornmeal", "1 cup"], ["all-purpose flour", "1 cup"], ["buttermilk", "1½ cups"], ["honey", "2 tbsp"]]],
    ["Pot roast", "medium", 180, "Sear chuck, braise with onions, carrots, and beef broth until fork-tender.", [["beef chuck roast", "3 lb"], ["carrots", "6 chunked"], ["yellow onion", "2"], ["low-sodium beef broth", "3 cups"]]],
    ["Sloppy joes", "easy", 25, "Brown ground beef with onion, stir in tomato sauce and spices. Serve on buns.", [["ground beef", "1.5 lb"], ["hamburger buns", "6"], ["tomato sauce", "2 cups"], ["brown sugar", "2 tbsp"]]],
  ],
  bbq: [
    ["Smoky grilled chicken thighs", "easy", 35, "Rub thighs with paprika and brown sugar. Grill over medium heat until 165°F.", [["bone-in chicken thighs", "8"], ["smoked paprika", "2 tbsp"], ["light brown sugar", "1 tbsp"], ["kosher salt", "to taste"]]],
    ["BBQ pulled pork sandwiches", "medium", 240, "Rub shoulder with spice blend, slow-cook until shreddable. Toss with BBQ sauce.", [["pork shoulder", "4 lb"], ["BBQ sauce", "2 cups"], ["hamburger buns", "12"], ["coleslaw mix", "4 cups"]]],
    ["Grilled corn with herb butter", "easy", 20, "Grill shucked corn, brush with compound butter of parsley and garlic.", [["corn on the cob", "6"], ["unsalted butter", "½ cup softened"], ["fresh parsley", "¼ cup"], ["garlic cloves", "2 minced"]]],
    ["Beer-can chicken", "medium", 90, "Season whole chicken, perch on half-filled beer can, grill indirect until done.", [["whole chicken", "4 lb"], ["lager beer", "1 can"], ["garlic powder", "1 tbsp"], ["lemon", "1 in cavity"]]],
    ["Grilled portobello caps", "easy", 15, "Marinate mushrooms in balsamic and oil; grill 4 minutes per side.", [["portobello mushrooms", "4 large"], ["balsamic vinegar", "¼ cup"], ["extra-virgin olive oil", "3 tbsp"], ["fresh thyme", "2 tsp"]]],
    ["Peach BBQ glaze ribs", "hard", 210, "Smoke or bake ribs low and slow; glaze with peach preserves and vinegar in the last 30 minutes.", [["pork spare ribs", "2 racks"], ["peach preserves", "1 cup"], ["apple cider vinegar", "¼ cup"], ["smoked paprika", "1 tbsp"]]],
    ["Grilled vegetable platter", "easy", 25, "Toss zucchini, peppers, and onion in oil; grill until tender with char marks.", [["zucchini", "3 sliced"], ["bell peppers", "3"], ["red onion", "2 thick slices"], ["extra-virgin olive oil", "¼ cup"]]],
  ],
  seafood: [
    ["Lemon garlic shrimp skewers", "easy", 20, "Marinate shrimp briefly, thread on skewers, grill 2 minutes per side.", [["large shrimp peeled", "1.5 lb"], ["garlic cloves", "4 minced"], ["lemon", "2"], ["extra-virgin olive oil", "3 tbsp"]]],
    ["Fish tacos with slaw", "easy", 25, "Grill white fish, flake into tortillas with cabbage slaw and lime crema.", [["cod fillets", "1.5 lb"], ["corn tortillas", "12"], ["shredded cabbage", "4 cups"], ["sour cream", "½ cup"]]],
    ["Clam chowder", "medium", 45, "Cook bacon, sauté aromatics, add potatoes, broth, and clams; finish with cream.", [["canned chopped clams", "2"], ["russet potatoes", "3 diced"], ["heavy cream", "1 cup"], ["celery", "3 stalks"]]],
    ["Seared scallops", "medium", 15, "Pat scallops dry, sear in hot butter 90 seconds per side. Serve with pea purée.", [["dry sea scallops", "12"], ["frozen peas", "2 cups"], ["unsalted butter", "3 tbsp"], ["lemon", "1"]]],
    ["Tuna poke bowl", "easy", 20, "Cube sushi-grade tuna, toss with soy and sesame. Serve over rice with avocado.", [["sushi-grade tuna", "12 oz"], ["soy sauce", "3 tbsp"], ["avocado", "2"], ["sushi rice", "3 cups cooked"]]],
    ["Grilled salmon with dill", "easy", 22, "Oil salmon, grill skin-side down. Top with dill yogurt and lemon.", [["skin-on salmon fillets", "4"], ["fresh dill", "¼ cup"], ["plain Greek yogurt", "½ cup"], ["cucumber", "1 diced"]]],
  ],
  vegetarian: [
    ["Caprese stuffed avocados", "easy", 15, "Fill avocado halves with mozzarella, tomato, and basil; drizzle balsamic.", [["ripe avocados", "4"], ["fresh mozzarella", "8 oz"], ["balsamic glaze", "2 tbsp"], ["fresh basil", "handful"]]],
    ["Spinach feta pie", "medium", 50, "Sauté spinach with onion, mix with feta and eggs, bake in phyllo until golden.", [["frozen spinach", "16 oz thawed"], ["feta cheese", "8 oz"], ["phyllo dough", "1 package"], ["eggs", "3"]]],
    ["Roasted vegetable grain bowl", "easy", 40, "Roast seasonal vegetables, serve over farro with tahini dressing.", [["farro", "1 cup dry"], ["sweet potato", "2 cubed"], ["broccoli florets", "3 cups"], ["tahini", "3 tbsp"]]],
    ["Mushroom risotto", "medium", 45, "Toast arborio, add warm broth ladle by ladle, fold in sautéed mushrooms and parmesan.", [["arborio rice", "1½ cups"], ["cremini mushrooms", "12 oz"], ["parmesan cheese", "½ cup"], ["low-sodium vegetable broth", "5 cups hot"]]],
    ["Black bean burgers", "medium", 30, "Mash beans with oats and spices, form patties, pan-sear until crisp.", [["black beans", "2 cans"], ["rolled oats", "1 cup"], ["burger buns", "6"], ["smoked paprika", "1 tsp"]]],
    ["Zucchini fritters", "easy", 25, "Grate zucchini, squeeze dry, mix with egg and flour, pan-fry until golden.", [["zucchini", "3 large"], ["eggs", "2"], ["all-purpose flour", "½ cup"], ["sour cream", "for serving"]]],
  ],
  vegan: [
    ["Chickpea curry", "easy", 30, "Sauté onion, add spices, tomatoes, and chickpeas. Simmer and finish with coconut milk.", [["canned chickpeas", "2"], ["coconut milk", "1 can"], ["curry powder", "2 tbsp"], ["spinach", "4 cups"]]],
    ["Lentil walnut Bolognese", "medium", 40, "Simmer lentils with crushed tomatoes and walnuts until thick. Toss with pasta.", [["brown lentils", "1 cup"], ["walnuts", "1 cup chopped"], ["spaghetti", "12 oz"], ["crushed tomatoes", "1 can"]]],
    ["Tofu scramble", "easy", 15, "Crumble tofu with turmeric, nutritional yeast, and vegetables until heated through.", [["extra-firm tofu", "14 oz"], ["nutritional yeast", "3 tbsp"], ["bell pepper", "1 diced"], ["ground turmeric", "½ tsp"]]],
    ["Vegan Caesar salad", "easy", 15, "Toss romaine with cashew-based dressing and chickpea croutons.", [["romaine hearts", "3 chopped"], ["raw cashews", "½ cup soaked"], ["canned chickpeas", "1 can roasted"], ["lemon", "1 juiced"]]],
    ["Sweet potato black bean tacos", "easy", 30, "Roast cubed sweet potato, fill tortillas with beans, salsa, and cilantro.", [["sweet potato", "2 large"], ["black beans", "2 cans"], ["corn tortillas", "12"], ["fresh cilantro", "1 bunch"]]],
    ["Overnight oats", "easy", 5, "Combine oats, plant milk, chia, and maple. Refrigerate overnight; top with berries.", [["rolled oats", "1 cup"], ["oat milk", "1½ cups"], ["chia seeds", "2 tbsp"], ["mixed berries", "1 cup"]]],
  ],
  gluten_free: [
    ["Quinoa tabbouleh", "easy", 25, "Cook quinoa, cool, toss with parsley, tomato, cucumber, and lemon.", [["quinoa", "1 cup dry"], ["fresh parsley", "2 cups"], ["lemon", "2 juiced"], ["english cucumber", "1 diced"]]],
    ["GF chicken stir-fry", "easy", 25, "Stir-fry chicken and vegetables in tamari; serve over rice noodles.", [["chicken breast", "1 lb sliced"], ["tamari", "3 tbsp"], ["rice noodles", "8 oz"], ["broccoli florets", "3 cups"]]],
    ["Baked cod with tomatoes", "easy", 28, "Nestle cod in a dish of cherry tomatoes, garlic, and olive oil. Bake at 400°F.", [["cod fillets", "4"], ["cherry tomatoes", "2 cups"], ["garlic cloves", "4"], ["extra-virgin olive oil", "3 tbsp"]]],
    ["Stuffed bell peppers", "medium", 50, "Fill peppers with ground turkey, rice, and spices; bake until peppers soften.", [["bell peppers", "6"], ["ground turkey", "1 lb"], ["cooked rice", "2 cups"], ["diced tomatoes", "1 can"]]],
    ["Almond flour pancakes", "easy", 20, "Whisk almond flour, eggs, and banana; cook on a griddle until set.", [["almond flour", "2 cups"], ["eggs", "4"], ["ripe banana", "2 mashed"], ["maple syrup", "for serving"]]],
    ["Zoodles with pesto", "easy", 15, "Spiralize zucchini, toss with pesto and cherry tomatoes. Serve warm or room temp.", [["zucchini", "4 spiralized"], ["basil pesto", "½ cup"], ["cherry tomatoes", "2 cups"], ["pine nuts", "2 tbsp"]]],
  ],
  soups: [
    ["Gazpacho", "easy", 15, "Blend ripe tomatoes, cucumber, pepper, and bread until smooth. Chill at least 2 hours.", [["ripe tomatoes", "2 lb"], ["english cucumber", "1"], ["day-old bread", "2 slices"], ["sherry vinegar", "2 tbsp"]]],
    ["Chicken noodle soup", "easy", 45, "Simmer chicken with carrots, celery, and onion; add egg noodles until tender.", [["bone-in chicken thighs", "4"], ["egg noodles", "8 oz"], ["carrots", "3 sliced"], ["celery", "3 stalks"]]],
    ["Tomato basil soup", "easy", 30, "Cook onions, add tomatoes and broth, blend smooth. Stir in cream and basil.", [["crushed tomatoes", "2 cans"], ["fresh basil", "1 cup"], ["heavy cream", "½ cup"], ["yellow onion", "1"]]],
    ["Corn chowder", "medium", 40, "Sauté corn and potatoes in butter, add broth, blend half for creaminess.", [["corn kernels", "4 cups"], ["russet potatoes", "2"], ["heavy cream", "1 cup"], ["bacon", "4 slices"]]],
    ["Miso ramen bowl", "medium", 35, "Simmer broth with miso, cook noodles, top with soft egg and greens.", [["ramen noodles", "4 packs"], ["white miso paste", "3 tbsp"], ["soft-boiled eggs", "4"], ["baby spinach", "4 cups"]]],
    ["Lentil soup", "easy", 40, "Cook lentils with carrots, cumin, and tomatoes until thick and hearty.", [["brown lentils", "1 cup"], ["carrots", "3 diced"], ["ground cumin", "1 tsp"], ["crushed tomatoes", "1 can"]]],
  ],
  salads: [
    ["Summer watermelon feta salad", "easy", 10, "Toss cubed watermelon with feta, mint, and lime. Serve chilled.", [["seedless watermelon", "4 cups cubed"], ["feta cheese", "4 oz"], ["fresh mint", "¼ cup"], ["lime", "1"]]],
    ["Classic Caesar salad", "easy", 15, "Toss romaine with anchovy dressing, parmesan, and croutons.", [["romaine hearts", "2"], ["parmesan cheese", "½ cup"], ["croutons", "2 cups"], ["anchovy paste", "1 tsp"]]],
    ["Asian slaw", "easy", 15, "Shred cabbage and carrots, dress with ginger-soy vinaigrette.", [["shredded cabbage", "4 cups"], ["carrots", "2 grated"], ["rice vinegar", "3 tbsp"], ["toasted sesame oil", "1 tbsp"]]],
    ["Nicoise salad", "medium", 25, "Arrange potatoes, green beans, eggs, tuna, and olives over lettuce.", [["canned tuna", "2"], ["green beans", "1 lb blanched"], ["hard-boiled eggs", "4"], ["niçoise olives", "1 cup"]]],
    ["Strawberry spinach salad", "easy", 12, "Toss spinach with strawberries, goat cheese, and poppy seed dressing.", [["baby spinach", "6 cups"], ["strawberries", "2 cups sliced"], ["goat cheese", "4 oz"], ["sliced almonds", "¼ cup"]]],
    ["Cobb salad", "easy", 20, "Layer lettuce with chicken, bacon, egg, avocado, and blue cheese.", [["romaine lettuce", "1 head"], ["cooked chicken breast", "2 cups"], ["avocado", "2"], ["blue cheese", "4 oz"]]],
    ["Panzanella", "easy", 20, "Toss torn bread with tomatoes, cucumber, red onion, and vinaigrette.", [["ciabatta bread", "4 cups cubed"], ["heirloom tomatoes", "4"], ["red onion", "½ sliced"], ["red wine vinegar", "3 tbsp"]]],
  ],
  pasta: [
    ["Spaghetti aglio e olio", "easy", 20, "Cook spaghetti, toss with olive oil, garlic, chili flakes, and parsley.", [["spaghetti", "12 oz"], ["garlic cloves", "6 sliced"], ["extra-virgin olive oil", "½ cup"], ["red pepper flakes", "½ tsp"]]],
    ["Penne alla vodka", "medium", 30, "Sauté onion, add vodka and tomatoes, stir in cream and penne.", [["penne", "12 oz"], ["tomato passata", "2 cups"], ["vodka", "¼ cup"], ["heavy cream", "½ cup"]]],
    ["Bolognese", "medium", 90, "Brown beef and pork with soffritto, simmer with wine and tomatoes 1 hour.", [["ground beef", "1 lb"], ["ground pork", "½ lb"], ["tagliatelle", "12 oz"], ["red wine", "1 cup"]]],
    ["Pesto pasta", "easy", 15, "Toss hot pasta with basil pesto and pasta water; top with parmesan.", [["fusilli", "12 oz"], ["basil pesto", "½ cup"], ["parmesan cheese", "¼ cup"], ["pine nuts", "2 tbsp"]]],
    ["Shrimp scampi", "easy", 25, "Sauté shrimp in garlic butter, deglaze with wine, toss with linguine.", [["linguine", "12 oz"], ["large shrimp", "1 lb"], ["white wine", "½ cup"], ["unsalted butter", "4 tbsp"]]],
    ["Baked ziti", "medium", 50, "Mix ziti with ricotta, marinara, and mozzarella; bake until bubbly.", [["ziti", "1 lb"], ["whole-milk ricotta", "15 oz"], ["marinara sauce", "3 cups"], ["mozzarella", "2 cups"]]],
  ],
  breakfast: [
    ["Fluffy scrambled eggs", "easy", 10, "Whisk eggs with a splash of cream, cook low and slow, finish with butter.", [["eggs", "6"], ["heavy cream", "2 tbsp"], ["unsalted butter", "2 tbsp"], ["chives", "for garnish"]]],
    ["Banana pancakes", "easy", 20, "Mix batter, cook on a buttered griddle, serve with maple syrup.", [["all-purpose flour", "1½ cups"], ["ripe banana", "2 mashed"], ["eggs", "2"], ["maple syrup", "for serving"]]],
    ["Avocado toast", "easy", 10, "Mash avocado with lemon, spread on toasted sourdough, top with chili flakes.", [["sourdough bread", "4 slices"], ["ripe avocados", "2"], ["lemon", "1"], ["red pepper flakes", "pinch"]]],
    ["Overnight chia pudding", "easy", 5, "Mix chia, milk, and vanilla; refrigerate overnight. Top with fruit.", [["chia seeds", "½ cup"], ["whole milk", "2 cups"], ["vanilla extract", "1 tsp"], ["fresh berries", "1 cup"]]],
    ["Breakfast burrito", "easy", 25, "Scramble eggs with peppers, wrap in tortillas with cheese and salsa.", [["eggs", "8"], ["flour tortillas", "4 large"], ["cheddar cheese", "1 cup"], ["salsa", "1 cup"]]],
    ["Greek yogurt parfait", "easy", 5, "Layer yogurt, granola, and honeyed berries in glasses.", [["plain Greek yogurt", "2 cups"], ["granola", "1 cup"], ["mixed berries", "2 cups"], ["honey", "2 tbsp"]]],
  ],
  desserts: [
    ["Chocolate chip cookies", "easy", 25, "Cream butter and sugars, fold in flour and chips, bake until edges set.", [["all-purpose flour", "2¼ cups"], ["chocolate chips", "2 cups"], ["unsalted butter", "1 cup"], ["brown sugar", "¾ cup"]]],
    ["Berry crisp", "easy", 45, "Toss berries with sugar, top with oat crumble, bake until bubbling.", [["mixed berries", "6 cups"], ["rolled oats", "1 cup"], ["all-purpose flour", "1 cup"], ["unsalted butter", "½ cup"]]],
    ["Lemon bars", "medium", 50, "Press shortbread base, bake, pour lemon custard, bake again until set.", [["all-purpose flour", "2 cups"], ["lemons", "4 juiced"], ["eggs", "4"], ["powdered sugar", "for dusting"]]],
    ["Banana bread", "easy", 65, "Mash bananas into batter, bake in a loaf pan until a tester comes out clean.", [["ripe bananas", "4"], ["all-purpose flour", "2 cups"], ["eggs", "2"], ["walnuts", "1 cup optional"]]],
    ["No-churn vanilla ice cream", "easy", 360, "Whip cream, fold with sweetened condensed milk and vanilla. Freeze 6 hours.", [["heavy cream", "2 cups"], ["sweetened condensed milk", "1 can"], ["vanilla extract", "2 tsp"], ["kosher salt", "pinch"]]],
  ],
};

export const TARGET = 100;

const summerBoost = ["bbq", "salads", "soups", "seafood", "mediterranean", "vegan", "vegetarian"];

export function starterImagePath(seq) {
  return `/recipes/starter-${String(seq).padStart(3, "0")}.jpg`;
}

/** @returns {{ recipes: Array<{cat: string, item: unknown[], seq: number}>, counts: Record<string, number> }} */
export function buildStarterRecipes() {
  const recipes = [];
  let seq = 1;
  for (const cat of CATEGORIES) {
    const pool = BY_CATEGORY[cat] ?? [];
    if (pool.length === 0) throw new Error(`Missing recipes for ${cat}`);
  }
  const queues = Object.fromEntries(CATEGORIES.map((c) => [c, [...BY_CATEGORY[c]]]));
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  for (const cat of CATEGORIES) {
    const item = queues[cat].shift();
    if (!item) throw new Error(`Empty queue for ${cat}`);
    recipes.push({ cat, item, seq: seq++ });
    counts[cat]++;
  }
  let i = 0;
  while (recipes.length < TARGET) {
    const cat =
      recipes.length % 3 === 0 && summerBoost.length
        ? summerBoost[i % summerBoost.length]
        : CATEGORIES[i % CATEGORIES.length];
    i++;
    if (queues[cat].length === 0) queues[cat].push(...BY_CATEGORY[cat]);
    const item = queues[cat].shift();
    recipes.push({ cat, item, seq: seq++ });
    counts[cat]++;
  }
  return { recipes, counts };
}

/** @returns {Array<{ seq: number, title: string, category: string }>} */
export function starterRecipeTitles() {
  return buildStarterRecipes().recipes.map((r) => ({
    seq: r.seq,
    title: r.item[0],
    category: r.cat,
  }));
}
