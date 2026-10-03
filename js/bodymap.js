/* Stylized anatomical body map (front + back). Left-side shapes are mirrored for the right side. */
(function () {
  'use strict';
  const MIRROR = 'matrix(-1 0 0 1 200 0)';

  // Base silhouette (left half), shared by front/back
  const SIL = [
    'M100,62 L84,63 C72,64 62,68 58,78 C55,88 56,100 58,112 C62,130 66,145 68,160 C66,172 64,182 66,192 L100,196 Z',
    'M60,72 C50,76 47,90 47,104 C47,118 48,128 50,136 L62,136 C64,122 66,108 66,96 Z',
    'M50,136 C45,150 42,166 42,178 L52,180 C56,166 60,150 62,136 Z',
    'M66,190 C62,215 64,245 70,268 L94,268 C96,245 98,220 100,198 Z',
    'M70,268 C68,290 70,320 74,350 L88,350 C92,320 94,290 94,268 Z'
  ];

  const FRONT = {
    traps: ['M93,58 C88,62 82,64 76,66 L92,67 Z'],
    front_delts: ['M76,66 C67,67 61,72 60,80 C62,87 66,89 70,87 C72,79 76,73 82,68 Z'],
    side_delts: ['M61,71 C55,74 52,81 52,90 C55,92 58,90 60,84 C60,78 60,75 61,71 Z'],
    chest: ['M98,68 L83,68 C75,72 70,80 70,89 C72,99 82,105 92,105 C96,105 98,103 98,100 Z'],
    biceps: ['M62,92 C55,98 53,110 54,122 C57,128 62,128 64,122 C66,110 66,100 64,92 Z'],
    triceps: ['M53,96 C49,106 49,118 51,127 L53,122 C52,112 53,103 56,95 Z'],
    forearms: ['M52,137 C47,149 44,162 44,174 L51,176 C55,164 59,150 62,137 C58,133 55,133 52,137 Z'],
    abs: ['M98,108 L89,108 C87,122 87,150 89,178 L98,183 Z'],
    obliques: ['M86,109 C78,113 72,121 70,133 C70,149 72,162 75,172 L87,178 C85,150 85,126 86,109 Z'],
    hip_flexors: ['M77,181 C81,187 87,193 95,199 L98,189 C92,186 85,183 77,181 Z'],
    abductors: ['M68,182 C64,190 64,200 66,211 C68,204 70,198 73,191 Z'],
    quads: ['M70,199 C64,216 64,241 70,262 C76,268 86,268 92,262 C94,241 92,217 88,203 C82,198 76,196 70,199 Z'],
    adductors: ['M91,202 C94,216 96,230 96,246 C99,236 100,221 100,205 Z'],
    calves: ['M74,283 C70,296 72,315 76,331 L80,331 C80,313 80,296 78,283 Z', 'M90,283 C92,296 92,313 88,331 L85,331 C85,313 86,296 88,283 Z']
  };
  const BACK = {
    traps: ['M100,55 L91,59 C85,63 79,66 74,68 C82,72 89,80 93,92 C96,100 98,110 100,120 Z'],
    rear_delts: ['M74,69 C66,69 60,73 58,81 C60,87 64,89 68,87 C70,81 73,75 79,71 Z'],
    side_delts: ['M60,73 C54,77 52,84 52,92 C55,93 58,89 60,83 Z'],
    upper_back: ['M91,92 C86,85 79,82 73,86 C73,93 77,99 85,103 C89,101 92,97 93,95 Z'],
    lats: ['M71,97 C67,109 68,125 72,141 C78,151 86,157 94,159 C96,141 94,121 88,107 C83,102 77,99 71,97 Z'],
    lower_back: ['M98,124 L93,128 C91,143 91,160 93,175 L98,179 Z'],
    triceps: ['M59,90 C52,98 50,110 51,122 C54,128 60,128 63,122 C65,110 65,100 63,90 Z'],
    forearms: ['M52,137 C47,149 44,162 44,174 L51,176 C55,164 59,150 62,137 C58,133 55,133 52,137 Z'],
    obliques: ['M71,143 C69,154 69,164 70,172 L80,176 C76,166 74,156 74,148 Z'],
    abductors: ['M70,181 C66,185 64,191 66,198 C70,191 74,187 80,183 Z'],
    glutes: ['M98,181 C90,179 77,181 71,189 C67,201 69,215 77,221 C87,225 96,221 99,213 Z'],
    hamstrings: ['M71,224 C66,240 68,257 74,268 L92,268 C96,253 96,237 94,224 C86,228 78,228 71,224 Z'],
    adductors: ['M95,223 C97,236 98,246 97,258 C100,246 100,232 100,223 Z'],
    calves: ['M72,279 C66,293 70,313 78,325 C84,325 90,319 92,305 C93,293 90,283 86,279 Z']
  };

  function paths(list, cls) {
    return list.map(d => `<path d="${d}" class="${cls}"/><path d="${d}" class="${cls}" transform="${MIRROR}"/>`).join('');
  }

  function view(map, primary, secondary, label) {
    let s = `<g class="sil">${paths(SIL, 'sil-part')}<ellipse cx="100" cy="34" rx="16" ry="20" class="sil-part"/><rect x="91" y="50" width="18" height="15" rx="4" class="sil-part"/>` +
      `<ellipse cx="46" cy="190" rx="6" ry="10" class="sil-part"/><ellipse cx="154" cy="190" rx="6" ry="10" class="sil-part"/>` +
      `<ellipse cx="80" cy="357" rx="11" ry="6" class="sil-part"/><ellipse cx="120" cy="357" rx="11" ry="6" class="sil-part"/></g>`;
    Object.keys(map).forEach(m => {
      const cls = primary.includes(m) ? 'm m-pri' : secondary.includes(m) ? 'm m-sec' : 'm';
      s += `<g data-muscle="${m}">${paths(map[m], cls)}</g>`;
    });
    if (map === FRONT) { // ab segment lines
      s += '<g class="abseg">' + [124, 140, 156].map(y => `<line x1="89" y1="${y}" x2="111" y2="${y}"/>`).join('') + '<line x1="100" y1="106" x2="100" y2="184"/></g>';
    } else {
      s += '<g class="abseg"><line x1="100" y1="56" x2="100" y2="180"/></g>';
    }
    return `<svg viewBox="30 0 140 368" class="bodymap" role="img" aria-label="${label} muscle map">${s}<text x="100" y="366" text-anchor="middle" class="bm-label">${label}</text></svg>`;
  }

  function bodyMap(primary, secondary) {
    primary = primary || []; secondary = (secondary || []).filter(m => !primary.includes(m));
    return `<div class="bodymaps">${view(FRONT, primary, secondary, 'FRONT')}${view(BACK, primary, secondary, 'BACK')}</div>`;
  }

  window.WO = window.WO || {};
  window.WO.bodyMap = bodyMap;
})();
