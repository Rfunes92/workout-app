/* v18: lift history, auto-progression with a "why", goal-type progress charts, and workout CSV export/import
   (Mount Up format, plus Strong and Hevy exports). History lives in the workout state (state.hist), so it is part of the
   normal localStorage save, the JSON backup and the cloud workout doc. */
(function () {
  'use strict';
  const WO = window.WO;
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const r1 = n => Math.round(n * 10) / 10;
  const roundTo = (n, step) => Math.round(n / step) * step;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MAX_PER_EX = 40;

  // ---------- history ----------
  // state.hist = { exId: [{ d: 'YYYY-MM-DD', w: number|null, r: [reps per set], rr: chosen reps }] }, oldest first
  // state.days = { 'YYYY-MM-DD': sets done that day } (kept long-term; drives sessions/week)
  const H = st => (st.hist = st.hist || {});
  function entries(st, id) { return (H(st)[id] || []).slice().sort((a, b) => (a.d < b.d ? -1 : 1)); }
  function entryOn(st, id, d, create) {
    const list = H(st)[id] = H(st)[id] || [];
    let e = list.find(x => x.d === d);
    if (!e && create) { e = { d, w: null, r: [] }; list.push(e); list.sort((a, b) => (a.d < b.d ? -1 : 1)); if (list.length > MAX_PER_EX) list.splice(0, list.length - MAX_PER_EX); }
    return e || null;
  }
  const worked = e => e && (e.r || []).some(n => n > 0);
  function lastBefore(st, id, d) { const l = entries(st, id).filter(e => e.d < d && worked(e)); return l[l.length - 1] || null; }

  // '8–12' -> {lo:8, hi:12}; '12–15/side' ok; time-based ('30–45s', '40s walk', '12 min…') -> null (no load progression)
  function range(reps) {
    const s = String(reps || '');
    if (/\d\s*s\b|sec|min\b|walk|round|EMOM/i.test(s)) return null;
    const m = s.match(/(\d+)(?:\s*[–-]\s*(\d+))?/); if (!m) return null;
    return { lo: +m[1], hi: +(m[2] || m[1]) };
  }
  const isLower = ex => /quads|glutes|hamstrings/.test(ex.primary.join());
  const incFor = (ex, units) => units === 'kg' ? (isLower(ex) ? 5 : 2.5) : (isLower(ex) ? 10 : 5);
  const progressable = ex => ex && ex.kind !== 'mobility' && ex.kind !== 'cardio';

  // Double progression with a plain-English reason. Returns { w, reps, why, inc, tone } or null.
  function suggest(st, ex, item, date) {
    if (!progressable(ex) || !item) return null;
    const rg = range(item.reps); if (!rg) return null;
    const u = (st.profile && st.profile.units) || 'lb', inc = incFor(ex, u), today = iso(date || new Date());
    const last = lastBefore(st, ex.id, today);
    const deload = WO.blockWeek ? WO.blockWeek(st, date || new Date()) === 4 : false;
    const target = `${rg.lo}${rg.hi !== rg.lo ? '–' + rg.hi : ''}`;
    if (!last) return { w: null, reps: rg.lo, inc, tone: 'start', why: `First log: pick a weight you can do for ${target} with 1–2 reps left in the tank. Next time we'll tell you what to lift.` };
    const done = last.r.filter(n => n > 0), sets = done.length, minR = Math.min(...done), maxR = Math.max(...done), w = +last.w || 0;
    const desc = minR === maxR ? `${sets}×${minR}` : `${done.join('/')} reps`;
    const when = last.d === iso(new Date(Date.now() - 864e5)) ? 'yesterday' : 'last time';
    if (!w) { // bodyweight / band: progress reps
      if (sets >= item.sets && minR >= rg.hi) return { w: null, reps: rg.hi + 2, inc, tone: 'up', why: `You hit ${desc} ${when} — top of ${target}. Go for ${rg.hi + 2}, or slow the lowering to 3 s / use a harder band.` };
      return { w: null, reps: Math.min(rg.hi, minR + 1), inc, tone: 'same', why: `You hit ${desc} ${when}. Aim for ${Math.min(rg.hi, minR + 1)}+ per set; at ${rg.hi} on every set, make it harder.` };
    }
    if (deload) { const dw = Math.max(0, roundTo(w * 0.9, inc / 2)); return { w: dw, reps: rg.lo, inc, tone: 'deload', why: `Deload week: ~10% lighter than ${w} ${u} (${dw}). Leave 3–4 reps in the tank; next week you come back stronger.` }; }
    if (sets >= item.sets && minR >= rg.hi) return { w: w + inc, reps: rg.lo, inc, tone: 'up', why: `You hit ${desc} at ${w} ${u} ${when} — the top of ${target} — so try ${w + inc}.` };
    if (minR < rg.lo) {
      const prev = entries(st, ex.id).filter(e => e.d < last.d && worked(e)).pop();
      const missedTwice = prev && +prev.w === w && Math.min(...prev.r.filter(n => n > 0)) < rg.lo;
      if (missedTwice && w - inc > 0) return { w: w - inc, reps: rg.lo, inc, tone: 'down', why: `Under ${rg.lo} reps at ${w} ${u} twice in a row. Drop to ${w - inc}, own the range, then climb back.` };
      return { w, reps: rg.lo, inc, tone: 'same', why: `You got ${desc} at ${w} ${u} ${when}, under ${rg.lo}. Stay at ${w} and own ${target} first.` };
    }
    if (sets < item.sets) return { w, reps: Math.min(rg.hi, minR + 1), inc, tone: 'same', why: `You did ${sets} of ${item.sets} sets at ${w} ${u} ${when}. Same weight — finish all ${item.sets} sets first.` };
    return { w, reps: Math.min(rg.hi, minR + 1), inc, tone: 'same', why: `You hit ${desc} at ${w} ${u} ${when}. Same weight, aim for ${Math.min(rg.hi, minR + 1)}+ per set — at ${rg.hi} on every set, go up.` };
  }

  // A set was ticked / unticked: write the real numbers into today's entry.
  function recordSet(st, ex, item, i, on, date) {
    if (!progressable(ex)) return;
    const d = iso(date || new Date()), e = entryOn(st, ex.id, d, true);
    const sg = suggest(st, ex, item, date) || {};
    const last = st.log && st.log[ex.id];
    if (e.w == null) e.w = sg.w != null ? sg.w : (last && +last.w) || null;
    const rg = range(item.reps);
    const reps = e.rr || sg.reps || (rg && rg.lo) || 0;
    while (e.r.length < item.sets) e.r.push(0);
    e.r[i] = on ? reps : 0;
    if (!worked(e) && e.w == null && !e.rr) { const l = H(st)[ex.id]; l.splice(l.indexOf(e), 1); }
  }
  function setToday(st, ex, field, val, date) {
    const d = iso(date || new Date()), e = entryOn(st, ex.id, d, true);
    if (field === 'w') { e.w = val > 0 ? r1(val) : null; if (e.w != null) { st.log = st.log || {}; st.log[ex.id] = { w: String(e.w), d }; } }
    if (field === 'rr') { e.rr = val > 0 ? Math.round(val) : null; e.r = (e.r || []).map(n => (n > 0 && e.rr ? e.rr : n)); }
    return e;
  }
  function countDay(st, d, n) { st.days = st.days || {}; if (n > 0) st.days[d] = n; else delete st.days[d]; }

  // ---------- goal types ----------
  const GOAL_TYPES = {
    strength: { label: 'Get stronger', icon: '🏋️', desc: 'Heavier main lifts. Chart: estimated 1-rep max.', goals: ['strength'] },
    muscle: { label: 'Build muscle', icon: '💪', desc: 'More volume, 6–12 reps. Chart: weekly training volume.', goals: ['muscle', 'sculpt'] },
    lose_fat: { label: 'Lose fat', icon: '🔥', desc: 'Keep muscle, add finishers. Chart: weight vs your goal.', goals: ['fat_loss', 'sculpt'] },
    feel_better: { label: 'Feel better', icon: '🌿', desc: 'Energy, mobility, consistency. Chart: sessions per week.', goals: ['general', 'mobility'] }
  };
  function goalTypeOf(st) {
    const t = st.profile && st.profile.goalType; if (GOAL_TYPES[t]) return t;
    const g = st.goals || [];
    if (g.includes('fat_loss')) return 'lose_fat'; if (g.includes('strength')) return 'strength'; if (g.includes('muscle') || g.includes('sculpt')) return 'muscle';
    return 'feel_better';
  }

  // ---------- charts ----------
  const mondayIso = ds => { const d = new Date(ds + 'T00:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); };
  function weeksBack(n) { const out = [], m = new Date(); m.setHours(0, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); for (let i = n - 1; i >= 0; i--) { const d = new Date(m); d.setDate(d.getDate() - 7 * i); out.push(iso(d)); } return out; }
  function bars(vals, labels, fmt, goal) {
    const W = 320, H = 130, bot = 18, top = 14, max = Math.max(1, goal || 0, ...vals), bw = W / vals.length * 0.62, y = v => top + (H - bot - top) * (1 - v / max);
    let s = goal ? `<line x1="0" x2="${W}" y1="${y(goal).toFixed(1)}" y2="${y(goal).toFixed(1)}" class="ch-goal"/><text x="${W}" y="${(y(goal) - 3).toFixed(1)}" text-anchor="end" class="ch-lab">target ${fmt(goal)}</text>` : '';
    vals.forEach((v, i) => { const x = (i + 0.19) * W / vals.length; s += `<rect x="${x.toFixed(1)}" y="${y(v).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, H - bot - y(v)).toFixed(1)}" rx="4" class="ch-bar"/>${v ? `<text x="${(x + bw / 2).toFixed(1)}" y="${(y(v) - 3).toFixed(1)}" text-anchor="middle" class="ch-lab">${fmt(v)}</text>` : ''}<text x="${(x + bw / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle" class="ch-lab">${labels[i]}</text>`; });
    return `<svg viewBox="0 0 ${W} ${H}" class="chart">${s}</svg>`;
  }
  function lines(series, unit, goal) { // series: [{name, pts:[[t, v]]}]
    const all = series.flatMap(s => s.pts); if (all.length < 2) return '';
    const W = 320, H = 140, pl = 30, pr = 6, pt = 10, pb = 18;
    const t0 = Math.min(...all.map(p => p[0])), t1 = Math.max(...all.map(p => p[0])) || t0 + 1;
    let lo = Math.min(...all.map(p => p[1])), hi = Math.max(...all.map(p => p[1]));
    if (goal > 0) { lo = Math.min(lo, goal); hi = Math.max(hi, goal); }
    if (hi - lo < 4) { lo -= 2; hi += 2; }
    const X = t => pl + (W - pl - pr) * ((t - t0) / ((t1 - t0) || 1)), Y = v => pt + (H - pt - pb) * (1 - (v - lo) / ((hi - lo) || 1));
    let s = [lo, (lo + hi) / 2, hi].map(v => `<line x1="${pl}" x2="${W - pr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="ch-grid"/><text x="${pl - 4}" y="${(Y(v) + 3).toFixed(1)}" text-anchor="end" class="ch-lab">${Math.round(v)}</text>`).join('');
    if (goal > 0) s += `<line x1="${pl}" x2="${W - pr}" y1="${Y(goal).toFixed(1)}" y2="${Y(goal).toFixed(1)}" class="ch-goal"/><text x="${W - pr}" y="${(Y(goal) - 3).toFixed(1)}" text-anchor="end" class="ch-lab">goal ${r1(goal)}</text>`;
    series.forEach((se, i) => {
      if (!se.pts.length) return;
      s += `<path d="M${se.pts.map(p => X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' L')}" class="ch-wline ch-s${i}"/>` + se.pts.map(p => `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="2.4" class="ch-dot ch-s${i}"/>`).join('');
    });
    const fd = t => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    s += `<text x="${pl}" y="${H - 4}" class="ch-lab">${fd(t0)}</text><text x="${W - pr}" y="${H - 4}" text-anchor="end" class="ch-lab">${fd(t1)}</text>`;
    return `<svg viewBox="0 0 ${W} ${H}" class="chart">${s}</svg>` + (series.length > 1 ? `<div class="small muted ch-legend">${series.map((se, i) => `<span><i class="ch-s${i}"></i>${esc(se.name)}</span>`).join('')}</div>` : '');
  }
  const e1rm = (w, r) => w * (1 + Math.min(r, 12) / 30); // Epley, capped so high-rep sets don't inflate it
  const tOf = d => new Date(d + 'T12:00:00').getTime();
  function sessionsPerWeek(st, wk) {
    const days = new Set(Object.keys(st.days || {}).filter(d => st.days[d] > 0));
    Object.values(H(st)).forEach(l => l.forEach(e => { if (worked(e)) days.add(e.d); }));
    return wk.map(m => { let n = 0; days.forEach(d => { if (mondayIso(d) === m) n++; }); return n; });
  }
  function chartCard(st) {
    const type = goalTypeOf(st), T = GOAL_TYPES[type], u = (st.profile && st.profile.units) || 'lb';
    const wk = weeksBack(8), wl = wk.map(m => { const d = new Date(m + 'T00:00:00'); return `${d.getMonth() + 1}/${d.getDate()}`; });
    let body = '', sub = '';
    if (type === 'strength') {
      const ids = Object.keys(H(st)).filter(id => WO.EX_BY_ID[id] && H(st)[id].filter(e => worked(e) && +e.w > 0).length)
        .sort((a, b) => (WO.EX_BY_ID[b].kind === 'compound') - (WO.EX_BY_ID[a].kind === 'compound') || H(st)[b].length - H(st)[a].length).slice(0, 3);
      const series = ids.map(id => ({ name: WO.EX_BY_ID[id].name, pts: entries(st, id).filter(e => worked(e) && +e.w > 0).map(e => [tOf(e.d), r1(e1rm(+e.w, Math.max(...e.r)))]) }));
      body = lines(series, u);
      sub = 'Estimated 1-rep max (from your logged weight × reps) for your main lifts.';
      if (!body) body = `<div class="empty small">Log weight + reps on a lift two sessions in a row and your strength curve appears here.</div>`;
    } else if (type === 'muscle') {
      const vol = wk.map(() => 0), hard = wk.map(() => 0);
      Object.entries(H(st)).forEach(([id, l]) => l.forEach(e => { const i = wk.indexOf(mondayIso(e.d)); if (i < 0 || !worked(e)) return; const reps = e.r.reduce((a, n) => a + n, 0); vol[i] += (+e.w || 0) * reps; hard[i] += e.r.filter(n => n > 0).length; }));
      body = hard.some(Boolean) ? bars(hard, wl, v => String(v)) + `<div class="small muted">Hard sets per week · volume this week: <b style="color:var(--text)">${Math.round(vol[vol.length - 1]).toLocaleString()} ${u}</b> (last week ${Math.round(vol[vol.length - 2]).toLocaleString()})</div>` : `<div class="empty small">Tick sets on Today and your weekly hard sets show up here. 10–20 per muscle per week is the growth zone.</div>`;
      sub = 'Muscle grows from weekly volume: hard sets per week, plus total load moved.';
    } else if (type === 'lose_fat') {
      const f = WO.food && WO.food.exportData ? WO.food.exportData() : {}, ws = Object.entries((f && f.weights) || {}).sort((a, b) => (a[0] < b[0] ? -1 : 1));
      const goal = +((st.profile || {}).goalWeight) || 0;
      body = ws.length >= 2 ? lines([{ name: 'Weight', pts: ws.map(([d, w]) => [tOf(d), +w]) }], u, goal) : `<div class="empty small">Log two weigh-ins (Food → Weekly &amp; weight) to see your trend${goal ? ' against ' + goal + ' ' + u : ''}.</div>`;
      sub = `Weight trend${goal ? ` vs your goal of ${goal} ${u}` : ''}. <a href="#food/progress">Log a weigh-in</a>`;
    } else {
      const n = sessionsPerWeek(st, wk), trainDays = WO.DAYS.filter(d => ['gym', 'home'].includes((st.schedule[d] || {}).type)).length;
      let streak = 0; for (let i = n.length - 2; i >= 0 && n[i] >= Math.min(2, trainDays || 2); i--) streak++;
      body = bars(n, wl, v => String(v), trainDays || null) + `<div class="small muted">${streak ? `🔥 ${streak} week${streak > 1 ? 's' : ''} in a row on track. ` : ''}Showing up beats perfect. No weight goal needed.</div>`;
      sub = 'Sessions per week vs the days you planned.';
    }
    return `<div class="card goal-chart"><div class="row between"><h2>${T.icon} ${esc(T.label)}</h2><a class="small" href="#setup">change goal</a></div><div class="small muted" style="margin:2px 0 6px">${sub}</div>${body}</div>`;
  }

  // ---------- CSV ----------
  function parseCSV(text) {
    text = text.replace(/^\uFEFF/, '');
    const first = text.split(/\r?\n/, 1)[0] || '', delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; continue; }
      if (c === '"') q = true; else if (c === delim) { row.push(cur); cur = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; } else cur += c;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(r => r.some(x => x.trim()));
  }
  const csvCell = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const MOUNTUP_HEAD = ['Date', 'Workout Name', 'Exercise Name', 'Set Order', 'Weight', 'Weight Unit', 'Reps', 'Exercise ID', 'Notes'];
  function exportCSV(st) {
    const u = (st.profile && st.profile.units) || 'lb', names = st.histNames || {}, out = [MOUNTUP_HEAD.join(',')];
    const rows = [];
    Object.entries(H(st)).forEach(([id, l]) => l.forEach(e => { if (!worked(e)) return; e.r.forEach((n, i) => { if (n > 0) rows.push([e.d, 'Mount Up', (WO.EX_BY_ID[id] && WO.EX_BY_ID[id].name) || names[id] || id, i + 1, e.w == null ? '' : e.w, u, n, id, e.src ? 'imported from ' + e.src : '']); }); }));
    rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : a[3] - b[3]));
    rows.forEach(r => out.push(r.map(csvCell).join(',')));
    return out.join('\n') + '\n';
  }
  // name matching for other apps' exercise names ("Bench Press (Barbell)")
  const SYN = { db: 'dumbbell', dumbbells: 'dumbbell', bb: 'barbell', kb: 'kettlebell', bicep: 'curl', biceps: 'curl', tricep: 'triceps', ohp: 'overhead', pullup: 'pull', pulldown: 'pulldown', pushup: 'push', chinup: 'chin', situp: 'sit', rdl: 'romanian', lying: 'lying', extensions: 'extension', raises: 'raise', curls: 'curl', rows: 'row', lunges: 'lunge', squats: 'squat' };
  const STOP = new Set(['the', 'a', 'of', 'with', 'and', 'on', 'machine', 'up', 'ups', 'exercise', 'standing', 'seated', 'grip']);
  const toks = s => String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean).map(t => SYN[t] || t).filter(t => !STOP.has(t));
  const ALIAS = {
    'incline bench press dumbbell': 'incline_db_press', 'incline bench press barbell': 'incline_bb_press', 'bench press dumbbell': 'db_bench', 'bench press barbell': 'bb_bench',
    'squat barbell': 'bb_back_squat', 'deadlift barbell': 'bb_deadlift', 'romanian deadlift barbell': 'bb_rdl', 'romanian deadlift dumbbell': 'db_rdl',
    'overhead press barbell': 'bb_ohp', 'shoulder press dumbbell': 'db_shoulder_press', 'bent over row barbell': 'bb_row', 'bent over row dumbbell': 'db_row',
    'triceps pushdown cable': 'cable_pushdown', 'triceps pushdown': 'cable_pushdown', 'seated leg curl machine': 'leg_curl', 'lying leg curl machine': 'leg_curl',
    'hip thrust barbell': 'bb_hip_thrust', 'pull up': 'pullup', 'chin up': 'chinup', 'push up': 'pushup', 'lat pulldown cable': 'lat_pulldown', 'face pull cable': 'face_pull',
    'calf raise machine': 'calf_machine', 'standing calf raise machine': 'calf_machine', 'lateral raise dumbbell': 'db_lateral_raise', 'skullcrusher barbell': 'skull_crusher', 'skull crusher barbell': 'skull_crusher'
  };
  const LIB = () => (WO._libToks = WO._libToks || WO.EXERCISES.map(e => ({ id: e.id, t: toks(e.name) })));
  function matchExercise(name) {
    const key = String(name).toLowerCase().replace(/[()\-–,]/g, ' ').replace(/\s+/g, ' ').trim();
    if (ALIAS[key]) return ALIAS[key];
    const a = new Set(toks(name)); if (!a.size) return null;
    let best = null, bs = 0;
    // weighted Dice: equipment words count half, so "Hammer Curl (Dumbbell)" prefers Hammer Curl over Dumbbell Curl
    const EQW = new Set(['dumbbell', 'barbell', 'cable', 'kettlebell', 'band', 'smith', 'ez']), wt = x => (EQW.has(x) ? 0.5 : 1), sum = set => { let t = 0; set.forEach(x => { t += wt(x); }); return t; };
    LIB().forEach(L => { const b = new Set(L.t); let n = 0; a.forEach(x => { if (b.has(x)) n += wt(x); }); const sc = 2 * n / (sum(a) + sum(b)) - b.size * 0.001; if (sc > bs) { bs = sc; best = L.id; } });
    return bs >= 0.7 ? best : null;
  }
  const slug = s => 'x:' + String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  function parseDate(s) {
    s = String(s || '').trim(); let m;
    if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return `${m[1]}-${m[2]}-${m[3]}`;
    if ((m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/))) return `${m[3]}-${pad(MON[m[2].toLowerCase()] + 1)}-${pad(+m[1])}`; // Hevy: "28 Mar 2024, 17:46"
    if ((m = s.match(/^([A-Za-z]{3})[a-z]*\s+(\d{1,2}),?\s+(\d{4})/))) return `${m[3]}-${pad(MON[m[1].toLowerCase()] + 1)}-${pad(+m[2])}`;
    if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))) return `${m[3]}-${pad(+m[1])}-${pad(+m[2])}`; // US m/d/yyyy
    const d = new Date(s); return isNaN(d) ? null : iso(d);
  }
  // Returns { format, sets, sessions, matched, unmatched:[names], skipped }
  function importCSV(st, text) {
    const rows = parseCSV(text); if (rows.length < 2) throw new Error('That file has no workout rows.');
    const head = rows[0].map(h => h.trim().toLowerCase()), col = (...names) => names.map(n => head.indexOf(n)).find(i => i >= 0);
    let fmt, iDate, iName, iW, iReps, iType, iUnit, iId, kgCol = false;
    if (head.includes('exercise_title')) { fmt = 'Hevy'; iDate = col('start_time'); iName = col('exercise_title'); iW = col('weight_lbs', 'weight_kg'); kgCol = head[iW] === 'weight_kg'; iReps = col('reps'); iType = col('set_type'); }
    else if (head.includes('exercise name')) { fmt = head.includes('exercise id') ? 'Mount Up' : 'Strong'; iDate = col('date'); iName = col('exercise name'); iW = col('weight', 'weight (kg)', 'weight (lbs)'); iReps = col('reps'); iUnit = col('weight unit'); iId = col('exercise id'); iType = col('set order'); kgCol = /kg/.test(head[iW] || ''); }
    else throw new Error('Not a Hevy, Strong or Mount Up CSV (no exercise column found).');
    if (iDate == null || iName == null || iReps == null) throw new Error(`${fmt} CSV is missing date, exercise or reps columns.`);
    const u = (st.profile && st.profile.units) || 'lb', conv = (w, from) => (from === u || !from ? w : from === 'kg' ? w * 2.20462 : w / 2.20462);
    const groups = {}, unmatched = new Set(); let skipped = 0, sets = 0;
    rows.slice(1).forEach(r => {
      const reps = parseFloat(r[iReps]); const typ = iType != null ? String(r[iType] || '').toLowerCase() : '';
      if (!(reps > 0) || typ === 'warmup' || typ === 'w') { skipped++; return; }
      const d = parseDate(r[iDate]); const name = (r[iName] || '').trim(); if (!d || !name) { skipped++; return; }
      let id = iId != null && r[iId] && (WO.EX_BY_ID[r[iId]] || /^x:/.test(r[iId])) ? r[iId] : matchExercise(name);
      if (!id) { id = slug(name); unmatched.add(name); st.histNames = st.histNames || {}; st.histNames[id] = name; }
      let w = parseFloat(String(r[iW] || '').replace(',', '.')); const from = iUnit != null && r[iUnit] ? r[iUnit].trim().toLowerCase() : kgCol ? 'kg' : u;
      w = w > 0 ? r1(conv(w, from)) : 0;
      const g = groups[id + '|' + d] = groups[id + '|' + d] || { id, d, sets: [] };
      g.sets.push([w, Math.round(reps)]); sets++;
    });
    const sessions = new Set(); let added = 0;
    Object.values(groups).forEach(g => {
      const top = Math.max(...g.sets.map(s => s[0])), work = g.sets.filter(s => s[0] === top);
      const list = H(st)[g.id] = H(st)[g.id] || [];
      if (list.some(e => e.d === g.d && worked(e))) return; // never overwrite what was logged in-app
      const old = list.findIndex(e => e.d === g.d); if (old >= 0) list.splice(old, 1);
      list.push({ d: g.d, w: top > 0 ? top : null, r: work.map(s => s[1]), src: fmt }); added++;
      list.sort((a, b) => (a.d < b.d ? -1 : 1)); if (list.length > MAX_PER_EX) list.splice(0, list.length - MAX_PER_EX);
      if (top > 0 && WO.EX_BY_ID[g.id]) { st.log = st.log || {}; const l = st.log[g.id]; if (!l || (l.d || '') <= g.d) st.log[g.id] = { w: String(top), d: g.d }; }
      sessions.add(g.d); st.days = st.days || {}; st.days[g.d] = Math.max(st.days[g.d] || 0, work.length);
    });
    return { format: fmt, sets, entries: added, sessions: sessions.size, unmatched: Array.from(unmatched), skipped };
  }

  WO.progress = { entries, entryOn, lastBefore, range, suggest, recordSet, setToday, countDay, GOAL_TYPES, goalTypeOf, chartCard, exportCSV, importCSV, parseCSV, matchExercise, incFor, progressable };
})();
