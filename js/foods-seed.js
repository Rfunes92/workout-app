/* Built-in offline staples. Values per 100 g (USDA SR Legacy / typical US labels). n: [kcal, protein, carbs, fat, fiber] */
(function () {
  'use strict';
  const S = [
    // id, name, per100 [kcal,p,c,f,fiber], servings [[label, grams]]
    ['chicken_breast_cooked', 'Chicken breast, skinless, cooked', [165, 31, 0, 3.6, 0], [['4 oz cooked', 113], ['1 breast (~6 oz)', 172]]],
    ['chicken_breast_raw', 'Chicken breast, skinless, raw', [120, 22.5, 0, 2.6, 0], [['4 oz raw', 113], ['8 oz raw', 227]]],
    ['chicken_thigh_cooked', 'Chicken thigh, skinless, cooked', [209, 25.9, 0, 10.9, 0], [['1 thigh (~3 oz)', 85], ['4 oz cooked', 113]]],
    ['egg_large', 'Egg, whole, large', [143, 12.6, 0.7, 9.5, 0], [['1 large egg', 50]]],
    ['egg_whites', 'Egg whites (liquid)', [52, 10.9, 0.7, 0.2, 0], [['3 tbsp (46 g)', 46], ['1 cup', 243], ['1 large egg white', 33]]],
    ['greek_yogurt_nonfat', 'Greek yogurt, plain, nonfat', [59, 10.3, 3.6, 0.4, 0], [['1 container (170 g)', 170], ['1 cup', 227]]],
    ['greek_yogurt_2', 'Greek yogurt, plain, 2%', [73, 9.9, 3.9, 1.9, 0], [['1 container (170 g)', 170], ['1 cup', 227]]],
    ['cottage_cheese_2', 'Cottage cheese, 2% low-fat', [81, 10.5, 4.8, 2.3, 0], [['1/2 cup', 113], ['1 cup', 226]]],
    ['whey_scoop', 'Whey protein powder (typical)', [387, 77.4, 9.7, 4.8, 0], [['1 scoop (31 g)', 31]]],
    ['casein_scoop', 'Casein protein powder (typical)', [364, 72.7, 12.1, 3, 3], [['1 scoop (33 g)', 33]]],
    ['beef_93', 'Ground beef 93/7, raw', [152, 20.5, 0, 7.1, 0], [['4 oz raw', 113], ['1 lb raw', 454]]],
    ['beef_90', 'Ground beef 90/10, raw', [176, 20, 0, 10, 0], [['4 oz raw', 113]]],
    ['turkey_93', 'Ground turkey 93/7, raw', [150, 18.6, 0, 8, 0], [['4 oz raw', 113]]],
    ['salmon_cooked', 'Salmon, Atlantic, cooked', [206, 22.1, 0, 12.4, 0], [['4 oz cooked', 113], ['1 fillet (~6 oz)', 170]]],
    ['tuna_can', 'Tuna, light, canned in water, drained', [116, 25.5, 0, 0.8, 0], [['1 can drained (~4 oz)', 113], ['1/4 cup', 43]]],
    ['shrimp_cooked', 'Shrimp, cooked', [99, 24, 0.2, 0.3, 0], [['4 oz cooked', 113], ['3 oz', 85]]],
    ['tilapia_cooked', 'Tilapia, cooked', [128, 26.2, 0, 2.7, 0], [['1 fillet (~3 oz)', 87], ['4 oz', 113]]],
    ['cod_cooked', 'Cod, Atlantic, cooked', [105, 22.8, 0, 0.9, 0], [['4 oz', 113]]],
    ['pork_tenderloin', 'Pork tenderloin, lean, cooked', [143, 26.2, 0, 3.5, 0], [['4 oz', 113]]],
    ['turkey_deli', 'Turkey breast, deli sliced', [104, 17.1, 4.2, 1.7, 0.5], [['2 oz (56 g)', 56]]],
    ['beef_jerky', 'Beef jerky (typical)', [410, 33.2, 11, 25.6, 1.8], [['1 oz', 28]]],
    ['tofu_firm', 'Tofu, firm', [144, 17.3, 2.8, 8.7, 2.3], [['1/2 cup', 126], ['3 oz', 85]]],
    ['edamame', 'Edamame, shelled, cooked', [121, 11.9, 8.9, 5.2, 5.2], [['1/2 cup', 78], ['1 cup', 155]]],
    ['milk_2', 'Milk, 2%', [50, 3.3, 4.8, 2, 0], [['1 cup (8 fl oz)', 244]]],
    ['milk_uf_2', 'Ultra-filtered milk, 2% (Fairlife-style)', [50, 5.4, 2.5, 1.9, 0], [['1 cup (8 fl oz)', 240]]],
    ['string_cheese', 'Mozzarella string cheese, part-skim', [254, 24.3, 2.8, 15.9, 0], [['1 stick (28 g)', 28]]],
    ['cheddar', 'Cheddar cheese', [403, 24.9, 1.3, 33.1, 0], [['1 oz', 28], ['1 slice (21 g)', 21]]],
    ['rice_white', 'White rice, cooked', [130, 2.7, 28.2, 0.3, 0.4], [['1 cup cooked', 158], ['1/2 cup cooked', 79]]],
    ['rice_brown', 'Brown rice, cooked', [123, 2.7, 25.6, 1, 1.6], [['1 cup cooked', 195], ['1/2 cup cooked', 98]]],
    ['oats', 'Oats, rolled, dry', [379, 13.2, 67.7, 6.5, 10.1], [['1/2 cup dry (40 g)', 40], ['1 cup dry', 81]]],
    ['quinoa', 'Quinoa, cooked', [120, 4.4, 21.3, 1.9, 2.8], [['1 cup cooked', 185]]],
    ['pasta', 'Pasta, cooked', [158, 5.8, 30.9, 0.9, 1.8], [['1 cup cooked', 140], ['2 oz dry ≈ 1 cup cooked', 140]]],
    ['bread_ww', 'Bread, whole wheat', [252, 12.4, 42.7, 3.5, 6], [['1 slice', 32]]],
    ['tortilla_flour', 'Tortilla, flour (8")', [306, 8.2, 49.4, 8, 3.5], [['1 tortilla (49 g)', 49]]],
    ['sweet_potato', 'Sweet potato, baked', [90, 2, 20.7, 0.2, 3.3], [['1 medium', 114], ['1 cup', 200]]],
    ['potato', 'Potato, baked, with skin', [93, 2.5, 21.2, 0.1, 2.2], [['1 medium', 173]]],
    ['black_beans', 'Black beans, cooked', [132, 8.9, 23.7, 0.5, 8.7], [['1/2 cup', 86], ['1 cup', 172]]],
    ['banana', 'Banana', [89, 1.1, 22.8, 0.3, 2.6], [['1 medium', 118], ['1 large', 136]]],
    ['apple', 'Apple', [52, 0.3, 13.8, 0.2, 2.4], [['1 medium', 182]]],
    ['blueberries', 'Blueberries', [57, 0.7, 14.5, 0.3, 2.4], [['1 cup', 148]]],
    ['strawberries', 'Strawberries', [32, 0.7, 7.7, 0.3, 2], [['1 cup sliced', 166]]],
    ['broccoli', 'Broccoli, cooked', [35, 2.4, 7.2, 0.4, 3.3], [['1 cup', 156]]],
    ['spinach', 'Spinach, raw', [23, 2.9, 3.6, 0.4, 2.2], [['1 cup', 30], ['3 cups', 90]]],
    ['avocado', 'Avocado', [160, 2, 8.5, 14.7, 6.7], [['1/3 avocado', 50], ['1 whole', 150]]],
    ['peanut_butter', 'Peanut butter', [588, 25, 20, 50, 6], [['2 tbsp', 32], ['1 tbsp', 16]]],
    ['almonds', 'Almonds', [579, 21.2, 21.6, 49.9, 12.5], [['1 oz (~23 nuts)', 28]]],
    ['olive_oil', 'Olive oil', [884, 0, 0, 100, 0], [['1 tbsp', 13.5], ['1 tsp', 4.5]]],
    ['hummus', 'Hummus', [166, 7.9, 14.3, 9.6, 6], [['2 tbsp', 30]]]
  ];
  const UNIVERSAL = [['100 g', 100], ['1 oz', 28.35], ['1 g', 1]];
  const foods = S.map(([id, name, n, sv]) => ({
    id: 'seed:' + id, name, source: 'seed',
    per100: { kcal: n[0], p: n[1], c: n[2], f: n[3], fiber: n[4] },
    servings: sv.concat(UNIVERSAL).map(([label, g]) => ({ label, g }))
  }));
  // Protein bar has a fixed per-bar label rather than a generic per-100 g profile
  foods.push({ id: 'seed:protein_bar', name: 'Protein bar (typical, 60 g)', source: 'seed', per100: { kcal: 333, p: 33.3, c: 36.7, f: 13.3, fiber: 23.3 }, servings: [{ label: '1 bar (60 g)', g: 60 }].concat(UNIVERSAL.map(([label, g]) => ({ label, g }))) });
  window.WO = window.WO || {};
  window.WO.SEED_FOODS = foods;
  window.WO.UNIVERSAL_SERVINGS = UNIVERSAL.map(([label, g]) => ({ label, g }));
})();
