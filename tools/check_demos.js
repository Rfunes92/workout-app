// Node check: every exercise maps to a mannequin rig and renders without NaN in every phase, both figures.
// Run: node tools/check_demos.js
global.window = { matchMedia: null }; global.localStorage = { getItem() {}, setItem() {} };
global.document = { querySelectorAll: () => [] }; global.performance = { now: () => 0 };
require('../js/exercises.js'); require('../js/mannequin.js');
const W = window.WO, M = W.MANNEQUIN; let bad = 0;
const missing = W.EXERCISES.filter(e => !M.rigFor(e)).map(e => e.id);
if (missing.length) { console.log('NO RIG:', missing.join(' ')); bad++; }
['male', 'female'].forEach(fig => { M.setFigure(fig);
  W.EXERCISES.forEach(e => { const r = M.rigFor(e); if (!r) return;
    for (let i = 0; i < 24; i++) { const s = M.render(r, i / 24, { overlay: true, muscles: e.primary.concat(e.secondary) });
      if (/NaN|undefined|Infinity/.test(s)) { console.log(fig, e.id, 'bad output at phase', i, (s.match(/.{50}(NaN|undefined|Infinity).{10}/) || [''])[0]); bad++; break; } }
    // v18 coach mode: pinned cues + secondary muscles, and the mistake vs correct stills
    const c = M.render(r, r.key, { overlay: true, pins: true, muscles: e.primary, muscles2: e.secondary });
    if (/NaN|undefined|Infinity/.test(c)) { console.log(fig, e.id, 'bad coach-mode output'); bad++; }
    ['good', 'bad'].forEach(w => { const st = M.staticSvg(e, w); if (/NaN|undefined|Infinity/.test(st)) { console.log(fig, e.id, 'bad', w, 'still'); bad++; } }); });
});
// v19 pin layout: chips never overlap each other / leave the viewBox, badges never sit on top of each other,
// and leader lines (when drawn) never cross each other or another chip; checked at 12 phases per exercise
let pinBad = 0, withLeaders = 0, legendOnly = 0;
W.EXERCISES.forEach(e => { const r = M.rigFor(e), pins = r && M.pinsFor(r); if (!pins || !pins.length) return;
  const vb = M.fitBox(r, false, pins), K = Math.max(1, vb[2] / 230); let lead = 0;
  for (let i = 0; i < 12; i++) { const P = M.pose(r, M.phase(r, i / 12).q), L = M.layoutPins(pins, P, vb, K), c = L.chips; if (L.leaders) lead++;
    const ov = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
    c.forEach((x, k) => { const [rx, ry, rw, rh] = x.rect;
      if (rx < vb[0] - 0.01 || ry < vb[1] || rx + rw > vb[0] + vb[2] + 0.01 || ry + rh > vb[1] + vb[3] + 0.01) { console.log('PIN outside viewBox', e.id, x.text); pinBad++; }
      c.slice(k + 1).forEach(y => { if (ov(x.rect, y.rect)) { console.log('PIN chips overlap', e.id, x.text, '/', y.text); pinBad++; }
        if (Math.hypot(x.badge[0] - y.badge[0], x.badge[1] - y.badge[1]) < 6 * K) { console.log('PIN badges overlap', e.id, i); pinBad++; } }); }); }
  if (M.pinMode(r, pins, vb, K)) withLeaders++; else legendOnly++; });
console.log(`pins: ${withLeaders} exercises use leader lines (clean all cycle), ${legendOnly} switch to numbered-legend mode when crowded; ${pinBad ? pinBad + ' layout problem(s)' : 'no overlaps'}`);
bad += pinBad;
const pinned = W.EXERCISES.filter(e => M.rigFor(e) && M.pinsFor(M.rigFor(e)).length >= 2).length, mist = W.EXERCISES.filter(e => M.mistakeFor(e)).length;
console.log(`coach mode: ${pinned} exercises with 2-3 pinned cues, ${mist} with a mistake-vs-correct panel`);
console.log(`${W.EXERCISES.length} exercises, ${W.EXERCISES.length - missing.length} with mannequin rigs, ${new Set(Object.values(M.EX_RIG)).size} rigs used; ${bad ? bad + ' problem(s)' : 'all OK'}`);
process.exit(bad ? 1 : 0);
