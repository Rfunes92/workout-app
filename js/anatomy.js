/* v26 Mount Up anatomical demo figure (Ronnie: "current mannequins look terrible, rebuild from scratch").
   A real 3-D figure seen in 3/4: ~90 muscle bellies (fusiform spindles + ellipsoid blocks) hung on a 3-D skeleton, each
   shaded by its own surface normal (Lambert, light from upper-left/front), with fibre strokes running origin -> insertion,
   a soft specular sheen and per-body-part silhouettes. Primary muscles turn bright red. Equipment is 3-D too (benches,
   barbells with plates, dumbbells, cable towers, machines). Original artwork generated from our own geometry; nothing
   is traced from any reference image.
   Motion: the joint choreography of every rig in mannequin.js (angles, IK, timing) is LIFTED into 3-D: side-view
   rigs become the sagittal plane (out-of-plane foreshortening k turns into a lateral component), front/back rigs become
   the frontal plane (k turns into depth). Hero lifts get hand-tuned 3-D overrides (grip width, elbow flare, camera,
   machines) in O3 below. World: x = the way the figure faces, y = up, z = toward the near side (camera side). */
(function () {
  'use strict';
  const WO = window.WO = window.WO || {};
  const M = WO.MANNEQUIN;
  if (!M) return;
  const R = Math.PI / 180, FLOOR = 182;
  const f1 = n => (Math.round(n * 10) / 10).toString();
  const A3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const S3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const K3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const D3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const X3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const L3 = a => Math.hypot(a[0], a[1], a[2]);
  const N3 = a => { const l = L3(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const ortho = (v, ax) => N3(S3(v, K3(ax, D3(v, ax))));
  const sum3 = (...vs) => vs.reduce((s, v) => A3(s, v), [0, 0, 0]);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const LEN = { thigh: 43, shank: 42, torso: 50, ua: 31, fa: 32 };
  const UP = [0, 1, 0];

  // ---------------- palette (inline colours: the demo looks the same in light + dark app themes) ----------------
  const PAL = {
    skin: { lo: [138, 144, 153], hi: [244, 245, 247], line: '#59606a' },
    red: { lo: [150, 24, 18], hi: [255, 112, 86], line: '#7c1611' },
    red2: { lo: [196, 104, 96], hi: [255, 196, 186], line: '#9a5a52' },
    cloth: { lo: [26, 28, 32], hi: [86, 91, 99], line: '#16181b' },
    hair: { lo: [40, 38, 38], hi: [104, 98, 94], line: '#222' },
    frame: { lo: [170, 176, 184], hi: [252, 252, 253], line: '#7d848e' },
    pad: { lo: [22, 24, 28], hi: [80, 85, 93], line: '#131518' },
    iron: { lo: [24, 26, 30], hi: [92, 97, 106], line: '#101114' },
    steel: { lo: [110, 116, 124], hi: [226, 229, 233], line: '#4c525b' },
    kb: { lo: [20, 22, 26], hi: [96, 100, 108], line: '#0d0e10' },
    rubber: { lo: [150, 34, 26], hi: [236, 96, 76], line: '#7c1611' }
  };
  const mix = (a, b, k) => 'rgb(' + [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * k)).join(',') + ')';
  const shadeCol = (pal, lam) => mix(PAL[pal].lo, PAL[pal].hi, clamp(lam, 0, 1));

  // ---------------- figure builds ----------------
  const FIGS = {
    male: { fem: false, hipZ: 8.6, shZ: 17, mk: 1, tk: 1 },
    female: { fem: true, hipZ: 9.0, shZ: 14.4, mk: 0.74, tk: 0.86 }
  };

  // ---------------- per-rig 3-D direction (hero lifts first) ----------------
  // cam: [yaw (deg the figure's front turns toward the camera), pitch (camera above)]; grip: |z| of the hands
  // (bar / handle width); stance: |z| of the ankles; elbow: extra pole direction for the arm IK [x, y, z-outward];
  // eq: 3-D equipment builder name. Everything else comes straight from the mannequin.js choreography.
  const O3 = {
    benchbar: { cam: [10, 38], wdown: 12, grip: 31, eq: 'flatbench', rack: true, elbow: [0, -0.6, 1], still: 0.45, flare: 0.6 },
    bench: { cam: [20, 20], eq: 'flatbench', wdown: 10, flare: 0.6 }, dbfly: { cam: [36, 28], eq: 'flatbench', wdown: 8 }, skull: { cam: [36, 28], eq: 'flatbench', grip: 7 },
    pushdown: { cam: [50, 8], grip: 6, eq: 'cabletower', elbow: [-1, -0.4, 0.3] },
    incpress: { cam: [40, 14], wdown: 5, eq: 'inclinebench', elbow: [0, -0.4, 1], still: 0.3, flare: 0.45 }, incbar: { cam: [40, 14], eq: 'inclinebench', grip: 24, rack: true },
    legext: { cam: [44, 12], eq: 'legext', still: 0.4, hands: 'seat' }, seatcurl: { cam: [44, 12], eq: 'legext', curl: true, hands: 'seat' },
    carry: { cam: [50, 8], dbAlong: 'fwd', still: 0, grip: 19 },
    bsquat: { cam: [54, 8], grip: 34, stance: 13, elbow: [-0.8, -1, 0.6], still: 0.3 },
    fsquat: { cam: [52, 8], grip: 16, stance: 12, still: 0.3 },
    srow: { cam: [45, 20], grip: 4, eq: 'lowrow', elbow: [-0.5, -1, 0.5], oy: 13 },
    ezcurl: { cam: [62, 6], grip: 12, elbow: [-1, -0.2, 0], still: 0.33, plate: 9 }, scurl: { cam: [50, 8], still: 0.33 }, hammer: { cam: [50, 8], dbAlong: 'fwd', still: 0.33 },
    cablecurl: { cam: [50, 8], grip: 6, eq: 'cabletower', still: 0.33 },
    rowbar: { cam: [30, 16], grip: 21, elbow: [-1, 0.6, 0.5], plate: 12 }, bentrow: { cam: [32, 16] },
    dbrow: { cam: [34, 16], eq: 'flatbenchBox', elbow: [-1, 0.6, 0.2] },
    pushupband: { cam: [35, 20], grip: 27, stance: 6, elbow: [-0.4, 0, 1], still: 0.1 }, pushupclose: { cam: [35, 20], grip: 14, stance: 6, still: 0.1 },
    ccrunch: { cam: [42, 10], eq: 'cabletower', rope: true, still: 0.5 }, swing: { cam: [44, 8], still: 0.02, grip: 4.5 }, goblet: { grip: 6.5, cam: [44, 8] }, ohext: { cap: 0.98 }, pallof: { grip: 4.5 }, rollout: { grip: 9 },
    wgs: { reach: true }, book: { reach: true }, disloc: { cap: 0.98 }, ytw: { cap: 0.98 },
    pushup: { cam: [35, 20], grip: 27, stance: 6, elbow: [-0.4, 0, 1], still: 0.1 },
    pulldown: { cam: [30, 10], cap: 0.975, grip: 31, eq: 'pulldown', elbow: [0, -0.3, 1], still: 0.33 }
  };


  // ---------------- lift the mannequin.js 2-D choreography into a 3-D skeleton ----------------
  const L2 = (p, z) => [p[0], FLOOR - p[1], z || 0];
  const oop = (L, l2) => Math.sqrt(Math.max(0, L * L - l2 * l2)); // out-of-plane component of a foreshortened segment
  function ik3(S, W, a, b, pole, cap) { // two-bone IK in 3-D -> [elbow, wrist]
    // joint limits: never fold tighter than ~34° inside the elbow / knee, never lock fully straight (soft 99.6% reach)
    const dmin = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(34 * R));
    const v = S3(W, S), d0 = L3(v) || 0.01, d = clamp(d0, dmin, (a + b) * (cap || 0.996)), u = K3(v, 1 / d0);
    const ca = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1), sa = Math.sqrt(1 - ca * ca);
    let p = S3(pole, K3(u, D3(pole, u))); if (L3(p) < 1e-4) p = ortho([0, -1, 0.01], u); p = N3(p);
    return [A3(A3(S, u, a * ca), p, a * sa), A3(S, u, d)];
  }
  // pushing lifts: g = +1 load pushed up (bench / overhead: elbow under the hand), -1 pushing down (push-up / dips: elbow over it)
  const PRESS = { benchbar: { g: 1, tuck: 3, out: 9, lying: 1 }, bench: { g: 1, tuck: 3, out: 8, lying: 1 }, incpress: { g: 1, tuck: 2, out: 11, lying: 1 }, incbar: { g: 1, tuck: 2, out: 11, lying: 1 },
    mpress: { g: 1, h: 1, tuck: 3, out: 7 }, press: { g: 1, tuck: 0, fwd: 6 }, pressbar: { g: 1, tuck: 0, fwd: 7 }, spress: { g: 1, tuck: 0, fwd: 5 }, spressdb: { g: 1, tuck: 0, fwd: 5 },
    arnold: { g: 1, tuck: 0, fwd: 7 }, presskb: { g: 1, tuck: 0, fwd: 7 }, pressband: { g: 1, tuck: 0, fwd: 6 },
    pushup: { g: -1, tuck: 0, out: 16 }, pushupband: { g: -1, tuck: 0, out: 16 }, pushupclose: { g: -1, tuck: 6, out: 2 }, dip: { g: -1, tuck: 0, fwd: -6, out: 6 }, benchdip: { g: -1, tuck: 0, fwd: -6, out: 4 } };
  const pressOf = (rig, o3) => o3.press || PRESS[rig._name] || null;
  function liftSide(rig, P, q, F, o3) {
    const hz = F.hipZ, sz = F.shZ, Hc = L2(P.H), Stop = L2(P.S);
    const up = N3(S3(Stop, Hc)), lat = [0, 0, 1];
    const sk = { Hc, up, latP: lat, latC: lat, B: q.B || 0, side: true };
    const tl = L3(S3(Stop, Hc)); sk.tl = tl;
    sk.Sc = A3(Stop, up, -1.5);
    [['n', '1', 1], ['f', '2', -1]].forEach(([s, i, sg]) => {
      const H = A3(Hc, lat, hz * sg), K2 = P['K' + i], A2 = P['A' + i];
      const kz = hz + oop(LEN.thigh, Math.hypot(K2[0] - P.H[0], K2[1] - P.H[1])) * 0.9;
      let az = kz + oop(LEN.shank, Math.hypot(A2[0] - K2[0], A2[1] - K2[1])) * 0.9;
      if (o3.stance) az = Math.max(az, o3.stance);
      sk['H' + s] = H; sk['K' + s] = L2(K2, (kz * 0.6 + az * 0.4) * sg + 0.6 * sg); sk['A' + s] = L2(A2, az * sg);
      sk['T' + s] = L2(P['F' + i], (az + 2.2) * sg);
      const Sh = A3(A3(Stop, up, -2.6), lat, sz * sg); sk['S' + s] = Sh;
      const E2 = P['E' + i], W2 = P['W' + i];
      const ez = sz + oop(LEN.ua, Math.hypot(E2[0] - P.S[0], E2[1] - P.S[1])) * (o3.flare != null ? o3.flare : 0.85);
      const wz = ez + oop(LEN.fa, Math.hypot(W2[0] - E2[0], W2[1] - E2[1])) * 0.6 - 2.5;
      let E = L2(E2, ez * sg), W = L2(W2, Math.max(wz, sz - 6) * sg);
      // the 2-D shoulder sat on the torso top; re-solve the arm from the real 3-D shoulder so lengths stay true
      let tgt = W; if (o3.grip != null) tgt = [W[0], W[1], o3.grip * sg];
      if (tgt[1] < 1.2) tgt = [tgt[0], 1.2, tgt[2]]; // hands rest ON the floor, never through it
      if (rig.prop === 'bar' && (rig.propAt === 'back' || rig.propAt === 'front')) { const fw = N3(X3(up, lat)), bc = rig.propAt === 'back' ? sum3(Stop, K3(fw, -5.5), K3(up, 1.5)) : sum3(Stop, K3(fw, 8), K3(up, -0.5)); tgt = A3(bc, [0, -3.6, (o3.grip || 24) * sg]); }
      if (o3.wdown) tgt = A3(tgt, up, -o3.wdown);
      if (o3.hands === 'seat') tgt = sum3(Hc, K3(sk.fwdP0 || [1, 0, 0], 3), [0, -4, (F.hipZ + 8) * sg]);
      let pole = A3(S3(E, Sh), o3.elbow ? [o3.elbow[0] * 8, o3.elbow[1] * 8, o3.elbow[2] * 8 * sg] : [0, 0, 3 * sg]);
      const PR = pressOf(rig, o3);
      if (PR) { // pressing: the elbow stacks under the load (forearm vertical), tucked ~45-60° toward the hips, not flared to a T
        const fw = N3(X3(up, lat)), eStar = sum3(tgt, PR.h ? K3(fw, -LEN.fa) : [0, -PR.g * LEN.fa, 0], K3(up, -PR.tuck), K3(fw, PR.fwd || 0), [0, 0, (PR.out || 0) * sg]);
        pole = S3(eStar, Sh);
      }
      if (o3.reach && sg > 0) { // rotation reach (world's greatest / open book): the top arm sweeps floor -> side -> ceiling
        // in the frontal plane as one long straight lever, instead of a 2-D side arm folding at the elbow mid-arc
        const ph = clamp(((q.u1 != null ? q.u1 : 0) + 10) / 190, 0, 1) * Math.PI, dir = N3([0.15 * Math.sin(ph), -Math.cos(ph), Math.sin(ph) * 1.1]);
        tgt = A3(Sh, dir, (LEN.ua + LEN.fa) * 0.993); pole = sum3(K3(up, 3), [0, 0, 0]);
      }
      [E, W] = ik3(Sh, tgt, LEN.ua, LEN.fa, pole, o3.cap);
      // scapula: the shoulder girdle rides up as the arm goes overhead (and slightly forward on a reach) - no fixed ball joint
      const ua0 = N3(S3(E, Sh)), elev = sstep(0.1, 0.95, D3(ua0, up)) * 3.2, prot = sstep(0.4, 0.95, D3(ua0, N3(X3(up, lat)))) * 1.6 * (PR && PR.g > 0 && !PR.lying ? 0 : 1);
      if (elev + prot > 0.05) { const Sh2 = sum3(Sh, K3(up, elev), K3(N3(X3(up, lat)), prot)); sk['S' + s] = Sh2; [E, W] = ik3(Sh2, tgt, LEN.ua, LEN.fa, pole, o3.cap); }
      sk['E' + s] = E; sk['W' + s] = W;
    });
    sk.Hd = L2(P.Hd); sk.N0 = A3(Stop, up, 1); sk.P2 = P;
    return sk;
  }
  function liftFront(rig, P, q, F, o3) {
    const back = rig.view === 'back', cx = P.P[0], zs = back ? 1 : -1;
    const Z = p => (p[0] - cx) * zs, Y = p => FLOOR - p[1];
    const kT = q.kT || 1, lean = rig === M.RIGS.rtwist || /twist/.test(rig._name || '') ? -1 : 1;
    const Hc = [0, Y(P.P), 0];
    const N0 = [48 * Math.sqrt(Math.max(0, 1 - kT * kT)) * lean, Y(P.N0), Z(P.N0)];
    const up = N3(S3(N0, Hc));
    const sk = { Hc, up, side: false, tl: L3(S3(N0, Hc)) };
    const zL = Z(P.SL), zR = Z(P.SR), half = Math.abs(zL - zR) / 2, sw = F.shZ, tw = q.tw || 0;
    const dep = Math.sqrt(Math.max(0, sw * sw - half * half)) * Math.sign(tw) * (back ? -1 : 1);
    sk.latP = [0, 0, 1];
    sk.latC = N3([-dep * 2, 0, zL - zR]);
    sk.Sc = A3(N0, up, -1.5);
    const map = { n: 'L', f: 'R' };
    ['n', 'f'].forEach(s => {
      const k = map[s], sg = s === 'n' ? 1 : -1;
      const H = [0, Y(P['H' + k]), Z(P['H' + k])];
      const Kp = P['K' + k], Ap = P['A' + k];
      const kx = H[0] + oop(LEN.thigh, Math.hypot(Kp[0] - P['H' + k][0], Kp[1] - P['H' + k][1]));
      const ax = kx + oop(LEN.shank, Math.hypot(Ap[0] - Kp[0], Ap[1] - Kp[1]));
      sk['H' + s] = A3(Hc, [0, 0, 1], F.hipZ * sg); sk['H' + s][1] = H[1];
      sk['K' + s] = [kx, Y(Kp), Z(Kp)]; sk['A' + s] = [ax, Y(Ap), Z(Ap)];
      sk['T' + s] = A3(sk['A' + s], [1, 0, 0.12 * sg], 17); sk['T' + s][1] = Math.min(sk['A' + s][1], FLOOR - 176 + 2.5);
      const Sp = P['S' + k];
      const Sh = A3(A3(sk.Sc, up, -3), sk.latC, sw * sg);
      sk['S' + s] = Sh;
      const Ep = P['E' + k], Wp = P['W' + k];
      const ex = Sh[0] + oop(LEN.ua, Math.hypot(Ep[0] - Sp[0], Ep[1] - Sp[1])) * (back && rig.armsBehind ? 1 : 1);
      const wx = ex + oop(LEN.fa, Math.hypot(Wp[0] - Ep[0], Wp[1] - Ep[1]));
      let E = [ex, Y(Ep), Z(Ep)], W = [wx, Y(Wp), Z(Wp)];
      if (o3.grip != null) W[2] = o3.grip * sg;
      [E, W] = ik3(Sh, W, LEN.ua, LEN.fa, A3(S3(E, Sh), [-2.5, -2, 3 * sg]), o3.cap);
      sk['E' + s] = E; sk['W' + s] = W;
    });
    sk.Hd = [N0[0] + (Y(P.Hd) - N0[1]) * 0 + sk.up[0] * 15, Y(P.Hd), Z(P.Hd)];
    sk.N0 = N0; sk.P2 = P; sk.cx = cx; sk.zs = zs;
    return sk;
  }
  // frames
  function finishSkeleton(sk, o3) {
    if (o3 && o3.oy) Object.keys(sk).forEach(k => { const v = sk[k]; if (Array.isArray(v) && v.length === 3 && /^(H|K|A|T|S|E|W|N)/.test(k)) sk[k] = [v[0], v[1] + o3.oy, v[2]]; });
    sk.fwdP = N3(X3(sk.up, sk.latP));
    // chest frame: spine curve B rounds (or arches) the upper back around the lateral axis
    const b = (sk.B || 0) * 0.7 * R, f0 = N3(X3(sk.up, sk.latC));
    sk.upC = N3(A3(K3(sk.up, Math.cos(b)), f0, Math.sin(b)));
    sk.fwdC = N3(X3(sk.upC, sk.latC));
    // head frame
    const hu = N3(S3(sk.Hd, sk.N0)); sk.hu = hu;
    sk.hl = ortho(sk.latC, hu); sk.hf = N3(X3(hu, sk.hl));
    return sk;
  }

  // ---------------- body model ----------------
  // primitives: ell {c, ax:[a,b,c] semi-axis vectors, n}, spn {p:[A,C,B] (quadratic Bezier axis), r, pk, te, n}
  function buildBody(sk, F, mus, mus2, o3) {
    const out = [], fem = F.fem, mk = F.mk, tk = F.tk;
    const isRed = g => g && mus.indexOf(g) >= 0, isRed2 = g => g && mus2.indexOf(g) >= 0;
    const colFor = (g, base) => (isRed(g) ? 'red' : isRed2(g) ? 'red2' : base || 'skin');
    const tlen = sk.tl / 50;
    // torso point: u along spine (0 pelvis/hip line -> 50 shoulder line), f forward, l lateral; blends pelvis/chest frames
    const TP = (u, f, l) => {
      const w = sstep(16, 34, u);
      const pP = sum3(sk.Hc, K3(sk.up, u * tlen), K3(sk.fwdP, f), K3(sk.latP, l));
      const top = A3(sk.Hc, sk.up, 50 * tlen);
      const pC = sum3(top, K3(sk.upC, (u - 50) * tlen), K3(sk.fwdC, f), K3(sk.latC, l));
      return lerp3(pP, pC, w);
    };
    const TN = (u, f, l) => { const w = sstep(16, 34, u); return N3(sum3(K3(lerp3(sk.up, sk.upC, w), 0), K3(lerp3(sk.fwdP, sk.fwdC, w), f), K3(lerp3(sk.latP, sk.latC, w), l))); };
    const TAX = (u, ru, rf, rl) => { const w = sstep(16, 34, u); return [K3(N3(lerp3(sk.latP, sk.latC, w)), rl), K3(N3(lerp3(sk.up, sk.upC, w)), ru), K3(N3(lerp3(sk.fwdP, sk.fwdC, w)), rf)]; };
    const push = (o) => { out.push(o); return o; };
    const ell = (grp, g, c, ax, n, col, extra) => push(Object.assign({ k: 'ell', grp, g, c, ax, n, col: colFor(g, col) }, extra || {}));
    const spn = (grp, g, A, C, B, r, n, o) => push(Object.assign({ k: 'spn', grp, g, p: [A, C || lerp3(A, B, 0.5), B], r, n, col: colFor(g, o && o.col), pk: 0.5, te: 0.3, fib: 4 }, o || {}));
    // limb frame from joint J0 to J1, hinge axis h (front = h x axis), side sg (+1 near / -1 far)
    // limb frame; a child segment (forearm / shank) whose axis swings close to the hinge borrows its parent's front so the
    // frame never flips (belly would jump to the other side of the bone)
    const limbF = (J0, J1, h, sg, par) => { const a = N3(S3(J1, J0)), v = X3(h, a), c = L3(v);
      const fr = par ? N3(A3(v, ortho(par.fr, a), Math.max(0, 0.55 - c) * 2)) : N3(v), ou = K3(X3(a, fr), sg); return { o: J0, a, fr, ou, L: L3(S3(J1, J0)) }; };
    const LP = (fr, t, f, o) => sum3(fr.o, K3(fr.a, t * fr.L), K3(fr.fr, f), K3(fr.ou, o));
    const LN = (fr, f, o) => N3(A3(K3(fr.fr, f), fr.ou, o));
    // hinge axes blend continuously (no threshold switches -> no muscle bellies flipping sides between frames)
    // straight-limb hinge = the lateral axis parallel-transported from a 'relaxed, slightly forward-down' limb direction b
    // to the limb's actual direction: exact for every sagittal move, smooth for abduction, singular only for a limb pointing
    // straight back-and-up (which no exercise uses) - so the limb frame never flips mid-rep
    const transp = (v, b, c) => { const k = X3(b, c), d = D3(b, c); if (d < -0.999) return v; return N3(sum3(K3(v, d), X3(k, v), K3(k, D3(k, v) / (1 + d)))); };
    const hingeArm = (S, E, W, sg) => {
      const ua = N3(S3(E, S)), fa = N3(S3(W, E));
      // rest hinge: the lateral axis for sagittal arm moves, rotating to (arm x forward) as the arm abducts toward the side
      // arms: transport from 'out-and-down', so the only singular direction is up-and-across the head (never used, not even
      // by band dislocates / overhead work); the base hinge is pre-rotated so a hanging arm still hinges on the lateral axis
      const dn = K3(sk.upC, -1), bA = N3(A3(K3(sk.upC, -0.55), sk.latC, 0.85 * sg));
      const h0 = transp(transp(sk.latC, dn, bA), bA, ua);
      const hb = X3(ua, fa), m = L3(hb); if (m < 1e-4) return h0;
      // rotate (not lerp) the rest hinge toward the real bend hinge about the upper-arm axis: the forearm rolls at a steady
      // rate as the elbow bends, never snapping through a near-zero blend
const hn = K3(hb, 1 / m), w = sstep(0.03, 0.45, m);
      return N3(lerp3(h0, hn, w));
    };
    const hingeLeg = (H, K, A) => {
      const th = N3(S3(K, H)), sh = N3(S3(A, K));
      const h0 = transp(sk.latP, N3(A3(K3(sk.fwdP, 0.3), sk.up, -0.95)), th);
      const hb = X3(sh, th), m = L3(hb); if (m < 1e-4) return h0;
      const hn = K3(hb, 1 / m), w = sstep(0.1, 0.45, m) * sstep(-0.15, 0.35, D3(hn, sk.latP));
      return N3(lerp3(h0, hn, w));
    };

    // ---- torso core ----
    const T = 'torso';
    ell(T, null, TP(1.5, -0.5, 0), TAX(1.5, 10.5, 10.5 * tk, 13.8 * (fem ? 1.14 : 1)), null);
    ell(T, null, TP(17, -0.4, 0), TAX(17, 11.5, 8.6 * tk, (fem ? 10.8 : 11.4)), null);
    ell(T, null, TP(34.5, -0.2, 0), TAX(34.5, 15.5, 11.6 * tk, 15.4 * (fem ? 0.86 : 1)), null);
    // neck
    const neckTop = A3(A3(sk.Hd, sk.hu, -7.5), sk.hf, -0.8);
    spn('neck', null, TP(45, -0.8, 0), lerp3(TP(45, -0.8, 0), neckTop, 0.5), neckTop, fem ? 4.7 : 6.0, sk.hf, { te: 0.92, fib: 0, pk: 0.4, depthBias: -40, core: true });
    const sides = [1, -1];
    sides.forEach(sg => {
      const s = sg > 0 ? 'n' : 'f';
      const Sh = sk['S' + s], E = sk['E' + s], W = sk['W' + s], H = sk['H' + s], K = sk['K' + s], A = sk['A' + s], Tt = sk['T' + s];
      const hA = hingeArm(Sh, E, W, sg), UAf = limbF(Sh, E, hA, sg), FAf = limbF(E, W, hA, sg, UAf);
      sk['UAf' + s] = UAf; sk['FAf' + s] = FAf; // kept on the skeleton so tools/audit_motion3d.js can check arm roll
      const hL = hingeLeg(H, K, A), THf = limbF(H, K, hL, sg), SHf = limbF(K, A, hL, sg, THf);
      const UA = (t, f, o) => LP(UAf, t, f, o), FA = (t, f, o) => LP(FAf, t, f, o), TH = (t, f, o) => LP(THf, t, f, o), SH = (t, f, o) => LP(SHf, t, f, o);
      const ua = 'ua' + s, fa = 'fa' + s, th = 'th' + s, sh = 'sh' + s;
      const tl_ = sg; // lateral sign for torso
      // ---- torso muscles ----
      const pk = mk * (fem ? 0.8 : 1);
      // pecs (fan: clavicular, sternal, costal heads -> humerus)
      if (!fem) {
        const I = UA(0.17, 1.6, -0.6), ax = O => [O, A3(lerp3(O, I, 0.45), TN(38, 1, 0.25 * tl_), 3.2 * pk), I];
        spn(T, 'chest', ...ax(TP(38.5, 11.4, 1.6 * tl_)), 5.6 * pk, TN(37, 1, 0.3 * tl_), { pk: 0.4, te: 0.3, fib: 6, fan: [ax(TP(45, 7.6, 5.2 * tl_)), ax(TP(31, 10.6, 3.6 * tl_))], fr: 4.6 * pk });
      } else {
        [[TP(44, 7, 5 * tl_), 3.4], [TP(37, 10, 2 * tl_), 3.8]].forEach(([O, r]) => { const I = UA(0.16, 1.4, -0.6); spn(T, 'chest', O, A3(lerp3(O, I, 0.45), TN(38, 1, 0.3 * tl_), 2.5), I, r, TN(38, 1, 0.3 * tl_), { pk: 0.4, fib: 4 }); });
      }
      // serratus
      for (let i = 0; i < 3; i++) spn(T, 'obliques', TP(25 + i * 3.6, 6.8, 11.6 * tl_), null, TP(29.5 + i * 3.6, 2.5, 13.2 * tl_), 1.9 * pk + 0.2, TN(30, 0.7, 0.75 * tl_), { fib: 2, te: 0.45 });
      // obliques
      spn(T, 'obliques', TP(29, 6, 11.4 * tl_), TP(19, 7.4, 13.4 * tl_ * (fem ? 0.92 : 1)), TP(8.5, 4.5, 12.8 * tl_ * (fem ? 1.05 : 1)), 4.6 * pk + 0.6, TN(18, 0.55, 0.85 * tl_), { pk: 0.5, fib: 5 });
      // abs: 3 blocks + lower
      [[27.5, 9.4, 2.5], [22, 8.9, 2.8], [16.5, 8.6, 2.9], [10.5, 8.2, 3.1]].forEach(([u, f, ru], i) => ell(T, 'abs', TP(u, f - 0.4, 3.4 * tl_), TAX(u, ru, 1.4, 3.3 * (fem ? 0.9 : 1)), TN(u, 1, 0.1 * tl_)));
      ell(T, 'abs', TP(4.5, 7.6, 2.8 * tl_), TAX(4.5, 4.2, 1.6, 2.6), TN(5, 1, 0.1 * tl_));
      // traps (upper) neck -> acromion
      const nk = lerp3(sum3(sk.Hd, K3(sk.hu, -8.5), K3(sk.hf, -3.6), K3(sk.hl, 2.6 * sg)), TP(52, -3, 3 * tl_), 0.55);
      spn(T, 'traps', nk, A3(TP(50, -2.8, 9 * tl_), sk.upC, 1.8 * pk), TP(47, -1.6, 15.2 * tl_ * (fem ? 0.88 : 1)), (fem ? 3.2 : 4.3), TN(48, -0.3, 0.4 * tl_).map((v, i) => v + sk.upC[i] * 0.8), { pk: 0.35, fib: 5 });
      // mid / lower traps, rhomboid-infraspinatus block, teres
      spn(T, 'upper_back', TP(40, -10.2, 0.5 * tl_), null, TP(46, -6.4, 13 * tl_), 4.2 * pk, TN(42, -1, 0.15 * tl_), { fib: 5 });
      spn(T, 'upper_back', TP(26, -9.6, 0.6 * tl_), TP(34, -10.6, 5 * tl_), TP(42, -8.4, 9.4 * tl_), 3.8 * pk, TN(34, -1, 0.2 * tl_), { fib: 4 });
      ell(T, 'upper_back', TP(37.5, -9.8, 8.8 * tl_), TAX(37.5, 5.4, 2.6, 4.8 * pk), TN(37, -0.9, 0.35 * tl_));
      spn(T, 'upper_back', TP(32.5, -8.8, 11.2 * tl_), null, UA(0.2, -1.6, -0.6), 3.3 * pk, TN(33, -0.7, 0.7 * tl_), { fib: 3 });
      // lats (two fans)
      spn(T, 'lats', TP(13, -8.8, 4 * tl_), TP(28, -8.6, 13.4 * tl_), UA(0.15, -1.2, -1.2), 6.0 * pk, TN(26, -0.6, 0.8 * tl_), { pk: 0.55, fib: 6, fan: [[TP(9, -3.2, 11.6 * tl_), TP(25, -2.6, 15.2 * tl_ * (fem ? 0.9 : 1)), UA(0.13, -0.6, -0.4)]], fr: 5.0 * pk });
      // erectors
      spn(T, 'lower_back', TP(1.5, -9, 3 * tl_), TP(16, -11.4, 3.6 * tl_), TP(34, -11.4, 3.2 * tl_), 3.5 * pk, TN(16, -1, 0.1 * tl_), { pk: 0.32, fib: 4 });
      // glutes, glute med (abductors), hip flexor
      ell(T, 'glutes', TP(-3, -8.4, 7.2 * tl_), TAX(-3, 8.6, 6.6 * (fem ? 1.12 : 1), 7.6 * (fem ? 1.1 : 1)), TN(-3, -1, 0.35 * tl_), null, { under: 'shorts' });
      ell(T, 'abductors', TP(5.5, -2.5, 12.2 * tl_), TAX(5.5, 5, 4.6, 3.8), TN(5, -0.2, 1 * tl_), null, { under: 'shorts' });
      spn(th, 'hip_flexors', TP(9.5, 7, 7.2 * tl_), null, TH(0.16, 3.2, -2.2), 2.8, TN(6, 1, 0.3 * tl_), { fib: 3, under: 'shorts' });

      // ---- shoulder / arm ----
      ell(ua, null, A3(Sh, UAf.a, 1), [K3(UAf.a, 6), K3(UAf.fr, 5.2), K3(UAf.ou, 5.4)].map(v => K3(v, fem ? 0.85 : 1)), UAf.ou, null, { core: true });
      const dk = mk * (fem ? 0.82 : 1);
      spn(ua, 'front_delts', TP(47.5, 5.4, 12.6 * tl_ * (fem ? 0.88 : 1)), UA(0.1, 4.6 * dk, 2.6 * dk), UA(0.44, 2, 0.8), 5.4 * dk, LN(UAf, 1, 0.5), { pk: 0.36, fib: 5 });
      spn(ua, 'side_delts', TP(49, -0.4, 16.2 * tl_ * (fem ? 0.88 : 1)), UA(0.12, 0.2, 6.2 * dk), UA(0.46, 0.2, 2.4), 5.6 * dk, LN(UAf, 0.1, 1), { pk: 0.34, fib: 5 });
      spn(ua, 'rear_delts', TP(46, -7, 13 * tl_ * (fem ? 0.88 : 1)), UA(0.1, -4.6 * dk, 2.6 * dk), UA(0.43, -2, 0.6), 5.0 * dk, LN(UAf, -1, 0.5), { pk: 0.36, fib: 5 });
      // upper arm
      const ak = mk * (fem ? 0.78 : 1);
      spn(ua, null, UA(0.05, 0, 0), null, UA(0.98, 0, 0), 3.9 * (fem ? 0.82 : 1), UAf.ou, { te: 0.85, fib: 0, core: true });
      spn(ua, 'biceps', UA(0.14, 2.4, -0.2), UA(0.56, 5.6 * ak, 0), UA(0.93, 1.6, 0), 4.3 * ak, LN(UAf, 1, 0), { pk: 0.58, fib: 5 });
      spn(ua, 'biceps', UA(0.5, 0.6, 3.2 * ak), null, UA(0.96, 1.4, 1.6), 2.5 * ak, LN(UAf, 0.3, 1), { fib: 2 });
      spn(ua, 'triceps', UA(0.08, -2.4, -1), UA(0.46, -5.6 * ak, -1.4), UA(0.9, -2.2, 0), 4.2 * ak, LN(UAf, -1, -0.2), { pk: 0.45, fib: 5 });
      spn(ua, 'triceps', UA(0.14, -1.2, 2.6 * ak), UA(0.4, -3.6 * ak, 4.2 * ak), UA(0.76, -2.6, 1.4), 3.5 * ak, LN(UAf, -0.5, 1), { pk: 0.4, fib: 4 });
      // forearm + hand
      const fk = fem ? 0.8 : 1;
      spn(fa, null, FA(0.02, 0, 0), FA(0.4, 0.3, 0), FA(1, 0, 0), 3.0 * fk, FAf.ou, { te: 0.62, pk: 0.25, fib: 0, core: true });
      spn(fa, 'forearms', FA(-0.04, 1.6, 2.6 * fk), FA(0.24, 2.6 * fk, 3.6 * fk), FA(0.72, 0.6, 1.6), 3.6 * fk, LN(FAf, 0.4, 1), { pk: 0.26, fib: 4 });
      spn(fa, 'forearms', FA(0.0, 0.6, -2.6 * fk), FA(0.24, 2.4 * fk, -3 * fk), FA(0.78, 0.6, -1.2), 3.2 * fk, LN(FAf, 0.6, -1), { pk: 0.3, fib: 4 });
      spn(fa, 'forearms', FA(0.02, -2, 1), null, FA(0.82, -1.2, 0.4), 2.7 * fk, LN(FAf, -1, 0.3), { pk: 0.3, fib: 3 });
      const hc = FA(1.13, 0.2, 0);
      // hand (v26.2, Ronnie: "the mannequin has no hands"): palm + four fingers + thumb. The fingers curl around whatever the
      // hand holds (bar / dumbbell / handle / kettlebell = grip 1), hang relaxed when empty (grip ~.35), and blend - with the
      // same primitive count, so nothing pops - into a flat palm with straight fingers when the hand is planted on the floor.
      {
        const kf = sstep(13, 6, W[1]) * sstep(-0.2, -0.6, FAf.a[1]), g = o3.handGrip != null ? o3.handGrip : 0.35;
        const a = FAf.a, fr = FAf.fr, ou = FAf.ou, hk = fk * (fem ? 0.9 : 1);
        const hx = N3([sk.fwdP[0], 0, sk.fwdP[2] + 0.25 * sg]), hz = N3(X3(hx, UP)), fl = [0, -2.7, 0];
        const mp = (p, q) => lerp3(p, q, kf), mA = (A, B) => A.map((v, i) => lerp3(v, B[i], kf));
        const P = (u, f, o) => sum3(W, K3(a, u * hk), K3(fr, f * hk), K3(ou, o * hk));
        const Q = (x, z, y) => sum3(W, fl, K3(hx, x * hk), K3(hz, z * sg * hk), [0, (y || 0) * hk, 0]);
        // palm (back of the hand slightly domed)
        ell(fa, null, mp(P(2.7, -0.1, 0.2), Q(2.8, 0)), mA([K3(a, 3.1 * hk), K3(fr, 1.35 * hk), K3(ou, 2.75 * hk)], [K3(hx, 3.0 * hk), [0, 1.2 * hk, 0], K3(hz, 2.8 * hk)]), N3(lerp3(K3(fr, -1), UP, kf)), null, { hand: true, core: true });
        // fingers: index (thumb side) -> little finger
        [[1.55, 0.6, 0.98], [0.52, 0.66, 1.06], [-0.52, 0.63, 1.0], [-1.5, 0.52, 0.82]].forEach(([w, r, ln]) => {
          const ku = 5.3 - Math.abs(w) * 0.32;
          // fist: knuckles past the handle, the fingers hook ~180° round it and the tips come back to the palm
          const K0 = P(ku, -0.25, w), C0 = P(ku + (1.8 * ln) * (1 - g) + 1.15 * g, 0.2 + 1.55 * g, w * 0.97), T0 = P(ku + (3.2 * ln) * (1 - g) - 1.9 * g, 0.1 + 2.75 * g, w * 0.93);
          const K1 = Q(ku + 0.2, w), C1 = Q(ku + 1.8 * ln, w * 1.04, -0.15), T1 = Q(ku + 3.5 * ln, w * 1.1, -0.3);
          spn(fa, null, mp(K0, K1), mp(C0, C1), mp(T0, T1), r * hk, N3(lerp3(K3(fr, -1), UP, kf)), { fib: 0, te: 0.62, pk: 0.45, hand: true });
        });
        // thumb: wraps over the fingers on a grip, sits alongside when open, splays out when flat
        spn(fa, null, mp(P(1.4, 0.9, 1.9), Q(1.6, 2.4)), mp(P(2.9, 1.5 + 0.6 * g, 2.6 - 0.9 * g), Q(3.0, 3.6, -0.1)), mp(P(4.2 + 0.3 * g, 1.3 + 1.3 * g, 2.6 - 2.0 * g), Q(4.3, 4.4, -0.2)), 0.72 * hk, N3(lerp3(LN(FAf, 1, 0.5), UP, kf)), { fib: 0, te: 0.6, pk: 0.4, hand: true });
      }

      // ---- leg ----
      const lk = mk * (fem ? 0.95 : 1);
      spn(th, null, TH(0.02, 0, 0), TH(0.5, 0.5, 0), TH(0.98, 0, 0), 6.6 * (fem ? 0.98 : 1), THf.ou, { te: 0.7, fib: 0, core: true });
      spn(th, 'quads', TH(0.06, 4.6, 0.6), TH(0.5, 7.6 * lk, 0.4), TH(0.93, 3.8, 0), 4.7 * lk, LN(THf, 1, 0.1), { pk: 0.5, fib: 5 });
      spn(th, 'quads', TH(0.12, 1.2, 5.6), TH(0.5, 2.8 * lk, 9 * lk), TH(0.92, 2.4, 3), 5.5 * lk, LN(THf, 0.35, 1), { pk: 0.45, fib: 6 });
      spn(th, 'quads', TH(0.48, 2.4, -4.6), TH(0.83, 4.6 * lk, -6.8 * lk), TH(0.97, 2.6, -2.4), 4.6 * lk, LN(THf, 0.5, -1), { pk: 0.68, fib: 5 });
      spn(th, 'adductors', TH(0.0, 0.8, -5.2), TH(0.3, 0.2, -8.4 * lk), TH(0.62, -1, -5.2), 5 * lk, LN(THf, 0, -1), { pk: 0.3, fib: 5 });
      spn(th, null, TH(0.03, 5.2, 4.4), TH(0.5, 6.6 * lk, -5.2), TH(0.97, 0.4, -5.4), 1.6, LN(THf, 0.6, -0.4), { fib: 1, te: 0.8 });
      spn(th, 'hamstrings', TH(0.08, -4, 2.6), TH(0.5, -7.6 * lk, 3.8), TH(0.95, -3, 3.6), 4.6 * lk, LN(THf, -1, 0.35), { pk: 0.5, fib: 5 });
      spn(th, 'hamstrings', TH(0.08, -4.4, -2.2), TH(0.5, -7.6 * lk, -3.2), TH(0.95, -3, -3.6), 4.4 * lk, LN(THf, -1, -0.35), { pk: 0.5, fib: 5 });
      spn(th, 'abductors', TH(0.0, 2.6, 6.8), null, TH(0.28, 1.6, 7.4), 3.0, LN(THf, 0.2, 1), { fib: 3, under: 'shorts' });
      spn(th, null, TH(0.24, 0.6, 7.4), null, TH(0.9, 0.2, 5.6), 1.9, LN(THf, 0, 1), { fib: 1, te: 0.8 });
      ell(th, null, TH(1.0, 4.4, 0.2), [K3(THf.a, 2.9), K3(THf.fr, 1.9), K3(THf.ou, 2.6)], THf.fr);
      // shank
      spn(sh, null, SH(0.0, 0, 0), SH(0.4, -1, 0), SH(1.0, 0, 0), 4.7 * (fem ? 0.92 : 1), SHf.ou, { te: 0.58, pk: 0.3, fib: 0, core: true });
      spn(sh, 'calves', SH(0.0, -2.4, 3.0), SH(0.24, -5.2 * lk, 3.8), SH(0.58, -2.4, 1.4), 4.2 * lk, LN(SHf, -1, 0.6), { pk: 0.35, fib: 4 });
      spn(sh, 'calves', SH(0.0, -2.4, -3.0), SH(0.24, -5.4 * lk, -4.4), SH(0.62, -2.4, -1.6), 4.7 * lk, LN(SHf, -1, -0.6), { pk: 0.35, fib: 4 });
      spn(sh, 'calves', SH(0.3, -1.6, 0.4), SH(0.55, -3.6, 0), SH(0.86, -1.8, 0), 3.5 * lk, LN(SHf, -0.6, 0.2), { pk: 0.5, fib: 3 });
      spn(sh, null, SH(0.08, 2.4, 2.2), SH(0.35, 3.6, 2.7), SH(0.8, 1.6, 0.8), 2.5 * lk, LN(SHf, 1, 0.5), { pk: 0.35, fib: 3 });
      // foot (bare): heel -> toes
      const fd = ortho(S3(Tt, A), [0, 1, 0]); const flen = L3(S3(Tt, A));
      const heel = sum3(A, K3(fd, -3.2), [0, -2.2, 0]), toe = A3(Tt, [0, 1, 0], -1.4);
      spn(sh, null, heel, A3(lerp3(heel, toe, 0.38), [0, 1, 0], 2.6), toe, 3.4 * (fem ? 0.9 : 1), N3(A3(UP, X3(fd, UP), sg * 0.4)), { pk: 0.3, te: 0.62, fib: 2, foot: true, depthBias: -0.4 });
      ell(sh, null, A3(A, [0, -0.6, 0]), [K3(fd, 2.8), [0, 2.6, 0], K3(X3(fd, UP), 2.7)], UP, null, { core: true });
      void flen;

      // ---- clothing ----
      // shorts: pelvis shell + leg sleeves to mid-thigh (drawn after the muscles of the same body part)
      spn(th, null, TH(-0.04, 0.4, 0.6), TH(0.18, 0.8, 0.8), TH(fem ? 0.3 : 0.4, 0.6, 0.6), (fem ? 7.2 : 7.5), THf.ou, { col: 'cloth', te: 0.95, pk: 0.3, fib: 0, layer: 2, cloth: true });
      if (fem) {
        // sports top straps
        spn(T, null, TP(44, 8.4, 6.4 * tl_), A3(TP(51, 0, 9 * tl_), sk.upC, 2), TP(43, -9.6, 6.8 * tl_), 1.4, TN(49, 0, 0.3 * tl_), { col: 'cloth', fib: 0, te: 1, layer: 2, cloth: true });
        ell(T, null, TP(36.5, 9.4, 5.6 * tl_), TAX(36.5, 5.4, 4.6, 5.4), TN(36, 1, 0.35 * tl_), 'cloth', { layer: 2, cloth: true });
      }
      void H; void ua; void fa;
    });
    // shorts pelvis shell + sports top band
    ell(T, null, TP(3, -0.4, 0), TAX(3, 8.6, 10.2 * tk, (fem ? 15.4 : 13.8)), null, 'cloth', { layer: 2, cloth: true });
    [1, -1].forEach(sg => ell(T, null, TP(-0.5, -1.6, 6.6 * sg * (fem ? 1.08 : 1)), TAX(-0.5, 9.6, 10 * tk * (fem ? 1.06 : 1), 8.4 * (fem ? 1.08 : 1)), TN(0, -0.3, sg), 'cloth', { layer: 2, cloth: true }));
    if (fem) ell(T, null, TP(36, 0, 0), TAX(36, 7.8, 12.4 * tk, 13.9), null, 'cloth', { layer: 2, cloth: true });

    // ---- head ----
    const Hh = 'head', hd = sk.Hd, hu = sk.hu, hf = sk.hf, hl = sk.hl;
    const HP = (u, f, l) => sum3(hd, K3(hu, u), K3(hf, f), K3(hl, l));
    const hs = fem ? 0.95 : 1;
    sk.skull = { c: HP(1, 0, 0), r: [7.7 * hs, 9.9 * hs, 8.9 * hs] };
    ell(Hh, null, HP(1, 0, 0), [K3(hl, 7.7 * hs), K3(hu, 9.9 * hs), K3(hf, 8.9 * hs)], null, null, { skull: true, core: true });
    ell(Hh, null, HP(-5.0, 1.7, 0), [K3(hl, (fem ? 5.1 : 5.7)), K3(hu, 4.9), K3(hf, 6.5 * hs)], hf, null, { jaw: true, core: true });
    [1, -1].forEach(sg => ell(Hh, null, HP(-0.6, -0.4, 7.2 * sg * hs), [K3(hl, 1.2), K3(hu, 2.9), K3(hf, 1.9)], K3(hl, sg), null, { ear: true, core: true }));
    return out;
  }

  // ---------------- equipment (3-D) ----------------
  function buildEquip(rig, sk, o3, name) {
    const out = [], P = (...a) => a;
    const box = (c, h, col, extra) => out.push(Object.assign({ k: 'box', c, h, col }, extra || {})); // h = half extents [x,y,z]
    const tube = (a, b, r, col, extra) => out.push(Object.assign({ k: 'tube', a, b, r, col }, extra || {}));
    const disc = (c, ax, r, th, col, extra) => out.push(Object.assign({ k: 'disc', c, ax, r, th, col }, extra || {}));
    const cable = (a, b) => out.push({ k: 'line', a, b, w: 0.7, stroke: '#3d434b' });
    const Wn = sk.Wn, Wf = sk.Wf, mid = lerp3(Wn, Wf, 0.5);
    // grip point = inside the curled fingers (just in front of the palm), so bars / handles / bells sit IN the hand
    const g0 = o3.handGrip != null ? o3.handGrip : 0.35, hk0 = (WO.getFigure && WO.getFigure() === 'female') ? 0.9 : 1;
    const handOff = (W, E, s2) => { const F = sk['FAf' + s2], a = N3(S3(W, E)); return F ? sum3(W, K3(a, 4.3 * hk0), K3(F.fr, 1.35 * g0 * hk0)) : A3(W, a, 4.3); };
    const Hn = handOff(sk.Wn, sk.En, 'n'), Hf = handOff(sk.Wf, sk.Ef, 'f'), Hm = lerp3(Hn, Hf, 0.5);
    const fy = FLOOR - FLOOR; // floor y = 0
    const eq = o3.eq;
    const legsUnder = (x0, x1, top, zw) => { [x0 + 6, x1 - 6].forEach(x => { tube([x, top, 0], [x, fy + 1.5, 0], 1.5, 'frame', { back: true }); tube([x, fy + 1.2, -zw], [x, fy + 1.2, zw], 1.4, 'frame', { back: true }); }); };
    if (eq === 'flatbench' || eq === 'flatbenchBox') {
      let x0 = 40, x1 = 134, top = FLOOR - 134;
      if (eq === 'flatbenchBox' && rig.box) { x0 = rig.box[0]; x1 = rig.box[1]; top = FLOOR - rig.box[2]; }
      box([(x0 + x1) / 2, top - 3.2, 0], [(x1 - x0) / 2, 3.2, 11], 'pad', { back: true });
      tube([x0 + 4, top - 7.5, 0], [x1 - 4, top - 7.5, 0], 2.2, 'frame', { back: true });
      legsUnder(x0, x1, top - 8, 13);
      if (o3.rack) { [-1, 1].forEach(sg => { const z = 36 * sg; tube([x0 + 4, fy, z], [x0 + 4, top + 50, z], 2.1, 'frame', { back: sg < 0 }); tube([x0 + 4, top + 34, z], [x0 + 12, top + 34, z], 1.4, 'frame', { back: sg < 0 }); tube([x0 - 6, fy + 1.2, z], [x0 + 16, fy + 1.2, z], 1.6, 'frame', { back: true }); }); }
    } else if (eq === 'inclinebench') {
      const H = sk.Hc, b = N3(A3(K3(sk.up, 0), sk.fwdP, -1)), a = A3(A3(H, sk.fwdP, -13), sk.up, -4), c = A3(a, sk.up, 54);
      // back pad (box along the torso, behind it)
      const mid0 = lerp3(a, c, 0.5); out.push({ k: 'obox', c: mid0, ax: [K3(sk.up, 29), K3(sk.fwdP, 3.4), [0, 0, 11]], col: 'pad', back: true });
      box([H[0] + 3, H[1] - 12.5, 0], [17, 3.2, 12], 'pad', { back: true });
      tube([H[0], H[1] - 16, 0], [H[0], fy + 1, 0], 2.2, 'frame', { back: true });
      tube([H[0] - 20, fy + 1.2, 0], [H[0] + 26, fy + 1.2, 0], 1.8, 'frame', { back: true });
      tube(A3(c, sk.fwdP, -4), [c[0] - 22, fy + 1, 0], 2, 'frame', { back: true });
      [-1, 1].forEach(sg => tube([H[0] - 20, fy + 1.2, 12 * sg], [H[0] + 26, fy + 1.2, 12 * sg], 1.4, 'frame', { back: true }));
      void b;
    } else if (eq === 'legext') {
      const H = sk.Hc, K = lerp3(sk.Kn, sk.Kf, 0.5), A = lerp3(sk.An, sk.Af, 0.5);
      box([H[0] + 6, H[1] - 12.5, 0], [21, 3.4, 13], 'pad', { back: true });
      out.push({ k: 'obox', c: A3(A3(H, sk.up, 24), sk.fwdP, -13), ax: [K3(sk.up, 22), K3(sk.fwdP, 3.4), [0, 0, 12]], col: 'pad', back: true });
      tube([H[0] + 4, H[1] - 16, 0], [H[0] + 4, fy + 1, 0], 2.6, 'frame', { back: true });
      tube([H[0] - 22, fy + 1.4, 0], [K[0] + 10, fy + 1.4, 0], 2, 'frame', { back: true });
      tube([H[0] - 16, fy + 1, -16], [H[0] - 16, H[1] + 34, -16], 2.4, 'frame', { back: true });
      // pivot arm + roller pad on the shins
      const dsh = N3(S3(A, K)), nrm = N3(X3([0, 0, 1], dsh)), roller = A3(A3(A, dsh, -4), nrm, o3.curl ? -6 : 6);
      const piv = [K[0], K[1], -17];
      tube(piv, [roller[0], roller[1], -17], 1.6, 'frame', { back: true });
      tube([roller[0], roller[1], -17], [roller[0], roller[1], 17], 1.2, 'steel', {});
      disc([K[0], K[1], -18], [0, 0, 1], 4, 2, 'frame', { back: true });
      [-1, 1].forEach(sg => tube([roller[0], roller[1], 3 * sg], [roller[0], roller[1], 14 * sg], 4.2, 'pad', { cap: true }));
      [-1, 1].forEach(sg => tube([H[0] + 4, H[1] - 6, 16 * sg], [H[0] + 14, H[1] - 6, 16 * sg], 1.4, 'frame', { back: sg < 0 }));
    } else if (eq === 'cabletower' || eq === 'lowrow' || eq === 'pulldown') {
      // weight-stack column: two uprights, top beam, stack
      let tx, ty0, ty1, tz = -6, pullY;
      const line = (rig.lines || [])[0];
      const anc = line && typeof line[1] !== 'string' ? L2(line[1]) : [Hm[0] + 30, 175, 0];
      if (eq === 'cabletower') { tx = rig.tower != null ? rig.tower + (rig.tower > Hm[0] ? 2 : -2) : Math.max(anc[0] + 12, Hm[0] + 22); pullY = anc[1]; }
      if (eq === 'lowrow') { tx = anc[0] + 4; pullY = anc[1]; }
      if (eq === 'pulldown') { tx = Math.max(sk.Kn[0], sk.Kf[0]) + 16; pullY = anc[1]; }
      ty0 = 0; ty1 = Math.max(pullY + 8, 176);
      [-1, 1].forEach(sg => tube([tx, ty0, tz + 9 * sg], [tx, ty1, tz + 9 * sg], 2.2, 'frame', { back: true }));
      tube([tx, ty1, tz - 11], [tx, ty1, tz + 11], 2.2, 'frame', { back: true });
      box([tx, 22, tz], [5, 21, 6.5], 'iron', { back: true });
      tube([tx - 14, 1.4, tz - 13], [tx + 14, 1.4, tz - 13], 1.8, 'frame', { back: true }); tube([tx - 14, 1.4, tz + 13], [tx + 14, 1.4, tz + 13], 1.8, 'frame', { back: true });
      if (eq === 'cabletower') {
        const pul = [anc[0], pullY, 0];
        if (Math.abs(pul[0] - tx) > 1) tube([pul[0], ty1, 0], [tx, ty1, 0], 2, 'frame', { back: true });
        disc(pul, [0, 0, 1], 3.2, 1.6, 'frame', { back: true });
        const src = line && line[0], end = src === 'A1' ? sk.An : src === 'A2' ? sk.Af : Hm;
        if (o3.rope) { // rope attachment: two tails from the pulley clip to each hand
          const clip = lerp3(pul, Hm, 0.82); cable(pul, clip); [Hn, Hf].forEach(h => out.push({ k: 'line', a: clip, b: h, w: 1.5, stroke: '#3a3f47' }));
        } else { cable(pul, end); if (end === Hm && rig.prop === 'handle') tube(A3(Hm, [0, 0, 1], -(o3.grip || 6) - 3), A3(Hm, [0, 0, 1], (o3.grip || 6) + 3), 1.3, 'steel', { front: true }); }
        if (end !== Hm) { tube(A3(end, [0, 0, 1], -3), A3(end, [0, 0, 1], 3), 2.4, 'pad', {}); }
      }
      if (eq === 'lowrow') {
        const pul = [tx - 4, pullY, 0]; disc(pul, [0, 0, 1], 3.2, 1.6, 'frame', { back: true });
        cable(pul, Hm);
        // seat rail + seat + foot plate
        const H = sk.Hc; box([H[0] + 2, H[1] - 12, 0], [16, 3, 11], 'pad', { back: true });
        tube([H[0] - 26, 7, 0], [tx, 7, 0], 2.4, 'frame', { back: true }); tube([H[0], H[1] - 15, 0], [H[0], 7, 0], 2, 'frame', { back: true });
        const A = lerp3(sk.An, sk.Af, 0.5);
        out.push({ k: 'obox', c: [A[0] + 6, A[1] + 3, 0], ax: [[1.6, 0, 0], [0, 9, 0], [0, 0, 13]], col: 'frame', back: true });
        tube([A[0] + 6, 7, 0], [A[0] + 6, A[1] - 6, 0], 1.6, 'frame', { back: true });
        // V-handle
        tube(A3(Hn, [1, 0, 0], 1), A3(Hm, [1, 0, 0], 7), 1.2, 'steel', { front: true }); tube(A3(Hf, [1, 0, 0], 1), A3(Hm, [1, 0, 0], 7), 1.2, 'steel', {});
      }
      if (eq === 'pulldown') {
        const H = sk.Hc, top = [tx, ty1 + 6, 0];
        // top beam runs from the stack (in front of the knees) back over the lifter's head to the pulley
        const px = sk.Hd[0] + 9;
        tube([tx, ty1, 0], [px - 2, ty1 + 6, 0], 2.2, 'frame', { back: true });
        disc([px, ty1 + 4, 0], [0, 0, 1], 3, 1.6, 'frame', { back: true });
        cable([px, ty1 + 2, 0], Hm);
        box([H[0] + 4, H[1] - 12.5, 0], [15, 3.2, 12], 'pad', { back: true });
        tube([H[0] + 2, H[1] - 16, 0], [H[0] + 2, 1.4, 0], 2.2, 'frame', { back: true });
        tube([H[0] - 10, 1.4, 0], [tx, 1.4, 0], 2, 'frame', { back: true });
        // knee pads over the thighs
        const K = lerp3(sk.Kn, sk.Kf, 0.5); [-1, 1].forEach(sg => tube([K[0] - 4, K[1] + 7, 4 * sg], [K[0] - 4, K[1] + 7, 15 * sg], 3.4, 'pad', { cap: true, front: sg > 0 }));
        tube([K[0] - 4, K[1] + 7, -2], [tx, K[1] + 7, -2], 1.4, 'frame', { back: true });
        // lat bar with angled ends
        const bz = 34, bend = 6;
        tube([Hm[0], Hm[1], -bz + 6], [Hm[0], Hm[1], bz - 6], 1.2, 'steel', { front: true });
        [-1, 1].forEach(sg => tube([Hm[0], Hm[1], (bz - 6) * sg], [Hm[0], Hm[1] - bend, bz * sg], 1.2, 'steel', { front: sg > 0 }));
        void top;
      }
    }
    // ---- generic 3-D scenery from the mannequin.js scene names (only where no hand-built hero rig exists) ----
    const oy = o3.oy || 0, P2 = sk.P2 || {};
    const m2 = (p, z) => (rig.view ? [0, FLOOR - p[1] + oy, (p[0] - sk.cx) * sk.zs] : [p[0], FLOOR - p[1] + oy, z || 0]);
    const post = (x, z, top, r) => tube([x, fy, z], [x, top, z], r || 2, 'frame', { back: z <= 0 });
    const scene = eq ? null : rig.scene;
    const upT = sk.up, fwT = sk.fwdP, H0 = sk.Hc;
    const seatUnder = (w, d) => { box([H0[0] + 2, H0[1] - 12.5, 0], [d || 15, 3.2, w || 12], 'pad', { back: true }); post(H0[0] + 2, 0, H0[1] - 16, 2.2); tube([H0[0] - 18, fy + 1.2, 0], [H0[0] + 22, fy + 1.2, 0], 1.8, 'frame', { back: true }); };
    const backPad = (len, off) => out.push({ k: 'obox', c: sum3(H0, K3(upT, len * 0.55), K3(fwT, -(off || 11))), ax: [K3(upT, len * 0.55), K3(fwT, 3.2), [0, 0, 11]], col: 'pad', back: true });
    if (scene === 'bar' && rig.bar) {
      const [x0, x1, by] = rig.bar;
      if (name === 'dip') { [-1, 1].forEach(sg => { const z = (Math.abs(Hn[2]) + 0.5) * sg; tube(m2([x0 - 10, by + 2], z), m2([x1 + 6, by + 2], z), 1.8, 'steel', { back: sg < 0, front: sg > 0 }); post(x1 - 2, z, FLOOR - by - 2 + oy, 2); post(x0 - 6, z, FLOOR - by - 2 + oy, 2); }); }
      else { const bx = Hm[0], yb = Hm[1] + 1.2; tube([bx, yb, -44], [bx, yb, 44], 1.5, 'steel', { split: true }); [-1, 1].forEach(sg => { post(bx, 44 * sg, yb, 2.2); tube([bx - 18, fy + 1, 44 * sg], [bx + 18, fy + 1, 44 * sg], 1.6, 'frame', { back: sg < 0 }); }); }
    } else if (scene === 'lowbar' && rig.bar) {
      const c = m2(rig.bar); tube([c[0], c[1], -40], [c[0], c[1], 40], 1.5, 'steel', { split: true }); [-1, 1].forEach(sg => post(c[0], 40 * sg, c[1], 2));
    } else if (scene === 'box' && rig.box) {
      const [x0, x1, top, kind] = rig.box, yT = FLOOR - top + oy;
      if (kind === 'box') box([(x0 + x1) / 2, yT / 2, 0], [(x1 - x0) / 2, yT / 2, 14], 'pad', { back: true });
      else { box([(x0 + x1) / 2, yT - 3.2, 0], [(x1 - x0) / 2, 3.2, 11], 'pad', { back: true }); legsUnder(x0, x1, yT - 6.5, 13); }
    } else if (scene === 'bench') {
      box([87, FLOOR - 134 - 3.2 + oy, 0], [47, 3.2, 11], 'pad', { back: true }); legsUnder(40, 134, FLOOR - 134 - 6.5 + oy, 13);
    } else if (scene === 'incline' || scene === 'machine') {
      seatUnder(12, 17); backPad(52, 12); post(H0[0] - 16, -10, H0[1] + 30, 2);
    } else if (scene === 'pad') { // chest-supported row: incline pad in front of the torso
      const c = sum3(H0, K3(upT, 24), K3(fwT, 13));
      out.push({ k: 'obox', c, ax: [K3(upT, 22), K3(fwT, 3.2), [0, 0, 11]], col: 'pad', back: true });
      tube(sum3(c, K3(upT, -10), K3(fwT, 3)), [c[0] + 6, fy + 1, 0], 2.2, 'frame', { back: true }); tube([c[0] - 18, fy + 1.2, 0], [c[0] + 26, fy + 1.2, 0], 1.8, 'frame', { back: true });
    } else if (scene === 'tower' || scene === 'towers') {
      const ls = rig.lines || [];
      ls.forEach(([from, anc]) => { if (typeof anc === 'string') return;
        const pul = m2(anc), tx = rig.view ? pul : [rig.tower != null ? rig.tower : anc[0], pul[1], -4];
        const colX = rig.view ? pul[0] - 4 : tx[0], colZ = rig.view ? pul[2] : -4;
        [-1, 1].forEach(sg => tube([colX, fy, colZ + 7 * sg], [colX, 186, colZ + 7 * sg], 2, 'frame', { back: true }));
        tube([colX, 186, colZ - 9], [colX, 186, colZ + 9], 2, 'frame', { back: true }); box([colX, 22, colZ], [5, 21, 6], 'iron', { back: true });
        disc(pul, rig.view ? [1, 0, 0] : [0, 0, 1], 3, 1.6, 'frame', { back: true });
        const end = { W1: Hn, W2: Hf, WL: Hn, WR: Hf, A1: sk.An, A2: sk.Af }[from] || Hn; cable(pul, end);
        if (/^A/.test(from)) tube(A3(end, [0, 0, 1], -3), A3(end, [0, 0, 1], 3), 2.4, 'pad', {}); });
    } else if (scene === 'column') { // pec deck / reverse pec deck: seat + back pad + machine column behind
      const behind = rig.view === 'back' ? 1 : -1;
      box([H0[0] - 2 * behind, H0[1] - 12.5, 0], [12, 3.2, 15], 'pad', { back: true }); post(H0[0], 0, H0[1] - 16, 2.2);
      out.push({ k: 'obox', c: sum3(H0, K3(upT, 26), K3([1, 0, 0], 11 * behind)), ax: [K3(upT, 22), [3, 0, 0], [0, 0, 12]], col: 'pad', back: rig.view !== 'back' });
      [-1, 1].forEach(sg => tube([H0[0] + 20 * behind, fy, 20 * sg], [H0[0] + 20 * behind, 178, 20 * sg], 2.4, 'frame', { back: true }));
      tube([H0[0] + 20 * behind, 178, -20], [H0[0] + 20 * behind, 178, 20], 2.4, 'frame', { back: true });
    } else if (scene === 'seatF') {
      box([H0[0] - 2, H0[1] - 12, 0], [14, 3.4, 18], 'pad', { back: true }); post(H0[0] - 2, 0, H0[1] - 15, 2.4);
      out.push({ k: 'obox', c: sum3(H0, K3(upT, 22), [-12, 0, 0]), ax: [K3(upT, 20), [3, 0, 0], [0, 0, 12]], col: 'pad', back: true });
      [sk.Kn, sk.Kf].forEach((K, i) => out.push({ k: 'obox', c: A3(K, [0, 0, 1], (i ? -6 : 6)), ax: [[6, 0, 0], [0, 5, 0], [0, 0, 1.6]], col: 'pad', front: !i }));
    } else if (scene === 'legpress') {
      backPad(46, 12); box([H0[0] + 2, H0[1] - 11, 0], [17, 3, 13], 'pad', { back: true }); post(H0[0], 0, H0[1] - 14, 2.4);
      const A = lerp3(sk.An, sk.Af, 0.5), pd = N3(m2([Math.cos(-125 * R) + 100, 100 + Math.sin(-125 * R)]).map((v, i) => v - m2([100, 100])[i])), pc = A3(A3(A, [1, 0, 0], 3), pd, 0);
      out.push({ k: 'obox', c: A3(pc, N3(S3(A, sk.Kn)), 3.5), ax: [K3(N3(X3(N3(S3(A, sk.Kn)), [0, 0, 1])), 15), K3(N3(S3(A, sk.Kn)), 1.6), [0, 0, 18]], col: 'frame', front: true });
      tube([H0[0] + 26, 2, -18], [pc[0] + 26, pc[1] + 26, -18], 2, 'frame', { back: true }); tube([H0[0] + 26, 2, 18], [pc[0] + 26, pc[1] + 26, 18], 2, 'frame', {});
    } else if (scene === 'hack') {
      backPad(56, 11); const A = lerp3(sk.An, sk.Af, 0.5);
      out.push({ k: 'obox', c: [A[0] + 4, A[1] - 2.5, 0], ax: [[17, 1.8, 0], [0, 1.6, 0], [0, 0, 18]], col: 'frame', back: true });
      [-1, 1].forEach(sg => tube(sum3(H0, K3(upT, 60), K3(fwT, -14), [0, 0, 14 * sg]), [A[0] - 26, fy + 1, 14 * sg], 2, 'frame', { back: sg < 0 }));
    } else if (scene === 'hyper') {
      const pad = A3(sk.Hc, sk.fwdP, 4); box([pad[0], pad[1] - 9, 0], [9, 4, 12], 'pad', { back: true });
      tube([pad[0], pad[1] - 13, 0], [pad[0] - 34, 1, 0], 2.4, 'frame', { back: true });
      const A = lerp3(sk.An, sk.Af, 0.5); tube([A[0] + 2, A[1] - 4, -11], [A[0] + 2, A[1] - 4, 11], 3, 'pad', { cap: true });
      tube([A[0] + 2, A[1] - 4, -2], [pad[0] - 30, 14, -2], 1.8, 'frame', { back: true }); tube([pad[0] - 44, 1.2, 0], [A[0] + 14, 1.2, 0], 1.8, 'frame', { back: true });
    } else if (scene === 'smith') {
      const x = Hm[0]; [-1, 1].forEach(sg => tube([x - 3, fy, 52 * sg], [x - 3, 196, 52 * sg], 1.8, 'frame', { back: sg < 0 })); tube([x - 3, 196, -52], [x - 3, 196, 52], 1.8, 'frame', { back: true });
    } else if (scene === 'post') {
      const x = rig.postX || 132, y = rig.postY || 88; post(x + 2.5, -2, FLOOR - y + oy, 2.6);
    } else if (scene === 'couch') {
      box([43.5, 32, -2], [21.5, 32, 22], 'pad', { back: true }); box([71, 3, -2], [13, 3, 16], 'pad', { back: true });
    } else if (scene === 'roller' && rig.roller) {
      const [x, y, r] = rig.roller; disc(m2([x, y]), [0, 0, 1], r, 30, 'rubber', { back: true });
    } else if (scene === 'ball') {
      out.push({ k: 'ball', c: m2([P2.A1[0] + 4, P2.A1[1] + 15]), r: 15, col: 'rubber', back: true });
    } else if (scene === 'bag') {
      cable(m2([186, 0]), m2([186, 24])); out.push({ k: 'obox', c: m2([186, 76]), ax: [[14, 0, 0], [0, 52, 0], [0, 0, 14]], col: 'rubber', back: true });
    } else if (scene === 'stairs') {
      [[120, 166], [144, 150], [168, 134]].forEach(([x, y]) => box([x + 36, (FLOOR - y) / 2 + oy, 0], [36 - (x - 120) / 2, (FLOOR - y) / 2, 16], 'frame', { back: true }));
    } else if (scene === 'treadmill') {
      out.push({ k: 'obox', c: m2([103, 175]), ax: [[73, 4, 0], [0, 2.4, 0], [0, 0, 16]], col: 'pad', back: true });
      [-1, 1].forEach(sg => tube(m2([162, 172], 15 * sg), m2([170, 74], 15 * sg), 1.6, 'frame', { back: sg < 0 })); tube(m2([170, 74], -15), m2([170, 74], 15), 3, 'pad', { back: true });
    } else if (scene === 'bike') {
      [[[86, 112], [108, 158]], [[108, 158], [150, 98]], [[60, 180], [160, 180]], [[108, 158], [108, 180]]].forEach(([a, b]) => tube(m2(a, -3), m2(b, -3), 2, 'frame', { back: true }));
      box(m2([86, 108]), [9, 1.8, 5], 'pad', { back: true }); tube(m2([150, 96], -12), m2([150, 96], 12), 1.5, 'steel', {}); disc(m2([108, 158], -6), [0, 0, 1], 17, 3, 'iron', { back: true });
    } else if (scene === 'rower') {
      tube(m2([40, 172]), m2([196, 172]), 2.2, 'frame', { back: true }); disc(m2([204, 150]), [0, 0, 1], 16, 8, 'iron', { back: true });
      box(m2([P2.H ? P2.H[0] : 100, 168]), [9, 2.6, 10], 'pad', { back: true }); [60, 190].forEach(x => tube(m2([x, 172]), m2([x, FLOOR]), 1.6, 'frame', { back: true }));
      cable(m2([196, 150]), Hm); tube(A3(Hm, [0, 0, 1], -9), A3(Hm, [0, 0, 1], 9), 1.3, 'steel', { front: true });
    }
    // ---- free weights ----
    const prop = rig.prop;
    const dumbbell = (W, E, along, near) => {
      const s2 = W === sk.Wn ? 'n' : 'f', c = s2 === 'n' ? Hn : Hf, Fr = sk['FAf' + s2];
      // the handle runs across the palm (through the curled fingers)
      const ax = along === 'fwd' ? sk.fwdP : along === 'fa' ? N3(X3(N3(S3(W, E)), sk.latC)) : Fr ? Fr.ou : [0, 0, 1];
      tube(A3(c, ax, -7), A3(c, ax, 7), 1.1, 'steel', { front: near });
      [-1, 1].forEach(sg => disc(A3(c, ax, 7.6 * sg), ax, 4.6, 4.2, 'iron', { front: near, hex: true }));
    };
    if (prop === 'db2' || prop === 'db1') {
      const along = o3.dbAlong || 'z';
      dumbbell(sk.Wn, sk.En, along, true); if (prop === 'db2') dumbbell(sk.Wf, sk.Ef, along, false);
    } else if (prop === 'bar') {
      let c;
      if (rig.propAt === 'back') c = sum3(sk.Sc, K3(sk.fwdC, -5.5), K3(sk.upC, 3));
      else if (rig.propAt === 'front') c = sum3(sk.Sc, K3(sk.fwdC, 8), K3(sk.upC, 1));
      else if (rig.propAt === 'hips') c = A3(sk.Hc, sk.fwdP, 9);
      else c = [Hm[0], Hm[1], 0];
      if (rig.propAt === 'back' || rig.propAt === 'front') c = [c[0], (Hn[1] + Hf[1]) / 2 + 0.5, 0];
      const pr = (o3.plate || rig.plate || 13) * 1.32, half = 64;
      tube([c[0], c[1], -half], [c[0], c[1], half], 1.15, 'steel', { split: true });
      [-1, 1].forEach(sg => {
        disc([c[0], c[1], 43 * sg], [0, 0, 1], 2.4, 2, 'steel', {});
        disc([c[0], c[1], 47.5 * sg], [0, 0, 1], pr, 6.6, 'iron', { plate: true });
      });
    } else if (prop === 'handle' && !eq && scene !== 'rower') {
      if (L3(S3(Hn, Hf)) > 22) [[Hn, sk.En], [Hf, sk.Ef]].forEach(([h, e], i) => { const ax = N3(X3(N3(S3(h, e)), sk.fwdP)); tube(A3(h, ax, -4), A3(h, ax, 4), 1.2, 'steel', { front: !i }); });
      else tube(A3(Hm, [0, 0, 1], -(o3.grip || 6) - 3), A3(Hm, [0, 0, 1], (o3.grip || 6) + 3), 1.2, 'steel', { front: true });
    }
    // kettlebell: a cast-iron ball under a thick D-handle, gripped in the palm
    const kettlebell = (h, hang, near, rack) => {
      const d = N3(hang), side = N3(X3(d, Math.abs(d[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1]));
      const c = A3(h, d, rack ? 6.2 : 8.6);
      [-1, 1].forEach(sg => tube(A3(h, side, 3.6 * sg), A3(A3(h, side, 3.2 * sg), d, 4.2), 1.25, 'kb', { front: near }));
      tube(A3(h, side, -3.6), A3(h, side, 3.6), 1.25, 'kb', { front: near });
      out.push({ k: 'ball', c, r: 6.6, col: 'kb', front: near });
    };
    const faDir = s2 => N3(S3(sk['W' + s2], sk['E' + s2]));
    if (prop === 'kb') kettlebell(Hm, A3(lerp3(faDir('n'), faDir('f'), 0.5), [0, -0.4, 0]), true);
    else if (prop === 'kb1') kettlebell(Hn, [0, -1, 0], true);
    else if (prop === 'kbrack') { const back = ortho(K3(sk.fwdP, -1), faDir('n')); kettlebell(Hn, A3(K3(back, 1), faDir('n'), -0.25), true, true); }
    else if (prop === 'dbv' || prop === 'dbo') { // one dumbbell held vertically: goblet at the chest / overhead triceps extension
      const d = prop === 'dbv' ? [0, -1, 0] : lerp3(faDir('n'), faDir('f'), 0.5), top = A3(Hm, N3(d), -1.5);
      tube(top, A3(top, N3(d), 13), 1.1, 'steel', { front: true }); disc(top, N3(d), 4.8, 4.2, 'iron', { front: true, hex: true }); disc(A3(top, N3(d), 14), N3(d), 4.8, 4.2, 'iron', { front: true, hex: true });
    } else if (prop === 'dbfeet') {
      const A = lerp3(sk.An, sk.Af, 0.5); tube([A[0], A[1], -7], [A[0], A[1], 7], 1.1, 'steel', {}); [-1, 1].forEach(sg => disc([A[0], A[1], 7.6 * sg], [0, 0, 1], 4.6, 4.2, 'iron', { hex: true }));
    } else if (prop === 'stick' || prop === 'none' && /band/.test(name + (rig.lines || []).map(l => l[2]).join(''))) {
      if (prop === 'stick') tube(A3(Hn, N3(S3(Hn, Hf)), 6), A3(Hf, N3(S3(Hf, Hn)), 6), 0.9, 'rubber', { front: true });
    } else if (prop === 'band') {
      tube(A3(Hm, [0, 0, 1], -5), A3(Hm, [0, 0, 1], 5), 1.4, 'rubber', { front: true });
    } else if (prop === 'bandback') {
      const bk = sum3(sk.Sc, K3(sk.fwdC, -9), K3(sk.upC, -3)); [Hn, Hf].forEach(h => out.push({ k: 'line', a: h, b: bk, w: 1.6, stroke: '#d4493a' }));
    } else if (prop === 'kneeband') {
      out.push({ k: 'line', a: A3(sk.Kn, [0, 0, 1], 5), b: A3(sk.Kf, [0, 0, 1], -5), w: 2.2, stroke: '#d4493a' });
    } else if (prop === 'wheel') {
      disc(A3(Hm, [0, -1, 0], 3), [0, 0, 1], 7, 4, 'rubber', { front: true }); tube(A3(Hm, [0, 0, 1], -9), A3(Hm, [0, 0, 1], 9), 1.2, 'steel', { front: true });
    } else if (prop === 'rope') {
      const low = A3(lerp3(sk.An, sk.Af, 0.5), [0, -1, 0], 1); [Hn, Hf].forEach(h => out.push({ k: 'line', a: h, b: low, w: 0.8, stroke: '#3d434b' }));
    } else if (prop === 'pads') {
      [['n', 1], ['f', -1]].forEach(([s2, sg]) => { const E = sk['E' + s2], W = sk['W' + s2]; out.push({ k: 'obox', c: lerp3(E, W, 0.5), ax: [K3(faDir(s2), 8), [0, 0, 1.4 * sg], [2.6, 0, 0]], col: 'pad', front: sg > 0 }); });
    }
    // generic cables / bands from the rig
    if ((!eq || eq === 'flatbench' || eq === 'inclinebench' || eq === 'legext' || eq === 'flatbenchBox') && scene !== 'tower' && scene !== 'towers') (rig.lines || []).forEach(([a, b, kind]) => {
      const pt = e => { if (typeof e !== 'string') return L2(e); const m = { W1: Hn, W2: Hf, A1: sk.An, A2: sk.Af, F1: sk.Tn, F2: sk.Tf, WL: Hn, WR: Hf, AL: sk.An, AR: sk.Af }; return m[e]; };
      const A = pt(a), B = pt(b); if (!A || !B) return;
      out.push({ k: 'line', a: A, b: B, w: kind === 'cable' ? 0.7 : 1.6, stroke: kind === 'cable' ? '#3d434b' : '#d4493a' });
      if (kind === 'cable' && typeof b !== 'string') disc(B, [0, 0, 1], 3, 1.5, 'frame', { back: true });
    });
    void P; void name; void Wn; void Wf; void mid;
    return out;
  }

  // ---------------- camera + rasterise to SVG ----------------
  function camera(yaw, pitch) {
    const ca = Math.cos(yaw * R), sa = Math.sin(yaw * R), cp = Math.cos(pitch * R), sp = Math.sin(pitch * R);
    const rot = v => { const x1 = v[0] * ca - v[2] * sa, z1 = v[0] * sa + v[2] * ca; return [x1, v[1] * cp - z1 * sp, z1 * cp + v[1] * sp]; };
    const pr = p => { const r = rot(p); return [r[0], -r[1], r[2]]; }; // screen x, screen y (down), depth (toward viewer)
    const view = N3([sa * cp, sp, ca * cp]); // world vector toward the camera
    const light = N3(A3(A3(K3(view, 0.75), [0, 1, 0], 0.55), [ -ca, 0, sa ], 0.45)); // upper-left-front key light
    return { pr, view, light, rot };
  }
  const ellipse2 = (cam, c, ax) => { // orthographic projection of an ellipsoid -> [cx, cy, rx, ry, angleDeg]
    const p = cam.pr(c), v = ax.map(a => { const r = cam.rot(a); return [r[0], -r[1]]; });
    let a = 0, b = 0, d = 0; v.forEach(([x, y]) => { a += x * x; b += x * y; d += y * y; });
    const tr = (a + d) / 2, det = Math.sqrt(Math.max(0, ((a - d) / 2) ** 2 + b * b)), l1 = tr + det, l2 = Math.max(0.0001, tr - det);
    const ang = Math.abs(b) < 1e-9 ? (a >= d ? 0 : 90) : Math.atan2(l1 - a, b) / R;
    return [p[0], p[1], Math.sqrt(l1), Math.sqrt(l2), ang, p[2]];
  };
  const bez = (p, t) => { const [A, C, B] = p, u = 1 - t; return [0, 1, 2].map(i => u * u * A[i] + 2 * u * t * C[i] + t * t * B[i]); };
  function hull(pts) {
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  const polyD = pts => { if (!pts.length) return ''; let s = 'M' + f1(pts[0][0]) + ',' + f1(pts[0][1]); for (let i = 1; i < pts.length; i++) s += 'L' + f1(pts[i][0]) + ',' + f1(pts[i][1]); return s + 'Z'; };
  // smooth closed path through hull points (drops near-duplicates, Catmull-Rom)
  function smoothD(pts) { // closed curve through hull points: quadratic B-spline (midpoints on curve), decimated
    const q = []; pts.forEach(p => { const l = q[q.length - 1]; if (!l || Math.hypot(p[0] - l[0], p[1] - l[1]) > 1.1) q.push(p); });
    if (q.length > 3 && Math.hypot(q[0][0] - q[q.length - 1][0], q[0][1] - q[q.length - 1][1]) < 1.1) q.pop();
    if (q.length < 3) return polyD(pts);
    const n = q.length, mid = i => { const a = q[i % n], b = q[(i + 1) % n]; return f1((a[0] + b[0]) / 2) + ',' + f1((a[1] + b[1]) / 2); };
    let s = 'M' + mid(0);
    for (let i = 1; i <= n; i++) s += 'Q' + f1(q[i % n][0]) + ',' + f1(q[i % n][1]) + ' ' + mid(i);
    return s + 'Z';
  }
  const prof = (o, t) => { const pk = o.pk, x = t < pk ? t / pk : (1 - t) / (1 - pk); const s = Math.sin(clamp(x, 0, 1) * Math.PI / 2); return o.te + (1 - o.te) * Math.pow(s, 0.75); };
  function spindle2(cam, o) { // -> { h (hull pts), cs (main axis circles), all [cs...], depth }
    const N = 9, axes = [o.p].concat(o.fan || []), all = []; let dep = 0, nd = 0;
    const pts = [];
    axes.forEach((ax, j) => { const cs = [];
      for (let i = 0; i <= N; i++) { const t = i / N, p = bez(ax, t), sp = cam.pr(p), r = (j ? (o.fr || o.r) : o.r) * prof(o, t); cs.push([sp[0], sp[1], r]); if (!j) { dep += sp[2]; nd++; } }
      cs.forEach(([x, y, r]) => { for (let k = 0; k < 12; k++) { const a = k / 12 * 2 * Math.PI; pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]); } });
      all.push(cs); });
    return { h: hull(pts), cs: all[0], all, depth: dep / nd };
  }
  function ellPts(e, k = 1, dx = 0, dy = 0, n = 20) { const [cx, cy, rx, ry, an] = e, ca = Math.cos(an * R), sa = Math.sin(an * R), o = [];
    for (let i = 0; i < n; i++) { const t = i / n * 2 * Math.PI, x = rx * k * Math.cos(t), y = ry * k * Math.sin(t); o.push([cx + dx + x * ca - y * sa, cy + dy + x * sa + y * ca]); } return o; }

  // per-rig 3-D direction + automatic floor fix: rigs drawn without a floor (hanging, dips) are lifted so feet never sink
  function o3For(rig) {
    if (rig._o3) return rig._o3;
    const o = Object.assign({}, O3[rig._name] || {});
    if (!rig.view && o.oy == null) { let lo = -1e9; for (let i = 0; i < 16; i++) { const P = M.pose(rig, M.phase(rig, i / 16).q); ['A1', 'A2', 'F1', 'F2'].forEach(k => { if (P[k]) lo = Math.max(lo, P[k][1]); }); }
      if (lo > FLOOR - 1) o.oy = lo - FLOOR + 3; }
    if (rig.view && o.oy == null) { let lo = -1e9; for (let i = 0; i < 16; i++) { const P = M.pose(rig, M.phase(rig, i / 16).q); ['AL', 'AR'].forEach(k => { if (P[k]) lo = Math.max(lo, P[k][1]); }); }
      if (lo > FLOOR - 6) o.oy = lo - FLOOR + 7.5; }
    if (o.handGrip == null) { const pr = rig.prop, sc = rig.scene;
      o.handGrip = (pr && !/^(none|kneeband|dbfeet|bandback|pads)$/.test(pr)) || /^(bar|lowbar|rower|bike|towers|treadmill|hyper)$/.test(sc || '') || o.eq === 'pulldown' || o.eq === 'lowrow' ? 1 : 0.35; }
    return (rig._o3 = o);
  }
  let UID = 0;
  function render3(ex, rig, t, opts) {
    opts = opts || {};
    const F = FIGS[WO.getFigure ? WO.getFigure() : 'male'] || FIGS.male;
    const o3 = o3For(rig);
    const ph = M.phase(rig, t); if (opts.mod) Object.assign(ph.q, opts.mod(ph.q));
    const P = M.pose(rig, ph.q), q = P.q;
    const sk = finishSkeleton(rig.view ? liftFront(rig, P, q, F, o3) : liftSide(rig, P, q, F, o3), o3);
    const key = M.phase(rig, rig.key).idx, inten = opts.still ? 1 : Math.max(0.55, 1 - Math.min(1, Math.abs(ph.idx - key)) * 0.45);
    const cam = camera(...(opts.cam || o3.cam || (rig.view ? [28, 8] : [48, 9])));
    const mus = (opts.muscles || []).slice(), mus2 = (opts.muscles2 || []).filter(m => mus.indexOf(m) < 0);
    const body = buildBody(sk, F, mus, mus2, o3), eq = buildEquip(rig, sk, o3, rig._name);
    const uid = 'a' + (++UID);
    // group anchors (painter's order between body parts)
    const anchors = { torso: lerp3(sk.Hc, sk.Sc, 0.5), head: sk.Hd, neck: sk.Hd };
    ['n', 'f'].forEach(s => { anchors['ua' + s] = lerp3(sk['S' + s], sk['E' + s], 0.5); anchors['fa' + s] = lerp3(sk['E' + s], sk['W' + s], 0.55); anchors['th' + s] = lerp3(sk['H' + s], sk['K' + s], 0.55); anchors['sh' + s] = lerp3(sk['K' + s], sk['A' + s], 0.5); });
    const gd = {}; Object.keys(anchors).forEach(g => { gd[g] = cam.pr(anchors[g])[2]; });
    // forearms holding something in front of the face/torso read better on top: tiny bias toward the viewer for near limbs
    const fk = D3(sk.fwdP, cam.view); gd.uan += 1.5 * fk; gd.fan += 2.5 * fk; gd.thn += 0.5; gd.shn += 0.8; gd.uaf -= 1.5 * Math.abs(fk); gd.faf -= 1 * Math.abs(fk); gd.head += 0.5; gd.neck = Math.min(gd.head, gd.torso + 4) - 0.2;
    const items = [];
    body.forEach(o => {
      const nrm = o.n ? cam.rot(N3(o.n)) : [0, 0, 1];
      const facing = o.n ? D3(N3(o.n), cam.view) : 1;
      const lam = o.n ? 0.42 + 0.58 * Math.max(0, D3(N3(o.n), cam.light)) : 0.78;
      let geo;
      if (o.k === 'ell') { const e = ellipse2(cam, o.c, o.ax); geo = { e, depth: e[5] }; }
      else geo = spindle2(cam, o);
      items.push({ o, geo, grp: o.grp, gdep: gd[o.grp] != null ? gd[o.grp] : 0, layer: o.layer || 1, depth: geo.depth + (o.depthBias || 0), facing, lam, nrm });
    });
    // equipment items
    const eqItems = [];
    eq.forEach(o => {
      let dep;
      if (o.k === 'box' || o.k === 'obox') dep = cam.pr(o.c)[2];
      else if (o.k === 'tube' || o.k === 'line') dep = (cam.pr(o.a)[2] + cam.pr(o.b)[2]) / 2;
      else dep = cam.pr(o.c)[2];
      if (o.back) dep = -1e4 + dep; else if (o.front) dep += 6;
      if (o.k === 'tube' && o.split) { // long bars: split into chunks so they pass in front of / behind the body correctly
        for (let i = 0; i < 24; i++) { const a = lerp3(o.a, o.b, i / 24), b = lerp3(o.a, o.b, (i + 1) / 24); const zc = (a[2] + b[2]) / 2, mc = lerp3(a, b, 0.5); let dp = (cam.pr(a)[2] + cam.pr(b)[2]) / 2;
          if (Math.abs(zc) < F.shZ + 5) dp += D3(S3(mc, sk.Sc), cam.view) < -2 && D3(S3(mc, sk.Hd), cam.view) < 0 ? -1e4 : 1e4;
          eqItems.push({ o: Object.assign({}, o, { a, b, split: false }), dep: dp }); }
        return;
      }
      eqItems.push({ o, dep });
    });
    // sort groups
    const groups = {}; items.forEach(it => { (groups[it.grp] = groups[it.grp] || []).push(it); });
    const order = Object.keys(groups).map(g => ({ g, d: gd[g] != null ? gd[g] : 0, items: groups[g] }));
    eqItems.forEach((e, i) => order.push({ g: 'eq' + i, d: e.dep, eq: e }));
    order.sort((a, b) => a.d - b.d);
    let s = '';
    // floor + soft contact shadow
    const fp = [[-60, 0, -40], [260, 0, -40], [260, 0, 40], [-60, 0, 40]].map(p => cam.pr(p));
    s += `<path d="${polyD(fp)}" fill="#f1f2f4" opacity=".0"/>`;
    const contacts = ['An', 'Af', 'Tn', 'Tf', 'Wn', 'Wf', 'Kn', 'Kf', 'Hc'].map(k => sk[k]).filter(p => p && p[1] < 9);
    contacts.forEach(p => { const c = cam.pr([p[0], 0, p[2]]), k = 1 - p[1] / 9; s += `<ellipse cx="${f1(c[0])}" cy="${f1(c[1])}" rx="${f1(9 * k + 3)}" ry="${f1((9 * k + 3) * 0.32)}" fill="url(#mqfloor${uid})" opacity="${f1(0.9 * k + 0.1)}"/>`; });
    const shc = cam.pr([lerp3(sk.An, sk.Af, 0.5)[0] * 0.5 + sk.Hc[0] * 0.5, 0, 0]);
    s += `<ellipse cx="${f1(shc[0])}" cy="${f1(shc[1])}" rx="46" ry="${f1(46 * Math.sin(Math.max(6, (o3.cam || [0, 9])[1]) * R) + 3)}" fill="url(#mqfloor${uid})"/>`;
    const defs = `<defs><radialGradient id="mqfloor${uid}"><stop offset="0" stop-color="#9aa1aa" stop-opacity=".32"/><stop offset="1" stop-color="#9aa1aa" stop-opacity="0"/></radialGradient></defs>`;
    order.forEach(G => { s += G.eq ? eqSvg(cam, G.eq.o) : groupSvg(cam, G.g, G.items, sk, F, uid, inten); });
    return defs + s;
  }

  // one body part: outline pass (silhouette), fills by depth, sheens + fibres, clothing layer on top
  function groupSvg(cam, g, items, sk, F, uid, inten) {
    items.sort((a, b) => a.layer - b.layer || a.depth - b.depth);
    const vis = items.filter(it => !(it.o.n && it.facing < -0.62 && !it.o.cloth && !it.o.core));
    let ol = '', fill = '', defs = '';
    const redOn = it => it.o.col === 'red' || it.o.col === 'red2';
    vis.forEach(it => {
      const o = it.o, geo = it.geo;
      const d = o.k === 'ell' ? smoothD(ellPts(geo.e)) : smoothD(geo.h);
      it.id = uid + 'p' + (++GID); defs += `<path id="${it.id}" d="${d}"/>`;
      if (!(o.under && !redOn(it))) ol += `<use href="#${it.id}"/>`;
    });
    const xray = [];
    vis.forEach(it => {
      const o = it.o, geo = it.geo, pal = o.col;
      if (o.under && redOn(it)) { xray.push(it); return; }
      fill += paint(it, pal, inten);
      void geo;
    });
    // red targets that sit under clothing (glutes, hip abductors) show through as an x-ray tint on top
    xray.forEach(it => { fill += `<g opacity="${(0.6 * inten).toFixed(2)}">${paint(it, it.o.col, inten)}</g>`; });
    if (g === 'head') fill += hairAndFace(cam, sk, F, uid) + (F.fem ? ponytail(cam, sk) : '');
    return `<defs>${defs}</defs><g fill="#5b616b" stroke="#50565f" stroke-width="0.95" stroke-linejoin="round">${ol}</g>${fill}`;
  }
  let GID = 0;
  const LT2 = [-0.55, -0.83]; // light direction on screen (upper left)
  function paint(it, pal, inten) {
    const o = it.o, geo = it.geo, lam = it.lam, red = pal === 'red' || pal === 'red2';
    const L = red ? lam * (0.82 + 0.18 * inten) + 0.06 : lam;
    const P = PAL[pal] || PAL.skin, gid = 'mg' + it.id;
    const hiK = o.cloth ? 0.16 : 0.3, loK = o.cloth ? 0.2 : 0.34;
    const st = `<stop offset="0" stop-color="${shadeCol(pal, L + hiK)}"/><stop offset=".5" stop-color="${shadeCol(pal, L)}"/><stop offset="1" stop-color="${shadeCol(pal, L - loK)}"/>`;
    let g;
    if (o.k === 'ell') {
      const e = geo.e, r = Math.max(e[2], e[3]);
      g = `<radialGradient id="${gid}" gradientUnits="userSpaceOnUse" cx="${f1(e[0] + LT2[0] * r * 0.4)}" cy="${f1(e[1] + LT2[1] * r * 0.4)}" r="${f1(r * 1.4)}">${st}</radialGradient>`;
    } else {
      const cs = geo.cs, a = cs[0], b = cs[cs.length - 1], m = cs.reduce((x, c) => (c[2] > x[2] ? c : x), cs[0]);
      let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty);
      let n = tl > 0.5 ? [-ty / tl, tx / tl] : LT2.slice(); if (n[0] * LT2[0] + n[1] * LT2[1] < 0) n = [-n[0], -n[1]];
      const r = m[2] * 1.05, cx = (a[0] + b[0]) / 2 * 0.5 + m[0] * 0.5, cy = (a[1] + b[1]) / 2 * 0.5 + m[1] * 0.5;
      g = `<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${f1(cx + n[0] * r)}" y1="${f1(cy + n[1] * r)}" x2="${f1(cx - n[0] * r)}" y2="${f1(cy - n[1] * r)}">${st}</linearGradient>`;
    }
    let s = g + `<use href="#${it.id}" fill="url(#${gid})" stroke="${P.line}" stroke-width="${o.cloth ? 0.35 : 0.3}" stroke-opacity=".7" stroke-linejoin="round"/>`;
    // fibres: lines along each belly that converge on the tendons
    if (o.fib && o.k !== 'ell') {
      let fd = '';
      geo.all.forEach((cs, ai) => {
        const nf = ai ? Math.max(2, o.fib - 2) : o.fib;
        for (let j = 0; j < nf; j++) {
          const v = nf === 1 ? 0 : -0.66 + 1.32 * j / (nf - 1), pts = [];
          for (let i = 1; i < cs.length - 1; i++) {
            const a = cs[i - 1], b = cs[i + 1], tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
            pts.push([cs[i][0] - ty / tl * cs[i][2] * v, cs[i][1] + tx / tl * cs[i][2] * v]);
          }
          if (pts.length > 1) fd += 'M' + pts.map(p => f1(p[0]) + ',' + f1(p[1])).join('L');
        }
      });
      s += `<path d="${fd}" fill="none" stroke="${red ? '#8e1a12' : '#68707a'}" stroke-width="${red ? 0.28 : 0.24}" stroke-opacity="${red ? 0.5 : 0.36}" stroke-linecap="round"/>`;
    }
    return s;
  }
  // hair cap (clipped to the skull) + face features, all in head-local 3-D so they turn with the head
  function hairAndFace(cam, sk, F, uid) {
    const { c, r } = sk.skull, hu = sk.hu, hf = sk.hf, hl = sk.hl, fem = F.fem;
    const SP = (u, phi, lift = 0) => { const rho = Math.sqrt(Math.max(0, 1 - (u / r[1]) ** 2)); const loc = [r[0] * rho * Math.sin(phi), u, r[2] * rho * Math.cos(phi)];
      const nl = N3([loc[0] / (r[0] * r[0]), loc[1] / (r[1] * r[1]), loc[2] / (r[2] * r[2])]);
      const p = sum3(c, K3(hl, loc[0] * (1 + lift)), K3(hu, loc[1] * (1 + lift)), K3(hf, loc[2] * (1 + lift))), n = N3(sum3(K3(hl, nl[0]), K3(hu, nl[1]), K3(hf, nl[2])));
      return { p, n, vis: D3(n, cam.view) }; };
    const hline = fem ? (phi => { const a = Math.abs(phi); return a < 0.9 ? 4.6 - a * 0.6 : a < 1.75 ? 4.0 - (a - 0.9) * 4.5 : 0.2 - (a - 1.75) * 4.8; })
      : (phi => { const a = Math.abs(phi); return a < 0.85 ? 5.6 - a * 0.9 : a < 1.65 ? 4.8 - (a - 0.85) * 4.2 : 1.4 - (a - 1.65) * 4.4; });
    const N = 72, ring = []; for (let i = 0; i < N; i++) { const phi = -Math.PI + i / N * 2 * Math.PI; ring.push(SP(hline(phi), phi)); }
    // contiguous visible run
    let start = -1; for (let i = 0; i < N; i++) if (ring[i].vis > 0 && ring[(i - 1 + N) % N].vis <= 0) { start = i; break; }
    let run = []; if (start < 0) run = ring.every(x => x.vis > 0) ? ring.slice() : []; else for (let k = 0; k < N; k++) { const x = ring[(start + k) % N]; if (x.vis <= 0) break; run.push(x); }
    const e = ellipse2(cam, c, [K3(hl, r[0]), K3(hu, r[1]), K3(hf, r[2])]);
    const hairCol = shadeCol('hair', 0.55);
    let s = `<clipPath id="hc${uid}"><path d="${smoothD(ellPts(e, 1.0, 0, 0, 28))}"/></clipPath>`;
    const upv = cam.rot(hu); const uy = [upv[0], -upv[1]];
    if (D3(hf, cam.view) < -0.35) s += `<g clip-path="url(#hc${uid})"><path d="${smoothD(ellPts(e))}" fill="${hairCol}"/></g>`;
    else if (run.length > 1) {
      const pts = run.map(x => cam.pr(x.p));
      const a = pts[0], b = pts[pts.length - 1];
      const poly = pts.map(p => [p[0], p[1]]).concat([[b[0] + uy[0] * 40, b[1] + uy[1] * 40], [a[0] + uy[0] * 40, a[1] + uy[1] * 40]]);
      s += `<g clip-path="url(#hc${uid})"><path d="${polyD(poly)}" fill="${hairCol}"/>`;
      // hair texture strokes
      let tx = ''; for (let i = 2; i < pts.length - 2; i += 3) { const p = pts[i]; tx += `M${f1(p[0])},${f1(p[1])}l${f1(uy[0] * 5 + 0.6)},${f1(uy[1] * 5)}`; }
      s += `<path d="${tx}" stroke="#2b2a2a" stroke-width=".35" opacity=".5" fill="none"/></g>`;
    } else if (D3(hu, cam.view) > 0.2 || ring.every(x => x.vis <= 0)) {
      s += `<g clip-path="url(#hc${uid})"><path d="${smoothD(ellPts(e))}" fill="${hairCol}"/></g>`;
    }
    // face: only when the face side is toward the camera
    const fv = D3(hf, cam.view);
    if (fv > -0.15) {
      const FP = (u, f, l) => sum3(sk.Hd, K3(hu, u), K3(hf, f), K3(hl, l));
      const vis = (u, f, l) => D3(N3(sum3(K3(hu, u * 0.02), K3(hf, 1), K3(hl, l / 7))), cam.view) > 0.05;
      const pr = p => cam.pr(p);
      const qline = (pa, pc, pb, w, col, op) => { const A = pr(pa), C = pr(pc), B = pr(pb); return `<path d="M${f1(A[0])},${f1(A[1])}Q${f1(C[0])},${f1(C[1])} ${f1(B[0])},${f1(B[1])}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round" opacity="${op}"/>`; };
      [1, -1].forEach(sg => {
        const el = 3.05 * sg;
        if (!vis(0.6, 7.6, el)) return;
        const ec = FP(0.6, 7.25, el);
        const ee = ellipse2(cam, ec, [K3(hl, 1.45), K3(hu, fem ? 0.78 : 0.62), K3(hf, 0.35)]);
        s += `<path d="${smoothD(ellPts(ee, 1, 0, 0, 14))}" fill="#3a3e45"/>`;
        // upper lid shadow + brow
        s += qline(FP(2.9, 7.6, el - 1.8 * sg), FP(3.6, 7.9, el), FP(2.9, 7.2, el + 2 * sg), fem ? 0.6 : 0.95, shadeCol('hair', 0.35), 0.9);
        s += qline(FP(1.3, 7.7, el - 1.5 * sg), FP(1.6, 7.9, el), FP(1.2, 7.4, el + 1.6 * sg), 0.4, '#5b616b', 0.6);
      });
      // nose (shaded wedge) + nostril hint
      s += qline(FP(1.0, 8.4, 0.6), FP(-2.4, 9.8, 1.1), FP(-3.6, 9.3, 1.4), 0.55, '#6c727b', 0.85);
      s += qline(FP(-3.8, 9.0, -1.2), FP(-4.3, 9.4, 0), FP(-3.8, 9.0, 1.2), 0.45, '#6c727b', 0.7);
      // mouth
      s += qline(FP(-6.3, 8.0, -2.1), FP(-6.6, 8.5, 0), FP(-6.3, 8.0, 2.1), fem ? 0.6 : 0.5, fem ? '#8b5a57' : '#5b5f66', 0.9);
      if (fem) s += qline(FP(-7.1, 7.9, -1.4), FP(-7.6, 8.1, 0), FP(-7.1, 7.9, 1.4), 0.5, '#a7726d', 0.6);
      // cheekbone / jaw definition
      [1, -1].forEach(sg => { if (vis(-3, 6, 5 * sg)) s += qline(FP(-1.5, 6.4, 5.2 * sg), FP(-5, 6.6, 5.0 * sg), FP(-7.8, 6.2, 3.2 * sg), 0.35, '#7a808a', 0.5); });
    }
    return s;
  }
  function ponytail(cam, sk) {
    const c = sk.skull.c, hu = sk.hu, hf = sk.hf;
    const a = sum3(c, K3(hu, 4), K3(hf, -8)), m = sum3(c, K3(hu, -2), K3(hf, -13)), b = sum3(c, K3(hu, -12), K3(hf, -12));
    const o = { p: [a, m, b], r: 3.4, pk: 0.3, te: 0.35 };
    const g = spindle2(cam, o);
    if (g.depth > cam.pr(c)[2] + 2) return '';
    return `<path d="${smoothD(g.h)}" fill="${shadeCol('hair', 0.5)}" stroke="#222" stroke-width=".35"/>`;
  }
  // equipment
  function eqSvg(cam, o) {
    const P = PAL[o.col] || PAL.frame;
    if (o.k === 'line') { const a = cam.pr(o.a), b = cam.pr(o.b); return `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="${o.stroke}" stroke-width="${o.w}" stroke-linecap="round"/>`; }
    if (o.k === 'tube') {
      const a = cam.pr(o.a), b = cam.pr(o.b), w = o.r * 2;
      return `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="${P.line}" stroke-width="${f1(w + 0.7)}" stroke-linecap="round"/>` +
        `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="${shadeCol(o.col, 0.75)}" stroke-width="${f1(w)}" stroke-linecap="round"/>` +
        (w > 1.8 ? `<line x1="${f1(a[0] - w * 0.18)}" y1="${f1(a[1] - w * 0.2)}" x2="${f1(b[0] - w * 0.18)}" y2="${f1(b[1] - w * 0.2)}" stroke="#fff" stroke-opacity="${o.col === 'pad' || o.col === 'iron' ? 0.12 : 0.55}" stroke-width="${f1(w * 0.28)}" stroke-linecap="round"/>` : '');
    }
    if (o.k === 'box' || o.k === 'obox') {
      const ax = o.k === 'box' ? [[o.h[0], 0, 0], [0, o.h[1], 0], [0, 0, o.h[2]]] : o.ax;
      let s = '';
      const faces = [];
      [0, 1, 2].forEach(i => [-1, 1].forEach(sg => {
        const n = N3(K3(ax[i], sg)); if (D3(n, cam.view) <= 0.01) return;
        const c = A3(o.c, ax[i], sg), j = (i + 1) % 3, k = (i + 2) % 3;
        const pts = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([u, v]) => cam.pr(sum3(c, K3(ax[j], u), K3(ax[k], v))));
        faces.push({ pts, lam: 0.45 + 0.55 * Math.max(0, D3(n, cam.light)) });
      }));
      faces.forEach(f => { s += `<path d="${polyD(f.pts)}" fill="${shadeCol(o.col, f.lam)}" stroke="${P.line}" stroke-width=".45" stroke-linejoin="round"/>`; });
      return s;
    }
    if (o.k === 'ball') {
      const e = ellipse2(cam, o.c, [[o.r, 0, 0], [0, o.r, 0], [0, 0, o.r]]), hl = ellipse2(cam, sum3(o.c, [-o.r * 0.35, o.r * 0.4, 0]), [[o.r * 0.38, 0, 0], [0, o.r * 0.3, 0], [0, 0, o.r * 0.38]]);
      return `<path d="${smoothD(ellPts(e, 1, 0, 0, 28))}" fill="${shadeCol(o.col, 0.5)}" stroke="${P.line}" stroke-width=".55"/><path d="${smoothD(ellPts(hl, 1, 0, 0, 16))}" fill="#fff" fill-opacity=".16"/>`;
    }
    if (o.k === 'disc') {
      const ax = N3(o.ax), u = ortho(Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], ax), v = X3(ax, u);
      const back = A3(o.c, ax, -o.th / 2 * Math.sign(D3(ax, cam.view) || 1)), front = A3(o.c, ax, o.th / 2 * Math.sign(D3(ax, cam.view) || 1));
      const eb = ellipse2(cam, back, [K3(u, o.r), K3(v, o.r), K3(ax, 0.01)]), ef = ellipse2(cam, front, [K3(u, o.r), K3(v, o.r), K3(ax, 0.01)]);
      const pts = hull(ellPts(eb, 1, 0, 0, 28).concat(ellPts(ef, 1, 0, 0, 28)));
      const lam = 0.45 + 0.55 * Math.abs(D3(ax, cam.light));
      let s = `<path d="${polyD(pts)}" fill="${shadeCol(o.col, 0.3)}" stroke="${P.line}" stroke-width=".5" stroke-linejoin="round"/>`;
      s += `<path d="${smoothD(ellPts(ef, 1, 0, 0, 28))}" fill="${shadeCol(o.col, lam * 0.85)}" stroke="${P.line}" stroke-width=".4"/>`;
      if (o.plate) s += `<path d="${smoothD(ellPts(ef, 0.72, 0, 0, 24))}" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="${f1(o.r * 0.1)}"/><path d="${smoothD(ellPts(ef, 0.16, 0, 0, 12))}" fill="${shadeCol('steel', 0.7)}" stroke="${P.line}" stroke-width=".3"/>`;
      return s;
    }
    return '';
  }

  // fit a 4:3 (or square) viewBox around the whole movement + equipment
  function fitBox3(ex, rig, small, camOv) {
    const o3 = o3For(rig), cam = camera(...(camOv || o3.cam || (rig.view ? [28, 8] : [48, 9])));
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; const ad = (p, r = 0) => { x0 = Math.min(x0, p[0] - r); y0 = Math.min(y0, p[1] - r); x1 = Math.max(x1, p[0] + r); y1 = Math.max(y1, p[1] + r); };
    const F = FIGS[WO.getFigure ? WO.getFigure() : 'male'] || FIGS.male;
    for (let i = 0; i < 12; i++) {
      const ph = M.phase(rig, i / 12), P = M.pose(rig, ph.q), sk = finishSkeleton(rig.view ? liftFront(rig, P, P.q, F, o3) : liftSide(rig, P, P.q, F, o3), o3);
      ['Hc', 'Sc', 'Hd', 'Hn', 'Hf', 'Kn', 'Kf', 'An', 'Af', 'Tn', 'Tf', 'Sn', 'Sf', 'En', 'Ef', 'Wn', 'Wf'].forEach(k => { if (sk[k]) ad(cam.pr(sk[k]), k === 'Hd' ? 13 : 9); });
      buildEquip(rig, sk, o3, rig._name).forEach(o => {
        if (o.k === 'tube' || o.k === 'line') { ad(cam.pr(o.a), o.r || 1); ad(cam.pr(o.b), o.r || 1); }
        else if (o.k === 'disc' || o.k === 'ball') ad(cam.pr(o.c), o.r);
        else if (o.k === 'box') ad(cam.pr(o.c), Math.hypot(...o.h) * 0.8);
        else if (o.k === 'obox') ad(cam.pr(o.c), Math.max(...o.ax.map(L3)));
      });
    }
    ad(cam.pr([x0, 0, 0]).map((v, i) => (i === 1 ? v : x0)), 0);
    const pad = small ? 3 : 6; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    let w = x1 - x0, h = y1 - y0; const AR = small ? 1 : 4 / 3;
    if (w / h < AR) { const nw = h * AR; x0 -= (nw - w) / 2; w = nw; } else { const nh = w / AR; y0 -= (nh - h) * 0.6; h = nh; }
    return [x0, y0, w, h].map(v => Math.round(v * 10) / 10);
  }

  // name every rig once so O3 lookups work on normalized copies
  Object.keys(M.RIGS).forEach(k => { M.RIGS[k]._name = k; });
  const rigOf = ex => { const r = M.rigFor(ex); return r; };
  const stillT = rig => { const o = O3[rig._name]; return o && o.still != null ? o.still : rig.key; };
  const _prims = (rig, t, fig) => { const F = FIGS[fig || 'male'], o3 = o3For(rig), P = M.pose(rig, M.phase(rig, t).q), sk = finishSkeleton(rig.view ? liftFront(rig, P, P.q, F, o3) : liftSide(rig, P, P.q, F, o3), o3);
    return { sk, body: buildBody(sk, F, [], [], o3), eq: buildEquip(rig, sk, o3, rig._name) }; };
  WO.ANATOMY = { _prims, _sk: (rig, t) => { const F = FIGS.male, o3 = o3For(rig), P = M.pose(rig, M.phase(rig, t).q); return finishSkeleton(rig.view ? liftFront(rig, P, P.q, F, o3) : liftSide(rig, P, P.q, F, o3), o3); }, stillT, render: render3, fitBox: fitBox3, O3, FIGS, rigOf, _camera: camera, _o3: o3For, version: 'v26' };
})();
