(function () {
  const hamburger = document.getElementById('navHamburger');
  const mobileMenu = document.getElementById('navMobileMenu');
  if (!hamburger || !mobileMenu) return;
  hamburger.addEventListener('click', function () {
    const isOpen = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });
})();

(function () {
  const API = 'https://api.frostclient.eu/staff-test/';
  const TOKEN_KEY = 'frostToken';
  const OAUTH_STATE_KEY = 'frostStaffOauthState';
  const INTENT_KEY = 'frostStaffTestIntent';
  const DRAFT_PREFIX = 'frostStaffTestDraft:';
  const DISCORD_CLIENT_ID = '1512834635640475898';
  const REDIRECT_URI = 'https://frostclient.eu/staff';
  const FIELDS = {
    age: ['How old are you?', 'e.g. 19', false],
    timezone: ["Timezone & when you're usually online", 'e.g. CET, evenings & weekends', false],
    hoursPerWeek: ['Hours per week you can dedicate', 'e.g. 10-15 hours', false],
    experience: ['Previous moderation / staff experience', 'Where, for how long, what you did...', true],
    why: ['Why do you want to join the FrostClient team?', 'Tell us in your own words...', true],
    launcherKnowledge: ['Do you know your way around the Frost Launcher? Could you guide a player to their logs, instance settings or mods?', 'How long you have used it and what you know how to do in it...', true],
    conflictScenario: ['Two members start arguing and spamming in chat. What do you do?', 'Walk us through it step by step...', true],
    extra: ['Anything else we should know about you?', 'Optional', true, true]
  };
  const BASE_STEPS = [
    { id: 'about', group: 'About you', title: 'About you', intro: 'A few basics so we know when you can help out.', fields: ['age', 'timezone', 'hoursPerWeek'] },
    { id: 'experience', group: 'Experience', title: 'Your experience', intro: 'Moderation, support or community work you have done before. No experience is fine, just be honest.', fields: ['experience', 'why', 'launcherKnowledge'] },
    { id: 'scenario', group: 'Moderation', title: 'Moderation scenario', intro: 'There is no single right answer here. We want to see how you think.', fields: ['conflictScenario', 'extra'] }
  ];
  const gate = document.getElementById('saGate');
  const testEl = document.getElementById('saTest');
  const resultEl = document.getElementById('saResult');
  const stepsEl = document.getElementById('saSteps');
  const panelsEl = document.getElementById('saPanels');
  const prevBtn = document.getElementById('saPrev');
  const nextBtn = document.getElementById('saNext');
  const progressEl = document.getElementById('saProgress');
  let state = null;
  let session = null;
  let steps = [];
  let current = 0;
  let draft = { answers: {}, choices: {}, step: 0 };
  let timer = null;
  let busy = false;

  function token() {
    try {
      return localStorage.getItem(TOKEN_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function show(name) {
    gate.hidden = !name;
    gate.querySelectorAll('.sa-state').forEach(function (el) { el.classList.toggle('active', el.dataset.state === name); });
    if (name) {
      testEl.hidden = true;
      resultEl.hidden = true;
    }
  }

  function fmtDate(ms) {
    try {
      return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return '';
    }
  }

  function error(msg) {
    document.getElementById('saErrorText').textContent = msg;
    show('error');
  }

  function api(path, body) {
    const opts = body
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ staffToken: token() }, body)) }
      : { headers: { Authorization: 'Bearer ' + token() }, cache: 'no-store' };
    return fetch(API + path, opts).then(function (r) { return r.json(); });
  }

  function fillRules(s) {
    const set = function (cls, v) { document.querySelectorAll(cls).forEach(function (el) { el.textContent = v; }); };
    set('.js-session-hours', s.sessionHours);
    set('.js-question-count', s.questionCount);
    set('.js-attempts-max', s.attemptsMax);
    set('.js-lock-days', s.lockDays);
    set('.js-pass', Math.ceil(s.questionCount * s.passPercent / 100) + ' of ' + s.questionCount);
  }

  function handleState(s) {
    if (!s || !s.ok) {
      if (s && s.error === 'token_expired') {
        try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
        return show('signed-out');
      }
      return error("Couldn't load your application. Please try again.");
    }
    state = s;
    fillRules(s);
    if (s.status === 'active') return openSession(s.session);
    stopTimer();
    if (s.status === 'cooldown') {
      document.getElementById('saRetryDate').textContent = fmtDate(s.retryAt);
      const r = document.getElementById('saDenyReason');
      r.hidden = !s.denyReason;
      r.textContent = s.denyReason ? 'Reason: ' + s.denyReason : '';
    }
    if (s.status === 'banned') {
      const r = document.getElementById('saBanReason');
      r.hidden = !s.banReason;
      r.textContent = s.banReason ? 'Reason: ' + s.banReason : '';
    }
    if (s.status === 'locked') document.getElementById('saLockedDate').textContent = fmtDate(s.lockedUntil);
    if (s.status === 'ready') {
      const info = document.getElementById('saAttemptsInfo');
      const left = s.attemptsMax - s.attemptsUsed;
      info.hidden = !s.attemptsUsed;
      info.textContent = s.lastResult && s.lastResult.expired ? 'Your last test ran out of time. You have ' + left + (left === 1 ? ' attempt' : ' attempts') + ' left.' : 'You have ' + left + (left === 1 ? ' attempt' : ' attempts') + ' left.';
    }
    show(s.status);
  }

  function load() {
    if (!token()) return show('signed-out');
    show('loading');
    api('state').then(handleState).catch(function () { error('Network error. Please check your connection and try again.'); });
  }

  function start() {
    if (busy) return;
    busy = true;
    show('loading');
    api('start', {}).then(function (r) {
      busy = false;
      if (r && r.error === 'not_member') return show('not-member');
      if (r && r.error && r.error !== 'token_expired' && r.status) return handleState(Object.assign({}, r, { ok: true }));
      handleState(r);
    }).catch(function () {
      busy = false;
      error('Network error. Please try again.');
    });
  }

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_PREFIX + session.id, JSON.stringify(draft));
    } catch (e) {}
  }

  function loadDraft(id) {
    try {
      Object.keys(localStorage).forEach(function (k) { if (k.indexOf(DRAFT_PREFIX) === 0 && k !== DRAFT_PREFIX + id) localStorage.removeItem(k); });
      const d = JSON.parse(localStorage.getItem(DRAFT_PREFIX + id) || 'null');
      if (d && d.answers && d.choices) return d;
    } catch (e) {}
    return { answers: {}, choices: {}, step: 0 };
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function lineLevel(line) {
    if (/\/(ERROR|FATAL)\]|^#\s+EXCEPTION_|^Exception in thread|^Caused by:|Error occurred during|Could not reserve|^java\.lang\.\w+(Error|Exception)|FormattedException|crashed/i.test(line)) return 'err';
    if (/\/WARN\]|warning:/i.test(line)) return 'warn';
    return '';
  }

  function buildLog(q) {
    const wrap = el('div', 'sa-log');
    const head = el('div', 'sa-log-head');
    head.appendChild(el('span', 'sa-log-file', q.logName));
    const lines = q.log.split('\n');
    head.appendChild(el('span', 'sa-log-count', lines.length + ' lines'));
    wrap.appendChild(head);
    const body = el('div', 'sa-log-body');
    body.setAttribute('tabindex', '0');
    body.setAttribute('aria-label', 'Log file ' + q.logName);
    lines.forEach(function (line, i) {
      const row = el('div', 'sa-log-line' + (lineLevel(line) ? ' is-' + lineLevel(line) : ''));
      row.appendChild(el('span', 'sa-log-no', String(i + 1)));
      row.appendChild(el('span', 'sa-log-text', line || ' '));
      body.appendChild(row);
    });
    wrap.appendChild(body);
    return wrap;
  }

  function buildFieldPanel(step) {
    const panel = el('div', 'sa-panel');
    panel.appendChild(el('h2', 'sa-panel-title', step.title));
    panel.appendChild(el('p', 'sa-panel-intro', step.intro));
    step.fields.forEach(function (key) {
      const f = FIELDS[key];
      const wrap = el('label', 'sa-field');
      const label = el('span', 'sa-field-label', f[0]);
      if (f[3]) label.appendChild(el('em', 'sa-optional', ' (optional)'));
      wrap.appendChild(label);
      const input = el(f[2] ? 'textarea' : 'input', 'sa-input');
      if (!f[2]) input.type = 'text';
      input.placeholder = f[1];
      input.maxLength = 1000;
      input.autocomplete = 'off';
      input.value = draft.answers[key] || '';
      input.addEventListener('input', function () {
        draft.answers[key] = input.value;
        saveDraft();
        updateNav();
      });
      wrap.appendChild(input);
      panel.appendChild(wrap);
    });
    return panel;
  }

  function buildQuestionPanel(q, n) {
    const panel = el('div', 'sa-panel');
    panel.appendChild(el('h2', 'sa-panel-title', 'Ticket ' + (n + 1) + ' of ' + session.questions.length));
    const ticket = el('div', 'sa-ticket');
    const who = el('div', 'sa-ticket-who');
    who.appendChild(el('span', 'sa-avatar', q.player.charAt(0).toUpperCase()));
    who.appendChild(el('strong', '', q.player));
    who.appendChild(el('span', 'sa-ticket-tag', 'Player'));
    ticket.appendChild(who);
    ticket.appendChild(el('p', 'sa-ticket-msg', q.message));
    ticket.appendChild(buildLog(q));
    panel.appendChild(ticket);
    const fs = el('fieldset', 'sa-options');
    fs.appendChild(el('legend', 'sa-question', q.prompt));
    q.options.forEach(function (o, i) {
      const lab = el('label', 'sa-option');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'q-' + q.qid;
      input.value = o.id;
      input.checked = draft.choices[q.qid] === o.id;
      input.addEventListener('change', function () {
        draft.choices[q.qid] = o.id;
        saveDraft();
        updateNav();
        renderSteps();
      });
      lab.appendChild(input);
      lab.appendChild(el('span', 'sa-option-key', String.fromCharCode(65 + i)));
      lab.appendChild(el('span', 'sa-option-text', o.text));
      fs.appendChild(lab);
    });
    panel.appendChild(fs);
    return panel;
  }

  function buildReviewPanel() {
    const panel = el('div', 'sa-panel');
    panel.appendChild(el('h2', 'sa-panel-title', 'Review and submit'));
    panel.appendChild(el('p', 'sa-panel-intro', 'Check your answers. Once you submit, the tickets are graded and you see your score right away. If you pass, your application goes straight to the team.'));
    const list = el('dl', 'sa-review');
    BASE_STEPS.forEach(function (s, si) {
      s.fields.forEach(function (key) {
        const v = (draft.answers[key] || '').trim();
        if (!v && FIELDS[key][3]) return;
        const dt = el('dt', '', FIELDS[key][0]);
        const edit = el('button', 'sa-link', 'Edit');
        edit.type = 'button';
        edit.addEventListener('click', function () { go(si); });
        dt.appendChild(edit);
        list.appendChild(dt);
        list.appendChild(el('dd', v ? '' : 'is-missing', v || 'Missing answer'));
      });
    });
    session.questions.forEach(function (q, n) {
      const dt = el('dt', '', 'Ticket ' + (n + 1));
      const edit = el('button', 'sa-link', 'Edit');
      edit.type = 'button';
      edit.addEventListener('click', function () { go(BASE_STEPS.length + n); });
      dt.appendChild(edit);
      list.appendChild(dt);
      const picked = q.options.find(function (o) { return o.id === draft.choices[q.qid]; });
      list.appendChild(el('dd', picked ? '' : 'is-missing', picked ? picked.text : 'No answer picked'));
    });
    panel.appendChild(list);
    return panel;
  }

  function stepDone(i) {
    const s = steps[i];
    if (s.fields) return s.fields.every(function (k) { return FIELDS[k][3] || (draft.answers[k] || '').trim(); });
    if (s.q) return !!draft.choices[s.q.qid];
    return steps.slice(0, i).every(function (_, j) { return stepDone(j); });
  }

  function renderSteps() {
    stepsEl.innerHTML = '';
    let lastGroup = null;
    steps.forEach(function (s, i) {
      if (s.group !== lastGroup && s.group === 'Crash tickets') stepsEl.appendChild(el('li', 'sa-steps-group', 'Crash tickets'));
      lastGroup = s.group;
      const li = el('li', 'sa-step' + (i === current ? ' is-current' : '') + (stepDone(i) && s.id !== 'review' ? ' is-done' : '') + (s.q ? ' is-sub' : ''));
      const b = el('button', '', s.label);
      b.type = 'button';
      if (i === current) b.setAttribute('aria-current', 'step');
      b.addEventListener('click', function () { go(i); });
      li.appendChild(b);
      stepsEl.appendChild(li);
    });
  }

  function updateNav() {
    prevBtn.disabled = current === 0;
    const last = current === steps.length - 1;
    nextBtn.textContent = last ? 'Submit application' : 'Next';
    nextBtn.disabled = busy || !stepDone(current);
    progressEl.textContent = 'Step ' + (current + 1) + ' of ' + steps.length;
  }

  function go(i) {
    current = Math.max(0, Math.min(steps.length - 1, i));
    draft.step = current;
    saveDraft();
    panelsEl.innerHTML = '';
    const s = steps[current];
    panelsEl.appendChild(s.fields ? buildFieldPanel(s) : s.q ? buildQuestionPanel(s.q, s.n) : buildReviewPanel());
    renderSteps();
    updateNav();
    const top = testEl.getBoundingClientRect().top + window.scrollY - 96;
    if (window.scrollY > top) window.scrollTo({ top: top, behavior: 'smooth' });
  }

  function stopTimer() {
    clearInterval(timer);
    timer = null;
  }

  function tick() {
    const ms = session.expiresAt - Date.now();
    if (ms <= 0) {
      stopTimer();
      return load();
    }
    const h = Math.floor(ms / 3600000);
    const m = Math.floor(ms / 60000) % 60;
    const t = document.getElementById('saTimer');
    t.textContent = h + 'h ' + String(m).padStart(2, '0') + 'm';
    t.classList.toggle('is-low', ms < 3600000);
  }

  function openSession(s) {
    session = s;
    draft = loadDraft(s.id);
    steps = BASE_STEPS.map(function (b) { return Object.assign({ label: b.title }, b); })
      .concat(s.questions.map(function (q, n) { return { id: 'q' + n, group: 'Crash tickets', label: 'Ticket ' + (n + 1), q: q, n: n }; }))
      .concat([{ id: 'review', group: 'Review', label: 'Review & submit' }]);
    document.getElementById('saAttempt').textContent = (state.attemptsUsed + 1) + ' of ' + state.attemptsMax;
    show(null);
    resultEl.hidden = true;
    testEl.hidden = false;
    stopTimer();
    tick();
    timer = setInterval(tick, 15000);
    go(Math.min(draft.step || 0, steps.length - 1));
  }

  function submit() {
    if (busy) return;
    busy = true;
    updateNav();
    nextBtn.textContent = 'Submitting…';
    const answers = {};
    Object.keys(FIELDS).forEach(function (k) { answers[k] = (draft.answers[k] || '').trim(); });
    api('submit', { sessionId: session.id, answers: answers, choices: draft.choices }).then(function (r) {
      busy = false;
      if (r && r.ok) {
        try { localStorage.removeItem(DRAFT_PREFIX + session.id); } catch (e) {}
        return showResult(r);
      }
      updateNav();
      const err = r && r.error;
      if (err === 'not_member') return show('not-member');
      if (err === 'no_session' || err === 'token_expired' || err === 'applied' || err === 'banned' || err === 'cooldown' || err === 'role_closed') return load();
      if (err === 'missing_fields' || err === 'missing_choices') return go(steps.findIndex(function (_, i) { return !stepDone(i); }));
      alert("Couldn't submit your application. Your answers are saved, please try again in a moment.");
    }).catch(function () {
      busy = false;
      updateNav();
      alert('Network error. Your answers are saved, please try again.');
    });
  }

  function showResult(r) {
    stopTimer();
    testEl.hidden = true;
    gate.hidden = true;
    resultEl.hidden = false;
    resultEl.classList.toggle('is-pass', r.passed);
    resultEl.classList.toggle('is-fail', !r.passed);
    document.getElementById('saScorePct').textContent = r.percent + '%';
    document.getElementById('saScoreCount').textContent = r.correct + ' of ' + r.total + ' correct';
    const ring = document.getElementById('saScoreRing');
    const len = 2 * Math.PI * 52;
    ring.style.strokeDasharray = len;
    ring.style.strokeDashoffset = len;
    requestAnimationFrame(function () { requestAnimationFrame(function () { ring.style.strokeDashoffset = len * (1 - r.percent / 100); }); });
    const title = document.getElementById('saResultTitle');
    const text = document.getElementById('saResultText');
    const actions = document.getElementById('saResultActions');
    actions.innerHTML = '';
    if (r.passed) {
      title.textContent = 'Application sent';
      text.textContent = 'You passed the test and your application is with the team now. We will reach out to you on Discord with our decision, so keep an eye on your DMs.';
      const a = el('a', 'sa-btn sa-btn--ghost', 'Back to Join the Team');
      a.href = '/team';
      actions.appendChild(a);
    } else if (r.lockedUntil) {
      title.textContent = 'Test not passed';
      text.textContent = 'You needed at least ' + Math.ceil(r.total * r.passPercent / 100) + ' of ' + r.total + ' correct. That was your last attempt, so you can apply again on ' + fmtDate(r.lockedUntil) + '.';
    } else {
      title.textContent = 'Test not passed';
      text.textContent = 'You needed at least ' + Math.ceil(r.total * r.passPercent / 100) + ' of ' + r.total + ' correct. You have ' + r.attemptsLeft + (r.attemptsLeft === 1 ? ' attempt' : ' attempts') + ' left, and the next one has new tickets.';
      const b = el('button', 'sa-btn', 'Try again');
      b.type = 'button';
      b.addEventListener('click', function () { load(); });
      actions.appendChild(b);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function signIn() {
    let csrf = '';
    try {
      const buf = new Uint8Array(16);
      crypto.getRandomValues(buf);
      csrf = Array.from(buf).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
      sessionStorage.setItem(OAUTH_STATE_KEY, csrf);
      sessionStorage.setItem(INTENT_KEY, '1');
    } catch (e) {}
    window.location.href = 'https://discord.com/oauth2/authorize?client_id=' + encodeURIComponent(DISCORD_CLIENT_ID) + '&response_type=code&redirect_uri=' + encodeURIComponent(REDIRECT_URI) + '&scope=' + encodeURIComponent('identify guilds.members.read') + '&state=' + csrf;
  }

  prevBtn.addEventListener('click', function () { go(current - 1); });
  nextBtn.addEventListener('click', function () {
    if (nextBtn.disabled) return;
    if (current === steps.length - 1) return submit();
    go(current + 1);
  });
  document.getElementById('saStart').addEventListener('click', start);
  document.getElementById('saSignIn').addEventListener('click', signIn);
  gate.querySelectorAll('[data-action="reload"]').forEach(function (b) { b.addEventListener('click', load); });
  document.addEventListener('frostAccountLogin', load);
  document.addEventListener('frostAccountLogout', function () {
    stopTimer();
    testEl.hidden = true;
    resultEl.hidden = true;
    show('signed-out');
  });
  load();
})();
