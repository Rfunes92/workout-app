// Node audit: flags anatomically implausible joint angles in every side-view rig (elbows bent backward, knees
// hyperextended / bent forward, hips past extension) and feet/hands sinking through the floor.
// Run: node tools/audit_poses.js [--verbose]
global.window = { matchMedia: null }; global.localStorage = { getItem() {}, setItem() {} };
global.document = { querySelectorAll: () => [] }; global.performance = { now: () => 0 };
require('../js/exercises.js'); require('../js/mannequin.js');
const M = window.WO.MANNEQUIN, verbose = process.argv.includes('--verbose');
const nrm = a => { a = ((a + 180) % 360 + 360) % 360 - 180; return a; };
// elbow: forearm rotates toward the front of the upper arm (+). knee: shank folds back (-). hip: T - t (180 = standing).
const LIM = { elbow: [-12, 168], knee: [-165, 8], hip: [18, 212] };
const used = new Set(Object.values(M.EX_RIG)); const out = {};
used.forEach(name => { const r = M.normalize(M.RIGS[name]); if (r.view || r.outOfPlane) return; const issues = new Set(); // front/back views + out-of-plane rigs are checked by eye (tools/demo_gallery.html)
  for (let i = 0; i < 48; i++) { const P = M.pose(r, M.phase(r, i / 48).q), q = P.q;
    ['1', '2'].forEach(s => {
      // elbow: skipped when the arm is strongly foreshortened (it moves out of the picture plane) or folded flat (|rel| > 150 reads as a tight bend)
      const e = nrm(q['f' + s] - q['u' + s]), oop = q['ku' + s] < 0.5 || q['kf' + s] < 0.5;
      if (!oop && Math.abs(e) <= 150 && (e < LIM.elbow[0] || e > LIM.elbow[1])) issues.add(`elbow${s} ` + (e < 0 ? 'hyperext' : 'over-flexed') + (verbose ? ` (${Math.round(e)} @${i})` : ''));
      const lo = q['kt' + s] < 0.5 || q['ks' + s] < 0.5, k = nrm(q['s' + s] - q['t' + s]); if (!lo && (k < LIM.knee[0] || k > LIM.knee[1])) issues.add(`knee${s} ` + (k > 0 ? 'bent forward' : 'over-flexed') + (verbose ? ` (${Math.round(k)} @${i})` : ''));
      const h = ((q.T - q['t' + s]) % 360 + 360) % 360; if (q['kt' + s] >= 0.5 && (h < LIM.hip[0] || h > LIM.hip[1])) issues.add(`hip${s} ` + (h > LIM.hip[1] ? 'hyperext' : 'over-flexed') + (verbose ? ` (${Math.round(h)} @${i})` : ''));
    });
    if (r.floor !== false) ['A1', 'A2', 'W1', 'W2', 'K1', 'K2', 'F1', 'F2'].forEach(j => { if (P[j][1] > (j[0] === 'F' ? 183 : 186)) issues.add(j + ' below floor'); });
  }
  if (issues.size) out[name] = [...issues];
});
const n = Object.keys(out).length;
Object.entries(out).forEach(([k, v]) => console.log(k.padEnd(12), v.join(', ')));
console.log(`${used.size} rigs in use, ${n} with pose issues`);
process.exit(n ? 1 : 0);
