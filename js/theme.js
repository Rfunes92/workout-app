/* Boot helpers, loaded in <head> before the CSS:
   1) per-account localStorage namespace (WO.ns), 2) change hook for cloud sync, 3) sign-in gate class, 4) Light / Dark / System theme. */
(function () {
  // Android PWA bug: some phones report devicePixelRatio≈1 so device-width becomes the physical
  // pixel width (~1080). Layout then looks tiny/letterboxed (max-width:640 centers a narrow column).
  try {
    var meta = document.querySelector('meta[name="viewport"]');
    var sw = Math.min(screen.width || 0, screen.height || 0);
    var dpr = window.devicePixelRatio || 1;
    var touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (meta && touch && dpr <= 1.15 && sw >= 700) {
      var target = 390;
      meta.setAttribute('content', 'width=' + target + ', initial-scale=' + (sw / target).toFixed(4) + ', viewport-fit=cover');
    }
  } catch (e) { /* ignore */ }
  window.WO = window.WO || {};
  const WO = window.WO;
  let uid = '', guest = false;
  try { uid = localStorage.getItem('ronnieAuth.uid') || ''; guest = localStorage.getItem('ronnieAuth.guest') === '1'; } catch (e) { /* storage blocked */ }
  // Signed-in users get their own keys ("u:<uid>:ronnieFood.v1"); signed-out ("guest") data uses the plain keys.
  WO.authUid = uid;
  WO.ns = k => (uid ? 'u:' + uid + ':' : '') + k;
  WO.dataKeys = ['ronnieWorkout.v1', 'ronnieFood.v1', 'ronnieWorkout.theme'].map(WO.ns);
  // Tell the sync engine (js/cloud.js) whenever app data is written, without touching every save() call.
  try {
    const P = Storage.prototype, set = P.setItem, rm = P.removeItem;
    const notify = (s, k) => { if (s === window.localStorage && WO.dataKeys.indexOf(k) !== -1 && WO.onLocalSave) { try { WO.onLocalSave(k); } catch (e) { console.warn(e); } } };
    P.setItem = function (k, v) { set.call(this, k, v); notify(this, k); };
    P.removeItem = function (k) { rm.call(this, k); notify(this, k); };
  } catch (e) { /* very old browser: sync still runs on its periodic scan */ }
  // First launch (never signed in, never chose "use without account"): show the sign-in screen.
  if (!uid && !guest) document.documentElement.classList.add('needs-auth');

  const KEY = WO.ns('ronnieWorkout.theme');
  const COLORS = { dark: '#0d0f12', light: '#f8f9fb' };
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  function get() { try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'system' ? v : 'dark'; } catch (e) { return 'dark'; } }
  function resolved(pref) { pref = pref || get(); return pref === 'system' ? (mq && mq.matches ? 'light' : 'dark') : pref; }
  function apply() {
    const r = resolved();
    document.documentElement.setAttribute('data-theme', r);
    let m = document.querySelector('meta[name="theme-color"]');
    if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
    m.setAttribute('content', COLORS[r]);
    return r;
  }
  function set(pref) {
    pref = pref === 'light' || pref === 'system' ? pref : 'dark';
    try { if (pref === 'dark') localStorage.removeItem(KEY); else localStorage.setItem(KEY, pref); } catch (e) { /* storage blocked */ }
    return apply();
  }
  if (mq) { const on = () => { if (get() === 'system') apply(); }; mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on); }
  WO.theme = { get, set, apply, resolved, KEY };
  apply();
})();
