/* Anatomical mannequin demos (side view, filled + shaded body, joint-angle keyframes, posture-coaching overlay).
   Original artwork. Exercises with a rig in EX_RIG use this; every other exercise falls back to the stick figure (demo.js).
   To add an exercise: give it a rig (keyframe angles + cues + muscles) and map its id in EX_RIG. */
(function () {
  'use strict';
  const WO = window.WO = window.WO || {};
  const R = Math.PI / 180, f1 = n => n.toFixed(1);
  // segment lengths (viewBox units, figure ~170 tall), ankle anchor
  const LEN = { shank: 42, thigh: 43, torso: 50, ua: 31, fa: 32 }, ANK = [96, 176], FLOOR = 182;

  // ---------- rigs ----------
  // angles (deg): s shank forward lean, th thigh (hip behind knee), tl torso forward lean, ar arm (+ forward), el elbow
  const RIGS = {
    hinge_db: {
      prop: 'db', muscles: ['glutes', 'hamstrings'], period: 4600, spineCheck: true,
      top: { s: 2, th: 1, tl: 0, ar: 5, el: 3 },
      bottom: { s: 5, th: 30, tl: 90, ar: 0, el: 0 },
      // phase timeline (fraction of the loop) -> pose 0 (top) .. 1 (bottom)
      tl: [[0, 0], [0.12, 0], [0.48, 1], [0.62, 1], [0.92, 0], [1, 0]],
      cues: [
        { t: [0.12, 0.5], text: 'Hips back' }, { t: [0.2, 0.62], text: 'Soft knees' },
        { t: [0.46, 0.66], text: 'Flat back' }, { t: [0.48, 0.64], text: 'DBs close to shins' },
        { t: [0.64, 0.9], text: 'Drive hips forward' }, { t: [0.88, 1.12], text: 'Squeeze glutes at top' }
      ],
      still: 0.55 // reduced-motion frame (bottom of the hinge)
    }
  };
  const EX_RIG = { db_rdl: 'hinge_db' };

  // ---------- geometry ----------
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
  const dirDown = a => [Math.sin(a * R), Math.cos(a * R)];
  function pose(rig, p) {
    const q = {}; ['s', 'th', 'tl', 'ar', 'el'].forEach(k => { q[k] = rig.top[k] + (rig.bottom[k] - rig.top[k]) * p; });
    const A = ANK, K = add(A, [Math.sin(q.s * R), -Math.cos(q.s * R)], LEN.shank);
    const H = add(K, [-Math.sin(q.th * R), -Math.cos(q.th * R)], LEN.thigh);
    const u = [Math.sin(q.tl * R), -Math.cos(q.tl * R)], S = add(H, u, LEN.torso);
    // arms hang (gravity) but are kept close to the legs: if the hands would drift in front of the thigh/shin, swing them back to it
    const frontAt = y => { const seg2 = (a, b, off) => (y - a[1]) / ((b[1] - a[1]) || 1); if (y <= H[1]) return H[0] + 9; if (y <= K[1]) return H[0] + (K[0] - H[0]) * seg2(H, K) + 8; return K[0] + (A[0] - K[0]) * seg2(K, A) + 5; };
    const arm = LEN.ua + LEN.fa;
    for (let i = 0; i < 4; i++) {
      const wy = S[1] + arm * Math.cos(q.ar * R), wx = S[0] + arm * Math.sin(q.ar * R), lim = frontAt(wy) + 7;
      if (wx > lim) q.ar = Math.asin(Math.max(-1, Math.min(1, (lim - S[0]) / arm))) / R; else break;
    }
    const E = add(S, dirDown(q.ar), LEN.ua), W = add(E, dirDown(q.ar + q.el), LEN.fa);
    return { A, K, H, S, E, W, u, q };
  }
  // local (u along segment, v toward the body's front) -> world
  function frame(o, d, torso) { const n = torso ? [-d[1], d[0]] : [d[1], -d[0]]; return ([a, b]) => [o[0] + d[0] * a + n[0] * b, o[1] + d[1] * a + n[1] * b]; }
  function smooth(pts) {
    const n = pts.length; let s = `M${f1(pts[0][0])},${f1(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      s += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)},${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)},${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])},${f1(p2[1])}`;
    }
    return s + 'Z';
  }
  const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
  const seg = (a, b, local) => smooth(local.map(frame(a, unit(a, b))));
  // body part outlines in local coords [u, v]
  const SHAPE = {
    thigh: [[-3, 8], [12, 9.5], [28, 8], [40, 6], [46, 3], [46, -4], [36, -6.5], [22, -9.5], [8, -10.5], [-3, -8.5]],
    ham: [[8, -6.2], [20, -9.2], [33, -6.8], [41, -4.2], [37, -2.4], [22, -4.4], [10, -3.4]],
    calf: [[-3, 5.5], [14, 4.6], [30, 3.6], [43, 3.2], [43, -3.4], [32, -4.6], [16, -8], [3, -7.4]],
    ua: [[-4, 5.5], [14, 5.2], [28, 3.9], [32, 3], [32, -3.4], [20, -4.6], [6, -6], [-4, -5.6]],
    fa: [[-2, 3.9], [9, 4.4], [24, 3.1], [30, 2.6], [30, -2.6], [15, -3.4], [0, -3.6]],
    torso: [[-5, 4], [4, 9.5], [16, 8.6], [28, 9], [38, 11.6], [46, 9.6], [53, 4.5], [55, 0], [54, -6.5], [46, -10.5], [32, -9.6], [17, -8.6], [7, -13.4], [-4, -10.5]],
    glute: [[-3.5, -9.4], [5, -13.2], [14, -10], [12, -3.5], [1, -3]]
  };

  // ---------- render ----------
  function render(rig, t, opts) {
    const cyc = t % 1; let p = 0;
    const T = rig.tl; for (let i = 0; i < T.length - 1; i++) if (cyc >= T[i][0] && cyc <= T[i + 1][0]) { const k = (cyc - T[i][0]) / ((T[i + 1][0] - T[i][0]) || 1); p = T[i][1] + (T[i + 1][1] - T[i][1]) * (1 - Math.cos(Math.PI * k)) / 2; break; }
    const P = pose(rig, p), { A, K, H, S, E, W, u } = P;
    const far = [-3.5, -1.2], fz = q => add(q, far); // far-side limbs drawn slightly offset + darker
    let s = `<line x1="-20" y1="${FLOOR}" x2="260" y2="${FLOOR}" class="floor"/>`;
    const foot = (a, cls) => `<path class="${cls}" d="M${f1(a[0] - 8)},${FLOOR} L${f1(a[0] + 25)},${FLOOR} Q${f1(a[0] + 27)},${FLOOR - 4} ${f1(a[0] + 17)},${FLOOR - 5.5} L${f1(a[0] + 4)},${f1(a[1] - 2.5)} Q${f1(a[0] - 9)},${f1(a[1] - 2)} ${f1(a[0] - 8)},${FLOOR}Z"/>`;
    const db = (w, d, cls) => { const c = add(w, d, 2), pts = Array.from({ length: 6 }, (_, i) => [c[0] + 7.2 * Math.cos((i * 60 + 30) * R), c[1] + 7.2 * Math.sin((i * 60 + 30) * R)]); return `<path class="${cls}" d="M${pts.map(q => f1(q[0]) + ',' + f1(q[1])).join(' L')}Z"/><circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="2.6" class="mq-db-hub"/>`; };
    const ad = unit(E, W);
    // far side: leg, arm, dumbbell
    s += `<path class="mq-far" d="${seg(fz(H), fz(K), SHAPE.thigh)}"/><path class="mq-far" d="${seg(fz(K), fz(A), SHAPE.calf)}"/>` + foot(fz(A), 'mq-far');
    s += `<path class="mq-far" d="${seg(fz(S), fz(E), SHAPE.ua)}"/><path class="mq-far" d="${seg(fz(E), fz(W), SHAPE.fa)}"/>` + db(fz(W), ad, 'mq-db far');
    // torso + glutes
    s += `<path class="mq-body" d="${smooth(SHAPE.torso.map(frame(H, u, true)))}"/>`;
    const hi = 0.45 + 0.45 * p;
    if (rig.muscles.includes('glutes')) s += `<path class="mq-mus" style="opacity:${hi.toFixed(2)}" d="${smooth(SHAPE.glute.map(frame(H, u, true)))}"/>`;
    // near leg
    s += `<path class="mq-body" d="${seg(H, K, SHAPE.thigh)}"/>`;
    if (rig.muscles.includes('hamstrings')) s += `<path class="mq-mus" style="opacity:${hi.toFixed(2)}" d="${seg(H, K, SHAPE.ham)}"/>`;
    s += `<path class="mq-body" d="${seg(K, A, SHAPE.calf)}"/>` + foot(A, 'mq-body');
    // neck + head (neutral: in line with the spine)
    const fr = frame(S, u, true), Hc = fr([17, 3]);
    s += `<path class="mq-body" d="${smooth([[0, 4.5], [9, 4.2], [9, -4.2], [0, -5]].map(fr))}"/>`;
    s += `<path class="mq-body" d="${smooth([[9, -6], [14, -10.5], [22, -10.4], [28, -5.5], [29.6, 1], [27.4, 6.6], [23, 9.6], [19.5, 10.4], [16.6, 12.2], [13.4, 11.4], [11, 8.4], [8.6, 4]].map(fr))}"/>`;
    // near arm + hand + dumbbell
    s += `<path class="mq-body" d="${seg(S, E, SHAPE.ua)}"/><path class="mq-body" d="${seg(E, W, SHAPE.fa)}"/><circle class="mq-body" cx="${f1(W[0])}" cy="${f1(W[1])}" r="3.6"/>` + db(W, ad, 'mq-db');

    if (opts.overlay) {
      // neutral-spine guide head -> hips (green once hinging with a flat back)
      const ok = rig.spineCheck && P.q.tl > 12;
      s += `<line x1="${f1(Hc[0])}" y1="${f1(Hc[1])}" x2="${f1(H[0])}" y2="${f1(H[1])}" class="mq-spine${ok ? ' ok' : ''}"/>`;
      // joint angle arcs
      const arc = (c, a, b, r, lbl) => {
        const d1 = unit(c, a), d2 = unit(c, b), ang = Math.acos(Math.max(-1, Math.min(1, d1[0] * d2[0] + d1[1] * d2[1]))) / R;
        const s0 = add(c, d1, r), s1 = add(c, d2, r), sw = d1[0] * d2[1] - d1[1] * d2[0] > 0 ? 1 : 0, m = unit([0, 0], [d1[0] + d2[0], d1[1] + d2[1]]), tp = add(c, m, r + 7);
        return `<path class="mq-arc" d="M${f1(s0[0])},${f1(s0[1])} A${r},${r} 0 0 ${sw} ${f1(s1[0])},${f1(s1[1])}"/><text class="mq-deg" x="${f1(tp[0])}" y="${f1(tp[1] + 2)}" text-anchor="middle">${Math.round(ang)}°${lbl}</text>`;
      };
      s += arc(H, S, K, 10, '') + arc(K, H, A, 8, '');
      // cue pills (top-right), fading in/out at their phase
      let y = 14;
      rig.cues.forEach(c => {
        const x = opts.still ? (c.t[0] <= rig.still && rig.still <= c.t[1] ? 0.5 : -1) : ((cyc - c.t[0] + 1) % 1) / (((c.t[1] - c.t[0]) + 1) % 1 || 1);
        const inside = opts.still ? x >= 0 : (cyc >= c.t[0] && cyc <= c.t[1]) || (c.t[1] > 1 && cyc <= c.t[1] - 1);
        if (!inside) return;
        const prog = opts.still ? 0.5 : (cyc >= c.t[0] ? cyc - c.t[0] : cyc + 1 - c.t[0]) / (c.t[1] - c.t[0]);
        const a = Math.min(1, prog * 6, (1 - prog) * 6), w = c.text.length * 3.85 + 12;
        s += `<g class="mq-cue" style="opacity:${a.toFixed(2)}"><rect x="${f1(222 - w)}" y="${y}" width="${f1(w)}" height="12" rx="6"/><text x="${f1(222 - w / 2)}" y="${y + 8.4}" text-anchor="middle">${c.text}</text></g>`;
        y += 15;
      });
    }
    return s;
  }

  // ---------- mount + loop ----------
  const live = new Set(); let raf = null;
  function loop(ts) {
    live.forEach(d => { if (!d.g.isConnected) { live.delete(d); return; } d.g.innerHTML = render(d.rig, ((ts - d.t0) / d.rig.period) % 1, d.opts); });
    raf = live.size ? requestAnimationFrame(loop) : null;
  }
  function mount(container, ex) {
    const rig = RIGS[EX_RIG[ex.id]], small = container.classList.contains('ex-thumb');
    container.innerHTML = `<svg viewBox="${small ? '40 8 170 128' : '-4 10 230 172.5'}" class="demo-svg mq" role="img" aria-label="Animated posture demo of ${ex.name}"><defs><linearGradient id="mqShade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--mq-hi)"/><stop offset="1" style="stop-color:var(--mq-lo)"/></linearGradient></defs><g></g></svg>`;
    const g = container.querySelector('g'), still = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const d = { g, rig, t0: performance.now(), opts: { overlay: !small, still } };
    g.innerHTML = render(rig, small ? rig.still : (still ? rig.still : 0), d.opts);
    if (still) return;
    live.add(d); if (!raf) raf = requestAnimationFrame(loop);
  }
  const fallback = WO.mountDemo;
  WO.mountDemo = (container, ex) => (ex && EX_RIG[ex.id] && RIGS[EX_RIG[ex.id]] ? mount(container, ex) : fallback(container, ex));
  WO.MANNEQUIN = { RIGS, EX_RIG, render };
})();
