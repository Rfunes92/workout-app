/* App shell: state, routing, views, rest timer. */
(function () {
  'use strict';
  const WO = window.WO;
  const KEY = WO.ns('ronnieWorkout.v1');
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dayKeyOf = d => WO.DAYS[(d.getDay() + 6) % 7];
  function mondayOf(d) { const m = new Date(d.getFullYear(), d.getMonth(), d.getDate()); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m; }
  function dateForDay(day) { const m = mondayOf(new Date()); m.setDate(m.getDate() + WO.DAYS.indexOf(day)); return m; }
  const LOC_TYPES = [['gym', 'LA Fitness'], ['muaythai', 'Muay Thai'], ['home', 'Home gym'], ['rest', 'Rest / active recovery'], ['off', 'Day off']];

  function defaults() {
    return {
      v: 1,
      setupDone: false,
      profile: { name: 'Ronnie', units: 'lb', sessionLength: 60 },
      goals: ['fat_loss', 'sculpt'],
      locations: {
        gym: { name: 'LA Fitness', equip: WO.PRESETS.gym.items.slice() },
        home: { name: 'Home gym', equip: WO.PRESETS.home.items.slice() },
        muaythai: { name: 'Muay Thai', equip: WO.PRESETS.muaythai.items.slice() }
      },
      custom: { gym: [], home: [], muaythai: [] },
      schedule: defaultSchedule(),
      swaps: {}, done: {}, log: {},
      startDate: iso(mondayOf(new Date()))
    };
  }
  function defaultSchedule() {
    return {
      mon: { type: 'gym', time: '05:00', focus: 'auto' }, tue: { type: 'muaythai', time: '18:00', focus: 'auto' },
      wed: { type: 'rest', time: '', focus: 'auto' }, thu: { type: 'gym', time: '09:30', focus: 'auto' },
      fri: { type: 'gym', time: '05:00', focus: 'auto' }, sat: { type: 'home', time: '', focus: 'auto' }, sun: { type: 'home', time: '', focus: 'auto' }
    };
  }
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
    const d = defaults();
    if (!s || s.v !== 1) return d;
    // shallow-merge to survive future additions
    const out = Object.assign(d, s);
    out.profile = Object.assign(defaults().profile, s.profile);
    ['gym', 'home', 'muaythai'].forEach(k => { out.locations[k] = Object.assign(defaults().locations[k], (s.locations || {})[k]); out.custom[k] = (s.custom || {})[k] || []; });
    WO.DAYS.forEach(k => { out.schedule[k] = Object.assign({ type: 'rest', time: '', focus: 'auto' }, (s.schedule || {})[k]); });
    return out;
  }
  let state = load();
  function save() {
    // prune done-logs older than 21 days
    const cutoff = iso(new Date(Date.now() - 21 * 864e5));
    Object.keys(state.done).forEach(k => { if (k < cutoff) delete state.done[k]; });
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('save failed', e); }
    week = null;
  }
  let week = null;
  const getWeek = () => (week = week || WO.buildWeek(state, new Date()));

  // ---------- helpers ----------
  const fmtTime = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'pm' : 'am'; return `${((h + 11) % 12) + 1}:${pad(m)}${ap}`; };
  const fmtRest = s => s >= 60 ? `${Math.floor(s / 60)}:${pad(s % 60)}` : `${s}s`;
  const locLabel = t => t === 'gym' ? state.locations.gym.name : t === 'home' ? state.locations.home.name : t === 'muaythai' ? state.locations.muaythai.name : t === 'rest' ? 'Active recovery' : 'Off';
  const muscleChips = ex => ex.primary.map(m => `<span class="chip pri">${WO.MUSCLES[m]}</span>`).join('') + ex.secondary.map(m => `<span class="chip sec">${WO.MUSCLES[m]}</span>`).join('');
  function demoThumb(ex) { return `<div class="ex-thumb" data-open="${ex.id}" data-demo="${ex.id}"></div>`; }
  function mountDemos(root) { $$('[data-demo]', root).forEach(el => WO.mountDemo(el, WO.EX_BY_ID[el.dataset.demo])); }
  const ytLink = ex => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(ex.name + ' form');
  const doneKey = (day, key) => `${day}:${key}`;
  function getDone(day, key, n) {
    const d = state.done[iso(dateForDay(day))] || {};
    const arr = d[doneKey(day, key)] || [];
    return Array.from({ length: n }, (_, i) => !!arr[i]);
  }
  function setDone(day, key, arr) {
    const k = iso(dateForDay(day));
    state.done[k] = state.done[k] || {};
    state.done[k][doneKey(day, key)] = arr;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  // ---------- views ----------
  function setTop(title, meta) { $('#topTitle').textContent = title; $('#topMeta').innerHTML = meta || ''; }

  function dayStrip(sel) {
    const today = dayKeyOf(new Date());
    return `<div class="daystrip">${WO.DAYS.map(d => {
      const t = state.schedule[d].type; const dt = dateForDay(d);
      return `<a href="#day/${d}" class="${d === sel ? 'sel' : ''} ${d === today ? 'today' : ''}">${WO.DAY_NAMES[d].slice(0, 3)}<b>${dt.getDate()}</b><i class="${t === 'off' ? 'rest' : t}"></i></a>`;
    }).join('')}</div>`;
  }

  function itemCard(day, it, opts) {
    const ex = WO.EX_BY_ID[it.exId];
    const done = getDone(day, it.key, it.sets);
    const all = done.every(Boolean);
    const last = state.log[ex.id];
    const showWt = ex.kind !== 'mobility' && ex.kind !== 'cardio' && !(opts && opts.noWeight);
    const rest = it.restAfter != null ? `rest ${fmtRest(it.restAfter)} after ${it.group.replace('1', '2')}` : it.rest ? `rest ${fmtRest(it.rest)}` : '';
    const presc = it.group && it.group.endsWith('1') ? `<b>${it.sets} × ${esc(it.reps)}</b> · then straight to ${it.group[0]}2` : `<b>${it.sets > 1 || ex.kind !== 'cardio' ? it.sets + ' × ' : ''}${esc(it.reps)}</b>${rest && !(it.group && it.group.endsWith('1')) ? ' · ' + rest : ''}`;
    return `<div class="ex ${all ? 'done' : ''} ${it.group ? 'superset' : ''}" data-key="${it.key}">
      <div class="ex-top">${demoThumb(ex)}
        <div class="grow"><div class="ex-name" data-open="${ex.id}" data-ctx="${day}|${it.key}">${it.group ? `<span class="grp">${it.group}</span>` : ''}${esc(ex.name)}</div>
        <div class="ex-presc">${presc}${it.note ? ` · <span class="muted">${esc(it.note)}</span>` : ''}</div>
        <div class="chips" style="margin-top:6px">${ex.primary.slice(0, 2).map(m => `<span class="chip pri" style="padding:2px 8px;font-size:11px">${WO.MUSCLES[m]}</span>`).join('')}</div></div>
      </div>
      <div class="sets">${done.map((v, i) => `<button class="set ${v ? 'on' : ''}" data-set="${i}" data-day="${day}" data-key="${it.key}" data-rest="${it.rest}" aria-label="Set ${i + 1}">${v ? '✓' : i + 1}</button>`).join('')}</div>
      <div class="ex-actions">
        ${showWt ? `<label class="wt"><input type="number" inputmode="decimal" step="0.5" placeholder="${last ? esc(last.w) : '—'}" value="" data-wt="${ex.id}" aria-label="Weight"><span>${state.profile.units}${last ? ` · last ${esc(last.w)}` : ''}</span></label>` : ''}
        <button class="btn sm ghost" data-open="${ex.id}" data-ctx="${day}|${it.key}">Details</button>
        ${opts && opts.noSwap ? '' : `<button class="btn sm ghost" data-swap="${day}|${it.key}">⇄ Swap</button>`}
      </div></div>`;
  }

  function compactRow(day, it) {
    const ex = WO.EX_BY_ID[it.exId]; const v = getDone(day, it.key, 1)[0];
    return `<div class="wu-row"><div class="ex-thumb" data-open="${ex.id}" data-demo="${ex.id}" style="width:44px;height:44px;flex-basis:44px"></div>
      <div class="grow" data-open="${ex.id}" style="cursor:pointer"><b>${esc(ex.name)}</b><div class="small muted">${esc(it.reps)}</div></div>
      <button class="set ${v ? 'on' : ''}" data-set="0" data-day="${day}" data-key="${it.key}" data-rest="0" aria-label="Done">${v ? '✓' : ''}</button></div>`;
  }
  function renderDay(day) {
    const wk = getWeek(); const s = wk[day];
    const isToday = day === dayKeyOf(new Date());
    const dt = dateForDay(day);
    const bw = WO.blockWeek(state, dt);
    setTop(isToday ? 'Today' : WO.DAY_NAMES[day], `${dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}<br>Block wk ${bw}/4`);
    const allItems = [...s.warmup, ...s.items, ...(s.finisher ? [s.finisher] : []), ...(s.cooldown || [])];
    const totalSets = allItems.reduce((a, it) => a + it.sets, 0);
    const doneSets = allItems.reduce((a, it) => a + getDone(day, it.key, it.sets).filter(Boolean).length, 0);
    const pct = totalSets ? Math.round(doneSets / totalSets * 100) : 0;
    const t = s.type === 'off' ? 'rest' : s.type;
    const hello = isToday ? `${new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}, ${esc(state.profile.name || 'there')}` : WO.DAY_NAMES[day];
    let h = '';
    if (!state.setupDone) h += `<div class="banner"><div class="grow"><b>Set up your equipment & goals</b><div class="small muted">Using defaults: LA Fitness preset + basic home gym.</div></div><a class="btn sm" href="#setup">Setup</a></div>`;
    h += dayStrip(day);
    h += `<div class="hero ${t}"><div class="row between"><span class="tag">${esc(hello)}</span><span class="pill ${t}">${esc(locLabel(s.type))}${s.time ? ' · ' + fmtTime(s.time) : ''}</span></div>
      <h1 style="margin-top:6px">${esc(s.title)}</h1>
      <div class="stats"><div><b>${s.items.length + (s.finisher ? 1 : 0)}</b>exercises</div><div><b>~${s.minutes || 0}</b>min</div><div><b>${doneSets}/${totalSets}</b>sets</div></div>
      <div class="progress"><div style="width:${pct}%"></div></div></div>`;
    s.notes.forEach(n => { h += `<div class="note">${esc(n)}</div>`; });
    if (s.warmup.length) {
      h += `<div class="section-h"><h2>${s.type === 'muaythai' ? 'Pre-class mobility' : 'Warm-up'}</h2><span class="small muted">${s.type === 'muaythai' ? '~8 min' : '~6 min'}</span></div>`;
      if (s.warmupText) h += `<div class="small muted" style="margin:0 2px">${esc(s.warmupText)}</div>`;
      h += `<div class="card" style="padding:4px 12px">${s.warmup.map(it => compactRow(day, it)).join('')}</div>`;
    }
    if (s.items.length) {
      h += `<div class="section-h"><h2>${s.type === 'muaythai' ? 'After class (optional)' : s.type === 'rest' ? 'Recovery' : 'Workout'}</h2>${s.items.some(i => i.group) ? '<span class="small muted">A1/A2 = superset</span>' : ''}</div>`;
      s.items.forEach(it => { h += itemCard(day, it, { noSwap: s.type === 'rest' || s.type === 'muaythai' }); });
    }
    if (s.finisher) {
      h += `<div class="section-h"><h2>🔥 Fat-loss finisher</h2></div>`;
      h += itemCard(day, s.finisher, { noWeight: true });
    }
    if (s.cooldown && s.cooldown.length) {
      h += `<div class="section-h"><h2>Cool-down</h2><span class="small muted">~3 min</span></div><div class="card" style="padding:4px 12px">${s.cooldown.map(it => compactRow(day, it)).join('')}</div>`;
    }
    if (s.type === 'gym' || s.type === 'home') h += `<div class="card flat small"><b>Progressive overload</b><div class="muted" style="margin-top:4px">${esc(WO.OVERLOAD[1])}</div></div>`;
    if (!s.items.length && !s.warmup.length) h += `<div class="empty">Nothing scheduled. Enjoy the day off.</div>`;
    return h;
  }

  function renderWeek() {
    const wk = getWeek(); const today = dayKeyOf(new Date());
    const bw = WO.blockWeek(state, new Date());
    setTop('This week', `Block wk ${bw}/4${bw === 4 ? ' · deload' : ''}`);
    let h = `<h1 style="margin:6px 2px 4px">Weekly plan</h1><div class="small muted" style="margin:0 2px">Auto-generated from your schedule, goals and equipment. Change anything in Setup.</div>`;
    WO.DAYS.forEach(d => {
      const s = wk[d]; const t = s.type === 'off' ? 'rest' : s.type; const dt = dateForDay(d);
      const names = s.items.map(it => WO.EX_BY_ID[it.exId].name);
      h += `<a class="card weekday" href="#day/${d}" style="display:flex;color:inherit;${d === today ? 'border-color:var(--accent)' : ''}">
        <div class="dn"><span class="tag">${WO.DAY_NAMES[d].slice(0, 3)}</span><b>${dt.getDate()}</b></div>
        <div class="grow"><div class="row between"><h3>${esc(s.title)}</h3><span class="pill ${t}">${esc(locLabel(s.type))}</span></div>
        <div class="small muted" style="margin-top:2px">${s.time ? fmtTime(s.time) + ' · ' : ''}${s.minutes ? '~' + s.minutes + ' min · ' : ''}${esc(names.slice(0, 4).join(', '))}${names.length > 4 ? ` +${names.length - 4}` : ''}</div></div></a>`;
    });
    h += `<div class="card"><h2>📈 Progressive overload</h2><ul class="tips">${WO.OVERLOAD.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`;
    if (state.goals.includes('fat_loss') || state.goals.includes('sculpt')) h += `<div class="card"><h2>🔥 Fat-loss essentials</h2><ul class="tips">${WO.FAT_LOSS_TIPS.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`;
    return h;
  }

  let libFilter = { q: '', loc: 'all', muscle: '' };
  function renderLibrary() {
    setTop('Library', `${WO.EXERCISES.length} exercises`);
    const opts = [['all', 'All exercises'], ['gym', 'Available at ' + state.locations.gym.name], ['home', 'Available at ' + state.locations.home.name], ['muaythai', 'Available at ' + state.locations.muaythai.name]];
    let h = `<input type="search" id="libQ" placeholder="Search exercises…" value="${esc(libFilter.q)}" autocomplete="off">
      <div class="row" style="margin-top:8px"><select id="libLoc" class="grow">${opts.map(([v, l]) => `<option value="${v}" ${libFilter.loc === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
      <select id="libMus" class="grow"><option value="">All muscles</option>${Object.entries(WO.MUSCLES).map(([k, v]) => `<option value="${k}" ${libFilter.muscle === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div id="libList"></div>`;
    return h;
  }
  function renderLibList() {
    const q = libFilter.q.trim().toLowerCase();
    const set = libFilter.loc === 'all' ? null : WO.equipSet(state, libFilter.loc);
    const list = WO.EXERCISES.filter(e => (!q || e.name.toLowerCase().includes(q) || e.primary.some(m => WO.MUSCLES[m].toLowerCase().includes(q))) &&
      (!set || WO.canDo(e, set)) && (!libFilter.muscle || e.primary.includes(libFilter.muscle) || e.secondary.includes(libFilter.muscle)));
    const el = $('#libList'); if (!el) return;
    el.innerHTML = `<div class="small muted" style="margin:10px 2px">${list.length} shown</div><div class="card" style="padding:4px 12px">${list.map(e => `<div class="list-row" data-open="${e.id}"><div class="ex-thumb" data-demo="${e.id}" style="width:48px;height:48px;flex-basis:48px"></div><div class="grow"><b>${esc(e.name)}</b><div class="small muted">${e.primary.map(m => WO.MUSCLES[m]).join(', ')} · ${e.req.length ? esc(e.req.map(r => r.split('|').map(x => WO.EQUIPMENT[x].label).join(' / ')).join(' + ')) : 'Bodyweight'}</div></div><span class="muted">›</span></div>`).join('') || '<div class="empty">No matches</div>'}</div>`;
    mountDemos(el);
  }

  let setupLoc = 'gym';
  function renderSetup() {
    setTop('Setup', '');
    const st = state;
    let h = `<h1 style="margin:6px 2px">Setup</h1><div id="accountCard" class="card acct"><h2>Account</h2><div class="small muted">Loading account…</div></div>`;
    // profile
    h += `<div class="card"><h2>Profile</h2>
      <label class="f">Name</label><input type="text" id="pName" value="${esc(st.profile.name)}">
      <div class="row"><div class="grow"><label class="f">Session length (gym/home)</label><select id="pLen">${[30, 45, 60, 75, 90].map(m => `<option value="${m}" ${+st.profile.sessionLength === m ? 'selected' : ''}>${m} min</option>`).join('')}</select></div>
      <div style="width:110px"><label class="f">Units</label><select id="pUnits">${['lb', 'kg'].map(u => `<option ${st.profile.units === u ? 'selected' : ''}>${u}</option>`).join('')}</select></div></div></div>`;
    // appearance
    const th = WO.theme ? WO.theme.get() : 'dark';
    h += `<div class="card"><h2>Appearance</h2><div class="small muted" style="margin:2px 0 8px">System follows your phone's light/dark setting.</div>
      <div class="seg theme-seg" role="radiogroup" aria-label="Appearance">${[['light', '☀️ Light'], ['dark', '🌙 Dark'], ['system', '📱 System']].map(([k, l]) => `<button type="button" role="radio" aria-checked="${th === k}" class="${th === k ? 'on' : ''}" data-theme-set="${k}">${l}</button>`).join('')}</div></div>`;
    // goals
    h += `<div class="card"><h2>Goals</h2><div class="small muted">Pick as many as you like — they shape reps, rest and finishers.</div>${Object.entries(WO.GOALS).map(([k, g]) =>
      `<div class="goal eq ${st.goals.includes(k) ? 'on' : ''}" data-goal="${k}"><span class="box"></span><div><b>${g.label}</b><div class="small muted">${g.desc}</div></div></div>`).join('')}</div>`;
    // schedule
    h += `<div class="card"><div class="row between"><h2>Weekly schedule</h2><button class="btn sm ghost" id="schedReset">Reset</button></div>
      ${WO.DAYS.map(d => { const s = st.schedule[d]; const train = s.type === 'gym' || s.type === 'home'; return `<div class="sched-row"><div class="d">${WO.DAY_NAMES[d].slice(0, 3)}</div>
        <select data-sched="${d}" data-f="type">${LOC_TYPES.map(([v, l]) => `<option value="${v}" ${s.type === v ? 'selected' : ''}>${esc(v === 'gym' ? st.locations.gym.name : v === 'home' ? st.locations.home.name : v === 'muaythai' ? st.locations.muaythai.name : l)}</option>`).join('')}</select>
        <input type="time" data-sched="${d}" data-f="time" value="${esc(s.time)}">
        ${train ? `<select class="focus" data-sched="${d}" data-f="focus">${WO.FOCUS_OPTIONS.map(([v, l]) => `<option value="${v}" ${s.focus === v ? 'selected' : ''}>Focus: ${l}${v === 'auto' ? ' (' + WO.TEMPLATES[getAutoFocus(d)].title + ')' : ''}</option>`).join('')}</select>` : ''}</div>`; }).join('')}</div>`;
    // equipment
    const L = st.locations[setupLoc];
    const set = WO.equipSet(st, setupLoc);
    const n = WO.available(set).length;
    const presetBtns = setupLoc === 'gym' ? [['gym', 'LA Fitness preset']] : setupLoc === 'home' ? [['home', 'Home basics'], ['home_full', 'Full garage gym']] : [['muaythai', 'Muay Thai preset']];
    h += `<div class="card" id="equipCard"><h2>Equipment</h2><div class="small muted" style="margin-bottom:8px">Workouts only use exercises whose equipment is checked for that location.</div>
      <div class="seg">${[['gym', st.locations.gym.name], ['home', st.locations.home.name], ['muaythai', st.locations.muaythai.name]].map(([k, l]) => `<button data-sloc="${k}" class="${setupLoc === k ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>
      <label class="f">Location name</label><input type="text" id="locName" value="${esc(L.name)}">
      <div class="row wrap" style="margin-top:10px">${presetBtns.map(([k, l]) => `<button class="btn sm" data-preset="${k}">${esc(l)}</button>`).join('')}<button class="btn sm ghost" data-preset="clear">Clear all</button><span class="small muted grow" style="text-align:right"><b style="color:var(--text)">${n}</b> exercises available</span></div>
      ${WO.EQUIPMENT_GROUPS.map(g => `<div class="eq-group"><div class="tag">${g.group}</div><div class="eq-grid">${g.items.map(([id, label]) => `<label class="eq ${L.equip.includes(id) ? 'on' : ''}" data-eq="${id}"><span class="box"></span>${esc(label)}</label>`).join('')}</div></div>`).join('')}
      <div class="eq-group"><div class="tag">Custom items</div>
        ${(st.custom[setupLoc] || []).map((c, i) => `<div class="custom-item"><span class="grow">${esc(c.name)}${c.as ? ` <span class="small muted">counts as ${esc(WO.EQUIPMENT[c.as].label)}</span>` : ' <span class="small muted">(note only)</span>'}</span><button class="close-x" style="width:28px;height:28px;flex-basis:28px;font-size:14px" data-delcustom="${i}" aria-label="Remove">✕</button></div>`).join('')}
        <input type="text" id="custName" placeholder="e.g. Landmine, sandbag, Bowflex…" style="margin-top:8px">
        <div class="row" style="margin-top:6px"><select id="custAs" class="grow"><option value="">Works like… (optional)</option>${WO.EQUIPMENT_GROUPS.map(g => `<optgroup label="${g.group}">${g.items.map(([id, l]) => `<option value="${id}">${esc(l)}</option>`).join('')}</optgroup>`).join('')}</select><button class="btn sm" id="custAdd">Add</button></div>
      </div></div>`;
    // data
    h += `<div class="card"><h2>Training block & data</h2><div class="small muted" style="margin-bottom:6px">Backup export/import includes workouts, food log, foods, recipes, weights, water and appearance.</div><div class="small muted">Current block week: ${WO.blockWeek(st, new Date())} of 4 (week 4 = deload). Started ${esc(st.startDate)}.</div>
      <div class="row wrap" style="margin-top:10px"><button class="btn sm ghost" id="blockReset">Restart block this week</button><button class="btn sm ghost" id="swapReset">Clear all swaps</button><button class="btn sm ghost" id="exportBtn">Export backup</button><label class="btn sm ghost">Import<input type="file" id="importFile" accept="application/json" hidden></label><button class="btn sm danger" id="wipe">Reset everything</button></div></div>`;
    h += `<a class="card row between" href="#food/goals" style="color:inherit"><div><h2>Nutrition goals</h2><div class="small muted">Calories, protein, carbs/fat split, fiber, water, USDA API key</div></div><span class="muted">›</span></a>`;
    h += `<button class="btn block" id="setupDone" style="margin:8px 0 20px">Save & see today's workout</button>`;
    return h;
  }
  function getAutoFocus(d) {
    const s = state.schedule[d]; const f = s.focus; s.focus = 'auto';
    const w = WO.buildWeek(state, new Date()); s.focus = f;
    return w[d].focus || 'fullA';
  }

  // ---------- exercise sheet ----------
  let sheetCtx = null;
  function openSheet(html) {
    $('#sheetBody').innerHTML = html; $('#sheet').classList.remove('hidden'); document.body.style.overflow = 'hidden';
    $('.sheet-panel').scrollTop = 0; mountDemos($('#sheetBody'));
  }
  function closeSheet() { (WO.sheetCloseHooks || []).slice().forEach(f => { try { f(); } catch (e) { console.warn(e); } }); $('#sheet').classList.add('hidden'); document.body.style.overflow = ''; $('#sheetBody').innerHTML = ''; sheetCtx = null; }
  function findItem(day, key) {
    const s = getWeek()[day];
    const it = [...s.warmup, ...s.items, ...(s.finisher ? [s.finisher] : []), ...(s.cooldown || [])].find(i => i.key === key);
    return { s, it };
  }
  function showExercise(id, ctx) {
    const ex = WO.EX_BY_ID[id]; if (!ex) return;
    sheetCtx = ctx || null;
    let item = null;
    if (ctx) { item = findItem(ctx.split('|')[0], ctx.split('|')[1]).it; }
    const reqTxt = ex.req.length ? ex.req.map(r => r.split('|').map(x => WO.EQUIPMENT[x].label).join(' or ')).join(' + ') : 'Bodyweight only';
    const whereOk = ['gym', 'home', 'muaythai'].filter(l => WO.canDo(ex, WO.equipSet(state, l))).map(l => state.locations[l].name);
    const tip = ex.kind === 'mobility' ? 'Move slowly and breathe; aim for a little more range each time.' : ex.kind === 'cardio' ? 'Progress by adding a round, a little speed/incline/resistance, or shortening the easy interval.' :
      ex.req.length === 0 || ex.req.every(r => r === 'bands') ? 'Progress: add reps, slow the lowering to 3s, add a pause, or use a harder variation/band.' :
      `Progress: when you hit the top of the rep range on all sets, add ${/quads|glutes|hamstrings/.test(ex.primary.join()) ? '5–10' : '2.5–5'} ${state.profile.units === 'kg' ? 'lb (~1–2.5 kg)' : 'lb'} next session.`;
    const html = `<div class="sheet-head"><div><div class="tag">${esc(ex.kind)}${item ? ' · ' + item.sets + ' × ' + esc(item.reps) : ''}</div><h1 style="font-size:23px;margin-top:4px">${esc(ex.name)}</h1></div><button class="close-x" data-close aria-label="Close">✕</button></div>
      <div class="demo" data-demo="${ex.id}"></div>
      <div class="row" style="gap:8px"><a class="btn ghost grow" href="${ytLink(ex)}" target="_blank" rel="noopener">▶ Watch demo (YouTube)</a>${ctx && item && item.slot ? `<button class="btn ghost" data-swap="${esc(ctx)}">⇄ Swap</button>` : ''}</div>
      <div class="section-h"><h2>Muscles worked</h2></div>
      ${WO.bodyMap(ex.primary, ex.secondary)}
      <div class="legend"><span><i style="background:var(--pri)"></i>Primary</span><span><i style="background:var(--sec);opacity:.6"></i>Secondary</span></div>
      <div class="chips">${muscleChips(ex)}</div>
      <div class="section-h"><h2>How to do it</h2></div>
      <ol class="cues">${ex.cues.map(c => `<li>${esc(c)}</li>`).join('')}</ol>
      <div class="note">${esc(tip)}</div>
      <div class="card flat small"><div><span class="tag">Equipment</span><div style="margin-top:3px">${esc(reqTxt)}</div></div>
      <div style="margin-top:8px"><span class="tag">Available at</span><div style="margin-top:3px">${whereOk.length ? esc(whereOk.join(', ')) : '<span class="muted">None of your locations yet</span>'}</div></div></div>`;
    openSheet(html);
  }
  function showSwap(ctx) {
    const [day, key] = ctx.split('|');
    const { s, it } = findItem(day, key); if (!it) return;
    const cur = WO.EX_BY_ID[it.exId];
    const opts = key === 'fin' ? WO.EXERCISES.filter(e => e.slots.includes('cardio') && e.id !== cur.id && WO.canDo(e, WO.equipSet(state, s.loc))) : WO.swapOptions(state, s, it);
    const html = `<div class="sheet-head"><div><div class="tag">Swap exercise · ${esc(s.locName)}</div><h1 style="font-size:21px;margin-top:4px">Replace ${esc(cur.name)}</h1></div><button class="close-x" data-close aria-label="Close">✕</button></div>
      <div class="small muted" style="margin:6px 0">Only exercises your ${esc(s.locName)} equipment supports. Same movement pattern first.</div>
      <div class="card" style="padding:4px 12px">${opts.map(e => `<div class="list-row" data-doswap="${e.id}"><div class="ex-thumb" data-demo="${e.id}" style="width:48px;height:48px;flex-basis:48px"></div><div class="grow"><b>${esc(e.name)}</b><div class="small muted">${e.primary.map(m => WO.MUSCLES[m]).join(', ')}</div></div><span class="pill">${e.slots.includes(it.slot) ? 'same pattern' : 'similar'}</span></div>`).join('') || '<div class="empty">No alternatives with this equipment.</div>'}</div>
      ${state.swaps[`${day}:${key}`] ? `<button class="btn ghost block" data-doswap="__reset">Reset to the plan's pick</button>` : ''}`;
    sheetCtx = ctx;
    openSheet(html);
  }

  // ---------- rest timer ----------
  const timer = { end: 0, total: 0, iv: null };
  let audio = null;
  function beep() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.25, 0.5].forEach(t => { const o = audio.createOscillator(), g = audio.createGain(); o.frequency.value = 880; o.connect(g); g.connect(audio.destination); g.gain.setValueAtTime(0.2, audio.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + t + 0.2); o.start(audio.currentTime + t); o.stop(audio.currentTime + t + 0.22); });
    } catch (e) { /* no audio */ }
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }
  function startRest(sec) {
    if (!sec) return;
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) { /* ignore */ }
    timer.total = sec; timer.end = Date.now() + sec * 1000;
    $('#restBar').classList.remove('hidden', 'ending');
    clearInterval(timer.iv); timer.iv = setInterval(tick, 250); tick();
  }
  function tick() {
    const left = Math.max(0, Math.round((timer.end - Date.now()) / 1000));
    $('#restTime').textContent = `${Math.floor(left / 60)}:${pad(left % 60)}`;
    $('#restRing').style.strokeDashoffset = String(97.4 * (1 - left / Math.max(1, timer.total)));
    $('#restBar').classList.toggle('ending', left <= 5);
    if (left <= 0) { clearInterval(timer.iv); beep(); $('#restTime').textContent = 'Go!'; setTimeout(() => { if (Date.now() >= timer.end) $('#restBar').classList.add('hidden'); }, 2500); }
  }

  // ---------- router ----------
  function route() {
    const hash = location.hash.replace(/^#/, '') || 'today';
    const [r, arg] = hash.split('/');
    const view = $('#view');
    let tab = r;
    if (r === 'ex') {
      if (!view.innerHTML.trim()) { view.innerHTML = renderDay(dayKeyOf(new Date())); mountDemos(view); tab = 'today'; }
      showExercise(arg); return;
    }
    closeSheet();
    if (WO.routes && WO.routes[r]) { const out = WO.routes[r](arg); view.innerHTML = out; $$('.tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === r)); mountDemos(view); if (WO.afterRoute && WO.afterRoute[r]) WO.afterRoute[r](arg); return; }
    if (r === 'week') view.innerHTML = renderWeek();
    else if (r === 'library') { view.innerHTML = renderLibrary(); renderLibList(); }
    else if (r === 'setup') view.innerHTML = renderSetup();
    else if (r === 'day' && WO.DAYS.includes(arg)) { view.innerHTML = renderDay(arg); tab = arg === dayKeyOf(new Date()) ? 'today' : 'week'; }
    else { view.innerHTML = renderDay(dayKeyOf(new Date())); tab = 'today'; }
    $$('.tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
    mountDemos(view);
  }
  let scrollY = 0;
  function rerender(keepScroll) { scrollY = window.scrollY; route(); if (keepScroll) window.scrollTo(0, scrollY); }

  // ---------- events ----------
  document.addEventListener('click', e => {
    const t = e.target;
    const close = t.closest('[data-close]'); if (close) { if (location.hash.startsWith('#ex/')) history.back(); else closeSheet(); return; }
    const setBtn = t.closest('[data-set]');
    if (setBtn) {
      const { day, key } = setBtn.dataset; const i = +setBtn.dataset.set;
      const { it } = findItem(day, key); if (!it) return;
      const arr = getDone(day, key, it.sets); arr[i] = !arr[i]; setDone(day, key, arr);
      if (arr[i]) startRest(+setBtn.dataset.rest || 0);
      rerender(true); return;
    }
    const sw = t.closest('[data-swap]'); if (sw) { showSwap(sw.dataset.swap); return; }
    const ds = t.closest('[data-doswap]');
    if (ds && sheetCtx) {
      const [day, key] = sheetCtx.split('|');
      if (ds.dataset.doswap === '__reset') delete state.swaps[`${day}:${key}`]; else state.swaps[`${day}:${key}`] = ds.dataset.doswap;
      save(); closeSheet(); if (location.hash.startsWith('#ex/')) history.back(); else rerender(true); return;
    }
    const op = t.closest('[data-open]'); if (op) { showExercise(op.dataset.open, op.dataset.ctx); return; }
    const rb = t.closest('[data-rest]');
    if (rb && rb.closest('#restBar')) {
      const v = rb.dataset.rest;
      if (v === 'skip') { clearInterval(timer.iv); $('#restBar').classList.add('hidden'); }
      else { timer.end += (+v) * 1000; timer.total = Math.max(timer.total, Math.round((timer.end - Date.now()) / 1000)); if (timer.end <= Date.now()) timer.end = Date.now() + 1000; clearInterval(timer.iv); timer.iv = setInterval(tick, 250); tick(); }
      return;
    }
    // setup interactions
    const ts = t.closest('[data-theme-set]');
    if (ts && WO.theme) { WO.theme.set(ts.dataset.themeSet); ts.parentElement.querySelectorAll('button').forEach(b => { const on = b === ts; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); }); return; }
    const g = t.closest('[data-goal]');
    if (g) { const k = g.dataset.goal; state.goals = state.goals.includes(k) ? state.goals.filter(x => x !== k) : state.goals.concat(k); save(); g.classList.toggle('on'); return; }
    const eq = t.closest('[data-eq]');
    if (eq) { e.preventDefault(); const L = state.locations[setupLoc]; const id = eq.dataset.eq; L.equip = L.equip.includes(id) ? L.equip.filter(x => x !== id) : L.equip.concat(id); save(); rerender(true); return; }
    const sl = t.closest('[data-sloc]'); if (sl) { setupLoc = sl.dataset.sloc; rerender(true); return; }
    const pr = t.closest('[data-preset]');
    if (pr) { const k = pr.dataset.preset; state.locations[setupLoc].equip = k === 'clear' ? [] : WO.PRESETS[k].items.slice(); save(); rerender(true); return; }
    const dc = t.closest('[data-delcustom]'); if (dc) { state.custom[setupLoc].splice(+dc.dataset.delcustom, 1); save(); rerender(true); return; }
    if (t.id === 'custAdd') { const n = $('#custName').value.trim(); if (!n) return; state.custom[setupLoc].push({ name: n, as: $('#custAs').value }); save(); rerender(true); return; }
    if (t.id === 'schedReset') { state.schedule = defaultSchedule(); save(); rerender(true); return; }
    if (t.id === 'blockReset') { state.startDate = iso(mondayOf(new Date())); save(); rerender(true); return; }
    if (t.id === 'swapReset') { state.swaps = {}; save(); rerender(true); return; }
    if (t.id === 'wipe') { if (confirm('Reset ALL data (workouts, food log, weights)?' + (WO.authUid ? ' This also clears the synced copy in your account.' : ''))) { localStorage.removeItem(KEY); if (WO.food) WO.food.reset(); if (WO.theme) WO.theme.set('dark'); state = defaults(); week = null; rerender(); } return; }
    if (t.id === 'exportBtn') { const b = new Blob([JSON.stringify(Object.assign({}, state, WO.food ? { food: WO.food.exportData() } : {}, WO.theme ? { theme: WO.theme.get() } : {}), null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'workout-backup.json'; a.click(); return; }
    if (t.id === 'setupDone') { state.setupDone = true; save(); location.hash = '#today'; return; }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.sched) { const s = state.schedule[t.dataset.sched]; s[t.dataset.f] = t.value; if (t.dataset.f === 'type' && !['gym', 'home'].includes(t.value)) s.focus = 'auto'; save(); rerender(true); return; }
    if (t.id === 'pName') { state.profile.name = t.value.trim(); save(); return; }
    if (t.id === 'pLen') { state.profile.sessionLength = +t.value; save(); rerender(true); return; }
    if (t.id === 'pUnits') { state.profile.units = t.value; save(); return; }
    if (t.id === 'locName') { state.locations[setupLoc].name = t.value.trim() || state.locations[setupLoc].name; save(); rerender(true); return; }
    if (t.dataset.wt) { const v = t.value.trim(); if (v) { state.log[t.dataset.wt] = { w: v, d: iso(new Date()) }; save(); t.placeholder = v; } return; }
    if (t.id === 'libLoc') { libFilter.loc = t.value; renderLibList(); return; }
    if (t.id === 'libMus') { libFilter.muscle = t.value; renderLibList(); return; }
    if (t.id === 'importFile' && t.files[0]) {
      t.files[0].text().then(txt => { const d = JSON.parse(txt); if (d && d.v === 1) { if (d.food && WO.food) WO.food.importData(d.food); delete d.food; if (d.theme && WO.theme) WO.theme.set(d.theme); delete d.theme; localStorage.setItem(KEY, JSON.stringify(d)); state = load(); week = null; rerender(); } else alert('Not a valid backup file.'); }).catch(() => alert('Could not read that file.'));
    }
  });
  document.addEventListener('input', e => { if (e.target.id === 'libQ') { libFilter.q = e.target.value; renderLibList(); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#sheet').classList.contains('hidden')) { if (location.hash.startsWith('#ex/')) history.back(); else closeSheet(); } });
  window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });

  // "Use without account" works even if the sign-in module can't load (offline first launch).
  document.addEventListener('click', e => {
    if (e.target.closest('#authGuest')) {
      if (WO.cloud && WO.cloud.handleGuest) return WO.cloud.handleGuest();
      try { localStorage.setItem('ronnieAuth.guest', '1'); } catch (err) { /* ignore */ }
      document.documentElement.classList.remove('needs-auth', 'auth-open');
    }
  });
  setTimeout(() => { const m = $('#authMsg'); if (!WO.cloud && m && document.documentElement.classList.contains('needs-auth')) { m.className = 'auth-msg err'; m.textContent = "Can't reach the sign-in service right now. You can use the app without an account and sign in later from Setup."; } }, 8000);
  WO.ui = { openSheet, closeSheet, setTop, esc, iso, mondayOf, rerender, route, getProfile: () => state.profile, mountDemos, reloadState: () => { state = load(); week = null; } };
  route();
})();
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* offline support optional */ }); });
}
