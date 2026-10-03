// Precompute the app's own plan (js/planner.js) for the sim user: node tools/gen_sim_plan.js > tools/sim_plan.json
const fs = require('fs'), vm = require('vm');
const ctx = { window: {}, console }; ctx.window.WO = {}; ctx.WO = ctx.window.WO; vm.createContext(ctx);
for (const f of ['js/exercises.js', 'js/planner.js']) vm.runInContext(fs.readFileSync(__dirname + '/../' + f, 'utf8'), ctx);
const WO = ctx.WO, START = '2026-09-28';
const sched = { mon: { type: 'gym', time: '05:00', focus: 'auto' }, tue: { type: 'muaythai', time: '18:00', focus: 'auto' }, wed: { type: 'rest', time: '', focus: 'auto' }, thu: { type: 'gym', time: '09:30', focus: 'auto' }, fri: { type: 'gym', time: '05:00', focus: 'auto' }, sat: { type: 'home', time: '', focus: 'auto' }, sun: { type: 'home', time: '', focus: 'auto' } };
const state = { v: 1, setupDone: true, profile: { name: 'Ava', units: 'lb', sessionLength: 60 }, goals: ['fat_loss', 'sculpt'],
  locations: { gym: { name: 'LA Fitness', equip: WO.PRESETS.gym.items.slice() }, home: { name: 'Home gym', equip: WO.PRESETS.home.items.slice() }, muaythai: { name: 'Muay Thai', equip: WO.PRESETS.muaythai.items.slice() } },
  custom: { gym: [], home: [], muaythai: [] }, schedule: sched, swaps: {}, done: {}, log: {}, startDate: START };
const out = { startDate: START, baseState: state, days: {} };
for (let i = 0; i < 63; i++) {
  const d = new Date(2026, 8, 28 + i), iso = d.toISOString().slice(0, 10);
  const wk = WO.buildWeek(state, d), dk = WO.DAYS[(d.getDay() + 6) % 7], s = wk[dk] || (wk.days && wk.days[dk]);
  if (!s) { if (i === 0) console.error('week keys', Object.keys(wk)); continue; }
  const items = [...(s.warmup || []), ...(s.items || []), ...(s.finisher ? [s.finisher] : []), ...(s.cooldown || [])];
  out.days[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`] = { day: dk, type: sched[dk].type, items: items.map(it => ({ key: it.key, exId: it.exId || (it.ex && it.ex.id), sets: it.sets || 1, kind: (WO.EX_BY_ID[it.exId || (it.ex && it.ex.id)] || {}).kind })) };
}
process.stdout.write(JSON.stringify(out));
