/* Feature flags: local beta unlock + optional app-wide gates (Admin → Firestore config/features). */
(function () {
  'use strict';
  const WO = window.WO;
  const LS = window.localStorage;
  const KEY = () => WO.ns('ronnieFlags.v1');
  const BETA_KEY = () => WO.ns('ronnieFlags.beta');

  // Catalog: unfinished / gated work. Admin can set each to off | beta | on.
  const CATALOG = {
    latino_food: {
      label: 'Flavor-forward food',
      desc: 'Recipes & searches built around real home cooking and comfort food — Phase 2 food work. (Flag key kept for config compatibility.)',
      default: 'off'
    },
    weekly_checkin: {
      label: 'Weekly coach check-in',
      desc: 'Sunday reflection + weight/energy prompt. Not built yet.',
      default: 'off'
    },
    form_score: {
      label: 'Form score hints',
      desc: 'Posture cues scored after mannequin demos. Experimental.',
      default: 'off'
    },
    desktop_shell: {
      label: 'Desktop shell (beyond Admin)',
      desc: 'Wide layouts for Today / Week / Food. Admin already has its own desktop layout.',
      default: 'beta'
    },
    wearables: {
      label: 'Wearables sync',
      desc: 'Watch / HR import. Placeholder gate.',
      default: 'off'
    }
  };

  let globalMode = {}; // key → 'off'|'beta'|'on'
  let loadedCloud = false;

  function readLocal() {
    try { return JSON.parse(LS.getItem(KEY())) || {}; } catch (e) { return {}; }
  }
  function writeLocal(obj) {
    try { LS.setItem(KEY(), JSON.stringify(obj)); } catch (e) { /* ignore */ }
  }

  function getBeta() {
    try { return LS.getItem(BETA_KEY()) === '1'; } catch (e) { return false; }
  }
  function setBeta(on) {
    try {
      if (on) LS.setItem(BETA_KEY(), '1');
      else LS.removeItem(BETA_KEY());
    } catch (e) { /* ignore */ }
    if (WO.onFlagsChange) try { WO.onFlagsChange(); } catch (e) { /* ignore */ }
  }

  function modeOf(key) {
    if (globalMode[key]) return globalMode[key];
    const loc = readLocal()[key];
    if (loc) return loc;
    return (CATALOG[key] && CATALOG[key].default) || 'off';
  }

  function isOn(key) {
    const m = modeOf(key);
    if (m === 'on') return true;
    if (m === 'beta') return getBeta();
    return false;
  }

  function setLocalMode(key, mode) {
    if (!CATALOG[key]) return;
    const o = readLocal();
    o[key] = mode;
    writeLocal(o);
  }

  function applyCloud(flags) {
    if (!flags || typeof flags !== 'object') return;
    globalMode = Object.assign({}, flags);
    loadedCloud = true;
    // Cache last-seen global modes so a cold guest session still respects last admin publish
    const o = readLocal();
    Object.keys(CATALOG).forEach(k => { if (flags[k]) o[k] = flags[k]; });
    writeLocal(o);
    if (WO.onFlagsChange) try { WO.onFlagsChange(); } catch (e) { /* ignore */ }
  }

  function snapshot() {
    const out = {};
    Object.keys(CATALOG).forEach(k => { out[k] = modeOf(k); });
    return out;
  }

  WO.flags = {
    CATALOG,
    isOn,
    getBeta,
    setBeta,
    modeOf,
    setLocalMode,
    applyCloud,
    snapshot,
    loadedCloud: () => loadedCloud,
    // Admin will call this after a successful Firestore write
    setGlobalModes(flags) { applyCloud(flags); }
  };
})();
