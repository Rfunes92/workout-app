/* Weekly plan generator: picks exercises whose equipment exists at each location. */
(function () {
  'use strict';
  const WO = window.WO;
  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const DAY_NAMES = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

  const GOALS = {
    fat_loss: { label: 'Weight loss', desc: 'Calorie-burning finishers, shorter rests, supersets' },
    sculpt: { label: 'Get sculpted', desc: 'Fat loss + hypertrophy for definition' },
    muscle: { label: 'Build muscle (size)', desc: 'More volume in the 6–12 rep range' },
    strength: { label: 'Strength', desc: 'Heavier main lifts, 4–6 reps, longer rests' },
    endurance: { label: 'Muscular endurance', desc: 'Higher reps, short rests' },
    fight: { label: 'Athletic conditioning', desc: 'Conditioning, core rotation, hips — for sport and everyday athletes' },
    mobility: { label: 'Mobility / joint health', desc: 'Extra mobility in warm-ups' },
    general: { label: 'General health', desc: 'Balanced, sustainable training' }
  };

  const TEMPLATES = {
    upper: { title: 'Upper Body', slots: ['*hpush', 'vpull', 'vpush', 'hpull', ['side_delt', 'rear_delt'], ['biceps', 'triceps'], 'core'] },
    upper2: { title: 'Upper Body B', slots: ['*vpull', 'incline', 'hpull', 'vpush', ['side_delt', 'rear_delt'], ['biceps', 'triceps'], 'core'] },
    lower: { title: 'Lower Body', slots: ['*quad', 'hinge', 'lunge', 'ham_iso', 'quad_iso', 'glute_acc', 'calves', 'core'] },
    lower2: { title: 'Lower Body B (glute/hinge)', slots: ['*hinge', 'quad', 'glute', 'lunge', 'ham_iso', 'calves', 'core'] },
    full: { title: 'Full Body (upper focus + glutes)', slots: ['*incline', 'hpull', 'glute', 'vpush', ['side_delt', 'rear_delt'], ['biceps', 'triceps'], 'carry', 'core'] },
    fullA: { title: 'Full Body A', slots: ['*quad', 'hpush', 'hpull', 'hinge', 'vpush', ['biceps', 'triceps'], 'core'] },
    fullB: { title: 'Full Body B (sculpt)', slots: ['lunge', 'vpull', 'glute', 'hpush', ['side_delt', 'rear_delt'], ['biceps', 'triceps'], 'core'] },
    push: { title: 'Push (chest/shoulders/triceps)', slots: ['*hpush', 'vpush', 'incline', 'fly', 'side_delt', 'triceps', 'core'] },
    pull: { title: 'Pull (back/biceps)', slots: ['*vpull', 'hpull', 'hpull', 'rear_delt', 'biceps', 'biceps', 'core'] },
    legs: { title: 'Legs & Glutes', slots: ['*quad', 'hinge', 'lunge', 'glute', 'ham_iso', 'calves', 'core'] }
  };
  const FOCUS_OPTIONS = [['auto', 'Auto'], ['upper', 'Upper'], ['lower', 'Lower'], ['full', 'Full (upper+glutes)'], ['fullA', 'Full body A'], ['fullB', 'Full body B'], ['push', 'Push'], ['pull', 'Pull'], ['legs', 'Legs']];
  const AUTO_GYM = { 1: ['fullA'], 2: ['fullA', 'fullB'], 3: ['upper', 'lower', 'full'], 4: ['upper', 'lower', 'upper2', 'lower2'], 5: ['push', 'pull', 'legs', 'upper', 'lower'], 6: ['push', 'pull', 'legs', 'push', 'pull', 'legs'], 7: ['push', 'pull', 'legs', 'upper', 'lower', 'fullA', 'fullB'] };
  const FALLBACK = { ham_iso: ['hinge'], vpull: ['hpull'], hpull: ['rear_delt'], incline: ['hpush'], fly: ['hpush'], glute: ['hinge'], glute_acc: ['glute'], quad_iso: [], carry: [], lunge: ['quad'], hinge: ['glute'] };
  const LENGTH_MAX = { 30: 4, 45: 6, 60: 9, 75: 10, 90: 11 };
  const ISO_SLOTS = ['side_delt', 'rear_delt', 'biceps', 'triceps', 'calves', 'ham_iso', 'quad_iso', 'glute_acc', 'fly'];

  // Quiz limitations → exercises the plan avoids (swaps can still pick them on purpose).
  const LIMIT_BLOCK = {
    flat_back: ['bb_bench', 'db_bench', 'db_fly', 'skull_crusher', 'dead_bug', 'glute_bridge', 'banded_glute_bridge', 'ball_leg_curl'],
    squat_back: ['bb_back_squat', 'front_squat', 'smith_squat', 'hack_squat', 'deep_squat_hold'],
    knees: ['jump_rope', 'jumping_jack', 'burpee', 'box_jump'],
    shoulders: ['bb_ohp', 'arnold_press', 'band_dislocates']
  };
  // When a limitation blocks a fixed-list item, swap in a safer move instead of leaving a gap (first one that fits wins).
  const LIMIT_FALLBACK = { dead_bug: ['bird_dog', 'pallof_press'], glute_bridge: ['bird_dog'], banded_glute_bridge: ['bird_dog'] };
  let curBlocked = new Set();
  function blockedFor(state) {
    const s = new Set();
    ((state.profile && state.profile.limitations) || []).forEach(k => (LIMIT_BLOCK[k] || []).forEach(id => s.add(id)));
    return s;
  }
  const limOk = id => !curBlocked.has(id);
  function safeId(id, set) {
    if (limOk(id)) return id;
    return (LIMIT_FALLBACK[id] || []).find(f => WO.EX_BY_ID[f] && limOk(f) && (!set || canDo(WO.EX_BY_ID[f], set))) || null;
  }

  function equipSet(state, loc) {
    const l = state.locations[loc] || { equip: [] };
    const s = new Set(l.equip);
    (state.custom[loc] || []).forEach(c => { if (c.as) s.add(c.as); });
    return s;
  }
  function canDo(ex, set) { return ex.req.every(r => r.split('|').some(o => set.has(o))); }
  function available(set) { return WO.EXERCISES.filter(e => canDo(e, set)); }

  function candidates(slot, set) { return WO.EXERCISES.filter(e => e.slots.includes(slot) && canDo(e, set) && limOk(e.id)); }
  function pick(slot, set, weekUsed, sessUsed) {
    const tries = [slot].concat(FALLBACK[slot] || []);
    for (const s of tries) {
      const isoSlot = ISO_SLOTS.includes(s);
      const score = e => (e.slots[0] === s ? 0 : 4) + (isoSlot && e.kind !== 'iso' ? 2 : 0) + (e.req.length === 0 ? 1 : 0);
      const c = candidates(s, set).filter(e => !sessUsed.has(e.id)).map((e, i) => ({ e, sc: score(e) + i / 1000 })).sort((a, b) => a.sc - b.sc);
      if (!c.length) continue;
      const best = c[0].sc;
      const fresh = c.find(x => !weekUsed.has(x.e.id) && x.sc <= best + 1.5);
      return { ex: (fresh || c[0]).e, slot: s };
    }
    return null;
  }

  function blockWeek(state, date) {
    const start = new Date(state.startDate + 'T00:00:00');
    const diff = Math.floor((date - start) / (7 * 864e5));
    return ((diff % 4) + 4) % 4 + 1;
  }

  function presc(ex, isMain, goals, deload) {
    const g = k => goals.includes(k);
    let sets, reps, rest;
    if (ex.kind === 'mobility') return { sets: 1, reps: ex.unit === 'time' ? '45s' : '6–8/side', rest: 0 };
    if (ex.kind === 'core') {
      sets = 3; reps = ex.unit === 'time' ? (ex.id === 'side_plank' ? '30s/side' : '30–45s') : (ex.id === 'dead_bug' || ex.id === 'bird_dog' || ex.id === 'pallof_press' ? '8–10/side' : '10–15'); rest = 30;
    } else if (ex.id === 'farmer_carry') { sets = 3; reps = '40s walk'; rest = 60; }
    else if (isMain) {
      if (g('strength')) { sets = 4; reps = '5–6'; rest = 150; }
      else if (g('sculpt') || g('muscle')) { sets = 4; reps = '6–10'; rest = 120; }
      else if (g('endurance')) { sets = 3; reps = '12–15'; rest = 60; }
      else { sets = 3; reps = '8–12'; rest = 90; }
    } else if (ex.kind === 'compound') {
      sets = 3; reps = g('endurance') ? '12–15' : '8–12'; rest = g('fat_loss') ? 75 : 90;
      if (ex.slots.includes('lunge')) reps += '/leg';
    } else {
      sets = g('muscle') ? 4 : 3; reps = g('endurance') ? '15–20' : '12–15'; rest = g('fat_loss') ? 45 : 60;
      if (ex.id === 'band_lateral_walk') reps = '12–15/side';
    }
    if (deload) sets = Math.max(2, sets - 1);
    return { sets, reps, rest };
  }

  const FINISHERS = {
    gym: ['treadmill_incline', 'bike_sprint', 'rower_intervals', 'stairmaster', 'kb_swing', 'jump_rope'],
    home: ['kb_swing', 'jump_rope', 'burpee', 'mountain_climber', 'jumping_jack', 'shadowbox']
  };
  function finisherText(id, fat) {
    const long = fat ? 12 : 8;
    const t = {
      treadmill_incline: `${long} min: 1 min fast incline walk (10–12%, ~3.2–3.6 mph) / 1 min easy`,
      bike_sprint: `${fat ? 10 : 6} rounds: 20s all-out / 40s easy spin`,
      rower_intervals: `${fat ? 8 : 5} rounds: 250 m hard / 60s easy`,
      stairmaster: `${long} min: 1 min fast / 1 min moderate`,
      kb_swing: `EMOM ${fat ? 10 : 6} min: 15 swings at the top of each minute`,
      jump_rope: `${fat ? 8 : 5} rounds: 1 min fast / 30s rest`,
      burpee: `${fat ? 8 : 5} rounds: 30s on / 30s off`,
      mountain_climber: `${fat ? 8 : 5} rounds: 30s on / 30s off`,
      jumping_jack: `${fat ? 8 : 5} rounds: 40s on / 20s off`,
      shadowbox: `${fat ? 4 : 3} × 2 min rounds, 1 min rest`
    };
    return t[id] || `${long} min intervals`;
  }

  function buildSession(state, day, focus, weekUsed, finIdx, date) {
    const sch = state.schedule[day];
    const goals = state.goals.length ? state.goals : ['general'];
    const fat = goals.includes('fat_loss') || goals.includes('sculpt');
    const deload = blockWeek(state, date || new Date()) === 4;
    const sess = { day, type: sch.type, time: sch.time, items: [], warmup: [], cooldown: [], notes: [], deload };
    const mk = (ex, p, extra) => Object.assign({ exId: ex.id, sets: p.sets, reps: p.reps, rest: p.rest }, extra || {});

    if (sch.type === 'rest' || sch.type === 'off') {
      const set = equipSet(state, 'home');
      sess.loc = 'home'; sess.title = sch.type === 'off' ? 'Day off' : 'Active Recovery';
      sess.locName = 'Anywhere';
      if (sch.type === 'off') { sess.notes.push('Full rest. Hit your step goal and protein target.'); return sess; }
      sess.items.push(mk(WO.EX_BY_ID.incline_walk, { sets: 1, reps: '30–45 min easy (Zone 2)', rest: 0 }, { key: 'walk' }));
      ['cat_cow', 'worlds_greatest', 'hip_9090', 'open_book', 'couch_stretch', 'foam_roll'].forEach(id => {
        const sid = safeId(id, set); const ex = sid && WO.EX_BY_ID[sid]; if (ex && canDo(ex, set)) sess.items.push(mk(ex, presc(ex, false, goals), { key: sid }));
      });
      sess.notes.push('Recovery day: easy movement only. Should feel better after than before.');
      sess.minutes = 45;
      return sess;
    }
    if (sch.type === 'muaythai') {
      const set = equipSet(state, 'muaythai'); equipSet(state, 'home').forEach(i => set.add(i));
      sess.loc = 'muaythai'; sess.locName = state.locations.muaythai.name; sess.title = 'Muay Thai + Mobility';
      sess.notes.push('Class is your main workout today. Do this light complement before/after — no heavy lifting.');
      ['worlds_greatest', 'hip_9090', 'ankle_rocks', 'open_book', 'band_pull_apart'].forEach(id => {
        const ex = WO.EX_BY_ID[id]; if (ex && canDo(ex, set) && limOk(id)) sess.warmup.push(mk(ex, presc(ex, false, goals), { key: 'w-' + id }));
      });
      [['dead_bug', { sets: 2, reps: '8/side', rest: 30 }], ['side_plank', { sets: 2, reps: '20–30s/side', rest: 30 }], ['couch_stretch', { sets: 1, reps: '45s/side', rest: 0 }]]
        .map(([id, p]) => [safeId(id, set), p, id]).filter(([id]) => id).forEach(([id, p, orig]) => {
          sess.items.push(mk(WO.EX_BY_ID[id], p, { key: id, note: id === orig ? 'Post-class' : 'Post-class · back-friendly swap' }));
        });
      sess.minutes = 15;
      return sess;
    }

    const loc = sch.type === 'gym' ? 'gym' : 'home';
    const set = equipSet(state, loc);
    const tpl = TEMPLATES[focus] || TEMPLATES.fullA;
    sess.loc = loc; sess.locName = state.locations[loc].name; sess.focus = focus;
    sess.title = tpl.title;
    const sessUsed = new Set();
    const maxLifts = LENGTH_MAX[state.profile.sessionLength] || 7;
    let slots = tpl.slots.slice();
    // trim from the end but keep a core slot
    const size = () => slots.reduce((a, x) => a + (Array.isArray(x) ? 2 : 1), 0);
    while (size() > maxLifts) {
      let idx = -1;
      for (let i = slots.length - 1; i >= 0; i--) { if (slots[i] !== 'core') { idx = i; break; } }
      if (idx < 0) break;
      if (Array.isArray(slots[idx]) && size() - 1 <= maxLifts) slots[idx] = slots[idx][0]; else slots.splice(idx, 1);
    }
    let groupN = 0;
    slots.forEach((entry, i) => {
      const group = Array.isArray(entry) ? entry : [entry];
      const picked = [];
      group.forEach((raw, j) => {
        const isMain = raw.startsWith('*'); const slot = raw.replace('*', '');
        const key = `${i}${j ? '.' + j : ''}-${slot}`;
        let ex = null;
        const sw = state.swaps[`${day}:${key}`];
        if (sw && WO.EX_BY_ID[sw] && canDo(WO.EX_BY_ID[sw], set)) ex = WO.EX_BY_ID[sw];
        let usedSlot = slot;
        if (!ex) { const r = pick(slot, set, weekUsed, sessUsed); if (r) { ex = r.ex; usedSlot = r.slot; } }
        if (!ex) return;
        sessUsed.add(ex.id); weekUsed.add(ex.id);
        picked.push(mk(ex, presc(ex, isMain, goals, deload), { key, slot: usedSlot, main: isMain }));
      });
      if (picked.length === 2) {
        const letter = String.fromCharCode(65 + groupN++);
        picked[0].group = letter + '1'; picked[1].group = letter + '2';
        picked[0].restAfter = picked[0].rest; picked[0].rest = 15;
      }
      sess.items.push(...picked);
    });

    // warm-up
    const isLower = /lower|legs|fullA/.test(focus);
    const wu = isLower ? ['worlds_greatest', 'hip_9090', 'deep_squat_hold'] : ['band_dislocates', 'band_pull_apart', 'open_book', 'cat_cow'];
    const cardioWU = loc === 'gym' ? 'bike or treadmill' : 'jumping jacks / jump rope';
    sess.warmupText = `5 min easy ${cardioWU}, then the mobility below, then 1–2 lighter ramp-up sets of your first lift.`;
    wu.filter(id => canDo(WO.EX_BY_ID[id], set) && limOk(id)).slice(0, goals.includes('mobility') ? 3 : 2).forEach(id => {
      const ex = WO.EX_BY_ID[id]; sess.warmup.push(mk(ex, presc(ex, false, goals), { key: 'w-' + id }));
    });

    // finisher
    const fins = FINISHERS[loc].filter(id => WO.EX_BY_ID[id] && canDo(WO.EX_BY_ID[id], set) && !sessUsed.has(id) && limOk(id));
    if (fins.length) {
      const fid = state.swaps[`${day}:fin`] && canDo(WO.EX_BY_ID[state.swaps[`${day}:fin`]], set) ? state.swaps[`${day}:fin`] : fins[finIdx % fins.length];
      sess.finisher = { exId: fid, key: 'fin', sets: 1, reps: finisherText(fid, fat), rest: 0, slot: 'cardio' };
    }
    sess.cooldown = ['couch_stretch', 'open_book'].map(id => mk(WO.EX_BY_ID[id], presc(WO.EX_BY_ID[id], false, goals), { key: 'c-' + id }));

    // duration estimate
    let sec = 7 * 60;
    sess.items.forEach(it => { sec += it.sets * (35 + it.rest); });
    if (sess.finisher) sec += (fat ? 12 : 8) * 60;
    sess.minutes = Math.round(sec / 300) * 5;
    if (curBlocked.size) sess.notes.push('Built around your limits from the quiz — skipped moves you flagged. Swap is still there if you feel good.');
    if (deload) sess.notes.push('Deload week: drop 1 set and use ~10% lighter weights. Leave 3–4 reps in the tank.');
    else sess.notes.push('Work sets: stop 1–2 reps short of failure (RIR 1–2). Last set of isolation moves can go to failure.');
    return sess;
  }

  function buildWeek(state, date) {
    const gymDays = DAYS.filter(d => state.schedule[d].type === 'gym');
    const homeDays = DAYS.filter(d => state.schedule[d].type === 'home');
    const focus = {};
    const ag = AUTO_GYM[Math.min(7, gymDays.length)] || [];
    gymDays.forEach((d, i) => { focus[d] = ag[i]; });
    const ah = gymDays.length >= 2 ? ['fullA', 'fullB', 'fullA', 'fullB', 'fullA', 'fullB', 'fullA'] : (AUTO_GYM[Math.min(7, homeDays.length)] || []);
    homeDays.forEach((d, i) => { focus[d] = ah[i]; });
    DAYS.forEach(d => { const f = state.schedule[d].focus; if (f && f !== 'auto') focus[d] = f; });
    curBlocked = blockedFor(state);
    const weekUsed = new Set(); const week = {};
    let gi = 0, hi = 0;
    DAYS.forEach(d => {
      const t = state.schedule[d].type;
      const idx = t === 'gym' ? gi++ : t === 'home' ? hi++ : 0;
      week[d] = buildSession(state, d, focus[d], weekUsed, idx, date);
    });
    return week;
  }

  function swapOptions(state, sess, item) {
    const set = equipSet(state, sess.loc);
    const slot = item.slot;
    const ex = WO.EX_BY_ID[item.exId];
    const list = WO.EXERCISES.filter(e => e.id !== ex.id && canDo(e, set) && (e.slots.includes(slot) || (slot !== 'cardio' && e.primary.some(m => ex.primary.includes(m)) && e.kind !== 'mobility' && e.kind !== 'cardio')));
    list.sort((a, b) => (b.slots.includes(slot) - a.slots.includes(slot)));
    return list;
  }

  const OVERLOAD = [
    'Double progression: start each lift at a weight you can do for the BOTTOM of the rep range with good form.',
    'Each session, try to add a rep or two. When you hit the TOP of the range on every set (with 1–2 reps in reserve), increase the weight next time: +2.5–5 lb for upper body, +5–10 lb for lower body.',
    'Bodyweight / band moves: add reps, slow the lowering to 3 seconds, add a pause, or move to a harder variation or band.',
    'Log your weights in the app — the goal is to beat last week by a rep or a little weight.',
    'Weeks 1–3 build; week 4 is a deload (fewer sets, lighter). Then repeat the block slightly heavier.'
  ];
  const FAT_LOSS_TIPS = [
    'Fat loss comes mostly from a modest calorie deficit (~300–500 kcal/day). Training keeps the muscle that makes you look sculpted.',
    'Protein: roughly 0.7–1 g per lb of goal bodyweight daily.',
    'Steps: aim for 8–10k per day — the easiest extra fat-burn there is.',
    'Sleep 7+ hours; 5 am sessions mean an early night the evening before.'
  ];

  Object.assign(WO, { LIMIT_BLOCK, DAYS, DAY_NAMES, GOALS, TEMPLATES, FOCUS_OPTIONS, equipSet, canDo, available, buildWeek, swapOptions, blockWeek, OVERLOAD, FAT_LOSS_TIPS, candidates });
})();
