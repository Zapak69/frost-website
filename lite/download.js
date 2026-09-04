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
  const OAUTH_STATE_KEY = 'frostLiteOauthState';
  const DISCORD_CLIENT_ID = '1512834635640475898';
  const DISCORD_REDIRECT_URI = 'https://frostclient.eu/lite';

  const states = ['stateLoading', 'stateLogin', 'stateNotMember', 'stateNoAccess', 'stateEligible', 'stateError', 'stateUpdating'];
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

  function fillChip(chipId, user) {
    const chip = document.getElementById(chipId);
    if (!user) { chip.style.display = 'none'; return; }
    chip.innerHTML =
      '<img class="user-avatar" src="' + avatarUrl(user) + '" alt=""/>' +
      '<div class="user-meta"><div class="user-name"></div><div class="user-tag"></div></div>';
    chip.querySelector('.user-name').textContent = user.name || user.username || 'Discord user';
    chip.querySelector('.user-tag').textContent = '@' + (user.username || '');
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

  function showError(msg, detail) {
    document.getElementById('errorText').textContent = msg || "We couldn't verify your Discord account. Please try again.";
    const detailEl = document.getElementById('errorDetail');
    detailEl.textContent = detail || '';
    detailEl.style.display = detail ? 'block' : 'none';
    show('stateError');
  }

  function render(data) {
    if (!data || !data.ok) { showError(); return; }
    if (data.status === 'not_member') {
      setAccessFlag(false);
      fillChip('chipNotMember', data.user);
      show('stateNotMember');
      return;
    }
    if (data.status === 'not_booster') {
      setAccessFlag(false);
      fillChip('chipNoAccess', data.user);
      show('stateNoAccess');
      return;
    }
    if (data.status === 'eligible') {
      setAccessFlag(true);
      let dl = '';
      try { dl = atob(data.dl || ''); } catch (e) { dl = ''; }
      if (!dl || dl.indexOf('?update') !== -1) { show('stateUpdating'); return; }
      fillChip('chipEligible', data.user);
      setupChooser(dl);
      show('stateEligible');
      return;
    }
    showError();
  }

  function recheck(token) {
    show('stateLoading');
    fetch(LITE_API_URL + '?action=siteCheck&token=' + encodeURIComponent(token), { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (!data.ok) {
          clearToken();
          if (data.error === 'token_expired') { show('stateLogin'); return; }
          showError("Discord didn't respond correctly. Please try again.", data.detail);
          return;
        }
        if (data.token) saveToken(data.token);
        render(data);
      })
      .catch(() => showError('Network error while contacting the server. Please try again.'));
  }

  document.querySelectorAll('.js-lite-login').forEach(loginBtn => {
    loginBtn.addEventListener('click', () => {
      try { fetch(LITE_API_URL + '?action=liteConfig', { cache: 'no-store', keepalive: true }); } catch (e) {}
      let csrfState = '';
      try {
        const buf = new Uint8Array(16);
        crypto.getRandomValues(buf);
        csrfState = Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
        sessionStorage.setItem(OAUTH_STATE_KEY, csrfState);
      } catch (e) {}
      const url = 'https://discord.com/oauth2/authorize'
        + '?client_id=' + encodeURIComponent(DISCORD_CLIENT_ID)
        + '&response_type=code'
        + '&redirect_uri=' + encodeURIComponent(DISCORD_REDIRECT_URI)
        + '&scope=' + encodeURIComponent('identify guilds.members.read')
        + (csrfState ? '&state=' + csrfState : '');
      window.location.href = url;
    });
  });

  document.querySelectorAll('.js-signout').forEach(btn => btn.addEventListener('click', () => {
    clearToken();
    show('stateLogin');
  }));

  document.getElementById('retryBtn').addEventListener('click', () => {
    const token = loadToken();
    if (token) { recheck(token); } else { show('stateLogin'); }
  });

  document.querySelectorAll('.dl-choice').forEach(tile => {
    tile.addEventListener('click', () => {
      if (tile.classList.contains('is-loading')) return;
      tile.classList.add('is-loading');
      setTimeout(() => tile.classList.remove('is-loading'), 6000);
    });
  });

  const PUBLIC_DL_BASE = 'https://bot.frostclient.eu/public_dl/';
  const LAUNCHER_FILES = {
    win: { file: 'Frost-Launcher-win.exe', label: 'Windows' },
    mac: { file: 'Frost-Launcher-mac.dmg', label: 'macOS (Apple Silicon & Intel)' },
    linux: { file: 'Frost-Launcher-linux.AppImage', label: 'Linux' }
  };

  function detectOs() {
    const ua = (navigator.userAgent || '') + ' ' + (navigator.platform || '');
    if (/Windows|Win32|Win64/i.test(ua)) return 'win';
    if (/Macintosh|Mac OS X|MacIntel|MacARM/i.test(ua)) return 'mac';
    if (/Linux|X11/i.test(ua)) return 'linux';
    return 'win';
  }

  function launcherUrl(file) {
    return PUBLIC_DL_BASE + file;
  }

  function setupChooser(dl) {
    document.getElementById('dlModpackBtn').href = dl;
    const os = detectOs();
    const primary = LAUNCHER_FILES[os];
    const launcherBtn = document.getElementById('dlLauncherBtn');
    launcherBtn.href = launcherUrl(primary.file);
    document.getElementById('dlLauncherSub').textContent = primary.label;
    const osIconKey = os === 'win' ? 'win' : (os === 'linux' ? 'linux' : 'mac');
    document.querySelectorAll('.dl-os-icon').forEach(el => {
      el.classList.toggle('active', el.dataset.os === osIconKey);
    });
    const altEl = document.getElementById('dlAltLinks');
    altEl.innerHTML = '';
    const altLabel = document.createElement('span');
    altLabel.textContent = 'Launcher for other systems:';
    altEl.appendChild(altLabel);
    Object.keys(LAUNCHER_FILES).forEach(key => {
      if (key === os) return;
      const a = document.createElement('a');
      a.href = launcherUrl(LAUNCHER_FILES[key].file);
      a.textContent = LAUNCHER_FILES[key].label;
      a.rel = 'noopener';
      altEl.appendChild(a);
    });
  }


  (function init() {
    const token = loadToken();
    if (token) { recheck(token); return; }
    show('stateLogin');
  })();
})();
