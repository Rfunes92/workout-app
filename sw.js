/* Offline support: network-first for same-origin files, falling back to cache (handy in gyms with bad signal). */
const CACHE = 'workout-v3';
const ASSETS = ['./', './index.html', './css/style.css', './js/exercises.js', './js/bodymap.js', './js/demo.js', './js/planner.js', './js/app.js', './js/foods-seed.js', './js/food.js', './js/vendor/zxing-library-0.21.3.min.js', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // API calls (OFF/USDA) go straight to the network
  e.respondWith(fetch(e.request).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
});
