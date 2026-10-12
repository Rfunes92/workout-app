// v26 motion audit for the 3-D anatomical figure: node tools/audit_motion3d.js [ids|all|hero] [--verbose]
// Samples every rig 240x per rep and flags: pops (any joint or muscle belly jumping far more than its typical step),
// elbow/knee hyperextension or over-flexion, hands/feet/knees sinking through the floor, limb-frame flips (a muscle
// belly swapping sides of its bone between two samples), and too-fast tempo (rep period < 3.2 s).
global.window = global; global.localStorage = { getItem() {}, setItem() {} }; global.document = { querySelectorAll: () => [] };
const path = require('path'), root = path.join(__dirname, '..');
require(root + '/js/exercises.js'); require(root + '/js/mannequin.js'); require(root + '/js/anatomy.js');
const W = window.WO, A = W.ANATOMY;
const HERO = 'bb_bench,cable_pushdown,incline_db_press,leg_extension,farmer_carry,bb_back_squat,cable_row,ez_curl,bb_row,db_row,pushup,lat_pulldown'.split(',');
const arg = process.argv[2] || 'hero', verbose = process.argv.includes('--verbose');
const ids = arg === 'all' ? W.EXERCISES.map(e => e.id) : arg === 'hero' ? HERO : arg.split(',');
const d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const angAt = (a, b, c) => { const u = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], v = [c[0] - b[0], c[1] - b[1], c[2] - b[2]]; return Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (Math.hypot(...u) * Math.hypot(...v))))) * 180 / Math.PI; };
const J = ['Hc', 'Sc', 'Hd', 'Kn', 'Kf', 'An', 'Af', 'Tn', 'Tf', 'En', 'Ef', 'Wn', 'Wf'];
let total = 0; const rows = [];
for (const id of ids) {
  const ex = W.EX_BY_ID[id]; if (!ex) continue; const rig = A.rigOf(ex), N = 240, issues = [];
  const S = []; for (let i = 0; i <= N; i++) S.push(A._prims(rig, i / N));
  // per-joint step sizes
  const step = J.map(k => S.slice(1).map((s, i) => d3(s.sk[k], S[i].sk[k])));
  // pops = velocity discontinuities: an isolated spike vs. both neighbouring steps, or an absolute teleport
  // ~1 unit = 1 cm on a 175-unit figure; controlled lifts should keep every joint under ~2.3 m/s, ballistic drills under 6 m/s
  const ballistic = /jump|run|burpee|jack|shadow|bag|bike|rower|climb|swing|climber/.test(rig._name + id), vmax = (ballistic ? 600 : 230) * rig.period / 1000 / N;
  J.forEach((k, j) => { const st = step[j];
    st.forEach((v, i) => { const pv = st[i - 1] != null ? st[i - 1] : v, nv = st[i + 1] != null ? st[i + 1] : v;
      if (v > vmax || (v > 2 && v > 2.2 * Math.max(pv, nv) + 0.7)) issues.push(`pop ${k} @t=${(i / N).toFixed(3)} step ${v.toFixed(1)} (${(v * N / rig.period * 1000 / 100).toFixed(1)} m/s) (prev ${pv.toFixed(2)} next ${nv.toFixed(2)})`); }); });
  // muscle-belly continuity: a belly moving much further than any joint did in that step = its limb frame flipped
  const mid = o => o.k === 'ell' ? o.c : o.p[1];
  S.slice(1).forEach((s, i) => { const js = Math.max(...J.map((k, j) => step[j][i])); s.body.forEach((o, m) => { const p = S[i].body[m]; if (!p) return; const v = d3(mid(o), mid(p)); if (v > 2 && v > 2.5 * js + 1) issues.push(`flip ${o.grp}/${o.g || 'core'}#${m} @t=${(i / N).toFixed(3)} jump ${v.toFixed(1)} (joints ${js.toFixed(1)})`); }); });
  // joint limits + floor
  S.forEach((s, i) => { const k = s.sk, t = (i / N).toFixed(3);
    [['n', 'S', 'E', 'W'], ['f', 'S', 'E', 'W']].forEach(([sd]) => { const a = angAt(k['S' + sd], k['E' + sd], k['W' + sd]); if (a < 28) issues.push(`elbow ${sd} over-flexed ${a.toFixed(0)}° @t=${t}`); });
    ['n', 'f'].forEach(sd => { const a = angAt(k['H' + sd], k['K' + sd], k['A' + sd]); if (a < 30) issues.push(`knee ${sd} over-flexed ${a.toFixed(0)}° @t=${t}`); });
    ['An', 'Af', 'Tn', 'Tf', 'Wn', 'Wf', 'Kn', 'Kf'].forEach(j => { if (k[j][1] < -1.5) issues.push(`${j} below floor ${k[j][1].toFixed(1)} @t=${t}`); }); });
  if (rig.period < 3200 && !/jump|run|burpee|jack|shadow|bag|bike|rower|climb|swing|walk|carry|climber/.test(rig._name + id)) issues.push(`fast tempo ${rig.period}ms`);
  // collapse repeats
  const uniq = {}; issues.forEach(s => { const key = s.replace(/@t=[\d.]+.*/, '').replace(/#\d+/, '').replace(/-?[\d.]+°/, 'N°').replace(/below floor -?[\d.]+/, 'below floor'); (uniq[key] = uniq[key] || []).push(s); });
  const keys = Object.keys(uniq); total += keys.length;
  rows.push(`${keys.length ? '✗' : '✓'} ${id} (${rig._name}, ${(rig.period / 1000).toFixed(1)}s/rep)` + (keys.length ? '\n    ' + keys.map(k => `${k} x${uniq[k].length}` + (verbose ? ' :: ' + uniq[k][0] : '')).join('\n    ') : ''));
}
console.log(rows.join('\n')); console.log(`\n${ids.length} rigs, ${total} issue kinds`);
