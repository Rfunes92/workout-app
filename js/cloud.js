/* Accounts + cloud sync (Firebase Auth + Cloud Firestore).
   Offline-first: localStorage stays the working copy. When signed in, each logical chunk of data is mirrored to
   users/{uid}/data/{workout|prefs|foodlib|weights} and users/{uid}/foodDays/{YYYY-MM-DD} (one doc per day).
   Conflicts resolve last-write-wins per doc using a client updatedAt (ms) stamped when the local copy changed. */
import { initializeApp } from './vendor/firebase/firebase-app.js';
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, deleteUser,
  reauthenticateWithCredential, reauthenticateWithPopup, EmailAuthProvider
} from './vendor/firebase/firebase-auth.js';

const WO = window.WO;
// Public web config (identifiers, not secrets). Access is enforced by Firestore security rules (users/{uid}/** only).
const CONFIG = {
  apiKey: 'AIzaSyChyX1ViK82MMYKjI3oBFgFa_CuqcXpQbE',
  authDomain: 'torque-fit-e1bae.firebaseapp.com',
  projectId: 'torque-fit-e1bae',
  storageBucket: 'torque-fit-e1bae.firebasestorage.app',
  messagingSenderId: '222153399381',
  appId: '1:222153399381:web:1774fe45a6e52a710708dc'
};
const app = initializeApp(CONFIG);
const auth = getAuth(app);

const LS = window.localStorage;
const $ = s => document.querySelector(s);
const html = document.documentElement;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const K = { uid: 'ronnieAuth.uid', guest: 'ronnieAuth.guest', nudge: 'ronnieAuth.nudgeUntil', dev: 'ronnieAuth.device', redirect: 'ronnieAuth.redirect' };
const BASE = { workout: 'ronnieWorkout.v1', food: 'ronnieFood.v1', theme: 'ronnieWorkout.theme' };
const localUid = WO.authUid || '';
const nsKey = (uid, k) => (uid ? `u:${uid}:${k}` : k);
const TOMB = 'null';
let deviceId = LS.getItem(K.dev);
if (!deviceId) { deviceId = Math.random().toString(36).slice(2, 10); LS.setItem(K.dev, deviceId); }

// ---------- Firestore (loaded lazily: only needed once someone is signed in) ----------
let FS = null, db = null;
async function fs() {
  if (FS) return FS;
  const mod = await import('./vendor/firebase/firebase-firestore.js');
  try { db = mod.initializeFirestore(app, { localCache: mod.persistentLocalCache({ tabManager: mod.persistentMultipleTabManager() }) }); }
  catch (e) { console.warn('Firestore persistence unavailable, using memory cache', e); db = mod.getFirestore(app); }
  FS = mod;
  return FS;
}
const userCol = (uid, c) => FS.collection(db, 'users', uid, c);
const refFor = (uid, k) => { const [c, id] = k.split('/'); return FS.doc(db, 'users', uid, c, id); };
const keyOfDoc = d => (d.ref.parent.id === 'data' ? 'data/' : 'foodDays/') + d.id;

// ---------- hashing (stable key order so Firestore/JSON round-trips compare equal) ----------
function stable(v) {
  if (v === undefined || v === null || typeof v === 'function') return 'null';
  if (typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  return '{' + Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
}
function hash(d) { if (d === null || d === undefined) return TOMB; const s = stable(d); let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + '.' + s.length; }

// ---------- local data <-> cloud docs ----------
function readJSON(k) { try { return JSON.parse(LS.getItem(k)); } catch (e) { return null; } }
function snapshotLocal(uid) { return { workout: readJSON(nsKey(uid, BASE.workout)), food: readJSON(nsKey(uid, BASE.food)), theme: LS.getItem(nsKey(uid, BASE.theme)) || 'dark' }; }
function meaningful(L) {
  const w = L.workout, f = L.food, n = o => Object.keys(o || {}).length;
  return !!((w && (w.setupDone || n(w.log) || n(w.done) || n(w.swaps))) || (f && (n(f.log) || n(f.foods) || n(f.weights) || (f.recent || []).length || (f.favorites || []).length)));
}
function pruneLib(lib) {
  // Keep the doc well under Firestore's 1 MB limit: drop cached search results that nothing references.
  if (JSON.stringify(lib).length < 800000) return lib;
  const keep = new Set([...(lib.favorites || []), ...(lib.recent || []).map(r => r.fid)]);
  const foods = {};
  Object.entries(lib.foods).forEach(([id, f]) => { if (keep.has(id) || f.source === 'custom' || f.source === 'recipe') foods[id] = f; });
  return Object.assign({}, lib, { foods });
}
function toDocs(L) {
  const out = {}, f = L.food;
  if (L.workout) out['data/workout'] = L.workout;
  out['data/prefs'] = { theme: L.theme || 'dark', goals: (f && f.goals) || null, settings: (f && f.settings) || null };
  if (f) {
    out['data/foodlib'] = pruneLib({ foods: f.foods || {}, recent: f.recent || [], favorites: f.favorites || [] });
    out['data/weights'] = { weights: f.weights || {} };
    Object.entries(f.log || {}).forEach(([d, v]) => { if (/^\d{4}-\d{2}-\d{2}$/.test(d) && v) out['foodDays/' + d] = v; });
  }
  return out;
}
function applyDocsToLocal(uid, docs) {
  const L = snapshotLocal(uid);
  const food = L.food || { v: 1 };
  food.v = 1; food.log = food.log || {};
  const t = { w: false, f: false, theme: false };
  for (const [k, d] of Object.entries(docs)) {
    if (k === 'data/workout') { if (d) { L.workout = d; t.w = true; } }
    else if (k === 'data/prefs') { if (d) { if (d.goals) food.goals = d.goals; if (d.settings) food.settings = d.settings; if (d.theme && d.theme !== L.theme) { L.theme = d.theme; t.theme = true; } t.f = true; } }
    else if (k === 'data/foodlib') { if (d) { food.foods = d.foods || {}; food.recent = d.recent || []; food.favorites = d.favorites || []; t.f = true; } }
    else if (k === 'data/weights') { if (d) { food.weights = d.weights || {}; t.f = true; } }
    else if (k.startsWith('foodDays/')) { const day = k.slice(9); if (d) food.log[day] = d; else delete food.log[day]; t.f = true; }
  }
  if (t.w) LS.setItem(nsKey(uid, BASE.workout), JSON.stringify(L.workout));
  if (t.f) LS.setItem(nsKey(uid, BASE.food), JSON.stringify(food));
  if (t.theme) { if (L.theme === 'dark') LS.removeItem(nsKey(uid, BASE.theme)); else LS.setItem(nsKey(uid, BASE.theme), L.theme); }
  return t;
}
// Merge used on first sign-in when both the account and this device have data.
const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'];
function mergeDay(dev, cl) {
  const o = Object.assign({}, dev, cl);
  MEALS.forEach(m => { const seen = new Set(); o[m] = [...(cl[m] || []), ...(dev[m] || [])].filter(e => { const id = e && e.eid; if (!id) return true; if (seen.has(id)) return false; seen.add(id); return true; }); });
  o.water = Math.max(+dev.water || 0, +cl.water || 0);
  return o;
}
function mergeWorkout(dev, cl) {
  if (!cl.setupDone && dev.setupDone) [dev, cl] = [cl, dev]; // keep the settings from whichever copy was actually set up
  const o = Object.assign({}, cl);
  o.setupDone = !!(cl.setupDone || dev.setupDone);
  o.log = Object.assign({}, dev.log, cl.log);
  Object.keys(dev.log || {}).forEach(id => { const a = dev.log[id], b = (cl.log || {})[id]; if (a && b && (a.d || '') > (b.d || '')) o.log[id] = a; });
  o.done = Object.assign({}, dev.done);
  Object.entries(cl.done || {}).forEach(([d, v]) => { o.done[d] = Object.assign({}, o.done[d], v); });
  o.swaps = Object.assign({}, dev.swaps, cl.swaps);
  return o;
}
function mergeDocs(dev, cloud) {
  const out = Object.assign({}, cloud);
  for (const [k, d] of Object.entries(dev)) {
    const c = cloud[k];
    if (!c) { out[k] = d; continue; }
    if (k.startsWith('foodDays/')) out[k] = mergeDay(d, c);
    else if (k === 'data/weights') out[k] = { weights: Object.assign({}, d.weights, c.weights) };
    else if (k === 'data/foodlib') {
      const seen = new Set();
      out[k] = { foods: Object.assign({}, d.foods, c.foods), recent: [...(c.recent || []), ...(d.recent || [])].filter(r => !seen.has(r.fid) && seen.add(r.fid)).slice(0, 40), favorites: [...new Set([...(c.favorites || []), ...(d.favorites || [])])] };
    } else if (k === 'data/workout') out[k] = mergeWorkout(d, c);
    // data/prefs: keep the account's goals/settings/theme
  }
  return out;
}
function summarize(docs) {
  const days = Object.keys(docs).filter(k => k.startsWith('foodDays/') && docs[k] && MEALS.some(m => (docs[k][m] || []).length));
  const w = docs['data/workout'], wts = Object.keys(((docs['data/weights'] || {}).weights) || {});
  const custom = Object.values(((docs['data/foodlib'] || {}).foods) || {}).filter(f => f.source === 'custom' || f.source === 'recipe').length;
  const last = days.sort().slice(-1)[0];
  return `${days.length} food day${days.length === 1 ? '' : 's'}${last ? ` (latest ${last.slice(9)})` : ''}<br>${wts.length} weigh-in${wts.length === 1 ? '' : 's'} · ${custom} custom food${custom === 1 ? '' : 's'}<br>Workout setup: ${w && w.setupDone ? 'yes' : 'no'}${w && Object.keys(w.log || {}).length ? `, ${Object.keys(w.log).length} lifts logged` : ''}`;
}

// ---------- sync engine ----------
let curUid = '', curUser = null, meta = { docs: {}, cursor: 0 };
let unsubs = [], scanTimer = 0, pushTimer = 0, inflight = false, lastErr = null, lastSynced = 0, gotServer = false, leaving = false, pendingRerender = false;
const metaKey = uid => nsKey(uid, 'ronnieSync');
function loadMeta(uid) { meta = readJSON(metaKey(uid)) || { docs: {}, cursor: 0 }; meta.docs = meta.docs || {}; meta.cursor = meta.cursor || 0; lastSynced = meta.last || 0; }
function saveMeta() { if (curUid) { meta.last = lastSynced; LS.setItem(metaKey(curUid), JSON.stringify(meta)); } }
const pendingKeys = () => Object.keys(meta.docs).filter(k => meta.docs[k].h !== meta.docs[k].sh);

function scan() {
  scanQueued = false;
  if (!curUid || leaving) return;
  const docs = toDocs(snapshotLocal(curUid)), now = Date.now();
  for (const [k, d] of Object.entries(docs)) {
    const h = hash(d), m = meta.docs[k] || (meta.docs[k] = { lu: 0, h: '', sh: '' });
    if (m.h !== h) { m.h = h; m.lu = Math.max(now, m.lu + 1); }
  }
  // a food day that disappeared locally becomes a tombstone so other devices drop it too
  for (const k of Object.keys(meta.docs)) if (k.startsWith('foodDays/') && !(k in docs) && meta.docs[k].h !== TOMB) { const m = meta.docs[k]; m.h = TOMB; m.lu = Math.max(now, m.lu + 1); }
  saveMeta();
  schedulePush(400);
}
function schedulePush(ms) { clearTimeout(pushTimer); pushTimer = setTimeout(push, ms); setStatus(); }
async function push() {
  if (!curUid || !db || inflight || leaving) return;
  const dirty = pendingKeys();
  if (!dirty.length) { setStatus(); return; }
  inflight = true; setStatus();
  const docs = toDocs(snapshotLocal(curUid));
  try {
    for (let i = 0; i < dirty.length; i += 400) {
      const chunk = dirty.slice(i, i + 400), b = FS.writeBatch(db), sent = {};
      for (const k of chunk) {
        const m = meta.docs[k];
        if (!(k in docs) && !k.startsWith('foodDays/')) { m.sh = m.h; continue; } // never tombstone settings docs
        const d = k in docs ? docs[k] : null;
        sent[k] = hash(d);
        // Content is stored as a JSON string: avoids Firestore limits on undefined values / nested arrays / map keys.
        b.set(refFor(curUid, k), { j: d === null ? null : JSON.stringify(d), updatedAt: m.lu, su: FS.serverTimestamp(), dev: deviceId });
      }
      if (Object.keys(sent).length) await b.commit(); // resolves once the server has the write (queued while offline)
      for (const k of Object.keys(sent)) if (meta.docs[k].h === sent[k]) meta.docs[k].sh = sent[k];
      lastSynced = Date.now(); saveMeta();
    }
    lastErr = null;
  } catch (e) { lastErr = e; console.warn('Sync upload failed', e); }
  inflight = false;
  if (lastErr) schedulePush(20000); else if (pendingKeys().length) schedulePush(800); else setStatus();
}
function onRemote(snap) {
  const changes = {};
  snap.docChanges().forEach(ch => {
    if (ch.type === 'removed' || ch.doc.metadata.hasPendingWrites) return;
    const r = ch.doc.data(), k = keyOfDoc(ch.doc), ru = +r.updatedAt || 0;
    const su = r.su && r.su.toMillis ? r.su.toMillis() : 0;
    if (su > meta.cursor) meta.cursor = su;
    const m = meta.docs[k];
    if (!m || ru > m.lu) {
      let d = null; try { d = r.j == null ? null : JSON.parse(r.j); } catch (e) { return; }
      changes[k] = d; const h = hash(d); meta.docs[k] = { lu: ru, h, sh: h };
    } else if (ru < m.lu && m.sh === m.h) { m.sh = ''; } // cloud has an older copy than what we last sent: resend
  });
  if (!snap.metadata.fromCache) { gotServer = true; lastSynced = Date.now(); lastErr = null; }
  if (Object.keys(changes).length) { const t = applyDocsToLocal(curUid, changes); refreshUI(t); }
  saveMeta();
  if (pendingKeys().length) schedulePush(300); else setStatus();
}
function onListenErr(e) { console.warn('Sync listener error', e); lastErr = e; setStatus(); }
function refreshUI(t) {
  if (WO.food && WO.food.reload) WO.food.reload();
  if (WO.ui && WO.ui.reloadState) WO.ui.reloadState();
  if (t.theme && WO.theme) WO.theme.apply();
  const busy = !$('#sheet').classList.contains('hidden') || (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
  if (busy) pendingRerender = true; else if (WO.ui) WO.ui.rerender(true);
}
WO.sheetCloseHooks = (WO.sheetCloseHooks || []).concat(() => { if (pendingRerender) { pendingRerender = false; setTimeout(() => WO.ui && WO.ui.rerender(true), 0); } });
let scanQueued = false;
WO.onLocalSave = () => { if (!curUid) return; scanQueued = true; clearTimeout(scanTimer); scanTimer = setTimeout(scan, 600); setStatus('syncing'); };

async function startSync(user) {
  curUid = user.uid; curUser = user; loadMeta(curUid); setStatus(); renderAccount();
  try { await fs(); } catch (e) { lastErr = e; setStatus(); return; }
  touchProfile(user);
  watchFlags();
  if (isAdmin(user) && location.hash.startsWith('#admin')) window.dispatchEvent(new HashChangeEvent('hashchange'));
  // includeMetadataChanges: so we hear when cached data is confirmed by the server (drives the "Synced" status)
  const opt = { includeMetadataChanges: true };
  unsubs.push(FS.onSnapshot(userCol(curUid, 'data'), opt, onRemote, onListenErr));
  unsubs.push(FS.onSnapshot(FS.query(userCol(curUid, 'foodDays'), FS.where('su', '>=', FS.Timestamp.fromMillis(meta.cursor))), opt, onRemote, onListenErr));
  scan();
}
function stopSync() { leaving = true; unsubs.forEach(u => { try { u(); } catch (e) { /* ignore */ } }); unsubs = []; clearTimeout(scanTimer); clearTimeout(pushTimer); }
async function flush(ms) {
  clearTimeout(scanTimer); scan();
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (!pendingKeys().length && !inflight) { try { await Promise.race([FS.waitForPendingWrites(db), sleep(Math.max(0, ms - (Date.now() - t0)))]); } catch (e) { /* ignore */ } return !pendingKeys().length; }
    if (!inflight) push();
    await sleep(250);
  }
  return false;
}
window.addEventListener('online', () => { setStatus(); schedulePush(300); });
window.addEventListener('offline', () => setStatus());
setInterval(() => { if (curUid && !leaving) scan(); }, 60000); // safety net

// ---------- status pill ----------
function setStatus(force) {
  const el = $('#syncPill'); if (!el) return;
  let s, label;
  const n = curUid ? pendingKeys().length : 0;
  if (!curUid) { s = 'local'; label = localUid ? '…' : 'Local'; }
  else if (!navigator.onLine) { s = 'offline'; label = n ? `Offline · ${n}` : 'Offline'; }
  else if (force === 'syncing' || scanQueued || inflight || n || !gotServer) { s = 'syncing'; label = 'Syncing'; }
  else if (lastErr) { s = 'error'; label = 'Sync error'; }
  else { s = 'synced'; label = 'Synced'; }
  el.dataset.s = s; el.querySelector('span').textContent = label;
  el.title = s === 'local' ? 'Not signed in: data is only on this device' : s === 'error' ? 'Sync problem: ' + ((lastErr && (lastErr.code || lastErr.message)) || '') : lastSynced ? 'Last synced ' + new Date(lastSynced).toLocaleTimeString() : 'Sync';
  const st = $('#acctStatus'); if (st) st.textContent = statusLine(s, n);
}
function statusLine(s, n) {
  if (s === 'offline') return `Offline: ${n ? n + ' change' + (n === 1 ? '' : 's') + ' will upload when you reconnect' : 'changes will upload when you reconnect'}.`;
  if (s === 'syncing') return 'Syncing…';
  if (s === 'error') return 'Sync problem, will retry: ' + ((lastErr && (lastErr.code || lastErr.message)) || 'unknown');
  return 'All changes synced' + (lastSynced ? ' · ' + new Date(lastSynced).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '') + '.';
}

// ---------- auth screen ----------
let mode = 'signin';
const isStandalone = () => window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
function msg(text, kind) { const m = $('#authMsg'); if (!m) return; m.className = 'auth-msg' + (kind ? ' ' + kind : ''); m.innerHTML = text || ''; }
function busy(on, text) { $('#authBusy').classList.toggle('hidden', !on); if (text) $('#authBusyText').textContent = text; }
function setMode(m) {
  mode = m;
  document.querySelectorAll('[data-auth-mode]').forEach(b => b.classList.toggle('on', b.dataset.authMode === m));
  $('#authSubmit').textContent = m === 'signup' ? 'Create account' : 'Sign in';
  $('#authPw').setAttribute('autocomplete', m === 'signup' ? 'new-password' : 'current-password');
  $('#authForgot').classList.toggle('hidden', m === 'signup');
  msg('');
}
function showAuth(opts = {}) {
  $('#authMain').classList.remove('hidden'); $('#authChoice').classList.add('hidden'); busy(false);
  $('#authLocalNote').classList.toggle('hidden', !meaningful(snapshotLocal('')));
  if (opts.mode) setMode(opts.mode);
  if (opts.gate) html.classList.add('needs-auth'); else html.classList.add('auth-open');
  if (opts.message) msg(opts.message, opts.kind);
}
function hideAuth() { html.classList.remove('needs-auth', 'auth-open'); }
function errText(e) {
  const c = (e && e.code) || '';
  const map = {
    'auth/invalid-email': 'That email address doesn\'t look right.',
    'auth/missing-password': 'Enter your password.',
    'auth/weak-password': 'Password needs at least 6 characters.',
    'auth/email-already-in-use': 'There\'s already an account with that email. Try Sign in.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/invalid-login-credentials': 'Email or password is incorrect.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/user-not-found': 'Email or password is incorrect.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
    'auth/network-request-failed': 'No connection. Check your internet and try again.',
    'auth/popup-blocked': 'The Google window was blocked.',
    'auth/unauthorized-domain': 'This web address isn\'t authorized for sign-in (Firebase → Authentication → Settings → Authorized domains).',
    'auth/operation-not-allowed': 'This sign-in method isn\'t enabled in Firebase.',
    'auth/requires-recent-login': 'Please sign in again to confirm.'
  };
  return map[c] || (e && e.message ? e.message.replace(/^Firebase: /, '') : 'Something went wrong.');
}
async function doEmail() {
  const email = $('#authEmail').value.trim(), pw = $('#authPw').value;
  if (!email) return msg('Enter your email.', 'err');
  if (!pw) return msg('Enter a password.', 'err');
  if (mode === 'signup' && pw.length < 6) return msg('Password needs at least 6 characters.', 'err');
  busy(true, mode === 'signup' ? 'Creating your account…' : 'Signing in…');
  try { if (mode === 'signup') await createUserWithEmailAndPassword(auth, email, pw); else await signInWithEmailAndPassword(auth, email, pw); }
  catch (e) { busy(false); msg(errText(e), 'err'); }
}
async function doReset() {
  const email = $('#authEmail').value.trim();
  if (!email) return msg('Type your email above, then tap "Forgot password?".', 'err');
  try { await sendPasswordResetEmail(auth, email); msg(`If there's an account for <b>${esc(email)}</b>, a reset link is on its way. Check your inbox (and spam).`, 'ok'); }
  catch (e) { msg(errText(e), 'err'); }
}
function googleProvider() { const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' }); return p; }
async function doGoogleRedirect() { busy(true, 'Opening Google…'); LS.setItem(K.redirect, '1'); try { await signInWithRedirect(auth, googleProvider()); } catch (e) { LS.removeItem(K.redirect); busy(false); msg(errText(e), 'err'); } }
async function doGoogle() {
  msg('Continue in the Google window… <button type="button" class="linkbtn" data-google-redirect>Trouble? Use full-page Google sign-in</button>');
  try { await signInWithPopup(auth, googleProvider()); busy(true, 'Signing in…'); }
  catch (e) {
    const c = e && e.code;
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(c)) return doGoogleRedirect();
    if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') {
      // Installed Android PWAs sometimes lose the popup; offer the full-page redirect flow instead.
      return msg(isStandalone() ? 'Google window closed. <button type="button" class="linkbtn" data-google-redirect>Try full-page Google sign-in</button>' : '');
    }
    msg(errText(e) + ' <button type="button" class="linkbtn" data-google-redirect>Try full-page Google sign-in</button>', 'err');
  }
}

// ---------- first sign-in on this device ----------
function askChoice(cloudDocs, devDocs) {
  return new Promise(resolve => {
    busy(false);
    $('#choiceSummary').innerHTML = `<div><b>☁️ Account</b>${summarize(cloudDocs)}</div><div><b>📱 This device</b>${summarize(devDocs)}</div>`;
    $('#authMain').classList.add('hidden'); $('#authChoice').classList.remove('hidden');
    const on = e => { const b = e.target.closest('[data-choice]'); if (!b) return; $('#authChoice').removeEventListener('click', on); resolve(b.dataset.choice); };
    $('#authChoice').addEventListener('click', on);
  });
}
async function firstSignIn(user) {
  const uid = user.uid;
  if (!html.classList.contains('needs-auth')) html.classList.add('auth-open');
  busy(true, 'Setting up sync…');
  // Returning to this device with the same account: its data is still here (namespaced); LWW sync reconciles.
  if (readJSON(metaKey(uid))) return finish(uid);
  await fs();
  let snaps;
  try { snaps = await Promise.all([FS.getDocsFromServer(userCol(uid, 'data')), FS.getDocsFromServer(userCol(uid, 'foodDays'))]); }
  catch (e) { const err = new Error('Couldn\'t reach your cloud data (' + (e.code || e.message) + '). Check your connection and sign in again.'); err.code = e.code; throw err; }
  const cloud = {}, cloudLu = {}; let cursor = 0;
  snaps.forEach(s => s.forEach(d => {
    const r = d.data(), k = keyOfDoc(d); let v = null;
    try { v = r.j == null ? null : JSON.parse(r.j); } catch (e) { v = null; }
    if (v !== null) { cloud[k] = v; cloudLu[k] = +r.updatedAt || 0; }
    const su = r.su && r.su.toMillis ? r.su.toMillis() : 0; if (su > cursor) cursor = su;
  }));
  const guest = snapshotLocal(''), devDocs = toDocs(guest);
  const hasCloud = Object.keys(cloud).length > 0, hasDev = meaningful(guest);
  const same = hasCloud && Object.keys(devDocs).length === Object.keys(cloud).length && Object.keys(devDocs).every(k => k in cloud && hash(devDocs[k]) === hash(cloud[k]));
  let choice;
  if (!hasCloud) choice = 'device';               // new account: upload what this device has (may be nothing)
  else if (!hasDev || same) choice = 'cloud';     // nothing new here: just download
  else choice = await askChoice(cloud, devDocs);  // both have different data: ask
  busy(true, choice === 'cloud' ? 'Downloading your data…' : 'Uploading your data…');
  const now = Date.now(), m = { docs: {}, cursor };
  let result;
  if (choice === 'cloud') {
    result = cloud;
    for (const k in cloud) { const h = hash(cloud[k]); m.docs[k] = { lu: cloudLu[k], h, sh: h }; }
  } else if (choice === 'device') {
    result = devDocs;
    for (const k in devDocs) m.docs[k] = { lu: now, h: hash(devDocs[k]), sh: '' };
    for (const k in cloud) if (!(k in devDocs) && k.startsWith('foodDays/')) m.docs[k] = { lu: now, h: TOMB, sh: '' };
  } else {
    result = mergeDocs(devDocs, cloud);
    for (const k in result) { const h = hash(result[k]), ch = k in cloud ? hash(cloud[k]) : null; m.docs[k] = ch === h ? { lu: cloudLu[k], h, sh: h } : { lu: now, h, sh: '' }; }
  }
  // write this account's local copy, then retire the signed-out copy so the next person doesn't see it
  Object.keys(LS).filter(k => k.startsWith(`u:${uid}:`)).forEach(k => LS.removeItem(k));
  applyDocsToLocal(uid, result);
  if (choice === 'device' && guest.workout && !result['data/workout']) LS.setItem(nsKey(uid, BASE.workout), JSON.stringify(guest.workout));
  LS.setItem(metaKey(uid), JSON.stringify(m));
  Object.values(BASE).forEach(k => LS.removeItem(k));
  sessionStorage.setItem('ronnieAuth.flash', choice === 'cloud' ? 'Signed in. Your data is synced.' : choice === 'merge' ? 'Signed in. Data merged and syncing.' : (hasDev ? 'Signed in. Uploading this device\'s data to your account.' : 'Account ready. Your data will sync.'));
  finish(uid);
}
function finish(uid) { LS.setItem(K.uid, uid); LS.removeItem(K.guest); location.reload(); }

// ---------- sign out / delete ----------
async function clearDevice(uid) {
  Object.keys(LS).filter(k => k.startsWith(`u:${uid}:`)).forEach(k => LS.removeItem(k));
  LS.removeItem(K.uid); LS.removeItem(K.guest); LS.removeItem(K.nudge);
  try { if (db) { await FS.terminate(db); await FS.clearIndexedDbPersistence(db); } } catch (e) { console.warn('Could not clear offline cache', e); }
}
async function doSignOut() {
  if (!curUser) return;
  if (!confirm('Sign out? Your data stays safe in your account. This device will be cleared so the next person starts fresh.')) return;
  setStatus('syncing');
  const ok = db ? await flush(10000) : !pendingKeys().length;
  if (!ok && !confirm(`${pendingKeys().length} change(s) haven't reached the cloud yet (offline?). Signing out now will lose them. Sign out anyway?`)) { setStatus(); return; }
  const uid = curUid; stopSync();
  try { await signOut(auth); } catch (e) { console.warn(e); }
  await clearDevice(uid);
  sessionStorage.setItem('ronnieAuth.flash', 'Signed out. This device has been cleared.');
  location.reload();
}
function askPassword() {
  return new Promise(resolve => {
    WO.ui.openSheet(`<div class="sheet-head"><div><div class="tag">Confirm it's you</div><h1>Enter your password</h1></div><button class="close-x" data-close aria-label="Close">✕</button></div>
      <form id="reauthForm" style="margin-top:10px"><input type="password" id="reauthPw" autocomplete="current-password" placeholder="Password">
      <button class="btn block danger" style="margin-top:12px" type="submit">Delete my account</button></form>`);
    let done = false;
    const f = $('#reauthForm');
    f.addEventListener('submit', e => { e.preventDefault(); done = true; const v = $('#reauthPw').value; WO.ui.closeSheet(); resolve(v); });
    WO.sheetCloseHooks.push(function h() { WO.sheetCloseHooks.splice(WO.sheetCloseHooks.indexOf(h), 1); if (!done) resolve(''); });
    setTimeout(() => { const i = $('#reauthPw'); if (i) i.focus(); }, 50);
  });
}
async function reauth(user) {
  const pid = (user.providerData[0] || {}).providerId;
  if (pid === 'password') {
    const pw = await askPassword();
    if (!pw) { const e = new Error('Cancelled'); e.code = 'cancelled'; throw e; }
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, pw));
  } else await reauthenticateWithPopup(user, googleProvider());
}
async function wipeCloud(uid) {
  let n = 0;
  for (const c of ['data', 'foodDays']) {
    const s = await FS.getDocsFromServer(userCol(uid, c));
    for (let i = 0; i < s.docs.length; i += 400) { const b = FS.writeBatch(db); s.docs.slice(i, i + 400).forEach(d => b.delete(d.ref)); await b.commit(); }
    n += s.size;
  }
  const left = (await FS.getDocsFromServer(userCol(uid, 'data'))).size + (await FS.getDocsFromServer(userCol(uid, 'foodDays'))).size;
  if (left) throw new Error(left + ' cloud records could not be deleted');
  await FS.deleteDoc(FS.doc(db, 'users', uid)).catch(e => console.warn('Profile delete skipped', e && e.code));
  return n;
}
async function doDelete() {
  const user = curUser; if (!user) return;
  if (!confirm(`Permanently delete the account ${user.email || ''} and ALL of its synced data (workouts, food log, weights)? This can't be undone.`)) return;
  const btn = $('#acctDelete'); if (btn) { btn.disabled = true; btn.textContent = 'Deleting…'; }
  try {
    const last = Date.parse(user.metadata.lastSignInTime || 0) || 0;
    if (Date.now() - last > 4 * 60e3) await reauth(user); // Firebase requires a recent sign-in to delete
    await fs();
    stopSync();
    const n = await wipeCloud(user.uid);
    try { await deleteUser(user); }
    catch (e) { if (e.code !== 'auth/requires-recent-login') throw e; await reauth(user); await deleteUser(user); }
    await clearDevice(user.uid);
    sessionStorage.setItem('ronnieAuth.flash', `Account deleted (${n} cloud record${n === 1 ? '' : 's'} removed).`);
    location.reload();
  } catch (e) {
    leaving = false;
    if (btn) { btn.disabled = false; btn.textContent = 'Delete account'; }
    if (e.code !== 'cancelled') alert('Could not delete the account: ' + errText(e));
    if (!unsubs.length && curUser) startSync(curUser);
  }
}

// ---------- Setup → Account card + gentle nudge for signed-out use ----------
function renderAccount() {
  const card = $('#accountCard'); if (!card) return;
  if (curUser) {
    const u = curUser, name = u.displayName || u.email || 'Signed in', pid = (u.providerData[0] || {}).providerId;
    card.innerHTML = `<div class="row between"><h2>Account</h2><span class="pill rest">Cloud sync on</span></div>
      <div class="who"><div class="avatar">${esc((name[0] || '?').toUpperCase())}</div><div class="grow"><b>${esc(u.email || name)}</b><div class="small muted">${pid === 'google.com' ? 'Google account' : 'Email & password'}</div></div></div>
      <div class="small muted" id="acctStatus"></div>
      <div class="row wrap" style="margin-top:12px"><button class="btn sm ghost" id="acctSync">Sync now</button><button class="btn sm ghost" id="acctSignOut">Sign out</button><button class="btn sm danger" id="acctDelete">Delete account</button></div>${isAdmin(u) ? '<a class="btn sm" href="#admin" style="margin-top:10px;display:inline-flex">🛡️ Admin: users &amp; feature flags</a>' : ''}`;
  } else if (localUid) {
    card.innerHTML = `<h2>Account</h2><div class="small muted" style="margin:4px 0 10px">Reconnecting…</div><button class="btn sm" data-auth-open>Sign in</button>`;
  } else {
    card.innerHTML = `<h2>Account</h2><div class="small muted" style="margin:4px 0 10px">Not signed in. Your data lives only on this device. Create a free account to back it up and sync it to other phones or computers. Each person gets their own account.</div>
      <div class="row wrap"><button class="btn sm" data-auth-open="signup">Create account</button><button class="btn sm ghost" data-auth-open="signin">Sign in</button></div>`;
  }
  setStatus();
}
function nudge() {
  if (curUser || localUid || $('#nudge')) return;
  const h = location.hash || '#today';
  if (!/^#(today|food|day\/\w+)?$/.test(h)) return;
  if (Date.now() < +(LS.getItem(K.nudge) || 0)) return;
  const v = $('#view'); if (!v || !v.firstElementChild) return;
  const d = document.createElement('div');
  d.className = 'card nudge'; d.id = 'nudge';
  d.innerHTML = `<div style="font-size:22px">☁️</div><div class="grow"><b>Back up your data</b><div class="small muted">Create a free account to keep your workouts &amp; food log safe and synced across devices.</div><button class="btn sm" style="margin-top:8px" data-auth-open="signup">Create account</button></div><button class="x" data-nudge-x aria-label="Dismiss">✕</button>`;
  v.insertBefore(d, v.firstElementChild);
}
function decorate() { const c = $('#accountCard'); if (c && !c.dataset.cloud) { c.dataset.cloud = '1'; renderAccount(); } nudge(); }
new MutationObserver(decorate).observe($('#view'), { childList: true });
decorate(); // the view may already have rendered before this module loaded

// ---------- events ----------
document.addEventListener('click', e => {
  const t = e.target;
  const m = t.closest('[data-auth-mode]'); if (m) return setMode(m.dataset.authMode);
  const o = t.closest('[data-auth-open]'); if (o) return showAuth({ mode: o.dataset.authOpen || 'signin' });
  if (t.closest('[data-auth-close]')) return hideAuth();
  if (t.closest('[data-nudge-x]')) { LS.setItem(K.nudge, String(Date.now() + 7 * 864e5)); const n = $('#nudge'); if (n) n.remove(); return; }
  if (t.closest('[data-pw-toggle]')) { const i = $('#authPw'), b = t.closest('[data-pw-toggle]'); i.type = i.type === 'password' ? 'text' : 'password'; b.textContent = i.type === 'password' ? 'Show' : 'Hide'; return; }
  if (t.closest('#authForgot')) return doReset();
  if (t.closest('#authGoogle')) return doGoogle();
  if (t.closest('[data-google-redirect]')) return doGoogleRedirect();
  if (t.closest('#syncPill')) { if (curUser || localUid) { location.hash = '#setup'; setTimeout(() => { const c = $('#accountCard'); if (c) c.scrollIntoView({ block: 'center' }); }, 60); } else showAuth({ mode: 'signup' }); return; }
  if (t.closest('#acctSignOut')) return doSignOut();
  if (t.closest('#acctDelete')) return doDelete();
  if (t.closest('#acctSync')) { scan(); schedulePush(0); return; }
});
$('#authForm').addEventListener('submit', e => { e.preventDefault(); doEmail(); });

function handleGuest() {
  if (localUid && !curUser) {
    // session ended for a previously signed-in account: keep its data parked under its namespace, switch to signed-out mode
    LS.removeItem(K.uid); LS.setItem(K.guest, '1'); location.reload(); return;
  }
  LS.setItem(K.guest, '1'); hideAuth(); nudge();
}

// ---------- profile + admin (read-only) ----------
// Admin is enforced server-side by Firestore rules (see firestore.rules); this check only decides whether to show the UI.
const ADMIN_EMAIL = 'ronniefunes92@gmail.com';
function isAdmin(u) { return !!u && !!u.emailVerified && (u.email || '').toLowerCase() === ADMIN_EMAIL; }
function onboardSummary() {
  const st = WO.ui && WO.ui.getState ? WO.ui.getState() : null;
  if (!st || !st.setupDone) return { onboarded: false };
  const p = st.profile || {};
  return { onboarded: true, coach: { name: p.name || '', goals: st.goals || [], experience: p.experience || '', train: p.train || [], gyms: p.gyms || [], homeGym: !!p.homeGym, sessionLength: p.sessionLength || 60, limitations: p.limitations || [], goalWeight: p.goalWeight == null ? null : p.goalWeight, units: p.units || 'lb' } };
}
async function touchProfile(user) {
  try {
    const created = user.metadata && user.metadata.creationTime ? FS.Timestamp.fromDate(new Date(user.metadata.creationTime)) : FS.serverTimestamp();
    await FS.setDoc(FS.doc(db, 'users', user.uid), Object.assign({ email: user.email || '', displayName: user.displayName || '', createdAt: created, lastActive: FS.serverTimestamp() }, onboardSummary()), { merge: true });
  } catch (e) { console.warn('Profile update skipped', e && e.code); }
}
// Onboarding finished → refresh the profile doc so Admin sees the coach answers.
WO.onOnboarded = () => { if (curUser && FS) touchProfile(curUser); };

// ---------- app-wide feature flags (config/features, written by admin only) ----------
let flagsUnsub = null;
function watchFlags() {
  if (flagsUnsub || !FS || !WO.flags) return;
  try {
    flagsUnsub = FS.onSnapshot(FS.doc(db, 'config', 'features'), s => { const d = s.exists() ? s.data() : null; if (d && d.flags) WO.flags.applyCloud(d.flags); }, e => console.warn('Flags listener', e && e.code));
    unsubs.push(() => { if (flagsUnsub) flagsUnsub(); flagsUnsub = null; });
  } catch (e) { console.warn('Flags watch skipped', e); }
}
let adminDraft = null;
function renderFlagsAdmin(box) {
  const F = WO.flags; if (!F) { box.textContent = 'Flags module missing.'; return; }
  adminDraft = adminDraft || F.snapshot();
  const modes = [['off', 'Off'], ['beta', 'Beta'], ['on', 'Live']];
  box.innerHTML = `<div class="admin-flags-head"><div><h2 style="margin:0">Feature flags</h2><div class="small muted">App-wide. <b>Off</b> = hidden for everyone. <b>Beta</b> = only people who flip Setup → Beta features. <b>Live</b> = everyone.</div></div>
    <button class="btn" id="flagsPublish">Publish to all users</button></div>
    <div class="admin-flags">${Object.entries(F.CATALOG).map(([k, c]) => `<div class="card admin-flag"><div class="row between"><b>${esc(c.label)}</b><code class="small muted">${esc(k)}</code></div>
      <div class="small muted" style="margin:4px 0 10px">${esc(c.desc)}</div>
      <div class="seg">${modes.map(([m, l]) => `<button type="button" class="${adminDraft[k] === m ? 'on' : ''}" data-flag="${k}" data-mode="${m}">${l}</button>`).join('')}</div></div>`).join('')}</div>
    <div id="flagsMsg" class="small muted" style="margin-top:10px">${F.loadedCloud() ? 'Showing the published values. Change, then Publish.' : 'No published flags yet: showing defaults.'}</div>`;
}
async function publishFlags() {
  const m = $('#flagsMsg'), b = $('#flagsPublish');
  if (!curUser || !isAdmin(curUser) || !adminDraft) return;
  if (b) { b.disabled = true; b.textContent = 'Publishing…'; }
  try {
    await fs();
    await FS.setDoc(FS.doc(db, 'config', 'features'), { flags: adminDraft, updatedAt: FS.serverTimestamp(), by: curUser.email || '' });
    WO.flags.applyCloud(Object.assign({}, adminDraft));
    if (m) { m.className = 'small ok'; m.textContent = 'Published. Signed-in users get it live; guests pick it up next time they sign in.'; }
  } catch (e) {
    console.warn('Publish flags failed', e);
    if (m) { m.className = 'small warn'; m.textContent = e && e.code === 'permission-denied' ? 'Permission denied: publish the updated firestore.rules (config/features) in the Firebase console first.' : 'Could not publish: ' + ((e && e.message) || e); }
  } finally { if (b) { b.disabled = false; b.textContent = 'Publish to all users'; } }
}
document.addEventListener('click', e => {
  const f = e.target.closest('[data-flag]');
  if (f && adminDraft) { adminDraft[f.dataset.flag] = f.dataset.mode; f.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === f)); const m = $('#flagsMsg'); if (m) { m.className = 'small muted'; m.textContent = 'Unpublished changes.'; } return; }
  if (e.target.closest('#flagsPublish')) publishFlags();
});
const fmtTs = t => (t && t.toDate ? t.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const parseJ = d => { try { return JSON.parse(d.get('j')); } catch (e) { return null; } };
WO.routes = WO.routes || {}; WO.afterRoute = WO.afterRoute || {};
WO.routes.admin = arg => {
  if (WO.ui) WO.ui.setTop('Admin', curUser ? esc(curUser.email || '') : '');
  const sec = arg === 'flags' ? 'flags' : 'users';
  const nav = [['users', '#admin', '👥', 'Users'], ['flags', '#admin/flags', '🚦', 'Feature flags']];
  return `<div class="admin-shell"><aside class="admin-side"><div class="admin-brand"><svg viewBox="0 0 484 398" aria-hidden="true"><use href="#mu-mark"/></svg><div><b>Mount Up</b><div class="small muted">Admin</div></div></div>
    <nav class="admin-nav">${nav.map(([k, h, i, l]) => `<a href="${h}" class="${sec === k ? 'on' : ''}"><span>${i}</span>${l}</a>`).join('')}<a href="#today"><span>↩</span>Back to app</a></nav></aside>
    <section class="admin-main"><div id="adminBox" class="small muted">${curUser ? 'Loading…' : 'Connecting…'}</div></section></div>`;
};
WO.afterRoute.admin = async uid => {
  const box = $('#adminBox'); if (!box || !curUser) return;
  if (!isAdmin(curUser)) { box.textContent = 'Not available.'; return; }
  try {
    await fs();
    if (uid === 'flags') { renderFlagsAdmin(box); return; }
    if (!uid) {
      const s = await FS.getDocsFromServer(FS.collection(db, 'users'));
      const rows = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => ((b.lastActive && b.lastActive.toMillis()) || 0) - ((a.lastActive && a.lastActive.toMillis()) || 0));
      const onb = rows.filter(r => r.onboarded).length;
      box.innerHTML = `<div class="admin-stats"><div class="stat"><b>${rows.length}</b><small>Users</small></div><div class="stat"><b>${onb}</b><small>Finished onboarding</small></div><div class="stat"><b>${rows.filter(r => r.lastActive && Date.now() - r.lastActive.toMillis() < 7 * 864e5).length}</b><small>Active 7 days</small></div></div>
        <div class="card admin-users">` + rows.map(r => `<a href="#admin/${esc(r.id)}" class="entry admin-urow" style="color:inherit;text-decoration:none"><div class="grow"><b>${esc(r.email || r.id)}</b><div class="small muted">${esc(r.displayName || (r.coach && r.coach.name) || '')}${(r.displayName || (r.coach && r.coach.name)) ? ' · ' : ''}Joined ${fmtTs(r.createdAt)}</div></div><div class="small muted admin-ucoach">${r.onboarded ? esc(((r.coach && r.coach.goals) || []).map(g => (WO.GOALS[g] || {}).label || g).join(', ')) : '<span class="pill">Not onboarded</span>'}</div><div class="small muted" style="text-align:right">Active<br>${fmtTs(r.lastActive)}</div></a>`).join('') + '</div>';
      return;
    }
    const [p, data, days] = await Promise.all([FS.getDocFromServer(FS.doc(db, 'users', uid)), FS.getDocsFromServer(userCol(uid, 'data')), FS.getDocsFromServer(userCol(uid, 'foodDays'))]);
    const D = {}; data.docs.forEach(d => { D[d.id] = parseJ(d); });
    const w = D.workout || {}, done = w.done || {}, log = w.log || {};
    const woDays = Object.values(done).filter(v => v && Object.keys(v).length).length;
    const lastLift = Object.values(log).map(x => x && x.d).filter(Boolean).sort().pop();
    let fDays = 0, entries = 0, lastFood = '';
    days.docs.forEach(d => { const v = parseJ(d); if (!v) return; const n = ['breakfast', 'lunch', 'dinner', 'snacks'].reduce((a, m) => a + ((v[m] || []).length), 0); if (n) { fDays++; entries += n; if (d.id > lastFood) lastFood = d.id; } });
    const ws = Object.entries((D.weights && D.weights.weights) || {}).sort((a, b) => (a[0] < b[0] ? -1 : 1)), lw = ws[ws.length - 1];
    const foods = Object.keys((D.foodlib && D.foodlib.foods) || {}).length;
    const P = p.exists() ? p.data() : {};
    const row = (k, v) => `<div class="row between" style="padding:8px 0;border-bottom:1px solid var(--line)"><span class="muted">${k}</span><b>${v}</b></div>`;
    const C = P.coach || null, LIM = { flat_back: 'Back: lying flat', squat_back: 'Back: squatting', knees: 'Knees', shoulders: 'Shoulders overhead' };
    const coachHtml = C ? `<div class="card flat"><h3>Coach quiz</h3>` + row('Goals', esc((C.goals || []).map(g => (WO.GOALS[g] || {}).label || g).join(', ') || '—')) + row('Experience', esc(C.experience || '—')) + row('Trains at', esc(((C.gyms || []).concat(C.homeGym ? ['Home gym'] : [])).join(', ') || (C.train || []).join(', ') || '—')) + row('Session length', esc((C.sessionLength || '—') + ' min')) + row('Limitations', esc((C.limitations || []).map(l => LIM[l] || l).join(', ') || 'None')) + row('Goal weight', C.goalWeight ? esc(C.goalWeight + ' ' + (C.units || 'lb')) : '—') + `</div>` : `<div class="card flat small muted">Hasn't finished onboarding yet.</div>`;
    box.innerHTML = `<div style="color:var(--text)"><a href="#admin" class="small">← All users</a><div style="margin-top:6px"><b style="font-size:16px">${esc(P.email || uid)}</b></div><div class="small muted">${esc(P.displayName || '')} · Joined ${fmtTs(P.createdAt)} · Active ${fmtTs(P.lastActive)}</div><div class="admin-detail"><div class="card flat"><h3>Activity</h3>`
      + row('Workout days completed', woDays) + row('Lifts with a logged weight', Object.keys(log).length) + row('Last lift logged', esc(lastLift || '—'))
      + row('Food days logged', fDays) + row('Food entries', entries) + row('Last food day', esc(lastFood || '—'))
      + row('Latest weight', lw ? `${esc(lw[1])} <span class="small muted">(${esc(lw[0])})</span>` : '—') + row('Weigh-ins', ws.length) + row('Saved foods', foods)
      + `</div>${coachHtml}</div><div class="small muted" style="margin-top:8px">Read-only view.</div></div>`;
  } catch (e) {
    console.warn('Admin load failed', e);
    box.textContent = e && e.code === 'permission-denied' ? 'Permission denied: publish the admin Firestore rules (firestore.rules) first.' : 'Could not load: ' + ((e && e.message) || e);
  }
};

// ---------- boot ----------
WO.cloud = { handleGuest, _renderFlags: renderFlagsAdmin, status: () => ({ uid: curUid, email: curUser && curUser.email, pending: pendingKeys().length + (scanQueued ? 1 : 0), inflight, gotServer, lastErr: lastErr && (lastErr.code || lastErr.message) }), flush: ms => flush(ms || 10000), _fs: fs, _db: () => db, _auth: auth };
const flash = sessionStorage.getItem('ronnieAuth.flash');
if (flash) { sessionStorage.removeItem('ronnieAuth.flash'); setTimeout(() => WO.food && WO.food.toast ? WO.food.toast(flash) : null, 400); }
setStatus();
if (location.hash.startsWith('#admin') && WO.ui) WO.ui.route(); // app.js routed before this module registered #admin
if (html.classList.contains('needs-auth')) $('#authLocalNote').classList.toggle('hidden', !meaningful(snapshotLocal('')));
if (LS.getItem(K.redirect)) {
  busy(true, 'Finishing Google sign-in…'); html.classList.add('auth-open');
  getRedirectResult(auth).then(r => { if (!r) { busy(false); hideAuth(); } }).catch(e => { busy(false); showAuth({ message: errText(e), kind: 'err' }); }).finally(() => LS.removeItem(K.redirect));
}
onAuthStateChanged(auth, async user => {
  if (leaving) return;
  if (user && user.uid === localUid) { if (!curUser) startSync(user); else curUser = user; return; }
  if (user) {
    try { await firstSignIn(user); }
    catch (e) { console.warn(e); try { await signOut(auth); } catch (x) { /* ignore */ } showAuth({ message: (e && e.message) || 'Could not finish signing in.', kind: 'err' }); }
    return;
  }
  // no Firebase session
  if (localUid) showAuth({ gate: true, message: 'You were signed out. Sign in again to keep syncing. Your data on this device is safe.' });
  renderAccount();
});
