/* Boot helpers, loaded in <head> before the CSS:
   1) per-account localStorage namespace (WO.ns), 2) change hook for cloud sync, 3) sign-in gate class, 4) Light / Dark / System theme. */
(function () {
  // Re-apply Android PWA viewport fix (primary copy is the inline <head> script). Broader than DPR≈1:
  // also catches large innerWidth on Android phones when screen.width is already CSS px.
  try {
    var TARGET = 390;
    var meta = document.querySelector('meta[name="viewport"]');
    var touch = ('ontouchstart' in window) || ((navigator.maxTouchPoints || 0) > 0);
    if (meta && touch) {
      var ua = navigator.userAgent || '';
      var androidPhone = /Android/i.test(ua) && /Mobile/i.test(ua);
      var phone = androidPhone || /iPhone|iPod/i.test(ua);
      var iw = window.innerWidth || 0;
      var shortSide = Math.min(screen.width || iw, screen.height || window.innerHeight || 0) || 0;
      var layoutW = Math.max(iw, (document.documentElement && document.documentElement.clientWidth) || 0);
      var dpr = window.devicePixelRatio || 1;
      var broken = (shortSide >= 500 && dpr <= 1.5) || (phone && layoutW >= 500) || (androidPhone && layoutW >= 480);
      if (broken) {
        var phys = shortSide >= 500 ? shortSide : layoutW;
        if (phys >= 460) {
          var scale = phys / TARGET;
          meta.setAttribute('content', 'width=' + TARGET + ', initial-scale=' + scale.toFixed(4) + ', minimum-scale=0.25, maximum-scale=5, viewport-fit=cover');
          document.documentElement.setAttribute('data-mu-vp', 'fixed');
          var after = Math.max(window.innerWidth || 0, (document.documentElement && document.documentElement.clientWidth) || 0);
          if (after >= 500 && phone) {
            document.documentElement.style.zoom = String(TARGET / after);
            document.documentElement.setAttribute('data-mu-vp', 'zoom');
          }
        }
      } else if (layoutW > 0 && layoutW < 500) {
        try {
          document.documentElement.style.zoom = '';
          if (document.documentElement.getAttribute('data-mu-vp') === 'zoom') document.documentElement.removeAttribute('data-mu-vp');
        } catch (e2) {}
      }
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
