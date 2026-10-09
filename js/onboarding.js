/* Phase 1 onboarding: Welcome → Quiz → Tutorial. Mount Up voice — eagle brand, warm coach energy, for anyone in fitness or getting into it. */
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
  // Seed list for the gym picker. Typing anything not listed adds it as a custom gym.
  // TODO(follow-up): pull nearby gyms by location (needs a places API + key).
  const GYM_LIST = [
    'LA Fitness', 'Planet Fitness', 'Fusion Gyms', 'Anytime Fitness', 'Equinox', 'Gold’s Gym', '24 Hour Fitness',
    'Crunch Fitness', 'Life Time', 'YMCA', 'EōS Fitness', 'Chuze Fitness', 'Snap Fitness', 'Blink Fitness',
    'Workout Anytime', 'Esporta Fitness', 'Retro Fitness', 'UFC Gym', 'CrossFit box', 'Orangetheory',
    'Apartment / building gym', 'School / campus gym', 'Work gym'
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
      gyms: [],
      homeGym: false,
      sessionLength: 60,
      limitations: [],
      scheduleDays: { mon: 'gym', tue: 'rest', wed: 'gym', thu: 'rest', fri: 'gym', sat: 'off', sun: 'off' },
      dayTimes: { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
      goalWeight: '',
      units: 'lb'
    };
  }

  const QUIZ = [
    { id: 'name', title: 'What do we call you?', sub: 'First name is enough. This is your coach screen, not a corporate portal.' },
    { id: 'goals', title: 'What’s the mission?', sub: 'Pick what you’re chasing. More than one is fine — we’ll blend the programming.' },
    { id: 'experience', title: 'Where are you on the road?', sub: 'Be honest. The plan gets heavier or simpler from this.' },
    { id: 'train', title: 'Where do you train?', sub: 'Pick your gym (or a few), add your home setup, or both. We build around the equipment you actually have.' },
    { id: 'length', title: 'How long can a session run?', sub: 'We’ll trim volume to fit your window.' },
    { id: 'limits', title: 'Any no-go zones?', sub: 'Especially back stuff. We’ll build around it — no heroics that wreck tomorrow.' },
    { id: 'schedule', title: 'Sketch your week', sub: 'Tap each day, then set the time you’ll train. 5am Monday, noon Tuesday — whatever your week looks like.' },
    { id: 'weight', title: 'Goal weight?', sub: 'This is the target line on your weight chart. You can change it anytime in Setup.' }
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
    const train = (st.profile && st.profile.train) || [];
    if (Array.isArray(st.profile.gyms)) draft.gyms = st.profile.gyms.slice();
    else if ((train.includes('gym') || train.includes('mix')) && st.locations && st.locations.gym) draft.gyms = [st.locations.gym.name];
    draft.homeGym = typeof st.profile.homeGym === 'boolean' ? st.profile.homeGym : (train.includes('home') || train.includes('mix'));
    if (st.schedule) {
      DAYS.forEach(d => {
        const s = st.schedule[d]; if (!s) return;
        // Legacy class days (pre-v16) come back as active recovery; the quiz no longer offers them.
        draft.scheduleDays[d] = ['gym', 'home', 'rest', 'off'].includes(s.type) ? s.type : 'rest';
        draft.dayTimes[d] = ['gym', 'home'].includes(draft.scheduleDays[d]) ? (s.time || '') : '';
      });
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
      <div class="ob-kicker">Your coach in your pocket</div>
      <h1 class="ob-word"><svg viewBox="0 0 321 50" role="img" aria-label="Mount Up"><use href="#mu-word"/></svg></h1>
      <p class="ob-tag">Train. Fuel. Rise.</p>
      <div class="ob-card">
        <h2>This isn’t another fitness clone.</h2>
        <p>Mount Up is a coach in your pocket for people who lift at the gym, train at home, or are just getting started. Ditch the notebook. Stop googling your next workout between sets. Walk in knowing exactly what to do — and watch yourself get stronger.</p>
        <ul class="ob-bullets">
          <li><b>Eagle brand</b> — rise with strength, not shame.</li>
          <li><b>Posture-first demos</b> — anatomical mannequins that teach how to stand the weight up.</li>
          <li><b>Your gym, your way</b> — any gym, your home setup, or both. One plan built around your equipment and your week.</li>
          <li><b>Warm, not cheesy</b> — real coach energy for first-timers and veterans alike.</li>
          <li><b>Track what matters</b> — every set, every weigh-in, and food that fits the way you actually eat.</li>
        </ul>
      </div>
      <p class="ob-verse small muted">“They shall mount up with wings as eagles; they shall run, and not be weary.”</p>
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
        <input type="text" id="obName" maxlength="32" placeholder="e.g. Alex" value="${esc(draft.name)}" autocomplete="given-name">`;
    } else if (q.id === 'goals') {
      body = `<div class="ob-options">${Object.entries(WO.GOALS).map(([k, g]) =>
        `<button type="button" class="ob-opt ${draft.goals.includes(k) ? 'on' : ''}" data-ob-goal="${k}"><b>${esc(g.label)}</b><span class="small muted">${esc(g.desc)}</span></button>`
      ).join('')}</div>`;
    } else if (q.id === 'experience') {
      body = `<div class="ob-options">${EXP.map(x =>
        `<button type="button" class="ob-opt ${draft.experience === x.id ? 'on' : ''}" data-ob-exp="${x.id}"><b>${esc(x.label)}</b><span class="small muted">${esc(x.desc)}</span></button>`
      ).join('')}</div>`;
    } else if (q.id === 'train') {
      body = `<button type="button" class="ob-opt ${draft.homeGym ? 'on' : ''}" data-ob="toggle-home"><b>🏠 Home gym</b><span class="small muted">Dumbbells, bands, whatever you’ve got. Fine-tune equipment in Setup.</span></button>
        <label class="f" for="obGymSearch" style="margin-top:14px">Your gym</label>
        <input type="search" id="obGymSearch" placeholder="Search gyms — LA Fitness, Planet Fitness…" autocomplete="off" enterkeyhint="done">
        <div class="ob-gym-picked" id="obGymPicked">${gymPickedHtml()}</div>
        <div class="ob-gym-results" id="obGymResults">${gymResultsHtml('')}</div>`;
    } else if (q.id === 'length') {
      body = `<div class="seg ob-seg">${[30, 45, 60, 75, 90].map(m =>
        `<button type="button" class="${+draft.sessionLength === m ? 'on' : ''}" data-ob-len="${m}">${m}m</button>`
      ).join('')}</div>
      <p class="small muted" style="margin-top:10px">Short on time? 30 minutes done well still moves the needle.</p>`;
    } else if (q.id === 'limits') {
      body = `<div class="ob-options">${LIMS.map(x =>
        `<button type="button" class="ob-opt ${draft.limitations.includes(x.id) ? 'on' : ''}" data-ob-lim="${x.id}"><b>${esc(x.label)}</b><span class="small muted">${esc(x.desc)}</span></button>`
      ).join('')}</div>`;
    } else if (q.id === 'schedule') {
      const types = [['gym', 'Gym'], ['home', 'Home'], ['rest', 'Rest'], ['off', 'Off']]
        .filter(([v]) => (v !== 'gym' || draft.gyms.length || !draft.homeGym) && (v !== 'home' || draft.homeGym || !draft.gyms.length));
      body = `<div class="ob-sched">${DAYS.map(d => {
        const t = draft.scheduleDays[d];
        const trains = t === 'gym' || t === 'home';
        return `<div class="ob-sched-row"><div class="d">${DAY_SHORT[d]}</div>
          <div class="seg ob-seg-sm">${types.map(([v, l]) =>
            `<button type="button" class="${t === v ? 'on' : ''}" data-ob-day="${d}" data-ob-dtype="${v}">${l}</button>`
          ).join('')}</div>
          ${trains ? `<input type="time" class="ob-day-time" data-ob-time="${d}" value="${esc(draft.dayTimes[d] || '')}" aria-label="${DAY_SHORT[d]} training time">` : ''}</div>`;
      }).join('')}</div>
      <p class="small muted" style="margin-top:8px">Times are optional — they show on your Today screen.</p>
      <button type="button" class="btn sm ghost" style="margin-top:10px" data-ob="sched-preset">Use Mount Up default week</button>`;
    } else if (q.id === 'weight') {
      body = `<div class="row">
        <div class="grow"><label class="f">Goal weight</label><input type="number" id="obGoalWt" inputmode="decimal" step="0.5" placeholder="Required" required value="${esc(draft.goalWeight)}"></div>
        <div style="width:110px"><label class="f">Units</label><select id="obUnits">${['lb', 'kg'].map(u => `<option ${draft.units === u ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
      </div>
      <p class="small muted" style="margin-top:8px">Log weigh-ins in Food → Weekly &amp; weight to see your trend against this goal.</p>`;
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
    if (q.id === 'train') return draft.gyms.length > 0 || draft.homeGym;
    if (q.id === 'limits') return draft.limitations.length > 0;
    if (q.id === 'weight') return goalWeightOk();
    return true;
  }

  function goalWeightOk() {
    const v = +draft.goalWeight;
    const [lo, hi] = draft.units === 'kg' ? [25, 320] : [50, 700];
    return draft.goalWeight !== '' && isFinite(v) && v >= lo && v <= hi;
  }

  // Derived for the planner/app: which location types this person trains at.
  function trainFromDraft() {
    const t = [];
    if (draft.gyms.length) t.push('gym');
    if (draft.homeGym) t.push('home');
    return t.length ? t : ['gym'];
  }

  function gymPickedHtml() {
    if (!draft.gyms.length) return '';
    return draft.gyms.map(g => `<button type="button" class="ob-chip on" data-ob-gym="${esc(g)}" aria-label="Remove ${esc(g)}">${esc(g)} <span aria-hidden="true">✕</span></button>`).join('');
  }
  function gymResultsHtml(q) {
    q = String(q || '').trim();
    const ql = q.toLowerCase();
    const list = GYM_LIST.filter(g => !draft.gyms.includes(g) && (!ql || g.toLowerCase().includes(ql)));
    const exact = GYM_LIST.concat(draft.gyms).some(g => g.toLowerCase() === ql);
    let h = list.slice(0, ql ? 8 : 6).map(g => `<button type="button" class="ob-chip" data-ob-gym="${esc(g)}">+ ${esc(g)}</button>`).join('');
    if (q && !exact) h += `<button type="button" class="ob-chip add" data-ob-gym="${esc(q.slice(0, 40))}">+ Add “${esc(q.slice(0, 40))}”</button>`;
    if (!q) h += `<div class="small muted" style="width:100%;margin-top:4px">Don’t see yours? Type the name and tap “Add”.</div>`;
    return h;
  }
  function refreshGymUi() {
    const s = $('#obGymSearch');
    const p = $('#obGymPicked'); if (p) p.innerHTML = gymPickedHtml();
    const r = $('#obGymResults'); if (r) r.innerHTML = gymResultsHtml(s ? s.value : '');
    const btn = $('[data-ob="quiz-next"]'); if (btn) btn.disabled = !quizValid();
  }

  function renderTutorial() {
    const t = TIPS[tutorialI];
    const pct = Math.round(((tutorialI) / TIPS.length) * 100);
    let visual = '';
    if (t.demo === 'today') {
      visual = `<div class="ob-vis hero gym"><div class="row between"><span class="tag">Good morning, ${esc(draft.name || 'athlete')}</span><span class="pill gym">${esc(draft.gyms[0] || (draft.homeGym ? 'Home gym' : 'Your gym'))} · 5am</span></div>
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
    const gym = draft.gyms.length > 0, home = draft.homeGym;
    if (gym && home) draft.scheduleDays = { mon: 'gym', tue: 'home', wed: 'rest', thu: 'gym', fri: 'gym', sat: 'home', sun: 'off' };
    else if (home) draft.scheduleDays = { mon: 'home', tue: 'home', wed: 'rest', thu: 'home', fri: 'home', sat: 'home', sun: 'off' };
    else draft.scheduleDays = { mon: 'gym', tue: 'rest', wed: 'gym', thu: 'rest', fri: 'gym', sat: 'off', sun: 'off' };
    DAYS.forEach(d => { if (!['gym', 'home'].includes(draft.scheduleDays[d])) draft.dayTimes[d] = ''; });
  }

  // Keep a seeded/edited week if it still matches where they train; otherwise rebuild it.
  function scheduleFits() {
    return DAYS.every(d => { const t = draft.scheduleDays[d]; return (t !== 'gym' || draft.gyms.length) && (t !== 'home' || draft.homeGym); });
  }

  function readOpenFields() {
    const n = $('#obName'); if (n) draft.name = n.value.trim();
    $$('[data-ob-time]').forEach(i => { draft.dayTimes[i.dataset.obTime] = i.value; });
    const w = $('#obGoalWt'); if (w) draft.goalWeight = w.value.trim();
    const u = $('#obUnits'); if (u) draft.units = u.value;
  }

  function commitPlan() {
    if (!WO.ui || !WO.ui.applyOnboarding) return;
    WO.ui.applyOnboarding({
      name: draft.name.trim() || 'Athlete',
      goals: draft.goals.length ? draft.goals.slice() : ['general'],
      experience: draft.experience,
      train: trainFromDraft(),
      gyms: draft.gyms.slice(),
      homeGym: !!draft.homeGym,
      sessionLength: +draft.sessionLength || 60,
      limitations: draft.limitations.filter(x => x !== 'none'),
      scheduleDays: Object.assign({}, draft.scheduleDays),
      dayTimes: Object.assign({}, draft.dayTimes),
      goalWeight: +draft.goalWeight,
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
        if (QUIZ[qi].id === 'train' && !scheduleFits()) applySchedulePreset();
        if (qi < QUIZ.length - 1) { qi++; paint(); }
        else { step = 'tutorial'; tutorialI = 0; paint(); }
        return;
      }
      if (a === 'sched-preset') { applySchedulePreset(); paint(); return; }
      if (a === 'toggle-home') { draft.homeGym = !draft.homeGym; ob.classList.toggle('on', draft.homeGym); refreshGymUi(); return; }
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
    const gb = t.closest('[data-ob-gym]');
    if (gb) {
      const name = gb.dataset.obGym;
      if (draft.gyms.includes(name)) draft.gyms = draft.gyms.filter(x => x !== name);
      else if (draft.gyms.length < 5) { draft.gyms = draft.gyms.concat(name); const s = $('#obGymSearch'); if (s) s.value = ''; }
      refreshGymUi(); return;
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
    if (day) {
      readOpenFields();
      const d = day.dataset.obDay, typ = day.dataset.obDtype;
      draft.scheduleDays[d] = typ;
      if (!['gym', 'home'].includes(typ)) draft.dayTimes[d] = '';
      paint(); return;
    }
  });

  document.addEventListener('input', e => {
    if (e.target.id === 'obName' || e.target.id === 'obGoalWt') {
      if (e.target.id === 'obName') draft.name = e.target.value;
      else draft.goalWeight = e.target.value.trim();
      const btn = $('[data-ob="quiz-next"]');
      if (btn) btn.disabled = !quizValid();
    }
    if (e.target.id === 'obGymSearch') { const r = $('#obGymResults'); if (r) r.innerHTML = gymResultsHtml(e.target.value); }
  });
  document.addEventListener('change', e => {
    if (e.target.dataset && e.target.dataset.obTime) draft.dayTimes[e.target.dataset.obTime] = e.target.value;
    if (e.target.id === 'obGoalWt') draft.goalWeight = e.target.value.trim();
    if (e.target.id === 'obUnits') { draft.units = e.target.value; const btn = $('[data-ob="quiz-next"]'); if (btn) btn.disabled = !quizValid(); }
  });
  // Enter in the gym search adds the top match (or the typed name)
  document.addEventListener('keydown', e => {
    if (e.target.id !== 'obGymSearch' || e.key !== 'Enter') return;
    e.preventDefault();
    const first = $('#obGymResults [data-ob-gym]');
    if (e.target.value.trim() && first) first.click();
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
