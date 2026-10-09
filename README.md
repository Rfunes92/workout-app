<p align="center"><img src="brand/mountup-wordmark-light.svg" alt="Mount Up" width="420"></p>

# Mount Up (static web app)

> *"They shall mount up with wings as eagles; they shall run, and not be weary."* (Isaiah 40:31). Also biker slang for getting ready to ride.
>
> **Train. Fuel. Rise.**

Live: https://rfunes92.github.io/workout-app/

Mobile-first workout planner + food tracker. Plain HTML/CSS/JS, no build step, no server. Everything is saved in the browser's `localStorage`.

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

## Brand (Mount Up)
Original vector artwork, generated as clean SVG (no stock/copied logos).

- **Mark:** a geometric eagle with raised wings (3 parallel feather bars per side, angled upward) and a side-profile eagle head (flat fierce brow, eye notch, deep hooked beak), giving an upward "rise" motion. Built to stay readable at 48px.
- **Colors:** Amber `#ffb020` → Ember `#ff5a3c` gradient (on dark); on light backgrounds use `#f29a00` → `#ec4a2a`. Ink `#0d0f12` (near-black, also `theme_color`); light surface `#f8f9fb`. Exposed in CSS as `--brand-a` / `--brand-b` per theme.
- **Wordmark:** "MOUNT UP" in Inter Tight Black (SIL Open Font License), converted to outlines so no font is needed at runtime.
- **Tagline:** Train. Fuel. Rise.

| File | Use |
|---|---|
| `brand/mountup-mark.svg` | Mark, transparent, for dark backgrounds |
| `brand/mountup-mark-onlight.svg` | Mark, deeper gradient for light backgrounds |
| `brand/mountup-wordmark-dark.svg` / `-light.svg` | Horizontal lockup (mark + MOUNT UP) for dark / light backgrounds |
| `brand/mountup-wordtype.svg` | Wordmark text only (`currentColor`) |
| `brand/icon-any.svg`, `icon-maskable.svg`, `icon-apple.svg` | Icon sources |
| `icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `favicon-32.png`, `favicon-48.png`, `/favicon.ico`, `icons/icon.svg` | App/PWA icons |
| `screenshots/mountup-brand.png` | Brand sheet |

The in-app logo is an inline SVG sprite (`#mu-mark`, `#mu-word`) in `index.html`, so it themes automatically.

The rebrand changed **no** storage keys (`ronnieWorkout.v1`, `ronnieFood.v1`, `ronnieWorkout.theme`, `ronnieAuth.*`, `ronnieSync`, `u:<uid>:…`) and **no** Firebase settings, so existing data and sync keep working. The repo/URL stays `rfunes92.github.io/workout-app`.

## Onboarding (Phase 1)
First launch goes **sign in / create account (or use without account) → Welcome → coach quiz → tutorial → Today**. Code: `js/onboarding.js`, styles under "Onboarding" in `css/style.css`.
- **Welcome:** explains what Mount Up is — a coach in your pocket for anyone who lifts at the gym, trains at home, or is just getting started (eagle brand, posture-first mannequin demos, any gym + home).
- **Quiz (8 steps):** name, goals, experience, where you train (searchable gym picker with a seeded list of major chains + type-your-own, plus a Home gym toggle; saved as `profile.gyms` / `profile.homeGym`), session length (30–90 min), limitations (back lying flat, back on squats, knees, shoulders), weekly schedule with a separate time per training day, and a required goal weight (drawn as the target line on Food → Weekly & weight). Legacy class days from before v16 still render but are no longer offered.
- **Saved to** the workout state (`profile.experience/limitations/train/goalWeight/onboardedAt`, `goals`, `schedule`), which syncs through `users/{uid}/data/workout`. A summary also goes on `users/{uid}` (`onboarded`, `coach`) so Admin can see it.
- **Limitations shape the plan:** `WO.LIMIT_BLOCK` in `planner.js` (for example, flat-back skips flat bench, DB fly, skull crushers, dead bugs and floor bridges; squat-back skips barbell/hack/Smith squats and deep squat holds). Swap can still pick those moves on purpose.
- **Tutorial:** 5 short tips (Today, logging sets, form demo, rest timer, finishing the day).
- **Redo:** Setup → Coach setup → Redo onboarding. The lift log and food data are kept.

## Feature flags & beta
- `js/flags.js` holds the catalog (`latino_food`, `weekly_checkin`, `form_score`, `desktop_shell`, `wearables`). Each flag is **off / beta / live**.
- **Setup → Beta features** is off by default. It's stored per user in `profile.betaFeatures` and turns on flags set to *beta*.
- **Admin → Feature flags** (`#admin/flags`, Ronnie only) publishes `config/features` in Firestore. Signed-in clients listen live, and the last values are cached locally. **Deploy the updated `firestore.rules`** (it adds `config/features`: read when signed in, write by admin only).
- Check a flag in code with `WO.flags.isOn('key')`.

## Desktop Admin
At ≥900px wide, `#admin` uses a sidebar + wide content layout (user table, 3-column flag grid, 2-column user detail) and hides the tab bar. Phones (the Android viewport fix pins them to 390px) keep the stacked layout.
