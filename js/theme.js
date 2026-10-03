/* Appearance: Light / Dark / System. Loaded in <head> before the CSS so there's no flash of the wrong theme. */
(function () {
  const KEY = 'ronnieWorkout.theme';
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
  window.WO = window.WO || {};
  window.WO.theme = { get, set, apply, resolved, KEY };
  apply();
})();
