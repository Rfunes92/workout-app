// v22 Admin pause/delete screenshots (mock users, no Firebase sign-in). Node 22+ (or Node 20 with --experimental-websocket) + google-chrome.
// Usage: node tools/admin_status_shots.mjs <baseUrl> <outDir> [width] [height] [prefix]
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const [base = 'http://localhost:8000', out = 'shots', W = '1280', H = '800', prefix = ''] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn('google-chrome', ['--headless=new', `--remote-debugging-port=${port}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', `--user-data-dir=/tmp/mu-st-${port}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, id = 0; const pending = new Map();
for (let i = 0; i < 50; i++) { try { const r = await fetch(`http://127.0.0.1:${port}/json/list`); const t = (await r.json()).find(x => x.type === 'page'); if (t) { ws = new WebSocket(t.webSocketDebuggerUrl); break; } } catch (e) {} await sleep(200); }
await new Promise(r => ws.addEventListener('open', r));
ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result && r.result.exceptionDetails) console.warn('eval err', JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result && r.result.result && r.result.result.value; };
const mobile = +W < 600;
await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: mobile ? 2 : 1, mobile });
await send('Page.enable');
await send('Page.navigate', { url: base + '/manifest.webmanifest' }); await sleep(800);
await ev(`(() => { localStorage.clear(); localStorage.setItem('ronnieAuth.guest','1'); localStorage.setItem('ronnieAuth.nudgeUntil', String(Date.now()+864e6));
  localStorage.setItem('ronnieWorkout.v1', JSON.stringify({ v: 1, setupDone: true, profile: { name: 'Ronnie', tutorialDone: true }, schedule: { mon: { type: 'gym' }, tue: { type: 'home' }, wed: { type: 'rest' }, thu: { type: 'gym' }, fri: { type: 'gym' }, sat: { type: 'home' }, sun: { type: 'gym' } } })); return true; })()`);
// email, name, onboarded, goals, days since active, status
const users = [['ronniefunes92@gmail.com', 'Ronnie', 1, ['fat_loss', 'sculpt'], 0, 'active'], ['tester.alex@example.com', 'Alex', 1, ['strength'], 1, 'active'], ['maria.t@example.com', 'Maria', 1, ['fat_loss'], 2, 'paused'], ['jordan@example.com', '', 0, [], 5, 'active'], ['sam.lee@example.com', 'Sam', 1, ['sculpt'], 9, 'active'], ['spam.bot@example.com', '', 0, [], 20, 'deleted']];
const mock = showDel => `(() => { const D = ms => ({ toDate: () => new Date(ms), toMillis: () => ms }); const now = Date.now();
  const rows = ${JSON.stringify(users)}.map(([email, name, onb, goals, ago, status], i) => ({ id: 'u' + i, email, displayName: name, onboarded: !!onb, coach: { goals }, status, createdAt: D(now - (40 + i * 6) * 864e5), lastActive: D(now - ago * 864e5), deletedAt: status === 'deleted' ? D(now) : null }));
  window.WO.adminPreview.setShowDeleted(${showDel}); document.getElementById('adminBox').innerHTML = window.WO.adminPreview.usersHtml(rows); return rows.length; })()`;
const detail = `(() => { const P = window.WO.adminPreview; const r = { id: 'u2', email: 'maria.t@example.com', status: 'paused' };
  document.getElementById('adminBox').innerHTML = '<div style="color:var(--text)"><a href="#admin" class="small">← All users</a><div class="admin-dhead"><div><b style="font-size:16px">maria.t@example.com</b>' + P.statusPill(r) + '</div>' + P.userActs(r, true) + '</div><div class="small muted">Maria · Joined Sep 1, 2026 · Active Oct 9, 2026</div><div class="admin-detail"><div class="card flat"><h3>Activity</h3><div class="row between" style="padding:8px 0;border-bottom:1px solid var(--line)"><span class="muted">Workout days completed</span><b>14</b></div><div class="row between" style="padding:8px 0"><span class="muted">Food days logged</span><b>22</b></div></div></div><div class="small muted" style="margin-top:8px">Paused Oct 11, 2026: this person is locked out of the app; their data is kept. Data is read-only here.</div></div>'; return 1; })()`;
async function shot(name, full = true) {
  await sleep(300);
  if (full) { const h = await ev('Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)'); await send('Emulation.setDeviceMetricsOverride', { width: +W, height: Math.min(Math.max(+H, h), 4000), deviceScaleFactor: mobile ? 2 : 1, mobile }); await sleep(400); }
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/${prefix}${name}.png`, Buffer.from(r.result.data, 'base64'));
  await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: mobile ? 2 : 1, mobile });
  console.log('saved', `${out}/${prefix}${name}.png`);
}
await send('Page.navigate', { url: base + '/index.html#admin' }); await sleep(3000);
await ev(`document.documentElement.classList.remove('needs-auth','auth-open','needs-onboard')`);
console.log('rows', await ev(mock(false))); await shot('admin-users-status');
console.log('rows', await ev(mock(true))); await shot('admin-users-show-deleted');
await ev(detail); await shot('admin-user-paused-detail', false);
await ev(`window.WO.adminPreview.block('paused')`); await sleep(300); await shot('account-paused-screen', false);
await send('Page.navigate', { url: base + '/index.html#today' }); await sleep(2500);
await ev(`document.documentElement.classList.remove('needs-auth','auth-open','needs-onboard'); window.WO.adminPreview.block('deleted')`); await sleep(300); await shot('account-deleted-screen', false);
ws.close(); chrome.kill(); process.exit(0);
