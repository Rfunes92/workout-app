/* v18 guided session player: preview → start → one exercise at a time with the coach demo, set circles, skip / back /
   repeat, a always-visible session timer bar, voice cues you can mute (rest beeps stay), and resume after reload.
   Logging goes through the same set circles as Today, so it's all localStorage first (works fully offline). */
(function () {
  'use strict';
  const WO = window.WO;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const KEY = () => WO.ns('mountup.session');
  const VOICE = 'mountup.voice';
  let S = null; // { day, date, idx, startedAt, skipped: [keys], ended }
  let iv = null, root = null, wake = null;
  const ui = () => WO.ui;
  const load = () => { try { S = JSON.parse(localStorage.getItem(KEY())); } catch (e) { S = null; } const today = ui() ? ui().iso(new Date()) : ''; if (S && S.date !== today) S = null; };
  const persist = () => { try { if (S) localStorage.setItem(KEY(), JSON.stringify(S)); else localStorage.removeItem(KEY()); } catch (e) { /* ignore */ } };
  const voiceOn = () => { try { return localStorage.getItem(VOICE) !== 'off'; } catch (e) { return true; } };
  function say(text) {
    if (!voiceOn() || !window.speechSynthesis) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 1.02; speechSynthesis.speak(u); } catch (e) { /* no voice */ }
  }
  function steps(day) {
    const s = ui().getWeek()[day]; if (!s) return [];
    const tag = (arr, sec) => arr.map(it => Object.assign({ sec }, it));
    return [...tag(s.warmup, 'Warm-up'), ...tag(s.items, s.type === 'rest' ? 'Recovery' : 'Workout'), ...tag(s.finisher ? [s.finisher] : [], 'Finisher'), ...tag(s.cooldown || [], 'Cool-down')];
  }
  const doneCount = (day, list) => list.reduce((a, it) => a + ui().getDone(day, it.key, it.sets).filter(Boolean).length, 0);
  const total = list => list.reduce((a, it) => a + it.sets, 0);
  const active = () => !!(S && !S.ended && Date.now() - S.startedAt < 4 * 3600e3); // a forgotten session stops counting as 'running' after 4 h
  const fmtClock = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
  const presc = it => `${it.sets > 1 ? it.sets + ' × ' : ''}${esc(it.reps)}`;

  // ---------- preview (sheet) ----------
  function preview(day) {
    const list = steps(day), s = ui().getWeek()[day];
    load(); const skipped = new Set(S && S.day === day ? S.skipped : (pre[day] || []));
    const html = `<div class="sheet-head"><div><div class="tag">Preview · ${esc(s.locName || '')} · ~${s.minutes || 0} min</div><h1 style="font-size:22px;margin-top:4px">${esc(s.title)}</h1></div><button class="close-x" data-close aria-label="Close">✕</button></div>
      <div class="small muted" style="margin:4px 0 8px">Everything in today's session, in order. Tap <b>Skip</b> on anything you want to leave out — nothing is locked.</div>
      <div class="card" style="padding:4px 12px">${list.map(it => { const ex = WO.EX_BY_ID[it.exId], sk = skipped.has(it.key); return `<div class="list-row ${sk ? 'skipped' : ''}"><div class="ex-thumb" data-demo="${ex.id}" data-open="${ex.id}" style="width:44px;height:44px;flex-basis:44px"></div><div class="grow"><b>${esc(ex.name)}</b><div class="small muted">${esc(it.sec)} · ${presc(it)}</div></div><button class="btn sm ghost" data-sess-preskip="${day}|${esc(it.key)}">${sk ? 'Undo' : 'Skip'}</button></div>`; }).join('')}</div>
      <button class="btn block" data-sess-start="${day}" style="margin-top:6px">▶ Start guided session</button>`;
    ui().openSheet(html);
  }
  const pre = {}; // pre-start skips per day

  // ---------- player ----------
  function ensureRoot() {
    if (root) return root;
    root = document.createElement('section'); root.id = 'sessionScreen'; root.className = 'session hidden'; root.setAttribute('aria-label', 'Guided session');
    document.body.appendChild(root); return root;
  }
  function start(day, opts) {
    load();
    if (!S || S.day !== day || (opts && opts.fresh)) S = { day, date: ui().iso(new Date()), idx: 0, startedAt: Date.now(), skipped: (pre[day] || []).slice() };
    S.ended = false;
    const list = steps(day); while (S.idx < list.length - 1 && S.skipped.includes(list[S.idx].key)) S.idx++;
    persist(); ui().closeSheet(); open(); announce();
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(w => { wake = w; }).catch(() => {}); } catch (e) { /* ignore */ }
  }
  function open() { ensureRoot().classList.remove('hidden'); document.documentElement.classList.add('in-session'); paint(); clearInterval(iv); iv = setInterval(tickBar, 1000); }
  function minimize() { if (root) root.classList.add('hidden'); document.documentElement.classList.remove('in-session'); clearInterval(iv); ui().rerender(true); }
  function end(save) {
    if (S) { S.ended = true; S.endedAt = Date.now(); }
    persist(); if (!save) { S = null; persist(); }
    try { if (wake) wake.release(); } catch (e) { /* ignore */ } wake = null;
    if (save) paint(); else { if (root) root.classList.add('hidden'); document.documentElement.classList.remove('in-session'); clearInterval(iv); ui().rerender(true); }
  }
  function cur() { const list = steps(S.day); return { list, it: list[Math.min(S.idx, list.length - 1)] }; }
  function announce() {
    if (!S) return; const { list, it } = cur(); if (!it) return; const ex = WO.EX_BY_ID[it.exId];
    const sg = WO.progress && WO.flags.isOn('auto_progress') ? WO.progress.suggest(ui().getState(), ex, it) : null;
    say(`${it.sec === 'Workout' ? '' : it.sec + '. '}${ex.name}. ${it.sets > 1 ? it.sets + ' sets of ' : ''}${String(it.reps).replace('–', ' to ')}${sg && sg.w ? '. Try ' + sg.w + ' ' + ui().getState().profile.units : ''}.`);
    void list;
  }
  function go(delta) {
    const list = steps(S.day); let i = S.idx + delta;
    while (i >= 0 && i < list.length && S.skipped.includes(list[i].key)) i += delta > 0 ? 1 : -1;
    if (i >= list.length) { end(true); say('Session complete. You mounted up.'); return; }
    S.idx = Math.max(0, i); persist(); paint(); announce();
  }
  function tickBar() {
    if (!S || !root) return; const list = steps(S.day), d = doneCount(S.day, list), t = total(list);
    const el = $('#sessClock', root); if (el) el.textContent = fmtClock((S.endedAt || Date.now()) - S.startedAt);
    const b = $('#sessFill', root); if (b) b.style.width = (t ? Math.round(d / t * 100) : 0) + '%';
    const c = $('#sessCount', root); if (c) c.textContent = `${d}/${t} sets`;
  }
  function paint() {
    if (!S || !root) return;
    const { list, it } = cur(), s = ui().getWeek()[S.day];
    const d = doneCount(S.day, list), t = total(list);
    const bar = `<div class="sess-bar"><button class="close-x" data-sess="min" aria-label="Minimize session" title="Minimize — the session keeps running">▾</button>
      <div class="grow"><div class="row between small"><b id="sessClock">${fmtClock((S.endedAt || Date.now()) - S.startedAt)}</b><span id="sessCount" class="muted">${d}/${t} sets</span></div><div class="progress"><div id="sessFill" style="width:${t ? Math.round(d / t * 100) : 0}%"></div></div></div>
      <button class="btn sm ghost" data-sess="voice" aria-pressed="${voiceOn()}" title="Voice cues (beeps always stay on)">${voiceOn() ? '🔊 Voice' : '🔇 Voice'}</button></div>`;
    if (S.ended) {
      const sk = list.filter(x => S.skipped.includes(x.key));
      root.innerHTML = `<div class="sess-inner">${bar}<div class="hero rest" style="margin-top:14px"><span class="tag">Session complete</span><h1 style="margin-top:6px">You mounted up.</h1>
        <div class="stats"><div><b>${d}/${t}</b>sets</div><div><b>${fmtClock(S.endedAt - S.startedAt)}</b>time</div><div><b>${sk.length}</b>skipped</div></div></div>
        ${sk.length ? `<div class="small muted">Skipped: ${sk.map(x => esc(WO.EX_BY_ID[x.exId].name)).join(', ')}</div>` : ''}
        <div class="row" style="gap:8px;margin-top:14px"><button class="btn ghost grow" data-sess="repeat">↻ Repeat session</button><button class="btn grow" data-sess="close">Done</button></div></div>`;
      return;
    }
    const ex = WO.EX_BY_ID[it.exId], allDone = ui().getDone(S.day, it.key, it.sets).every(Boolean), next = list.slice(S.idx + 1).find(x => !S.skipped.includes(x.key));
    root.innerHTML = `<div class="sess-inner">${bar}
      <div class="row between" style="margin-top:10px"><span class="tag">${esc(it.sec)} · ${S.idx + 1} of ${list.length}</span><span class="small muted">${esc(s.title)}</span></div>
      <div class="demo" data-sess-demo="${ex.id}"></div>
      ${ui().itemCard(S.day, it, { inSession: true, noSwap: true, noWeight: ex.kind === 'mobility' || ex.kind === 'cardio' || it.sec === 'Warm-up' || it.sec === 'Cool-down' })}
      ${allDone && next ? `<button class="btn block" data-sess="next">Next: ${esc(WO.EX_BY_ID[next.exId].name)} ▶</button>` : ''}
      <div class="sess-nav"><button class="btn ghost" data-sess="prev" ${S.idx === 0 ? 'disabled' : ''}>◀ Back</button><button class="btn ghost" data-sess="redo" title="Clear this exercise's sets and do it again">↻ Repeat</button><button class="btn ghost" data-sess="skip">Skip ⏭</button>${next ? `<button class="btn ghost" data-sess="next">Next ▶</button>` : `<button class="btn" data-sess="finish">Finish ✓</button>`}</div>
      ${next ? `<div class="small muted" style="text-align:center;margin-top:8px">Up next: ${esc(WO.EX_BY_ID[next.exId].name)} · ${presc(next)}</div>` : ''}</div>`;
    const dm = $('[data-sess-demo]', root); if (dm) WO.mountDemo(dm, ex, { coach: WO.flags.isOn('coach_mode') });
    WO.ui.mountDemos(root);
  }
  // called by app.js after a set circle is ticked anywhere
  function onSet(day, key, allDone) {
    if (!active() || S.day !== day) return;
    const { it } = cur();
    if (it && it.key === key && allDone) say('Exercise done. ' + (steps(S.day).slice(S.idx + 1).some(x => !S.skipped.includes(x.key)) ? 'Tap next when you are ready.' : 'Last one. Finish when ready.'));
    if (root && !root.classList.contains('hidden')) paint(); else tickBar();
  }

  document.addEventListener('click', e => {
    const t = e.target;
    const ps = t.closest('[data-sess-preskip]');
    if (ps) { const [day, key] = ps.dataset.sessPreskip.split('|'); load(); const arr = S && S.day === day ? S.skipped : (pre[day] = pre[day] || []); const i = arr.indexOf(key); if (i >= 0) arr.splice(i, 1); else arr.push(key); persist(); preview(day); return; }
    const st = t.closest('[data-sess-start]'); if (st) { start(st.dataset.sessStart); return; }
    const pv = t.closest('[data-sess-preview]'); if (pv) { preview(pv.dataset.sessPreview); return; }
    const rs = t.closest('[data-sess-resume]'); if (rs) { load(); if (S) open(); return; }
    const a = t.closest('[data-sess]'); if (!a || !S) return;
    const k = a.dataset.sess;
    if (k === 'min') minimize();
    else if (k === 'voice') { try { localStorage.setItem(VOICE, voiceOn() ? 'off' : 'on'); } catch (err) { /* ignore */ } if (!voiceOn() && window.speechSynthesis) speechSynthesis.cancel(); paint(); }
    else if (k === 'next') go(1);
    else if (k === 'prev') go(-1);
    else if (k === 'skip') { const { it } = cur(); if (!S.skipped.includes(it.key)) S.skipped.push(it.key); go(1); }
    else if (k === 'redo') { const { it } = cur(); ui().clearItem(S.day, it.key); S.skipped = S.skipped.filter(x => x !== it.key); persist(); paint(); say('Again. ' + WO.EX_BY_ID[it.exId].name); }
    else if (k === 'finish') { end(true); say('Session complete. You mounted up.'); }
    else if (k === 'repeat') { const day = S.day; ui().clearDay(day); pre[day] = []; start(day, { fresh: true }); }
    else if (k === 'close') { end(false); }
  });

  load();
  WO.session = {
    active, preview, start, onSet, open, minimize,
    state: () => S,
    bannerHtml: day => {
      load(); if (!S || S.day !== day) return '';
      const list = steps(day), d = doneCount(day, list), t = total(list);
      if (S.ended) return '';
      return `<div class="sess-mini" data-sess-resume><div class="grow"><div class="row between small"><b>⏱ Session running · ${fmtClock(Date.now() - S.startedAt)}</b><span class="muted">${d}/${t} sets</span></div><div class="progress"><div style="width:${t ? Math.round(d / t * 100) : 0}%"></div></div></div><span class="btn sm">Resume</span></div>`;
    },
    isSkipped: (day, key) => { load(); return !!(S && S.day === day && S.skipped.includes(key)); }
  };
})();
