/* Food & macro tracker: log, search (Open Food Facts + USDA FDC), barcode scan, recipes, weight, weekly summary. */
(function () {
  'use strict';
  const WO = window.WO;
  const KEY = WO.ns('ronnieFood.v1');
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = s => new Date(s + 'T00:00:00');
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const todayIso = () => iso(new Date());
  const MEALS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner'], ['snacks', 'Snacks']];
  const MEAL_NAME = Object.fromEntries(MEALS);
  const NK = ['kcal', 'p', 'c', 'f', 'fiber', 'sugar', 'sodium'];
  const uid = p => p + ':' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const num = v => { if (v === null || v === undefined || v === '') return undefined; const n = +v; return isFinite(n) ? n : undefined; };
  const r1 = v => v == null ? '' : (Math.abs(v) >= 10 ? Math.round(v) : Math.round(v * 10) / 10);
  const kc = v => Math.round(v || 0).toLocaleString();
  const SEED = {}; (WO.SEED_FOODS || []).forEach(f => { SEED[f.id] = f; });
  const UNIVERSAL = WO.UNIVERSAL_SERVINGS || [{ label: '100 g', g: 100 }, { label: '1 g', g: 1 }];

  // ---------- state ----------
  function defaults() {
    return {
      v: 1,
      goals: { kcal: 2200, protein: 200, macroMode: 'auto', fatShare: 40, carbs: 210, fat: 62, fiberOn: true, fiber: 30, waterOn: true, water: 100, waterStep: 16, waterUnit: 'oz' },
      settings: { usdaKey: 'DEMO_KEY', off: true, usda: true },
      log: {}, foods: {}, recent: [], favorites: [], weights: {}
    };
  }
  function load() {
    let s = null; try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
    const d = defaults();
    if (!s || s.v !== 1) return d;
    return Object.assign(d, s, { goals: Object.assign(d.goals, s.goals), settings: Object.assign(d.settings, s.settings) });
  }
  let st = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { alert('Storage is full — export a backup and clear old data.'); } }

  function targets() {
    const g = st.goals;
    let carbs = g.carbs, fat = g.fat;
    if (g.macroMode === 'auto') {
      const rem = Math.max(0, g.kcal - g.protein * 4);
      fat = Math.round(rem * g.fatShare / 100 / 9);
      carbs = Math.round(rem * (100 - g.fatShare) / 100 / 4);
    }
    return { kcal: g.kcal, p: g.protein, c: carbs, f: fat, fiber: g.fiberOn ? g.fiber : null };
  }

  // ---------- nutrients ----------
  const zero = () => ({ kcal: 0, p: 0, c: 0, f: 0, fiber: 0, sugar: 0, sodium: 0 });
  function scale(n, k) { const o = {}; NK.forEach(x => { if (n && n[x] != null) o[x] = n[x] * k; }); return o; }
  function addN(a, b) { NK.forEach(x => { a[x] = (a[x] || 0) + (b && b[x] || 0); }); return a; }
  function servingN(food, s) { if (!s) return zero(); if (s.n) return s.n; if (food.per100 && s.g) return scale(food.per100, s.g / 100); return zero(); }
  function entryN(food, si, q) { return scale(servingN(food, food.servings[si] || food.servings[0]), q); }
  const tmpFoods = {};
  function getFood(id) { return id ? (SEED[id] || st.foods[id] || tmpFoods[id] || null) : null; }
  function persistFood(f) { if (f && f.id && f.source !== 'seed' && f.source !== 'entry' && !st.foods[f.id]) st.foods[f.id] = f; }

  function day(d) { return st.log[d] || { breakfast: [], lunch: [], dinner: [], snacks: [], water: 0 }; }
  function dayW(d) { if (!st.log[d]) st.log[d] = { breakfast: [], lunch: [], dinner: [], snacks: [], water: 0 }; return st.log[d]; }
  function mealTotal(list) { return list.reduce((a, e) => addN(a, e.n), zero()); }
  function dayTotal(d) { const L = day(d); return MEALS.reduce((a, [m]) => addN(a, mealTotal(L[m] || [])), zero()); }
  function dayHasFood(d) { const L = st.log[d]; return !!L && MEALS.some(([m]) => (L[m] || []).length); }

  function logEntry(date, meal, food, si, q) {
    persistFood(food);
    const s = food.servings[si] || food.servings[0];
    const e = { eid: uid('e'), fid: food.id, si, q, sl: s.label, name: food.name, brand: food.brand || '', n: entryN(food, si, q) };
    dayW(date)[meal].push(e);
    st.recent = [{ fid: food.id, si, q }].concat(st.recent.filter(r => r.fid !== food.id)).slice(0, 40);
    save();
    return e;
  }

  // ---------- APIs ----------
  async function fetchJSON(url, ms) {
    const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), ms || 15000);
    try {
      const r = await fetch(url, { signal: ac.signal });
      if (!r.ok) {
        let msg = ''; try { const j = await r.json(); msg = (j.error && (j.error.message || j.error.code)) || j.message || ''; } catch (e) { /* not json */ }
        const err = new Error(msg || 'HTTP ' + r.status); err.status = r.status; throw err;
      }
      return await r.json();
    } finally { clearTimeout(tm); }
  }
  const OFF_FIELDS = 'code,product_name,product_name_en,generic_name,brands,nutriments,serving_size,serving_quantity,quantity';
  function deEnt(t) { return String(t || '').replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (m, k) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' }[k])).replace(/&amp;/g, '&'); }
  function normOFF(p) {
    if (!p) return null;
    const nm = p.nutriments || {};
    let k = num(nm['energy-kcal_100g']);
    if (k == null && num(nm.energy_100g) != null) k = num(nm.energy_100g) / 4.184;
    const per100 = k != null ? { kcal: k, p: num(nm.proteins_100g) || 0, c: num(nm.carbohydrates_100g) || 0, f: num(nm.fat_100g) || 0, fiber: num(nm.fiber_100g), sugar: num(nm.sugars_100g), sodium: num(nm.sodium_100g) != null ? num(nm.sodium_100g) * 1000 : undefined } : null;
    const servings = [];
    const sq = num(p.serving_quantity);
    if (per100 && sq > 0) servings.push({ label: String(p.serving_size || sq + ' g').trim(), g: sq });
    else if (!per100 && num(nm['energy-kcal_serving']) != null) servings.push({ label: p.serving_size || '1 serving', n: { kcal: num(nm['energy-kcal_serving']), p: num(nm.proteins_serving) || 0, c: num(nm.carbohydrates_serving) || 0, f: num(nm.fat_serving) || 0, fiber: num(nm.fiber_serving), sugar: num(nm.sugars_serving) } });
    if (per100) UNIVERSAL.forEach(s => servings.push(Object.assign({}, s)));
    const name = deEnt(p.product_name_en || p.product_name || p.generic_name || '').trim();
    if (!name || !servings.length) return null;
    return { id: 'off:' + p.code, name, brand: deEnt(p.brands || '').split(',')[0].trim(), barcode: p.code, source: 'off', per100, servings, pkg: p.quantity || '' };
  }
  const offTimes = [];
  async function offSearch(q) {
    const now = Date.now(); while (offTimes.length && now - offTimes[0] > 60000) offTimes.shift();
    if (offTimes.length >= 8) { const e = new Error('Open Food Facts allows ~10 searches per minute. Wait a moment and try again.'); e.rate = true; throw e; }
    offTimes.push(now);
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=24&fields=${OFF_FIELDS}`;
    let j;
    try { j = await fetchJSON(url, 20000); } catch (e) {
      if (e.status || e.name === 'AbortError') throw e;
      await new Promise(r => setTimeout(r, 1500)); j = await fetchJSON(url, 20000); // one retry on transient network/CORS-less error
    }
    return (j.products || []).map(normOFF).filter(Boolean);
  }
  async function offBarcode(code) {
    const tries = [code]; if (code.length === 12) tries.push('0' + code); if (code.length === 13 && code[0] === '0') tries.push(code.slice(1));
    for (const c of tries) {
      const j = await fetchJSON(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(c)}.json?fields=${OFF_FIELDS}`, 15000).catch(e => { if (e.status === 404) return null; throw e; });
      if (j && j.status === 1 && j.product) { const f = normOFF(Object.assign({ code: c }, j.product)); if (f) return f; }
    }
    return null;
  }
  function normUSDA(f) {
    const by = {};
    (f.foodNutrients || []).forEach(n => { const id = n.nutrientId != null ? n.nutrientId : (n.nutrient && n.nutrient.id); const v = n.value != null ? n.value : n.amount; if (id != null && v != null) by[id] = +v; });
    let k = by[1008]; if (k == null) k = by[2047]; if (k == null) k = by[2048]; if (k == null && by[1062] != null) k = by[1062] / 4.184;
    if (k == null) return null;
    const per100 = { kcal: k, p: by[1003] || 0, c: by[1005] || 0, f: by[1004] || 0, fiber: by[1079], sugar: by[2000] != null ? by[2000] : by[1063], sodium: by[1093] };
    const servings = (f.foodMeasures || []).filter(m => m.gramWeight > 0 && m.disseminationText && !/not specified/i.test(m.disseminationText))
      .sort((a, b) => (a.rank || 0) - (b.rank || 0)).slice(0, 6).map(m => ({ label: m.disseminationText, g: m.gramWeight }));
    if (f.servingSize && /^g$/i.test(f.servingSizeUnit || '')) servings.unshift({ label: f.householdServingFullText || f.servingSize + ' g', g: f.servingSize });
    UNIVERSAL.forEach(s => servings.push(Object.assign({}, s)));
    const desc = String(f.description || '').trim(); if (!desc) return null;
    const name = desc === desc.toUpperCase() ? desc.charAt(0) + desc.slice(1).toLowerCase() : desc;
    return { id: 'usda:' + f.fdcId, name, brand: f.brandOwner || ({ 'Foundation': 'USDA Foundation', 'SR Legacy': 'USDA SR Legacy', 'Survey (FNDDS)': 'USDA FNDDS' }[f.dataType] || 'USDA'), source: 'usda', per100, servings };
  }
  async function usdaSearch(q) {
    const key = (st.settings.usdaKey || 'DEMO_KEY').trim();
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(key)}&query=${encodeURIComponent(q)}&pageSize=25&dataType=${encodeURIComponent('Foundation,SR Legacy,Survey (FNDDS)')}`;
    try {
      const j = await fetchJSON(url, 15000);
      return (j.foods || []).map(normUSDA).filter(Boolean);
    } catch (e) {
      if (e.status === 429 || /RATE_LIMIT/.test(e.message)) e.message = key === 'DEMO_KEY' ? 'USDA DEMO_KEY rate limit reached. Add your free personal key in Food → Goals.' : 'USDA rate limit reached. Try again later.';
      else if (e.status === 403 || /API_KEY/.test(e.message)) e.message = 'USDA rejected the API key. Check it in Food → Goals.';
      throw e;
    }
  }
  function netMsg(e, src) {
    if (e.rate) return e.message;
    if (e.name === 'AbortError') return `${src} timed out.`;
    if (e instanceof TypeError) return navigator.onLine === false ? 'You are offline — built-in and saved foods still work.' : `Couldn't reach ${src} (busy or rate-limited). Try again shortly.`;
    return e.message || `${src} error.`;
  }

  // ---------- views ----------
  let cur = todayIso();
  let weekOffset = 0;
  const ui = () => WO.ui;
  function ring(val, goal, size, color, label, sub) {
    const r = size / 2 - 9, C = 2 * Math.PI * r, pct = goal ? Math.min(1, val / goal) : 0;
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="ring"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-track"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-val" style="stroke:${color}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - pct)).toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
      <text x="50%" y="47%" text-anchor="middle" class="ring-big">${label}</text><text x="50%" y="63%" text-anchor="middle" class="ring-sub">${sub}</text></svg>`;
  }
  function bar(name, val, goal, cls, unit) {
    const pct = goal ? Math.min(100, val / goal * 100) : 0;
    return `<div class="mbar"><div class="row between small"><span>${name}</span><span><b>${r1(val)}</b><span class="muted"> / ${goal}${unit}</span></span></div><div class="mtrack"><div class="${cls}" style="width:${pct}%"></div></div></div>`;
  }
  function dateLabel(d) {
    const t = todayIso();
    const base = parse(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    return d === t ? 'Today · ' + base : d === addDays(t, -1) ? 'Yesterday · ' + base : base;
  }

  function renderDashboard() {
    const T = targets(); const tot = dayTotal(cur); const L = day(cur);
    ui().setTop('Food', esc(parse(cur).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })));
    const left = T.kcal - tot.kcal;
    const pLeft = T.p - tot.p;
    let h = `<div class="datenav"><button class="btn sm ghost" data-fa="day" data-n="-1" aria-label="Previous day">‹</button>
      <label class="datepick"><span>${esc(dateLabel(cur))}</span><input type="date" id="fDate" value="${cur}" max="${todayIso()}" aria-label="Pick date"></label>
      <button class="btn sm ghost" data-fa="day" data-n="1" aria-label="Next day" ${cur >= todayIso() ? 'disabled' : ''}>›</button></div>`;
    h += `<div class="card food-hero"><div class="hero-ring">${ring(tot.p, T.p, 150, 'var(--accent)', r1(tot.p), `of ${T.p} g protein`)}
        <div class="small ${pLeft <= 0 ? 'ok' : 'muted'}" style="text-align:center;margin-top:2px">${pLeft <= 0 ? 'Protein goal hit ✓' : `<b style="color:var(--text)">${r1(pLeft)} g</b> to go`}</div></div>
      <div class="grow"><div class="tag">Calories</div><div class="kcal-big">${kc(tot.kcal)}<span> / ${kc(T.kcal)}</span></div>
        <div class="small ${left < 0 ? 'over' : 'muted'}">${left < 0 ? `${kc(-left)} over budget` : `<b style="color:var(--text)">${kc(left)}</b> remaining`}</div>
        <div class="mtrack" style="margin:6px 0 10px"><div class="${left < 0 ? 'b-over' : 'b-kcal'}" style="width:${Math.min(100, tot.kcal / T.kcal * 100)}%"></div></div>
        ${bar('Carbs', tot.c, T.c, 'b-c', ' g')}${bar('Fat', tot.f, T.f, 'b-f', ' g')}${T.fiber ? bar('Fiber', tot.fiber, T.fiber, 'b-fi', ' g') : ''}</div></div>`;
    if (st.goals.waterOn) {
      const w = L.water || 0, g = st.goals.water, u = st.goals.waterUnit, stp = st.goals.waterStep;
      h += `<div class="card row water"><div class="grow"><div class="row between small"><span>💧 Water</span><span><b>${w}</b><span class="muted"> / ${g} ${u}</span></span></div><div class="mtrack"><div class="b-w" style="width:${Math.min(100, w / g * 100)}%"></div></div></div>
        <button class="btn sm ghost" data-fa="water" data-n="-${stp}" aria-label="Remove water">−</button><button class="btn sm" data-fa="water" data-n="${stp}">+${stp}</button></div>`;
    }
    const yest = day(addDays(cur, -1));
    MEALS.forEach(([m, label]) => {
      const list = L[m] || []; const t = mealTotal(list);
      h += `<div class="card meal"><div class="row between"><div><h2>${label}</h2><div class="small muted">${kc(t.kcal)} kcal · <b class="pc">${r1(t.p)} g P</b> · ${r1(t.c)} C · ${r1(t.f)} F</div></div>
        <div class="row" style="gap:6px"><button class="btn sm ghost" data-fa="mealmenu" data-meal="${m}" aria-label="${label} options">•••</button><button class="btn sm" data-fa="add" data-meal="${m}">+ Add</button></div></div>`;
      if (list.length) h += `<div class="entries">${list.map(e => `<div class="entry" data-fa="edit" data-meal="${m}" data-eid="${e.eid}"><div class="grow"><div class="en">${esc(e.name)}</div><div class="small muted">${esc(e.brand ? e.brand + ' · ' : '')}${r1(e.q)} × ${esc(e.sl)}</div></div><div class="ev"><b>${kc(e.n.kcal)}</b><span class="small pc">${r1(e.n.p)} g P</span></div></div>`).join('')}</div>`;
      else if ((yest[m] || []).length) h += `<button class="linkbtn" data-fa="copyy" data-meal="${m}">↺ Copy yesterday's ${label.toLowerCase()} (${yest[m].length} item${yest[m].length > 1 ? 's' : ''}, ${kc(mealTotal(yest[m]).kcal)} kcal)</button>`;
      h += `</div>`;
    });
    h += `<div class="row" style="gap:8px;margin:6px 0 4px"><a class="btn ghost grow" href="#food/progress">📈 Weekly & weight</a><a class="btn ghost grow" href="#food/goals">🎯 Goals</a></div>`;
    return h;
  }

  function renderGoals() {
    ui().setTop('Food goals', '');
    const g = st.goals, T = targets(), s = st.settings;
    const f = (id, label, val, extra) => `<div class="grow"><label class="f" for="${id}">${label}</label><input type="number" inputmode="decimal" id="${id}" data-fg="${id}" value="${esc(val)}" ${extra || ''}></div>`;
    let h = `<a href="#food" class="small">‹ Back to Food</a><h1 style="margin:6px 2px">Nutrition goals</h1>`;
    h += `<div class="card"><h2>Daily targets</h2><div class="row">${f('kcal', 'Calories (kcal)', g.kcal, 'min="800" step="10"')}${f('protein', 'Protein (g)', g.protein, 'min="0" step="5"')}</div>
      <label class="f">Carbs & fat</label><div class="seg"><button data-fa="macromode" data-v="auto" class="${g.macroMode === 'auto' ? 'on' : ''}">Auto split</button><button data-fa="macromode" data-v="manual" class="${g.macroMode === 'manual' ? 'on' : ''}">Manual grams</button></div>
      ${g.macroMode === 'auto' ? `<label class="f">Fat share of remaining calories: <b id="fsv">${g.fatShare}%</b></label><input type="range" min="20" max="60" step="5" id="fatShare" data-fg="fatShare" value="${g.fatShare}">
        <div class="small muted" id="splitInfo">${g.kcal - g.protein * 4} kcal left after protein → <b style="color:var(--text)">${T.c} g carbs</b> · <b style="color:var(--text)">${T.f} g fat</b></div>`
        : `<div class="row">${f('carbs', 'Carbs (g)', g.carbs)}${f('fat', 'Fat (g)', g.fat)}</div><div class="small muted">Macros add up to ${kc(g.protein * 4 + g.carbs * 4 + g.fat * 9)} kcal vs ${kc(g.kcal)} goal.</div>`}
      <label class="eq goal ${g.fiberOn ? 'on' : ''}" data-fa="toggle" data-k="fiberOn" style="margin-top:12px"><span class="box"></span><div class="grow"><b>Track fiber</b></div></label>
      ${g.fiberOn ? `<div class="row">${f('fiber', 'Fiber (g)', g.fiber)}</div>` : ''}</div>`;
    h += `<div class="card"><h2>Water</h2><label class="eq goal ${g.waterOn ? 'on' : ''}" data-fa="toggle" data-k="waterOn"><span class="box"></span><div class="grow"><b>Show water tracker</b></div></label>
      ${g.waterOn ? `<div class="row">${f('water', 'Daily goal', g.water)}${f('waterStep', 'Quick add', g.waterStep)}<div style="width:90px"><label class="f">Unit</label><select data-fg="waterUnit">${['oz', 'ml'].map(u => `<option ${g.waterUnit === u ? 'selected' : ''}>${u}</option>`).join('')}</select></div></div>` : ''}</div>`;
    h += `<div class="card"><h2>Food databases</h2><div class="small muted">Searches go straight from your phone to these free public APIs.</div>
      <label class="eq goal ${s.off ? 'on' : ''}" data-fa="stoggle" data-k="off"><span class="box"></span><div class="grow"><b>Open Food Facts</b><div class="small muted">Packaged foods & barcodes. No key. ~10 searches/min.</div></div></label>
      <label class="eq goal ${s.usda ? 'on' : ''}" data-fa="stoggle" data-k="usda"><span class="box"></span><div class="grow"><b>USDA FoodData Central</b><div class="small muted">Generic foods (chicken, rice…). Uses an API key.</div></div></label>
      <label class="f" for="usdaKey">USDA API key</label><input type="text" id="usdaKey" data-fg="usdaKey" value="${esc(s.usdaKey)}" autocomplete="off" autocapitalize="off" spellcheck="false">
      <div class="small muted" style="margin-top:4px">DEMO_KEY works but is heavily limited (~30 requests/hour per device). A free personal key (1,000/hour) takes a minute at <a href="https://fdc.nal.usda.gov/api-key-signup" target="_blank" rel="noopener">fdc.nal.usda.gov/api-key-signup</a>.</div>
      <button class="btn sm ghost" data-fa="testapi" style="margin-top:10px">Test connections</button><div id="apiTest" class="small" style="margin-top:8px"></div></div>`;
    h += `<div class="card"><h2>Data</h2><div class="small muted">Food data is included in Setup → Export backup.</div><button class="btn sm danger" data-fa="clearlog" style="margin-top:10px">Clear food log & weights</button></div>`;
    return h;
  }

  function weekDays() { const m = WO.ui.mondayOf(new Date()); m.setDate(m.getDate() + weekOffset * 7); return Array.from({ length: 7 }, (_, i) => { const d = new Date(m); d.setDate(m.getDate() + i); return iso(d); }); }
  function renderProgress() {
    ui().setTop('Progress', 'Food & weight');
    const T = targets(); const days = weekDays(); const today = todayIso();
    const rows = days.map(d => ({ d, t: dayTotal(d), has: dayHasFood(d) }));
    const logged = rows.filter(r => r.has);
    const avg = k => logged.length ? logged.reduce((a, r) => a + r.t[k], 0) / logged.length : 0;
    const hit = logged.filter(r => r.t.p >= T.p).length;
    const within = logged.filter(r => r.t.kcal <= T.kcal).length;
    const fmtD = (d, o) => parse(d).toLocaleDateString(undefined, o);
    const label = `${fmtD(days[0], { month: 'short', day: 'numeric' })} – ${fmtD(days[6], { month: 'short', day: 'numeric' })}`;
    let h = `<a href="#food" class="small">‹ Back to Food</a><div class="datenav" style="margin-top:6px"><button class="btn sm ghost" data-fa="week" data-n="-1" aria-label="Previous week">‹</button><div class="datepick"><span>${weekOffset === 0 ? 'This week · ' : ''}${label}</span></div><button class="btn sm ghost" data-fa="week" data-n="1" aria-label="Next week" ${weekOffset >= 0 ? 'disabled' : ''}>›</button></div>`;
    h += `<div class="statgrid"><div class="stat hero-stat"><span class="tag">Protein goal hit</span><b>${hit}<small>/${logged.length} days</small></b><span class="small muted">≥ ${T.p} g</span></div>
      <div class="stat"><span class="tag">Avg protein</span><b>${r1(avg('p'))}<small> g</small></b><span class="small muted">goal ${T.p} g</span></div>
      <div class="stat"><span class="tag">Avg calories</span><b>${kc(avg('kcal'))}</b><span class="small muted">budget ${kc(T.kcal)}</span></div>
      <div class="stat"><span class="tag">Within budget</span><b>${within}<small>/${logged.length} days</small></b><span class="small muted">averages use logged days</span></div></div>`;
    const W = 360, H = 170, top = 16, bot = 26, bw = 30;
    const maxK = Math.max(T.kcal * 1.25, ...rows.map(r => r.t.kcal));
    const y = v => top + (H - top - bot) * (1 - v / maxK);
    let svg = `<line x1="0" x2="${W}" y1="${y(T.kcal)}" y2="${y(T.kcal)}" class="ch-goal"/><text x="${W}" y="${y(T.kcal) - 4}" text-anchor="end" class="ch-lab">${kc(T.kcal)} kcal</text>`;
    rows.forEach((r, i) => {
      const x = 12 + i * (W - 24) / 7 + ((W - 24) / 7 - bw) / 2;
      svg += `<rect x="${x}" y="${y(r.t.kcal)}" width="${bw}" height="${Math.max(0, H - bot - y(r.t.kcal))}" rx="5" class="${r.t.kcal > T.kcal ? 'ch-over' : 'ch-bar'}"/>`;
      const ph = Math.min(1, r.t.p / T.p);
      svg += `<rect x="${x}" y="${H - 20}" width="${bw}" height="5" rx="2.5" class="ch-ptrack"/><rect x="${x}" y="${H - 20}" width="${bw * ph}" height="5" rx="2.5" class="${r.t.p >= T.p ? 'ch-phit' : 'ch-p'}"/>`;
      svg += `<text x="${x + bw / 2}" y="${H - 3}" text-anchor="middle" class="ch-lab ${r.d === today ? 'ch-today' : ''}">${fmtD(r.d, { weekday: 'narrow' })}</text>`;
    });
    h += `<div class="card"><div class="row between"><h2>Calories & protein</h2><span class="small muted">bars = kcal · strip = protein</span></div><svg viewBox="0 0 ${W} ${H}" class="chart">${svg}</svg>
      <div class="daytable">${rows.map(r => `<a href="#food" data-fa="goto" data-d="${r.d}" class="drow ${r.d === today ? 'today' : ''}"><span>${fmtD(r.d, { weekday: 'short', day: 'numeric' })}</span><span>${r.has ? kc(r.t.kcal) + ' kcal' : '<span class="muted">—</span>'}</span><span class="${r.has && r.t.p >= T.p ? 'ok' : ''}">${r.has ? r1(r.t.p) + ' g P' + (r.t.p >= T.p ? ' ✓' : '') : ''}</span></a>`).join('')}</div></div>`;
    const unit = (ui().getProfile() || {}).units || 'lb';
    const ws = Object.entries(st.weights).sort((a, b) => a[0] < b[0] ? -1 : 1);
    h += `<div class="card"><h2>Weight</h2><div class="row" style="margin-top:8px"><input type="number" inputmode="decimal" step="0.1" id="wVal" placeholder="Weight (${unit})" class="grow" value="${esc(st.weights[todayIso()] || '')}"><input type="date" id="wDate" value="${todayIso()}" max="${todayIso()}" style="width:150px" aria-label="Weigh-in date"><button class="btn" data-fa="wsave">Save</button></div>
      ${ws.length >= 2 ? weightChart(ws, unit) : `<div class="small muted" style="margin-top:10px">Log at least two weigh-ins to see your trend. Weigh in the morning, after the bathroom, before eating.</div>`}
      ${ws.length ? `<div class="daytable" style="margin-top:8px">${ws.slice(-8).reverse().map(([d, w]) => `<div class="drow"><span>${fmtD(d, { month: 'short', day: 'numeric' })}</span><span><b>${w}</b> ${unit}</span><button class="linkbtn" data-fa="wdel" data-d="${d}" aria-label="Delete weigh-in">✕</button></div>`).join('')}</div>` : ''}</div>`;
    return h;
  }
  function weightChart(ws, unit) {
    const pts = ws.slice(-90).map(([d, w]) => ({ t: parse(d).getTime(), w: +w }));
    const W = 360, H = 160, pl = 34, pr = 8, pt = 10, pb = 22;
    const t0 = pts[0].t, t1 = Math.max(pts[pts.length - 1].t, t0 + 864e5);
    const vals = pts.map(p => p.w); let lo = Math.min(...vals), hi = Math.max(...vals); if (hi - lo < 4) { const m = (hi + lo) / 2; lo = m - 2; hi = m + 2; }
    const X = t => pl + (W - pl - pr) * (t - t0) / (t1 - t0), Y = v => pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo));
    const trend = pts.map(p => { const win = pts.filter(q => q.t <= p.t && q.t > p.t - 7 * 864e5); return { t: p.t, w: win.reduce((a, q) => a + q.w, 0) / win.length }; });
    const line = arr => arr.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)},${Y(p.w).toFixed(1)}`).join(' ');
    let svg = [lo, (lo + hi) / 2, hi].map(v => `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" class="ch-grid"/><text x="${pl - 4}" y="${Y(v) + 3}" text-anchor="end" class="ch-lab">${r1(v)}</text>`).join('');
    svg += `<path d="${line(pts)}" class="ch-wline"/><path d="${line(trend)}" class="ch-trend"/>`;
    svg += pts.map(p => `<circle cx="${X(p.t).toFixed(1)}" cy="${Y(p.w).toFixed(1)}" r="2.6" class="ch-dot"/>`).join('');
    svg += `<text x="${pl}" y="${H - 4}" class="ch-lab">${new Date(t0).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</text><text x="${W - pr}" y="${H - 4}" text-anchor="end" class="ch-lab">${new Date(t1).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</text>`;
    const delta = trend[trend.length - 1].w - trend[0].w;
    const days = Math.max(1, (pts[pts.length - 1].t - t0) / 864e5);
    return `<svg viewBox="0 0 ${W} ${H}" class="chart" style="margin-top:10px">${svg}</svg><div class="small muted"><span class="lg-dot"></span>weigh-ins <span class="lg-line"></span>7-day trend · ${delta <= 0 ? '↓' : '↑'} <b style="color:var(--text)">${r1(Math.abs(delta))} ${unit}</b> over ${Math.round(days)} days${days >= 7 ? ` (${r1(delta / days * 7)} ${unit}/week)` : ''}</div>`;
  }

  // ---------- add-food sheet ----------
  let addCtx = null; // {meal, date, target:'log'|'recipe', tab, q}
  let recipeDraft = null;
  const searchCache = {};
  let searchState = { q: '' };

  function openAdd(meal, target) {
    const t = target || 'log';
    addCtx = { meal: meal || (addCtx && addCtx.meal) || 'breakfast', date: cur, target: t, tab: (addCtx && addCtx.target === t && addCtx.tab) || 'search', q: (addCtx && addCtx.q) || '' };
    showAdd();
  }
  function addHeader() {
    const forRecipe = addCtx.target === 'recipe';
    return `<div class="sheet-head"><div class="grow"><div class="tag">${forRecipe ? 'Add ingredient to ' + esc((recipeDraft && recipeDraft.name) || 'recipe') : esc(dateLabel(addCtx.date))}</div>
      ${forRecipe ? '<h1 style="font-size:22px;margin-top:4px">Add ingredient</h1>' : `<div class="chips" style="margin-top:6px">${MEALS.map(([m, l]) => `<button class="chip ${addCtx.meal === m ? 'on' : ''}" data-fa="setmeal" data-meal="${m}">${l}</button>`).join('')}</div>`}</div>
      <button class="close-x" ${forRecipe ? 'data-fa="backrecipe"' : 'data-close'} aria-label="Close">✕</button></div>
      <div class="seg tabs6">${[['search', 'Search'], ['scan', 'Scan'], ['recent', 'Recent'], ['fav', '★ Favs'], ['mine', 'Mine'], ['quick', 'Quick']].map(([k, l]) => `<button data-fa="tab" data-tab="${k}" class="${addCtx.tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  }
  const SRC_LABEL = { seed: 'Built-in', off: 'OFF', usda: 'USDA', custom: 'Custom', recipe: 'Recipe' };
  function foodRow(f, extra) {
    const si = extra && extra.si != null && f.servings[extra.si] ? extra.si : 0;
    const s = f.servings[si];
    const q = (extra && extra.q) || 1;
    const n = scale(servingN(f, s), q);
    return `<div class="frow" data-fa="food" data-fid="${esc(f.id)}" data-si="${si}" data-q="${q}">
      <div class="grow"><div class="en">${esc(f.name)}</div><div class="small muted">${f.brand ? esc(f.brand) + ' · ' : ''}${r1(q)} × ${esc(s.label)} · <span class="src src-${f.source}">${SRC_LABEL[f.source] || ''}</span></div></div>
      <div class="ev"><b>${kc(n.kcal)}</b><span class="small pc">${r1(n.p)} g P</span></div>
      <button class="plus" data-fa="quicklog" data-fid="${esc(f.id)}" data-si="${si}" data-q="${q}" aria-label="Log ${esc(f.name)}">+</button></div>`;
  }
  function localMatches(q) {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const seen = new Set();
    return Object.values(SEED).concat(Object.values(st.foods)).filter(f => { if (seen.has(f.id)) return false; seen.add(f.id); const hay = (f.name + ' ' + (f.brand || '')).toLowerCase(); return words.every(w => hay.includes(w)); })
      .sort((a, b) => { const w = words[0] || ''; const as = a.name.toLowerCase().startsWith(w) ? 0 : 1, bs = b.name.toLowerCase().startsWith(w) ? 0 : 1; return as - bs || a.name.length - b.name.length; }).slice(0, 25);
  }
  function srcSection(key, title) {
    const s = searchState[key];
    if (!s) return '';
    let body;
    if (s.loading) body = `<div class="small muted spin">Searching ${title.split(' (')[0]}…</div>`;
    else if (s.error) body = `<div class="small warn">${esc(s.error)}</div>`;
    else if (!s.items.length) body = `<div class="small muted">No results.</div>`;
    else body = s.items.map(f => foodRow(f)).join('');
    return `<div class="rsec"><div class="tag">${title}${s.items && s.items.length ? ` · ${s.items.length}` : ''}</div>${body}</div>`;
  }
  function resultsHtml() {
    const q = (addCtx.q || '').trim();
    const online = st.settings.off || st.settings.usda;
    if (!q) {
      return `<div class="small muted" style="margin:10px 2px">Type to filter built-in & saved foods instantly. Press <b>Search</b> to also query ${online ? [st.settings.usda && 'USDA', st.settings.off && 'Open Food Facts'].filter(Boolean).join(' + ') : 'online databases (turned off in Goals)'}.</div>
        <div class="rsec"><div class="tag">High-protein staples (offline)</div>${Object.values(SEED).slice(0, 14).map(f => foodRow(f)).join('')}</div>`;
    }
    const loc = localMatches(q);
    let h = `<div class="rsec"><div class="tag">Built-in & saved · ${loc.length}</div>${loc.length ? loc.map(f => foodRow(f)).join('') : '<div class="small muted">No local matches.</div>'}</div>`;
    if (searchState.q === q) h += srcSection('usda', 'USDA FoodData Central (generic)') + srcSection('off', 'Open Food Facts (packaged)');
    else if (online) h += `<button class="btn ghost block" data-fa="dosearch" style="margin-top:10px">Search online for “${esc(q)}”</button>`;
    return h;
  }
  function searchBody() {
    return `<form class="row" data-fa-form="search" style="margin-top:12px"><input type="search" id="fQ" placeholder="Search foods (e.g. chicken breast)" value="${esc(addCtx.q || '')}" enterkeyhint="search" autocomplete="off" class="grow"><button class="btn" type="submit">Search</button></form><div id="fRes">${resultsHtml()}</div>`;
  }
  function refreshResults() { const fr = $('#fRes'); if (fr && addCtx && addCtx.tab === 'search') fr.innerHTML = resultsHtml(); }
  function scanBody() {
    return `<div class="scanbox" id="scanBox"><video id="scanVideo" playsinline muted autoplay></video><div class="scanframe"></div><div class="scanmsg" id="scanMsg">Starting camera…</div></div>
      <div class="small muted" style="margin:6px 2px">Point the rear camera at a UPC/EAN barcode. Products come from Open Food Facts.</div>
      <form class="row" data-fa-form="barcode" style="margin-top:8px"><input type="text" inputmode="numeric" pattern="[0-9]*" id="fCode" placeholder="Or type the barcode digits" class="grow" autocomplete="off"><button class="btn" type="submit">Look up</button></form>
      <div id="codeRes" style="margin-top:10px"></div>`;
  }
  function listBody(kind) {
    if (kind === 'recent') {
      const items = st.recent.map(r => ({ f: getFood(r.fid), r })).filter(x => x.f);
      return items.length ? `<div class="small muted" style="margin:10px 2px">Tap + to log the same serving as last time.</div>${items.map(x => foodRow(x.f, { si: x.r.si, q: x.r.q })).join('')}` : `<div class="empty">Foods you log show up here for one-tap logging.</div>`;
    }
    if (kind === 'fav') {
      const items = st.favorites.map(getFood).filter(Boolean);
      return items.length ? items.map(f => { const r = st.recent.find(x => x.fid === f.id); return foodRow(f, r ? { si: r.si, q: r.q } : null); }).join('') : `<div class="empty">Tap ☆ on any food to favorite it.</div>`;
    }
    const mine = Object.values(st.foods).filter(f => f.source === 'custom' || f.source === 'recipe').sort((a, b) => a.name.localeCompare(b.name));
    return `<div class="row" style="gap:8px;margin-top:12px"><button class="btn ghost grow" data-fa="newfood">+ Custom food</button><button class="btn ghost grow" data-fa="newrecipe">+ Recipe / meal</button></div>
      ${mine.length ? `<div class="rsec">${mine.map(f => foodRow(f)).join('')}</div>` : '<div class="empty">Your custom foods and recipes live here.</div>'}`;
  }
  function quickBody(prefill) {
    const p = prefill || {};
    const fld = (id, label, v, ph) => `<div class="grow"><label class="f" for="${id}">${label}</label><input type="number" inputmode="decimal" id="${id}" value="${v != null ? esc(r1(v)) : ''}" placeholder="${ph || '0'}"></div>`;
    const forRecipe = addCtx && addCtx.target === 'recipe';
    return `<form data-fa-form="quick" style="margin-top:6px"><label class="f" for="qName">Name</label><input type="text" id="qName" value="${esc(p.name || '')}" placeholder="e.g. Chipotle bowl">
      <div class="row">${fld('qKcal', 'Calories', p.kcal, 'kcal')}${fld('qP', 'Protein g', p.p)}</div><div class="row">${fld('qC', 'Carbs g', p.c)}${fld('qF', 'Fat g', p.f)}${fld('qFi', 'Fiber g', p.fiber)}</div>
      ${p.eid || forRecipe ? '' : `<label class="eq goal" data-fa="tgl" style="margin-top:10px"><span class="box"></span><div><b>Also save as a custom food</b></div></label>`}
      <div class="row" style="margin-top:12px">${p.eid ? `<button type="button" class="btn danger" data-fa="delentry">Delete</button>` : ''}<button class="btn grow" type="submit">${p.eid ? 'Save' : forRecipe ? 'Add to recipe' : 'Log to ' + MEAL_NAME[addCtx.meal]}</button></div></form>`;
  }
  function showAdd() {
    stopScan();
    detail = null;
    let body = '';
    if (addCtx.tab === 'search') body = searchBody();
    else if (addCtx.tab === 'scan') body = scanBody();
    else if (addCtx.tab === 'quick') body = quickBody();
    else body = listBody(addCtx.tab);
    ui().openSheet(addHeader() + `<div id="addBody">${body}</div>`);
    if (addCtx.tab === 'scan') startScan();
  }
  function doSearch() {
    const q = (addCtx.q || '').trim(); if (!q) return;
    searchState = { q };
    const run = (key, fn, name) => {
      if (!st.settings[key]) return;
      const ck = key + '|' + q.toLowerCase();
      if (searchCache[ck] && Date.now() - searchCache[ck].t < 15 * 60000) { searchState[key] = { items: searchCache[ck].items }; return; }
      searchState[key] = { loading: true };
      fn(q).then(items => { items.forEach(f => { tmpFoods[f.id] = f; }); searchCache[ck] = { t: Date.now(), items }; if (searchState.q === q) searchState[key] = { items }; })
        .catch(e => { if (searchState.q === q) searchState[key] = { error: netMsg(e, name) }; })
        .finally(() => { if (searchState.q === q) refreshResults(); });
    };
    run('usda', usdaSearch, 'USDA');
    run('off', offSearch, 'Open Food Facts');
    refreshResults();
  }

  // ---------- food detail ----------
  let detail = null; // {food, si, q, mode, meal, eid, date}
  function openFood(fid, opts) {
    const food = getFood(fid); if (!food) return;
    const o = opts || {};
    const r = st.recent.find(x => x.fid === fid);
    detail = { food, si: o.si != null ? o.si : (r ? r.si : 0), q: o.q != null ? o.q : (r ? r.q : 1), mode: o.mode || (addCtx && addCtx.target === 'recipe' ? 'recipe' : 'add'), meal: o.meal || (addCtx && addCtx.meal) || 'breakfast', eid: o.eid, date: o.date || (addCtx && addCtx.date) || cur };
    if (!(detail.si < food.servings.length)) detail.si = 0;
    stopScan();
    renderDetail();
  }
  function detailNutrients() { return entryN(detail.food, detail.si, +detail.q || 0); }
  function nutrientBlock() {
    const n = detailNutrients();
    return `<div class="dkcal"><b>${kc(n.kcal)}</b><span>kcal</span></div>
      <div class="macros3"><div class="m-p"><b>${r1(n.p || 0)} g</b><span>Protein</span></div><div class="m-c"><b>${r1(n.c || 0)} g</b><span>Carbs</span></div><div class="m-f"><b>${r1(n.f || 0)} g</b><span>Fat</span></div></div>
      <div class="small muted" style="text-align:center;margin-top:6px">${[n.fiber != null && `Fiber ${r1(n.fiber)} g`, n.sugar != null && `Sugar ${r1(n.sugar)} g`, n.sodium != null && `Sodium ${Math.round(n.sodium)} mg`].filter(Boolean).join(' · ')}</div>`;
  }
  function renderDetail() {
    const f = detail.food, fav = f.id && st.favorites.includes(f.id);
    const p100 = f.per100;
    const back = detail.mode === 'edit' ? 'data-close' : 'data-fa="backadd"';
    const src = { seed: 'Built-in', off: 'Open Food Facts', usda: 'USDA FoodData Central', custom: 'Custom food', recipe: 'Recipe', entry: 'Logged entry' }[f.source] || '';
    const servLabel = s => esc(s.label) + (s.g && !/^\d+(\.\d+)? ?g$/.test(s.label) && s.label !== '1 oz' && !/\d\s?g\b/.test(s.label) ? ` (${r1(s.g)} g)` : '');
    const html = `<div class="sheet-head"><button class="close-x" ${back} aria-label="Back">‹</button><div class="grow"><div class="tag">${esc(src)}${f.barcode ? ' · ' + esc(f.barcode) : ''}</div><h1 style="font-size:21px;margin-top:3px">${esc(f.name)}</h1>${f.brand ? `<div class="small muted">${esc(f.brand)}${f.pkg ? ' · ' + esc(f.pkg) : ''}</div>` : ''}</div>
      ${f.id ? `<button class="close-x star ${fav ? 'on' : ''}" data-fa="fav" aria-label="Favorite">${fav ? '★' : '☆'}</button>` : ''}</div>
      <div class="card flat" id="nBlock">${nutrientBlock()}</div>
      <label class="f" for="dServ">Serving size</label><select id="dServ">${f.servings.map((s, i) => `<option value="${i}" ${i === +detail.si ? 'selected' : ''}>${servLabel(s)}</option>`).join('')}</select>
      <label class="f" for="dQty">Number of servings</label><div class="qty"><button class="btn ghost" data-fa="qty" data-n="-1" aria-label="Less">−</button><input type="number" inputmode="decimal" id="dQty" value="${esc(detail.q)}" min="0" step="any"><button class="btn ghost" data-fa="qty" data-n="1" aria-label="More">+</button></div>
      <div class="chips" style="margin-top:8px">${[0.5, 1, 1.5, 2, 3].map(v => `<button class="chip" data-fa="qtyset" data-v="${v}">${v}×</button>`).join('')}</div>
      ${detail.mode !== 'recipe' ? `<label class="f" for="dMeal">Meal</label><select id="dMeal">${MEALS.map(([m, l]) => `<option value="${m}" ${detail.meal === m ? 'selected' : ''}>${l}</option>`).join('')}</select>` : ''}
      <div class="row" style="margin-top:14px">${detail.mode === 'edit' ? '<button class="btn danger" data-fa="delentry">Delete</button>' : ''}<button class="btn grow" data-fa="commit">${detail.mode === 'edit' ? 'Save changes' : detail.mode === 'recipe' ? 'Add to recipe' : 'Add to ' + MEAL_NAME[detail.meal]}</button></div>
      ${p100 ? `<div class="small muted" style="margin-top:12px">Per 100 g: ${kc(p100.kcal)} kcal · P ${r1(p100.p)} · C ${r1(p100.c)} · F ${r1(p100.f)}${p100.fiber != null ? ' · Fiber ' + r1(p100.fiber) : ''}${p100.sodium != null ? ' · Na ' + Math.round(p100.sodium) + ' mg' : ''}</div>` : ''}
      ${f.source === 'recipe' && f.items ? `<div class="small muted" style="margin-top:8px">Ingredients: ${esc(f.items.map(i => i.name).join(', '))}</div>` : ''}
      ${f.source === 'off' ? '<div class="small muted" style="margin-top:8px">Data © Open Food Facts contributors (ODbL). Check the label if numbers look off.</div>' : ''}
      ${(f.source === 'custom' || f.source === 'recipe') && detail.mode !== 'edit' ? `<div class="row" style="margin-top:10px;gap:8px"><button class="btn sm ghost" data-fa="${f.source === 'recipe' ? 'editrecipe' : 'editfood'}">Edit ${f.source}</button><button class="btn sm danger" data-fa="delfood">Delete ${f.source}</button></div>` : ''}`;
    ui().openSheet(html);
  }
  function updateDetail() {
    const sv = $('#dServ'), qv = $('#dQty'); if (!sv || !detail) return;
    detail.si = +sv.value; detail.q = qv.value;
    $('#nBlock').innerHTML = nutrientBlock();
    const m = $('#dMeal'); if (m) detail.meal = m.value;
    const btn = $('[data-fa="commit"]'); if (btn && detail.mode === 'add') btn.textContent = 'Add to ' + MEAL_NAME[detail.meal];
  }
  function commitDetail() {
    updateDetail();
    const q = +detail.q; if (!(q > 0)) { alert('Enter a quantity above 0.'); return; }
    const f = detail.food;
    if (detail.mode === 'recipe') {
      persistFood(f);
      recipeDraft.items.push({ fid: f.id, si: detail.si, q, name: f.name, sl: f.servings[detail.si].label, n: entryN(f, detail.si, q) });
      openRecipe(); return;
    }
    if (detail.mode === 'edit') {
      const L = dayW(detail.date);
      const from = MEALS.map(([m]) => m).find(m => (L[m] || []).some(e => e.eid === detail.eid));
      if (from) {
        const idx = L[from].findIndex(e => e.eid === detail.eid); const e = L[from][idx];
        e.si = f.id ? detail.si : e.si; e.q = q; e.sl = f.servings[detail.si].label; e.n = entryN(f, detail.si, q);
        if (from !== detail.meal) { L[from].splice(idx, 1); L[detail.meal].push(e); }
      }
      save(); detail = null; ui().closeSheet(); refresh(); return;
    }
    logEntry(detail.date, detail.meal, f, detail.si, q);
    if (addCtx) addCtx.meal = detail.meal;
    const meal = detail.meal; detail = null;
    ui().closeSheet(); refresh(); toast(`Added ${f.name.slice(0, 30)} to ${MEAL_NAME[meal]}`);
  }
  function findEntry(date, eid) { const L = day(date); for (const [m] of MEALS) { const e = (L[m] || []).find(x => x.eid === eid); if (e) return { m, e }; } return null; }
  function editEntry(eid) {
    const r = findEntry(cur, eid); if (!r) return;
    const e = r.e;
    if (!e.fid) {
      addCtx = { meal: r.m, date: cur, target: 'log', tab: 'quick', q: '' }; detail = { mode: 'quickedit', eid, date: cur, meal: r.m };
      ui().openSheet(`<div class="sheet-head"><div><div class="tag">Quick add · ${MEAL_NAME[r.m]}</div><h1 style="font-size:21px;margin-top:3px">Edit entry</h1></div><button class="close-x" data-close aria-label="Close">✕</button></div>${quickBody(Object.assign({ name: e.name, eid }, e.n))}`);
      return;
    }
    let food = getFood(e.fid);
    if (!food) food = { id: null, source: 'entry', name: e.name, brand: e.brand, servings: [{ label: e.sl, n: scale(e.n, 1 / (e.q || 1)) }] };
    detail = { food, si: food.id ? Math.min(e.si || 0, food.servings.length - 1) : 0, q: e.q, mode: 'edit', meal: r.m, eid, date: cur };
    renderDetail();
  }

  // ---------- custom foods & recipes ----------
  let editingFoodId = null;
  function openCustomForm(fid, barcode) {
    editingFoodId = fid || null;
    const f = fid ? st.foods[fid] : null; const s = f ? f.servings[0] : null; const n = f ? servingN(f, s) : {};
    const fld = (id, label, v, ph, text) => `<div class="grow"><label class="f" for="${id}">${label}</label><input type="${text ? 'text' : 'number'}" ${text ? '' : 'inputmode="decimal"'} id="${id}" value="${v != null && v !== '' ? esc(text ? v : r1(v)) : ''}" placeholder="${ph || ''}"></div>`;
    ui().openSheet(`<div class="sheet-head"><button class="close-x" data-fa="backadd" aria-label="Back">‹</button><div class="grow"><div class="tag">Custom food</div><h1 style="font-size:21px;margin-top:3px">${f ? 'Edit food' : 'New food'}</h1></div></div>
      <form data-fa-form="custom">${fld('cName', 'Name *', f && f.name, "e.g. Mom's chili", 1)}${fld('cBrand', 'Brand', f && f.brand, 'optional', 1)}
      <div class="row">${fld('cServ', 'Serving label *', s && s.label, 'e.g. 1 bowl', 1)}${fld('cG', 'Grams / serving', s && s.g, 'optional')}</div>
      <div class="tag" style="margin-top:12px">Nutrition per serving</div>
      <div class="row">${fld('cKcal', 'Calories *', n.kcal)}${fld('cP', 'Protein g', n.p)}</div><div class="row">${fld('cC', 'Carbs g', n.c)}${fld('cF', 'Fat g', n.f)}</div>
      <div class="row">${fld('cFi', 'Fiber g', n.fiber)}${fld('cSu', 'Sugar g', n.sugar)}${fld('cNa', 'Sodium mg', n.sodium)}</div>
      ${fld('cCode', 'Barcode', (f && f.barcode) || barcode || '', 'optional', 1)}
      <button class="btn block" type="submit" style="margin-top:14px">Save food</button></form>`);
  }
  function saveCustom() {
    const v = id => $('#' + id).value.trim();
    const name = v('cName'), label = v('cServ') || '1 serving', kcal = num(v('cKcal'));
    if (!name || kcal == null) { alert('Name and calories are required.'); return; }
    const n = { kcal, p: num(v('cP')) || 0, c: num(v('cC')) || 0, f: num(v('cF')) || 0, fiber: num(v('cFi')), sugar: num(v('cSu')), sodium: num(v('cNa')) };
    const g = num(v('cG'));
    const food = { id: editingFoodId || uid('custom'), name, brand: v('cBrand'), barcode: v('cCode').replace(/\D/g, ''), source: 'custom' };
    if (g > 0) { food.per100 = scale(n, 100 / g); food.servings = [{ label, g }].concat(UNIVERSAL.map(s => Object.assign({}, s))); }
    else food.servings = [{ label, n }];
    st.foods[food.id] = food; save();
    if (addCtx && addCtx.target === 'recipe' && recipeDraft) openFood(food.id, { si: 0, q: 1, mode: 'recipe' });
    else if (addCtx) openFood(food.id, { si: 0, q: 1, mode: 'add' });
    else { ui().closeSheet(); refresh(); }
  }
  function openRecipe() {
    const R = recipeDraft; const tot = R.items.reduce((a, i) => addN(a, i.n), zero()); const per = scale(tot, 1 / (R.servings || 1));
    addCtx = Object.assign(addCtx || { meal: 'breakfast', date: cur, q: '' }, { target: 'recipe' });
    detail = null;
    ui().openSheet(`<div class="sheet-head"><button class="close-x" data-fa="closerecipe" aria-label="Back">‹</button><div class="grow"><div class="tag">Recipe / saved meal</div><h1 style="font-size:21px;margin-top:3px">${R.id ? 'Edit recipe' : 'New recipe'}</h1></div></div>
      <label class="f" for="rName">Name</label><input type="text" id="rName" value="${esc(R.name)}" placeholder="e.g. Protein oats">
      <label class="f" for="rServ">Makes how many servings?</label><input type="number" inputmode="decimal" id="rServ" value="${esc(R.servings)}" min="1" step="1">
      <div class="tag" style="margin-top:14px">Ingredients · ${R.items.length}</div>
      <div class="entries">${R.items.map((i, k) => `<div class="entry"><div class="grow"><div class="en">${esc(i.name)}</div><div class="small muted">${r1(i.q)} × ${esc(i.sl)}</div></div><div class="ev"><b>${kc(i.n.kcal)}</b><span class="small pc">${r1(i.n.p)} g P</span></div><button class="plus del" data-fa="rdel" data-k="${k}" aria-label="Remove">✕</button></div>`).join('') || '<div class="small muted" style="padding:8px 0">No ingredients yet.</div>'}</div>
      <button class="btn ghost block" data-fa="raddi" style="margin-top:8px">+ Add ingredient</button>
      <div class="card flat small" style="margin-top:12px">Per serving: <b>${kc(per.kcal)} kcal</b> · <b class="pc">${r1(per.p)} g P</b> · ${r1(per.c)} g C · ${r1(per.f)} g F <span class="muted">(whole recipe ${kc(tot.kcal)} kcal)</span></div>
      <button class="btn block" data-fa="rsave" style="margin-top:6px">Save recipe</button>`);
  }
  function syncRecipeFields() { const n = $('#rName'), s = $('#rServ'); if (n) recipeDraft.name = n.value; if (s) recipeDraft.servings = Math.max(1, +s.value || 1); }
  function saveRecipe() {
    syncRecipeFields(); const R = recipeDraft;
    if (!R.name.trim() || !R.items.length) { alert('Give the recipe a name and at least one ingredient.'); return; }
    const tot = R.items.reduce((a, i) => addN(a, i.n), zero());
    const food = { id: R.id || uid('recipe'), name: R.name.trim(), source: 'recipe', items: R.items, yield: R.servings, servings: [{ label: '1 serving', n: scale(tot, 1 / R.servings) }] };
    if (R.servings > 1) food.servings.push({ label: `whole recipe (${R.servings} servings)`, n: tot });
    st.foods[food.id] = food; save(); recipeDraft = null;
    addCtx = Object.assign(addCtx || { meal: 'breakfast', date: cur, q: '' }, { target: 'log', tab: 'mine' });
    openFood(food.id, { si: 0, q: 1, mode: 'add' });
  }

  // ---------- barcode scanning ----------
  let scan = null;
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); }); }
  async function startScan() {
    const msg = t => { const m = $('#scanMsg'); if (m) m.textContent = t; };
    const video = $('#scanVideo'); if (!video) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { msg(window.isSecureContext ? 'Camera not available here — type the barcode below.' : 'Camera needs HTTPS — type the barcode below.'); return; }
    const token = {}; scan = { token, stream: null, timer: null, reader: null };
    const alive = () => scan && scan.token === token;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (!alive()) { stream.getTracks().forEach(t => t.stop()); return; }
      scan.stream = stream; video.srcObject = stream; await video.play().catch(() => {});
      const found = code => { if (!alive()) return; if (navigator.vibrate) navigator.vibrate(80); stopScan(); lookupBarcode(code); };
      let native = false;
      if ('BarcodeDetector' in window) {
        try {
          const sup = await window.BarcodeDetector.getSupportedFormats();
          const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e'].filter(f => sup.includes(f));
          if (formats.length) {
            native = true; const det = new window.BarcodeDetector({ formats });
            msg('Scanning… hold steady');
            const tick = async () => {
              if (!alive()) return;
              try { if (video.readyState >= 2) { const codes = await det.detect(video); if (codes.length) { found(codes[0].rawValue); return; } } } catch (e) { /* frame not ready */ }
              if (alive()) scan.timer = setTimeout(tick, 150);
            };
            tick();
          }
        } catch (e) { native = false; }
      }
      if (!native) {
        msg('Loading scanner…');
        if (!window.ZXing) await loadScript('js/vendor/zxing-library-0.21.3.min.js');
        if (!alive()) return;
        const Z = window.ZXing; const hints = new Map();
        hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E]);
        const reader = new Z.BrowserMultiFormatReader(hints, 250); scan.reader = reader;
        msg('Scanning… hold steady');
        reader.decodeFromStream(stream, video, res => { if (res) found(res.getText()); });
      }
    } catch (e) {
      msg(e && e.name === 'NotAllowedError' ? 'Camera permission denied. Allow it in Chrome site settings, or type the barcode below.' : e && e.name === 'NotFoundError' ? 'No camera found — type the barcode below.' : 'Could not start camera — type the barcode below.');
    }
  }
  function stopScan() {
    if (!scan) return;
    clearTimeout(scan.timer);
    try { if (scan.reader) scan.reader.reset(); } catch (e) { /* ignore */ }
    if (scan.stream) scan.stream.getTracks().forEach(t => t.stop());
    scan = null;
  }
  async function lookupBarcode(raw) {
    const code = String(raw || '').replace(/\D/g, '');
    const out = () => $('#codeRes');
    if (code.length < 6) { if (out()) out().innerHTML = '<div class="small warn">Enter a valid barcode (8–14 digits).</div>'; return; }
    const local = Object.values(st.foods).find(f => f.barcode && (f.barcode === code || f.barcode === '0' + code || '0' + f.barcode === code));
    if (local) { openFood(local.id); return; }
    if (out()) out().innerHTML = `<div class="small muted spin">Looking up ${code} on Open Food Facts…</div>`;
    try {
      const f = await offBarcode(code);
      if (f) { tmpFoods[f.id] = f; openFood(f.id); return; }
      if (out()) out().innerHTML = `<div class="card flat"><b>${code}</b> isn't in Open Food Facts yet.<div class="row" style="margin-top:8px;gap:8px"><button class="btn sm" data-fa="newfood" data-code="${code}">Create custom food</button><button class="btn sm ghost" data-fa="tab" data-tab="scan">Scan again</button></div></div>`;
    } catch (e) {
      if (out()) out().innerHTML = `<div class="small warn">${esc(netMsg(e, 'Open Food Facts'))}</div>`;
    }
  }

  // ---------- misc ----------
  function toast(msg) {
    let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 1800);
  }
  function refresh() {
    const h = location.hash.replace(/^#/, '');
    if (!h.startsWith('food')) return;
    const y = window.scrollY; $('#view').innerHTML = WO.routes.food(h.split('/')[1]); window.scrollTo(0, y);
  }
  function openMealMenu(meal) {
    const yest = day(addDays(cur, -1))[meal] || []; const list = day(cur)[meal] || [];
    ui().openSheet(`<div class="sheet-head"><div><div class="tag">${esc(dateLabel(cur))}</div><h1 style="font-size:21px;margin-top:3px">${MEAL_NAME[meal]}</h1></div><button class="close-x" data-close aria-label="Close">✕</button></div>
      <div class="menu">
      <button data-fa="copyy" data-meal="${meal}" ${yest.length ? '' : 'disabled'}>↺ Copy yesterday's ${MEAL_NAME[meal].toLowerCase()}<span class="muted small">${yest.length ? `${yest.length} item${yest.length > 1 ? 's' : ''} · ${kc(mealTotal(yest).kcal)} kcal` : 'nothing logged yesterday'}</span></button>
      <button data-fa="copyday" ${dayHasFood(addDays(cur, -1)) ? '' : 'disabled'}>↺ Copy ALL of yesterday's meals</button>
      <button data-fa="mealrecipe" data-meal="${meal}" ${list.length ? '' : 'disabled'}>★ Save this ${MEAL_NAME[meal].toLowerCase()} as a reusable meal</button>
      <button data-fa="clearmeal" data-meal="${meal}" class="danger-t" ${list.length ? '' : 'disabled'}>✕ Clear ${MEAL_NAME[meal].toLowerCase()}</button></div>`);
  }
  function copyMeal(from, to, meal) {
    const src = day(from)[meal] || []; if (!src.length) return 0;
    const L = dayW(to); src.forEach(e => L[meal].push(Object.assign({}, e, { eid: uid('e'), n: Object.assign({}, e.n) })));
    return src.length;
  }
  async function testApis() {
    const out = $('#apiTest'); if (!out) return;
    out.innerHTML = '<span class="muted">Testing…</span>';
    const res = [];
    try { const f = await offBarcode('3017624010701'); res.push(f ? '✅ Open Food Facts barcode lookup OK' : '⚠️ Open Food Facts reachable but returned nothing'); } catch (e) { res.push('❌ Open Food Facts: ' + esc(netMsg(e, 'Open Food Facts'))); }
    try { const r = await usdaSearch('banana'); res.push(`✅ USDA search OK (${r.length} results)`); } catch (e) { res.push('❌ USDA: ' + esc(netMsg(e, 'USDA'))); }
    out.innerHTML = res.join('<br>');
  }

  // ---------- events ----------
  function refreshBehind() { const h = location.hash.replace(/^#/, ''); if (h === 'food') { const y = window.scrollY; $('#view').innerHTML = WO.routes.food(); window.scrollTo(0, y); } }
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-fa]'); if (!a) return;
    const act = a.dataset.fa;
    if (a.tagName === 'A' && act !== 'goto') e.preventDefault();
    if (a.tagName === 'LABEL') e.preventDefault();
    switch (act) {
      case 'day': { const d = addDays(cur, +a.dataset.n); if (d <= todayIso()) { cur = d; refresh(); } break; }
      case 'week': weekOffset = Math.min(0, weekOffset + (+a.dataset.n)); refresh(); break;
      case 'goto': cur = a.dataset.d; break;
      case 'water': { const L = dayW(cur); L.water = Math.max(0, (L.water || 0) + (+a.dataset.n)); save(); refresh(); break; }
      case 'add': openAdd(a.dataset.meal, 'log'); break;
      case 'setmeal': { addCtx.meal = a.dataset.meal; $$('[data-fa="setmeal"]').forEach(b => b.classList.toggle('on', b === a)); const qb = $('form[data-fa-form="quick"] button[type="submit"]'); if (qb) qb.textContent = 'Log to ' + MEAL_NAME[addCtx.meal]; break; }
      case 'tab': addCtx.tab = a.dataset.tab; showAdd(); break;
      case 'dosearch': doSearch(); break;
      case 'food': openFood(a.dataset.fid, { si: +a.dataset.si || 0, q: +a.dataset.q || 1 }); break;
      case 'quicklog': {
        e.stopPropagation(); const f = getFood(a.dataset.fid); if (!f) break;
        if (addCtx && addCtx.target === 'recipe') { openFood(f.id, { si: +a.dataset.si || 0, q: +a.dataset.q || 1, mode: 'recipe' }); break; }
        logEntry(addCtx.date, addCtx.meal, f, +a.dataset.si || 0, +a.dataset.q || 1);
        a.textContent = '✓'; a.classList.add('done'); toast(`Added to ${MEAL_NAME[addCtx.meal]}`); refreshBehind(); break;
      }
      case 'backadd': if (addCtx) showAdd(); else ui().closeSheet(); break;
      case 'qty': {
        const i = $('#dQty'); const cv = +i.value || 0; const dir = +a.dataset.n;
        const gramServing = detail.food.servings[detail.si] && detail.food.servings[detail.si].g === 1;
        const step = gramServing ? 10 : (cv < 1 || (cv === 1 && dir < 0)) ? 0.25 : 1;
        i.value = Math.max(0, Math.round((cv + dir * step) * 100) / 100); updateDetail(); break;
      }
      case 'qtyset': $('#dQty').value = a.dataset.v; updateDetail(); break;
      case 'commit': commitDetail(); break;
      case 'fav': { const id = detail.food.id; persistFood(detail.food); st.favorites = st.favorites.includes(id) ? st.favorites.filter(x => x !== id) : [id].concat(st.favorites); save(); const on = st.favorites.includes(id); a.classList.toggle('on', on); a.textContent = on ? '★' : '☆'; break; }
      case 'edit': editEntry(a.dataset.eid); break;
      case 'delentry': { const r = detail && findEntry(detail.date, detail.eid); if (r) { const L = dayW(detail.date); L[r.m] = L[r.m].filter(x => x.eid !== detail.eid); save(); } detail = null; ui().closeSheet(); refresh(); break; }
      case 'mealmenu': openMealMenu(a.dataset.meal); break;
      case 'copyy': { const n = copyMeal(addDays(cur, -1), cur, a.dataset.meal); save(); ui().closeSheet(); refresh(); if (n) toast(`Copied ${n} item${n > 1 ? 's' : ''} from yesterday`); break; }
      case 'copyday': { let n = 0; MEALS.forEach(([m]) => { n += copyMeal(addDays(cur, -1), cur, m); }); save(); ui().closeSheet(); refresh(); toast(`Copied ${n} items from yesterday`); break; }
      case 'clearmeal': if (confirm('Clear this meal?')) { dayW(cur)[a.dataset.meal] = []; save(); ui().closeSheet(); refresh(); } break;
      case 'mealrecipe': { const m = a.dataset.meal; recipeDraft = { name: `My ${MEAL_NAME[m].toLowerCase()}`, servings: 1, items: day(cur)[m].map(x => ({ fid: x.fid, si: x.si, q: x.q, name: x.name, sl: x.sl, n: Object.assign({}, x.n) })) }; addCtx = { meal: m, date: cur, target: 'recipe', tab: 'search', q: '' }; openRecipe(); break; }
      case 'newfood': openCustomForm(null, a.dataset.code); break;
      case 'editfood': openCustomForm(detail.food.id); break;
      case 'delfood': if (confirm('Delete this ' + detail.food.source + '? Already-logged entries stay.')) { const id = detail.food.id; delete st.foods[id]; st.favorites = st.favorites.filter(x => x !== id); st.recent = st.recent.filter(x => x.fid !== id); save(); if (addCtx) { addCtx.tab = 'mine'; addCtx.target = 'log'; showAdd(); } else ui().closeSheet(); } break;
      case 'newrecipe': recipeDraft = { name: '', servings: 1, items: [] }; addCtx = Object.assign(addCtx || { meal: 'breakfast', date: cur, q: '' }, { target: 'recipe', tab: 'search' }); openRecipe(); break;
      case 'editrecipe': { const f = detail.food; recipeDraft = { id: f.id, name: f.name, servings: f.yield || 1, items: (f.items || []).map(i => Object.assign({}, i)) }; addCtx = Object.assign(addCtx || { meal: 'breakfast', date: cur, q: '' }, { target: 'recipe', tab: 'search' }); openRecipe(); break; }
      case 'raddi': syncRecipeFields(); addCtx.target = 'recipe'; if (addCtx.tab === 'mine' && !Object.values(st.foods).length) addCtx.tab = 'search'; showAdd(); break;
      case 'rdel': syncRecipeFields(); recipeDraft.items.splice(+a.dataset.k, 1); openRecipe(); break;
      case 'rsave': saveRecipe(); break;
      case 'backrecipe': openRecipe(); break;
      case 'closerecipe': recipeDraft = null; if (addCtx) { addCtx.target = 'log'; addCtx.tab = 'mine'; showAdd(); } else ui().closeSheet(); break;
      case 'tgl': a.classList.toggle('on'); break;
      case 'macromode': st.goals.macroMode = a.dataset.v; if (a.dataset.v === 'manual') { const T = targets(); st.goals.carbs = T.c; st.goals.fat = T.f; st.goals.macroMode = 'manual'; } save(); refresh(); break;
      case 'toggle': st.goals[a.dataset.k] = !st.goals[a.dataset.k]; save(); refresh(); break;
      case 'stoggle': st.settings[a.dataset.k] = !st.settings[a.dataset.k]; save(); refresh(); break;
      case 'testapi': testApis(); break;
      case 'clearlog': if (confirm('Delete all food logs, water and weights? Foods, recipes and goals stay.')) { st.log = {}; st.weights = {}; save(); refresh(); } break;
      case 'wsave': { const v = num($('#wVal').value); const d = $('#wDate').value || todayIso(); if (!(v > 0)) { alert('Enter your weight.'); break; } st.weights[d] = Math.round(v * 10) / 10; save(); refresh(); toast('Weight saved'); break; }
      case 'wdel': delete st.weights[a.dataset.d]; save(); refresh(); break;
      default: break;
    }
  });
  document.addEventListener('submit', e => {
    const f = e.target.closest('[data-fa-form]'); if (!f) return; e.preventDefault();
    const k = f.dataset.faForm;
    if (k === 'search') { addCtx.q = $('#fQ').value.trim(); $('#fQ').blur(); doSearch(); }
    else if (k === 'barcode') lookupBarcode($('#fCode').value);
    else if (k === 'custom') saveCustom();
    else if (k === 'quick') {
      const v = id => num($('#' + id).value);
      const n = { kcal: v('qKcal') || 0, p: v('qP') || 0, c: v('qC') || 0, f: v('qF') || 0 }; if (v('qFi') != null) n.fiber = v('qFi');
      if (!n.kcal && !n.p && !n.c && !n.f) { alert('Enter calories or at least one macro.'); return; }
      const name = $('#qName').value.trim() || 'Quick add';
      if (detail && detail.mode === 'quickedit') {
        const r = findEntry(detail.date, detail.eid); if (r) { r.e.name = name; r.e.n = n; save(); }
        detail = null; ui().closeSheet(); refresh(); return;
      }
      if (addCtx.target === 'recipe') { recipeDraft.items.push({ fid: null, si: 0, q: 1, name, sl: 'quick add', n }); openRecipe(); return; }
      const tg = $('[data-fa="tgl"]');
      if (tg && tg.classList.contains('on')) { const food = { id: uid('custom'), name, source: 'custom', servings: [{ label: '1 serving', n }] }; st.foods[food.id] = food; logEntry(addCtx.date, addCtx.meal, food, 0, 1); }
      else { dayW(addCtx.date)[addCtx.meal].push({ eid: uid('e'), fid: null, si: 0, q: 1, sl: 'Quick add', name, brand: '', n }); save(); }
      ui().closeSheet(); refresh(); toast(`Logged ${name} to ${MEAL_NAME[addCtx.meal]}`);
    }
  });
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'fQ') { addCtx.q = t.value; refreshResults(); return; }
    if (t.id === 'dQty') { updateDetail(); return; }
    if (t.id === 'fatShare') { st.goals.fatShare = +t.value; save(); const T = targets(); $('#fsv').textContent = t.value + '%'; $('#splitInfo').innerHTML = `${st.goals.kcal - st.goals.protein * 4} kcal left after protein → <b style="color:var(--text)">${T.c} g carbs</b> · <b style="color:var(--text)">${T.f} g fat</b>`; }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'fDate' && t.value) { cur = t.value > todayIso() ? todayIso() : t.value; refresh(); return; }
    if (t.id === 'dServ' || t.id === 'dMeal') { updateDetail(); return; }
    const k = t.dataset.fg; if (!k) return;
    if (k === 'usdaKey') { st.settings.usdaKey = t.value.trim() || 'DEMO_KEY'; Object.keys(searchCache).forEach(x => { if (x.startsWith('usda|')) delete searchCache[x]; }); save(); return; }
    if (k === 'waterUnit') { st.goals.waterUnit = t.value; save(); return; }
    if (k === 'fatShare') return;
    const v = num(t.value); if (v == null || v < 0) return;
    st.goals[k] = v; save(); refresh();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopScan(); });

  // ---------- registration ----------
  WO.routes = WO.routes || {};
  WO.routes.food = arg => { if (cur > todayIso()) cur = todayIso(); return arg === 'goals' ? renderGoals() : arg === 'progress' ? renderProgress() : renderDashboard(); };
  WO.sheetCloseHooks = (WO.sheetCloseHooks || []).concat(() => { stopScan(); });
  WO.food = {
    exportData: () => st,
    importData: d => { if (d && d.v === 1) { localStorage.setItem(KEY, JSON.stringify(d)); st = load(); } },
    reset: () => { localStorage.removeItem(KEY); st = defaults(); },
    reload: () => { st = load(); },
    toast: m => toast(m),
    targets, _normOFF: normOFF, _normUSDA: normUSDA, _lookupBarcode: lookupBarcode
  };
})();
