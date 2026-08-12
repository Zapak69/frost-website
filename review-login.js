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
  const GAME_SESSION_KEY = 'frostReviewGameSession';
  const GAME_PORT_KEY = 'frostReviewGamePort';
  const OAUTH_STATE_KEY = 'frostReviewOauthState';
  const DISCORD_CLIENT_ID = '1512834635640475898';
  const DISCORD_REDIRECT_URI_REVIEW = 'https://frostclient.eu/review';

  function gameSession() {
    try { return sessionStorage.getItem(GAME_SESSION_KEY) || ''; } catch (e) { return ''; }
  }
  function gamePort() {
    try { return sessionStorage.getItem(GAME_PORT_KEY) || ''; } catch (e) { return ''; }
  }

  const states = ['stateLogin', 'stateWorking', 'stateDone', 'stateNoSession', 'stateError'];
  function show(id) {
    states.forEach(s => document.getElementById(s).classList.toggle('active', s === id));
  }

  function showError(msg) {
    document.getElementById('errorText').textContent = msg || "We couldn't sign you in. Please try again.";
    show('stateError');
  }

  let lastNotifyPayload = null;
  function notifyGame(user) {
    const session = gameSession();
    const port = gamePort();
    if (!session || !port) return;
    lastNotifyPayload = user;
    let url = 'http://127.0.0.1:' + port + '/result?session=' + encodeURIComponent(session)
      + '&id=' + encodeURIComponent(user.id)
      + '&username=' + encodeURIComponent(user.username || '')
      + '&name=' + encodeURIComponent(user.name || '')
      + '&avatar=' + encodeURIComponent(user.avatar || '');
    fetch(url, { mode: 'no-cors', cache: 'no-store' }).catch(function () {});
    const note = document.getElementById('retryNote');
    const btn = document.getElementById('retryNotifyBtn');
    if (note) { note.textContent = 'You can close this tab now.'; note.style.display = 'block'; }
    if (btn) btn.style.display = 'inline-flex';
  }

  function exchange(code) {
    show('stateWorking');
    fetch(LITE_API_URL + '?action=identifyAuth&code=' + encodeURIComponent(code), { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (!data.ok || !data.user) {
          showError('Discord sign-in failed. Please try again.');
          return;
        }
        show('stateDone');
        notifyGame(data.user);
      })
      .catch(() => showError('Network error while contacting the server. Please try again.'));
  }

  const loginBtn = document.getElementById('loginBtn');
  loginBtn.addEventListener('click', () => {
    try { fetch(LITE_API_URL + '?action=identifyConfig', { cache: 'no-store', keepalive: true }); } catch (e) {}
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
      + '&redirect_uri=' + encodeURIComponent(DISCORD_REDIRECT_URI_REVIEW)
      + '&scope=identify'
      + '&state=' + state;
    window.location.href = url;
  });

  document.getElementById('retryBtn').addEventListener('click', () => show('stateLogin'));
  document.getElementById('retryNotifyBtn').addEventListener('click', () => {
    if (lastNotifyPayload) notifyGame(lastNotifyPayload);
  });

  (function init() {
    const params = new URLSearchParams(window.location.search);

    if (params.has('game') && params.has('session')) {
      try {
        sessionStorage.setItem(GAME_SESSION_KEY, params.get('session'));
        sessionStorage.setItem(GAME_PORT_KEY, params.get('port') || '41422');
      } catch (e) {}
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('game');
      cleanUrl.searchParams.delete('session');
      cleanUrl.searchParams.delete('port');
      window.history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
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
      show('stateLogin');
      return;
    }

    if (!gameSession()) { show('stateNoSession'); return; }
    show('stateLogin');
  })();
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
