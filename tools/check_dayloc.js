// Node check (v19): one-day Home/Gym override + warm-up swaps respect location equipment and injury limits.
// Run: node tools/check_dayloc.js
global.window = { matchMedia: null }; global.localStorage = { getItem() {}, setItem() {} };
global.document = { querySelectorAll: () => [] };
require('../js/exercises.js'); require('../js/planner.js');
const W = window.WO; let bad = 0; const ok = (c, m) => { if (!c) { console.log('FAIL', m); bad++; } else console.log('ok  ', m); };
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const now = new Date(), today = W.DAYS[(now.getDay() + 6) % 7];
const sched = {}; W.DAYS.forEach(d => { sched[d] = { type: 'gym', time: '', focus: 'auto' }; });
const state = { profile: { sessionLength: 60, experience: 'some', limitations: [] }, goals: ['muscle', 'mobility'], schedule: sched, swaps: {}, custom: { gym: [], home: [], muaythai: [] },
  locations: { gym: { name: 'Gym', equip: W.PRESETS.gym.items.slice() }, home: { name: 'Home', equip: ['bands'] }, muaythai: { name: 'MT', equip: [] } }, startDate: iso(now), dayLoc: {} };
const home = W.equipSet(state, 'home'), gym = W.equipSet(state, 'gym');
let wk = W.buildWeek(state, now);
ok(wk[today].loc === 'gym' && !wk[today].locOverride, 'weekly plan: today at the gym');
state.dayLoc[iso(now)] = 'home'; wk = W.buildWeek(state, now);
const s = wk[today];
ok(s.loc === 'home' && s.type === 'home' && s.locOverride && s.schedType === 'gym', 'Today only: Home switches today to Home');
ok(state.schedule[today].type === 'gym', 'weekly schedule untouched');
ok(W.DAYS.filter(d => d !== today).every(d => wk[d].loc === 'gym'), 'other days stay at the gym');
ok([...s.warmup, ...s.items].every(it => W.canDo(W.EX_BY_ID[it.exId], home)), 'every warm-up + lift is doable with home equipment');
ok(s.warmup.length > 0 && s.warmup.every(it => it.warm && it.slot === 'mobility'), 'warm-ups are swappable items');
const opts = W.swapOptions(state, s, s.warmup[0]);
ok(opts.length > 0 && opts.every(e => W.canDo(e, home) && e.slots.includes('mobility')), `warm-up swap offers ${opts.length} home-equipment mobility moves`);
const gymOnly = W.EXERCISES.filter(e => e.slots.includes('mobility') && W.canDo(e, gym) && !W.canDo(e, home)).map(e => e.id);
ok(!opts.some(e => gymOnly.includes(e.id)), 'no gym-only warm-ups offered at Home (' + gymOnly.length + ' excluded)');
// swap persists and the key is stable
state.swaps[`${today}:${s.warmup[0].key}`] = opts[0].id; wk = W.buildWeek(state, now);
ok(wk[today].warmup[0].exId === opts[0].id && wk[today].warmup[0].key === s.warmup[0].key, 'warm-up swap applied, key unchanged');
// injury filter: blockedFor + the sheet hides flagged moves; planner never seeds a blocked warm-up
state.profile.limitations = ['shoulders']; wk = W.buildWeek(state, now);
const blocked = W.blockedFor(state);
ok(!wk[today].warmup.some(it => blocked.has(it.exId) && !state.swaps[`${today}:${it.key}`]), 'shoulder limit: band dislocates never seeded as a warm-up');
// override expires: a different date has no effect
state.dayLoc = { '2000-01-01': 'home' }; wk = W.buildWeek(state, now);
ok(wk[today].loc === 'gym', 'override for another date does nothing');
process.exit(bad ? 1 : 0);
