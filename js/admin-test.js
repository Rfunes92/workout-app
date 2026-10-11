/* Admin → Test: Ronnie's tester feedback list (bugs / improvements / tester notes) that Titan batches into updates.
   Storage: Firestore collection testFeedback/{id} (admin-only read/write, see firestore.rules) + a localStorage mirror,
   so it works before the rules are published. Merge is last-write-wins per item on updatedAt (ms). No deletes: use Won't fix. */
const LS = window.localStorage;
const KEY = 'mountup.testFeedback.v1';
const TYPES = { bug: '🐞 Bug', improvement: '✨ Improvement', note: '📝 Tester note' };
const PRI = { high: 'High', med: 'Medium', low: 'Low' };
const STATUS = { open: 'Open', progress: 'In progress', done: 'Done', wontfix: "Won't fix" };
const SCREENS = ['Today', 'Week', 'Exercise demo (mannequin)', 'Guided session', 'Library', 'Food', 'Progress', 'Setup', 'Onboarding', 'Account / sync', 'Admin'];
const SEED_AT = Date.parse('2026-10-11T12:00:00-04:00');
const SEED = [
  { id: 'seed-mannequin-human', title: 'Mannequin needs to look more human', type: 'improvement', priority: 'high', screen: 'Exercise demo (mannequin)', notes: 'Proportions / silhouette still read as a robot. Head, neck, shoulders, hands and feet need more human shape.' },
  { id: 'seed-moves-messy', title: 'Moves look messy (choreography)', type: 'improvement', priority: 'high', screen: 'Exercise demo (mannequin)', notes: 'Demo motion looks jerky / unnatural. Tighten the rep path, timing and easing so each move reads clean.' },
  { id: 'seed-gym-gps', title: 'Nearby gym GPS search (later)', type: 'improvement', priority: 'low', screen: 'Onboarding', notes: 'Later: find nearby gyms by location in the gym picker instead of only the brand list.' },
  { id: 'seed-mannequin-polish', title: 'Remaining mannequin polish if any', type: 'improvement', priority: 'med', screen: 'Exercise demo (mannequin)', notes: 'Catch-all for leftover mannequin issues after the v19 pose audit. Add specifics as you spot them.' }
].map(x => Object.assign({ status: 'open', by: 'Ronnie', createdAt: SEED_AT, updatedAt: SEED_AT }, x));

let items = null;          // id -> item
let filter = 'open';       // 'open' (open + in progress) | 'all'
let editing = null;        // null | 'new' | id
let cloudState = 'local';  // 'local' | 'cloud' | 'denied' | 'error'
let ctx = null;            // { FS, db, user, esc, toast }

function loadLocal() {
  if (items) return items;
  let raw = null; try { raw = JSON.parse(LS.getItem(KEY)); } catch (e) { /* bad json */ }
  if (raw && raw.items) items = raw.items;
  else { items = {}; SEED.forEach(x => { items[x.id] = Object.assign({}, x); }); saveLocal(); }
  return items;
}
function saveLocal() { LS.setItem(KEY, JSON.stringify({ v: 1, items })); }
const isOpen = x => x.status === 'open' || x.status === 'progress';
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const fmt = ms => (ms ? new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
const clean = x => ({ id: x.id, title: x.title || '', type: x.type || 'bug', priority: x.priority || 'med', status: x.status || 'open', notes: x.notes || '', screen: x.screen || '', by: x.by || 'Ronnie', createdAt: x.createdAt || Date.now(), updatedAt: x.updatedAt || Date.now(), doneAt: x.doneAt || null });

// ---------- cloud ----------
async function pull() {
  const { FS, db } = ctx;
  const s = await FS.getDocsFromServer(FS.collection(db, 'testFeedback'));
  const push = [];
  const remote = {};
  s.docs.forEach(d => { remote[d.id] = d.data(); });
  Object.entries(remote).forEach(([id, r]) => { const l = items[id]; if (!l || (r.updatedAt || 0) > (l.updatedAt || 0)) items[id] = clean(Object.assign({ id }, r)); });
  Object.values(items).forEach(l => { const r = remote[l.id]; if (!r || (l.updatedAt || 0) > (r.updatedAt || 0)) push.push(l); });
  saveLocal();
  await Promise.all(push.map(writeCloud));
}
async function writeCloud(x) {
  const { FS, db, user } = ctx;
  await FS.setDoc(FS.doc(db, 'testFeedback', x.id), Object.assign(clean(x), { editor: (user && user.email) || '', serverAt: FS.serverTimestamp() }));
}
function cloudErr(e) { console.warn('Test feedback cloud', e); cloudState = e && e.code === 'permission-denied' ? 'denied' : 'error'; }
async function save(x) {
  items[x.id] = clean(x); saveLocal(); draw();
  if (!ctx || cloudState === 'denied') return;
  try { await writeCloud(items[x.id]); cloudState = 'cloud'; } catch (e) { cloudErr(e); }
  syncLine();
}

// ---------- export ----------
function sorted(list) {
  const so = { progress: 0, open: 1, done: 2, wontfix: 3 }, po = { high: 0, med: 1, low: 2 };
  return list.slice().sort((a, b) => (so[a.status] - so[b.status]) || (po[a.priority] - po[b.priority]) || (b.updatedAt - a.updatedAt));
}
function asText(list) {
  const d = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const lines = [`Mount Up test feedback (${filter === 'open' ? 'open only' : 'all'}): ${list.length} item${list.length === 1 ? '' : 's'}, ${d}`, ''];
  sorted(list).forEach((x, i) => {
    lines.push(`${i + 1}. [${STATUS[x.status]}] [${(TYPES[x.type] || x.type).replace(/^\S+ /, '')}] [${PRI[x.priority]}] ${x.title}`);
    if (x.screen) lines.push(`   Screen/exercise: ${x.screen}`);
    if (x.notes) lines.push(`   Notes: ${x.notes.replace(/\n+/g, ' / ')}`);
    lines.push(`   From ${x.by || 'Ronnie'} · updated ${fmt(x.updatedAt)} · id ${x.id}`);
  });
  return lines.join('\n');
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* fall back */ }
  const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* ignore */ } t.remove(); return ok;
}
function download(list) {
  const blob = new Blob([JSON.stringify({ app: 'Mount Up', exportedAt: new Date().toISOString(), filter, items: sorted(list) }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `mountup-test-feedback-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

// ---------- UI ----------
let box = null;
const esc = s => (ctx ? ctx.esc(s) : String(s == null ? '' : s));
const opts = (o, v) => Object.entries(o).map(([k, l]) => `<option value="${k}"${k === v ? ' selected' : ''}>${esc(l)}</option>`).join('');
function syncLine() {
  const m = box && box.querySelector('#tfSync'); if (!m) return;
  const t = { cloud: ['small ok', 'Synced to Firestore (testFeedback). Titan sees the same list.'], local: ['small muted', 'Saved on this device. Connecting to Firestore…'],
    denied: ['small warn', 'Saved on this device only. Publish the updated firestore.rules (testFeedback) in the Firebase console to sync.'], error: ['small warn', 'Saved on this device only (cloud unreachable). Will sync next time you open this page.'] }[cloudState];
  m.className = t[0]; m.textContent = t[1];
}
function form(x) {
  x = x || { type: 'bug', priority: 'med', status: 'open', by: 'Ronnie' };
  return `<form class="card tf-form" id="tfForm" data-id="${esc(x.id || '')}"><h3 style="margin:0 0 4px">${x.id ? 'Edit item' : 'New item'}</h3>
    <label class="f" for="tfTitle">Title</label><input type="text" id="tfTitle" required maxlength="160" value="${esc(x.title || '')}" placeholder="What did you notice?">
    <div class="tf-grid">
      <div><label class="f" for="tfType">Type</label><select id="tfType">${opts(TYPES, x.type)}</select></div>
      <div><label class="f" for="tfPri">Priority</label><select id="tfPri">${opts(PRI, x.priority)}</select></div>
      <div><label class="f" for="tfStatus">Status</label><select id="tfStatus">${opts(STATUS, x.status)}</select></div>
      <div><label class="f" for="tfBy">Submitted by</label><input type="text" id="tfBy" maxlength="60" value="${esc(x.by || 'Ronnie')}" placeholder="Ronnie or tester name"></div>
    </div>
    <label class="f" for="tfScreen">Screen / exercise (optional)</label><input type="text" id="tfScreen" list="tfScreens" maxlength="120" value="${esc(x.screen || '')}" placeholder="e.g. Today, Food, Goblet squat demo">
    <datalist id="tfScreens">${SCREENS.concat(((window.WO && window.WO.EXERCISES) || []).map(e => e.name)).map(s => `<option value="${esc(s)}">`).join('')}</datalist>
    <label class="f" for="tfNotes">Notes</label><textarea id="tfNotes" rows="4" maxlength="4000" placeholder="Steps, what you expected, device…">${esc(x.notes || '')}</textarea>
    <div class="row wrap" style="gap:8px;margin-top:12px"><button class="btn" type="submit">${x.id ? 'Save' : 'Add item'}</button><button class="btn ghost" type="button" data-tf="cancel">Cancel</button></div></form>`;
}
function itemHtml(x) {
  if (editing === x.id) return form(x);
  const st = x.status;
  const acts = [];
  acts.push(`<button class="btn sm ghost" data-tf="edit" data-id="${esc(x.id)}">Edit</button>`);
  if (st === 'open') acts.push(`<button class="btn sm ghost" data-tf="status" data-st="progress" data-id="${esc(x.id)}">Start</button>`);
  if (isOpen(x)) acts.push(`<button class="btn sm" data-tf="status" data-st="done" data-id="${esc(x.id)}">✓ Mark done</button>`);
  else acts.push(`<button class="btn sm ghost" data-tf="status" data-st="open" data-id="${esc(x.id)}">Reopen</button>`);
  return `<div class="card tf-item tf-${esc(st)}"><div class="tf-top"><b class="tf-title">${esc(x.title)}</b>
      <div class="tf-pills"><span class="pill${x.type === 'bug' ? ' warn' : ''}">${esc(TYPES[x.type] || x.type)}</span><span class="pill tf-p-${esc(x.priority)}">${esc(PRI[x.priority] || x.priority)}</span><span class="pill tf-s-${esc(st)}">${esc(STATUS[st] || st)}</span></div></div>
    ${x.notes ? `<div class="small tf-notes">${esc(x.notes)}</div>` : ''}
    <div class="small muted tf-meta">${x.screen ? `📍 ${esc(x.screen)} · ` : ''}By ${esc(x.by || 'Ronnie')} · Created ${fmt(x.createdAt)} · Updated ${fmt(x.updatedAt)}${x.doneAt && !isOpen(x) ? ` · Closed ${fmt(x.doneAt)}` : ''}</div>
    <div class="row wrap tf-acts">${acts.join('')}</div></div>`;
}
function draw() {
  if (!box || !box.isConnected) return;
  const all = Object.values(items), open = all.filter(isOpen), list = filter === 'open' ? open : all;
  const n = t => open.filter(x => x.type === t).length;
  box.innerHTML = `<div style="color:var(--text)"><div class="admin-flags-head"><div><h2 style="margin:0">Test feedback</h2><div class="small muted">Bugs and improvements you notice while testing. Titan checks this list and batches them into updates.</div></div>
      <div class="row wrap" style="gap:8px"><button class="btn" data-tf="new">+ Add item</button><button class="btn ghost" data-tf="copy">Copy list for Titan</button><button class="btn ghost" data-tf="json">Export JSON</button></div></div>
    <div class="admin-stats" style="margin-top:12px"><div class="stat"><b>${open.length}</b><small>Open</small></div><div class="stat"><b>${n('bug')}</b><small>Open bugs</small></div><div class="stat"><b>${all.filter(x => x.status === 'done').length}</b><small>Done</small></div></div>
    <div class="seg tf-filter" style="margin:12px 0 4px;max-width:320px"><button type="button" data-tf="filter" data-f="open" class="${filter === 'open' ? 'on' : ''}">Open only (${open.length})</button><button type="button" data-tf="filter" data-f="all" class="${filter === 'all' ? 'on' : ''}">All (${all.length})</button></div>
    <div id="tfSync" class="small muted"></div>
    ${editing === 'new' ? form(null) : ''}
    <div class="tf-list">${list.length ? sorted(list).map(itemHtml).join('') : `<div class="card flat small muted">${filter === 'open' ? 'Nothing open. 🎉' : 'No items yet.'}</div>`}</div></div>`;
  syncLine();
  const t = box.querySelector('#tfTitle'); if (t && editing) t.focus();
}
function onClick(e) {
  const b = e.target.closest('[data-tf]'); if (!b || !box.contains(b)) return;
  const a = b.dataset.tf, id = b.dataset.id;
  if (a === 'new') { editing = 'new'; draw(); box.querySelector('#tfForm').scrollIntoView({ block: 'nearest' }); }
  else if (a === 'edit') { editing = id; draw(); }
  else if (a === 'cancel') { editing = null; draw(); }
  else if (a === 'filter') { filter = b.dataset.f; draw(); }
  else if (a === 'status') {
    const x = items[id]; if (!x) return; const now = Date.now();
    save(Object.assign({}, x, { status: b.dataset.st, updatedAt: now, doneAt: ['done', 'wontfix'].includes(b.dataset.st) ? now : null }));
  } else if (a === 'copy' || a === 'json') {
    const all = Object.values(items), list = filter === 'open' ? all.filter(isOpen) : all;
    if (a === 'json') { download(list); return; }
    copy(asText(list)).then(ok => { const msg = ok ? `Copied ${list.length} item${list.length === 1 ? '' : 's'}. Paste it to Titan.` : 'Copy blocked by the browser: use Export JSON.'; if (ctx && ctx.toast) ctx.toast(msg); else alert(msg); });
  }
}
function onSubmit(e) {
  if (e.target.id !== 'tfForm') return; e.preventDefault();
  const f = e.target, v = s => f.querySelector(s).value.trim(), id = f.dataset.id, now = Date.now();
  const title = v('#tfTitle'); if (!title) return;
  const prev = id ? items[id] : null, status = v('#tfStatus');
  const doneAt = ['done', 'wontfix'].includes(status) ? ((prev && prev.status === status && prev.doneAt) || now) : null;
  editing = null;
  save(Object.assign({}, prev || { id: newId(), createdAt: now }, { title, type: v('#tfType'), priority: v('#tfPri'), status, by: v('#tfBy') || 'Ronnie', screen: v('#tfScreen'), notes: f.querySelector('#tfNotes').value.trim(), updatedAt: now, doneAt }));
}

// Called by cloud.js (Admin → Test) with Firestore handles once the admin is signed in.
export async function renderTest(el, c) {
  box = el; ctx = c; loadLocal(); editing = null;
  if (!el.dataset.tfBound) { el.dataset.tfBound = '1'; el.addEventListener('click', onClick); el.addEventListener('submit', onSubmit); }
  cloudState = 'local';
  draw();
  try { await pull(); cloudState = 'cloud'; } catch (e) { cloudErr(e); }
  if (box === el) { if (editing) syncLine(); else draw(); }
}
export const _test = { SEED, KEY, asText: l => asText(l), items: () => items };
