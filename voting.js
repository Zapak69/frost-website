(function () {
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];
  function resizeCanvas() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  for (let i = 0; i < 100; i++) particles.push({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * 1.5 + 0.5,
    speed: Math.random() * 0.4 + 0.1,
    drift: (Math.random() - 0.5) * 0.3,
    opacity: Math.random() * 0.4 + 0.1
  });
  (function animateParticles() {
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(168,230,248,${p.opacity})`;
      ctx.fill();
      p.y += p.speed; p.x += p.drift;
      if (p.y > H + 10) {
          p.y = -10;
          p.x = Math.random() * W;
      }
      if (p.x > W + 10) p.x = -10;
      if (p.x < -10) p.x = W + 10;
    }
    requestAnimationFrame(animateParticles);
  })();
  const cursorGlow = document.getElementById('cursor-glow');
  const HALF = 280;
  document.addEventListener('mousemove', (e) => {
    cursorGlow.style.transform = `translate(${e.clientX - HALF}px,${e.clientY - HALF}px)`;
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const isInteractive = under && under.closest('a, button, nav, [class*="btn"]');
    cursorGlow.style.opacity = isInteractive ? '0' : '1';
  });
  document.addEventListener('mouseleave', () => {
      cursorGlow.style.opacity = '0';
  });
})();


(function () {
  const API = 'https://api.frostclient.eu/site/voting/';
  const VOTER_KEY = 'frostVoteId';
  const DRAFT_KEY = 'frostVoteDraft';
  const TOKEN_KEY = 'frostToken';
  const TEXT_MAX = 500;
  const FINAL_MAX = 1000;
  const ICON = {
    skip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    add: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
    change: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>',
    remove: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>'
  };
  const states = ['stateLoading', 'stateClosed', 'stateError', 'stateIntro', 'stateSteps', 'stateSubmitting', 'stateDone'];
  const $ = id => document.getElementById(id);
  let schema = null, info = null, steps = [], stepIdx = 0, anonymous = true, memVoter = '';
  let data = { answers: {}, profile: {}, final: {} };

  function show(id) {
    states.forEach(s => $(s).classList.toggle('active', s === id));
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function lsGet(k) {
    try {
      return localStorage.getItem(k) || '';
    } catch (e) {
      return '';
    }
  }
  function lsSet(k, v) {
    try {
      if (v == null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch (e) {}
  }
  function randomHex() {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  function voterId() {
    let v = lsGet(VOTER_KEY);
    if (/^[a-f0-9]{32}$/.test(v)) return v;
    v = memVoter || randomHex();
    memVoter = v;
    lsSet(VOTER_KEY, v);
    return v;
  }
  function lvl(r) {
    return r == null ? '' : r <= 4 ? 'lvl-low' : r <= 7 ? 'lvl-mid' : 'lvl-high';
  }
  function post(path, body) {
    return fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), cache: 'no-store' }).then(r => r.json());
  }
  let draftTimer = null;
  function saveDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => lsSet(DRAFT_KEY, JSON.stringify({ data, anonymous, step: stepIdx, at: Date.now() })), 250);
  }
  function loadDraft() {
    try {
      const d = JSON.parse(lsGet(DRAFT_KEY) || 'null');
      return d && d.data && typeof d.data === 'object' ? d : null;
    } catch (e) {
      return null;
    }
  }
  function normalize(d) {
    return { answers: Object.assign({}, d && d.answers), profile: Object.assign({}, d && d.profile), final: Object.assign({}, d && d.final) };
  }

  function buildSteps() {
    steps = [{ type: 'profile', short: 'About you', title: 'About you', desc: 'A few quick questions so we can see what different players need. All optional.' }];
    schema.sections.forEach(s => {
      if (s.lite && !info.lite) return;
      steps.push({ type: 'section', short: s.title, title: s.title, desc: s.desc, section: s });
    });
    steps.push({ type: 'final', short: 'Final thoughts', title: 'Final thoughts', desc: 'Anything the questions above missed. Optional, but this is often the most useful part.' });
    steps.push({ type: 'review', short: 'Submit', title: 'Check & submit', desc: 'Here is what you rated. Click a card to jump back and change it.' });
    if (stepIdx >= steps.length) stepIdx = steps.length - 1;
  }

  function renderIntro() {
    const box = $('voteAccount');
    let html = '';
    if (info.signedIn && info.user) {
      const avatar = info.user.avatar ? 'https://cdn.discordapp.com/avatars/' + info.user.id + '/' + info.user.avatar + '.png?size=64' : 'https://cdn.discordapp.com/embed/avatars/0.png';
      html += '<div class="vote-account"><img src="' + esc(avatar) + '" alt=""/><div class="va-text"><b>' + esc(info.user.name) + (info.lite ? '<span class="va-lite">LITE</span>' : '') + '</b>' +
        (info.lite ? 'You have Frost Lite, so you will rate the Lite version and its perks too.' : 'Signed in. Your name stays hidden unless you choose to show it at the end.') + '</div></div>';
    } else {
      html += '<div class="vote-account">' + ICON.user + '<div class="va-text"><b>Voting anonymously</b>Have Frost Lite? Sign in with Discord to rate the Lite version too.</div><button type="button" class="btn-secondary" id="voteSignInBtn">Sign in with Discord</button></div>';
    }
    if (info.vote) {
      html += '<div class="vote-lite-lock">' + ICON.info + '<div>You already voted on <b>' + esc(new Date(info.vote.updatedAt || info.vote.createdAt).toLocaleDateString()) + '</b>. Your answers are loaded - change anything and submit again.</div></div>';
    }
    box.innerHTML = html;
    const signIn = $('voteSignInBtn');
    if (signIn) signIn.addEventListener('click', () => {
      saveDraft();
      if (window.FrostAccount && window.FrostAccount.login) window.FrostAccount.login();
    });
    $('startBtn').textContent = info.vote ? 'Edit my vote' : 'Start voting';
  }

  function ratingItem(it) {
    const a = data.answers[it.id] || {};
    const hasText = !!(a.add || a.change || a.remove);
    const textCount = ['add', 'change', 'remove'].filter(k => a[k]).length;
    const open = it.open || hasText;
    let btns = '';
    for (let n = 1; n <= 10; n++) btns += '<button type="button" class="rate-btn ' + lvl(n) + (a.r === n ? ' on' : '') + '" data-r="' + n + '" aria-label="' + n + ' out of 10">' + n + '</button>';
    const field = (k, label, ph) => '<div class="s-' + k + '"><label>' + ICON[k] + label + '</label><textarea maxlength="' + TEXT_MAX + '" data-field="' + k + '" placeholder="' + esc(ph) + '">' + esc(a[k] || '') + '</textarea></div>';
    return '<div class="vote-item' + (a.skip ? ' is-skipped' : '') + '" data-id="' + esc(it.id) + '">' +
      '<div class="vote-item-head"><div class="vote-item-label">' + esc(it.label) + (it.required ? '<span class="req">*</span>' : '') + '</div><div class="vote-item-score">' + (a.r ? a.r + '/10' : a.skip ? 'Skipped' : '') + '</div></div>' +
      (it.hint ? '<div class="vote-item-hint">' + esc(it.hint) + '</div>' : '') +
      '<div class="rate-row">' + btns + '</div><div class="rate-scale"><span>1 - terrible</span><span>10 - perfect</span></div>' +
      '<div class="vote-item-tools">' +
      (it.required ? '' : '<button type="button" class="vote-chip-btn js-skip' + (a.skip ? ' on' : '') + '">' + ICON.skip + "Haven't used it</button>") +
      '<button type="button" class="vote-chip-btn js-sugg' + (open ? ' on' : '') + '">' + ICON.edit + 'Add / change / remove' + (textCount ? ' (' + textCount + ')' : '') + '</button>' +
      '</div>' +
      '<div class="vote-sugg' + (open ? ' show' : '') + '">' +
      field('add', 'What should we add?', 'New features, options or things you are missing...') +
      field('change', 'What should we change?', 'What annoys you or could work better...') +
      field('remove', 'What should we remove?', 'Things you never use or that get in the way...') +
      '</div></div>';
  }

  function renderStep() {
    const step = steps[stepIdx];
    $('stepCounter').textContent = 'Step ' + (stepIdx + 1) + ' of ' + steps.length;
    $('stepName').textContent = step.short;
    $('progressFill').style.width = Math.round((stepIdx + 1) / steps.length * 100) + '%';
    $('stepDots').innerHTML = steps.map((s, i) => '<button type="button" class="vote-step-dot' + (i === stepIdx ? ' active' : i < stepIdx ? ' done' : '') + '" data-step="' + i + '">' + esc(s.short) + '</button>').join('');
    $('stepTitle').textContent = step.title;
    $('stepDesc').textContent = step.desc || '';
    $('stepError').style.display = 'none';
    const body = $('stepBody');
    if (step.type === 'profile') {
      body.innerHTML = schema.profile.map(q => '<div class="vote-profile-q" data-q="' + esc(q.id) + '"><span class="field-label">' + esc(q.label) + '</span><div class="vote-options">' +
        q.options.map(o => '<button type="button" class="vote-option' + (data.profile[q.id] === o ? ' on' : '') + '" data-opt="' + esc(o) + '">' + esc(o) + '</button>').join('') + '</div></div>').join('');
    } else if (step.type === 'section') {
      body.innerHTML = step.section.items.map(ratingItem).join('');
    } else if (step.type === 'final') {
      body.innerHTML = '<div class="vote-final">' + schema.final.map(q => '<div class="field-block"><span class="field-label">' + esc(q.label) + '</span><textarea maxlength="' + FINAL_MAX + '" data-final="' + esc(q.id) + '">' + esc(data.final[q.id] || '') + '</textarea><div class="char-count"><span>' + (data.final[q.id] || '').length + '</span>/' + FINAL_MAX + '</div></div>').join('') + '</div>';
    } else {
      body.innerHTML = renderReview();
    }
    $('backBtn').style.visibility = stepIdx === 0 ? 'hidden' : 'visible';
    $('nextBtn').textContent = step.type === 'review' ? (info.vote ? 'Update my vote' : 'Submit my vote') : 'Next';
  }

  function renderReview() {
    let rated = 0, texts = 0;
    const cards = steps.map((st, i) => {
      if (st.type !== 'section') return '';
      const rs = st.section.items.map(it => data.answers[it.id] && data.answers[it.id].r).filter(n => Number.isInteger(n));
      st.section.items.forEach(it => {
        const a = data.answers[it.id];
        if (a) texts += ['add', 'change', 'remove'].filter(k => a[k]).length;
      });
      rated += rs.length;
      const avg = rs.length ? Math.round(rs.reduce((x, y) => x + y, 0) / rs.length * 10) / 10 : null;
      return '<button type="button" class="vote-summary-card" data-step="' + i + '"><div class="t">' + esc(st.section.title) + '</div><div class="v ' + lvl(avg == null ? null : Math.round(avg)) + '">' + (avg == null ? '-' : avg + '/10') + '</div><div class="n">' + rs.length + ' of ' + st.section.items.length + ' rated</div></button>';
    }).join('');
    let html = '<div class="vote-summary">' + cards + '</div>';
    html += '<p class="state-text" style="text-align:left;margin-bottom:18px;">You rated <b>' + rated + '</b> ' + (rated === 1 ? 'thing' : 'things') + ' and wrote <b>' + texts + '</b> ' + (texts === 1 ? 'suggestion' : 'suggestions') + '.</p>';
    if (!info.lite) html += '<div class="vote-lite-lock">' + ICON.bolt + '<div>' + (info.signedIn ? 'The <b>Frost Lite</b> section is only shown to Lite members.' : 'Have <b>Frost Lite</b>? Sign in with Discord before submitting to rate it too.') + '</div></div>';
    if (info.signedIn) {
      html += '<div class="field-block"><div class="checkbox-row"><input type="checkbox" id="anonCheck"' + (anonymous ? ' checked' : '') + '/><label for="anonCheck">Vote anonymously - the team will not see your Discord name. Uncheck it if you are happy for us to contact you about your feedback.</label></div></div>';
    }
    return html;
  }

  function answer(id) {
    if (!data.answers[id]) data.answers[id] = {};
    return data.answers[id];
  }
  function cleanAnswer(id) {
    const a = data.answers[id];
    if (a && a.r == null && !a.skip && !a.add && !a.change && !a.remove) delete data.answers[id];
  }
  function refreshItem(itemEl) {
    const id = itemEl.dataset.id;
    const a = data.answers[id] || {};
    itemEl.classList.toggle('is-skipped', !!a.skip);
    itemEl.classList.remove('is-missing');
    itemEl.querySelectorAll('.rate-btn').forEach(b => b.classList.toggle('on', Number(b.dataset.r) === a.r));
    itemEl.querySelector('.vote-item-score').textContent = a.r ? a.r + '/10' : a.skip ? 'Skipped' : '';
    const skip = itemEl.querySelector('.js-skip');
    if (skip) skip.classList.toggle('on', !!a.skip);
    const count = ['add', 'change', 'remove'].filter(k => a[k]).length;
    const sugg = itemEl.querySelector('.js-sugg');
    sugg.lastChild.textContent = 'Add / change / remove' + (count ? ' (' + count + ')' : '');
  }

  $('stepBody').addEventListener('click', e => {
    const rateBtn = e.target.closest('.rate-btn');
    const itemEl = e.target.closest('.vote-item');
    if (rateBtn && itemEl) {
      const a = answer(itemEl.dataset.id);
      const n = Number(rateBtn.dataset.r);
      a.r = a.r === n ? null : n;
      if (a.r != null) delete a.skip;
      if (itemEl.dataset.id === 'overall' && a.r != null) $('stepError').style.display = 'none';
      cleanAnswer(itemEl.dataset.id);
      refreshItem(itemEl);
      saveDraft();
      return;
    }
    if (e.target.closest('.js-skip') && itemEl) {
      const a = answer(itemEl.dataset.id);
      if (a.skip) delete a.skip;
      else {
        a.skip = true;
        a.r = null;
      }
      cleanAnswer(itemEl.dataset.id);
      refreshItem(itemEl);
      saveDraft();
      return;
    }
    const suggBtn = e.target.closest('.js-sugg');
    if (suggBtn && itemEl) {
      const box = itemEl.querySelector('.vote-sugg');
      const open = !box.classList.contains('show');
      box.classList.toggle('show', open);
      suggBtn.classList.toggle('on', open);
      if (open) box.querySelector('textarea').focus();
      return;
    }
    const opt = e.target.closest('.vote-option');
    if (opt) {
      const q = opt.closest('.vote-profile-q').dataset.q;
      const v = opt.dataset.opt;
      if (data.profile[q] === v) delete data.profile[q];
      else data.profile[q] = v;
      opt.parentNode.querySelectorAll('.vote-option').forEach(o => o.classList.toggle('on', data.profile[q] === o.dataset.opt));
      saveDraft();
      return;
    }
    const card = e.target.closest('.vote-summary-card');
    if (card) goStep(Number(card.dataset.step));
  });
  $('stepBody').addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.field) {
      const itemEl = t.closest('.vote-item');
      const a = answer(itemEl.dataset.id);
      const v = t.value.slice(0, TEXT_MAX);
      if (v.trim()) a[t.dataset.field] = v;
      else delete a[t.dataset.field];
      cleanAnswer(itemEl.dataset.id);
      refreshItem(itemEl);
      saveDraft();
    } else if (t.dataset.final) {
      const v = t.value.slice(0, FINAL_MAX);
      if (v.trim()) data.final[t.dataset.final] = v;
      else delete data.final[t.dataset.final];
      t.parentNode.querySelector('.char-count span').textContent = String(t.value.length);
      saveDraft();
    } else if (t.id === 'anonCheck') {
      anonymous = t.checked;
      saveDraft();
    }
  });
  $('stepBody').addEventListener('change', e => {
    if (e.target.id === 'anonCheck') {
      anonymous = e.target.checked;
      saveDraft();
    }
  });
  $('stepDots').addEventListener('click', e => {
    const dot = e.target.closest('.vote-step-dot');
    if (dot) goStep(Number(dot.dataset.step));
  });

  function scrollToCard() {
    const card = document.querySelector('.vote-card');
    const top = card.getBoundingClientRect().top + window.scrollY - 90;
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
  }
  function goStep(i) {
    stepIdx = Math.max(0, Math.min(steps.length - 1, i));
    renderStep();
    show('stateSteps');
    scrollToCard();
    saveDraft();
  }
  function stepError(msg) {
    const el = $('stepError');
    el.textContent = msg;
    el.style.display = 'block';
  }
  function overallMissing() {
    return !(data.answers.overall && Number.isInteger(data.answers.overall.r));
  }
  function flagOverall() {
    const el = document.querySelector('.vote-item[data-id="overall"]');
    if (el) {
      el.classList.add('is-missing');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    stepError('Please rate Frost as a whole - it is the only required question.');
  }

  $('nextBtn').addEventListener('click', () => {
    const step = steps[stepIdx];
    if (step.type === 'section' && step.section.id === 'overall' && overallMissing()) return flagOverall();
    if (step.type !== 'review') return goStep(stepIdx + 1);
    if (overallMissing()) {
      goStep(steps.findIndex(s => s.type === 'section' && s.section.id === 'overall'));
      return flagOverall();
    }
    submit();
  });
  $('backBtn').addEventListener('click', () => goStep(stepIdx - 1));
  $('startBtn').addEventListener('click', () => goStep(stepIdx));
  $('editBtn').addEventListener('click', () => {
    stepIdx = 0;
    renderIntro();
    show('stateIntro');
  });
  $('retryBtn').addEventListener('click', () => load(false));

  function payloadAnswers() {
    const out = {};
    Object.keys(data.answers).forEach(id => {
      const a = data.answers[id];
      const o = { r: Number.isInteger(a.r) ? a.r : null };
      ['add', 'change', 'remove'].forEach(k => {
        if (a[k] && a[k].trim()) o[k] = a[k].trim();
      });
      if (o.r != null || o.add || o.change || o.remove) out[id] = o;
    });
    return out;
  }

  const SUBMIT_ERRORS = {
    closed: 'Voting has just been closed.',
    rate_limited: 'Too many attempts. Please wait a few minutes and try again.',
    ip_limit: 'Too many votes were sent from your network today.',
    too_soon: 'You just updated your vote. Please wait a minute before changing it again.',
    other_account: 'This browser has already voted with a different Discord account.',
    missing_overall: 'Please rate Frost as a whole.'
  };
  function submit() {
    show('stateSubmitting');
    post('submit', { voter: voterId(), token: lsGet(TOKEN_KEY), anonymous: anonymous, answers: payloadAnswers(), profile: data.profile, final: data.final })
      .then(d => {
        if (!d || !d.ok) {
          if (d && d.error === 'closed') return show('stateClosed');
          goStep(stepIdx);
          return stepError(SUBMIT_ERRORS[d && d.error] || 'Could not send your vote. Please try again.');
        }
        info.vote = d.vote;
        lsSet(DRAFT_KEY, null);
        $('doneTitle').textContent = d.updated ? 'Your vote was updated!' : 'Thanks for voting!';
        show('stateDone');
        scrollToCard();
      })
      .catch(() => {
        goStep(stepIdx);
        stepError('Network error while sending your vote. Please try again.');
      });
  }

  function load(keepProgress) {
    if (!keepProgress) show('stateLoading');
    post('state', { voter: voterId(), token: lsGet(TOKEN_KEY) })
      .then(d => {
        if (!d || !d.ok) throw new Error('bad');
        schema = d.schema;
        info = d;
        if (!d.open) return show('stateClosed');
        const draft = loadDraft();
        if (!keepProgress) {
          if (draft && (!d.vote || draft.at > (d.vote.updatedAt || 0))) {
            data = normalize(draft.data);
            anonymous = draft.anonymous !== false;
            stepIdx = Number(draft.step) || 0;
          } else if (d.vote) {
            data = normalize(d.vote);
            anonymous = d.vote.anonymous !== false;
          }
        }
        buildSteps();
        renderIntro();
        if (keepProgress && $('stateSteps').classList.contains('active')) renderStep();
        else show('stateIntro');
      })
      .catch(() => {
        if (keepProgress) return;
        $('errorText').textContent = "We couldn't load the vote. Check your connection and try again.";
        show('stateError');
      });
  }

  document.addEventListener('frostAccountLogin', () => load(true));
  document.addEventListener('frostAccountLogout', () => load(true));
  load(false);
})();

(function () {
  const hamburger = document.getElementById('navHamburger');
  const mobileMenu = document.getElementById('navMobileMenu');
  if (!hamburger || !mobileMenu) return;
  function closeMenu() {
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  }
  hamburger.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });
  mobileMenu.querySelectorAll('a, button').forEach(el => el.addEventListener('click', closeMenu));
})();
