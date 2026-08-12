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
      if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
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
  document.addEventListener('mouseleave', () => { cursorGlow.style.opacity = '0'; });
})();

(function () {
  const LITE_API_URL = 'https://script.google.com/macros/s/AKfycbxF57u1UNBsonktp5_2EseJtFkBZR0-CCxyazOGVUmEBrcwjU1-t6Us41gcrRqCsGcR/exec';
  const DISCORD_CLIENT_ID = '1512834635640475898';
  const DISCORD_REDIRECT_URI = 'https://frostclient.eu/lite';
  const WHOP_CHECKOUT_URL = 'https://whop.com/checkout/plan_oKGeLuyTvJb5u';
  const WHOP_CHECKOUT_URL_ANNUAL = 'https://whop.com/checkout/plan_YDenpzviXSDXW';
  document.querySelectorAll('.js-whop-subscribe').forEach(function (btn) {
    btn.dataset.monthlyHref = WHOP_CHECKOUT_URL;
    btn.dataset.annualHref = WHOP_CHECKOUT_URL_ANNUAL;
    btn.href = WHOP_CHECKOUT_URL;
  });
  const BILLING_PLANS = {
    monthly: { amount: 2.90, period: ' / month', perDay: '', trialDays: 1, trialUnit: 'day', periodWidth: '8ch', cta: 'Start 1 day free' },
    annual: { amount: 29.90, period: ' / year', perDay: '€2.49 / month, billed yearly', trialDays: 2, trialUnit: 'month', periodWidth: '7ch', cta: 'Subscribe' },
  };
  function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function animateNumber(from, to, render) {
    const dur = 650;
    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / dur);
      render(from + (to - from) * easeInOut(t), t >= 1);
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function fadeSwap(el, text) {
    if (!el) return;
    el.style.opacity = '0';
    setTimeout(function () {
      el.textContent = text;
      el.style.opacity = '';
    }, 180);
  }
  function typewriterSwap(el, text, tokenBox) {
    if (!el) return;
    const myToken = ++tokenBox.v;
    const STEP_MS = 22;
    const from = el.textContent;
    const maxLen = Math.max(from.length, text.length);
    let i = 0;
    (function step() {
      if (myToken !== tokenBox.v) return;
      el.textContent = text.slice(0, i) + from.slice(i);
      if (i >= maxLen) return;
      i++;
      setTimeout(step, STEP_MS);
    })();
  }
  function moveToggleIndicator(toggle) {
    const indicator = toggle.querySelector('.billing-toggle-indicator');
    const active = toggle.querySelector('.billing-toggle-btn.active');
    if (!indicator || !active) return;
    indicator.style.left = active.offsetLeft + 'px';
    indicator.style.width = active.offsetWidth + 'px';
  }
  document.querySelectorAll('.billing-toggle').forEach(function (toggle) {
    const card = toggle.closest('.plan-card');
    if (!card) return;
    const link = card.querySelector('.js-whop-subscribe');
    const amountEl = card.querySelector('.plan-amount');
    const thenEl = card.querySelector('.plan-then');
    const periodEl = card.querySelector('.plan-period');
    const perDayEl = card.querySelector('.plan-per-day');
    const ctaEl = link ? link.querySelector('.js-sub-cta-text') : null;
    const ctaTypewriterToken = { v: 0 };
    const trialDaysEl = card.querySelector('.js-trial-days');
    const trialLabelEl = card.querySelector('.js-trial-label');
    moveToggleIndicator(toggle);
    window.addEventListener('resize', function () { moveToggleIndicator(toggle); });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { moveToggleIndicator(toggle); });
    }
    toggle.querySelectorAll('.billing-toggle-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.classList.contains('active')) return;
        const billing = btn.dataset.billing;
        const plan = BILLING_PLANS[billing];
        if (!plan) return;
        toggle.querySelectorAll('.billing-toggle-btn').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        moveToggleIndicator(toggle);
        if (amountEl) {
          const fromAmount = parseFloat(amountEl.textContent) || 0;
          animateNumber(fromAmount, plan.amount, function (val, done) {
            amountEl.textContent = (done ? plan.amount : val).toFixed(2);
          });
        }
        if (ctaEl) {
          typewriterSwap(ctaEl, plan.cta, ctaTypewriterToken);
        }
        if (trialDaysEl) {
          const fromTrial = parseInt(trialDaysEl.textContent, 10) || 0;
          const unit = plan.trialUnit || 'day';
          animateNumber(fromTrial, plan.trialDays, function (val, done) {
            const days = done ? plan.trialDays : Math.round(val);
            trialDaysEl.textContent = String(days);
            if (trialLabelEl) trialLabelEl.textContent = (days === 1 ? unit : unit + 's') + ' free';
          });
        }
        fadeSwap(thenEl, billing === 'annual' ? '' : 'then ');
        fadeSwap(periodEl, plan.period);
        if (periodEl) setTimeout(function () { periodEl.style.width = plan.periodWidth; }, 180);
        fadeSwap(perDayEl, plan.perDay);
        if (link) link.href = billing === 'annual' ? link.dataset.annualHref : link.dataset.monthlyHref;
      });
    });
  });
  const TOKEN_KEY = 'frostLiteToken';
  const OAUTH_STATE_KEY = 'frostLiteOauthState';
  const GAME_SESSION_KEY = 'frostLiteGameSession';
  const GAME_PORT_KEY = 'frostLiteGamePort';
  function gameSession() {
    try { return sessionStorage.getItem(GAME_SESSION_KEY) || ''; } catch (e) { return ''; }
  }
  function gamePort() {
    try { return sessionStorage.getItem(GAME_PORT_KEY) || ''; } catch (e) { return ''; }
  }
  let lastGameNotify = null;
  function notifyGame(status, extra) {
    const session = gameSession();
    const port = gamePort();
    if (!session || !port) return;
    lastGameNotify = { status: status, extra: extra };
    let url = 'http://127.0.0.1:' + port + '/result?session=' + encodeURIComponent(session) + '&status=' + encodeURIComponent(status);
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        if (extra[k] !== undefined && extra[k] !== null) url += '&' + k + '=' + encodeURIComponent(extra[k]);
      });
    }
    fetch(url, { mode: 'no-cors', cache: 'no-store' }).catch(function () {});
  }
  function retryNotifyGame() {
    if (lastGameNotify) notifyGame(lastGameNotify.status, lastGameNotify.extra);
  }
  function afterResult(status, data, daysLeft) {
    if (!gameSession()) return;
    const user = data && data.user;
    notifyGame(status, {
      token: data && data.token,
      daysLeft: daysLeft,
      uid: user && user.id,
      avatar: user && user.avatar,
      name: user && (user.name || user.username),
    });
    const note = document.getElementById('gameReturnNote');
    if (note) note.style.display = 'block';
  }

  const states = ['stateLoading', 'stateLogin', 'stateNotMember', 'stateNotBooster', 'stateError', 'stateUpdating'];

  function show(id) {
    states.forEach(s => document.getElementById(s).classList.toggle('active', s === id));
  }

  function avatarUrl(user) {
    if (user && user.avatar) {
      return 'https://cdn.discordapp.com/avatars/' + user.id + '/' + user.avatar + '.png?size=128';
    }
    let idx = 0;
    try { idx = Number((BigInt(user.id) >> 22n) % 6n); } catch (e) { idx = 0; }
    return 'https://cdn.discordapp.com/embed/avatars/' + idx + '.png';
  }

  function fillChip(chipId, user, tag) {
    const chip = document.getElementById(chipId);
    if (!user) { chip.style.display = 'none'; return; }
    chip.innerHTML =
      '<img class="user-avatar" src="' + avatarUrl(user) + '" alt=""/>' +
      '<div class="user-meta"><div class="user-name"></div><div class="user-tag"></div></div>';
    chip.querySelector('.user-name').textContent = user.name || user.username || 'Discord user';
    chip.querySelector('.user-tag').textContent = tag || ('@' + (user.username || ''));
  }
  function saveToken(t) {
    try { localStorage.setItem(TOKEN_KEY, t); } catch (e) {}
  }
  function loadToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }
  function clearToken() {
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
    setAccessFlag(false);
  }
  function setAccessFlag(has) {
    try {
      if (has) localStorage.setItem('frostLiteAccess', '1');
      else localStorage.removeItem('frostLiteAccess');
    } catch (e) {}
  }
  function hasLiteAccess() {
    try { return localStorage.getItem('frostLiteAccess') === '1'; } catch (e) { return false; }
  }

  const navAuthBtn = document.getElementById('navAuthBtn');
  const navAuthBtnText = document.getElementById('navAuthBtnText');
  const navAuthBtnIcon = document.getElementById('navAuthBtnIcon');
  const navMobileAuthBtn = document.getElementById('navMobileAuthBtn');
  if (navMobileAuthBtn) navMobileAuthBtn.addEventListener('click', () => navAuthBtn.click());
  const compareNavLink = document.getElementById('compareNavLink');
  const reviewsNavLink = document.getElementById('reviewsNavLink');
  const belowSplit = document.querySelector('.below-split');
  function setCompareVisible(visible, animate) {
    if (compareNavLink) compareNavLink.style.display = visible ? '' : 'none';
    if (reviewsNavLink) reviewsNavLink.style.display = visible ? '' : 'none';
    if (belowSplit) belowSplit.style.display = visible ? '' : 'none';
    if (visible && animate && belowSplit) {
      belowSplit.classList.remove('compare-animate-in');
      void belowSplit.offsetWidth;
      belowSplit.classList.add('compare-animate-in');
    }
  }
  function setAuthPhase(phase) {
    navAuthBtn.classList.remove('is-logout', 'is-checking');
    navAuthBtnIcon.style.display = phase === 'loggedOut' ? '' : 'none';
    if (phase === 'checking') {
      navAuthBtn.dataset.mode = 'checking';
      navAuthBtn.classList.add('is-checking');
      navAuthBtnText.textContent = 'Loading...';
      setCompareVisible(false, false);
    } else if (phase === 'noAccess') {
      navAuthBtn.dataset.mode = 'logout';
      navAuthBtn.classList.add('is-logout');
      navAuthBtnText.textContent = 'Manage';
      setCompareVisible(true, true);
    } else {
      navAuthBtn.dataset.mode = 'login';
      navAuthBtnText.textContent = 'Sign in';
      setCompareVisible(true, false);
    }
    if (navMobileAuthBtn) navMobileAuthBtn.textContent = navAuthBtnText.textContent;
  }

  function showError(msg, detail) {
    document.getElementById('errorText').textContent = msg || "We couldn't verify your Discord account. Please try again.";
    const detailEl = document.getElementById('errorDetail');
    detailEl.textContent = detail || '';
    detailEl.style.display = detail ? 'block' : 'none';
    show('stateError');
  }

  function render(data) {
    if (!data || !data.ok) { setAuthPhase('loggedOut'); showError(); afterResult('error', data); return; }

    if (data.status === 'not_member') {
      setAccessFlag(false);
      setAuthPhase('noAccess');
      fillChip('chipNotMember', data.user);
      show('stateNotMember');
      afterResult('not_member', data);
      return;
    }
    if (data.status === 'not_booster') {
      setAccessFlag(false);
      setAuthPhase('noAccess');
      fillChip('chipNotBooster', data.user);
      show('stateNotBooster');
      afterResult('not_booster', data);
      return;
    }
    if (data.status === 'eligible') {
      setAccessFlag(true);
      afterResult('eligible', data);
      window.location.replace('https://frostclient.eu/lite/download');
      return;
    }
    setAuthPhase('loggedOut');
    showError();
    afterResult('error', data);
  }

  function exchange(code) {
    show('stateLoading');
    setAuthPhase('checking');
    fetch(LITE_API_URL + '?action=liteAuth&code=' + encodeURIComponent(code), { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (!data.ok) {
          setAuthPhase('loggedOut');
          showError(data.error === 'auth_failed'
            ? 'Discord sign-in failed. Please try again.'
            : "Discord didn't respond correctly. Please try again.", data.detail);
          return;
        }
        if (data.token) saveToken(data.token);
        render(data);
      })
      .catch(() => { setAuthPhase('loggedOut'); showError('Network error while contacting the server. Please try again.'); });
  }
  function recheck(token) {
    show('stateLoading');
    setAuthPhase('checking');
    fetch(LITE_API_URL + '?action=liteCheck&token=' + encodeURIComponent(token), { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (!data.ok) {
          clearToken();
          setAuthPhase('loggedOut');
          if (data.error === 'token_expired') { show('stateLogin'); return; }
          showError("Discord didn't respond correctly. Please try again.", data.detail);
          return;
        }
        if (data.token) saveToken(data.token);
        render(data);
      })
      .catch(() => { setAuthPhase('loggedOut'); showError('Network error while contacting the server. Please try again.'); });
  }
  document.querySelectorAll('.js-lite-login').forEach(loginBtn => {
    loginBtn.addEventListener('click', () => {
      if (loginBtn.dataset.mode === 'logout') {
        if (window.FrostAccount) window.FrostAccount.open();
        return;
      }
      try { fetch(LITE_API_URL + '?action=liteConfig', { cache: 'no-store', keepalive: true }); } catch (e) {}
      let csrfState = '';
      try {
        const buf = new Uint8Array(16);
        crypto.getRandomValues(buf);
        csrfState = Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
        sessionStorage.setItem(OAUTH_STATE_KEY, csrfState);
      } catch (e) {}
      const gs = gameSession(), gp = gamePort();
      const state = csrfState + (gs && gp ? '.g.' + gs + '.' + gp : '');
      const url = 'https://discord.com/oauth2/authorize'
        + '?client_id=' + encodeURIComponent(DISCORD_CLIENT_ID)
        + '&response_type=code'
        + '&redirect_uri=' + encodeURIComponent(DISCORD_REDIRECT_URI)
        + '&scope=' + encodeURIComponent('identify guilds.members.read')
        + (state ? '&state=' + state : '');
      window.location.href = url;
    });
  });

  document.addEventListener('frostAccountLogout', () => {
    setAuthPhase('loggedOut');
    show('stateLogin');
  });

  document.querySelectorAll('.js-signout').forEach(btn => btn.addEventListener('click', () => {
    clearToken();
    setAuthPhase('loggedOut');
    show('stateLogin');
  }));

  document.getElementById('retryBtn').addEventListener('click', () => show('stateLogin'));

  const gameReturnRetryBtn = document.getElementById('gameReturnRetryBtn');
  if (gameReturnRetryBtn) gameReturnRetryBtn.addEventListener('click', retryNotifyGame);

  (function init() {
    const params = new URLSearchParams(window.location.search);

    if (params.has('game') && params.has('session')) {
      try {
        sessionStorage.setItem(GAME_SESSION_KEY, params.get('session'));
        sessionStorage.setItem(GAME_PORT_KEY, params.get('port') || '41421');
      } catch (e) {}
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('game');
      cleanUrl.searchParams.delete('session');
      cleanUrl.searchParams.delete('port');
      window.history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
    }

    if (params.has('update')) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('update');
      window.history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
      show('stateUpdating');
      return;
    }

    if (params.has('code')) {
      const code = params.get('code');
      const returnedState = params.get('state') || '';
      let storedState = '';
      try { storedState = sessionStorage.getItem(OAUTH_STATE_KEY) || ''; } catch (e) {}
      try { sessionStorage.removeItem(OAUTH_STATE_KEY); } catch (e) {}
      const gIdx = returnedState.indexOf('.g.');
      const csrfState = gIdx === -1 ? returnedState : returnedState.slice(0, gIdx);
      if (gIdx !== -1 && !gameSession()) {
        const gameParts = returnedState.slice(gIdx + 3).split('.');
        if (gameParts.length === 2 && gameParts[0] && gameParts[1]) {
          try {
            sessionStorage.setItem(GAME_SESSION_KEY, gameParts[0]);
            sessionStorage.setItem(GAME_PORT_KEY, gameParts[1]);
          } catch (e) {}
        }
      }

      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('code');
      cleanUrl.searchParams.delete('state');
      window.history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);

      if (storedState && csrfState !== storedState) {
        showError('Sign-in session mismatch. Please try again.');
        return;
      }
      exchange(code);
      return;
    }

    if (params.has('error')) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('error');
      cleanUrl.searchParams.delete('error_description');
      cleanUrl.searchParams.delete('state');
      window.history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
      document.getElementById('loginNote').textContent = 'Sign-in was cancelled. You can try again whenever you like.';
      show('stateLogin');
      return;
    }

    const token = loadToken();
    if (token) {

      if (hasLiteAccess() && !gameSession()) {
        window.location.replace('https://frostclient.eu/lite/download');
        return;
      }
      recheck(token);
      return;
    }

    show('stateLogin');
  })();
})();

(function () {
  const anchors = [...document.querySelectorAll('.nav-anchor[href^="#"]')]
    .map(a => ({
      link: a,
      section: document.getElementById(a.getAttribute('href').slice(1)),
      early: parseFloat(a.dataset.glowEarly || '0') || 0
    }))
    .filter(x => x.section);
  if (!anchors.length) return;
  const GLOW_RAMP_PX = 80;
  const refY = 120;
  function sectionProgress(rect, early) {
    return Math.max(0, Math.min(1, (refY + early - rect.top) / GLOW_RAMP_PX));
  }
  const MUTED = [107, 143, 168];
  const BOOST = [255, 115, 250];
  function updateActive() {
    const withRects = anchors
      .map(a => ({ link: a.link, rect: a.section.getBoundingClientRect(), early: a.early }))
      .sort((a, b) => a.rect.top - b.rect.top);
    let activeIndex = -1;
    withRects.forEach((a, i) => { if (a.rect.top <= refY + a.early) activeIndex = i; });
    const doc = document.documentElement;
    const distanceFromBottom = doc.scrollHeight - (window.innerHeight + window.scrollY);
    const bottomProgress = Math.max(0, Math.min(1, (GLOW_RAMP_PX - distanceFromBottom) / GLOW_RAMP_PX));
    const lastIndex = withRects.length - 1;
    if (bottomProgress > 0) activeIndex = lastIndex;

    withRects.forEach((a, i) => {
      let glow = 0;
      if (i === activeIndex) {
        glow = i === lastIndex ? Math.max(sectionProgress(a.rect, a.early), bottomProgress) : sectionProgress(a.rect, a.early);
      } else if (activeIndex >= 0 && i === activeIndex - 1) {
        const activeItem = withRects[activeIndex];
        const activeGlow = activeIndex === lastIndex
          ? Math.max(sectionProgress(activeItem.rect, activeItem.early), bottomProgress)
          : sectionProgress(activeItem.rect, activeItem.early);
        glow = 1 - activeGlow;
      }
      glow = Math.max(0, Math.min(1, glow));

      const r = Math.round(MUTED[0] + (BOOST[0] - MUTED[0]) * glow);
      const g = Math.round(MUTED[1] + (BOOST[1] - MUTED[1]) * glow);
      const b = Math.round(MUTED[2] + (BOOST[2] - MUTED[2]) * glow);
      a.link.style.color = `rgb(${r}, ${g}, ${b})`;
      a.link.style.textShadow = glow > 0.02
        ? `0 0 ${(glow * 14).toFixed(1)}px rgba(255,115,250,${(glow * 0.65).toFixed(3)})`
        : 'none';
    });
  }
  window.addEventListener('scroll', updateActive, { passive: true });
  window.addEventListener('resize', updateActive);
  updateActive();
})();

(function () {
  const navEl = document.querySelector('nav');
  if (!navEl) return;
  function updateNav() {
    navEl.classList.toggle('nav-scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();
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

(function () {
  const KEY = 'frostPromoToastDismissed';
  const toast = document.getElementById('promoToast');
  const closeBtn = document.getElementById('promoToastClose');
  window.hidePromoToast = function (persist) {
    if (!toast) return;
    toast.classList.remove('show');
    if (persist) { try { localStorage.setItem(KEY, '1'); } catch (e) {} }
  };
  if (!toast || !closeBtn) return;
  let dismissed = false;
  try { dismissed = localStorage.getItem(KEY) === '1'; } catch (e) {}
  if (dismissed) return;
  setTimeout(() => toast.classList.add('show'), 1200);
  closeBtn.addEventListener('click', () => hidePromoToast(true));
})();

(function () {
  const grid = document.getElementById('liteReviewsGrid');
  if (!grid) return;

  function parseStars(s) {
    const n = parseInt(String(s || '').split('/')[0], 10);
    return Number.isFinite(n) ? Math.max(0, Math.min(5, n)) : 0;
  }
  function starsText(n) {
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }
  function timestampOf(review) {
    const t = Date.parse(review.submittedAt || '');
    return Number.isFinite(t) ? t : 0;
  }
  function buildLiteBadge(review) {
    let label;
    if (review.subscription === true) {
      label = 'Lite Subscriber';
    } else if (review.booster === true) {
      label = 'Server Booster';
    } else {
      return null;
    }
    const badge = document.createElement('span');
    badge.className = 'lite-badge';
    badge.textContent = label;
    return badge;
  }

  function buildCard(review, isLatest) {
    const isAnon = !review.username || !review.avatar;
    const card = document.createElement('div');
    card.className = 'review-card';

    if (isLatest) {
      const latest = document.createElement('span');
      latest.className = 'review-latest-badge';
      latest.textContent = 'LATEST';
      card.appendChild(latest);
    }

    const head = document.createElement('div');
    head.className = 'review-head';
    if (isAnon) {
      const av = document.createElement('div');
      av.className = 'review-avatar-anon';
      av.textContent = 'A';
      head.appendChild(av);
    } else {
      const img = document.createElement('img');
      img.className = 'review-avatar';
      img.src = review.avatar;
      img.alt = '';
      img.loading = 'lazy';
      head.appendChild(img);
    }

    const nameCol = document.createElement('div');
    nameCol.className = 'review-name-col';
    const name = document.createElement('div');
    name.className = 'review-name';
    name.textContent = isAnon ? 'Anonymous' : review.username;
    nameCol.appendChild(name);
    const badge = buildLiteBadge(review);
    if (badge) nameCol.appendChild(badge);
    head.appendChild(nameCol);
    card.appendChild(head);

    const stars = document.createElement('div');
    stars.className = 'review-stars';
    stars.textContent = starsText(parseStars(review.lite === true && review.liteStars ? review.liteStars : review.stars));
    card.appendChild(stars);

    if (review.lite === true) {
      card.classList.add('is-lite');
      const liteTag = document.createElement('div');
      liteTag.className = 'review-lite-tag';
      liteTag.textContent = 'Lite Review';
      card.appendChild(liteTag);
    }

    const comment = document.createElement('p');
    comment.className = 'review-comment';
    comment.textContent = review.comment || '';
    card.appendChild(comment);

    return card;
  }

  fetch('https://bot.frostclient.eu/reviews_export.json', { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error('http_' + r.status);
      return r.json();
    })
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) return;
      data.filter(r => (r.booster === true || r.subscription === true)
          && parseStars(r.lite === true && r.liteStars ? r.liteStars : r.stars) >= 3)
        .sort((a, b) => timestampOf(b) - timestampOf(a))
        .slice(0, 4)
        .forEach((r, i) => grid.appendChild(buildCard(r, i === 0)));
    })
    .catch(() => {});
})();
