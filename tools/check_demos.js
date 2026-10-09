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
      if (/NaN|undefined|Infinity/.test(s)) { console.log(fig, e.id, 'bad output at phase', i, (s.match(/.{50}(NaN|undefined|Infinity).{10}/) || [''])[0]); bad++; break; } } });
});
console.log(`${W.EXERCISES.length} exercises, ${W.EXERCISES.length - missing.length} with mannequin rigs, ${new Set(Object.values(M.EX_RIG)).size} rigs used; ${bad ? bad + ' problem(s)' : 'all OK'}`);
process.exit(bad ? 1 : 0);
