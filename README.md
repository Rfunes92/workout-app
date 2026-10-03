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

## Appearance (Light / Dark / System)
Setup → Appearance. Dark is the default. System follows the phone's light/dark setting live through `prefers-color-scheme`.
- **Storage:** the choice lives in `localStorage` key `ronnieWorkout.theme` and is included in the backup export/import.
- **Early load:** `js/theme.js` runs in `<head>` before the stylesheet, so there's no flash of the wrong theme. It also updates `<meta name="theme-color">` (dark `#0d0f12`, light `#f8f9fb`), which sets Android Chrome's status/address bar color.
- **CSS:** all colors are CSS variables in `css/style.css`. The light palette is a single `html[data-theme="light"]` block that only overrides variables, plus a few small tweaks.

## Accounts & cloud sync (Firebase)
Optional accounts let each person (e.g. Ronnie and Bri) have their own data that follows them across devices. Firebase project: `torque-fit-e1bae`, free Spark plan.
- **SDK:** Firebase JS SDK v12.19.0 (modular), vendored in `js/vendor/firebase/` as ES modules, so there's no build step and no CDN. Apache-2.0 license (see `LICENSE.txt` there). Firestore is lazy-loaded only once someone is signed in.
- **Sign-in:** email/password (sign up, sign in, reset email) and Continue with Google. Google uses a popup and falls back to `signInWithRedirect` (`getRedirectResult` runs after the redirect). It falls back when the popup is blocked or unsupported, and you can also tap "Use full-page Google sign-in". "Use without account" keeps the app fully local.
- **Offline-first:** localStorage stays the working copy. Signed-in data is namespaced per user (`u:<uid>:ronnieFood.v1`, etc.). `js/cloud.js` mirrors it to Firestore with persistent offline cache:
  - `users/{uid}/data/workout`: settings, equipment, schedule, swaps, lift log
  - `users/{uid}/data/prefs`: theme, nutrition goals, food settings
  - `users/{uid}/data/foodlib`: custom foods, recipes, cached foods, recents, favorites
  - `users/{uid}/data/weights`: weigh-ins
  - `users/{uid}/foodDays/{YYYY-MM-DD}`: one doc per day, including water
  
  Each doc is `{ j: <JSON string>, updatedAt: <client ms>, su: <server time>, dev }`. Conflicts are last-write-wins per doc. Deleted days become tombstones.
- **First sign-in on a device that already has data:** if the account is empty, the device's data is uploaded. If the account has different data, you choose: merge (recommended), keep the account's data, or keep this device's data.
- **Sign out:** waits for pending changes to upload (it warns if offline), then clears this user's local data and the Firestore offline cache.
- **Delete account:** deletes all of the user's Firestore docs (and verifies they're gone), then the Auth user, then the local data. It asks for the password again if the last sign-in wasn't recent.
- **Status pill in the top bar:** Synced / Syncing / Offline · N / Sync error / Local (signed out).

Firestore rules: each user can read and write only `users/{uid}/**`.
