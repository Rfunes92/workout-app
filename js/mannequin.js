/* Anatomical mannequin demos: filled + shaded body driven by joint-angle keyframes, with a posture-coaching overlay
   (neutral-spine guide, joint angle arcs, phased cues) and the exercise's primary muscles highlighted. Original artwork.
   EVERY exercise in the library maps to a rig here (EX_RIG); the old stick-figure renderer (demo.js) is no longer used.
   v25 look (Ronnie: "Lyfta-clean anatomical style, our own"): light studio stage, pale-grey anatomical figure with a faint
   muscle-group mesh (MESH panels + DEFL definition lines), bare torso + dark shorts (male) / sports top + shorts (female),
   target muscles in red with a soft glow (mqRed + mqGlow, brightest at the key pose), back/chest targets turn the near arm
   behind the torso so the red is never hidden, lighter coaching cues. Artwork is drawn from our own rigs, no traced assets.
   Figures: muscular male (default) or female, chosen per user (Setup → Appearance or the toggle under the demo).
   SIDE view (default): angles are absolute, in degrees: 0 = segment points straight down, +90 = points forward (the way
   the figure faces, +x), 180 = up, -90 = backward. T torso (hip->shoulder), N head, t thigh, s shank, u upper arm,
   f forearm, fa foot (90 = flat, toes forward); suffix 1 = near side, 2 = far side; k* = length scale (foreshortening);
   ru1/rf1 (ru2/rf2) = arm angles relative to the torso (0 = arm along the torso toward the hips, + = toward the chest side);
   B = spine curve (+ rounds the back, - arches); ox/oy shift the whole body; ikW1/ikA2... = [x,y] targets the
   wrist/ankle reaches (2-bone IK); wy1/wy2 = straight arm reaches floor height y.
   FRONT / BACK view (view:'front'|'back'): T torso (180 = upright), kT torso length, tw shoulder twist (-1..1),
   tL/sL/tR/sR legs, uL/fL/uR/fR arms (angles in the picture plane, + = toward screen right), ikWL/ikWR/ikAL/ikAR. */
(function () {
  'use strict';
  const WO = window.WO = window.WO || {};
  const R = Math.PI / 180, f1 = n => (Math.round(n * 10) / 10).toString();
  const LEN = { thigh: 43, shank: 42, torso: 50, ua: 31, fa: 32 }, FLOOR = 182;
  const SLOW = 1.35; // Ronnie: slower, coach-paced tempo than the old stick demos (applied to every rig period)
  const dir = a => [Math.sin(a * R), Math.cos(a * R)];
  const ang = v => Math.atan2(v[0], v[1]) / R;
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
  const lerpA = (a, b, k) => a + (b - a) * k;
  const nrm = a => ((a + 180) % 360 + 360) % 360 - 180;
  // a limb pair bends naturally if the elbow flexes forward (rel >= 0) / the knee folds back (rel <= 0); fully folded counts as natural
  const natural = (j, [up, lo]) => { const r = nrm(lo - up); return Math.abs(r) > 172 || (j[0] === 'W' ? r >= -3 : r <= 3); };

  // ---------- figure (male / female) ----------
  let FIG = 'male';
  try { const v = localStorage.getItem('mountup.figure'); if (v === 'female' || v === 'male') FIG = v; } catch (e) { /* ignore */ }
  // side-view outlines in local coords (u along the segment, v toward the body's front)
  const SH = {
    male: { // muscular build: big delts/pecs/lats/traps, full quads + calves
      thigh: [[-3, 11], [10, 13.2], [24, 12.2], [36, 9], [46, 3.6], [46, -4.6], [38, -8.4], [26, -11.6], [12, -13.4], [-3, -11]],
      calf: [[-3, 6.4], [12, 5.8], [28, 4.2], [43, 3.6], [43, -3.8], [34, -5.2], [20, -9.8], [9, -11.2], [-1, -8.6]],
      ua: [[-7, 9.2], [1, 10.8], [9, 9.4], [17, 8.6], [25, 6.6], [33, 3.6], [33, -4], [25, -6.6], [14, -9], [3, -10], [-7, -8.6]],
      fa: [[-2, 5.8], [6, 6.8], [15, 5.4], [23, 3.4], [26.5, 4.4], [31, 4], [34.5, 1], [33.6, -2.6], [29, -3.6], [24, -3.2], [16, -4.4], [2, -5.6]], // v23: wrist + hand
      torso: [[-5, 5.4], [4, 11], [14, 10.4], [24, 11.4], [31, 15.4], [38, 17.4], [45, 15], [51, 8.6], [56, 1.4], [55.6, -7.6], [50, -15], [40, -15.4], [28, -12], [18, -10], [8, -16.4], [-1, -15.6], [-5, -10]],
      neck: [[0, 7], [10, 6], [10, -6.4], [0, -8.6]],
      head: [[9, -6.6], [14, -10.8], [22, -10.6], [28, -5.6], [29.6, 1], [27.4, 6.6], [23, 9.8], [19.5, 10.8], [16.6, 12.6], [13, 11.8], [10.6, 8.6], [8.4, 4]],
      hair: [[13.6, -10.9], [22, -11.4], [28.4, -6], [30.4, 0.6], [27.6, 0.6], [25, -3.6], [19, -6.4], [13, -8.4]],
      foot: [[-7, 6.6], [10, 6.8], [22, 6.6], [24.5, 3.6], [20, 0.4], [12, -1.6], [4, -3.8], [-5, -4], [-8.4, 0.8]],
      mk: { torso: 1.18, thigh: 1.22, calf: 1.25, ua: 1.55, fa: 1.35 }
    },
    female: { // athletic female: narrower shoulders, smaller waist, wider hips/glutes, ponytail
      thigh: [[-3, 9.4], [12, 10], [26, 8], [38, 6], [46, 3], [46, -4], [36, -6.2], [22, -9.4], [8, -11.8], [-3, -10.4]],
      calf: [[-3, 5], [14, 4.4], [30, 3.2], [43, 2.8], [43, -3], [32, -4.2], [17, -7.4], [4, -7]],
      ua: [[-4, 5.6], [5, 6], [16, 4.6], [28, 3.4], [32, 2.6], [32, -3], [20, -4.2], [8, -5.4], [-4, -5.8]],
      fa: [[-2, 3.6], [9, 4], [18, 3], [23, 2.5], [26.5, 3.4], [30.5, 3.2], [33.6, 0.8], [32.6, -2.2], [28, -3], [23.5, -2.5], [15, -3], [0, -3.4]],
      torso: [[-5, 5.4], [4, 10.4], [14, 8], [23, 7.6], [30, 10.4], [35, 13.4], [40, 12.6], [45, 9.2], [51, 5], [55, 0.4], [54, -6], [46, -9.2], [33, -8], [20, -6.8], [9, -15], [-1, -14.6], [-5, -10]],
      neck: [[0, 4.4], [10, 3.8], [10, -4.2], [0, -5]],
      head: [[9, -6], [14, -10.4], [22, -10.2], [27.6, -5.4], [29, 1], [27, 6.4], [22.8, 9.2], [19.6, 10], [16.8, 11.4], [13.6, 10.8], [11.2, 8], [8.8, 4]],
      hair: [[12.4, -9.6], [16, -12.4], [23, -12.4], [28.6, -7], [30.2, -0.4], [27, -2.6], [22.6, -6.4], [17, -7], [14.6, -12.8], [10, -18.6], [3, -19.6], [-2, -17], [4, -15.6], [9.4, -12.4]],
      foot: [[-6.6, 5.8], [10, 6], [21, 5.8], [23.4, 3.2], [19, 0.4], [11, -1.4], [4, -3.2], [-4.6, -3.4], [-7.8, 0.8]],
      mk: { torso: 1, thigh: 1, calf: 0.95, ua: 0.9, fa: 0.9 }
    }
  };
  // front-view (and back-view) outlines: v = toward the body's outside for limbs; torso half-outline mirrored
  const SHF = {
    male: { hw: 7.6, sw: 18.6,
      torso: [[-7, 0], [-6, 8], [-2, 12.6], [6, 13.2], [14, 12.8], [22, 14.6], [30, 17.6], [38, 20], [44, 22], [49, 21], [52.5, 15], [54.5, 7.4], [55, 0]],
      thigh: [[-3, 11.6], [10, 12.4], [26, 9.4], [40, 6.4], [46, 0], [40, -6.4], [26, -9.6], [10, -10.4], [-3, -8.6]],
      calf: [[-2, 6.6], [10, 8.2], [24, 5.2], [43, 3.6], [43, -3.6], [24, -5.2], [10, -7.4], [-2, -6]],
      ua: [[-7, 9.6], [4, 10.6], [14, 7.6], [24, 6.8], [33, 3.8], [33, -4], [22, -6.2], [10, -7], [-2, -6.6], [-7, -2]],
      fa: [[-2, 5.8], [8, 6.4], [18, 4.6], [23.5, 3.4], [27, 4.6], [32, 3.6], [34.5, 0], [32, -3.6], [27, -4.4], [23.5, -3.4], [18, -4.4], [2, -5.4]],
      head: [9.4, 11.4], neck: 7 },
    female: { hw: 8.4, sw: 14,
      torso: [[-7, 0], [-6, 9], [-1, 14.6], [6, 15], [12, 12.4], [19, 10], [26, 10.8], [32, 12.4], [38, 13.4], [44, 14], [49, 14.4], [52.5, 10.4], [54.5, 5.6], [55, 0]],
      thigh: [[-3, 10.4], [12, 10.4], [28, 7.6], [40, 5.4], [46, 0], [40, -5.4], [26, -7.8], [10, -9], [-3, -7.6]],
      calf: [[-2, 5], [12, 6], [26, 4], [43, 2.8], [43, -2.8], [24, -4], [10, -5.6], [-2, -4.6]],
      ua: [[-5, 6], [6, 6], [18, 4.4], [32, 2.8], [32, -3], [20, -4], [8, -4.6], [-5, -4]],
      fa: [[-2, 3.8], [8, 4.2], [18, 3.2], [23.5, 2.5], [27, 3.4], [31.5, 2.8], [33.8, 0], [31.5, -2.8], [27, -3.4], [23.5, -2.5], [16, -3], [2, -3.6]],
      head: [9, 11], neck: 4.6 }
  };
  // v19 build: fuller, more muscular silhouettes (male most); the *B shapes are what gets drawn, muscles scale with them
  const BUILD = { male: { torso: 1.07, thigh: 1.12, calf: 1.12, ua: 1.14, fa: 1.12 }, female: { torso: 1.03, thigh: 1.06, calf: 1.05, ua: 1.08, fa: 1.06 } };
  Object.keys(SH).forEach(f => { const b = BUILD[f], S = SH[f]; S.build = b; ['torso', 'thigh', 'calf', 'ua', 'fa'].forEach(k => { S[k + 'B'] = S[k].map(([u, v]) => [u, v * b[k]]); }); });
  Object.keys(SHF).forEach(f => { const b = BUILD[f], S = SHF[f]; S.build = b; ['thigh', 'calf', 'ua', 'fa'].forEach(k => { S[k] = S[k].map(([u, v]) => [u, v * b[k]]); }); S.torso = S.torso.map(([u, v]) => [u, v * b.torso]); S.sw *= b.torso; });
  const figShapes = () => SH[FIG] || SH.male, figFront = () => SHF[FIG] || SHF.male;

  // ---------- muscles ----------
  // side view: id -> [segment, local shape]
  const MUS = {
    glutes: ['torso', [[-3.5, -9.4], [5, -13.2], [14, -10], [12, -3.5], [1, -3]]],
    lower_back: ['torso', [[10, -8.2], [20, -8.4], [22, -5], [11, -5]]],
    upper_back: ['torso', [[28, -9.4], [38, -11.2], [48, -11.6], [53, -8], [47, -5.2], [38, -5.6], [30, -6.8]]],
    chest: ['torso', [[29, 8.4], [36, 11.6], [43, 12.2], [49, 9], [51, 4], [43, 3.4], [33, 4.2]]], // v25: fuller pec
    abs: ['torso', [[5, 8.4], [16, 8], [28, 8.6], [28, 4.6], [16, 4.4], [6, 4.8]]],
    obliques: ['torso', [[8, 6], [20, 6.4], [30, 4], [26, -3], [12, -4]]],
    abductors: ['torso', [[-2, -2], [6, -4], [10, 2], [2, 4]]],
    hamstrings: ['thigh', [[8, -6.2], [20, -9.2], [33, -6.8], [41, -4.2], [37, -2.4], [22, -4.4], [10, -3.4]]],
    quads: ['thigh', [[7, 7.6], [20, 8.8], [34, 7], [42, 4.6], [38, 2.6], [22, 4], [9, 3.8]]],
    hip_flexors: ['thigh', [[-3, 6.8], [6, 8.8], [15, 8], [13, 3.2], [1, 2.6]]],
    adductors: ['thigh', [[10, 1.5], [30, 1.5], [30, -1.5], [10, -1.5]]],
    calves: ['calf', [[4, -6.4], [14, -7.4], [26, -4.6], [22, -2.6], [12, -3.4], [4, -3]]],
    front_delts: ['ua', [[-4, 5.4], [5, 6], [11, 5], [10, -1], [2, -2], [-4, -1]]],
    side_delts: ['ua', [[-4, 5.2], [4, 6], [10, 5], [10, -5], [3, -6.2], [-4, -5.4]]],
    rear_delts: ['ua', [[-4, 1], [3, 1.5], [10, -1], [10, -5], [3, -6.2], [-4, -5.4]]],
    biceps: ['ua', [[6, 4.8], [16, 5.1], [26, 3.7], [24, 1.7], [14, 2], [6, 2]]],
    triceps: ['ua', [[4, -5.6], [16, -4.7], [28, -3.3], [26, -1.4], [14, -2], [4, -2.4]]],
    forearms: ['fa', [[0, 3], [12, 3.8], [22, 2.6], [22, -2.6], [12, -3], [0, -3]]]
  };
  MUS.lats = ['torso', [[14, -6.5], [22, -9.2], [32, -10.6], [42, -11.2], [46, -8], [40, -4.5], [30, -2.4], [20, -2.6]]]; MUS.traps = ['torso', [[44, -7], [50, -10.6], [56, -6], [55, -1.5], [49, -2.6]]]; // v25: lats fan out like a real lat
  // front view (torso halves mirrored; limb shapes use v = outward)
  const MUSF = {
    chest: ['torso', [[32, 1.4], [44, 1.4], [47.5, 9], [45, 16], [37, 16.4], [31, 9]]],
    abs: ['torso', [[5, 1.2], [30, 1.2], [30, 6.2], [5, 5.6]]],
    obliques: ['torso', [[6, 7.4], [26, 8.6], [29, 11.6], [20, 12.6], [8, 11.6]]],
    traps: ['torso', [[48, 4], [55, 4], [53, 11], [48, 10]]],
    hip_flexors: ['torso', [[-3, 4.6], [4, 5.4], [3, 10.4], [-4, 9.6]]],
    abductors: ['torso', [[-5, 9.8], [5, 11.4], [3, 13.4], [-6, 12.6]]],
    glutes: ['torso', [[-7, 8.6], [3, 10.8], [6, 12.8], [1, 13.4], [-7, 11.8]]], // v25: glute med at the side of the hip (front view)
    lower_back: ['torso', [[5, 1.2], [18, 1.2], [18, 6], [5, 6]]],
    quads: ['thigh', [[6, -5.6], [24, -5], [40, -3], [40, 4.4], [24, 6.6], [6, 7.6]]],
    adductors: ['thigh', [[4, -8], [22, -6.4], [30, -3.6], [24, -2.2], [6, -3]]],
    calves: ['calf', [[6, 4], [20, 5.4], [30, 3], [26, 0], [8, 1]]],
    front_delts: ['ua', [[-6, -4], [-6, 6], [6, 7.6], [11, 2], [8, -4]]],
    side_delts: ['ua', [[-6, 2], [-6, 8], [6, 9], [11, 6], [10, 2]]],
    biceps: ['ua', [[9, -3.6], [27, -2.6], [27, 3.4], [9, 4.2]]],
    forearms: ['fa', [[0, -3], [18, -2.6], [18, 3.4], [0, 4]]]
  };
  const MUSB = { // back view
    upper_back: ['torso', [[26, 1.2], [44, 1.2], [46, 10], [40, 13], [30, 8.6]]],
    lats: ['torso', [[14, 5], [24, 8], [36, 15.4], [42, 16.6], [36, 7], [22, 2]]],
    traps: ['torso', [[36, 1], [55, 1], [55, 6], [49, 13], [42, 6]]],
    lower_back: ['torso', [[4, 1], [20, 1], [20, 5.6], [4, 6]]],
    glutes: ['torso', [[-7, 1], [4, 1], [5, 11.4], [-3, 12.6], [-7, 7]]],
    abductors: ['torso', [[-3, 9.6], [6, 11.6], [4, 13.6], [-5, 12.6]]],
    obliques: ['torso', [[8, 9], [24, 10.6], [26, 12.4], [8, 12.4]]],
    hamstrings: ['thigh', [[10, -6], [36, -4], [40, 0], [36, 5], [10, 7]]],
    adductors: MUSF.adductors, calves: ['calf', [[4, -6], [20, -5], [24, 0], [20, 6.4], [4, 6.4]]],
    rear_delts: ['ua', [[-6, -4], [-6, 6], [6, 7.6], [11, 2], [8, -4]]],
    side_delts: MUSF.side_delts, triceps: ['ua', [[9, -3.6], [27, -2.6], [27, 3.4], [9, 4.2]]], forearms: MUSF.forearms
  };
  MUSB.upper_back_alias = MUSB.upper_back;
  // v25 anatomical "mesh": every figure carries a faint map of its muscle groups (panels = the same shapes the red target
  // highlight uses, so a highlighted muscle sits exactly in its slot) plus a few definition lines (ab rows, linea alba,
  // serratus, quad / calf separations, collarbones, spine). Targets are then drawn on top in red with a soft glow.
  const MESH = {
    side: { torso: ['chest', 'abs', 'obliques', 'lats', 'glutes', 'traps'], thigh: ['quads', 'hamstrings'], calf: ['calves'], ua: ['side_delts', 'biceps', 'triceps'], fa: ['forearms'] },
    front: { torso: ['chest', 'abs', 'obliques', 'traps'], thigh: ['quads', 'adductors'], calf: ['calves'], ua: ['side_delts', 'biceps'], fa: ['forearms'] },
    back: { torso: ['upper_back', 'lats', 'traps', 'lower_back', 'glutes'], thigh: ['hamstrings'], calf: ['calves'], ua: ['rear_delts', 'triceps'], fa: ['forearms'] } };
  const DEFL = { // open definition lines, same local coords as the muscle shapes
    side: { torso: [[[11, 4.9], [11.4, 8.2]], [[17.5, 4.7], [17.9, 8.1]], [[24, 4.8], [24.4, 8.5]], [[27, 3.2], [30, 5]], [[30.4, 2.4], [33.4, 4.2]], [[20, -3.2], [32, -4], [44, -5.4]]],
      thigh: [[[6, 0.6], [24, -0.4], [40, 0.8]]], calf: [[[10, -3], [24, -2], [35, -0.8]]], ua: [[[12, 0.6], [26, 0.3]]] },
    front: { mid: [[[3, 0], [17, 0], [31, 0]]], torso: [[[11.5, 0], [11.5, 5.6]], [[18.5, 0], [18.5, 5.8]], [[25.5, 0], [25.5, 6.2]], [[47.2, 3.6], [48.4, 8], [50.4, 13.4]]],
      thigh: [[[28, -4.2], [37, -3.6], [41.5, -0.4]], [[8, 1], [24, 1.6], [38, 1]]], calf: [[[8, 0.5], [22, 1], [32, 0.4]]] },
    back: { mid: [[[3, 0], [26, 0], [50, 0]], [[-7, 0], [3, 0]]], torso: [[[40, 4], [44, 9.6], [42, 14]]], thigh: [[[10, 0.6], [26, 0.4], [40, 0.2]]], calf: [[[6, 0], [20, 0.2], [28, 0]]] } };

  // ---------- shape helpers ----------
  function frame(o, d, torso) { const n = torso ? [-d[1], d[0]] : [d[1], -d[0]]; return ([a, b]) => [o[0] + d[0] * a + n[0] * b, o[1] + d[1] * a + n[1] * b]; }
  function smooth(pts) {
    const n = pts.length; let s = `M${f1(pts[0][0])},${f1(pts[0][1])}`;
    for (let i = 0; i < n; i++) { const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      s += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)},${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)},${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])},${f1(p2[1])}`; }
    return s + 'Z';
  }
  const openD = pts => { if (pts.length < 3) return `M${pts.map(p => f1(p[0]) + ',' + f1(p[1])).join(' L')}`; let o = `M${f1(pts[0][0])},${f1(pts[0][1])}`;
    for (let i = 1; i < pts.length - 1; i++) { const m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]; o += `Q${f1(pts[i][0])},${f1(pts[i][1])} ${i === pts.length - 2 ? f1(pts[i + 1][0]) + ',' + f1(pts[i + 1][1]) : f1(m[0]) + ',' + f1(m[1])}`; }
    return o; };
  const limbFr = (a, b, L, flip) => { const len = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(0.22, len / L), fv = flip ? -1 : 1, fr = frame(a, unit(a, b)); return ([u, v]) => fr([u * k, v * fv]); };
  // limb outline scaled to the actual (possibly foreshortened) segment length; flip mirrors v
  const limb = (a, b, local, L, flip) => { const len = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(0.22, len / L), fv = flip ? -1 : 1; return smooth(local.map(([u, v]) => [u * k, v * fv]).map(frame(a, unit(a, b)))); };
  const bend = (B, sh) => B ? sh.map(([u, v]) => [u, v - B * Math.sin(Math.PI * Math.max(0, Math.min(1, u / 55)))]) : sh;
  const mirror = half => half.concat(half.slice(1, -1).reverse().map(([u, v]) => [u, -v]));
  const ellipse = (c, rx, ry, a) => { const d = dir(a), up = [-d[0], -d[1]], rt = [-d[1], d[0]]; return smooth(Array.from({ length: 10 }, (_, i) => { const t = i / 10 * 2 * Math.PI; return add(add(c, rt, rx * Math.cos(t)), up, ry * Math.sin(t)); })); };
  // soft upper bound: identity well below lim, then eases into lim with matching slope (no hard "snap" at the limit)
  const softCap = (x, lim, w) => (x < lim - w ? x : lim - w * Math.exp(-(x - (lim - w)) / w));
  function ik2(root, tg, a, b, sg) { // two-bone IK -> [upper angle, lower angle]
    // v23: reach is soft-capped at ~99% so a limb glides into a "soft lock" instead of snapping straight (and never
    // sits exactly straight, where the elbow/knee bend direction could flip between the two solutions)
    const v = sub(tg, root), d0 = Math.hypot(v[0], v[1]) || 0.001, d = Math.max(Math.abs(a - b) + 0.01, softCap(d0, (a + b) * 0.993, (a + b) * 0.05));
    const base = ang(v), al = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d)))) / R, up = base + sg * al;
    const E = add(root, dir(up), a), T2 = add(root, [v[0] / d0, v[1] / d0], d); return [up, ang(sub(T2, E))];
  }

  // v23 Mount Up kit: the figure wears training clothes (tank / sports top + shorts / 7-8 tights) and trainers, with skin
  // on the arms, legs and face. Garments are the body's own outline cut to a band of the segment (local u range), so they
  // move and foreshorten exactly with the limb.
  function clipU(poly, u0, u1) { // Sutherland-Hodgman against u >= u0 and u <= u1 (local segment coords)
    const cut = (pts, keep, at) => { const out = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], ia = keep(a), ib = keep(b);
      if (ia) out.push(a); if (ia !== ib) { const k = (at - a[0]) / ((b[0] - a[0]) || 1e-6); out.push([at, a[1] + (b[1] - a[1]) * k]); } } return out; };
    let r = cut(poly, p => p[0] >= u0, u0); if (r.length > 2) r = cut(r, p => p[0] <= u1, u1); return r.length > 2 ? r : null; }
  // v25 anatomical kit (Ronnie: "Lyfta-clean, our own"): the male figure is bare from the waist up so the muscle map reads
  // (dark training shorts only); the female wears a short sports top + the same shorts. Trainers stay.
  const KIT = { // [u0, u1] bands per segment (torso u: hip 0 -> shoulder ~55; limbs u: root 0 -> joint)
    male: { top: [], bottom: { torso: [-9, 12.5], thigh: [-4, 18] } },
    female: { top: [[31, 49]], bottom: { torso: [-9, 13], thigh: [-4, 19] } } };
  const kit = () => KIT[FIG] || KIT.male;

  // v24 face (Ronnie: "give them a face, simple but human, not creepy"): soft dark almond eyes (no whites / pupils, so no
  // stare), light brows, a nose hint and a gentle closed-mouth smile. Authored in head-local coords and mapped by the
  // caller's head frame, so the face turns / tilts / foreshortens with the head on every rig.
  const qd = (m, a, c, b) => { const [A, C, Bp] = [a, c, b].map(m); return `M${f1(A[0])},${f1(A[1])} Q${f1(C[0])},${f1(C[1])} ${f1(Bp[0])},${f1(Bp[1])}`; };
  const almond = (m, c, rx, ry) => { const pts = Array.from({ length: 12 }, (_, i) => { const t = i / 12 * 2 * Math.PI; return [c[0] + rx * Math.cos(t), c[1] + ry * Math.sin(t) * (Math.sin(t) > 0 ? 1 : 0.8)]; }); return smooth(pts.map(m)); };
  function faceSide(m, fem) { // m: [u along the head (up), v toward the face] -> world; profile = one eye, brow, mouth (nose is in the outline)
    const e = fem ? [20.4, 7.6] : [20.2, 8.2];
    return `<path class="mq-eye" d="${almond(([u, v]) => m([u, v]), [e[0], e[1]], 1.15, fem ? 1.25 : 1.1)}"/>` +
      `<path class="mq-brow" d="${qd(m, [e[0] + 2.1, e[1] - 1.5], [e[0] + 2.9, e[1] + 0.1], [e[0] + 2.4, e[1] + 1.7])}"/>` +
      `<path class="mq-mouth" d="${fem ? qd(m, [13.2, 9.9], [12.6, 9.3], [13.1, 8.2]) : qd(m, [13.0, 10.6], [12.4, 10.0], [12.9, 8.8])}"/>`;
  }
  function faceFront(m, k, fem) { // m: [x right, y up] -> world, k = head width scale
    const X = x => x * k, ey = -0.6, ex = fem ? 3.3 : 3.5, er = fem ? [1.05, 1.3] : [1.0, 1.15];
    let o = [-1, 1].map(sg => `<path class="mq-eye" d="${almond(m, [X(sg * ex), ey], er[0] * k, er[1] * k)}"/>` +
      `<path class="mq-brow" d="${qd(m, [X(sg * (ex - 1.7)), ey + 2.4], [X(sg * ex), ey + 3.3], [X(sg * (ex + 1.8)), ey + 2.5])}"/>`).join('');
    o += `<path class="mq-nose" d="${qd(m, [X(-0.9), -4.9], [0, -5.7], [X(0.9), -4.9])}"/>`;
    o += `<path class="mq-mouth" d="${fem ? qd(m, [X(-2.1), -7.6], [0, -8.7], [X(2.1), -7.6]) : qd(m, [X(-2.5), -7.7], [0, -8.8], [X(2.5), -7.7])}"/>`;
    return o;
  }

  // ---------- scenery: { d: (P, rig) -> svg, pts: (P, rig) -> extents for the viewBox } ----------
  const rectLegs = (x0, x1, top, h = 8) => `<rect x="${f1(x0)}" y="${f1(top)}" width="${f1(x1 - x0)}" height="${h}" rx="3" class="scn"/><line x1="${f1(x0 + 10)}" y1="${f1(top + h)}" x2="${f1(x0 + 10)}" y2="${FLOOR}" class="scn-l"/><line x1="${f1(x1 - 10)}" y1="${f1(top + h)}" x2="${f1(x1 - 10)}" y2="${FLOOR}" class="scn-l"/>`;
  const seg = (a, b, w, cls = 'scn-l') => `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" class="${cls}"${w ? ` stroke-width="${w}" stroke-linecap="round"` : ''}/>`;
  const SC = {
    bench: { d: () => rectLegs(40, 134, 134), pts: () => [[40, 134], [134, 182]] },
    box: { d: (P, r) => { const [x0, x1, top, kind] = r.box; return kind === 'box' ? `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${FLOOR - top}" rx="3" class="scn"/>` : rectLegs(x0, x1, top); }, pts: (P, r) => [[r.box[0], r.box[2]], [r.box[1], FLOOR]] },
    incline: { d: P => { const u = dir(P.q.T), bk = [u[1], -u[0]], a = add(add(P.H, bk, 12), u, -6), b = add(add(P.H, bk, 12), u, 54);
      return seg(a, b, 8) + `<rect x="${f1(P.H[0] - 16)}" y="${f1(P.H[1] + 9)}" width="40" height="7" rx="3" class="scn"/>` + seg([P.H[0], P.H[1] + 16], [P.H[0], FLOOR]); },
      pts: P => { const u = dir(P.q.T), bk = [u[1], -u[0]]; return [add(add(P.H, bk, 16), u, 58), add(P.H, [-18, 9])]; } },
    pad: { d: P => { const u = dir(P.q.T), fr = [-u[1], u[0]], a = add(add(P.H, fr, 12), u, -2), b = add(add(P.H, fr, 12), u, 44), m = add(a, unit(a, b), 18);
      return seg(a, b, 8) + seg(m, [m[0], FLOOR]) + seg([m[0] - 22, 181], [m[0] + 22, 181], 3); }, pts: () => [] },
    couch: { d: () => '<rect x="22" y="118" width="43" height="64" rx="6" class="scn"/><rect x="58" y="176" width="26" height="6" rx="2" class="scn"/>', pts: () => [[22, 118]] },
    post: { d: (P, r) => { const x = r.postX || 132, y = r.postY || 88; return `<rect x="${x}" y="${y}" width="5" height="${FLOOR - y}" rx="2" class="scn" opacity=".55"/>`; }, pts: (P, r) => [[(r.postX || 132) + 6, r.postY || 88]] },
    mat: { d: () => '<rect x="8" y="30" width="200" height="164" rx="12" class="scn-plane"/><text x="16" y="44" class="mq-note">TOP VIEW</text>', pts: () => [[8, 30], [208, 194]] },
    bar: { d: (P, r) => { const [x0, x1, y] = r.bar; return seg([x0, y], [x1, y], 4) + (r.barPost ? seg([x1 - 4, y], [x1 - 4, FLOOR]) : ''); }, pts: (P, r) => [[r.bar[0], r.bar[2] - 4], [r.bar[1], r.bar[2]]] },
    lowbar: { d: (P, r) => `<circle cx="${r.bar[0]}" cy="${r.bar[1]}" r="4" class="scn"/>` + seg([r.bar[0], r.bar[1] + 4], [r.bar[0], FLOOR]), pts: (P, r) => [[r.bar[0] - 5, r.bar[1] - 5]] },
    smith: { d: P => { const x = add(P.S, dir(P.q.T + 90), 7)[0]; return seg([x - 2, 6], [x - 2, FLOOR], 2) + seg([x + 2, 6], [x + 2, FLOOR], 2); }, pts: P => [[P.S[0], 4]] },
    hyper: { d: P => { const pad = add(P.H, dir(P.q.T - 90), 9); return `<rect x="${f1(pad[0] - 9)}" y="${f1(pad[1] - 4)}" width="18" height="9" rx="4" class="scn"/>` + seg(pad, [pad[0] - 34, FLOOR], 4) + seg(add(P.A1, [4, 6]), [pad[0] - 30, 168], 3) + `<circle cx="${f1(P.A1[0] + 2)}" cy="${f1(P.A1[1] - 5)}" r="4" class="scn"/>`; }, pts: P => [[P.H[0] - 40, FLOOR]] },
    legpress: { d: P => { const u = dir(P.q.T), bk = [u[1], -u[0]], a = add(add(P.H, bk, 12), u, -8), b = add(add(P.H, bk, 12), u, 56), pd = dir(125), pn = [pd[1], -pd[0]], c = add(P.A1, pd, 4);
      return seg(a, b, 8) + `<rect x="${f1(P.H[0] - 22)}" y="${f1(P.H[1] + 8)}" width="44" height="7" rx="3" class="scn"/>` + seg([P.H[0], P.H[1] + 15], [P.H[0], FLOOR]) + seg(add(c, pn, -20), add(c, pn, 20), 5) + seg([P.H[0] + 30, FLOOR - 2], [P.H[0] + 120, 70], 2); },
      pts: P => [[P.H[0] + 122, 64], [P.H[0] - 40, P.H[1]]] },
    roller: { d: (P, r) => `<circle cx="${r.roller[0]}" cy="${r.roller[1]}" r="${r.roller[2]}" class="scn"/>`, pts: (P, r) => [[r.roller[0] - r.roller[2], r.roller[1] - r.roller[2]]] },
    ball: { d: P => `<circle cx="${f1(P.A1[0] + 4)}" cy="${f1(P.A1[1] + 15)}" r="15" class="scn"/>`, pts: P => [[P.A1[0] + 20, P.A1[1] + 30]] },
    machine: { d: P => { const u = dir(P.q.T), bk = [u[1], -u[0]], a = add(add(P.H, bk, 12), u, -6), b = add(add(P.H, bk, 12), u, 54), d = unit(P.K1, P.A1), n = [d[1], -d[0]], rl = add(add(P.A1, d, -5), n, P.rig.roller || 7);
      return seg(a, b, 8) + `<rect x="${f1(P.H[0] - 16)}" y="${f1(P.H[1] + 9)}" width="${f1(P.K1[0] - P.H[0] + 22)}" height="7" rx="3" class="scn"/>` + seg([P.H[0], P.H[1] + 16], [P.H[0], FLOOR]) + `<circle cx="${f1(rl[0])}" cy="${f1(rl[1])}" r="5" class="scn"/>` + seg(P.K1, rl, 2); }, pts: P => [[P.H[0] - 18, P.H[1] - 40]] },
    hack: { d: P => { const u = dir(P.q.T), bk = [u[1], -u[0]], a = add(add(P.H, bk, 11), u, -4), b = add(add(P.H, bk, 11), u, 58); return seg(a, b, 7) + seg([P.A1[0] - 14, 180], [P.A1[0] + 24, 172], 5) + seg(add(a, [0, 4]), [a[0] - 30, FLOOR], 2); }, pts: P => [[P.H[0] - 40, 20]] },
    tower: { d: (P, r) => `<rect x="${r.tower - 3}" y="0" width="6" height="${FLOOR}" rx="2" class="scn" opacity=".5"/>`, pts: (P, r) => [[r.tower + 4, 0]] },
    bike: { d: () => seg([86, 112], [108, 158], 4) + seg([108, 158], [150, 98], 4) + seg([74, 108], [98, 108], 6) + seg([148, 96], [156, 92], 5) + `<circle cx="108" cy="158" r="17" class="scn" opacity=".35"/>` + seg([60, 180], [160, 180], 5) + seg([108, 158], [108, 180], 3), pts: () => [[60, 90], [160, 182]] },
    rower: { d: () => seg([40, 172], [196, 172], 4) + `<circle cx="204" cy="150" r="16" class="scn" opacity=".5"/>` + seg([170, 150], [176, 176], 4) + seg([60, 172], [60, FLOOR]) + seg([190, 172], [190, FLOOR]), pts: () => [[40, 132], [222, 182]] },
    stairs: { d: () => '<path d="M120,182 L120,166 L144,166 L144,150 L168,150 L168,134 L192,134 L192,182 Z" class="scn" opacity=".6"/>', pts: () => [[196, 130]] },
    treadmill: { d: () => seg([30, 178], [176, 170], 5) + seg([160, 170], [170, 70], 3) + seg([166, 74], [150, 78], 4), pts: () => [[30, 66], [178, 182]] },
    bag: { d: () => seg([186, 0], [186, 24]) + '<rect x="172" y="24" width="28" height="104" rx="11" class="scn"/>', pts: () => [[202, 0]] },
    calfm: { d: P => `<rect x="${f1(P.S[0] - 12)}" y="${f1(P.S[1] - 12)}" width="24" height="7" rx="3" class="scn"/>` + seg([P.S[0] - 18, P.S[1] - 9], [P.S[0] - 18, FLOOR], 4), pts: P => [[P.S[0] - 24, P.S[1] - 14]] },
    seatF: { d: P => `<rect x="${f1(P.P[0] - 26)}" y="${f1(P.P[1] + 4)}" width="52" height="8" rx="3" class="scn"/>` + seg([P.P[0], P.P[1] + 12], [P.P[0], FLOOR], 4), pts: () => [] },
    column: { d: P => `<rect x="${f1(P.P[0] - 30)}" y="${f1(P.P[1] - 74)}" width="60" height="${f1(FLOOR - P.P[1] + 74)}" rx="6" class="scn" opacity=".45"/>`, pts: P => [[P.P[0] - 32, P.P[1] - 76]] },
    floorplane: { d: () => '<path d="M-30,182 L230,182 L196,128 L4,128 Z" class="scn-plane"/><line x1="-30" y1="182" x2="230" y2="182" class="floor"/>', pts: () => [[-10, 128], [210, 182]] }, // v23: floor seen from slightly above (seated front-view rigs)
    towers: { d: () => '<rect x="8" y="0" width="7" height="182" rx="2" class="scn" opacity=".5"/><rect x="185" y="0" width="7" height="182" rx="2" class="scn" opacity=".5"/>', pts: () => [[6, 0], [194, 182]] }
  };

  // ---------- rigs ----------
  const C = (t0, t1, text) => ({ t: [t0, t1], text });
  const TL2 = [[0, 0], [0.12, 0], [0.46, 1], [0.6, 1], [0.92, 0], [1, 0]]; // top -> key -> top
  const TL3 = [[0, 0], [0.12, 0], [0.3, 1], [0.46, 2], [0.6, 2], [0.76, 1], [0.92, 0], [1, 0]];
  const TL4 = [[0, 0], [0.06, 0], [0.2, 1], [0.32, 1], [0.46, 2], [0.54, 2], [0.68, 3], [0.8, 3], [0.94, 4], [1, 4]]; // alternate sides
  const TLHOLD = [[0, 0], [0.5, 1], [1, 0]];
  const ST = [96, 176]; // standing: near ankle pinned here
  const STD = { T: 180, t1: 0, s1: 0 };
  const LYING = { T: -90, t1: 75, s1: -5 }; // supine on a flat bench, head to the left, feet on the floor
  const BENCH_H = [118, 124];
  const X = (...o) => Object.assign({}, ...o);
  const ARMS_BAR_BACK = { ru1: -25, rf1: 175 }, ARMS_RACK = { ru1: 110, rf1: 270 }, HIPS = { ru1: -20, ku1: 0.7, rf1: 28, kf1: 0.76 };
  const SQ_CUES = [C(0.1, 0.6, 'Chest up, brace'), C(0.2, 0.6, 'Knees track over toes'), C(0.44, 0.62, 'Hips below knees if you can'), C(0.62, 0.9, 'Drive through mid-foot'), C(0.88, 1.12, 'Stand tall')];
  const HINGE_CUES = [C(0.12, 0.5, 'Hips back'), C(0.2, 0.62, 'Soft knees'), C(0.46, 0.66, 'Flat back'), C(0.64, 0.9, 'Drive hips forward'), C(0.88, 1.12, 'Squeeze glutes at top')];
  const PRESS_CUES = [C(0, 0.3, 'Brace abs, squeeze glutes'), C(0.14, 0.46, 'Press straight up'), C(0.44, 0.62, 'Biceps by ears'), C(0.46, 0.64, 'Ribs down, no arch'), C(0.62, 0.94, 'Lower to shoulders')];
  const CURL_CUES = [C(0, 0.62, 'Elbows pinned at sides'), C(0.14, 0.46, 'Curl to shoulder'), C(0.44, 0.62, 'Squeeze'), C(0.62, 0.94, 'Slow 3-sec lower')];
  const PLANK_CUES = [C(0, 1, 'Straight line head to heels'), C(0.1, 0.6, 'Squeeze glutes'), C(0.4, 0.95, 'Ribs down, brace'), C(0.7, 1.05, 'Breathe slow')];
  const SEATED = { T: 182, t1: 90, s1: 0 };
  const QUAD = { T: 112, t1: 0, s1: -90, fa1: -90, u1: 0, f1: 0 }; // all fours, head right
  const WALK = (arms, prop) => ({ anchor: ['H', [100, 92]], prop, period: 2600, key: 0, spineOk: () => true, arcs: [],
    frames: [X({ t1: 22, s1: 4, fa1: 104, t2: -18, s2: -30, fa2: 64, oy: 3 }, arms[0]), X({ t1: -2, s1: -4, t2: 14, s2: -46, fa2: 70, oy: 0 }, arms[1]),
      X({ t2: 22, s2: 4, fa2: 104, t1: -18, s1: -30, fa1: 64, oy: 3 }, arms[2]), X({ t2: -2, s2: -4, t1: 14, s1: -46, fa1: 70, oy: 0 }, arms[3])].map(f => X({ T: 178 }, f)),
    tl: [[0, 0], [0.25, 1], [0.5, 2], [0.75, 3], [1, 4]], linear: true });
  const SWING_ARMS = [{ u1: -16, f1: -8, u2: 16, f2: 26 }, { u1: 0, f1: 4, u2: 0, f2: 4 }, { u1: 16, f1: 26, u2: -16, f2: -8 }, { u1: 0, f1: 4, u2: 0, f2: 4 }];
  const HANG_ARMS = [0, 1, 2, 3].map(() => ({ u1: 1, f1: 1, u2: 1, f2: 1 }));
  const BIKE_FRAMES = Array.from({ length: 8 }, (_, i) => { const a = i / 8 * 2 * Math.PI, c = [108, 158], r = 15, p1 = [c[0] + r * Math.sin(a), c[1] - r * Math.cos(a)], p2 = [c[0] - r * Math.sin(a), c[1] + r * Math.cos(a)];
    return { T: 126, t1: 60, s1: 0, t2: 60, s2: 0, fa1: 96, fa2: 96, ikA1: p1, ikA2: p2, ikW1: [150, 94], ikW2: [150, 94] }; });

  const RIGS = {
    // ===== upper push =====
    rdl: { anchor: ['A1', ST], prop: 'db2', period: 4600, key: 0.55, spineOk: q => q.T < 168, arcs: [['S', 'H', 'K1'], ['H', 'K1', 'A1']],
      // v23: the weights ride a fixed groove down the front of the thighs/shins (IK), instead of a clamp that popped
      frames: [{ T: 180, t1: 1, s1: -2, ikW1: [105, 104], ikW2: [105, 104] }, { T: 90, t1: 30, s1: -5, ikW1: [110, 156], ikW2: [110, 156] }],
      tl: [[0, 0], [0.12, 0], [0.48, 1], [0.62, 1], [0.92, 0], [1, 0]],
      cues: [C(0.12, 0.5, 'Hips back'), C(0.2, 0.62, 'Soft knees'), C(0.46, 0.66, 'Flat back'), C(0.48, 0.64, 'Weight close to shins'), C(0.64, 0.9, 'Drive hips forward'), C(0.88, 1.12, 'Squeeze glutes at top')] },
    goblet: { anchor: ['A1', ST], prop: 'dbv', period: 4400, key: 0.53, arcs: [['S', 'H', 'K1'], ['H', 'K1', 'A1']],
      frames: [{ T: 180, t1: 0, s1: 0, u1: 10, f1: 165 }, { T: 142, t1: 82, s1: -28, u1: 5, f1: 168 }], tl: TL2,
      cues: [C(0.1, 0.6, 'Chest up'), C(0.2, 0.6, 'Knees track over toes'), C(0.44, 0.62, 'Sit down between heels'), C(0.62, 0.9, 'Drive through mid-foot'), C(0.88, 1.12, 'Stand tall')] },
    bench: { anchor: ['H', BENCH_H], scene: 'bench', prop: 'db2', period: 4400, key: 0.52, arcs: [['S', 'E1', 'W1']],
      frames: [X({ u1: 20, f1: 180, ku1: 0.55 }, LYING), X({ u1: 95, f1: 180, ku1: 0.08 }, LYING), X({ u1: 180, f1: 180 }, LYING)],
      tl: [[0, 2], [0.12, 2], [0.3, 1], [0.46, 0], [0.6, 0], [0.76, 1], [0.92, 2], [1, 2]],
      cues: [C(0, 0.32, 'Shoulder blades squeezed'), C(0.3, 0.62, 'Elbows ~45° from body'), C(0.44, 0.62, 'Lower to mid-chest'), C(0.62, 0.92, 'Press up & together'), C(0.88, 1.12, 'Feet planted')] },
    incpress: { anchor: ['H', [100, 134]], scene: 'incline', prop: 'db2', period: 4400, key: 0.52, arcs: [['S', 'E1', 'W1']],
      frames: [{ T: 215, t1: 90, s1: 0, u1: 38, f1: 128, ku1: 0.6 }, { T: 215, t1: 90, s1: 0, u1: 88, f1: 128, ku1: 0.12 }, { T: 215, t1: 90, s1: 0, u1: 126, f1: 126 }],
      tl: [[0, 2], [0.12, 2], [0.3, 1], [0.46, 0], [0.6, 0], [0.76, 1], [0.92, 2], [1, 2]],
      cues: [C(0, 0.32, 'Shoulder blades back & down'), C(0.3, 0.62, 'Elbows under wrists'), C(0.44, 0.62, 'Lower to upper chest'), C(0.62, 0.92, 'Press up over shoulders')] },
    mpress: { anchor: ['H', [100, 134]], scene: 'incline', prop: 'handle', period: 4200, key: 0.5, arcs: [['S', 'E1', 'W1']],
      frames: [X(SEATED, { u1: -52, f1: 88, ku1: 0.6 }), X(SEATED, { u1: 86, f1: 88 })], tl: TL2,
      cues: [C(0, 0.4, 'Handles at mid-chest'), C(0.14, 0.46, 'Press out smoothly'), C(0.44, 0.62, 'Don\u2019t lock hard'), C(0.62, 0.94, '2\u20133 sec return'), C(0, 1, 'Back on the pad')] },
    pushup: { anchor: ['A1', [34, 177]], period: 4400, key: 0.53, spineOk: () => true, arcs: [['S', 'E1', 'W1'], ['S', 'H', 'A1']],
      frames: [{ T: 117, t1: -63, s1: -63, fa1: 24, ikW1: [151, 178], ikW2: [151, 178] }, { T: 98, t1: -82, s1: -82, fa1: 12, ikW1: [151, 178], ikW2: [151, 178] }], tl: TL2,
      cues: [C(0, 1, 'Straight line head to heels'), C(0.12, 0.46, 'Elbows ~45°'), C(0.44, 0.62, 'Chest to an inch off floor'), C(0.62, 0.94, 'Push the floor away')] },
    pike: { anchor: ['A1', [52, 172]], period: 4400, key: 0.53, spineOk: () => true, arcs: [['S', 'E1', 'W1'], ['S', 'H', 'K1']],
      frames: [{ T: 58, t1: -22, s1: -22, fa1: 40, ikW1: [118, 178], ikW2: [118, 178] }, { T: 34, t1: -18, s1: -18, fa1: 40, ikW1: [118, 178], ikW2: [118, 178] }], tl: TL2,
      cues: [C(0, 0.4, 'Hips high, inverted V'), C(0.14, 0.46, 'Lower head between hands'), C(0.44, 0.62, 'Elbows back, not flared'), C(0.62, 0.94, 'Press back up')] },
    dbfly: { anchor: ['H', BENCH_H], scene: 'bench', prop: 'db2', period: 4800, key: 0.52, arcs: [['S', 'E1', 'W1']],
      frames: [X({ u1: 180, f1: 184 }, LYING), X({ u1: 180, f1: 186, ku1: 0.68, kf1: 0.68 }, LYING), X({ u1: 176, f1: 184, ku1: 0.16, kf1: 0.2 }, LYING)],
      tl: TL3, cues: [C(0, 0.3, 'Slight bend in elbows'), C(0.14, 0.46, 'Open wide in an arc'), C(0.44, 0.62, 'Deep chest stretch'), C(0.62, 0.94, 'Hug a tree back up')] },
    dip: { anchor: ['W1', [118, 104]], scene: 'bar', bar: [96, 138, 104], barPost: true, floor: false, period: 4400, key: 0.53, arcs: [['S', 'E1', 'W1']], spineOk: () => true,
      frames: [{ T: 176, u1: 4, f1: 0, t1: 8, s1: -34, fa1: 50 }, { T: 158, u1: -64, f1: 14, t1: 14, s1: -40, fa1: 50 }], tl: TL2,
      cues: [C(0, 0.4, 'Shoulders down, chest proud'), C(0.14, 0.46, 'Lean slightly forward'), C(0.44, 0.62, 'Elbows to ~90°'), C(0.62, 0.94, 'Press to lockout')] },
    press: { anchor: ['A1', ST], prop: 'db2', period: 4400, key: 0.53, arcs: [['S', 'E1', 'W1']],
      frames: [X({ u1: 20, f1: 180, ku1: 0.8 }, STD), X({ u1: 100, f1: 180, ku1: 0.12 }, STD), X({ u1: 178, f1: 179 }, STD)],
      tl: TL3, cues: PRESS_CUES },
    spress: { anchor: ['H', [100, 134]], scene: 'incline', prop: 'handle', period: 4400, key: 0.53, arcs: [['S', 'E1', 'W1']],
      frames: [X({ u1: 20, f1: 180, ku1: 0.8 }, SEATED), X({ u1: 100, f1: 180, ku1: 0.12 }, SEATED), X({ u1: 176, f1: 178 }, SEATED)], tl: TL3,
      cues: [C(0, 0.3, 'Handles at chin level'), C(0.14, 0.46, 'Press up, no shrug'), C(0.44, 0.62, 'Back flat on pad'), C(0.62, 0.94, 'Slow 2\u20133 sec lower')] },
    disloc: { anchor: ['A1', ST], prop: 'stick', period: 6000, key: 0.5, arcs: [['H', 'S', 'E1']],
      frames: [X(STD, { u1: 28, f1: 28 }), X(STD, { u1: 180, f1: 180 }), X(STD, { u1: 232, f1: 232 })], tl: [[0, 0], [0.1, 0], [0.3, 1], [0.44, 2], [0.56, 2], [0.7, 1], [0.9, 0], [1, 0]],
      cues: [C(0, 0.3, 'Wide grip, arms straight'), C(0.2, 0.44, 'Arc overhead'), C(0.42, 0.58, 'Behind \u2014 only if pain-free'), C(0.58, 0.9, 'Ribs down the whole way')] },
    // ===== upper pull =====
    row: { anchor: ['A1', [64, 176]], scene: 'pad', prop: 'db2', period: 4200, key: 0.53, arcs: [['S', 'E1', 'W1']],
      frames: [{ T: 125, t1: -20, s1: -20, fa1: 60, u1: 0, f1: 0 }, { T: 125, t1: -20, s1: -20, fa1: 60, u1: -118, f1: -2 }], tl: TL2,
      cues: [C(0, 0.4, 'Chest stays on pad'), C(0.15, 0.46, 'Drive elbows back'), C(0.44, 0.62, 'Squeeze shoulder blades'), C(0.62, 0.94, 'Lower with control')] },
    bentrow: { anchor: ['A1', ST], prop: 'db2', period: 4200, key: 0.53, spineOk: () => true, arcs: [['S', 'E1', 'W1'], ['S', 'H', 'K1']],
      frames: [{ T: 112, t1: 22, s1: -8, u1: 2, f1: 2 }, { T: 112, t1: 22, s1: -8, u1: -104, f1: -6 }], tl: TL2,
      cues: [C(0, 1, 'Flat back, hinged ~45°'), C(0.15, 0.46, 'Pull to lower ribs'), C(0.44, 0.62, 'Squeeze shoulder blades'), C(0.62, 0.94, 'Lower with control')] },
    dbrow: { anchor: ['A1', [128, 176]], scene: 'box', box: [56, 186, 134], prop: 'db1', period: 4200, key: 0.53, spineOk: () => true, arcs: [['S', 'E1', 'W1']],
      frames: [{ T: 96, t1: 12, s1: 0, t2: -10, s2: -90, fa2: -90, u1: 0, f1: 0, ikW2: [174, 132] }, { T: 96, t1: 12, s1: 0, t2: -10, s2: -90, fa2: -90, u1: -102, f1: -4, ikW2: [174, 132] }], tl: TL2,
      cues: [C(0, 1, 'Flat back, square hips'), C(0.15, 0.46, 'Elbow to hip pocket'), C(0.44, 0.62, 'Squeeze 1 sec'), C(0.62, 0.94, 'Full stretch at bottom')] },
    srow: { anchor: ['H', [62, 168]], prop: 'handle', lines: [['W1', [208, 126], 'cable']], tower: 210, scene: 'tower', period: 4400, key: 0.53, spineOk: q => q.T > 168, arcs: [['S', 'E1', 'W1']],
      frames: [{ T: 154, t1: 100, s1: 80, fa1: 172, u1: 92, f1: 92 }, { T: 184, t1: 100, s1: 80, fa1: 172, u1: -42, f1: 86 }], tl: TL2,
      cues: [C(0, 0.3, 'Tall spine, chest up'), C(0.15, 0.46, 'Row to lower ribs'), C(0.44, 0.62, 'Squeeze shoulder blades'), C(0.62, 0.94, 'Reach forward slowly')] },
    invrow: { anchor: ['A1', [158, 176]], scene: 'lowbar', bar: [71, 86], period: 4400, key: 0.53, spineOk: () => true, arcs: [['S', 'E1', 'W1'], ['S', 'H', 'A1']],
      frames: [{ T: -109, t1: 71, s1: 71, fa1: 161, ikW1: [71, 88], ikW2: [71, 88] }, { T: -128, t1: 52, s1: 52, fa1: 142, ikW1: [71, 88], ikW2: [71, 88] }], tl: TL2,
      cues: [C(0, 1, 'Body straight as a plank'), C(0.15, 0.46, 'Pull chest to bar'), C(0.44, 0.62, 'Squeeze shoulder blades'), C(0.62, 0.94, 'Lower under control')] },
    ytw: { anchor: ['H', [92, 171]], period: 7200, key: 0.2, spine: true, spineOk: () => true, arcs: [],
      frames: [{ T: 91, N: 96, t1: -90, s1: -90, fa1: -96, u1: 104, f1: 106 }, { T: 91, N: 96, t1: -90, s1: -90, fa1: -96, u1: 176, f1: 176, ku1: 0.3, kf1: 0.3 }, { T: 91, N: 96, t1: -90, s1: -90, fa1: -96, u1: 262, ku1: 0.55, f1: 80, kf1: 0.6 }],
      tl: [[0, 0], [0.1, 0], [0.18, 0], [0.32, 1], [0.48, 1], [0.62, 2], [0.8, 2], [0.94, 0], [1, 0]],
      cues: [C(0, 0.3, 'Y \u2014 thumbs up, arms long'), C(0.3, 0.6, 'T \u2014 squeeze shoulder blades'), C(0.6, 0.94, 'W \u2014 elbows to back pockets'), C(0, 1, 'Forehead hovers')] },
    pullup: { anchor: ['W1', [104, 26]], scene: 'bar', bar: [56, 152, 24], floor: false, period: 4600, key: 0.53, spineOk: () => true, arcs: [['S', 'E1', 'W1']],
      frames: [{ T: 180, u1: 178, f1: 180, t1: 6, s1: -28, fa1: 50 }, { T: 172, u1: 22, ku1: 0.7, f1: 172, t1: 14, s1: -30, fa1: 50 }], tl: TL2,
      cues: [C(0, 0.3, 'Dead hang, shoulders packed'), C(0.14, 0.46, 'Drive elbows down'), C(0.44, 0.62, 'Chin over bar'), C(0.62, 0.94, 'Lower all the way')] },
    hkr: { anchor: ['W1', [104, 26]], scene: 'bar', bar: [56, 152, 24], floor: false, period: 4400, key: 0.53, spineOk: () => true, arcs: [['S', 'H', 'K1']],
      frames: [{ T: 180, u1: 178, f1: 180, t1: 2, s1: -4, fa1: 60 }, { T: 172, u1: 176, f1: 180, t1: 104, s1: 12, fa1: 60, B: 4 }], tl: TL2,
      cues: [C(0, 0.3, 'No swinging'), C(0.14, 0.46, 'Curl pelvis up'), C(0.44, 0.62, 'Knees above hips'), C(0.62, 0.94, 'Lower slowly')] },
    pulldown: { anchor: ['H', [92, 138]], scene: 'incline', prop: 'handle', lines: [['W1', [94, 2], 'cable']], period: 4400, key: 0.53, arcs: [['S', 'E1', 'W1']], spineOk: () => true,
      frames: [{ T: 190, t1: 90, s1: 0, u1: 168, f1: 172 }, { T: 194, t1: 90, s1: 0, u1: 10, ku1: 0.72, f1: 166 }], tl: TL2,
      cues: [C(0, 0.3, 'Slight lean back, chest up'), C(0.14, 0.46, 'Pull bar to upper chest'), C(0.44, 0.62, 'Elbows down & back'), C(0.62, 0.94, 'Arms long at top')] },
    kpulldown: { anchor: ['K1', [100, 175]], lines: [['W1', [104, 2], 'band']], period: 4400, key: 0.53, arcs: [['S', 'E1', 'W1']], spineOk: () => true,
      frames: [{ T: 184, t1: 2, s1: -90, fa1: -90, u1: 168, f1: 172 }, { T: 186, t1: 2, s1: -90, fa1: -90, u1: 10, ku1: 0.72, f1: 166 }], tl: TL2,
      cues: [C(0, 0.3, 'Tall kneel, band overhead'), C(0.14, 0.46, 'Elbows down to ribs'), C(0.44, 0.62, 'Squeeze lats'), C(0.62, 0.94, 'Return slowly')] },
    sapd: { anchor: ['A1', ST], prop: 'handle', lines: [['W1', [206, 8], 'cable']], tower: 210, scene: 'tower', period: 4400, key: 0.53, spineOk: () => true, arcs: [['H', 'S', 'E1']],
      frames: [{ T: 160, t1: 12, s1: -6, u1: 140, f1: 140 }, { T: 160, t1: 12, s1: -6, u1: 6, f1: 6 }], tl: TL2,
      cues: [C(0, 1, 'Arms stay straight'), C(0.14, 0.46, 'Sweep to thighs'), C(0.44, 0.62, 'Squeeze lats'), C(0.62, 0.94, 'Control back up')] },
    facepull: { anchor: ['A1', ST], prop: 'handle', lines: [['W1', [208, 30], 'cable']], tower: 211, scene: 'tower', period: 4400, key: 0.53, arcs: [['S', 'E1', 'W1']],
      frames: [X(STD, { T: 176, u1: 94, f1: 96 }), X(STD, { T: 178, u1: -76, ku1: 0.36, f1: 168, kf1: 0.92 })], tl: TL2,
      cues: [C(0, 0.3, 'Rope at face height'), C(0.14, 0.46, 'Pull to forehead'), C(0.44, 0.62, 'Elbows high, thumbs back'), C(0.62, 0.94, 'Slow return')] },
    // ===== legs =====
    bsquat: { anchor: ['A1', ST], prop: 'bar', propAt: 'back', period: 4600, key: 0.53, arcs: [['S', 'H', 'K1'], ['H', 'K1', 'A1']],
      frames: [X({ T: 180, t1: 0, s1: 0 }, ARMS_BAR_BACK), X({ T: 130, t1: 84, s1: -32 }, ARMS_BAR_BACK)], tl: TL2, cues: SQ_CUES },
    fsquat: { anchor: ['A1', ST], prop: 'bar', propAt: 'front', period: 4600, key: 0.53, arcs: [['S', 'H', 'K1'], ['H', 'K1', 'A1']],
      frames: [X({ T: 180, t1: 0, s1: 0 }, ARMS_RACK), X({ T: 150, t1: 88, s1: -30 }, ARMS_RACK)], tl: TL2,
      cues: [C(0.1, 0.6, 'Elbows high'), C(0.2, 0.6, 'Torso stays upright'), C(0.44, 0.62, 'Sit straight down'), C(0.62, 0.9, 'Drive up, elbows lead'), C(0.88, 1.12, 'Stand tall')] },
    hack: { anchor: ['A1', [102, 172]], scene: 'hack', period: 4600, key: 0.53, arcs: [['S', 'H', 'K1'], ['H', 'K1', 'A1']], spineOk: () => true,
      frames: [{ T: 202, t1: 20, s1: 18, fa1: 100, ru1: 20, rf1: 158 }, { T: 202, t1: 108, s1: -14, fa1: 100, ru1: 20, rf1: 158 }], tl: TL2,
      cues: [C(0, 0.4, 'Back flat on the pad'), C(0.2, 0.6, 'Knees track over toes'), C(0.44, 0.62, 'Deep as you control'), C(0.62, 0.94, 'Drive through whole foot')] },
    bwsquat: { anchor: ['A1', ST], period: 4400, key: 0.53, arcs: [['S', 'H', 'K1'], ['H', 'K1', 'A1']],
      frames: [{ T: 180, t1: 0, s1: 0, u1: 4, f1: 6 }, { T: 140, t1: 86, s1: -30, u1: 84, f1: 86 }], tl: TL2, cues: SQ_CUES },
    deepsq: { anchor: ['A1', ST], period: 7000, key: 0.5, arcs: [['S', 'H', 'K1'], ['H', 'K1', 'A1']],
      frames: [{ T: 150, t1: 112, s1: -34, ru1: 58, rf1: 164, kf1: 0.78 }, { T: 154, t1: 110, s1: -33, ru1: 56, rf1: 164, kf1: 0.78 }], tl: TLHOLD,
      cues: [C(0, 0.5, 'Heels down'), C(0.25, 0.8, 'Elbows push knees out'), C(0.5, 1.02, 'Chest up, breathe')] },
    tke: { anchor: ['A1', ST], lines: [['K1', [196, 136], 'band']], scene: 'post', postX: 196, postY: 120, period: 3800, key: 0.53, arcs: [['H', 'K1', 'A1']],
      frames: [X(HIPS, { T: 172, t1: 26, s1: -16, t2: -14, s2: -10, fa2: 70 }), X(HIPS, { T: 176, t1: 0, s1: 0, t2: -14, s2: -10, fa2: 70 })], tl: TL2,
      cues: [C(0, 0.3, 'Band behind the knee'), C(0.14, 0.46, 'Straighten fully'), C(0.44, 0.62, 'Squeeze the quad'), C(0.62, 0.94, 'Slowly let it bend')] },
    legpress: { anchor: ['H', [70, 146]], scene: 'legpress', period: 4800, key: 0.53, spineOk: () => true, arcs: [['S', 'H', 'K1'], ['H', 'K1', 'A1']],
      frames: [{ T: 228, t1: 125, s1: 125, fa1: 214, fa2: 214, ru1: 12, rf1: 60, ikA1: [137, 99], ikA2: [137, 99] }, { T: 228, t1: 125, s1: 125, fa1: 214, fa2: 214, ru1: 12, rf1: 60, ikA1: [104, 122], ikA2: [104, 122] }], tl: TL2,
      cues: [C(0, 0.4, 'Low back flat on the pad'), C(0.14, 0.46, 'Lower to ~90° knees'), C(0.44, 0.62, 'Don\u2019t let hips curl up'), C(0.62, 0.94, 'Press, don\u2019t lock knees')] },
    legext: { anchor: ['H', [96, 132]], scene: 'machine', roller: 7, period: 4200, key: 0.53, arcs: [['H', 'K1', 'A1']],
      frames: [X(SEATED, { T: 186, s1: 2, u1: 8, f1: 70, ku1: 0.8 }), X(SEATED, { T: 186, s1: 86, u1: 8, f1: 70, ku1: 0.8 })], tl: TL2,
      cues: [C(0, 0.4, 'Knee lined up with pivot'), C(0.14, 0.46, 'Extend fully'), C(0.44, 0.62, 'Squeeze 1 sec'), C(0.62, 0.94, 'Lower for 3 sec')] },
    seatcurl: { anchor: ['H', [96, 132]], scene: 'machine', roller: -7, period: 4200, key: 0.53, arcs: [['H', 'K1', 'A1']],
      frames: [X(SEATED, { T: 186, s1: 84, u1: 8, f1: 70, ku1: 0.8 }), X(SEATED, { T: 186, s1: -18, u1: 8, f1: 70, ku1: 0.8 })], tl: TL2,
      cues: [C(0, 0.4, 'Thigh pad snug'), C(0.14, 0.46, 'Curl heels under'), C(0.44, 0.62, 'Squeeze 1 sec'), C(0.62, 0.94, 'Lower for 3 sec')] },
    pronecurl: { anchor: ['H', [96, 171]], lines: [['A1', [6, 174], 'band']], period: 4200, key: 0.53, spineOk: () => true, arcs: [['H', 'K1', 'A1']],
      frames: [{ T: 90, N: 98, t1: -90, s1: -92, fa1: -96, u1: 92, f1: 94 }, { T: 90, N: 98, t1: -90, s1: -176, fa1: -110, u1: 92, f1: 94 }], tl: TL2,
      cues: [C(0, 0.4, 'Hips pinned down'), C(0.14, 0.46, 'Curl heel to glute'), C(0.44, 0.62, 'Pause & squeeze'), C(0.62, 0.94, 'Lower slowly')] },
    lunge: { anchor: ['A1', [126, 176]], prop: 'db2', period: 4800, key: 0.53, spineOk: () => true, arcs: [['H', 'K1', 'A1'], ['H', 'K2', 'A2']],
      frames: [{ T: 178, t1: 20, s1: 20, fa2: 34, u1: 1, f1: 1, ikA2: [58, 172] }, { T: 178, t1: 78, s1: -4, fa2: 34, u1: 1, f1: 1, ikA2: [58, 172] }], tl: TL2,
      cues: [C(0, 0.4, 'Tall torso'), C(0.14, 0.46, 'Drop straight down'), C(0.44, 0.62, 'Both knees ~90°'), C(0.62, 0.94, 'Drive through front heel')] },
    bss: { anchor: ['A1', [130, 176]], scene: 'box', box: [4, 56, 140], prop: 'db2', period: 4800, key: 0.53, spineOk: () => true, arcs: [['H', 'K1', 'A1']],
      frames: [{ T: 176, t1: 16, s1: 16, fa2: -70, fs2: 0.85, u1: 1, f1: 1, ikA2: [46, 132] }, { T: 166, t1: 78, s1: -8, fa2: -70, fs2: 0.85, u1: 1, f1: 1, ikA2: [46, 132] }], tl: TL2,
      cues: [C(0, 0.4, 'Rear foot laces down'), C(0.14, 0.46, 'Sink straight down'), C(0.44, 0.62, 'Front knee over mid-foot'), C(0.62, 0.94, 'Drive through front foot')] },
    stepup: { anchor: ['A1', [124, 136]], scene: 'box', box: [104, 160, 140, 'box'], prop: 'db2', period: 4800, key: 0.53, spineOk: () => true, arcs: [['H', 'K1', 'A1']],
      frames: [{ T: 166, t1: 72, s1: -12, fa2: 70, u1: 1, f1: 1, ikA2: [78, 176] }, { T: 178, t1: 0, s1: 0, fa2: 70, u1: 1, f1: 1, ikA2: [116, 118] }], tl: TL2,
      cues: [C(0, 0.3, 'Whole foot on the box'), C(0.14, 0.46, 'Drive up through that heel'), C(0.44, 0.62, 'Stand tall on top'), C(0.62, 0.94, 'Lower slowly')] },
    ankle: { anchor: ['A1', [124, 176]], period: 5600, key: 0.53, spineOk: () => true, arcs: [['K1', 'A1', 'F1']], ik: { W1: ['K1', [-2, -7]], W2: ['K1', [-5, -8]] },
      frames: [{ T: 180, t1: 90, s1: 0, t2: 0, s2: -90, fa2: -90, fa1: 90 }, { T: 180, t1: 84, s1: 28, t2: 0, s2: -90, fa2: -90, fa1: 90 }], tl: TL2,
      cues: [C(0, 1, 'Heel stays down'), C(0.14, 0.46, 'Knee forward over toes'), C(0.44, 0.62, 'Hold 1\u20132 sec'), C(0.62, 0.94, 'Rock back slowly')] },
    deadlift: { anchor: ['A1', ST], hug: true, prop: 'bar', plate: 16, period: 4800, key: 0.04, spineOk: q => q.T < 168, arcs: [['S', 'H', 'K1'], ['H', 'K1', 'A1']],
      frames: [{ T: 180, t1: 1, s1: -2, u1: 2, f1: 2 }, { T: 122, t1: 74, s1: -20, u1: 0, f1: 0 }], tl: [[0, 1], [0.1, 1], [0.44, 0], [0.56, 0], [0.9, 1], [1, 1]],
      cues: [C(-0.02, 0.12, 'Bar over mid-foot'), C(0.02, 0.2, 'Flat back, lats tight'), C(0.1, 0.44, 'Push the floor away'), C(0.42, 0.58, 'Lock out with glutes'), C(0.6, 0.9, 'Hips back to lower')] },
    slrdl: { anchor: ['A1', ST], period: 5200, key: 0.55, spineOk: q => q.T < 168, arcs: [['S', 'H', 'K1']],
      frames: [{ T: 180, t1: 2, s1: -2, t2: 0, s2: -6, fa2: 80, u1: 2, f1: 2 }, { T: 96, t1: 20, s1: -6, t2: -82, s2: -84, fa2: 4, u1: 0, f1: 0 }], tl: TL2,
      cues: [C(0.12, 0.5, 'Hips square to floor'), C(0.2, 0.62, 'Back leg in line with torso'), C(0.46, 0.66, 'Flat back'), C(0.64, 0.94, 'Squeeze glute to stand')] },
    backext: { anchor: ['H', [100, 110]], scene: 'hyper', period: 4600, key: 0.53, spineOk: q => q.T > 90, arcs: [['S', 'H', 'K1']],
      frames: [{ T: 132, t1: -48, s1: -48, fa1: 40, ru1: 18, rf1: 166, kf1: 0.8 }, { T: 30, t1: -48, s1: -48, fa1: 40, ru1: 18, rf1: 166, kf1: 0.8, B: 3 }],
      tl: [[0, 0], [0.12, 0], [0.46, 1], [0.6, 1], [0.92, 0], [1, 0]],
      cues: [C(0, 0.3, 'Pad below hip crease'), C(0.14, 0.46, 'Lower with control'), C(0.62, 0.94, 'Squeeze glutes to rise'), C(0.88, 1.1, 'Stop at a straight line')] },
    pullthru: { anchor: ['A1', [104, 176]], prop: 'handle', lines: [['W1', [10, 168], 'cable']], tower: 8, scene: 'tower', period: 4600, key: 0.53, spineOk: q => q.T < 168, arcs: [['S', 'H', 'K1']],
      frames: [{ T: 180, t1: 2, s1: -2, u1: 6, f1: 10 }, { T: 100, t1: 26, s1: -6, u1: -14, f1: -22 }], tl: TL2, cues: HINGE_CUES },
    goodmorning: { anchor: ['A1', ST], lines: [['S', 'A1', 'band']], period: 4600, key: 0.53, spineOk: q => q.T < 168, arcs: [['S', 'H', 'K1']],
      frames: [X({ T: 180, t1: 0, s1: -2 }, ARMS_BAR_BACK), X({ T: 100, t1: 22, s1: -6 }, ARMS_BAR_BACK)], tl: TL2,
      cues: [C(0.12, 0.5, 'Hips back'), C(0.2, 0.62, 'Soft knees'), C(0.44, 0.64, 'Feel the hamstring stretch'), C(0.64, 0.94, 'Drive hips forward')] },
    swing: { anchor: ['A1', ST], prop: 'kb', period: 2600, key: 0.48, spineOk: q => q.T < 172, arcs: [['S', 'H', 'K1'], ['H', 'K1', 'A1']],
      frames: [{ T: 180, t1: 0, s1: 0, u1: 88, f1: 88 }, { T: 105, t1: 25, s1: -4, u1: -39, f1: -39 }],
      tl: [[0, 0], [0.1, 0], [0.45, 1], [0.52, 1], [0.85, 0], [1, 0]],
      cues: [C(0.28, 0.56, 'Hike it back'), C(0.38, 0.6, 'Flat back'), C(0.54, 0.84, 'Snap hips forward'), C(0.84, 1.1, 'Float \u2014 arms just guide')] },
    thrust: { anchor: ['S', [54, 132]], scene: 'box', box: [2, 58, 138], prop: 'bar', propAt: 'hips', period: 4600, key: 0.53, spineOk: () => true, arcs: [['S', 'H', 'K1'], ['H', 'K1', 'A1']], ik: { W1: ['H', [2, -12]], W2: ['H', [2, -12]] },
      frames: [{ T: -124, t1: 30, s1: 10, ikA1: [142, 176], ikA2: [142, 176], fa1: 90, N: -140 }, { T: -92, t1: 30, s1: 10, ikA1: [142, 176], ikA2: [142, 176], fa1: 90, N: -112 }], tl: TL2,
      cues: [C(0, 0.4, 'Upper back on bench edge'), C(0.14, 0.46, 'Drive through heels'), C(0.44, 0.62, 'Chin tucked, ribs down'), C(0.46, 0.64, 'Squeeze glutes hard'), C(0.62, 0.94, 'Lower under control')] },
    bridge: { anchor: ['S', [52, 170]], period: 4400, key: 0.53, spineOk: () => true, arcs: [['S', 'H', 'K1']],
      frames: [{ T: -90, t1: 30, s1: 10, ikA1: [128, 177], ikA2: [128, 177], u1: 84, wy1: 176, N: -96 }, { T: -66, t1: 30, s1: 10, ikA1: [128, 177], ikA2: [128, 177], u1: 84, wy1: 176, N: -90 }], tl: TL2,
      cues: [C(0, 0.4, 'Feet flat, knees bent'), C(0.14, 0.46, 'Drive through heels'), C(0.44, 0.62, 'Squeeze glutes at top'), C(0.62, 0.94, 'Lower slowly')] },
    ballcurl: { anchor: ['S', [48, 170]], scene: 'ball', period: 4600, key: 0.53, spineOk: () => true, arcs: [['H', 'K1', 'A1']],
      frames: [{ T: -76, t1: 80, s1: 80, ikA1: [156, 150], ikA2: [156, 150], fa1: 170, u1: 84, wy1: 176, N: -92 }, { T: -62, t1: 80, s1: 80, ikA1: [122, 150], ikA2: [122, 150], fa1: 170, u1: 84, wy1: 176, N: -90 }], tl: TL2,
      cues: [C(0, 1, 'Hips stay high'), C(0.14, 0.46, 'Curl ball toward glutes'), C(0.44, 0.62, 'Squeeze hamstrings'), C(0.62, 0.94, 'Extend slowly')] },
    kickback: { anchor: ['A2', [92, 176]], prop: 'none', lines: [['A1', [150, 174], 'cable']], tower: 152, scene: 'tower', period: 4200, key: 0.53, spineOk: () => true, arcs: [['S', 'H', 'K1']],
      frames: [{ T: 160, t2: 6, s2: 0, t1: 4, s1: -12, fa1: 70, ikW1: [138, 92], ikW2: [138, 92] }, { T: 160, t2: 6, s2: 0, t1: -42, s1: -50, fa1: 30, ikW1: [138, 92], ikW2: [138, 92] }], tl: TL2,
      cues: [C(0, 0.4, 'Hips square, slight lean'), C(0.14, 0.46, 'Kick heel back & up'), C(0.44, 0.62, 'Squeeze glute'), C(0.62, 0.94, 'No low-back arch')] },
    calf: { anchor: ['F1', [112, 168]], scene: 'box', box: [104, 160, 170, 'box'], period: 3800, key: 0.53, arcs: [['K1', 'A1', 'F1']],
      frames: [{ T: 180, t1: 0, s1: 0, fa1: 116, fa2: 116, u1: 2, f1: 2 }, { T: 180, t1: 0, s1: 0, fa1: 56, fa2: 56, u1: 2, f1: 2 }], tl: TL2,
      cues: [C(0, 0.34, 'Heels drop for a stretch'), C(0.14, 0.46, 'Rise onto big toe'), C(0.44, 0.62, 'Pause 1 sec at top'), C(0.62, 0.94, 'Lower slowly')] },
    // ===== arms =====
    curl: { anchor: ['A1', [128, 176]], scene: 'incline', prop: 'db2', period: 4200, key: 0.53, arcs: [['S', 'E1', 'W1']],
      frames: [{ T: 215, t1: 90, s1: 0, u1: 0, f1: 0 }, { T: 215, t1: 90, s1: 0, u1: -4, f1: 160 }], tl: TL2,
      cues: [C(0, 0.62, 'Elbows stay back'), C(0.14, 0.46, 'Curl to shoulder'), C(0.44, 0.62, 'Squeeze'), C(0.62, 0.94, 'Slow 3-sec lower'), C(0.9, 1.12, 'Full stretch at bottom')] },
    scurl: { anchor: ['A1', ST], prop: 'db2', period: 4200, key: 0.53, arcs: [['S', 'E1', 'W1']],
      frames: [X(STD, { u1: -2, f1: 2 }), X(STD, { u1: -8, f1: 150 })], tl: TL2, cues: CURL_CUES },
    pushdown: { anchor: ['A1', ST], prop: 'handle', lines: [['W1', [126, 2], 'cable']], period: 4200, key: 0.53, arcs: [['S', 'E1', 'W1']],
      frames: [X(STD, { T: 172, u1: -4, f1: 152 }), X(STD, { T: 172, u1: -2, f1: 2 })], tl: TL2,
      cues: [C(0, 0.62, 'Elbows pinned at sides'), C(0.14, 0.46, 'Push to full lockout'), C(0.44, 0.62, 'Squeeze triceps'), C(0.62, 0.94, 'Up to ~90° slowly')] },
    ohext: { anchor: ['A1', ST], prop: 'dbo', period: 4400, key: 0.53, arcs: [['S', 'E1', 'W1']],
      frames: [X(STD, { u1: 176, f1: -32 }), X(STD, { u1: 176, f1: -182 })], tl: [[0, 1], [0.12, 1], [0.46, 0], [0.6, 0], [0.92, 1], [1, 1]],
      cues: [C(0, 0.62, 'Elbows point up'), C(0.14, 0.46, 'Lower behind head'), C(0.44, 0.62, 'Deep triceps stretch'), C(0.62, 0.94, 'Extend overhead')] },
    skull: { anchor: ['H', BENCH_H], scene: 'bench', prop: 'db2', period: 4200, key: 0.53, arcs: [['S', 'E1', 'W1']],
      frames: [X({ u1: 196, f1: 196 }, LYING), X({ u1: 196, f1: 300 }, LYING)], tl: TL2,
      cues: [C(0, 0.62, 'Upper arms stay still'), C(0.3, 0.62, 'Lower beside head'), C(0.62, 0.92, 'Extend & squeeze triceps'), C(0.9, 1.1, 'Don\u2019t lock hard')] },
    benchdip: { anchor: ['W1', [92, 136]], scene: 'box', box: [30, 96, 138], period: 4400, key: 0.53, spineOk: () => true, arcs: [['S', 'E1', 'W1']],
      frames: [{ T: 180, u1: -10, f1: -8, ikA1: [180, 176], ikA2: [180, 176], fa1: 150, fa2: 150 }, { T: 178, u1: -78, f1: 8, ikA1: [180, 176], ikA2: [180, 176], fa1: 150, fa2: 150 }], tl: TL2,
      cues: [C(0, 0.4, 'Hips close to bench'), C(0.14, 0.46, 'Lower to ~90° elbows'), C(0.44, 0.62, 'Shoulders down'), C(0.62, 0.94, 'Press up to lockout')] },
    // ===== core =====
    plank: { anchor: ['A1', [36, 177]], period: 6400, key: 0, spineOk: () => true, arcs: [['S', 'H', 'A1']],
      frames: [{ T: 106, t1: -78, s1: -78, fa1: 18, u1: 0, f1: 92, kf1: 0.95 }, { T: 105, t1: -79, s1: -79, fa1: 18, u1: 0, f1: 92, kf1: 0.95 }], tl: TLHOLD, cues: PLANK_CUES },
    deadbug: { anchor: ['H', [104, 170]], period: 8000, key: 0.26, spineOk: () => true, arcs: [],
      frames: [{ T: -90, N: -94, u1: 180, f1: 180, t1: 180, s1: 90, fa1: 180 }, { T: -90, N: -94, u1: 266, f1: 266, u2: 180, f2: 180, t1: 180, s1: 90, fa1: 180, t2: 98, s2: 94, fa2: 150 },
        { T: -90, N: -94, u1: 180, f1: 180, t1: 180, s1: 90, fa1: 180 }, { T: -90, N: -94, u1: 180, f1: 180, u2: 266, f2: 266, t1: 98, s1: 94, fa1: 150, t2: 180, s2: 90, fa2: 180 }], tl: TL4,
      cues: [C(0, 1, 'Low back glued to floor'), C(0.12, 0.34, 'Opposite arm & leg reach long'), C(0.62, 0.84, 'Switch sides'), C(0.34, 0.48, 'Exhale, return slow')] },
    birddog: { anchor: ['H', [100, 136]], period: 8000, key: 0.26, spineOk: () => true, arcs: [['S', 'H', 'K2']],
      frames: [X(QUAD, { N: 104 }), X(QUAD, { N: 106, u1: 100, f1: 100, t2: -88, s2: -88, fa2: -84 }), X(QUAD, { N: 104 }), X(QUAD, { N: 106, u2: 100, f2: 100, t1: -88, s1: -88, fa1: -84 })], tl: TL4,
      cues: [C(0, 0.12, 'Hands under shoulders'), C(0.08, 0.38, 'Reach opposite arm & leg'), C(0.2, 0.36, 'No hip tilt \u2014 flat back'), C(0.6, 0.86, 'Pause 2 sec, switch'), C(0.4, 0.56, 'Brace like a poke is coming')] },
    // v26 rebuild: kneel facing the high pulley, rope by the ears; hips stay parked (thighs barely move), the SPINE flexes
    ccrunch: { anchor: ['K1', [92, 176]], prop: 'handle', scene: 'tower', tower: 156, lines: [['W1', [150, 6], 'cable']], period: 4400, key: 0.53, spineOk: () => true, arcs: [['S', 'H', 'K1']],
      frames: [{ T: 152, B: 2, t1: 14, s1: -90, fa1: -90, ru1: 162, rf1: -48, N: 140 }, { T: 128, B: 44, t1: 20, s1: -90, fa1: -90, ru1: 150, rf1: -58, N: 104 }], tl: TL2,
      cues: [C(0, 1, 'Hips stay still'), C(0.14, 0.46, 'Crunch ribs to hips'), C(0.44, 0.62, 'Squeeze abs'), C(0.62, 0.94, 'Return slowly')] },
    rollout: { anchor: ['K1', [70, 176]], prop: 'wheel', period: 5200, key: 0.53, spineOk: () => true, arcs: [['S', 'H', 'K1']],
      frames: [{ T: 124, t1: 14, s1: -90, fa1: -90, u1: 6, f1: 6, wy1: 172, wy2: 172 }, { T: 100, t1: -42, s1: -90, fa1: -90, u1: 60, f1: 60, wy1: 172, wy2: 172 }], tl: TL2,
      cues: [C(0, 1, 'Ribs down, glutes tight'), C(0.14, 0.46, 'Roll out slowly'), C(0.44, 0.62, 'Only as far as back stays flat'), C(0.62, 0.94, 'Pull back with abs')] },
    bicycle: { anchor: ['H', [104, 170]], period: 4400, key: 0.25, spineOk: () => true, arcs: [],
      frames: [{ T: -112, B: 3, N: -128, ru1: 135, rf1: -100, t1: 205, s1: 100, fa1: 150, t2: 100, s2: 95, fa2: 150 }, { T: -112, B: 3, N: -128, ru1: 135, rf1: -100, t1: 100, s1: 95, fa1: 150, t2: 205, s2: 100, fa2: 150 }],
      tl: [[0, 0], [0.12, 0], [0.38, 1], [0.62, 1], [0.88, 0], [1, 0]],
      cues: [C(0, 0.5, 'Elbow to opposite knee'), C(0.5, 1, 'Switch, other side'), C(0.2, 0.8, 'Shoulders off floor'), C(0.6, 1.1, 'Slow \u2014 no yanking neck')] },
    climber: { anchor: ['H', [118, 134]], period: 2000, key: 0.25, spineOk: () => true, arcs: [['S', 'H', 'K2']],
      frames: [{ T: 112, ikW1: [162, 178], ikW2: [162, 178], ikA1: [106, 168], ikA2: [38, 176], fa1: 30, fa2: 24 }, { T: 112, ikW1: [162, 178], ikW2: [162, 178], ikA1: [38, 176], ikA2: [106, 168], fa1: 24, fa2: 30 }],
      tl: [[0, 0], [0.1, 0], [0.4, 1], [0.6, 1], [0.9, 0], [1, 0]],
      cues: [C(0, 1, 'Hips level, shoulders over hands'), C(0.1, 0.4, 'Drive knee to chest'), C(0.6, 0.9, 'Switch \u2014 stay light'), C(0.4, 0.6, 'Brace abs')] },
    // ===== cardio / conditioning =====
    carry: X(WALK(HANG_ARMS, 'db2'), { period: 3000, cues: [C(0, 1, 'Tall posture, shoulders back'), C(0.1, 0.6, 'Brace abs'), C(0.5, 1, 'Short, quick steps'), C(0.3, 0.8, 'Grip hard')] }),
    walk: X(WALK(SWING_ARMS), { cues: [C(0, 1, 'Tall posture'), C(0.1, 0.6, 'Easy arm swing'), C(0.5, 1, 'Conversational pace')] }),
    run: { anchor: ['H', [100, 94]], scene: 'treadmill', period: 1500, key: 0, spineOk: () => true, arcs: [], linear: true,
      frames: [{ T: 172, t1: 30, s1: 6, fa1: 100, t2: -22, s2: -52, fa2: 60, u1: -34, f1: 50, u2: 30, f2: 116, oy: 0 }, { T: 172, t1: 4, s1: -10, fa1: 86, t2: 26, s2: -60, fa2: 50, u1: 0, f1: 84, u2: 0, f2: 84, oy: -4 },
        { T: 172, t2: 30, s2: 6, fa2: 100, t1: -22, s1: -52, fa1: 60, u2: -34, f2: 50, u1: 30, f1: 116, oy: 0 }, { T: 172, t2: 4, s2: -10, fa2: 86, t1: 26, s1: -60, fa1: 50, u2: 0, f2: 84, u1: 0, f1: 84, oy: -4 }],
      tl: [[0, 0], [0.25, 1], [0.5, 2], [0.75, 3], [1, 4]],
      cues: [C(0, 1, 'Tall, slight forward lean'), C(0.1, 0.6, 'Quick, light steps'), C(0.5, 1, 'Breathing hard on work bouts')] },
    climb: { anchor: ['H', [92, 92]], scene: 'stairs', period: 2600, key: 0, spineOk: () => true, arcs: [], linear: true,
      frames: [{ T: 174, t1: 62, s1: -8, fa1: 90, t2: -6, s2: -4, fa2: 84, u1: -10, f1: 40, u2: 10, f2: 60, oy: 2 }, { T: 176, t1: 30, s1: -30, fa1: 80, t2: 30, s2: -30, fa2: 80, u1: 0, f1: 50, u2: 0, f2: 50, oy: 0 },
        { T: 174, t2: 62, s2: -8, fa2: 90, t1: -6, s1: -4, fa1: 84, u2: -10, f2: 40, u1: 10, f1: 60, oy: 2 }, { T: 176, t1: 30, s1: -30, fa1: 80, t2: 30, s2: -30, fa2: 80, u1: 0, f1: 50, u2: 0, f2: 50, oy: 0 }],
      tl: [[0, 0], [0.25, 1], [0.5, 2], [0.75, 3], [1, 4]],
      cues: [C(0, 1, 'Upright, light hands'), C(0.1, 0.6, 'Whole foot on each step'), C(0.5, 1, 'Push through heels')] },
    bike: { anchor: ['H', [86, 104]], scene: 'bike', period: 1400, key: 0, spineOk: () => true, arcs: [], linear: true, frames: BIKE_FRAMES,
      tl: BIKE_FRAMES.map((_, i) => [i / 8, i]).concat([[1, 8]]),
      cues: [C(0, 1, 'Seat at hip height'), C(0.1, 0.6, 'Smooth circles'), C(0.5, 1, 'Stay seated, drive hard')] },
    rower: { anchor: ['H', [92, 164]], scene: 'rower', prop: 'handle', lines: [['W1', [204, 150], 'cable']], period: 3200, key: 0.4, spineOk: () => true, arcs: [['H', 'K1', 'A1']],
      frames: [{ T: 170, ox: 30, u1: 92, f1: 92, ikA1: [168, 162], ikA2: [168, 162], fa1: 140, fa2: 140 }, { T: 172, ox: 0, u1: 92, f1: 92, ikA1: [168, 162], ikA2: [168, 162], fa1: 140, fa2: 140 }, { T: 200, ox: -2, u1: -44, f1: 88, ikA1: [168, 162], ikA2: [168, 162], fa1: 140, fa2: 140 }],
      tl: [[0, 0], [0.06, 0], [0.24, 1], [0.36, 2], [0.46, 2], [0.62, 1], [0.94, 0], [1, 0]],
      cues: [C(0, 0.26, 'Legs drive first'), C(0.22, 0.42, 'Then hips, then arms'), C(0.46, 0.94, 'Arms, hips, legs to return'), C(0.6, 1, 'Powerful, not rushed')] },
    jumprope: { anchor: ['A1', ST], prop: 'rope', period: 900, key: 0.5, spineOk: () => true, arcs: [],
      frames: [{ T: 180, t1: 6, s1: -8, fa1: 84, u1: -4, f1: 62, oy: 0 }, { T: 180, t1: 2, s1: -2, fa1: 56, u1: -4, f1: 62, oy: -9 }], tl: [[0, 0], [0.5, 1], [1, 0]],
      cues: [C(0, 1, 'Small hops, balls of feet'), C(0.2, 0.8, 'Turn with wrists'), C(0.6, 1.1, 'Elbows close')] },
    burpee: { anchor: ['A1', [150, 176]], period: 4400, key: 0.38, spineOk: () => true, arcs: [],
      frames: [{ T: 180, t1: 0, s1: 0, u1: 2, f1: 2 }, { T: 150, t1: 100, s1: -38, fa1: 80, u1: 6, f1: 6 }, { T: 114, t1: -66, s1: -66, fa1: 22, u1: 0, f1: 0, ox: -92 },
        { T: 150, t1: 100, s1: -38, fa1: 80, u1: 6, f1: 6 }, { T: 180, t1: 2, s1: -2, fa1: 40, u1: 176, f1: 178, oy: -16 }],
      tl: [[0, 0], [0.06, 0], [0.2, 1], [0.3, 2], [0.44, 2], [0.52, 3], [0.7, 4], [0.76, 4], [0.9, 5], [1, 5]],
      cues: [C(0.04, 0.2, 'Squat, hands down'), C(0.22, 0.46, 'Jump feet back to plank'), C(0.46, 0.58, 'Feet in'), C(0.6, 0.8, 'Jump up, reach high'), C(0.8, 1.04, 'Land soft')] },
    shadow: { anchor: ['H', [92, 96]], period: 2600, key: 0.25, spineOk: () => true, arcs: [],
      frames: [{ T: 174, t1: 18, s1: 4, fa1: 96, t2: -16, s2: -16, fa2: 64, u1: 40, ku1: 0.8, f1: 164, u2: 24, f2: 168 }, { T: 172, t1: 18, s1: 4, fa1: 96, t2: -16, s2: -16, fa2: 64, u1: 92, f1: 92, u2: 24, f2: 168 },
        { T: 174, t1: 18, s1: 4, fa1: 96, t2: -16, s2: -16, fa2: 64, u1: 40, ku1: 0.8, f1: 164, u2: 24, f2: 168 }, { T: 166, t1: 18, s1: 4, fa1: 96, t2: -16, s2: -16, fa2: 52, u1: 40, ku1: 0.8, f1: 164, u2: 90, f2: 90 }],
      tl: [[0, 0], [0.1, 0], [0.2, 1], [0.3, 1], [0.42, 2], [0.56, 2], [0.66, 3], [0.76, 3], [0.88, 4], [1, 4]],
      cues: [C(0, 0.2, 'Guard up, chin down'), C(0.16, 0.36, 'Jab \u2014 snap it back'), C(0.6, 0.82, 'Cross \u2014 pivot back foot'), C(0.82, 1.04, 'Return to guard')] },
    // ===== mobility =====
    wgs: { anchor: ['A1', [124, 176]], period: 5600, key: 0.56, arcs: [['H', 'K1', 'A1']], mside: { hip_flexors: 2 },
      frames: [{ T: 100, N: 100, t1: 80, s1: -10, t2: -55, s2: -70, fa2: 60, u1: -10, f1: -10, u2: 0, f2: 0 },
        { T: 100, N: 118, t1: 80, s1: -10, t2: -55, s2: -70, fa2: 60, u1: 90, f1: 90, ku1: 0.2, kf1: 0.2, u2: 0, f2: 0 },
        { T: 100, N: 150, t1: 80, s1: -10, t2: -55, s2: -70, fa2: 60, u1: 180, f1: 180, u2: 0, f2: 0 }],
      tl: [[0, 0], [0.15, 0], [0.32, 1], [0.48, 2], [0.66, 2], [0.82, 1], [0.98, 0], [1, 0]],
      cues: [C(0, 0.28, 'Elbow to instep'), C(0, 0.3, 'Back knee off floor'), C(0.32, 0.68, 'Rotate & reach up'), C(0.46, 0.68, 'Eyes follow hand'), C(0.7, 0.98, 'Return with control')] },
    // v24 rebuild (Ronnie: v23 still looked "weird / sketchy"): Hip 90/90 Switches is generated from a tiny 3-D model
    // instead of hand-authored 2-D angles. Seated, hips fixed, BOTH FEET PLANTED wide in front; each knee swings on the
    // circle it really travels (around its hip->foot axis), so the knees rise together, pass straight up, and lay down
    // on the other side like windshield wipers. Projected for a front camera ~26 deg above the floor; 13 dense keys per
    // switch keep every in-between on that real path (no spline shortcuts, no crossing / sketchy limb paths).
    h9090: { view: 'front', anchor: ['P', [100, 146]], scene: 'floorplane', floor: false, legsFront: true, musGhost: true, armsBehind: 1, barefoot: true, hw: 8,
      kT: 0.9, period: 7200, key: 0.06, spineOk: () => true, arcs: [],
      frames: (() => {
        const al = 26 * R, ca = Math.cos(al), sa = Math.sin(al), hw = 8, a = LEN.thigh, b = LEN.shank, n = 12;
        const scr = p => [p[0], -(p[1] * ca - p[2] * sa)]; // 3-D (x right, y up, z toward camera) -> screen offset from the hip line
        const V = { sub: (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]], add: (p, q, k = 1) => [p[0] + q[0] * k, p[1] + q[1] * k, p[2] + q[2] * k],
          dot: (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2], len: p => Math.hypot(p[0], p[1], p[2]),
          nrm: p => { const l = Math.hypot(p[0], p[1], p[2]) || 1; return [p[0] / l, p[1] / l, p[2] / l]; },
          cross: (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]] };
        const KNEE_Y = -3.5; // hip joints 8 above the floor; a knee "on the floor" sits ~4.5 above it (knee radius)
        const leg = sx => { // sx = -1 (screen-left leg) / +1
          const H = [sx * hw, 0, 0], A = [sx * 50, -5, 30], ax = V.sub(A, H), d = V.len(ax), nn = V.nrm(ax);
          const along = (a * a - b * b + d * d) / (2 * d), r = Math.sqrt(Math.max(0, a * a - along * along)), C = V.add(H, nn, along);
          const u0 = V.nrm(V.sub([0, 1, 0], [nn[0] * nn[1], nn[1] * nn[1], nn[2] * nn[1]])); let w = V.cross(nn, u0); if (w[0] < 0) w = w.map(x => -x);
          const knee = ph => V.add(V.add(C, u0, r * Math.cos(ph)), w, r * Math.sin(ph));
          const drop = sg => { let lo = 0, hi = 100 * R; if (knee(sg * hi)[1] > KNEE_Y) return sg * hi; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (knee(sg * m)[1] > KNEE_Y) lo = m; else hi = m; } return sg * lo; };
          const pa = -drop(-1), pb = drop(1); // knee-on-floor swivel to the left / right
          return { H, A, knee, phi: t => (pb + pa) / 2 * t + (pb - pa) / 2 * t * t }; // smooth, monotonic -pa -> +pb
        };
        const L = leg(-1), Rr = leg(1);
        // hands rest on the floor just behind / outside the hips (support to sit tall); arms are drawn behind the legs
        const hand = sx => { const p = scr([sx * 25, -8, -16]); return [100 + p[0], 148 + p[1]]; }, handL = hand(-1), handR = hand(1);
        const out = [];
        for (let i = 0; i <= n; i++) {
          const t = -1 + 2 * i / n, f = { N: 180, ox: 0, ikWL: handL, ikWR: handR, kuL: 0.84, kfL: 0.84, kuR: 0.84, kfR: 0.84 }; // arms angle back to the floor (foreshortened), elbows stay out of the knees' way
          // knee + ankle are keyed as screen POSITIONS relative to the hip joint (pkx/pky, pax/pay), not angles: blending
          // positions between dense keys follows the real knee path even where a thigh points at the camera (an angle
          // blend would spin the limb there); the angles/foreshortening are derived from those points in poseF
          [['L', L], ['R', Rr]].forEach(([sd, lg]) => { const K = scr(V.sub(lg.knee(lg.phi(t)), lg.H)), An = scr(V.sub(lg.A, lg.H));
            f['pkx' + sd] = K[0]; f['pky' + sd] = K[1]; f['pax' + sd] = An[0]; f['pay' + sd] = An[1]; });
          // draw order: the leg whose knee is nearer the camera goes on top; it only flips at the upright pass, where the legs are apart
          f.lz = t < 0 ? -1 : 1; f.N = 180 + 4 * t; // head follows the knees a touch
          out.push(f);
        }
        return out; })(),
      tl: [[0, 0], [0.1, 0], [0.42, 12], [0.58, 12], [0.9, 0], [1, 0]],
      cues: [C(0, 1, 'Sit tall, chest up'), C(0.1, 0.42, 'Knees rise & fall together'), C(0.58, 0.9, 'Knees rise & fall together'), C(0.22, 0.32, 'Feet stay planted'), C(0.4, 0.6, 'Both knees at 90\u00b0'), C(-0.06, 0.12, 'Both knees at 90\u00b0')] },
    couch: { anchor: ['K1', [70, 174]], scene: 'couch', period: 5200, key: 0.62, arcs: [['S', 'H', 'K1']],
      frames: [{ T: 165, t1: -15, s1: 196, fa1: 180, t2: 88, s2: 0, fa2: 90, u1: 36, f1: 36 }, { T: 184, t1: -15, s1: 196, fa1: 180, t2: 88, s2: 0, fa2: 90, u1: 30, f1: 30 }],
      tl: [[0, 0], [0.15, 0], [0.45, 1], [0.85, 1], [1, 0]],
      cues: [C(0.1, 0.45, 'Tuck pelvis under'), C(0.3, 0.85, 'Squeeze back-leg glute'), C(0.45, 0.85, 'Tall chest'), C(0.84, 1.1, 'Breathe slow')] },
    book: { anchor: ['H', [80, 110]], scene: 'mat', floor: false, spine: false, period: 6000, key: 0.55, farOff: [2.5, 2.5],
      frames: [{ T: 90, t1: 0, s1: -90, fa1: 0, fs1: 0.9, u1: 0, f1: 0, u2: 0, f2: 0 },
        { T: 90, N: 100, t1: 0, s1: -90, fa1: 0, fs1: 0.9, u1: 90, f1: 90, ku1: 0.15, kf1: 0.15, u2: 0, f2: 0 },
        { T: 90, N: 110, t1: 0, s1: -90, fa1: 0, fs1: 0.9, u1: 180, f1: 180, u2: 0, f2: 0 }],
      tl: [[0, 0], [0.12, 0], [0.3, 1], [0.48, 2], [0.64, 2], [0.82, 1], [0.98, 0], [1, 0]],
      cues: [C(0, 1, 'Knees stay stacked'), C(0.14, 0.64, 'Open chest, reach back'), C(0.3, 0.66, 'Eyes follow hand'), C(0.66, 0.98, 'Exhale, return slowly')] },
    catcow: { anchor: ['H', [100, 136]], period: 6400, key: 0.25, spineOk: () => true, arcs: [],
      frames: [X(QUAD, { B: 9, N: 64 }), X(QUAD, { B: -7, N: 140 })], tl: [[0, 0], [0.12, 0], [0.38, 0], [0.5, 1], [0.62, 1], [0.88, 1], [1, 0]],
      cues: [C(0, 0.46, 'Cat \u2014 round up, exhale'), C(0.5, 0.96, 'Cow \u2014 chest forward, inhale'), C(0.3, 0.7, 'Move one segment at a time')] },
    foamroll: { anchor: ['H', [92, 150]], scene: 'roller', roller: [52, 170, 10], period: 5600, key: 0.5, spineOk: () => true, arcs: [],
      frames: [{ T: -96, ox: -12, ikA1: [152, 176], ikA2: [152, 176], fa1: 90, ru1: 22, rf1: 164, kf1: 0.8, N: -100 }, { T: -96, ox: 12, ikA1: [152, 176], ikA2: [152, 176], fa1: 90, ru1: 22, rf1: 164, kf1: 0.8, N: -100 }], tl: TLHOLD,
      cues: [C(0, 1, 'Roll slowly, 30\u201360 s per area'), C(0.2, 0.7, 'Pause on tender spots'), C(0.6, 1.05, 'Skip the low back')] },

    // ===== FRONT / BACK view rigs =====
    latraise: { view: 'front', anchor: ['P', [100, 92]], prop: 'db2', period: 4400, key: 0.53, arcs: [['HL', 'SL', 'EL']],
      frames: [{ uL: -10, fL: -14, uR: 10, fR: 14 }, { uL: -90, fL: -96, uR: 90, fR: 96 }], tl: TL2,
      cues: [C(0, 0.3, 'Slight bend in elbows'), C(0.14, 0.46, 'Raise out to shoulder height'), C(0.44, 0.62, 'Lead with elbows, no shrug'), C(0.62, 0.94, 'Lower for 3 sec')] },
    clatraise: { view: 'front', anchor: ['P', [100, 92]], prop: 'handle', lines: [['WL', [160, 176], 'cable']], tower: 162, scene: 'tower', period: 4400, key: 0.53, arcs: [['HL', 'SL', 'EL']],
      frames: [{ uL: 14, fL: 18, uR: 22, kuR: 0.85, fR: -34, kfR: 0.85 }, { uL: -90, fL: -96, uR: 22, kuR: 0.85, fR: -34, kfR: 0.85 }], tl: TL2,
      cues: [C(0, 0.3, 'Cable crosses in front'), C(0.14, 0.46, 'Raise out to shoulder height'), C(0.44, 0.62, 'No shrug'), C(0.62, 0.94, 'Lower slowly')] },
    cfly: { view: 'front', anchor: ['P', [100, 96]], scene: 'towers', prop: 'handle', lines: [['WL', [12, 12], 'cable'], ['WR', [188, 12], 'cable']], period: 4600, key: 0.53, arcs: [['SL', 'EL', 'WL']], kT: 0.96,
      frames: [{ ikWL: [30, 44], ikWR: [170, 44], tL: -8, sL: -8, tR: 8, sR: 8 }, { ikWL: [97, 86], ikWR: [103, 86], tL: -8, sL: -8, tR: 8, sR: 8 }], tl: TL2,
      cues: [C(0, 0.3, 'Soft elbows, chest up'), C(0.14, 0.46, 'Hug a big tree'), C(0.44, 0.62, 'Squeeze chest'), C(0.62, 0.94, 'Open slowly')] },
    pecdeck: { view: 'front', anchor: ['P', [100, 118]], scene: 'column', prop: 'pads', period: 4400, key: 0.53, arcs: [['SL', 'EL', 'WL']],
      frames: [{ tL: -14, ktL: 0.32, sL: -2, tR: 14, ktR: 0.32, sR: 2, uL: -90, fL: -178, uR: 90, fR: 178 }, { tL: -14, ktL: 0.32, sL: -2, tR: 14, ktR: 0.32, sR: 2, uL: -60, kuL: 0.4, fL: -182, uR: 60, kuR: 0.4, fR: 182 }], tl: TL2,
      cues: [C(0, 0.3, 'Back on the pad'), C(0.14, 0.46, 'Squeeze arms together'), C(0.44, 0.62, 'Hold 1 sec'), C(0.62, 0.94, 'Slow, wide return')] },
    abdmachine: { view: 'front', anchor: ['P', [100, 118]], scene: 'seatF', period: 4200, key: 0.53, arcs: [],
      frames: [{ tL: -10, ktL: 0.36, sL: -2, tR: 10, ktR: 0.36, sR: 2, uL: -20, fL: 10, uR: 20, fR: -10 }, { tL: -62, ktL: 0.62, sL: -6, tR: 62, ktR: 0.62, sR: 6, uL: -20, fL: 10, uR: 20, fR: -10 }], tl: TL2,
      cues: [C(0, 0.3, 'Sit tall, grip handles'), C(0.14, 0.46, 'Push knees out'), C(0.44, 0.62, 'Squeeze glutes 1 sec'), C(0.62, 0.94, 'Control back in')] },
    latwalk: { view: 'back', armsBehind: 1, anchor: ['P', [100, 100]], prop: 'none', /* v25: seen from behind so the working glutes show */ lines: [['KL', 'KR', 'band']], period: 3200, key: 0.4, arcs: [],
      frames: [{ tL: -20, sL: 8, tR: 20, sR: -8, ox: 0, uL: -14, fL: 30, uR: 14, fR: -30 }, { tL: -20, sL: 8, tR: 40, sR: 10, ox: 6, uL: -14, fL: 30, uR: 14, fR: -30 }, { tL: -14, sL: 12, tR: 26, sR: -4, ox: 14, uL: -14, fL: 30, uR: 14, fR: -30 }],
      tl: [[0, 0], [0.1, 0], [0.4, 1], [0.6, 2], [0.9, 0], [1, 0]],
      cues: [C(0, 1, 'Quarter squat, chest up'), C(0.1, 0.4, 'Step wide, toes forward'), C(0.4, 0.7, 'Keep band tension'), C(0.7, 1, 'Don\u2019t let knees cave')] },
    jack: { view: 'front', anchor: ['P', [100, 92]], period: 1300, key: 0.5, arcs: [],
      frames: [{ tL: -3, sL: -3, tR: 3, sR: 3, uL: -10, fL: -12, uR: 10, fR: 12 }, { tL: -22, sL: -22, tR: 22, sR: 22, uL: -165, fL: -172, uR: 165, fR: 172, oy: -5 }], tl: [[0, 0], [0.5, 1], [1, 0]],
      cues: [C(0, 1, 'Light, springy feet'), C(0.3, 0.7, 'Arms fully overhead'), C(0.7, 1.1, 'Steady rhythm')] },
    sideplank: { view: 'front', anchor: ['ER', [162, 177]], period: 6400, key: 0, hw: 6.5, arcs: [], spineOk: () => true,
      frames: [{ T: 106, tL: -73, sL: -73, tR: -73, sR: -73, uR: 0, fR: 90, kfR: 0.4, uL: 180, fL: 180 }, { T: 109, tL: -71, sL: -71, tR: -71, sR: -71, uR: 0, fR: 90, kfR: 0.4, uL: 180, fL: 180 }], tl: TLHOLD,
      cues: [C(0, 1, 'Elbow under shoulder'), C(0.1, 0.6, 'Hips up \u2014 straight line'), C(0.4, 0.95, 'Don\u2019t let hips sag'), C(0.7, 1.05, 'Breathe slow')] },
    rtwist: { view: 'front', anchor: ['P', [100, 170]], prop: 'none', legsFront: true, musGhost: true, period: 3600, key: 0.25, kT: 0.86, arcs: [],
      frames: [{ tw: -1, N: 172, tL: 150, ktL: 0.62, sL: 12, ksL: 0.7, tR: -150, ktR: 0.62, sR: -12, ksR: 0.7, ikWL: [76, 150], ikWR: [76, 150] }, { tw: 1, N: 188, tL: 150, ktL: 0.62, sL: 12, ksL: 0.7, tR: -150, ktR: 0.62, sR: -12, ksR: 0.7, ikWL: [124, 150], ikWR: [124, 150] }],
      tl: [[0, 0], [0.1, 0], [0.4, 1], [0.6, 1], [0.9, 0], [1, 0]],
      cues: [C(0, 1, 'Lean back, chest proud'), C(0.1, 0.4, 'Rotate from the ribs'), C(0.4, 0.6, 'Touch beside hip'), C(0.6, 0.9, 'Other side, slow')] },
    rpecdeck: { view: 'back', anchor: ['P', [100, 118]], scene: 'column', prop: 'handle', period: 4400, key: 0.53, arcs: [], armsBehind: 0.5,
      frames: [{ tL: -14, ktL: 0.32, sL: -2, tR: 14, ktR: 0.32, sR: 2, uL: -86, kuL: 0.24, fL: -86, kfL: 0.24, uR: 86, kuR: 0.24, fR: 86, kfR: 0.24 }, { tL: -14, ktL: 0.32, sL: -2, tR: 14, ktR: 0.32, sR: 2, uL: -92, fL: -92, uR: 92, fR: 92 }], tl: TL2,
      cues: [C(0, 0.3, 'Chest on the pad'), C(0.14, 0.46, 'Sweep arms back'), C(0.44, 0.62, 'Squeeze rear delts'), C(0.62, 0.94, 'Slow return')] },
    rdfly: { view: 'back', anchor: ['AL', [86, 176]], prop: 'db2', period: 4400, key: 0.53, arcs: [], kT: 0.5, N: 0,
      frames: [{ tL: -6, sL: 0, tR: 6, sR: 0, ktL: 0.92, ktR: 0.92, uL: -6, fL: -8, uR: 6, fR: 8 }, { tL: -6, sL: 0, tR: 6, sR: 0, ktL: 0.92, ktR: 0.92, uL: -88, fL: -94, uR: 88, fR: 94 }], tl: TL2,
      cues: [C(0, 1, 'Hinged, flat back'), C(0.14, 0.46, 'Raise arms out wide'), C(0.44, 0.62, 'Squeeze rear delts'), C(0.62, 0.94, 'Lower slowly')] },
    pullapart: { view: 'back', anchor: ['P', [100, 92]], period: 4200, key: 0.53, arcs: [], armsBehind: 0.5, lines: [['WL', 'WR', 'band', true]],
      frames: [{ uL: -84, kuL: 0.22, fL: -84, kfL: 0.22, uR: 84, kuR: 0.22, fR: 84, kfR: 0.22 }, { uL: -92, fL: -92, uR: 92, fR: 92 }], tl: TL2,
      cues: [C(0, 0.3, 'Arms straight at chest height'), C(0.14, 0.46, 'Pull band apart'), C(0.44, 0.62, 'Squeeze shoulder blades'), C(0.62, 0.94, 'Return slowly')] }
  };
  // derived variants (same motion, different load / cues)
  const V = (base, o) => Object.assign({}, RIGS[base], o);
  Object.assign(RIGS, {
    benchbar: V('bench', { prop: 'bar' }), incbar: V('incpress', { prop: 'bar' }),
    pushupband: V('pushup', { prop: 'bandback' }),
    pushupclose: V('pushup', { cues: [C(0, 1, 'Straight line head to heels'), C(0.12, 0.46, 'Elbows tucked to ribs'), C(0.44, 0.62, 'Hands under shoulders'), C(0.62, 0.94, 'Press & squeeze triceps')] }),
    pressbar: V('press', { prop: 'bar' }), spressdb: V('spress', { prop: 'db2', cues: [C(0, 0.3, 'Back flat on the bench'), C(0.14, 0.46, 'Press straight up'), C(0.44, 0.62, 'Biceps by ears'), C(0.62, 0.94, 'Lower to ear level')] }), presskb: V('press', { prop: 'kbrack' }),
    arnold: V('press', { cues: [C(0, 0.3, 'Start palms facing you'), C(0.14, 0.46, 'Rotate as you press'), C(0.44, 0.62, 'Palms forward at top'), C(0.62, 0.94, 'Reverse on the way down')] }),
    pressband: V('press', { prop: 'none', lines: [['W1', 'F1', 'band']], cues: [C(0, 0.3, 'Stand on the band'), C(0.14, 0.46, 'Press overhead'), C(0.46, 0.64, 'Ribs down, no arch'), C(0.62, 0.94, 'Lower slowly')] }),
    rowbar: V('bentrow', { prop: 'bar', plate: 14 }), rowkb: V('bentrow', { prop: 'kb1' }),
    rowband: V('srow', { prop: 'none', lines: [['W1', 'F1', 'band']], scene: null }),
    chin: V('pullup', { cues: [C(0, 0.3, 'Palms facing you'), C(0.14, 0.46, 'Elbows down to ribs'), C(0.44, 0.62, 'Chin over bar'), C(0.62, 0.94, 'Lower all the way')] }),
    assist: V('pullup', { cues: [C(0, 0.3, 'Knees on the assist pad'), C(0.14, 0.46, 'Drive elbows down'), C(0.44, 0.62, 'Chin over bar'), C(0.62, 0.94, 'Lower all the way')] }),
    smithsquat: V('bsquat', { scene: 'smith' }),
    rlunge: V('lunge', { prop: 'none', cues: [C(0, 0.4, 'Step back, tall torso'), C(0.14, 0.46, 'Back knee toward floor'), C(0.44, 0.62, 'Front shin vertical'), C(0.62, 0.94, 'Drive through front heel')] }),
    smithsplit: V('lunge', { prop: 'bar', propAt: 'back', scene: 'smith', frames: RIGS.lunge.frames.map(f => X(f, ARMS_BAR_BACK, { u1: undefined, f1: undefined })) }),
    rdlbar: V('rdl', { prop: 'bar', plate: 14 }),
    thrustdb: V('thrust', { prop: 'db1' }),
    bridgeband: V('bridge', { prop: 'kneeband' }),
    pronecurldb: V('pronecurl', { anchor: ['H', [96, 126]], scene: 'box', box: [64, 192, 133], prop: 'dbfeet', lines: null }),
    calfdb: V('calf', { prop: 'db2' }), calfmach: V('calf', { scene2: 'calfm', frames: RIGS.calf.frames.map(f => X(f, { ru1: 25, rf1: 170, u1: undefined, f1: undefined })) }),
    latraiseband: V('latraise', { prop: 'none', lines: [['WL', 'AL', 'band'], ['WR', 'AR', 'band']] }),
    hammer: V('scurl', { cues: [C(0, 0.62, 'Palms face in (neutral)'), C(0.14, 0.46, 'Curl to shoulder'), C(0.44, 0.62, 'Squeeze'), C(0.62, 0.94, 'Slow 3-sec lower')] }),
    ezcurl: V('scurl', { prop: 'bar', plate: 11 }),
    cablecurl: V('scurl', { prop: 'handle', lines: [['W1', [150, 176], 'cable']] }),
    bandcurl: V('scurl', { prop: 'none', lines: [['W1', 'F1', 'band']] }),
    pushdownband: V('pushdown', { lines: [['W1', [126, 2], 'band']], prop: 'none' }),
    bag: V('shadow', { scene: 'bag', cues: [C(0, 0.2, 'Guard up, chin down'), C(0.16, 0.36, 'Jab \u2014 snap it back'), C(0.6, 0.82, 'Cross \u2014 rotate hips'), C(0.82, 1.04, 'Relax between strikes')] }),
    incwalk: V('walk', {})
  });

  // exercise id -> rig (every exercise in js/exercises.js must be listed; tools/check_demos.js enforces it)
  const EX_RIG = {
    bb_bench: 'benchbar', db_bench: 'bench', machine_chest_press: 'mpress', pushup: 'pushup', band_pushup: 'pushupband', incline_db_press: 'incpress',
    incline_bb_press: 'incbar', smith_incline: 'incbar', cable_fly: 'cfly', pec_deck: 'pecdeck', db_fly: 'dbfly', dips: 'dip', pike_pushup: 'pike', close_grip_pushup: 'pushupclose',
    bb_ohp: 'pressbar', db_shoulder_press: 'spressdb', standing_db_press: 'press', machine_shoulder_press: 'spress', arnold_press: 'arnold', kb_press: 'presskb', band_ohp: 'pressband',
    bb_row: 'rowbar', db_row: 'dbrow', chest_supported_row: 'row', kb_row: 'rowkb', cable_row: 'srow', band_row: 'rowband', inverted_row: 'invrow', prone_ytw: 'ytw',
    pullup: 'pullup', chinup: 'chin', assisted_pullup: 'assist', lat_pulldown: 'pulldown', band_pulldown: 'kpulldown', straight_arm_pulldown: 'sapd',
    bb_back_squat: 'bsquat', hack_squat: 'hack', smith_squat: 'smithsquat', goblet_squat: 'goblet', front_squat: 'fsquat', bw_squat: 'bwsquat', sissy_band_ext: 'tke', deep_squat_hold: 'deepsq',
    leg_press: 'legpress', leg_extension: 'legext', bulgarian_split_squat: 'bss', walking_lunge: 'lunge', reverse_lunge: 'rlunge', step_up: 'stepup', smith_split_squat: 'smithsplit', ankle_rocks: 'ankle',
    bb_rdl: 'rdlbar', db_rdl: 'rdl', bb_deadlift: 'deadlift', single_leg_rdl: 'slrdl', back_extension: 'backext', cable_pull_through: 'pullthru', band_good_morning: 'goodmorning', kb_swing: 'swing',
    bb_hip_thrust: 'thrust', db_hip_thrust: 'thrustdb', smith_hip_thrust: 'thrust', glute_bridge: 'bridge', banded_glute_bridge: 'bridgeband', ball_leg_curl: 'ballcurl',
    hip_abduction: 'abdmachine', band_lateral_walk: 'latwalk', cable_kickback: 'kickback', leg_curl: 'seatcurl', band_leg_curl: 'pronecurl', db_leg_curl: 'pronecurldb',
    calf_machine: 'calfmach', db_calf_raise: 'calfdb', bw_calf_raise: 'calf',
    db_lateral_raise: 'latraise', cable_lateral_raise: 'clatraise', band_lateral_raise: 'latraiseband', face_pull: 'facepull',
    reverse_pec_deck: 'rpecdeck', db_rear_delt_fly: 'rdfly', band_pull_apart: 'pullapart',
    db_curl: 'scurl', hammer_curl: 'hammer', incline_db_curl: 'curl', ez_curl: 'ezcurl', cable_curl: 'cablecurl', band_curl: 'bandcurl',
    cable_pushdown: 'pushdown', band_pushdown: 'pushdownband', db_overhead_ext: 'ohext', skull_crusher: 'skull', bench_dip: 'benchdip',
    plank: 'plank', dead_bug: 'deadbug', bird_dog: 'birddog', hanging_knee_raise: 'hkr', cable_crunch: 'ccrunch', ab_wheel: 'rollout', side_plank: 'sideplank',
    russian_twist: 'rtwist', pallof_press: 'pallof', bicycle_crunch: 'bicycle', mountain_climber: 'climber',
    farmer_carry: 'carry', treadmill_incline: 'run', bike_sprint: 'bike', rower_intervals: 'rower', stairmaster: 'climb', jump_rope: 'jumprope', burpee: 'burpee',
    jumping_jack: 'jack', shadowbox: 'shadow', bag_rounds: 'bag', incline_walk: 'incwalk',
    worlds_greatest: 'wgs', hip_9090: 'h9090', cat_cow: 'catcow', open_book: 'book', couch_stretch: 'couch', band_dislocates: 'disloc', foam_roll: 'foamroll'
  };
  // pallof press lives with the other band/cable anti-rotation rigs
  RIGS.pallof = { anchor: ['A1', ST], scene: 'post', prop: 'band', lines: [['W1', [134.5, 94], 'band']], period: 4400, key: 0.53, arcs: [['S', 'E1', 'W1']],
    frames: [{ T: 178, t1: 10, s1: -8, u1: 5, f1: 150 }, { T: 178, t1: 10, s1: -8, u1: 86, f1: 86 }], tl: TL2,
    cues: [C(0, 0.3, 'Band anchored at your side'), C(0.12, 0.46, 'Press straight out'), C(0.2, 0.62, 'Don\u2019t let it twist you'), C(0.44, 0.62, 'Hold 2 sec'), C(0.62, 0.94, 'Hips & shoulders square')] };

  // ---------- normalize frames so every key interpolates cleanly ----------
  const SIDE_KEYS = ['T', 'N', 'B', 't1', 's1', 't2', 's2', 'u1', 'f1', 'u2', 'f2', 'fa1', 'fa2', 'fs1', 'fs2', 'kt1', 'ks1', 'kt2', 'ks2', 'ku1', 'kf1', 'ku2', 'kf2', 'ox', 'oy', 'wy1', 'wy2'];
  const FRONT_KEYS = ['T', 'N', 'kT', 'tw', 'tL', 'sL', 'tR', 'sR', 'uL', 'fL', 'uR', 'fR', 'ktL', 'ksL', 'ktR', 'ksR', 'kuL', 'kfL', 'kuR', 'kfR', 'ox', 'oy'];
  const IKS = ['W1', 'W2', 'A1', 'A2', 'WL', 'WR', 'AL', 'AR'];
  function normalize(r) {
    if (r._n) return r; r._n = true;
    const front = r.view === 'front' || r.view === 'back';
    r.frames = r.frames.map(f0 => { const o = {}; Object.keys(f0).forEach(k => { if (f0[k] != null) o[k] = f0[k]; });
      if (front) {
        if (o.T == null) o.T = 180; if (o.N == null) o.N = r.N != null ? r.N + o.T - 180 : o.T; if (o.kT == null) o.kT = r.kT || 1; if (o.tw == null) o.tw = 0;
        if (o.tL == null) o.tL = -3; if (o.tR == null) o.tR = 3; if (o.sL == null) o.sL = o.tL; if (o.sR == null) o.sR = o.tR;
        if (o.uL == null) o.uL = -10; if (o.uR == null) o.uR = 10; if (o.fL == null) o.fL = o.uL; if (o.fR == null) o.fR = o.uR;
        ['ktL', 'ksL', 'ktR', 'ksR', 'kuL', 'kfL', 'kuR', 'kfR'].forEach(k => { if (o[k] == null) o[k] = 1; });
      } else {
        if (o.T == null) o.T = 180; if (o.B == null) o.B = 0; if (o.t1 == null) o.t1 = 0; if (o.s1 == null) o.s1 = o.t1;
        ['1', '2'].forEach(s => { if (o['ru' + s] != null) o['u' + s] = o.T - 180 + o['ru' + s]; if (o['rf' + s] != null) o['f' + s] = o.T - 180 + o['rf' + s]; });
        if (o.u1 == null) o.u1 = 0; if (o.f1 == null) o.f1 = o.u1;
        // far limbs mirror the near ones unless given; v19: the length scale (foreshortening) mirrors too, so a far arm
        // never pokes out full-length behind a foreshortened near arm
        if (o.N == null) o.N = o.T; ['t', 's', 'u', 'f'].forEach(k => { if (o[k + '2'] == null) { o[k + '2'] = o[k + '1']; const kk = { t: 'kt', s: 'ks', u: 'ku', f: 'kf' }[k]; if (o[kk + '2'] == null && o[kk + '1'] != null) o[kk + '2'] = o[kk + '1']; } });
        if (o.ru1 != null && o.ru2 == null) { o.u2 = o.u1; o.f2 = o.f1; }
        if (o.fa1 == null) o.fa1 = 90; if (o.fa2 == null) o.fa2 = o.fa1; ['fs1', 'fs2', 'kt1', 'ks1', 'kt2', 'ks2', 'ku1', 'kf1', 'ku2', 'kf2'].forEach(k => { if (o[k] == null) o[k] = 1; });
        if (o.wy1 != null && o.wy2 == null) o.wy2 = o.wy1;
      }
      if (o.ox == null) o.ox = 0; if (o.oy == null) o.oy = 0;
      IKS.forEach(j => { const v = o['ik' + j]; delete o['ik' + j]; if (v) { o['ik' + j + 'x'] = v[0]; o['ik' + j + 'y'] = v[1]; } });
      return o; });
    r.keys = Array.from(new Set([].concat(...r.frames.map(f => Object.keys(f))))).filter(k => r.frames.every(f => typeof f[k] === 'number'));
    r.period = Math.round((r.period || 4400) * SLOW);
    return r;
  }

  // ---------- pose ----------
  // v23 choreography: (1) consecutive timeline segments that keep moving the same way merge into ONE move, eased once
  // (no stop-go at every in-between key); (2) frames are blended with a Catmull-Rom spline instead of straight lerps, so
  // limbs travel on curved, velocity-continuous paths through the keys (no kinks / pops), clamped to the two neighbouring
  // keys so the spline can never overshoot past an authored (joint-limit-safe) pose; (3) ease = smootherstep-ish cosine.
  function moves(rig) {
    if (rig._mv) return rig._mv; const T = rig.tl, out = []; let i = 0;
    while (i < T.length - 1) { const sg = Math.sign(T[i + 1][1] - T[i][1]); let j = i + 1;
      if (sg !== 0) while (j < T.length - 1 && Math.sign(T[j + 1][1] - T[j][1]) === sg) j++;
      out.push([i, j]); i = j; }
    return (rig._mv = out);
  }
  const ease = k => k * k * k * (k * (6 * k - 15) + 10) * 0.5 + (1 - Math.cos(Math.PI * k)) / 4; // half quintic, half cosine
  function phase(rig, t) { // -> { q (angles), idx (frame position), c (cycle 0..1) }
    const T = rig.tl, c = ((t % 1) + 1) % 1; let idx = T[T.length - 1][1];
    const mv = moves(rig).find(([a, b]) => c >= T[a][0] && c <= T[b][0]);
    if (mv) { const [a, b] = mv, t0 = T[a][0], t1 = T[b][0], u = t1 > t0 ? (c - t0) / (t1 - t0) : 0, tt = t0 + (rig.linear ? u : ease(u)) * (t1 - t0);
      let i = a; while (i < b - 1 && tt > T[i + 1][0]) i++;
      const k = Math.max(0, Math.min(1, (tt - T[i][0]) / ((T[i + 1][0] - T[i][0]) || 1))); idx = T[i][1] + (T[i + 1][1] - T[i][1]) * k; }
    const n = rig.frames.length, i0 = Math.floor(idx), e = idx - i0, maxI = T.reduce((m, p) => Math.max(m, p[1]), 0), cyc = maxI >= n, q = {};
    const F = i => (cyc ? rig.frames[((i % n) + n) % n] : rig.frames[Math.max(0, Math.min(n - 1, i))]);
    const inR = i => cyc || (i >= 0 && i <= n - 1);
    const P1 = F(i0), P2 = F(i0 + 1), P0 = F(i0 - 1), P3 = F(i0 + 2);
    rig.keys.forEach(k => { const p1 = P1[k], p2 = P2[k], p0 = inR(i0 - 1) ? P0[k] : 2 * p1 - p2, p3 = inR(i0 + 2) ? P3[k] : 2 * p2 - p1;
      if (rig.lerp || e === 0) { q[k] = lerpA(p1, p2, e); return; }
      const v = 0.5 * (2 * p1 + (p2 - p0) * e + (2 * p0 - 5 * p1 + 4 * p2 - p3) * e * e + (3 * p1 - p0 - 3 * p2 + p3) * e * e * e);
      q[k] = Math.max(Math.min(p1, p2), Math.min(Math.max(p1, p2), v)); });
    return { q, idx, c };
  }
  const targetOf = (rig, q, J, j) => { if (q['ik' + j + 'x'] != null) return [q['ik' + j + 'x'], q['ik' + j + 'y']]; const s = rig.ik && rig.ik[j]; return s ? add(J[s[0]], s[1]) : null; };
  function pose(rig, q0) {
    const q = Object.assign({}, q0), J = { H: [0, 0] };
    const legs = () => { J.K1 = add(J.H, dir(q.t1), LEN.thigh * q.kt1); J.A1 = add(J.K1, dir(q.s1), LEN.shank * q.ks1); J.K2 = add(J.H, dir(q.t2), LEN.thigh * q.kt2); J.A2 = add(J.K2, dir(q.s2), LEN.shank * q.ks2); };
    const feet = () => { J.F1 = add(J.A1, dir(q.fa1), 18 * q.fs1); J.F2 = add(J.A2, dir(q.fa2), 18 * q.fs2); };
    const arms = () => { J.E1 = add(J.S, dir(q.u1), LEN.ua * q.ku1); J.W1 = add(J.E1, dir(q.f1), LEN.fa * q.kf1); J.E2 = add(J.S, dir(q.u2), LEN.ua * q.ku2); J.W2 = add(J.E2, dir(q.f2), LEN.fa * q.kf2); };
    legs(); J.S = add(J.H, dir(q.T), LEN.torso); feet(); arms();
    const A = J[rig.anchor[0]], off = [rig.anchor[1][0] - A[0] + q.ox, rig.anchor[1][1] - A[1] + q.oy];
    Object.keys(J).forEach(k => { J[k] = add(J[k], off); });
    // IK chains (world coords) — never the anchored chain
    // v19 anatomical IK: of the two elbow/knee solutions, take the one that bends the way the joint really bends (elbow
    // flexes toward the front of the upper arm, knee folds back) so no target can produce a backward-bent arm or knee.
    const sg = rig.sg || {};
    [['A1', 'H', 't1', 's1', 'thigh', 'shank', 1], ['A2', 'H', 't2', 's2', 'thigh', 'shank', 1], ['W1', 'S', 'u1', 'f1', 'ua', 'fa', -1], ['W2', 'S', 'u2', 'f2', 'ua', 'fa', -1]].forEach(([j, root, a, b, la, lb, s]) => {
      const tg = targetOf(rig, q, J, j); if (!tg) return;
      const sd = j[1], ka = q[(a[0] === 't' ? 'kt' : 'ku') + sd], kb = q[(a[0] === 't' ? 'ks' : 'kf') + sd], pref = sg[j] || s;
      const s1 = ik2(J[root], tg, LEN[la] * ka, LEN[lb] * kb, pref), s2 = ik2(J[root], tg, LEN[la] * ka, LEN[lb] * kb, -pref);
      [q[a], q[b]] = natural(j, s1) || !natural(j, s2) ? s1 : s2;
    });
    ['1', '2'].forEach(s => { const y = q['wy' + s]; if (y == null) return; const L = LEN.ua * q['ku' + s] + LEN.fa * q['kf' + s], c = Math.max(-1, softCap((y - J.S[1]) / L, 0.995, 0.06)), a = Math.acos(c) / R * (q['u' + s] < 0 ? -1 : 1); q['u' + s] = q['f' + s] = a; });
    legs(); // recomputed from the (already offset) hip, so IK'd legs land in world space
    // v19 floor contact: a toe can never sink through the floor; the foot pivots up about the ankle until the toe rests on it
    if (rig.floor !== false) ['1', '2'].forEach(sd => { const A = J['A' + sd], L = 25 * q['fs' + sd], fa = q['fa' + sd], toeY = A[1] + L * Math.cos(fa * R), lim = FLOOR - 1;
      if (toeY > lim && A[1] < lim) { const c = Math.max(-1, Math.min(1, (lim - A[1]) / L)), sn = Math.sin(fa * R) >= 0 ? 1 : -1; q['fa' + sd] = sn * Math.acos(c) / R; } });
    feet();
    if (rig.hug) { // arms hang (gravity) but stay close to the legs: swing the hands back if they drift in front of thigh/shin
      const { H, K1, A1, S } = J, arm = LEN.ua + LEN.fa;
      const frontAt = y => { if (y <= H[1]) return H[0] + 9; if (y <= K1[1]) return H[0] + (K1[0] - H[0]) * (y - H[1]) / ((K1[1] - H[1]) || 1) + 8; return K1[0] + (A1[0] - K1[0]) * (y - K1[1]) / ((A1[1] - K1[1]) || 1) + 5; };
      for (let i = 0; i < 1; i++) { const wy = S[1] + arm * Math.cos(q.u1 * R), wx = S[0] + arm * Math.sin(q.u1 * R), lim = frontAt(wy) + 7, sx = softCap(wx, lim, 6); if (wx - sx > 0.05) q.u1 = q.f1 = q.u2 = q.f2 = Math.asin(Math.max(-1, Math.min(1, (sx - S[0]) / arm))) / R; else break; }
    }
    arms(); J.Hd = frame(J.S, dir(q.N), true)([18, 1]);
    J.q = q; J.rig = rig; return J;
  }
  function poseF(rig, q0) { // front/back view
    const q = Object.assign({}, q0), F = figFront(), J = { P: [0, 0] }, d = dir(q.T), lat = [-d[1], d[0]], hw = rig.hw || F.hw;
    J.HL = add(add(J.P, lat, -hw), d, -2); J.HR = add(add(J.P, lat, hw), d, -2);
    J.N0 = add(J.P, d, 48 * q.kT); const SC = add(J.N0, lat, q.tw * 5), sw = F.sw * (1 - 0.32 * Math.abs(q.tw));
    J.SL = add(SC, lat, -sw); J.SR = add(SC, lat, sw);
    const legs = () => { ['L', 'R'].forEach(s => { if (q['pkx' + s] != null) { // v24: positional keys (knee/ankle relative to the hip joint)
      J['K' + s] = add(J['H' + s], [q['pkx' + s], q['pky' + s]]); J['A' + s] = add(J['H' + s], [q['pax' + s], q['pay' + s]]);
      q['t' + s] = ang(sub(J['K' + s], J['H' + s])); q['s' + s] = ang(sub(J['A' + s], J['K' + s])); return; }
      J['K' + s] = add(J['H' + s], dir(q['t' + s]), LEN.thigh * q['kt' + s]); J['A' + s] = add(J['K' + s], dir(q['s' + s]), LEN.shank * q['ks' + s]); }); };
    const arms = () => { ['L', 'R'].forEach(s => { J['E' + s] = add(J['S' + s], dir(q['u' + s]), LEN.ua * q['ku' + s]); J['W' + s] = add(J['E' + s], dir(q['f' + s]), LEN.fa * q['kf' + s]); }); };
    legs(); arms();
    const A = J[rig.anchor[0]], off = [rig.anchor[1][0] - A[0] + q.ox, rig.anchor[1][1] - A[1] + q.oy];
    Object.keys(J).forEach(k => { J[k] = add(J[k], off); });
    [['AL', 'HL', 'tL', 'sL', 'thigh', 'shank', -1], ['AR', 'HR', 'tR', 'sR', 'thigh', 'shank', 1], ['WL', 'SL', 'uL', 'fL', 'ua', 'fa', -1], ['WR', 'SR', 'uR', 'fR', 'ua', 'fa', 1]].forEach(([j, root, a, b, la, lb, s]) => {
      if (q['ik' + j + 'x'] == null) return; [q[a], q[b]] = ik2(J[root], [q['ik' + j + 'x'], q['ik' + j + 'y']], LEN[la] * q['k' + a], LEN[lb] * q['k' + b], s);
    });
    legs(); arms(); J.Hd = add(J.N0, dir(q.N), 15);
    J.q = q; J.rig = rig; return J;
  }
  const poseAny = (rig, q) => (rig.view ? poseF(rig, q) : pose(rig, q));

  // ---------- render: side view ----------
  const hex = (c, cls) => { const pts = Array.from({ length: 6 }, (_, i) => [c[0] + 7.2 * Math.cos((i * 60 + 30) * R), c[1] + 7.2 * Math.sin((i * 60 + 30) * R)]); return `<path class="${cls}" d="M${pts.map(p => f1(p[0]) + ',' + f1(p[1])).join(' L')}Z"/><circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="2.6" class="mq-db-hub"/>`; };
  const plate = (c, r) => `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${r}" class="mq-plate"/><circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${(r * 0.22).toFixed(1)}" class="mq-db-hub"/>`;
  const resolve = (P, e) => (typeof e === 'string' ? P[e] : e);
  function linesSvg(rig, P, behind) {
    return (rig.lines || []).filter(l => !!l[3] === behind).map(([a, b, kind]) => { const A = resolve(P, a), B = resolve(P, b); if (!A || !B) return '';
      return `<line x1="${f1(A[0])}" y1="${f1(A[1])}" x2="${f1(B[0])}" y2="${f1(B[1])}" class="${kind === 'cable' ? 'cable' : 'band'}"/>` + (kind === 'cable' && typeof b !== 'string' ? `<circle cx="${f1(B[0])}" cy="${f1(B[1])}" r="3.4" class="mq-pulley"/>` : ''); }).join('');
  }
  function render(rig, t, opts) {
    const ph = phase(rig, t); if (opts.mod) Object.assign(ph.q, opts.mod(ph.q));
    const P = poseAny(rig, ph.q), q = P.q; q._c = ph.c;
    const key = phase(rig, rig.key).idx, inten = Math.max(0.35, 1 - Math.min(1, Math.abs(ph.idx - key)) * 0.6);
    const prim = opts.muscles || [], muscles = prim.concat((opts.muscles2 || []).filter(m => prim.indexOf(m) < 0).map(m => m + '~'));
    let s = rig.floor === false ? '' : `<line x1="-300" y1="${FLOOR}" x2="500" y2="${FLOOR}" class="floor"/>`;
    if (rig.scene && SC[rig.scene]) s += SC[rig.scene].d(P, rig);
    if (rig.scene2 && SC[rig.scene2]) s += SC[rig.scene2].d(P, rig);
    s += linesSvg(rig, P, true);
    s += rig.view ? bodyFront(rig, P, q, muscles, inten) : bodySide(rig, P, q, muscles, inten);
    s += linesSvg(rig, P, false);
    if (opts.overlay) s += overlay(rig, P, q, ph, opts);
    return s;
  }
  // v19 rendering helpers: one continuous silhouette per body group (outline pass under a borderless fill pass, so no
  // seams at the joints), round joint caps, and a soft cylindrical sheen + core shadow on every segment.
  const solid = (paths, caps, cls) => { const c = caps.map(([p, r]) => `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${f1(r)}"/>`).join(''), d = paths.map(x => `<path d="${x}"/>`).join('');
    return `<g class="mq-ol${cls === 'far' ? ' far' : ''}">${d}${c}</g><g class="${cls === 'far' ? 'mq-far' : 'mq-fill'}">${c}${d}</g>`; }; // caps under the limb fills: they only round the outer corner of a bent joint
  const vExt = local => local.reduce((m, [, v]) => [Math.max(m[0], v), Math.min(m[1], v)], [0, 0]);
  function lens(a, b, L, v0, hw, u0, u1, fr) { // tapered strip along a segment (local u in segment units)
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(0.22, len / L), n = 8, top = [], bot = [];
    for (let i = 0; i <= n; i++) { const u = (u0 + (u1 - u0) * i / n) * k, t = Math.sin(Math.PI * i / n) * 0.85 + 0.15; top.push([u, v0 + hw * t]); bot.push([u, v0 - hw * t]); }
    return smooth(top.concat(bot.reverse()).map(fr || frame(a, unit(a, b)))); }
  function sheen(a, b, local, L) { const [vf, vb] = vExt(local), uM = local.reduce((m, [u]) => Math.max(m, u), 0);
    return `<path class="mq-hl" d="${lens(a, b, L, vf * 0.4, vf * 0.2, uM * 0.1, uM * 0.86, null)}"/><path class="mq-sh" d="${lens(a, b, L, vb * 0.58, -vb * 0.26, uM * 0.08, uM * 0.9, null)}"/>`; }
  function bodySide(rig, P, q, muscles, inten) {
    const sh = figShapes(), mk = sh.mk, off = rig.farOff || [-3.5, -1.2], fz = p => add(p, off), sc = (shape, k) => shape.map(([u, v]) => [u, v * k]);
    const segK = seg => mk[seg] * (sh.build[seg] || 1), segL = seg => LEN[seg === 'calf' ? 'shank' : seg];
    const shapeD = (m, seg, a, b) => { const shp = sc(MUS[m][1], segK(seg)); return seg === 'torso' ? smooth(bend(q.B, shp).map(frame(a, dir(q.T), true))) : limb(a, b, shp, segL(seg)); };
    const mus = (seg, side, a, b) => muscles.map(m0 => [m0.replace('~', ''), m0.endsWith('~')]).filter(([m]) => MUS[m] && MUS[m][0] === seg && ((rig.mside && rig.mside[m]) || 1) === side).map(([m, sec]) =>
      `<path class="mq-mus${sec ? ' sec' : ''}" style="opacity:${(sec ? 0.3 + 0.2 * inten : 0.8 + 0.2 * inten).toFixed(2)}" d="${shapeD(m, seg, a, b)}"/>`).join('');
    // v25 anatomical mesh on the near side (panels + definition lines); far limbs stay a plain, quieter silhouette
    const mesh = (seg, a, b) => { const k = segK(seg), m = seg === 'torso' ? frame(a, dir(q.T), true) : limbFr(a, b, segL(seg));
      const lines = (DEFL.side[seg] || []).map(ln => `<path class="ln" d="${openD((seg === 'torso' ? bend(q.B, ln.map(([u, v]) => [u, v * k])) : ln.map(([u, v]) => [u, v * k])).map(m))}"/>`).join('');
      return `<g class="mq-mesh">${MESH.side[seg].map(n => `<path d="${shapeD(n, seg, a, b)}"/>`).join('')}${lines}</g>`; };
    const footD = (a, fa, fs) => { const d = dir(fa), so = [-d[1], d[0]]; return smooth(sh.foot.map(([u, w]) => add(add(a, d, u * fs), so, w))); };
    const pr = rig.prop || 'none';
    const handProp = (E, W, far) => {
      const d = unit(E, W), n = [d[1], -d[0]], cls = far ? 'mq-db far' : 'mq-db';
      if (pr === 'db2' || ((pr === 'db1' || pr === 'dbo') && !far)) return hex(add(W, d, 2), cls);
      if (pr === 'kb' && !far) { const c = add(W, d, 11); return `<path class="mq-db" d="M${f1(W[0] - 5)},${f1(W[1])} Q${f1(W[0])},${f1(W[1] - 6)} ${f1(W[0] + 5)},${f1(W[1])}" fill="none" stroke-width="2.4"/><circle class="mq-db" cx="${f1(c[0])}" cy="${f1(c[1])}" r="8.5"/>`; }
      if (pr === 'kb1' && !far) { const c = [W[0], W[1] + 11]; return `<path class="mq-db" d="M${f1(W[0] - 5)},${f1(W[1] + 2)} Q${f1(W[0])},${f1(W[1] - 5)} ${f1(W[0] + 5)},${f1(W[1] + 2)}" fill="none" stroke-width="2.4"/><circle class="mq-db" cx="${f1(c[0])}" cy="${f1(c[1])}" r="8.5"/>`; }
      if (pr === 'kbrack' && !far) { const c = add(add(W, n, -8), d, -2); return `<circle class="mq-db" cx="${f1(c[0])}" cy="${f1(c[1])}" r="8"/>`; }
      if (pr === 'dbv' && !far) { const x = W[0] + 2, y = W[1] - 3; return `<rect class="mq-db-hub" x="${f1(x - 1.6)}" y="${f1(y)}" width="3.2" height="18"/><rect class="mq-db" x="${f1(x - 8)}" y="${f1(y - 5)}" width="16" height="7" rx="2"/><rect class="mq-db" x="${f1(x - 8)}" y="${f1(y + 16)}" width="16" height="7" rx="2"/>`; }
      if (pr === 'bar' && !far && !rig.propAt) return plate(W, rig.plate || 13);
      if ((pr === 'handle' || pr === 'stick') && !far) return `<circle class="mq-db" cx="${f1(W[0])}" cy="${f1(W[1])}" r="3"/>`;
      if (pr === 'wheel' && !far) return `<circle class="mq-db" cx="${f1(W[0])}" cy="${f1(W[1] + 3)}" r="7"/><circle class="mq-db-hub" cx="${f1(W[0])}" cy="${f1(W[1] + 3)}" r="2"/>`;
      return '';
    };
    const TH = sh.thighB, CA = sh.calfB, UA = sh.uaB, FA = sh.faB, KT = kit(), B = KT.bottom;
    const band = (a, b, local, L, r) => { const c = r && clipU(local, r[0], r[1]); return c ? limb(a, b, c, L) : null; };
    const legKit = (H, K, A, fa, fs, far) => { const cl = far ? 'mq-cl far' : 'mq-cl';
      return [band(H, K, TH, LEN.thigh, B.thigh), band(K, A, CA, LEN.shank, B.calf)].filter(Boolean).map(d => `<path class="${cl}" d="${d}"/>`).join('') +
        (rig.barefoot ? '' : `<path class="mq-shoe${far ? ' far' : ''}" d="${footD(A, fa, fs)}"/>`); };
    const torsoBand = r => { const c = clipU(sh.torsoB, r[0], r[1]); return c ? smooth(bend(q.B, c).map(frame(P.H, dir(q.T), true))) : ''; };
    let s = '';
    // far side: leg + arm as one darker silhouette (+ prop)
    s += solid([limb(fz(P.H), fz(P.K2), TH, LEN.thigh), limb(fz(P.K2), fz(P.A2), CA, LEN.shank), footD(fz(P.A2), q.fa2, q.fs2)], [[fz(P.K2), 5.4], [fz(P.A2), 3.4]], 'far');
    s += legKit(fz(P.H), fz(P.K2), fz(P.A2), q.fa2, q.fs2, true) + mus('thigh', 2, fz(P.H), fz(P.K2));
    s += solid([limb(fz(P.S), fz(P.E2), UA, LEN.ua), limb(fz(P.E2), fz(P.W2), FA, LEN.fa)], [[fz(P.E2), 4.4], [fz(P.W2), 3.4]], 'far') + handProp(fz(P.E2), fz(P.W2), true);
    // v25: when the target is the lats / upper back / chest, the near arm is drawn BEHIND the torso (we see the working back,
    // like an atlas plate turned toward the muscle) instead of hiding the red highlight under the upper arm
    const armBack = rig.armBack != null ? rig.armBack : muscles.some(m => m === 'lats' || m === 'upper_back' || m === 'chest');
    const nearArm = () => solid([limb(P.S, P.E1, UA, LEN.ua), limb(P.E1, P.W1, FA, LEN.fa)], [[P.E1, 4.8], [P.W1, 3.7]], 'near') +
      mesh('ua', P.S, P.E1) + mesh('fa', P.E1, P.W1) + sheen(P.S, P.E1, UA, LEN.ua) + sheen(P.E1, P.W1, FA, LEN.fa) + mus('ua', 1, P.S, P.E1) + mus('fa', 1, P.E1, P.W1);
    // ...and a barbell held in that hand goes behind with it, so the plate never sits on top of the red chest / back
    const backBar = armBack && pr === 'bar' && !rig.propAt;
    if (armBack) s += nearArm() + (backBar ? handProp(P.E1, P.W1, false) : '');
    // near body: torso + neck + head + near leg as ONE silhouette, then sheen, then muscles
    const torsoD = smooth(bend(q.B, sh.torsoB).map(frame(P.H, dir(q.T), true))), hf = frame(P.S, dir(q.N), true);
    const neckD = smooth(sh.neck.map(frame(P.S, dir((q.T + q.N) / 2), true))), headD = smooth(sh.head.map(hf));
    s += solid([torsoD, limb(P.H, P.K1, TH, LEN.thigh), limb(P.K1, P.A1, CA, LEN.shank), footD(P.A1, q.fa1, q.fs1), neckD, headD], [[P.K1, 5.8], [P.A1, 3.8]], 'near');
    const tu = dir(q.T), tfr = frame(P.H, tu, true), [tvf, tvb] = vExt(sh.torsoB);
    s += `<path class="mq-hl" d="${lens(P.H, add(P.H, tu, LEN.torso), 55, tvf * 0.42, tvf * 0.2, 6, 48, tfr)}"/><path class="mq-sh" d="${lens(P.H, add(P.H, tu, LEN.torso), 55, tvb * 0.6, -tvb * 0.24, 4, 50, tfr)}"/>`;
    s += sheen(P.H, P.K1, TH, LEN.thigh) + sheen(P.K1, P.A1, CA, LEN.shank);
    s += mesh('torso', P.H) + mesh('thigh', P.H, P.K1) + mesh('calf', P.K1, P.A1);
    s += `<path class="mq-crease" d="${limb(P.H, P.K1, TH, LEN.thigh)}"/>`; // faint hip crease so a raised thigh still reads in front of the belly
    s += KT.top.map(r => `<path class="mq-cl top" d="${torsoBand(r)}"/>`).join('') + `<path class="mq-cl" d="${torsoBand(B.torso)}"/>` + legKit(P.H, P.K1, P.A1, q.fa1, q.fs1, false);
    s += mus('torso', 1, P.H) + mus('thigh', 1, P.H, P.K1) + mus('calf', 1, P.K1, P.A1);
    s += `<path class="mq-hair" d="${smooth(sh.hair.map(hf))}"/>`;
    s += `<path class="mq-ear" d="${smooth([[13.4, -0.6], [16.6, 1.2], [21.4, 0.8], [22.4, -2.2], [19.6, -4], [15, -3.6]].map(([u, v]) => hf([18 + (u - 18) * 0.78, -1.2 + (v + 1.2) * 0.78])))}"/>`; // ear (v24: smaller, so it reads as an ear, not a headphone)
    s += faceSide(hf, FIG === 'female');
    // props carried on the body
    const u = dir(q.T), fr = [-u[1], u[0]];
    if (pr === 'db1' && rig.propAt === 'hips') s += hex(add(P.H, fr, 12), 'mq-db');
    if (pr === 'dbfeet') s += hex(add(P.A1, unit(P.K1, P.A1), 3), 'mq-db');
    if (pr === 'kneeband') s += `<circle cx="${f1(P.K1[0])}" cy="${f1(P.K1[1])}" r="6.5" class="band" fill="none"/>`;
    // near arm: its own silhouette on top (+ hand + prop)
    const hp = handProp(P.E1, P.W1, false);
    s += (pr === 'dbv' ? hp : '') + (armBack ? '' : nearArm());
    s += pr === 'dbv' || backBar ? '' : hp;
    if (pr === 'bandback') { const b = add(add(P.S, fr, -16), u, -4), w2 = fz(P.W2), c1 = add(b, u, -9), c2 = add(b, u, 9); s += `<path d="M${f1(P.W1[0])},${f1(P.W1[1])} C${f1(c1[0])},${f1(c1[1])} ${f1(c2[0])},${f1(c2[1])} ${f1(w2[0])},${f1(w2[1])}" class="band" fill="none"/>`; }
    if (pr === 'bar' && rig.propAt) { const c = rig.propAt === 'back' ? add(add(P.S, fr, -9), u, -1) : rig.propAt === 'front' ? add(add(P.S, fr, 11), u, 2) : add(P.H, fr, 13); s += plate(c, rig.plate || 13); }
    if (pr === 'rope') { const ph = 2 * Math.PI * ((q._c || 0) - 0.5), Rr = 128, a1 = add(P.W1, [Math.sin(ph - 0.5) * Rr, Math.cos(ph - 0.5) * Rr]), a2 = add(P.W1, [Math.sin(ph + 0.5) * Rr, Math.cos(ph + 0.5) * Rr]);
      s += `<path d="M${f1(P.W1[0])},${f1(P.W1[1])} C${f1(a1[0])},${f1(a1[1])} ${f1(a2[0])},${f1(a2[1])} ${f1(P.W1[0])},${f1(P.W1[1])}" class="rope" fill="none"/>`; }
    return s;
  }

  // ---------- render: front / back view ----------
  const FRONT_HAIR = {
    male: [[-9.8, 1], [-9.2, 6], [-6, 10.4], [0, 12.4], [6, 10.4], [9.2, 6], [9.8, 1], [7.4, 4.6], [0, 6.6], [-7.4, 4.6]],
    female: [[-10.6, -8], [-11.2, 2], [-8.4, 10], [0, 13.2], [8.4, 10], [11.2, 2], [10.6, -8], [8.4, -3], [7.6, 5.4], [0, 8], [-7.6, 5.4], [-8.4, -3]]
  };
  const PONY = [[-3.6, -2], [3.6, -2], [4.6, -16], [1.4, -25], [-1.4, -25], [-4.6, -16]];
  function bodyFront(rig, P, q, muscles, inten) {
    const F = figFront(), back = rig.view === 'back', MM = back ? MUSB : MUSF, d = dir(q.T), lat = [-d[1], d[0]];
    const outward = (a, b, side) => { const u = unit(a, b), n = [u[1], -u[0]]; return (n[0] * lat[0] + n[1] * lat[1]) * (side === 'R' ? 1 : -1) < 0; };
    const op = `style="opacity:${(0.8 + 0.2 * inten).toFixed(2)}"`, MV = MESH[back ? 'back' : 'front'], DL = DEFL[back ? 'back' : 'front'];
    const ML = muscles.map(m0 => [m0.replace('~', ''), m0.endsWith('~')]), op2 = `style="opacity:${(0.3 + 0.2 * inten).toFixed(2)}"`;
    const limbMus = (seg, a, b, side) => ML.filter(([m]) => MM[m] && MM[m][0] === seg).map(([m, sec]) => `<path class="mq-mus${sec ? ' sec' : ''}" ${sec ? op2 : op} d="${limb(a, b, MM[m][1], LEN[seg === 'calf' ? 'shank' : seg], outward(a, b, side))}"/>`).join('');
    const tf = frame(P.P, d, true), kT = q.kT;
    const limbMesh = (seg, a, b, side) => { const L = LEN[seg === 'calf' ? 'shank' : seg], fl = outward(a, b, side), m = limbFr(a, b, L, fl);
      return `<g class="mq-mesh">${(MV[seg] || []).filter(n => MM[n] && MM[n][0] === seg).map(n => `<path d="${limb(a, b, MM[n][1], L, fl)}"/>`).join('')}${(DL[seg] || []).map(ln => `<path class="ln" d="${openD(ln.map(m))}"/>`).join('')}</g>`; };
    const torsoMesh = () => `<g class="mq-mesh">${MV.torso.filter(n => MM[n] && MM[n][0] === 'torso').map(n => [1, -1].map(sg => `<path d="${smooth(MM[n][1].map(([u, v]) => tf([u * kT, v * sg])))}"/>`).join('')).join('')}` +
      (DL.torso || []).map(ln => [1, -1].map(sg => `<path class="ln" d="${openD(ln.map(([u, v]) => tf([u * kT, v * sg])))}"/>`).join('')).join('') + (DL.mid || []).map(ln => `<path class="ln" d="${openD(ln.map(([u, v]) => tf([u * kT, v])))}"/>`).join('') + '</g>';
    const torsoMus = ML.filter(([m]) => MM[m] && MM[m][0] === 'torso').map(([m, sec]) => { const h = MM[m][1]; return [1, -1].map(sg => `<path class="mq-mus${sec ? ' sec' : ''}" ${sec ? op2 : op} d="${smooth(h.map(([u, v]) => tf([u * kT, v * sg])))}"/>`).join(''); }).join('');
    const footD = (K, A) => { const u = unit(K, A), n = [u[1], -u[0]]; return smooth([[-2, -5], [5, -6], [9, -3], [9, 3], [5, 6], [-2, 5]].map(([a, b]) => add(add(A, u, a), n, b))); };
    // v19: legs / torso / head / arms are drawn as continuous silhouettes (see solid()) with joint caps + sheen
    const legParts = sd => [limb(P['H' + sd], P['K' + sd], F.thigh, LEN.thigh, outward(P['H' + sd], P['K' + sd], sd)), limb(P['K' + sd], P['A' + sd], F.calf, LEN.shank, outward(P['K' + sd], P['A' + sd], sd)), footD(P['K' + sd], P['A' + sd])];
    const legCaps = sd => [[P['K' + sd], 5.6], [P['A' + sd], 3.8]];
    const KT = kit(), B = KT.bottom;
    const fBand = (a, b, local, L, r, sd) => { const c = r && clipU(local, r[0], r[1]); return c ? `<path class="mq-cl" d="${limb(a, b, c, L, outward(a, b, sd))}"/>` : ''; };
    const endOn = sd => Math.max(0, Math.min(1, (0.5 - Math.hypot(P['K' + sd][0] - P['H' + sd][0], P['K' + sd][1] - P['H' + sd][1]) / LEN.thigh) / 0.25));
    const kneeCovered = !!(B.thigh && B.thigh[1] >= 44); // tights reach the knee: the end-on knee is fabric, not skin
    const legKit = sd => (kneeCovered ? fBand(P['H' + sd], P['K' + sd], F.thigh, LEN.thigh, B.thigh, sd) : endOn(sd) > 0.99 ? '' : `<g style="opacity:${(1 - endOn(sd)).toFixed(2)}">${fBand(P['H' + sd], P['K' + sd], F.thigh, LEN.thigh, B.thigh, sd)}</g>`) + fBand(P['K' + sd], P['A' + sd], F.calf, LEN.shank, B.calf, sd) + (rig.barefoot ? '' : `<path class="mq-shoe" d="${footD(P['K' + sd], P['A' + sd])}"/>`);
    // v24: a thigh pointing at the camera (90/90 switches) shows its knee end-on: fade a round kneecap in on top of the
    // shorts as the thigh foreshortens, so the knee reads as a knee instead of a dark squashed band
    const kneeOn = sd => { const o = endOn(sd);
      const K = P['K' + sd], a = ang(sub(K, P['H' + sd])), e = ellipse(K, F.thigh[0][1] * 0.86, 8.6, a + 180);
      return o > 0.01 ? `<g style="opacity:${o.toFixed(2)}"><g class="mq-ol"><path d="${e}"/></g>${kneeCovered ? `<path class="mq-cl" d="${e}"/>` : `<g class="mq-fill"><path d="${e}"/></g>`}</g>` : ''; };
    const legTop = sd => limbMesh('thigh', P['H' + sd], P['K' + sd], sd) + limbMesh('calf', P['K' + sd], P['A' + sd], sd) + legKit(sd) + kneeOn(sd) + limbMus('thigh', P['H' + sd], P['K' + sd], sd) + limbMus('calf', P['K' + sd], P['A' + sd], sd);
    const pr = rig.prop || 'none';
    const armParts = sd => [limb(P['S' + sd], P['E' + sd], F.ua, LEN.ua, outward(P['S' + sd], P['E' + sd], sd)), limb(P['E' + sd], P['W' + sd], F.fa, LEN.fa, outward(P['E' + sd], P['W' + sd], sd))];
    const armCaps = sd => [[P['E' + sd], 4.8], [P['W' + sd], 3.9]];
    const armPre = sd => { if (pr !== 'pads') return ''; const E = P['E' + sd], u = unit(E, P['W' + sd]), n = [u[1], -u[0]], a = add(add(E, n, sd === 'L' ? -7 : 7), u, -2), b = add(a, u, 30); return seg(a, b, 7, 'mq-pad'); };
    const armTop = sd => { const S = P['S' + sd], E = P['E' + sd], W = P['W' + sd]; let o = limbMesh('ua', S, E, sd) + limbMesh('fa', E, W, sd) + limbMus('ua', S, E, sd) + limbMus('fa', E, W, sd);
      if (pr === 'db2') o += hex(add(W, unit(E, W), 2), 'mq-db');
      if (pr === 'handle') o += `<circle class="mq-db" cx="${f1(W[0])}" cy="${f1(W[1])}" r="3"/>`;
      return o; };
    const up = dir(q.N), rt = [-up[1], up[0]], hp = pts => smooth(pts.map(([x, y]) => add(add(P.Hd, rt, x), up, y))), nk = F.neck;
    const neckD = smooth([[-nk, -2], [nk, -2], [nk * 0.9, 9], [-nk * 0.9, 9]].map(([x, y]) => add(add(P.N0, rt, x), up, y))), headD = ellipse(P.Hd, F.head[0], F.head[1], q.N);
    const torsoD = smooth(mirror(F.torso).map(([u, v]) => tf([u * kT, v])));
    const hair = (FIG === 'female' && back ? `<path class="mq-hair" d="${hp(PONY.map(([x, y]) => [x, y - 4]))}"/>` : '') +
      (back ? `<path class="mq-hair" d="${ellipse(add(P.Hd, up, 1.5), F.head[0] + 0.8, F.head[1] + (FIG === 'female' ? 0.6 : -0.6), q.N)}"/>` : `<path class="mq-hair" d="${hp(FRONT_HAIR[FIG] || FRONT_HAIR.male)}"/>`);
    // each leg / arm is its own silhouette so the inner contours (between the legs, arm against the torso) stay readable
    const arms = () => armPre('L') + armPre('R') + solid(armParts('L'), armCaps('L'), 'near') + armTop('L') + solid(armParts('R'), armCaps('R'), 'near') + armTop('R');
    const legOne = sd => solid(legParts(sd), legCaps(sd), 'near') + legTop(sd);
    const legs = () => (q.lz > 0 ? legOne('R') + legOne('L') : legOne('L') + legOne('R')); // v24: q.lz > 0 puts the left leg on top
    const tBand = (r, top) => { const c = clipU(mirror(F.torso), r[0], r[1]); if (!c) return '';
      // tops get arm-holes: above the chest the garment narrows to straps so delts + traps stay bare (no boxy apron)
      const ah = (u, v) => (top && u > r[1] - 13 ? Math.sign(v) * Math.min(Math.abs(v), Math.max(6, 18 - (u - (r[1] - 13)) * 0.95)) : v);
      return smooth(c.map(([u, v]) => tf([u * kT, ah(u, v)]))); };
    const ears = back ? '' : [-1, 1].map(sg => `<path class="mq-ear" d="${ellipse(add(add(P.Hd, rt, sg * (F.head[0] + 0.4)), up, -0.5), 1.7, 3, q.N)}"/>`).join('');
    const face = back ? '' : faceFront(([x, y]) => add(add(P.Hd, rt, x), up, y), F.head[0] / 9.4, FIG === 'female');
    const core = () => ears + solid([torsoD, neckD, headD], [], 'near') + torsoMesh() + KT.top.map(r => `<path class="mq-cl top" d="${tBand(r, true)}"/>`).join('') + `<path class="mq-cl" d="${tBand(B.torso)}"/>` + torsoMus + face + hair;
    let s = rig.armsBehind ? arms() : '';
    s += rig.legsFront ? core() + legs() : legs() + core();
    // v25: a target the thighs cover (Russian twist obliques, 90/90 hips) still shows as a soft red "x-ray" through them
    if (rig.musGhost && torsoMus) s += `<g class="mq-ghost">${torsoMus}</g>`;
    if (!rig.armsBehind) s += arms();
    return s;
  }

  // ---------- coach-mode pin layout (pure geometry, unit-tested by tools/check_demos.js) ----------
  const PIN = { row: 14, gap: 4, h: 11, badge: 3.4 }; // normalized units (vb width 230); scaled by K = vb width / 230
  const chipW = text => text.length * 3.45 + 19;
  // pack chips (already in display order) into rows no wider than the strip -> [{ i, row, x }] normalized
  function packChips(texts, width = 222) {
    const out = []; let row = 0, x = 0;
    texts.forEach((t, i) => { const w = chipW(t); if (x > 0 && x + w > width) { row++; x = 0; } out.push({ i, row, x, w }); x += w + PIN.gap; });
    return out;
  }
  const pinRows = texts => (texts.length ? packChips(texts).reduce((m, c) => Math.max(m, c.row + 1), 0) : 0);
  const pinStripH = texts => (texts.length ? pinRows(texts) * PIN.row + 6 : 0);
  const segX = (a, b, c, d) => { // proper segment intersection
    const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
    return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0; };
  const segHitsRect = (a, b, r) => { const [x, y, w, h] = r, c = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    return c.some((p, i) => segX(a, b, p, c[(i + 1) % 4])); };
  // -> { chips: [{ text, n, rect:[x,y,w,h], target, badge }], leaders: bool }
  function layoutPins(pins, P, vb, K) {
    const pts = pins.map(pn => pn.at(P)).map(p => (p ? [p[0], p[1]] : null));
    const items = pins.map((pn, k) => ({ text: pn.text, target: pts[k] })).filter(it => it.target).sort((a, b) => a.target[0] - b.target[0]);
    // badges: nudge apart any two body points closer than ~2 badge widths
    items.forEach((it, k) => { it.n = k + 1; it.badge = it.target.slice(); for (let j = 0; j < k; j++) { const o = items[j].badge, d = Math.hypot(it.badge[0] - o[0], it.badge[1] - o[1]), min = PIN.badge * 2.3 * K;
      if (d < min) { const u = d > 0.01 ? [(it.badge[0] - o[0]) / d, (it.badge[1] - o[1]) / d] : [0.8, -0.6]; it.badge = add(o, u, min); } } });
    const packed = packChips(items.map(it => it.text)), rows = packed.reduce((m, c) => Math.max(m, c.row + 1), 0);
    const top = vb[1] + vb[3] - (rows * PIN.row + 3) * K, left = vb[0] + 4 * K;
    // centre each row in the strip
    const rowW = r => packed.filter(c => c.row === r).reduce((m, c) => Math.max(m, c.x + c.w), 0), span = vb[2] / K - 8;
    items.forEach((it, k) => { const c = packed[k], off = Math.max(0, (span - rowW(c.row)) / 2); it.rect = [left + (c.x + off) * K, top + c.row * PIN.row * K, c.w * K, PIN.h * K]; });
    let leaders = true; // any row count, as long as the geometry checks below pass
    const from = it => [it.rect[0] + it.rect[2] / 2, it.rect[1]];
    for (let a = 0; leaders && a < items.length; a++) for (let b = 0; b < items.length; b++) {
      if (a === b) continue;
      if (b > a && segX(from(items[a]), items[a].badge, from(items[b]), items[b].badge)) leaders = false;
      if (segHitsRect(from(items[a]), items[a].badge, items[b].rect)) leaders = false;
    }
    return { chips: items, leaders };
  }
  // leader lines vs numbered legend is decided ONCE per rig + viewBox over the whole cycle, so it never flickers mid-rep
  function pinMode(rig, pins, vb, K) {
    const key = vb.join(' '); if (rig._pinMode && rig._pinMode.key === key) return rig._pinMode.leaders;
    let ok = true; for (let i = 0; ok && i < 16; i++) ok = layoutPins(pins, poseAny(rig, phase(rig, i / 16).q), vb, K).leaders;
    rig._pinMode = { key, leaders: ok }; return ok;
  }
  function pinsSvg(rig, pins, P, vb, K) {
    const L = layoutPins(pins, P, vb, K), b = PIN.badge * K; L.leaders = L.leaders && pinMode(rig, pins, vb, K);
    let s = `<g class="mq-pins${L.leaders ? '' : ' legend'}">`;
    if (L.leaders) L.chips.forEach(it => { s += `<line class="mq-pin-l" x1="${f1(it.rect[0] + it.rect[2] / 2)}" y1="${f1(it.rect[1])}" x2="${f1(it.badge[0])}" y2="${f1(it.badge[1])}"/>`; });
    L.chips.forEach(it => { const [x, y, w, h] = it.rect;
      s += `<g class="mq-pin"><rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(h / 2)}"/><circle class="mq-pin-n" cx="${f1(x + h / 2)}" cy="${f1(y + h / 2)}" r="${f1(h / 2 - 1.2 * K)}"/>` +
        `<text class="mq-pin-nt" x="${f1(x + h / 2)}" y="${f1(y + h / 2 + 2.2 * K)}" text-anchor="middle" style="font-size:${f1(6 * K)}px">${it.n}</text>` +
        `<text x="${f1(x + h + 2.5 * K)}" y="${f1(y + 7.7 * K)}" style="font-size:${f1(6.4 * K)}px">${it.text}</text></g>`; });
    L.chips.forEach(it => { s += `<g class="mq-pin-b"><circle cx="${f1(it.badge[0])}" cy="${f1(it.badge[1])}" r="${f1(b)}"/><text x="${f1(it.badge[0])}" y="${f1(it.badge[1] + 2.1 * K)}" text-anchor="middle" style="font-size:${f1(5.6 * K)}px">${it.n}</text></g>`; });
    return s + '</g>';
  }

  // ---------- overlay: spine guide, joint angles, phased cues ----------
  function overlay(rig, P, q, ph, opts) {
    let s = '';
    if (rig.spine !== false) { const ok = !opts.bad && (rig.spineOk ? rig.spineOk(q) : true), a = rig.view ? P.Hd : P.Hd, b = rig.view ? P.P : P.H; s += `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" class="mq-spine${ok ? ' ok' : opts.bad ? ' bad' : ''}"/>`; }
    (rig.arcs || []).forEach(([a, c, b], i) => {
      const C0 = P[c], d1 = unit(C0, P[a]), d2 = unit(C0, P[b]), ag = Math.acos(Math.max(-1, Math.min(1, d1[0] * d2[0] + d1[1] * d2[1]))) / R, r = i ? 8 : 10;
      const s0 = add(C0, d1, r), s1 = add(C0, d2, r), sw = d1[0] * d2[1] - d1[1] * d2[0] > 0 ? 1 : 0, m = unit([0, 0], [d1[0] + d2[0] || 0.001, d1[1] + d2[1]]), tp = add(C0, m, r + 7);
      s += `<path class="mq-arc" d="M${f1(s0[0])},${f1(s0[1])} A${r},${r} 0 0 ${sw} ${f1(s1[0])},${f1(s1[1])}"/><text class="mq-deg" x="${f1(tp[0])}" y="${f1(tp[1] + 2)}" text-anchor="middle">${Math.round(ag)}°</text>`;
    });
    const vb = opts.vb || [-4, 10, 230, 172.5], K = Math.max(1, vb[2] / 230), right = vb[0] + vb[2] - 5 * K; let y = vb[1] + 5 * K;
    if (opts.noCues) return s;
    // Coach mode (v19 layout): 2-3 posture cues become numbered chips in a strip reserved BELOW the figure (fitBox makes
    // room), so a label never covers the body or another label. Each body point gets a matching numbered badge. Thin
    // leader lines are drawn only when the layout is provably clean (one row, no two leaders cross, no leader passes
    // through another chip); otherwise the strip works as a legend (badge 1 on the body = chip 1).
    const pins = opts.pins ? pinsFor(rig) : [];
    if (pins.length) s += pinsSvg(rig, pins, P, vb, K);
    const pinned = new Set(pins.map(p => p.text));
    rig.cues.forEach(cu => {
      if (pinned.has(cu.text)) return;
      const c = ph.c, inside = (c >= cu.t[0] && c <= cu.t[1]) || (cu.t[1] > 1 && c <= cu.t[1] - 1) || (cu.t[0] < 0 && c >= cu.t[0] + 1);
      if (!inside) return;
      let prog = c >= cu.t[0] ? (c - cu.t[0]) / (cu.t[1] - cu.t[0]) : (c + 1 - cu.t[0]) / (cu.t[1] - cu.t[0]); if (cu.t[0] < 0 && c > 0.5) prog = (c - 1 - cu.t[0]) / (cu.t[1] - cu.t[0]);
      // v25: lighter cues (smaller, frosted chip, no accent border) so the figure stays the hero
      const a = opts.still ? 1 : Math.min(1, prog * 6, (1 - prog) * 6), w = (cu.text.length * 3.3 + 10) * K;
      s += `<g class="mq-cue" style="opacity:${Math.max(0, a).toFixed(2)}"><rect x="${f1(right - w)}" y="${f1(y)}" width="${f1(w)}" height="${f1(10.5 * K)}" rx="${f1(5.25 * K)}"/><text x="${f1(right - w / 2)}" y="${f1(y + 7.3 * K)}" text-anchor="middle" style="font-size:${f1(6.2 * K)}px">${cu.text}</text></g>`;
      y += 13 * K;
    });
    return s;
  }

  // ---------- coach mode: pinned cues + common mistake ----------
  const mid = (a, b) => (a && b ? [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] : null);
  const PIN_SIDE = [[/upper back|shoulder blade|blades/i, P => add(P.S, unit(P.S, P.H), 7)], [/back|spine|torso|chest|ribs|plank|straight line|body straight|square|tall|posture|lean/i, P => mid(P.H, P.S)], [/hip|glute|pelvis|seat/i, P => P.H], [/knee|legs? /i, P => P.K1],
    [/quad|thigh|hamstring/i, P => mid(P.H, P.K1)], [/calf|heel|foot|feet|toe|mid-foot|shin|step/i, P => P.A1], [/elbow|upper arm|biceps|triceps|arms? /i, P => P.E1], [/shoulder|blade|lats|delt|shrug/i, P => P.S],
    [/wrist|grip|bar|handle|weight|hand|dumbbell|band|rope|cable|palm|thumb|ball/i, P => P.W1], [/head|chin|neck|gaze|forehead|ears/i, P => P.Hd]];
  const PIN_FRONT = [[/back|spine|torso|chest|ribs|lean|tall/i, P => mid(P.P, P.N0)], [/hip|glute|pelvis/i, P => P.HL], [/knee/i, P => P.KL], [/heel|foot|feet|toe/i, P => P.AL],
    [/elbow|arms?\b/i, P => P.EL], [/shoulder|blade|shrug|delt/i, P => P.SL], [/wrist|grip|handle|hand|dumbbell|band|thumb|cable|palm/i, P => P.WL], [/head|chin|neck/i, P => P.Hd]];
  function pinsFor(rig) {
    if (rig._pins) return rig._pins;
    const table = rig.view ? PIN_FRONT : PIN_SIDE, used = new Set(), out = [];
    rig.cues.forEach(cu => { if (out.length >= 3) return; const hit = table.findIndex(([re], i) => !used.has(i) && re.test(cu.text)); if (hit < 0) return; used.add(hit); out.push({ text: cu.text, at: table[hit][1] }); });
    return (rig._pins = out);
  }
  // A plausible "what it looks like done wrong" for each family, drawn by bending the key pose.
  function mistakeFor(ex) {
    const rig = rigFor(ex); if (!rig || !ex) return null;
    const k = ex.kind, sl = ex.slots || [];
    if (k === 'mobility' || k === 'cardio') return null;
    if (rig.view) return { bad: 'Shrugging & leaning to cheat', fix: 'Shoulders down, torso still', mod: q => ({ T: q.T - 12, N: q.N - 20, tw: (q.tw || 0) + 0.3 }) };
    const kq = phase(rig, rig.key).q;
    if (sl.some(x => /^(quad|lunge)$/.test(x))) return { bad: 'Chest caves, back rounds', fix: 'Chest up, brace, flat back', mod: q => ({ T: q.T - 14, B: q.B + 16, N: q.N - 12 }) };
    if (sl.some(x => /^(biceps|triceps|side_delt|rear_delt)$/.test(x))) return { bad: 'Swinging with the body', fix: 'Torso still, elbows pinned', mod: q => ({ T: q.T + 16, N: q.N + 16, B: q.B - 14 }) };
    if (k === 'core') return { bad: 'Hips sag, low back arches', fix: 'Ribs down, squeeze glutes', mod: q => ({ B: q.B - 18 }) };
    if (sl.some(x => /^(hpush|incline|vpush|fly)$/.test(x))) return { bad: 'Low back over-arched', fix: 'Ribs down, glutes on the pad', mod: q => ({ B: q.B - 18 }) };
    if (kq.T < 160 || sl.some(x => /^(hinge|glute|hpull|ham_iso)$/.test(x))) return { bad: 'Rounded back', fix: 'Flat back, hips back, chest proud', mod: q => ({ B: q.B + 18, N: q.N - 14 }) };
    return { bad: 'Rounded, rushed reps', fix: 'Tall spine, slow control', mod: q => ({ B: q.B + 16, N: q.N - 12 }) };
  }
  function staticSvg(ex, which) { // 'good' | 'bad' at the key frame, square, overlay = spine guide only
    const rig = rigFor(ex); if (!rig) return '';
    const m = mistakeFor(ex);
    if (V26()) { const A = WO.ANATOMY, vb3 = A.fitBox(ex, rig, true);
      return `<svg viewBox="${vb3.join(' ')}" class="demo-svg mq3d mq3d-${FIG}" role="img" aria-label="${which === 'bad' ? 'Common mistake' : 'Correct form'}"><g>${A.render(ex, rig, A.stillT(rig), { still: true, muscles: ex.primary || [], mod: which === 'bad' && m ? m.mod : null })}</g></svg>`; }
    const vb = fitBox(rig, true);
    const body = render(rig, rig.key, { overlay: true, noCues: true, still: true, vb, muscles: ex.primary || [], mod: which === 'bad' && m ? m.mod : null, bad: which === 'bad' });
    return `<svg viewBox="${vb.join(' ')}" class="demo-svg mq mq-${FIG}" role="img" aria-label="${which === 'bad' ? 'Common mistake' : 'Correct form'}">${DEFS}<g>${body}</g></svg>`;
  }

  // fit the viewBox to the whole movement (+ scenery), 4:3 for the sheet, square for thumbnails
  function fitBox(rig, small, pins) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; const addPt = (p, r = 0) => { if (!p) return; x0 = Math.min(x0, p[0] - r); y0 = Math.min(y0, p[1] - r); x1 = Math.max(x1, p[0] + r); y1 = Math.max(y1, p[1] + r); };
    for (let i = 0; i < 24; i++) { const P = poseAny(rig, phase(rig, i / 24).q);
      Object.keys(P).forEach(k => { if (Array.isArray(P[k]) && k !== 'Hd') addPt(P[k], 11); }); addPt(P.Hd, 15);
      if (rig.prop === 'bar') addPt(rig.propAt ? (rig.propAt === 'hips' ? add(P.H, [0, -13]) : P.S) : P.W1, (rig.plate || 13) + 9);
      [rig.scene, rig.scene2].forEach(sn => { if (sn && SC[sn]) (SC[sn].pts(P, rig) || []).forEach(p => addPt(p)); });
      (rig.lines || []).forEach(l => { if (typeof l[1] !== 'string') addPt(l[1], 4); }); }
    if (rig.floor !== false) addPt([x0, FLOOR + 3]);
    const pad = small ? 4 : 8; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    let w = x1 - x0, h = y1 - y0; const AR = small ? 1 : 4 / 3;
    if (!small && w < 230) { x0 -= (230 - w) / 2; w = 230; }
    // coach mode: reserve a chip strip under the figure (normalized height scales with the final width, so solve for it)
    const strip = pins && pins.length ? pinStripH(pins.map(p => p.text)) : 0;
    if (strip) { let extra = strip; for (let i = 0; i < 6; i++) { const fw = Math.max(w, (h + extra) * AR); extra = strip * Math.max(1, fw / 230); } h += extra; y1 = y0 + h; }
    if (w / h < AR) { const nw = h * AR; x0 -= (nw - w) / 2; w = nw; } else { const nh = w / AR; y0 -= (nh - h); h = nh; }
    return [x0, y0, w, h].map(v => Math.round(v * 10) / 10);
  }

  // ---------- mount + loop ----------
  // v26: the 3-D anatomical figure (js/anatomy.js) is the default demo; the v25 flat figure stays as a fallback behind a flag
  // (?demo=v25 or localStorage mountup.demo = 'v25'), and is used automatically if anatomy.js failed to load.
  const V26 = () => { if (!WO.ANATOMY) return false; try { if (/[?&]demo=v25\b/.test(location.search) || localStorage.getItem('mountup.demo') === 'v25') return false; } catch (e) { /* ignore */ } return true; };
  const live = new Set(), mounted = new Set(); let raf = null;
  const draw = (d, c) => { d.c = c; d.g.innerHTML = d.v26 ? WO.ANATOMY.render(d.ex, d.rig, c, d.opts) : render(d.rig, c, d.opts); };
  function loop(ts) {
    live.forEach(d => { if (!d.g.isConnected) { live.delete(d); mounted.delete(d); return; }
      const dt = d.last == null ? 0 : ts - d.last; d.last = ts; if (d.paused) return;
      const c = (d.c || 0) + dt * (d.speed || 1) / d.rig.period;
      // v26 frames are rich 3-D SVG: repaint at ~30 fps (motion stays smooth, phone CPU stays cool)
      if (d.v26 && d.drawn != null && ts - d.drawn < 30) { d.c = c; return; } d.drawn = ts; draw(d, c); });
    raf = live.size ? requestAnimationFrame(loop) : null;
  }
  const DEFS = '<defs><linearGradient id="mqShade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--mq-hi)"/><stop offset="1" style="stop-color:var(--mq-lo)"/></linearGradient><linearGradient id="mqFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--mq-hi)"/><stop offset="1" style="stop-color:var(--mq-mid)"/></linearGradient>' +
    '<linearGradient id="mqPanel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#5d6672" stop-opacity=".22"/></linearGradient>' +
    '<linearGradient id="mqRed" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--mq-red-hi)"/><stop offset=".55" style="stop-color:var(--mq-red)"/><stop offset="1" style="stop-color:var(--mq-red-lo)"/></linearGradient>' +
    '<filter id="mqGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur in="SourceGraphic" stdDeviation="1.1" result="b"/><feComponentTransfer in="b" result="g"><feFuncA type="linear" slope=".55"/></feComponentTransfer><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
  const rigFor = ex => { const k = ex && EX_RIG[ex.id]; return k && RIGS[k] ? normalize(RIGS[k]) : null; };
  const GENERIC = { stand: 'bwsquat' };
  function mount(container, ex, mo) {
    if (!container || !ex) return;
    mo = mo || {};
    let rig = rigFor(ex) || normalize(RIGS[GENERIC.stand]);
    if (rig.view && mo.view && mo.view !== rig.view) rig = Object.assign({}, rig, { view: mo.view }); // front <-> back: same pose, other side of the body
    const small = container.classList.contains('ex-thumb'), v26 = V26();
    const vb = v26 ? WO.ANATOMY.fitBox(ex, rig, small) : fitBox(rig, small, mo.coach && !small ? pinsFor(rig) : null);
    if (!rigFor(ex) && window.console) console.warn('[mannequin] no rig for', ex.id, '- using generic pose');
    container.innerHTML = `<svg viewBox="${vb.join(' ')}" class="demo-svg ${v26 ? 'mq3d mq3d' : 'mq mq'}-${FIG}" role="img" aria-label="Posture demo of ${String(ex.name).replace(/"/g, '')} (${FIG} figure)">${v26 ? '' : DEFS}<g></g></svg>`;
    const g = container.querySelector('g'), still = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const frozen = API.freeze != null, fz = API.freeze === 'key' ? rig.key : +API.freeze;
    const d = { g, svg: container.firstElementChild, ex, container, rig, v26, speed: mo.speed || 1, last: null, opts: { overlay: !small, still: still || frozen, vb, muscles: ex.primary || [], muscles2: mo.coach ? (ex.secondary || []) : [], pins: !!mo.coach && !small } };
    mounted.forEach(o => { if (o.container === container) { mounted.delete(o); live.delete(o); } });
    mounted.add(d);
    // Reduce Motion (and thumbnails): show the KEY position of the movement, not whatever frame the loop was on
    const keyT = v26 ? WO.ANATOMY.stillT(rig) : rig.key;
    draw(d, frozen ? (API.freeze === 'key' ? keyT : fz) : small || still ? keyT : 0);
    if (still || frozen || small) { d.paused = true; return d; }
    live.add(d); if (!raf) raf = requestAnimationFrame(loop);
    return d;
  }
  const findMounted = c => { let f = null; mounted.forEach(d => { if (d.container === c) f = d; }); return f; };
  // Slow-mo / pause / step for the coach controls under the big demo
  function control(container, cmd, val) {
    const d = findMounted(container); if (!d) return null;
    if (cmd === 'speed') { d.speed = +val || 1; if (d.paused && !d.opts.still) { d.paused = false; d.last = null; } live.add(d); if (!raf) raf = requestAnimationFrame(loop); }
    else if (cmd === 'pause') { d.paused = !d.paused; d.last = null; if (!d.paused) { live.add(d); if (!raf) raf = requestAnimationFrame(loop); } }
    else if (cmd === 'step') { d.paused = true; draw(d, (d.c || 0) + 0.125); }
    return { speed: d.speed, paused: !!d.paused };
  }
  function setFigure(f) {
    if (f !== 'male' && f !== 'female') f = 'male';
    FIG = f; try { localStorage.setItem('mountup.figure', f); } catch (e) { /* ignore */ }
    mounted.forEach(d => { if (!d.g.isConnected) { mounted.delete(d); live.delete(d); return; } d.svg.setAttribute('class', d.v26 ? `demo-svg mq3d mq3d-${FIG}` : `demo-svg mq mq-${FIG}`); if (!live.has(d)) draw(d, d.c); });
    document.querySelectorAll('[data-fig-set]').forEach(b => { const on = b.dataset.figSet === FIG; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
    return FIG;
  }
  const API = { RIGS, EX_RIG, render, fitBox, DEFS, normalize, rigFor, setFigure, getFigure: () => FIG, freeze: null,
    hasRig: ex => !!rigFor(ex), phase, pose: poseAny, mistakeFor, staticSvg, control, pinsFor, layoutPins, pinStripH, pinMode };
  API.render = (rig, t, opts) => render(normalize(rig), t, opts);
  WO.mountDemo = mount; // every exercise renders a mannequin; the stick-figure path (demo.js) is no longer used
  WO.setFigure = setFigure; WO.getFigure = () => FIG;
  WO.MANNEQUIN = API;
})();
