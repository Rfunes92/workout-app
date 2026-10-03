# Ronnie's Workout (static web app)

Mobile-first workout planner. Plain HTML/CSS/JS, no build step, no server. Everything is saved in the browser's `localStorage`.

## Run locally
```bash
cd workout-app
python3 -m http.server 8000
# open http://localhost:8000/
```

## Publish (GitHub Pages)
Push this folder (repo root or `/docs`) and enable Pages. All paths are relative.
`screenshots/` is only documentation and can be published or deleted.

## Files
- `index.html` – app shell, tab bar, rest timer, bottom sheet
- `css/style.css` – dark gym-style UI (iPhone safe areas)
- `js/exercises.js` – equipment catalog, presets, muscles, exercise library
- `js/planner.js` – weekly plan generator, goals, sets/reps/rest, finishers, overload guidance
- `js/bodymap.js` – front/back SVG muscle map
- `js/demo.js` – animated stick-figure demos (one per movement pattern)
- `js/app.js` – state, routing (`#today`, `#week`, `#library`, `#setup`, `#day/mon`, `#ex/<id>`), UI
- `sw.js` – offline cache (network-first)
- `manifest.webmanifest`, `icons/` – Add to Home Screen

## Food & macro tracker (Food tab)
A Lose It!-style tracker that lives in the same app (`#food`, `#food/progress`, `#food/goals`).

- **Goals:** calories (default 2,200), protein (default 200 g). Carbs and fat are auto-split from the calories left after protein (fat-share slider) or set manually. Fiber and water targets are optional.
- **Dashboard:** a protein ring (the hero stat), calories eaten/remaining, carb/fat/fiber bars, water, and Breakfast/Lunch/Dinner/Snacks with day navigation.
- **Logging:**
  - search, barcode scan, recents, favorites, custom foods, recipes/saved meals, and Quick Add
  - edit or delete any entry
  - copy yesterday's meal or whole day
- **Progress:** weekly summary (avg calories, avg protein, days the protein goal was hit, chart) and a weight log with a 7-day trend line.
- **Data:** stored in `localStorage` key `ronnieFood.v1`. It's included in Setup → Export/Import backup.

### Data sources (called straight from the browser, no server)
| Source | Used for | Notes |
|---|---|---|
| Built-in list (`js/foods-seed.js`) | ~49 high-protein staples | Works offline. Values are approximate USDA/label averages. |
| Open Food Facts `cgi/search.pl` | Packaged food search | No key needed. CORS `*`. About 10 searches/min (the app throttles itself and retries once). Global database, so expect some non-US products. |
| Open Food Facts `api/v2/product/{barcode}.json` | Barcode lookup | No key needed. CORS `*`. |
| USDA FoodData Central `fdc/v1/foods/search` | Generic foods (Foundation, SR Legacy, FNDDS) | CORS `*`. `DEMO_KEY` is heavily rate-limited, so get a free key at https://fdc.nal.usda.gov/api-key-signup and paste it in Food → Goals. |

### Barcode scanning
Android Chrome uses the native `BarcodeDetector` with the rear camera. Other browsers lazy-load the vendored ZXing build (`js/vendor/zxing-library-0.21.3.min.js`, MIT, see `js/vendor/ZXING-LICENSE`). You can always type the digits instead. Camera access needs HTTPS, which GitHub Pages provides, or `localhost`.
