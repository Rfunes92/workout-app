/* Animated stick-figure movement demos (SVG, JS-interpolated keyframes). Original artwork. */
(function () {
  'use strict';
  const S = { h: [100, 38], n: [100, 58], p: [100, 112], e: [101, 85], w: [102, 110], k: [101, 146], a: [100, 180], f: [112, 181] };
  const F = { h: [100, 36], n: [100, 56], sh: [86, 62], sh2: [114, 62], p: [100, 112], hp: [92, 112], hp2: [108, 112], e: [82, 88], w: [80, 112], e2: [118, 88], w2: [120, 112], k: [90, 146], a: [89, 180], k2: [110, 146], a2: [111, 180] };
  const x = (...parts) => Object.assign({}, ...parts);
  const LYING = { n: [150, 170], h: [166, 166], p: [100, 172] };
  const PLANK = { a: [42, 172], f: [38, 180], k: [66, 162], p: [90, 150], n: [140, 126], h: [156, 120], e: [140, 152], w: [140, 178] };
  const SQB = { h: [112, 74], n: [104, 90], p: [76, 134], k: [110, 148], a: [100, 180], e: [116, 102], w: [108, 90] };
  const HANG = { h: [100, 48], n: [100, 66], p: [100, 120], k: [102, 154], a: [100, 186], e: [104, 42], w: [104, 18], f: null };
  const LUNGEB = { p: [100, 138], n: [100, 84], h: [100, 64], e: [101, 110], w: [102, 136], k: [132, 140], a: [130, 180], f: [142, 181], k2: [90, 172], a2: [62, 176] };
  const LUNGEA = x(S, { p: [100, 110], k: [112, 146], a: [124, 180], f: [136, 181], k2: [90, 146], a2: [78, 180] });
  const ROWA = { p: [84, 110], k: [96, 146], a: [100, 180], f: [112, 181], n: [128, 76], h: [142, 66], e: [128, 102], w: [130, 128] };
  const SEAT = { p: [86, 130], n: [86, 76], h: [88, 58], e: [90, 104], w: [94, 128], k: [122, 130], a: [122, 168], f: [130, 170] };
  const BENCH = { h: [156, 124], n: [138, 128], p: [86, 130], k: [58, 128], a: [52, 176], f: [62, 178], e: [138, 104], w: [138, 80] };
  const STANCE = x(S, { n: [104, 58], h: [108, 40], k: [112, 146], a: [118, 180], f: [130, 181], k2: [90, 146], a2: [80, 180], e: [114, 76], w: [118, 56], e2: [108, 78], w2: [114, 60] });

  const P = {
    squat: { f: [x(S, { e: [112, 72], w: [104, 58] }), x(S, SQB)] },
    hinge: { f: [x(S, { w: [104, 112] }), x(S, { p: [82, 110], k: [94, 146], n: [132, 84], h: [146, 74], e: [132, 110], w: [132, 135] })] },
    swing: { f: [x(S, { p: [82, 110], k: [94, 146], n: [132, 84], h: [146, 74], e: [115, 118], w: [100, 146] }), x(S, { e: [124, 72], w: [150, 70] })] },
    lunge: { f: [LUNGEA, x(LUNGEA, LUNGEB)] },
    pushup: { f: [PLANK, x(PLANK, { n: [140, 160], h: [157, 156], p: [90, 166], k: [66, 170], e: [118, 152] })] },
    bench: { f: [BENCH, x(BENCH, { e: [124, 138], w: [136, 114] })], props: ['bench'] },
    press: { f: [x(S, { e: [114, 72], w: [106, 56] }), x(S, { e: [104, 32], w: [104, 6] })] },
    row: { f: [ROWA, x(ROWA, { e: [108, 90], w: [120, 110] })], anchor: [150, 182] },
    invrow: { f: [{ n: [138, 140], p: [92, 160], h: [152, 136], k: [64, 170], a: [40, 178], e: [144, 118], w: [150, 96] },
      { n: [146, 108], h: [160, 102], p: [96, 140], k: [66, 160], a: [40, 178], e: [124, 100], w: [150, 96] }], props: ['lowbar'] },
    seatedrow: { f: [{ p: [80, 160], k: [110, 142], a: [140, 160], f: [146, 150], n: [100, 112], h: [106, 95], e: [124, 124], w: [146, 132] },
      { p: [80, 160], k: [110, 142], a: [140, 160], f: [146, 150], n: [84, 108], h: [88, 90], e: [66, 128], w: [94, 134] }], anchor: [192, 140] },
    vpull: { f: [HANG, x(HANG, { h: [100, 22], n: [100, 40], p: [100, 94], k: [104, 128], a: [100, 160], e: [118, 48], w: [106, 18] })], props: ['bar'], noFloor: true },
    kneeraise: { f: [HANG, x(HANG, { k: [128, 104], a: [124, 138], p: [102, 118] })], props: ['bar'], noFloor: true },
    pulldown: { f: [{ p: [90, 140], k: [124, 140], a: [124, 178], f: [134, 180], n: [94, 86], h: [96, 68], e: [100, 58], w: [104, 30] },
      { p: [90, 140], k: [124, 140], a: [124, 178], f: [134, 180], n: [92, 86], h: [94, 68], e: [84, 104], w: [100, 80] }], props: ['seatlow'], anchor: [104, 0] },
    straightarm: { f: [x(S, { n: [106, 60], h: [110, 42], e: [128, 48], w: [148, 40] }), x(S, { n: [106, 60], h: [110, 42], e: [112, 86], w: [116, 110] })], anchor: [192, 8] },
    legpress: { f: [{ p: [70, 150], n: [40, 108], h: [30, 92], e: [56, 134], w: [70, 140], k: [88, 112], a: [122, 128] },
      { p: [70, 150], n: [40, 108], h: [30, 92], e: [56, 134], w: [70, 140], k: [106, 124], a: [144, 108] }], props: ['sled', 'platform'] },
    legext: { f: [SEAT, x(SEAT, { a: [158, 124], f: [162, 114] })], props: ['seat'] },
    legcurl: { f: [x(SEAT, { a: [158, 124], f: [162, 114] }), x(SEAT, { a: [110, 164], f: [116, 172] })], props: ['seat'] },
    bridge: { f: [x(LYING, { p: [106, 176], k: [76, 146], a: [66, 178], f: [78, 180], e: [130, 176], w: [112, 178] }), x(LYING, { p: [108, 144], k: [76, 142], a: [66, 178], f: [78, 180], e: [130, 176], w: [112, 178] })], propAt: 'p' },
    abduct: { f: [F, x(F, { k: [82, 144], a: [74, 178], k2: [118, 144], a2: [126, 178] })], front: true, bandAt: 'knees' },
    kickback: { f: [x(S, { n: [108, 62], h: [112, 44], e: [124, 80], w: [136, 92], k: [98, 146], a: [96, 180], f: null, k2: [102, 146], a2: [102, 180] }),
      x(S, { n: [108, 62], h: [112, 44], e: [124, 80], w: [136, 92], k: [74, 136], a: [46, 128], f: null, k2: [102, 146], a2: [102, 180] })], anchor: [8, 178], propAt: 'a' },
    calf: { f: [x(S, { a: [100, 178] }), { h: [100, 28], n: [100, 48], p: [100, 102], e: [101, 75], w: [102, 100], k: [101, 136], a: [103, 168], f: [114, 181] }], props: ['step'] },
    raise: { f: [F, x(F, { e: [66, 62], w: [46, 64], e2: [134, 62], w2: [154, 64] })], front: true },
    reversefly: { f: [x(F, { h: [100, 44], e: [86, 90], w: [92, 112], e2: [114, 90], w2: [108, 112] }), x(F, { h: [100, 44], e: [64, 70], w: [42, 76], e2: [136, 70], w2: [158, 76] })], front: true },
    ytw: { f: [x(F, { e: [74, 40], w: [64, 18], e2: [126, 40], w2: [136, 18] }), x(F, { e: [66, 62], w: [46, 62], e2: [134, 62], w2: [154, 62] }), x(F, { e: [74, 80], w: [66, 56], e2: [126, 80], w2: [134, 56] })], front: true },
    fly: { f: [x(F, { e: [64, 70], w: [42, 80], e2: [136, 70], w2: [158, 80] }), x(F, { e: [78, 74], w: [97, 78], e2: [122, 74], w2: [103, 78] })], front: true },
    facepull: { f: [x(S, { e: [124, 64], w: [148, 60] }), x(S, { e: [88, 56], w: [104, 44] })], anchor: [192, 54] },
    curl: { f: [x(S, { e: [102, 86], w: [104, 112] }), x(S, { e: [102, 86], w: [116, 64] })] },
    pushdown: { f: [x(S, { e: [103, 86], w: [122, 72] }), x(S, { e: [103, 86], w: [108, 112] })], anchor: [126, 0] },
    overheadext: { f: [x(S, { e: [104, 32], w: [88, 50] }), x(S, { e: [104, 32], w: [106, 6] })] },
    skull: { f: [x(BENCH, { e: [132, 102], w: [132, 76] }), x(BENCH, { e: [132, 102], w: [152, 110] })], props: ['bench'] },
    benchdip: { f: [{ n: [84, 88], h: [86, 70], e: [82, 112], w: [80, 136], p: [94, 140], k: [130, 146], a: [164, 176], f: [168, 168] },
      { n: [86, 110], h: [88, 92], e: [64, 118], w: [80, 136], p: [96, 162], k: [130, 156], a: [164, 176], f: [168, 168] }], props: ['lowbench'] },
    dip: { f: [{ n: [100, 58], h: [104, 40], e: [102, 84], w: [104, 110], p: [98, 112], k: [94, 146], a: [82, 168] },
      { n: [104, 84], h: [108, 66], e: [80, 98], w: [104, 110], p: [100, 136], k: [96, 170], a: [82, 190] }], props: ['bars'], noFloor: true },
    plank: { f: [{ a: [40, 172], f: [36, 180], k: [66, 166], p: [92, 158], n: [140, 150], h: [156, 146], e: [140, 176], w: [160, 176] },
      { a: [40, 172], f: [36, 180], k: [66, 164], p: [92, 153], n: [140, 150], h: [156, 145], e: [140, 176], w: [160, 176] }] },
    sideplank: { f: [{ a: [40, 176], k: [66, 170], p: [92, 166], n: [140, 150], h: [154, 140], e: [142, 178], w: [160, 178] },
      { a: [40, 176], k: [66, 164], p: [92, 152], n: [140, 146], h: [154, 136], e: [142, 178], w: [160, 178] }] },
    deadbug: { f: [x(LYING, { e: [150, 140], w: [150, 116], e2: [152, 140], w2: [152, 116], k: [100, 140], a: [124, 140], k2: [102, 141], a2: [126, 141] }),
      x(LYING, { e: [172, 152], w: [192, 146], e2: [152, 140], w2: [152, 116], k: [72, 162], a: [44, 168], k2: [102, 141], a2: [126, 141] })] },
    birddog: { f: [{ h: [156, 120], n: [140, 128], p: [90, 130], e: [140, 154], w: [140, 180], e2: [141, 154], w2: [141, 180], k: [90, 180], a: [56, 180], k2: [91, 180], a2: [57, 180] },
      { h: [156, 120], n: [140, 128], p: [90, 130], e: [164, 124], w: [188, 120], e2: [141, 154], w2: [141, 180], k: [62, 128], a: [32, 124], k2: [91, 180], a2: [57, 180] }] },
    cablecrunch: { f: [{ a: [60, 180], k: [96, 180], p: [96, 140], n: [110, 88], h: [118, 72], e: [120, 74], w: [114, 64] },
      { a: [60, 180], k: [96, 180], p: [96, 140], n: [130, 114], h: [142, 104], e: [138, 104], w: [136, 96] }], anchor: [140, 0], forceProp: 'cable' },
    rollout: { f: [{ a: [50, 180], k: [80, 180], p: [84, 140], n: [118, 124], h: [132, 116], e: [119, 148], w: [120, 172] },
      { a: [50, 180], k: [80, 180], p: [100, 156], n: [152, 150], h: [166, 144], e: [170, 162], w: [184, 172] }], props: ['wheel'] },
    twist: { f: [
      { p: [100, 160], hp: [92, 160], hp2: [108, 160], k: [78, 140], a: [70, 172], k2: [122, 140], a2: [130, 172], n: [94, 108], h: [92, 90], sh: [82, 112], sh2: [108, 104], e: [78, 136], w: [92, 148], e2: [104, 130], w2: [92, 148] },
      { p: [100, 160], hp: [92, 160], hp2: [108, 160], k: [78, 140], a: [70, 172], k2: [122, 140], a2: [130, 172], n: [106, 108], h: [108, 90], sh: [92, 104], sh2: [118, 112], e: [96, 130], w: [108, 148], e2: [122, 136], w2: [108, 148] }], front: true },
    pallof: { f: [x(S, { e: [110, 82], w: [116, 74] }), x(S, { e: [126, 72], w: [150, 72] })], anchor: [192, 72] },
    crunch: { f: [x(LYING, { n: [146, 160], h: [160, 152], e: [160, 150], w: [166, 158], k: [106, 140], a: [130, 142], k2: [80, 162], a2: [54, 168] }),
      x(LYING, { n: [146, 160], h: [160, 152], e: [160, 150], w: [166, 158], k: [80, 162], a: [54, 168], k2: [106, 140], a2: [130, 142] })] },
    climber: { f: [x(PLANK, { k2: [118, 152], a2: [108, 172] }), x(PLANK, { k: [118, 152], a: [108, 172], f: null, k2: [66, 162], a2: [42, 172] })] },
    carry: { f: [x(S, { w: [104, 112], k: [110, 146], a: [116, 180], f: [128, 181], k2: [92, 146], a2: [86, 180] }), x(S, { w: [104, 112], k: [92, 146], a: [86, 180], f: [98, 181], k2: [110, 146], a2: [116, 180] })] },
    walk: { f: [x(S, { e: [108, 84], w: [116, 106], e2: [94, 84], w2: [88, 106], k: [110, 146], a: [116, 180], f: [128, 181], k2: [92, 146], a2: [86, 180] }),
      x(S, { e: [94, 84], w: [88, 106], e2: [108, 84], w2: [116, 106], k: [92, 146], a: [86, 180], f: [98, 181], k2: [110, 146], a2: [116, 180] })] },
    run: { f: [{ n: [106, 58], h: [110, 40], p: [100, 110], k: [124, 132], a: [114, 160], f: [124, 164], k2: [90, 146], a2: [72, 172], e: [90, 82], w: [104, 96], e2: [114, 82], w2: [126, 66] },
      { n: [106, 58], h: [110, 40], p: [100, 110], k2: [124, 132], a2: [114, 160], k: [90, 146], a: [72, 172], f: [80, 178], e2: [90, 82], w2: [104, 96], e: [114, 82], w: [126, 66] }] },
    bike: { f: [{ p: [90, 110], n: [118, 66], h: [130, 52], e: [136, 84], w: [150, 92], k: [124, 106], a: [118, 146], k2: [110, 130], a2: [100, 168] },
      { p: [90, 110], n: [118, 66], h: [130, 52], e: [136, 84], w: [150, 92], k2: [124, 106], a2: [118, 146], k: [110, 130], a: [100, 168] }], props: ['bikeframe'] },
    rower: { f: [{ p: [80, 160], k: [104, 128], a: [126, 164], n: [112, 114], h: [122, 98], e: [132, 134], w: [148, 136] },
      { p: [60, 160], k: [94, 152], a: [126, 164], n: [48, 112], h: [44, 94], e: [34, 136], w: [62, 132] }], props: ['rail'] },
    jump: { f: [x(F, { e: [80, 92], w: [72, 110], e2: [120, 92], w2: [128, 110] }), x(F, { h: [100, 28], n: [100, 48], sh: [86, 54], sh2: [114, 54], p: [100, 104], hp: [92, 104], hp2: [108, 104], e: [80, 84], w: [72, 102], e2: [120, 84], w2: [128, 102], k: [90, 138], a: [89, 170], k2: [110, 138], a2: [111, 170] })], front: true, props: ['rope'] },
    jack: { f: [F, x(F, { e: [72, 40], w: [66, 16], e2: [128, 40], w2: [134, 16], k: [80, 146], a: [70, 180], k2: [120, 146], a2: [130, 180] })], front: true },
    burpee: { f: [x(S, {}), x(S, SQB, { e: [118, 130], w: [124, 178] }), x(PLANK, { f: [38, 180] }), x(S, SQB, { e: [118, 130], w: [124, 178] }), x(S, { h: [100, 22], n: [100, 42], p: [100, 96], k: [101, 130], a: [100, 164], f: [110, 170], e: [104, 20], w: [106, 0] })] },
    punch: { f: [STANCE, x(STANCE, { e: [130, 62], w: [154, 58] }), STANCE, x(STANCE, { e2: [124, 70], w2: [146, 60] })] },
    mobility: { f: [x(LUNGEA, LUNGEB, { e: [118, 128], w: [128, 150] }), x(LUNGEA, LUNGEB, { e: [108, 60], w: [112, 34] })] },
    hip9090: { f: [{ h: [100, 100], n: [100, 118], sh: [88, 122], sh2: [112, 122], p: [100, 170], hp: [94, 170], hp2: [106, 170], k: [70, 166], a: [84, 178], k2: [124, 150], a2: [140, 174], e: [84, 146], w: [80, 168], e2: [116, 146], w2: [120, 168] },
      { h: [100, 100], n: [100, 118], sh: [88, 122], sh2: [112, 122], p: [100, 170], hp: [94, 170], hp2: [106, 170], k: [76, 150], a: [60, 174], k2: [130, 166], a2: [116, 178], e: [84, 146], w: [80, 168], e2: [116, 146], w2: [120, 168] }], front: true },
    catcow: { f: [{ w: [140, 178], e: [140, 158], n: [140, 136], k: [88, 180], a: [58, 180], p: [88, 138], m: [114, 150], h: [156, 124] },
      { w: [140, 178], e: [140, 158], n: [140, 136], k: [88, 180], a: [58, 180], p: [88, 138], m: [114, 118], h: [150, 150] }] }
  };

  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  function interp(A, B, t) {
    const o = {};
    new Set([...Object.keys(A), ...Object.keys(B)]).forEach(k => {
      const a = A[k] === undefined ? B[k] : A[k], b = B[k] === undefined ? A[k] : B[k];
      o[k] = (a && b) ? lerp(a, b, t) : (t < 0.5 ? a : b);
    });
    return o;
  }
  const L = (p, q, c, w) => p && q ? `<line x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${q[0].toFixed(1)}" y2="${q[1].toFixed(1)}" class="${c}"${w ? ` stroke-width="${w}"` : ''}/>` : '';

  function render(pat, pose, prop, phase) {
    let s = '';
    const pr = pat.props || [];
    if (!pat.noFloor) s += '<line x1="-200" y1="182" x2="400" y2="182" class="floor"/>';
    // static scenery
    if (pr.includes('bench')) s += '<rect x="48" y="134" width="108" height="7" rx="3" class="scn"/><line x1="64" y1="141" x2="64" y2="182" class="scn-l"/><line x1="140" y1="141" x2="140" y2="182" class="scn-l"/>';
    if (pr.includes('lowbench')) s += '<rect x="40" y="136" width="44" height="7" rx="3" class="scn"/><line x1="48" y1="143" x2="48" y2="182" class="scn-l"/><line x1="76" y1="143" x2="76" y2="182" class="scn-l"/>';
    if (pr.includes('bar')) s += '<line x1="60" y1="18" x2="150" y2="18" class="scn-l" stroke-width="4"/>';
    if (pr.includes('lowbar')) s += '<circle cx="150" cy="96" r="4" class="scn"/><line x1="150" y1="96" x2="150" y2="182" class="scn-l"/>';
    if (pr.includes('bars')) s += '<line x1="88" y1="112" x2="128" y2="112" class="scn-l" stroke-width="4"/><line x1="122" y1="112" x2="122" y2="196" class="scn-l"/>';
    if (pr.includes('seat')) s += '<rect x="64" y="132" width="62" height="8" rx="3" class="scn"/><rect x="62" y="70" width="8" height="64" rx="3" class="scn"/><line x1="95" y1="140" x2="95" y2="182" class="scn-l"/>';
    if (pr.includes('seatlow')) s += '<rect x="70" y="142" width="40" height="7" rx="3" class="scn"/><line x1="90" y1="149" x2="90" y2="182" class="scn-l"/><rect x="118" y="130" width="14" height="6" rx="3" class="scn"/>';
    if (pr.includes('sled')) s += '<path d="M28,160 L86,160 L52,110 L36,96 Z" class="scn" opacity=".5"/>';
    if (pr.includes('step')) s += '<rect x="96" y="181" width="40" height="6" class="scn"/>';
    if (pr.includes('rail')) s += '<line x1="30" y1="166" x2="160" y2="166" class="scn-l" stroke-width="4"/><circle cx="174" cy="150" r="14" class="scn" opacity=".5"/>';
    if (pr.includes('bikeframe')) s += '<line x1="88" y1="114" x2="112" y2="150" class="scn-l"/><line x1="112" y1="150" x2="146" y2="96" class="scn-l"/><line x1="76" y1="114" x2="100" y2="114" class="scn-l" stroke-width="5"/><circle cx="112" cy="150" r="22" class="scn" opacity=".35"/><line x1="112" y1="172" x2="112" y2="182" class="scn-l"/>';
    if (pr.includes('bag') || prop === 'bag') s += '<line x1="176" y1="0" x2="176" y2="30" class="scn-l"/><rect x="164" y="30" width="26" height="100" rx="10" class="scn"/>';

    const back = 'limb back', main = 'limb';
    // back limbs
    if (pose.k2) s += L(pose.hp2 || pose.p, pose.k2, back) + L(pose.k2, pose.a2, back);
    if (pose.e2) s += L(pose.sh2 || pose.n, pose.e2, back) + L(pose.e2, pose.w2, back);
    // torso
    if (pose.m) s += `<path d="M${pose.n[0]},${pose.n[1]} Q${pose.m[0].toFixed(1)},${pose.m[1].toFixed(1)} ${pose.p[0]},${pose.p[1]}" class="limb torso" fill="none"/>`;
    else s += L(pose.n, pose.p, 'limb torso');
    if (pose.sh) s += L(pose.sh, pose.sh2, 'limb torso');
    if (pose.hp) s += L(pose.hp, pose.hp2, 'limb torso');
    s += L(pose.hp || pose.p, pose.k, main) + L(pose.k, pose.a, main);
    if (pose.f) s += L(pose.a, pose.f, main, 6);
    s += L(pose.n, pose.h, main, 6);
    s += L(pose.sh || pose.n, pose.e, main) + L(pose.e, pose.w, main);
    s += `<circle cx="${pose.h[0].toFixed(1)}" cy="${pose.h[1].toFixed(1)}" r="10" class="head"/>`;

    // moving props
    if (pr.includes('platform')) { const a = pose.a; s += `<line x1="${a[0] - 10}" y1="${a[1] - 16}" x2="${a[0] + 10}" y2="${a[1] + 16}" class="scn-l" stroke-width="5"/>`; }
    if (pr.includes('wheel')) s += `<circle cx="${pose.w[0]}" cy="${pose.w[1] + 2}" r="8" class="prop"/>`;
    if (pr.includes('rope')) {
      const cy = 95 + 100 * Math.cos(phase * Math.PI * 2);
      s += `<path d="M${pose.w[0]},${pose.w[1]} Q100,${cy.toFixed(1)} ${pose.w2[0]},${pose.w2[1]}" class="rope" fill="none"/>`;
    }
    const kind = pat.forceProp || prop;
    const at = pat.propAt ? pose[pat.propAt] : pose.w;
    const hands = pat.propAt ? [at] : [pose.w, pose.w2].filter(Boolean);
    if (kind === 'bar') {
      if (pat.front && pose.w2) s += L([pose.w[0] - 14, pose.w[1]], [pose.w2[0] + 14, pose.w2[1]], 'barline', 4);
      else s += `<circle cx="${at[0].toFixed(1)}" cy="${at[1].toFixed(1)}" r="11" class="plate"/><circle cx="${at[0].toFixed(1)}" cy="${at[1].toFixed(1)}" r="3" class="prop"/>`;
    } else if (kind === 'db') {
      hands.forEach(h => { s += `<rect x="${(h[0] - 9).toFixed(1)}" y="${(h[1] - 4).toFixed(1)}" width="18" height="8" rx="3" class="prop"/>`; });
    } else if (kind === 'kb') {
      hands.forEach(h => { s += `<circle cx="${h[0].toFixed(1)}" cy="${(h[1] + 7).toFixed(1)}" r="7" class="prop"/>`; });
    } else if (kind === 'cable' || kind === 'band') {
      const anc = pat.anchor || [192, 14];
      const cls = kind === 'band' ? 'band' : 'cable';
      if (pat.bandAt === 'knees') s += L(pose.k, pose.k2, 'band');
      else if (pat.anchor || kind === 'cable') hands.forEach(h => { s += L(h, anc, cls); });
      else hands.forEach(h => { s += L(h, [pose.a ? pose.a[0] : 100, 182], cls); });
    }
    return s;
  }

  const active = new Set();
  let raf = null;
  function loop(ts) {
    active.forEach(d => {
      if (!d.el.isConnected) { active.delete(d); return; }
      const n = d.pat.f.length, period = d.period * (n > 2 ? n / 2 : 1);
      const t = ((((ts - d.t0) % period) + period) % period) / period;
      const seg = Math.min(n - 1, Math.max(0, Math.floor(t * n))), u = Math.min(1, Math.max(0, t * n - seg));
      const e = (1 - Math.cos(Math.PI * u)) / 2;
      d.el.innerHTML = render(d.pat, interp(d.pat.f[seg], d.pat.f[(seg + 1) % n], e), d.prop, t);
    });
    raf = active.size ? requestAnimationFrame(loop) : null;
  }

  function mountDemo(container, ex) {
    const pat = P[ex.demoPattern || ex.pattern] || P.squat;
    let prop = ex.prop;
    if (ex.req.join('|').includes('heavy_bag')) prop = 'bag';
    // fit the viewBox to the movement so small/lying figures fill the frame
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const addPt = q => { if (!q) return; x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); };
    pat.f.forEach(fr => Object.values(fr).forEach(addPt));
    if (pat.anchor && (prop === 'cable' || prop === 'band' || pat.forceProp)) addPt(pat.anchor);
    if (prop === 'bag') { addPt([192, 20]); addPt([192, 130]); }
    (pat.props || []).forEach(pp => { if (pp === 'bench') { addPt([46, 134]); addPt([158, 182]); } if (pp === 'bar') { addPt([60, 14]); addPt([150, 14]); } if (pp === 'seat') addPt([60, 70]); if (pp === 'sled') addPt([28, 96]); if (pp === 'rail') addPt([188, 136]); if (pp === 'lowbench') addPt([38, 136]); });
    if (!pat.noFloor) addPt([x0, 184]);
    const padd = 16; x0 -= padd; y0 -= padd; x1 += padd; y1 += padd;
    let w = x1 - x0, h = y1 - y0; const R = 4 / 3;
    if (w / h < R) { const nw = h * R; x0 -= (nw - w) / 2; w = nw; } else { const nh = w / R; y0 -= (nh - h) / 2; h = nh; }
    if (w < 150) { const k = 150 / w; x0 -= (w * k - w) / 2; y0 -= (h * k - h) / 2; w *= k; h *= k; }
    const vb = `${x0.toFixed(0)} ${y0.toFixed(0)} ${w.toFixed(0)} ${h.toFixed(0)}`;
    container.innerHTML = '<svg viewBox="' + vb + '" class="demo-svg" role="img" aria-label="Animated demo of ' + ex.name + '"><g></g></svg>';
    const g = container.querySelector('g');
    const d = { el: g, pat, prop, t0: performance.now(), period: ex.kind === 'cardio' ? 900 : 2600 };
    // Reduce Motion: show the key/end position (frame 1) instead of the start frame
    const still = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    g.innerHTML = render(pat, pat.f[still && pat.f.length > 1 ? 1 : 0], prop, 0);
    if (still) return;
    active.add(d);
    if (!raf) raf = requestAnimationFrame(loop);
  }

  window.WO = window.WO || {};
  window.WO.mountDemo = mountDemo;
  window.WO.DEMO_PATTERNS = P;
  window.WO.renderDemoFrame = (ex, i) => { const pat = P[ex.demoPattern || ex.pattern]; return render(pat, pat.f[i % pat.f.length], ex.prop, 0); };
})();
