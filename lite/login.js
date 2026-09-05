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

  const TOKEN_KEY = 'frostToken';
  const LEGACY_TOKEN_KEY = 'frostLiteToken';
  const OAUTH_STATE_KEY = 'frostLiteOauthState';
  const DISCORD_CLIENT_ID = '1512834635640475898';
  const DISCORD_REDIRECT_URI_GAME = 'https://frostclient.eu/lite/login';
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
      gameToken: data && data.gameToken,
      daysLeft: daysLeft,
      uid: user && user.id,
      avatar: user && user.avatar,
      name: user && (user.name || user.username),
    });
    const note = document.getElementById('gameReturnNote');
    if (note) note.style.display = 'block';
    if (status === 'eligible') {
      const dlBtn = document.getElementById('liteDownloadBtn');
      if (dlBtn) dlBtn.style.display = 'none';
    }
  }

  const states = ['stateLoading', 'stateLogin', 'stateNotMember', 'stateNotBooster', 'stateEligible', 'stateError', 'stateUpdating'];
  function showNoGame() {
    document.querySelector('.lite-card').style.display = 'none';
    document.querySelector('.lite-page').classList.add('centered');
    document.getElementById('pageTitle').textContent = 'Game is not Launched';
    document.getElementById('pageSub').textContent = 'This page is only meant to be opened by FrostClient Lite itself - launch the game first, then try logging in again from there.';
  }

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
    try {
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      return localStorage.getItem(TOKEN_KEY) || '';
    } catch (e) { return ''; }
  }
  function clearToken() {
    try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem('frostLiteAccess'); } catch (e) {}
    document.dispatchEvent(new CustomEvent('frostAccountLogout'));
  }

  function showError(msg, detail) {
    document.getElementById('errorText').textContent = msg || "We couldn't verify your Discord account. Please try again.";
    const detailEl = document.getElementById('errorDetail');
    detailEl.textContent = detail || '';
    detailEl.style.display = detail ? 'block' : 'none';
    show('stateError');
  }

  function render(data) {
    if (!data || !data.ok) { showError(); afterResult('error', data); return; }

    if (data.status === 'not_member') {
      fillChip('chipNotMember', data.user);
      show('stateNotMember');
      afterResult('not_member', data);
      return;
    }
    if (data.status === 'not_booster') {
      fillChip('chipNotBooster', data.user);
      show('stateNotBooster');
      afterResult('not_booster', data);
      return;
    }
    if (data.status === 'eligible') {
      fillChip('chipEligible', data.user, data.boostDays != null
        ? 'Boosting for ' + data.boostDays + (data.boostDays === 1 ? ' day' : ' days')
        : null);
      document.getElementById('badgeLabelText').textContent =
        data.accessVia === 'subscriber' ? 'Lite Subscriber' : 'Server Booster';
      const btn = document.getElementById('liteDownloadBtn');
      try { btn.href = atob(data.dl); } catch (e) { btn.href = '#'; }
      show('stateEligible');
      btn.classList.remove('just-unlocked');
      void btn.offsetWidth;
      btn.classList.add('just-unlocked');
      afterResult('eligible', data);
      return;
    }
    showError();
    afterResult('error', data);
  }

  function exchange(code) {
    show('stateLoading');
    fetch(LITE_API_URL + '?action=gameLiteAuth&code=' + encodeURIComponent(code), { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (!data.ok) {
          showError(data.error === 'auth_failed'
            ? 'Discord sign-in failed. Please try again.'
            : "Discord didn't respond correctly. Please try again.", data.detail);
          return;
        }
        if (data.gameToken) { saveToken(data.gameToken); document.dispatchEvent(new CustomEvent('frostAccountLogin')); }
        render(data);
      })
      .catch(() => showError('Network error while contacting the server. Please try again.'));
  }
  function recheck(token) {
    show('stateLoading');
    fetch(LITE_API_URL + '?action=siteCheck&token=' + encodeURIComponent(token), { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (!data.ok) {
          if (data.error === 'token_expired') { clearToken(); show('stateLogin'); return; }
          showError("Discord didn't respond correctly. Please try again.", data.detail);
          return;
        }
        if (!data.gameToken) data.gameToken = token;
        render(data);
      })
      .catch(() => showError('Network error while contacting the server. Please try again.'));
  }
  document.querySelectorAll('.js-lite-login').forEach(loginBtn => {
    loginBtn.addEventListener('click', () => {
      try { fetch(LITE_API_URL + '?action=gameLiteConfig', { cache: 'no-store', keepalive: true }); } catch (e) {}
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
        + '&redirect_uri=' + encodeURIComponent(DISCORD_REDIRECT_URI_GAME)
        + '&scope=' + encodeURIComponent('identify guilds.members.read')
        + (state ? '&state=' + state : '');
      window.location.href = url;
    });
  });

  document.querySelectorAll('.js-signout').forEach(btn => btn.addEventListener('click', () => {
    clearToken();
    show('stateLogin');
  }));

  document.getElementById('retryBtn').addEventListener('click', () => show('stateLogin'));

  const gameReturnRetryBtn = document.getElementById('gameReturnRetryBtn');
  if (gameReturnRetryBtn) gameReturnRetryBtn.addEventListener('click', retryNotifyGame);

  const dlBtn = document.getElementById('liteDownloadBtn');
  dlBtn.addEventListener('click', () => {
    dlBtn.classList.add('clicked');
    setTimeout(() => dlBtn.classList.remove('clicked'), 450);
  });

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
    } else if (params.has('code') && !gameSession()) {
      const returnedState = params.get('state') || '';
      const gIdx = returnedState.indexOf('.g.');
      if (gIdx !== -1) {
        const gameParts = returnedState.slice(gIdx + 3).split('.');
        if (gameParts.length === 2 && gameParts[0] && gameParts[1]) {
          try {
            sessionStorage.setItem(GAME_SESSION_KEY, gameParts[0]);
            sessionStorage.setItem(GAME_PORT_KEY, gameParts[1]);
          } catch (e) {}
        }
      }
    }
    if (!gameSession() || !gamePort()) {
      showNoGame();
      return;
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
    if (token) { recheck(token); return; }

    show('stateLogin');
  })();
})();
