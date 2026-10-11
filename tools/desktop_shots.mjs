// Desktop/tablet/phone screenshot harness (no deps; needs Node 22+ for global WebSocket and google-chrome).
// Usage: node tools/desktop_shots.mjs <baseUrl> <outDir> [width] [height] [prefix]
// Runs as a guest with a finished setup. Admin pages are rendered with mock users + local test-feedback (no Firebase sign-in).
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const [base = 'http://localhost:8000', out = 'shots', W = '1280', H = '800', prefix = ''] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn('google-chrome', ['--headless=new', `--remote-debugging-port=${port}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', `--user-data-dir=/tmp/mu-shots-${port}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, id = 0; const pending = new Map();
for (let i = 0; i < 50; i++) { try { const r = await fetch(`http://127.0.0.1:${port}/json/list`); const t = (await r.json()).find(x => x.type === 'page'); if (t) { ws = new WebSocket(t.webSocketDebuggerUrl); break; } } catch (e) {} await sleep(200); }
await new Promise(r => ws.addEventListener('open', r));
ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result && r.result.exceptionDetails) console.warn('eval err', JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result && r.result.result && r.result.result.value; };
const mobile = +W < 600;
await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile });
await send('Page.enable');
await send('Page.navigate', { url: base + '/manifest.webmanifest' }); await sleep(800);
await ev(`(() => { localStorage.clear(); localStorage.setItem('ronnieAuth.guest','1'); localStorage.setItem('ronnieAuth.nudgeUntil', String(Date.now()+864e6));
  localStorage.setItem('ronnieWorkout.v1', JSON.stringify({ v: 1, setupDone: true, profile: { name: 'Ronnie', tutorialDone: true, goalWeight: 185, goalType: 'lose' }, schedule: { mon: { type: 'gym', time: '05:00' }, tue: { type: 'home' }, wed: { type: 'rest' }, thu: { type: 'gym', time: '09:30' }, fri: { type: 'gym', time: '05:00' }, sat: { type: 'home' }, sun: { type: 'gym', time: '09:00' } } }));
  const t = Date.parse('2026-10-11T12:00:00-04:00');
  const extra = [{ id: 'x1', title: 'Rest timer covers the last set on small phones', type: 'bug', priority: 'high', screen: 'Today', notes: 'On a Galaxy S21 the rest bar overlaps the last exercise card.', status: 'progress', by: 'Tester A', createdAt: t, updatedAt: t },
                 { id: 'x2', title: 'Food search should remember last quantity', type: 'improvement', priority: 'low', screen: 'Food', notes: '', status: 'open', by: 'Ronnie', createdAt: t, updatedAt: t }];
  return true; })()`);
const users = [['ronniefunes92@gmail.com', 'Ronnie', 1, ['fat_loss', 'sculpt'], 0], ['tester.alex@example.com', 'Alex', 1, ['strength'], 1], ['maria.t@example.com', 'Maria', 1, ['fat_loss'], 2], ['jordan@example.com', '', 0, [], 5], ['sam.lee@example.com', 'Sam', 1, ['sculpt'], 9]];
const mockUsers = `(() => { const D = ms => ({ toDate: () => new Date(ms), toMillis: () => ms }); const now = Date.now();
  const rows = ${JSON.stringify(users)}.map(([email, name, onb, goals, ago], i) => ({ id: 'u' + i, email, displayName: name, onboarded: !!onb, coach: { goals }, createdAt: D(now - (40 + i * 6) * 864e5), lastActive: D(now - ago * 864e5) }));
  const box = document.getElementById('adminBox');
  if (window.WO.adminPreview) { box.innerHTML = window.WO.adminPreview.usersHtml(rows); return 'real'; }
  const esc = s => String(s == null ? '' : s); const fmtTs = t => t.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const onb = rows.filter(r => r.onboarded).length;
  box.innerHTML = '<div class="admin-stats"><div class="stat"><b>' + rows.length + '</b><small>Users</small></div><div class="stat"><b>' + onb + '</b><small>Finished onboarding</small></div><div class="stat"><b>' + rows.filter(r => now - r.lastActive.toMillis() < 7 * 864e5).length + '</b><small>Active 7 days</small></div></div><div class="card admin-users">' + rows.map(r => '<a href="#admin/' + r.id + '" class="entry admin-urow" style="color:inherit;text-decoration:none"><div class="grow"><b>' + esc(r.email) + '</b><div class="small muted">' + esc(r.displayName) + (r.displayName ? ' · ' : '') + 'Joined ' + fmtTs(r.createdAt) + '</div></div><div class="small muted admin-ucoach">' + (r.onboarded ? r.coach.goals.map(g => (window.WO.GOALS[g] || {}).label || g).join(', ') : '<span class="pill">Not onboarded</span>') + '</div><div class="small muted" style="text-align:right">Active<br>' + fmtTs(r.lastActive) + '</div></a>').join('') + '</div>';
  return 'inline'; })()`;
const mockTest = `(async () => { const m = await import('${base}/js/admin-test.js'); const deny = () => Promise.reject({ code: 'permission-denied' });
  await m.renderTest(document.getElementById('adminBox'), { FS: { getDocsFromServer: deny, collection: () => null, setDoc: deny, doc: () => null }, db: null, user: { email: 'ronniefunes92@gmail.com' }, esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), toast: () => {} });
  const it = m._test.items(); const t = Date.parse('2026-10-11T12:00:00-04:00');
  return Object.keys(it).length; })()`;
async function go(hash, wait = 900) { await ev(`location.hash = '${hash}'`); await sleep(wait); }
async function shot(name, full = true) {
  await sleep(300);
  let clip;
  if (full) { const h = await ev('Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)'); await send('Emulation.setDeviceMetricsOverride', { width: +W, height: Math.min(Math.max(+H, h), 4000), deviceScaleFactor: 1, mobile }); await sleep(400); }
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/${prefix}${name}.png`, Buffer.from(r.result.data, 'base64'));
  await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile });
  console.log('saved', `${out}/${prefix}${name}.png`);
}
await send('Page.navigate', { url: base + '/index.html#today' }); await sleep(2500);
await ev(`document.documentElement.classList.remove('needs-auth','auth-open','needs-onboard')`);
await shot('today');
await go('#day/wed'); await shot('rest-day');
await go('#setup'); await shot('setup');
await go('#week'); await shot('week');
await go('#food', 1500); await shot('food');
await go('#today', 900); await ev(`(document.querySelector('.ex .ex-name')||document.querySelector('[data-open]')).click()`); await sleep(1500); await ev(`document.querySelectorAll('svg animate, svg animateTransform').forEach(a=>a.endElement&&a.endElement())`); await shot('exercise-sheet', false);
await ev(`document.querySelector('[data-close]') && document.querySelector('[data-close]').click()`);
await go('#admin', 1200); console.log('users mock:', await ev(mockUsers)); await shot('admin-users');
// extra test items so the list has a realistic mix
await ev(`(() => { const k = 'mountup.testFeedback.v1'; const t = Date.parse('2026-10-11T12:00:00-04:00'); let raw = null; try { raw = JSON.parse(localStorage.getItem(k)); } catch (e) {} if (raw && raw.items && raw.items.x1) return;
  const items = (raw && raw.items) || {}; Object.assign(items, { x1: { id: 'x1', title: 'Rest timer covers the last set on small phones', type: 'bug', priority: 'high', screen: 'Today', notes: 'Rest bar overlaps the last exercise card while scrolling.', status: 'progress', by: 'Tester A', createdAt: t, updatedAt: t }, x2: { id: 'x2', title: 'Food search should remember last quantity', type: 'improvement', priority: 'low', screen: 'Food', notes: '', status: 'open', by: 'Ronnie', createdAt: t, updatedAt: t } });
  if (raw && raw.items) localStorage.setItem(k, JSON.stringify({ v: 1, items })); })()`);
await go('#admin/test', 1200); console.log('test items:', await ev(mockTest));
await ev(`(async () => { const m = await import('${base}/js/admin-test.js'); const it = m._test.items(); const t = Date.parse('2026-10-11T12:00:00-04:00'); if (!it.x1) { it.x1 = { id: 'x1', title: 'Rest timer covers the last set on small phones', type: 'bug', priority: 'high', screen: 'Today', notes: 'Rest bar overlaps the last exercise card while scrolling.', status: 'progress', by: 'Tester A', createdAt: t, updatedAt: t, doneAt: null }; it.x2 = { id: 'x2', title: 'Food search should remember last quantity', type: 'improvement', priority: 'low', screen: 'Food', notes: '', status: 'open', by: 'Ronnie', createdAt: t, updatedAt: t, doneAt: null }; } })()`);
console.log('test items:', await ev(mockTest)); await shot('admin-test');
ws.close(); chrome.kill(); process.exit(0);
