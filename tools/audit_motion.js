// Node audit: choreography smoothness for every rig in use. Samples each cycle at 360 steps and flags
//  - POPS: a joint jumps far more in one step than in the steps around it (IK flips, floor/hug clamps, bad keys)
//  - JERK: a joint's velocity changes abruptly (kinks at keyframes = robotic "stop-go")
// Run: node tools/audit_motion.js [--all]   (exit 1 if any rig pops)
global.window = { matchMedia: null }; global.localStorage = { getItem() {}, setItem() {} };
global.document = { querySelectorAll: () => [] }; global.performance = { now: () => 0 };
require('../js/exercises.js'); require('../js/mannequin.js');
const M = window.WO.MANNEQUIN, all = process.argv.includes('--all'), N = 360;
const used = [...new Set(Object.values(M.EX_RIG))], rows = [];
used.forEach(name => { const r = M.normalize(M.RIGS[name]); const J = r.view ? ['KL', 'KR', 'AL', 'AR', 'EL', 'ER', 'WL', 'WR', 'Hd'] : ['K1', 'K2', 'A1', 'A2', 'E1', 'E2', 'W1', 'W2', 'Hd', 'F1', 'F2'];
  const P = Array.from({ length: N + 2 }, (_, i) => M.pose(r, M.phase(r, i / N).q));
  let pop = 0, popAt = '', jerk = 0, jerkAt = '';
  J.forEach(j => { const v = []; for (let i = 0; i <= N; i++) { const a = P[i][j], b = P[i + 1][j]; v.push([b[0] - a[0], b[1] - a[1]]); }
    const sp = v.map(d => Math.hypot(d[0], d[1])), mean = sp.reduce((s, x) => s + x, 0) / sp.length || 1e-6;
    sp.forEach((s, i) => { let nb = 0, c = 0; for (let d = -4; d <= 4; d++) if (d && Math.abs(d) > 1 && sp[i + d] != null) { nb += sp[i + d]; c++; } const k = s / Math.max(nb / (c || 1), mean * 0.25, 0.05); if (k > pop) { pop = k; popAt = `${j}@${(i / N).toFixed(2)}`; } });
    for (let i = 1; i < v.length; i++) { const dv = Math.hypot(v[i][0] - v[i - 1][0], v[i][1] - v[i - 1][1]) / Math.max(mean, 0.05); if (dv > jerk) { jerk = dv; jerkAt = `${j}@${(i / N).toFixed(2)}`; } } });
  rows.push({ name, pop, popAt, jerk, jerkAt }); });
rows.sort((a, b) => b.pop + b.jerk - a.pop - a.jerk);
const bad = rows.filter(r => r.pop > 3);
(all ? rows : rows.slice(0, 25)).forEach(r => console.log(r.name.padEnd(12), 'pop', r.pop.toFixed(1).padStart(5), r.popAt.padEnd(10), ' jerk', r.jerk.toFixed(2).padStart(5), r.jerkAt));
console.log(`${rows.length} rigs; ${bad.length} pop (step > 3x its neighbours): ${bad.map(r => r.name).join(' ')}`);
process.exit(bad.length ? 1 : 0);
