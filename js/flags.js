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
    },
    // v18 standout moves. ux:true = gradual UX rollout: Off/Beta/Live here, and anyone can drop back to the
    // old screens with Setup → Interface → Classic (per device) while a rollout is in progress.
    plan_first: { label: 'Plan before sign-up', desc: 'First launch goes straight to the quiz → full plan reveal with "why this" lines. Account is offered only after the plan is on screen.', default: 'on', ux: true },
    coach_mode: { label: 'Mannequin coach mode', desc: 'Pinned posture cues, mistake vs correct, slow-mo, front/back view, secondary muscles.', default: 'on', ux: true },
    session_player: { label: 'Guided session player', desc: 'Preview / start / skip / repeat sessions, timer bar, voice cues (mutable; beeps stay).', default: 'on', ux: true },
    auto_progress: { label: 'Auto-progression with a why', desc: 'Suggest next weight/reps from the last log, one-tap override.', default: 'on', ux: true },
    goal_charts: { label: 'Goal-type progress charts', desc: 'Strength = est. 1RM, Muscle = weekly volume, Lose fat = weight vs goal, Feel better = sessions/week.', default: 'on', ux: true }
  };

  // No-clutter promise. These are enforced in code, not toggles: Admin shows them as locked.
  const POLICY = {
    ads: false,                 // never: there is no ad code and no ad flag
    maxUpsellsPerScreen: 1,     // at most one account/upgrade prompt visible at a time
    interruptSession: false     // no prompts, nudges or re-renders while a guided session is running
  };
  const PROMISE = ['No ads. Ever.', 'At most one gentle prompt on a screen — never a wall of upsells.', 'Nothing interrupts a workout: no pop-ups, no nudges while a session is running.', 'Your plan is shown in full before we ever ask you to sign up. No paywall.'];
  let upsellShown = null; // id of the single upsell currently allowed on screen
  const CLASSIC_KEY = 'mountup.classicUx';
  function isClassic() { try { return LS.getItem(CLASSIC_KEY) === '1'; } catch (e) { return false; } }
  function setClassic(on) { try { if (on) LS.setItem(CLASSIC_KEY, '1'); else LS.removeItem(CLASSIC_KEY); } catch (e) { /* ignore */ } if (WO.onFlagsChange) try { WO.onFlagsChange(); } catch (e) { /* ignore */ } }
  const sessionActive = () => !!(WO.session && WO.session.active && WO.session.active());
  // Ask before showing an upsell (account / backup / upgrade prompt). Returns false while a session runs or
  // when another upsell already holds the one slot on this screen (slot frees on navigation).
  function canUpsell(id) {
    if (!POLICY.interruptSession && sessionActive()) return false;
    if (upsellShown && upsellShown !== id && document.querySelector('[data-upsell="' + upsellShown + '"]')) return false;
    upsellShown = id; return true;
  }

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
    if (CATALOG[key] && CATALOG[key].ux && isClassic()) return false;
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
    CATALOG, POLICY, PROMISE, canUpsell, isClassic, setClassic, sessionActive,
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
