/* Anatomical mannequin demos: side-view filled + shaded body driven by joint-angle keyframes, with a posture-coaching
   overlay (neutral-spine guide, joint angle arcs, phased cues) and the exercise's primary muscles highlighted.
   Original artwork. Exercises listed in EX_RIG use this; every other exercise falls back to the stick figure (demo.js).
   Angles are absolute, in degrees: 0 = segment points straight down, +90 = points forward (the way the figure faces, +x),
   180 = points up, -90 = points backward. T torso (hip->shoulder), N head, t thigh, s shank, u upper arm, f forearm,
   fa foot (90 = flat, toes forward); suffix 1 = near side, 2 = far side; k* = length scale (foreshortening). */
(function () {
  'use strict';
  const WO = window.WO = window.WO || {};
  const R = Math.PI / 180, f1 = n => n.toFixed(1);
  const LEN = { thigh: 43, shank: 42, torso: 50, ua: 31, fa: 32 }, FLOOR = 182;
  const dir = a => [Math.sin(a * R), Math.cos(a * R)];
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
  const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
  const ST = [96, 176]; // standing: near ankle pinned here
  const STD = { T: 180, t1: 0, s1: 0 };
  const LYING = { T: -90, t1: 75, s1: -5 }; // supine on a flat bench, head to the left, feet on the floor
  const BENCH_H = [118, 124];

  // ---------- scenery ----------
  const SC = {
    bench: () => '<rect x="40" y="134" width="94" height="8" rx="3" class="scn"/><line x1="54" y1="142" x2="54" y2="182" class="scn-l"/><line x1="120" y1="142" x2="120" y2="182" class="scn-l"/>',
    incline: P => { const u = dir(P.q.T), bk = [u[1], -u[0]], a = add(add(P.H, bk, 12), u, -6), b = add(add(P.H, bk, 12), u, 54);
      return `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" class="scn-l" stroke-width="8" stroke-linecap="round"/><rect x="${f1(P.H[0] - 16)}" y="${f1(P.H[1] + 9)}" width="40" height="7" rx="3" class="scn"/><line x1="${f1(P.H[0])}" y1="${f1(P.H[1] + 16)}" x2="${f1(P.H[0])}" y2="182" class="scn-l"/>`; },
    pad: P => { const u = dir(P.q.T), fr = [-u[1], u[0]], a = add(add(P.H, fr, 12), u, -2), b = add(add(P.H, fr, 12), u, 44), m = add(a, unit(a, b), 18);
      return `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" class="scn-l" stroke-width="8" stroke-linecap="round"/><line x1="${f1(m[0])}" y1="${f1(m[1])}" x2="${f1(m[0])}" y2="182" class="scn-l"/><line x1="${f1(m[0] - 22)}" y1="181" x2="${f1(m[0] + 22)}" y2="181" class="scn-l" stroke-width="3"/>`; },
    couch: () => '<rect x="22" y="118" width="43" height="64" rx="6" class="scn"/><rect x="58" y="176" width="26" height="6" rx="2" class="scn"/>',
    post: () => '<rect x="132" y="88" width="5" height="94" rx="2" class="scn" opacity=".55"/><circle cx="134.5" cy="94" r="3.2" class="scn-l"/>',
    mat: () => '<rect x="8" y="30" width="200" height="164" rx="12" class="scn" opacity=".35"/><text x="16" y="44" class="mq-note">TOP VIEW</text>'
  };

  // ---------- rigs ----------
  const C = (t0, t1, text) => ({ t: [t0, t1], text });
  const TL2 = [[0, 0], [0.12, 0], [0.46, 1], [0.6, 1], [0.92, 0], [1, 0]]; // top -> key -> top
  const RIGS = {
    rdl: { anchor: ['A1', ST], hug: true, prop: 'db2', period: 4600, key: 0.55, spineOk: q => q.T < 168, arcs: [['S', 'H', 'K1'], ['H', 'K1', 'A1']],
      frames: [{ T: 180, t1: 1, s1: -2, u1: 5, f1: 8 }, { T: 90, t1: 30, s1: -5, u1: 0, f1: 0 }],
      tl: [[0, 0], [0.12, 0], [0.48, 1], [0.62, 1], [0.92, 0], [1, 0]],
      cues: [C(0.12, 0.5, 'Hips back'), C(0.2, 0.62, 'Soft knees'), C(0.46, 0.66, 'Flat back'), C(0.48, 0.64, 'DBs close to shins'), C(0.64, 0.9, 'Drive hips forward'), C(0.88, 1.12, 'Squeeze glutes at top')] },
    goblet: { anchor: ['A1', ST], prop: 'dbv', period: 4400, key: 0.53, arcs: [['S', 'H', 'K1'], ['H', 'K1', 'A1']],
      frames: [{ T: 180, t1: 0, s1: 0, u1: 10, f1: 165 }, { T: 142, t1: 82, s1: -28, u1: 5, f1: 168 }], tl: TL2,
      cues: [C(0.1, 0.6, 'Chest up'), C(0.2, 0.6, 'Knees track over toes'), C(0.44, 0.62, 'Sit down between heels'), C(0.62, 0.9, 'Drive through mid-foot'), C(0.88, 1.12, 'Stand tall')] },
    bench: { anchor: ['H', BENCH_H], scene: 'bench', prop: 'db2', period: 4400, key: 0.52, arcs: [['S', 'E1', 'W1']],
      frames: [Object.assign({ u1: 20, f1: 180, ku1: 0.55 }, LYING), Object.assign({ u1: 95, f1: 180, ku1: 0.08 }, LYING), Object.assign({ u1: 180, f1: 180 }, LYING)],
      tl: [[0, 2], [0.12, 2], [0.3, 1], [0.46, 0], [0.6, 0], [0.76, 1], [0.92, 2], [1, 2]],
      cues: [C(0, 0.32, 'Shoulder blades squeezed'), C(0.3, 0.62, 'Elbows ~45° from body'), C(0.44, 0.62, 'Lower to mid-chest'), C(0.62, 0.92, 'Press up & together'), C(0.88, 1.12, 'Feet planted')] },
    skull: { anchor: ['H', BENCH_H], scene: 'bench', prop: 'db2', period: 4200, key: 0.53, arcs: [['S', 'E1', 'W1']],
      frames: [Object.assign({ u1: 196, f1: 196 }, LYING), Object.assign({ u1: 196, f1: 300 }, LYING)], tl: TL2,
      cues: [C(0, 0.62, 'Upper arms stay still'), C(0.3, 0.62, 'Lower beside head'), C(0.62, 0.92, 'Extend & squeeze triceps'), C(0.9, 1.1, 'Don\u2019t lock hard')] },
    row: { anchor: ['A1', [64, 176]], scene: 'pad', prop: 'db2', period: 4200, key: 0.53, arcs: [['S', 'E1', 'W1']],
      frames: [{ T: 125, t1: -20, s1: -20, fa1: 60, u1: 0, f1: 0 }, { T: 125, t1: -20, s1: -20, fa1: 60, u1: -118, f1: -2 }], tl: TL2,
      cues: [C(0, 0.4, 'Chest stays on pad'), C(0.15, 0.46, 'Drive elbows back'), C(0.44, 0.62, 'Squeeze shoulder blades'), C(0.62, 0.94, 'Lower with control')] },
    press: { anchor: ['A1', ST], prop: 'db2', period: 4400, key: 0.53, arcs: [['S', 'E1', 'W1']],
      frames: [Object.assign({ u1: 20, f1: 180, ku1: 0.8 }, STD), Object.assign({ u1: 100, f1: 180, ku1: 0.12 }, STD), Object.assign({ u1: 178, f1: 179 }, STD)],
      tl: [[0, 0], [0.12, 0], [0.3, 1], [0.46, 2], [0.6, 2], [0.76, 1], [0.92, 0], [1, 0]],
      cues: [C(0, 0.3, 'Brace abs, squeeze glutes'), C(0.14, 0.46, 'Press straight up'), C(0.44, 0.62, 'Biceps by ears'), C(0.46, 0.64, 'Ribs down, no arch'), C(0.62, 0.94, 'Lower to shoulders')] },
    curl: { anchor: ['A1', [128, 176]], scene: 'incline', prop: 'db2', period: 4200, key: 0.53, arcs: [['S', 'E1', 'W1']],
      frames: [{ T: 215, t1: 90, s1: 0, u1: 0, f1: 0 }, { T: 215, t1: 90, s1: 0, u1: -4, f1: 160 }], tl: TL2,
      cues: [C(0, 0.62, 'Elbows stay back'), C(0.14, 0.46, 'Curl to shoulder'), C(0.44, 0.62, 'Squeeze'), C(0.62, 0.94, 'Slow 3-sec lower'), C(0.9, 1.12, 'Full stretch at bottom')] },
    pallof: { anchor: ['A1', ST], scene: 'post', prop: 'band', bandTo: [134.5, 94], period: 4400, key: 0.53, arcs: [['S', 'E1', 'W1']],
      frames: [{ T: 178, t1: 10, s1: -8, u1: 5, f1: 150 }, { T: 178, t1: 10, s1: -8, u1: 86, f1: 86 }], tl: TL2,
      cues: [C(0, 0.3, 'Band anchored at your side'), C(0.12, 0.46, 'Press straight out'), C(0.2, 0.62, 'Don\u2019t let it twist you'), C(0.44, 0.62, 'Hold 2 sec'), C(0.62, 0.94, 'Hips & shoulders square')] },
    swing: { anchor: ['A1', ST], prop: 'kb', period: 2600, key: 0.48, spineOk: q => q.T < 172, arcs: [['S', 'H', 'K1'], ['H', 'K1', 'A1']],
      frames: [{ T: 180, t1: 0, s1: 0, u1: 88, f1: 88 }, { T: 105, t1: 25, s1: -4, u1: -39, f1: -39 }],
      tl: [[0, 0], [0.1, 0], [0.45, 1], [0.52, 1], [0.85, 0], [1, 0]],
      cues: [C(0.28, 0.56, 'Hike it back'), C(0.38, 0.6, 'Flat back'), C(0.54, 0.84, 'Snap hips forward'), C(0.84, 1.1, 'Float \u2014 arms just guide')] },
    wgs: { anchor: ['A1', [124, 176]], period: 5600, key: 0.56, arcs: [['H', 'K1', 'A1']], mside: { hip_flexors: 2 },
      frames: [{ T: 100, N: 100, t1: 80, s1: -10, t2: -55, s2: -70, fa2: 60, u1: -10, f1: -10, u2: 0, f2: 0 },
        { T: 100, N: 118, t1: 80, s1: -10, t2: -55, s2: -70, fa2: 60, u1: 90, f1: 90, ku1: 0.2, kf1: 0.2, u2: 0, f2: 0 },
        { T: 100, N: 150, t1: 80, s1: -10, t2: -55, s2: -70, fa2: 60, u1: 180, f1: 180, u2: 0, f2: 0 }],
      tl: [[0, 0], [0.15, 0], [0.32, 1], [0.48, 2], [0.66, 2], [0.82, 1], [0.98, 0], [1, 0]],
      cues: [C(0, 0.28, 'Elbow to instep'), C(0, 0.3, 'Back knee off floor'), C(0.32, 0.68, 'Rotate & reach up'), C(0.46, 0.68, 'Eyes follow hand'), C(0.7, 0.98, 'Return with control')] },
    h9090: { anchor: ['H', [100, 166]], period: 6400, key: 0.05, spineOk: () => true,
      frames: [{ T: 180, t1: 80, s1: -90, ks1: 0.3, fa1: 90, fs1: 0.5, t2: -90, kt2: 0.35, s2: -80, fa2: -90, fs2: 0.8, u1: -25, f1: -25 },
        { T: 180, t1: 130, s1: -25, t2: 130, s2: -25, u1: -25, f1: -25 },
        { T: 180, t1: 80, kt1: 0.35, s1: -80, fa1: -90, fs1: 0.8, t2: 80, s2: -90, ks2: 0.3, fa2: 90, fs2: 0.5, u1: -25, f1: -25 },
        { T: 180, t1: 130, s1: -25, t2: 130, s2: -25, u1: -25, f1: -25 }],
      tl: [[0, 0], [0.12, 0], [0.3, 1], [0.48, 2], [0.62, 2], [0.8, 3], [0.98, 4], [1, 4]],
      cues: [C(0, 1, 'Sit tall, chest up'), C(0.12, 0.48, 'Knees fall together'), C(0.62, 0.98, 'Knees fall together'), C(0.46, 0.64, 'Both knees at 90°'), C(-0.02, 0.14, 'Both knees at 90°')] },
    couch: { anchor: ['K1', [70, 174]], scene: 'couch', period: 5200, key: 0.62, arcs: [['S', 'H', 'K1']],
      frames: [{ T: 165, t1: -15, s1: 180, fa1: 180, t2: 88, s2: 0, fa2: 90, u1: 36, f1: 36 }, { T: 184, t1: -15, s1: 180, fa1: 180, t2: 88, s2: 0, fa2: 90, u1: 30, f1: 30 }],
      tl: [[0, 0], [0.15, 0], [0.45, 1], [0.85, 1], [1, 0]],
      cues: [C(0.1, 0.45, 'Tuck pelvis under'), C(0.3, 0.85, 'Squeeze back-leg glute'), C(0.45, 0.85, 'Tall chest'), C(0.84, 1.1, 'Breathe slow')] },
    book: { anchor: ['H', [80, 110]], scene: 'mat', floor: false, spine: false, period: 6000, key: 0.55, farOff: [2.5, 2.5],
      frames: [{ T: 90, t1: 0, s1: -90, fa1: 0, fs1: 0.9, u1: 0, f1: 0, u2: 0, f2: 0 },
        { T: 90, N: 100, t1: 0, s1: -90, fa1: 0, fs1: 0.9, u1: 90, f1: 90, ku1: 0.15, kf1: 0.15, u2: 0, f2: 0 },
        { T: 90, N: 110, t1: 0, s1: -90, fa1: 0, fs1: 0.9, u1: 180, f1: 180, u2: 0, f2: 0 }],
      tl: [[0, 0], [0.12, 0], [0.3, 1], [0.48, 2], [0.64, 2], [0.82, 1], [0.98, 0], [1, 0]],
      cues: [C(0, 1, 'Knees stay stacked'), C(0.14, 0.64, 'Open chest, reach back'), C(0.3, 0.66, 'Eyes follow hand'), C(0.66, 0.98, 'Exhale, return slowly')] }
  };
  const EX_RIG = { db_rdl: 'rdl', goblet_squat: 'goblet', db_bench: 'bench', skull_crusher: 'skull', chest_supported_row: 'row', standing_db_press: 'press',
    incline_db_curl: 'curl', pallof_press: 'pallof', kb_swing: 'swing', worlds_greatest: 'wgs', hip_9090: 'h9090', couch_stretch: 'couch', open_book: 'book' };

  // fill defaults so every frame interpolates cleanly
  const KEYS = ['T', 'N', 't1', 's1', 't2', 's2', 'u1', 'f1', 'u2', 'f2', 'fa1', 'fa2', 'fs1', 'fs2', 'kt1', 'ks1', 'kt2', 'ks2', 'ku1', 'kf1', 'ku2', 'kf2'];
  Object.values(RIGS).forEach(r => { r.frames = r.frames.map(f => { const o = Object.assign({}, f);
    if (o.N == null) o.N = o.T; ['t', 's', 'u', 'f'].forEach(k => { if (o[k + '2'] == null) o[k + '2'] = o[k + '1']; });
    if (o.fa1 == null) o.fa1 = 90; if (o.fa2 == null) o.fa2 = o.fa1; ['fs1', 'fs2', 'kt1', 'ks1', 'kt2', 'ks2', 'ku1', 'kf1', 'ku2', 'kf2'].forEach(k => { if (o[k] == null) o[k] = 1; }); return o; }); });

  // ---------- pose ----------
  function phase(rig, t) { // -> { q (angles), idx (frame position) }
    const T = rig.tl, c = ((t % 1) + 1) % 1; let idx = 0;
    for (let i = 0; i < T.length - 1; i++) if (c >= T[i][0] && c <= T[i + 1][0]) { const k = (c - T[i][0]) / ((T[i + 1][0] - T[i][0]) || 1); idx = T[i][1] + (T[i + 1][1] - T[i][1]) * (1 - Math.cos(Math.PI * k)) / 2; break; }
    const n = rig.frames.length, i0 = Math.floor(idx), e = idx - i0, A = rig.frames[i0 % n], B = rig.frames[(i0 + 1) % n], q = {};
    KEYS.forEach(k => { q[k] = A[k] + (B[k] - A[k]) * e; });
    return { q, idx, c };
  }
  function pose(rig, q) {
    const J = { H: [0, 0] };
    J.K1 = add(J.H, dir(q.t1), LEN.thigh * q.kt1); J.A1 = add(J.K1, dir(q.s1), LEN.shank * q.ks1);
    J.K2 = add(J.H, dir(q.t2), LEN.thigh * q.kt2); J.A2 = add(J.K2, dir(q.s2), LEN.shank * q.ks2);
    J.S = add(J.H, dir(q.T), LEN.torso);
    const off = [rig.anchor[1][0] - J[rig.anchor[0]][0], rig.anchor[1][1] - J[rig.anchor[0]][1]];
    Object.keys(J).forEach(k => { J[k] = add(J[k], off); });
    if (rig.hug) { // arms hang (gravity) but stay close to the legs: swing the hands back if they drift in front of thigh/shin
      const { H, K1, A1, S } = J, arm = LEN.ua + LEN.fa;
      const frontAt = y => { if (y <= H[1]) return H[0] + 9; if (y <= K1[1]) return H[0] + (K1[0] - H[0]) * (y - H[1]) / ((K1[1] - H[1]) || 1) + 8; return K1[0] + (A1[0] - K1[0]) * (y - K1[1]) / ((A1[1] - K1[1]) || 1) + 5; };
      for (let i = 0; i < 4; i++) { const wy = S[1] + arm * Math.cos(q.u1 * R), wx = S[0] + arm * Math.sin(q.u1 * R), lim = frontAt(wy) + 7; if (wx > lim) q.u1 = q.f1 = q.u2 = q.f2 = Math.asin(Math.max(-1, Math.min(1, (lim - S[0]) / arm))) / R; else break; }
    }
    J.E1 = add(J.S, dir(q.u1), LEN.ua * q.ku1); J.W1 = add(J.E1, dir(q.f1), LEN.fa * q.kf1);
    J.E2 = add(J.S, dir(q.u2), LEN.ua * q.ku2); J.W2 = add(J.E2, dir(q.f2), LEN.fa * q.kf2);
    J.q = q; return J;
  }

  // ---------- shapes (local coords: u along the segment, v toward the body's front) ----------
  function frame(o, d, torso) { const n = torso ? [-d[1], d[0]] : [d[1], -d[0]]; return ([a, b]) => [o[0] + d[0] * a + n[0] * b, o[1] + d[1] * a + n[1] * b]; }
  function smooth(pts) {
    const n = pts.length; let s = `M${f1(pts[0][0])},${f1(pts[0][1])}`;
    for (let i = 0; i < n; i++) { const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      s += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)},${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)},${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])},${f1(p2[1])}`; }
    return s + 'Z';
  }
  // limb outline scaled to the actual (possibly foreshortened) segment length
  const limb = (a, b, local, L) => { const len = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(0.25, len / L); return smooth(local.map(([u, v]) => [u * k, v]).map(frame(a, unit(a, b)))); };
  const SHAPE = {
    thigh: [[-3, 8], [12, 9.5], [28, 8], [40, 6], [46, 3], [46, -4], [36, -6.5], [22, -9.5], [8, -10.5], [-3, -8.5]],
    calf: [[-3, 5.5], [14, 4.6], [30, 3.6], [43, 3.2], [43, -3.4], [32, -4.6], [16, -8], [3, -7.4]],
    ua: [[-4, 5.5], [14, 5.2], [28, 3.9], [32, 3], [32, -3.4], [20, -4.6], [6, -6], [-4, -5.6]],
    fa: [[-2, 3.9], [9, 4.4], [24, 3.1], [30, 2.6], [30, -2.6], [15, -3.4], [0, -3.6]],
    torso: [[-5, 4], [4, 9.5], [16, 8.6], [28, 9], [38, 11.6], [46, 9.6], [53, 4.5], [55, 0], [54, -6.5], [46, -10.5], [32, -9.6], [17, -8.6], [7, -13.4], [-4, -10.5]],
    head: [[9, -6], [14, -10.5], [22, -10.4], [28, -5.5], [29.6, 1], [27.4, 6.6], [23, 9.6], [19.5, 10.4], [16.6, 12.2], [13.4, 11.4], [11, 8.4], [8.6, 4]],
    neck: [[0, 4.5], [9, 4.2], [9, -4.2], [0, -5]],
    foot: [[-8, 6], [25, 6], [27, 2.5], [17, 0], [5, -3], [-6, -3], [-9, 1]]
  };
  // muscle id -> [segment, local shape]
  const MUS = {
    glutes: ['torso', [[-3.5, -9.4], [5, -13.2], [14, -10], [12, -3.5], [1, -3]]],
    lower_back: ['torso', [[10, -8.2], [20, -8.4], [22, -5], [11, -5]]],
    upper_back: ['torso', [[22, -8.6], [34, -9.4], [46, -10.2], [51, -7], [42, -6], [30, -5.4], [22, -5.4]]],
    chest: ['torso', [[31, 8.8], [38, 11.2], [45, 9.4], [49, 5], [41, 4.6], [33, 5]]],
    abs: ['torso', [[5, 8.4], [16, 8], [28, 8.6], [28, 4.6], [16, 4.4], [6, 4.8]]],
    obliques: ['torso', [[8, 6], [20, 6.4], [30, 4], [26, -3], [12, -4]]],
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
  MUS.lats = MUS.upper_back; MUS.traps = MUS.upper_back;

  // ---------- render ----------
  function render(rig, t, opts) {
    const ph = phase(rig, t), P = pose(rig, ph.q), q = P.q;
    const off = rig.farOff || [-3.5, -1.2], fz = p => add(p, off);
    const key = phase(rig, rig.key).idx, inten = Math.max(0.35, 1 - Math.min(1, Math.abs(ph.idx - key)) * 0.6);
    const muscles = (opts.muscles || []).filter(m => MUS[m]);
    const mus = (seg, side, a, b) => muscles.filter(m => MUS[m][0] === seg && (rig.mside && rig.mside[m] || 1) === side).map(m => {
      const sh = MUS[m][1], d = seg === 'torso' ? smooth(sh.map(frame(a, dir(q.T), true))) : limb(a, b, sh, LEN[seg === 'calf' ? 'shank' : seg]);
      return `<path class="mq-mus" style="opacity:${(0.4 + 0.5 * inten).toFixed(2)}" d="${d}"/>`; }).join('');
    const foot = (a, fa, fs, cls) => { const d = dir(fa), so = [-d[1], d[0]]; return `<path class="${cls}" d="${smooth(SHAPE.foot.map(([u, w]) => add(add(a, d, u * fs), so, w)))}"/>`; };
    const hex = (c, cls) => { const pts = Array.from({ length: 6 }, (_, i) => [c[0] + 7.2 * Math.cos((i * 60 + 30) * R), c[1] + 7.2 * Math.sin((i * 60 + 30) * R)]); return `<path class="${cls}" d="M${pts.map(p => f1(p[0]) + ',' + f1(p[1])).join(' L')}Z"/><circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="2.6" class="mq-db-hub"/>`; };
    const handProp = (E, W, far) => {
      const d = unit(E, W), cls = far ? 'mq-db far' : 'mq-db';
      if (rig.prop === 'db2') return hex(add(W, d, 2), cls);
      if (rig.prop === 'kb' && !far) { const c = add(W, d, 11); return `<path class="mq-db" d="M${f1(W[0] - 5)},${f1(W[1])} Q${f1(W[0])},${f1(W[1] - 6)} ${f1(W[0] + 5)},${f1(W[1])}" fill="none" stroke-width="2.4"/><circle class="mq-db" cx="${f1(c[0])}" cy="${f1(c[1])}" r="8.5"/>`; }
      if (rig.prop === 'dbv' && !far) { const x = W[0] + 2, y = W[1] - 3; return `<rect class="mq-db-hub" x="${f1(x - 1.6)}" y="${f1(y)}" width="3.2" height="18"/><rect class="mq-db" x="${f1(x - 8)}" y="${f1(y - 5)}" width="16" height="7" rx="2"/><rect class="mq-db" x="${f1(x - 8)}" y="${f1(y + 16)}" width="16" height="7" rx="2"/>`; }
      return '';
    };
    let s = rig.floor === false ? '' : `<line x1="-300" y1="${FLOOR}" x2="500" y2="${FLOOR}" class="floor"/>`;
    if (rig.scene) s += SC[rig.scene](P);
    // far side: leg, arm (+ prop)
    s += `<path class="mq-far" d="${limb(fz(P.H), fz(P.K2), SHAPE.thigh, LEN.thigh)}"/><path class="mq-far" d="${limb(fz(P.K2), fz(P.A2), SHAPE.calf, LEN.shank)}"/>` + foot(fz(P.A2), q.fa2, q.fs2, 'mq-far');
    s += mus('thigh', 2, fz(P.H), fz(P.K2));
    s += `<path class="mq-far" d="${limb(fz(P.S), fz(P.E2), SHAPE.ua, LEN.ua)}"/><path class="mq-far" d="${limb(fz(P.E2), fz(P.W2), SHAPE.fa, LEN.fa)}"/><circle class="mq-far" cx="${f1(fz(P.W2)[0])}" cy="${f1(fz(P.W2)[1])}" r="3.4"/>` + handProp(fz(P.E2), fz(P.W2), true);
    // torso
    s += `<path class="mq-body" d="${smooth(SHAPE.torso.map(frame(P.H, dir(q.T), true)))}"/>` + mus('torso', 1, P.H);
    // near leg
    s += `<path class="mq-body" d="${limb(P.H, P.K1, SHAPE.thigh, LEN.thigh)}"/>` + mus('thigh', 1, P.H, P.K1);
    s += `<path class="mq-body" d="${limb(P.K1, P.A1, SHAPE.calf, LEN.shank)}"/>` + mus('calf', 1, P.K1, P.A1) + foot(P.A1, q.fa1, q.fs1, 'mq-body');
    // neck + head
    const hf = frame(P.S, dir(q.N), true), Hc = hf([18, 1]);
    s += `<path class="mq-body" d="${smooth(SHAPE.neck.map(frame(P.S, dir((q.T + q.N) / 2), true)))}"/><path class="mq-body" d="${smooth(SHAPE.head.map(hf))}"/>`;
    // near arm + hand + prop
    s += `<path class="mq-body" d="${limb(P.S, P.E1, SHAPE.ua, LEN.ua)}"/>` + mus('ua', 1, P.S, P.E1) + `<path class="mq-body" d="${limb(P.E1, P.W1, SHAPE.fa, LEN.fa)}"/>` + mus('fa', 1, P.E1, P.W1);
    const prop = handProp(P.E1, P.W1, false), hand = `<circle class="mq-body" cx="${f1(P.W1[0])}" cy="${f1(P.W1[1])}" r="3.6"/>`;
    s += rig.prop === 'dbv' ? prop + hand : hand + prop;
    if (rig.prop === 'band') s += `<line x1="${f1(P.W1[0])}" y1="${f1(P.W1[1])}" x2="${rig.bandTo[0]}" y2="${rig.bandTo[1]}" class="band"/>`;

    if (opts.overlay) {
      if (rig.spine !== false) { const ok = rig.spineOk ? rig.spineOk(q) : true; s += `<line x1="${f1(Hc[0])}" y1="${f1(Hc[1])}" x2="${f1(P.H[0])}" y2="${f1(P.H[1])}" class="mq-spine${ok ? ' ok' : ''}"/>`; }
      (rig.arcs || []).forEach(([a, c, b], i) => {
        const C0 = P[c], d1 = unit(C0, P[a]), d2 = unit(C0, P[b]), ang = Math.acos(Math.max(-1, Math.min(1, d1[0] * d2[0] + d1[1] * d2[1]))) / R, r = i ? 8 : 10;
        const s0 = add(C0, d1, r), s1 = add(C0, d2, r), sw = d1[0] * d2[1] - d1[1] * d2[0] > 0 ? 1 : 0, m = unit([0, 0], [d1[0] + d2[0] || 0.001, d1[1] + d2[1]]), tp = add(C0, m, r + 7);
        s += `<path class="mq-arc" d="M${f1(s0[0])},${f1(s0[1])} A${r},${r} 0 0 ${sw} ${f1(s1[0])},${f1(s1[1])}"/><text class="mq-deg" x="${f1(tp[0])}" y="${f1(tp[1] + 2)}" text-anchor="middle">${Math.round(ang)}°</text>`;
      });
      const vb = opts.vb || [-4, 10, 230, 172.5], K = Math.max(1, vb[2] / 230), right = vb[0] + vb[2] - 5 * K; let y = vb[1] + 5 * K;
      rig.cues.forEach(cu => {
        const c = ph.c, inside = (c >= cu.t[0] && c <= cu.t[1]) || (cu.t[1] > 1 && c <= cu.t[1] - 1) || (cu.t[0] < 0 && c >= cu.t[0] + 1);
        if (!inside) return;
        let prog = c >= cu.t[0] ? (c - cu.t[0]) / (cu.t[1] - cu.t[0]) : (c + 1 - cu.t[0]) / (cu.t[1] - cu.t[0]); if (cu.t[0] < 0 && c > 0.5) prog = (c - 1 - cu.t[0]) / (cu.t[1] - cu.t[0]);
        const a = opts.still ? 1 : Math.min(1, prog * 6, (1 - prog) * 6), w = (cu.text.length * 3.85 + 12) * K;
        s += `<g class="mq-cue" style="opacity:${Math.max(0, a).toFixed(2)}"><rect x="${f1(right - w)}" y="${f1(y)}" width="${f1(w)}" height="${f1(12 * K)}" rx="${f1(6 * K)}"/><text x="${f1(right - w / 2)}" y="${f1(y + 8.4 * K)}" text-anchor="middle" style="font-size:${f1(7 * K)}px">${cu.text}</text></g>`;
        y += 15 * K;
      });
    }
    return s;
  }

  // fit the viewBox to the whole movement (+ scenery), 4:3 for the sheet, square for thumbnails
  function fitBox(rig, small) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; const addPt = (p, r = 0) => { x0 = Math.min(x0, p[0] - r); y0 = Math.min(y0, p[1] - r); x1 = Math.max(x1, p[0] + r); y1 = Math.max(y1, p[1] + r); };
    for (let i = 0; i < 24; i++) { const P = pose(rig, phase(rig, i / 24).q); ['H', 'K1', 'A1', 'K2', 'A2', 'S', 'E1', 'W1', 'E2', 'W2'].forEach(k => addPt(P[k], 11)); addPt(add(P.S, dir(P.q.N), 30), 4); }
    if (rig.floor !== false) addPt([x0, FLOOR + 3]);
    ({ bench: [[40, 134]], couch: [[22, 118]], post: [[132, 88]], mat: [[8, 30], [208, 194]] }[rig.scene] || []).forEach(p => addPt(p));
    const pad = small ? 4 : 8; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    let w = x1 - x0, h = y1 - y0; const AR = small ? 1 : 4 / 3;
    if (!small && w < 230) { x0 -= (230 - w) / 2; w = 230; }
    if (w / h < AR) { const nw = h * AR; x0 -= (nw - w) / 2; w = nw; } else { const nh = w / AR; y0 -= (nh - h); h = nh; }
    return [x0, y0, w, h].map(v => Math.round(v * 10) / 10);
  }

  // ---------- mount + loop ----------
  const live = new Set(); let raf = null;
  function loop(ts) {
    live.forEach(d => { if (!d.g.isConnected) { live.delete(d); return; } d.g.innerHTML = render(d.rig, (ts - d.t0) / d.rig.period, d.opts); });
    raf = live.size ? requestAnimationFrame(loop) : null;
  }
  const DEFS = '<defs><linearGradient id="mqShade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--mq-hi)"/><stop offset="1" style="stop-color:var(--mq-lo)"/></linearGradient></defs>';
  function mount(container, ex) {
    const rig = RIGS[EX_RIG[ex.id]], small = container.classList.contains('ex-thumb'), vb = fitBox(rig, small);
    container.innerHTML = `<svg viewBox="${vb.join(' ')}" class="demo-svg mq" role="img" aria-label="Animated posture demo of ${ex.name}">${DEFS}<g></g></svg>`;
    const g = container.querySelector('g'), still = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const d = { g, rig, t0: performance.now() - rig.key * rig.period * (small ? 1 : 0), opts: { overlay: !small, still, vb, muscles: ex.primary || [] } };
    g.innerHTML = render(rig, small || still ? rig.key : 0, d.opts);
    if (still) return;
    live.add(d); if (!raf) raf = requestAnimationFrame(loop);
  }
  const fallback = WO.mountDemo;
  WO.mountDemo = (container, ex) => (ex && EX_RIG[ex.id] ? mount(container, ex) : fallback(container, ex));
  WO.MANNEQUIN = { RIGS, EX_RIG, render, fitBox, DEFS };
})();
