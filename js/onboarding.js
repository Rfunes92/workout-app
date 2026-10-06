/* Phase 1 onboarding: Welcome → Quiz → Tutorial. Distinct Mount Up voice — eagle, Isaiah 40:31 + biker slang, coach energy. */
(function () {
  'use strict';
  const WO = window.WO;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const html = document.documentElement;

  const EXP = [
    { id: 'new', label: 'Brand new', desc: 'Still learning the machines and the names.' },
    { id: 'some', label: 'Got some miles', desc: 'You train, but want a plan that fits real life.' },
    { id: 'solid', label: 'Solid base', desc: 'You know your lifts; you want sharper programming.' },
    { id: 'veteran', label: 'Veteran', desc: 'Years in. Coach me like I can take it.' }
  ];
  const LOC_OPTS = [
    { id: 'gym', label: 'LA Fitness / commercial gym', hint: 'Cables, machines, iron.' },
    { id: 'home', label: 'Home gym', hint: 'Dumbbells, bands, whatever you’ve got.' },
    { id: 'muaythai', label: 'Muay Thai', hint: 'Class is the main course; we complement it.' },
    { id: 'mix', label: 'A mix', hint: 'Gym + home + pads — like Ronnie’s week.' }
  ];
  const LIMS = [
    { id: 'flat_back', label: 'Back gets angry lying flat', desc: 'We’ll skip or swap flat bench / skull-crushers when we can.' },
    { id: 'squat_back', label: 'Back sensitive on deep squats', desc: 'More hinges, presses, and smarter squat swaps.' },
    { id: 'knees', label: 'Knees need kindness', desc: 'Softer landing, fewer jumping finishers.' },
    { id: 'shoulders', label: 'Shoulders cranky overhead', desc: 'Landmine / neutral-grip options preferred.' },
    { id: 'none', label: 'Nothing major right now', desc: 'Full menu. Tell us later in Setup if that changes.' }
  ];
  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const DAY_SHORT = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

  let step = 'welcome'; // welcome | quiz | tutorial | done
  let qi = 0; // quiz question index
  let draft = blank();
  let tutorialI = 0;
  let lastKey = '';

  function blank() {
    return {
      name: '',
      goals: [],
      experience: 'some',
      train: ['mix'],
      sessionLength: 60,
      limitations: [],
      scheduleDays: { mon: 'gym', tue: 'muaythai', wed: 'rest', thu: 'gym', fri: 'gym', sat: 'home', sun: 'home' },
      times: { gym: '05:00', muaythai: '18:00', home: '' },
      goalWeight: '',
      units: 'lb'
    };
  }

  const QUIZ = [
    { id: 'name', title: 'What do we call you?', sub: 'First name is enough. This is your coach screen, not a corporate portal.' },
    { id: 'goals', title: 'What’s the mission?', sub: 'Pick what you’re chasing. More than one is fine — we’ll blend the programming.' },
    { id: 'experience', title: 'Where are you on the road?', sub: 'Be honest. The plan gets heavier or simpler from this.' },
    { id: 'train', title: 'Where do you train?', sub: 'Mount Up mixes commercial gym, home iron, and Muay Thai — not a one-box clone.' },
    { id: 'length', title: 'How long can a gym/home session run?', sub: 'We’ll trim volume to fit. Class days stay light on purpose.' },
    { id: 'limits', title: 'Any no-go zones?', sub: 'Especially back stuff. We’ll build around it — no heroics that wreck tomorrow’s ride.' },
    { id: 'schedule', title: 'Sketch your week', sub: 'Tap each day. You can fine-tune times later in Setup.' },
    { id: 'weight', title: 'Goal weight? (optional)', sub: 'Helps Food targets later. Skip if you’d rather not.' }
  ];

  const TIPS = [
    {
      kicker: 'Today',
      title: 'Your day, one screen',
      body: 'Open Today and you’ll see where you’re training, the lifts, and a progress bar. That’s the dashboard — not a feed.',
      demo: 'today'
    },
    {
      kicker: 'Logging',
      title: 'Tap the circles. Own the set.',
      body: 'Each set is a big circle. Tap when it’s done — rest timer starts itself. Log the weight in the little box so next week you can beat it.',
      demo: 'sets'
    },
    {
      kicker: 'Form',
      title: 'Mannequin demos teach posture',
      body: 'Tap the figure next to a lift. You’ll get an anatomical demo with spine guides and cues — not a random GIF farm.',
      demo: 'form'
    },
    {
      kicker: 'Rest',
      title: 'Rest is part of the work',
      body: 'When a set lands, the rest bar pops up. −15 / +15 / Skip. When it hits zero — go.',
      demo: 'rest'
    },
    {
      kicker: 'Finish',
      title: 'Fill the bar. Close the day.',
      body: 'Warm-up, work, finisher, cool-down. When the bar hits 100%, you mounted up. Come back tomorrow.',
      demo: 'done'
    }
  ];

  function show() {
    html.classList.add('needs-onboard');
    const el = $('#onboardScreen');
    if (el) el.classList.remove('hidden');
    paint();
  }
  function hide() {
    html.classList.remove('needs-onboard');
    const el = $('#onboardScreen');
    if (el) el.classList.add('hidden');
  }

  function needsOnboard() {
    try {
      const st = WO.ui && WO.ui.getState ? WO.ui.getState() : null;
      if (st) return !st.setupDone;
      const raw = LS.get(WO.ns('ronnieWorkout.v1'));
      if (!raw) return true;
      const j = JSON.parse(raw);
      return !(j && j.setupDone);
    } catch (e) { return true; }
  }
  const LS = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }
  };

  function seedDraftFromState() {
    const st = WO.ui && WO.ui.getState ? WO.ui.getState() : null;
    // Only pre-fill answers from a previous onboarding (Redo). Brand-new users start clean, not with hidden defaults.
    if (!st || !st.profile || !st.profile.onboardedAt) return;
    draft.name = st.profile.name || draft.name;
    draft.goals = (st.goals && st.goals.slice()) || [];
    draft.sessionLength = (st.profile && st.profile.sessionLength) || 60;
    draft.units = (st.profile && st.profile.units) || 'lb';
    if (st.profile && st.profile.experience) draft.experience = st.profile.experience;
    if (st.profile && st.profile.limitations) draft.limitations = st.profile.limitations.slice();
    if (st.profile && st.profile.goalWeight) draft.goalWeight = String(st.profile.goalWeight);
    if (st.profile && st.profile.train) draft.train = st.profile.train.slice();
    if (st.schedule) {
      DAYS.forEach(d => { if (st.schedule[d]) draft.scheduleDays[d] = st.schedule[d].type; });
    }
  }

  function paint() {
    const root = $('#onboardBody');
    if (!root) return;
    if (step === 'welcome') root.innerHTML = renderWelcome();
    else if (step === 'quiz') root.innerHTML = renderQuiz();
    else if (step === 'tutorial') root.innerHTML = renderTutorial();
    else root.innerHTML = '';
    // Animate only when the screen changes, not on every tap inside it
    const key = step + ':' + qi + ':' + tutorialI;
    const w = root.firstElementChild;
    if (w && key !== lastKey) w.classList.add('ob-anim');
    if (key !== lastKey) { const sc = $('#onboardScreen'); if (sc) sc.scrollTop = 0; }
    lastKey = key;
    // Mount a tiny mannequin on form tip when available
    if (step === 'tutorial' && TIPS[tutorialI].demo === 'form' && WO.mountDemo && WO.EX_BY_ID && WO.EX_BY_ID.db_rdl) {
      const box = $('#obDemo');
      if (box) WO.mountDemo(box, WO.EX_BY_ID.db_rdl);
    }
  }

  function renderWelcome() {
    return `<div class="ob-wrap ob-welcome">
      <div class="ob-eagle" aria-hidden="true"><svg viewBox="0 0 484 398"><use href="#mu-mark"/></svg></div>
      <div class="ob-kicker">Isaiah 40:31 · biker slang</div>
      <h1 class="ob-word"><svg viewBox="0 0 321 50" role="img" aria-label="Mount Up"><use href="#mu-word"/></svg></h1>
      <p class="ob-tag">Train. Fuel. Rise.</p>
      <div class="ob-card">
        <h2>This isn’t another fitness clone.</h2>
        <p>Mount Up is a coach in your pocket for people who lift at the gym, hit pads at Muay Thai, and still train when they’re home — without pretending life looks like a sterile app demo.</p>
        <ul class="ob-bullets">
          <li><b>Eagle brand</b> — rise with strength, not shame.</li>
          <li><b>Posture-first demos</b> — anatomical mannequins that teach how to stand the weight up.</li>
          <li><b>Real mix</b> — LA Fitness · home iron · Muay Thai, one plan.</li>
          <li><b>Warm, not cheesy</b> — Christian &amp; biker grit without the caption-energy.</li>
          <li><b>Food with flavor</b> — macros that respect Latino plates (coming online as we ship it).</li>
        </ul>
      </div>
      <p class="ob-verse small muted">“They shall mount up with wings as eagles; they shall run, and not be weary.” — also what you say when it’s time to ride.</p>
      <button type="button" class="btn block ob-cta" data-ob="start-quiz">Let’s build your plan</button>
      <button type="button" class="linkbtn ob-skip" data-ob="skip-welcome">I’ve been here — jump to quiz</button>
    </div>`;
  }

  function renderQuiz() {
    const q = QUIZ[qi];
    const pct = Math.round((qi / QUIZ.length) * 100);
    let body = '';
    if (q.id === 'name') {
      body = `<label class="f" for="obName">Name</label>
        <input type="text" id="obName" maxlength="32" placeholder="e.g. Ronnie" value="${esc(draft.name)}" autocomplete="given-name">`;
    } else if (q.id === 'goals') {
      body = `<div class="ob-options">${Object.entries(WO.GOALS).map(([k, g]) =>
        `<button type="button" class="ob-opt ${draft.goals.includes(k) ? 'on' : ''}" data-ob-goal="${k}"><b>${esc(g.label)}</b><span class="small muted">${esc(g.desc)}</span></button>`
      ).join('')}</div>`;
    } else if (q.id === 'experience') {
      body = `<div class="ob-options">${EXP.map(x =>
        `<button type="button" class="ob-opt ${draft.experience === x.id ? 'on' : ''}" data-ob-exp="${x.id}"><b>${esc(x.label)}</b><span class="small muted">${esc(x.desc)}</span></button>`
      ).join('')}</div>`;
    } else if (q.id === 'train') {
      body = `<div class="ob-options">${LOC_OPTS.map(x =>
        `<button type="button" class="ob-opt ${draft.train.includes(x.id) ? 'on' : ''}" data-ob-train="${x.id}"><b>${esc(x.label)}</b><span class="small muted">${esc(x.hint)}</span></button>`
      ).join('')}</div>
      <p class="small muted" style="margin-top:8px">Pick one primary, or “A mix” for the full week template.</p>`;
    } else if (q.id === 'length') {
      body = `<div class="seg ob-seg">${[30, 45, 60, 75, 90].map(m =>
        `<button type="button" class="${+draft.sessionLength === m ? 'on' : ''}" data-ob-len="${m}">${m}m</button>`
      ).join('')}</div>
      <p class="small muted" style="margin-top:10px">Muay Thai class days stay short on purpose — this is for gym/home lifting blocks.</p>`;
    } else if (q.id === 'limits') {
      body = `<div class="ob-options">${LIMS.map(x =>
        `<button type="button" class="ob-opt ${draft.limitations.includes(x.id) ? 'on' : ''}" data-ob-lim="${x.id}"><b>${esc(x.label)}</b><span class="small muted">${esc(x.desc)}</span></button>`
      ).join('')}</div>`;
    } else if (q.id === 'schedule') {
      const types = [['gym', 'Gym'], ['home', 'Home'], ['muaythai', 'MT'], ['rest', 'Rest'], ['off', 'Off']];
      body = `<div class="ob-sched">${DAYS.map(d => {
        const t = draft.scheduleDays[d];
        return `<div class="ob-sched-row"><div class="d">${DAY_SHORT[d]}</div>
          <div class="seg ob-seg-sm">${types.map(([v, l]) =>
            `<button type="button" class="${t === v ? 'on' : ''}" data-ob-day="${d}" data-ob-dtype="${v}">${l}</button>`
          ).join('')}</div></div>`;
      }).join('')}</div>
      <div class="row" style="margin-top:12px;gap:8px">
        <div class="grow"><label class="f">Gym time (optional)</label><input type="time" id="obGymTime" value="${esc(draft.times.gym || '')}"></div>
        <div class="grow"><label class="f">Muay Thai time</label><input type="time" id="obMtTime" value="${esc(draft.times.muaythai || '')}"></div>
      </div>
      <button type="button" class="btn sm ghost" style="margin-top:10px" data-ob="sched-preset">Use Mount Up default week</button>`;
    } else if (q.id === 'weight') {
      body = `<div class="row">
        <div class="grow"><label class="f">Goal weight</label><input type="number" id="obGoalWt" inputmode="decimal" step="0.5" placeholder="Optional" value="${esc(draft.goalWeight)}"></div>
        <div style="width:110px"><label class="f">Units</label><select id="obUnits">${['lb', 'kg'].map(u => `<option ${draft.units === u ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
      </div>
      <p class="small muted" style="margin-top:8px">You can change this anytime in Food → Goals.</p>`;
    }

    const canNext = quizValid();
    return `<div class="ob-wrap ob-quiz">
      <div class="ob-progress"><div style="width:${pct}%"></div></div>
      <div class="ob-step-meta"><span class="tag">Question ${qi + 1} of ${QUIZ.length}</span></div>
      <h1>${esc(q.title)}</h1>
      <p class="ob-sub">${esc(q.sub)}</p>
      <div class="ob-qbody">${body}</div>
      <div class="ob-nav">
        <button type="button" class="btn ghost" data-ob="quiz-back" ${qi === 0 ? 'disabled' : ''}>Back</button>
        <button type="button" class="btn" data-ob="quiz-next" ${canNext ? '' : 'disabled'}>${qi === QUIZ.length - 1 ? 'Build my plan' : 'Next'}</button>
      </div>
    </div>`;
  }

  function quizValid() {
    const q = QUIZ[qi];
    if (q.id === 'name') return !!(draft.name && draft.name.trim());
    if (q.id === 'goals') return draft.goals.length > 0;
    if (q.id === 'train') return draft.train.length > 0;
    if (q.id === 'limits') return draft.limitations.length > 0;
    return true;
  }

  function renderTutorial() {
    const t = TIPS[tutorialI];
    const pct = Math.round(((tutorialI) / TIPS.length) * 100);
    let visual = '';
    if (t.demo === 'today') {
      visual = `<div class="ob-vis hero gym"><div class="row between"><span class="tag">Good morning, ${esc(draft.name || 'rider')}</span><span class="pill gym">LA Fitness · 5am</span></div>
        <h2 style="margin-top:6px">Full Body A</h2>
        <div class="stats"><div><b>7</b>exercises</div><div><b>~60</b>min</div><div><b>0/18</b>sets</div></div>
        <div class="progress"><div style="width:8%"></div></div></div>`;
    } else if (t.demo === 'sets') {
      visual = `<div class="ob-vis card" style="margin:0"><div class="ex-name">Dumbbell RDL</div>
        <div class="ex-presc"><b>3 × 8–12</b> · rest 1:30</div>
        <div class="sets" style="pointer-events:none"><button class="set on">✓</button><button class="set on">✓</button><button class="set">3</button></div>
        <div class="small muted" style="margin-top:8px">Tap set 3 when you finish — rest clocks in.</div></div>`;
    } else if (t.demo === 'form') {
      visual = `<div class="ob-vis demo" id="obDemo" style="margin:0"></div>
        <div class="small muted" style="margin-top:6px;text-align:center">Neutral spine · hip hinge · glutes &amp; hammies lit up</div>`;
    } else if (t.demo === 'rest') {
      visual = `<div class="ob-vis ob-restfake"><div class="rest-ring"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" class="ring-bg"/><circle cx="18" cy="18" r="15.5" class="ring-fg" style="stroke-dashoffset:40"/></svg></div>
        <div><div class="rest-label">Rest</div><div class="rest-time">1:12</div></div>
        <span class="btn sm ghost">−15</span><span class="btn sm ghost">+15</span><span class="btn sm">Skip</span></div>`;
    } else {
      visual = `<div class="ob-vis hero gym"><div class="row between"><span class="tag">Session locked in</span><span class="pill rest">Done</span></div>
        <h2 style="margin-top:6px">You mounted up.</h2>
        <div class="progress"><div style="width:100%"></div></div>
        <p class="small muted" style="margin-top:8px">Come back tomorrow. Same eagle. Fresh work.</p></div>`;
    }
    return `<div class="ob-wrap ob-tutorial">
      <div class="ob-progress"><div style="width:${pct}%"></div></div>
      <div class="tag">${esc(t.kicker)} · tip ${tutorialI + 1}/${TIPS.length}</div>
      <h1>${esc(t.title)}</h1>
      <p class="ob-sub">${esc(t.body)}</p>
      ${visual}
      <div class="ob-nav">
        <button type="button" class="btn ghost" data-ob="tut-back" ${tutorialI === 0 ? 'disabled' : ''}>Back</button>
        <button type="button" class="btn" data-ob="tut-next">${tutorialI === TIPS.length - 1 ? 'Take me to Today' : 'Got it'}</button>
      </div>
      <button type="button" class="linkbtn" data-ob="tut-skip" style="display:block;margin:8px auto;text-align:center">Skip tutorial</button>
    </div>`;
  }

  function applySchedulePreset() {
    const train = draft.train;
    const has = id => train.includes('mix') || train.includes(id);
    const gym = has('gym'), home = has('home'), mt = has('muaythai');
    if (train.includes('mix') || (gym && home && mt)) {
      draft.scheduleDays = { mon: 'gym', tue: 'muaythai', wed: 'rest', thu: 'gym', fri: 'gym', sat: 'home', sun: 'home' };
    } else if (gym && mt && !home) {
      draft.scheduleDays = { mon: 'gym', tue: 'muaythai', wed: 'gym', thu: 'muaythai', fri: 'gym', sat: 'rest', sun: 'off' };
    } else if (gym && home && !mt) {
      draft.scheduleDays = { mon: 'gym', tue: 'home', wed: 'rest', thu: 'gym', fri: 'gym', sat: 'home', sun: 'off' };
    } else if (mt && !gym && !home) {
      draft.scheduleDays = { mon: 'rest', tue: 'muaythai', wed: 'home', thu: 'muaythai', fri: 'rest', sat: 'muaythai', sun: 'home' };
    } else if (home && !gym && !mt) {
      draft.scheduleDays = { mon: 'home', tue: 'home', wed: 'rest', thu: 'home', fri: 'home', sat: 'home', sun: 'off' };
    } else if (gym && !home && !mt) {
      draft.scheduleDays = { mon: 'gym', tue: 'rest', wed: 'gym', thu: 'rest', fri: 'gym', sat: 'off', sun: 'off' };
    } else {
      draft.scheduleDays = { mon: 'gym', tue: 'muaythai', wed: 'rest', thu: 'gym', fri: 'gym', sat: 'home', sun: 'home' };
    }
  }

  function readOpenFields() {
    const n = $('#obName'); if (n) draft.name = n.value.trim();
    const g = $('#obGymTime'); if (g) draft.times.gym = g.value;
    const m = $('#obMtTime'); if (m) draft.times.muaythai = m.value;
    const w = $('#obGoalWt'); if (w) draft.goalWeight = w.value.trim();
    const u = $('#obUnits'); if (u) draft.units = u.value;
  }

  function commitPlan() {
    if (!WO.ui || !WO.ui.applyOnboarding) return;
    WO.ui.applyOnboarding({
      name: draft.name.trim() || 'Athlete',
      goals: draft.goals.length ? draft.goals.slice() : ['general'],
      experience: draft.experience,
      train: draft.train.slice(),
      sessionLength: +draft.sessionLength || 60,
      limitations: draft.limitations.filter(x => x !== 'none'),
      scheduleDays: Object.assign({}, draft.scheduleDays),
      times: Object.assign({}, draft.times),
      goalWeight: draft.goalWeight ? +draft.goalWeight : null,
      units: draft.units || 'lb',
      tutorialDone: true
    });
  }

  function finish() {
    commitPlan();
    if (WO.onOnboarded) try { WO.onOnboarded(); } catch (e) { /* ignore */ }
    hide();
    location.hash = '#today';
    if (WO.ui && WO.ui.rerender) WO.ui.rerender();
  }

  document.addEventListener('click', e => {
    const t = e.target;
    const ob = t.closest('[data-ob]');
    if (ob) {
      const a = ob.dataset.ob;
      if (a === 'start-quiz' || a === 'skip-welcome') { step = 'quiz'; qi = 0; paint(); return; }
      if (a === 'quiz-back') { readOpenFields(); if (qi > 0) { qi--; paint(); } return; }
      if (a === 'quiz-next') {
        readOpenFields();
        if (!quizValid()) return;
        if (QUIZ[qi].id === 'train') applySchedulePreset();
        if (qi < QUIZ.length - 1) { qi++; paint(); }
        else { step = 'tutorial'; tutorialI = 0; paint(); }
        return;
      }
      if (a === 'sched-preset') { applySchedulePreset(); paint(); return; }
      if (a === 'tut-back') { if (tutorialI > 0) { tutorialI--; paint(); } return; }
      if (a === 'tut-next') {
        if (tutorialI < TIPS.length - 1) { tutorialI++; paint(); }
        else finish();
        return;
      }
      if (a === 'tut-skip') { finish(); return; }
    }
    const g = t.closest('[data-ob-goal]');
    if (g) {
      const k = g.dataset.obGoal;
      draft.goals = draft.goals.includes(k) ? draft.goals.filter(x => x !== k) : draft.goals.concat(k);
      paint(); return;
    }
    const ex = t.closest('[data-ob-exp]');
    if (ex) { draft.experience = ex.dataset.obExp; paint(); return; }
    const tr = t.closest('[data-ob-train]');
    if (tr) {
      const id = tr.dataset.obTrain;
      if (id === 'mix') draft.train = ['mix'];
      else {
        draft.train = draft.train.filter(x => x !== 'mix');
        draft.train = draft.train.includes(id) ? draft.train.filter(x => x !== id) : draft.train.concat(id);
        if (!draft.train.length) draft.train = [id];
      }
      paint(); return;
    }
    const len = t.closest('[data-ob-len]');
    if (len) { draft.sessionLength = +len.dataset.obLen; paint(); return; }
    const lim = t.closest('[data-ob-lim]');
    if (lim) {
      const id = lim.dataset.obLim;
      if (id === 'none') draft.limitations = ['none'];
      else {
        draft.limitations = draft.limitations.filter(x => x !== 'none');
        draft.limitations = draft.limitations.includes(id) ? draft.limitations.filter(x => x !== id) : draft.limitations.concat(id);
        if (!draft.limitations.length) draft.limitations = ['none'];
      }
      paint(); return;
    }
    const day = t.closest('[data-ob-day]');
    if (day) { draft.scheduleDays[day.dataset.obDay] = day.dataset.obDtype; paint(); return; }
  });

  document.addEventListener('input', e => {
    if (e.target.id === 'obName') {
      draft.name = e.target.value;
      const btn = $('[data-ob="quiz-next"]');
      if (btn) btn.disabled = !quizValid();
    }
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'obGymTime') draft.times.gym = e.target.value;
    if (e.target.id === 'obMtTime') draft.times.muaythai = e.target.value;
    if (e.target.id === 'obGoalWt') draft.goalWeight = e.target.value.trim();
    if (e.target.id === 'obUnits') draft.units = e.target.value;
  });

  function start(opts) {
    opts = opts || {};
    draft = blank();
    seedDraftFromState();
    step = opts.step || 'welcome';
    qi = 0;
    tutorialI = 0;
    lastKey = '';
    if (opts.quizOnly) { step = 'quiz'; }
    show();
  }

  function maybeStart() {
    // Don't fight the auth gate
    if (html.classList.contains('needs-auth') || html.classList.contains('auth-open')) return false;
    if (/^#admin/.test(location.hash)) return false; // admin (desktop) shouldn't be blocked by the phone flow
    if (!needsOnboard()) return false;
    start();
    return true;
  }

  // After auth closes / guest continues, kick onboarding if needed
  const obs = new MutationObserver(() => {
    if (html.classList.contains('needs-onboard')) return;
    if (html.classList.contains('needs-auth') || html.classList.contains('auth-open')) return;
    if (/^#admin/.test(location.hash)) return;
    if (needsOnboard()) start();
  });
  obs.observe(html, { attributes: true, attributeFilter: ['class'] });

  WO.onboard = { start, maybeStart, needsOnboard, show, hide, isOpen: () => html.classList.contains('needs-onboard') };

  // Boot after app.js exposes WO.ui
  setTimeout(() => { maybeStart(); }, 0);
})();
