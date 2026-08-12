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
  function formatDuration(ms) {
    const totalMinutes = Math.max(0, Math.floor(ms / 60000));
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) return days + 'd ' + hours + 'h';
    if (hours > 0) return hours + 'h ' + minutes + 'm';
    return minutes + 'm';
  }

  function formatMonthLabel(monthKeyStr) {
    const parts = String(monthKeyStr || '').split('-').map(Number);
    if (parts.length !== 2 || !parts[0] || !parts[1]) return 'this month';
    const d = new Date(Date.UTC(parts[0], parts[1] - 1, 1));
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }

  function show(id) {
    document.querySelectorAll('.lb-state').forEach(el => el.classList.toggle('active', el.id === id));
  }

  function buildRow(entry, index) {
    const medals = ['🥇', '🥈', '🥉'];
    const row = document.createElement('div');
    row.className = 'lb-row' + (index < 3 ? ' top' + (index + 1) : '');

    const rank = document.createElement('div');
    rank.className = 'lb-rank';
    rank.textContent = medals[index] || String(index + 1);
    row.appendChild(rank);

    const avatar = document.createElement('img');
    avatar.className = 'lb-avatar';
    avatar.src = 'https://mc-heads.net/avatar/' + encodeURIComponent(entry.username) + '/80';
    avatar.alt = '';
    avatar.loading = 'lazy';
    row.appendChild(avatar);

    const nameCol = document.createElement('div');
    nameCol.className = 'lb-name-col';

    const name = document.createElement('div');
    name.className = 'lb-name' + (entry.isLite ? ' is-lite' : '');
    name.textContent = entry.username;
    nameCol.appendChild(name);

    if (entry.isLite) {
      const badge = document.createElement('span');
      badge.className = 'lb-lite-badge';
      badge.textContent = 'LITE';
      badge.setAttribute('data-tooltip', 'Lite user');
      nameCol.appendChild(badge);
    }

    row.appendChild(nameCol);

    const time = document.createElement('div');
    time.className = 'lb-time';
    time.textContent = formatDuration(entry.playtimeMs);
    row.appendChild(time);

    return row;
  }

  fetch('https://bot.frostclient.eu/leaderboard', { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error('http_' + r.status);
      return r.json();
    })
    .then(data => {
      if (!data || data.ok !== true) throw new Error('bad_response');
      const entries = data.leaderboard || [];
      document.getElementById('lbSub').textContent =
        'The 10 most active FrostClient players in ' + formatMonthLabel(data.month) + ', ranked by playtime.';
      if (entries.length === 0) {
        show('stateEmpty');
        return;
      }
      const list = document.getElementById('lbList');
      entries.forEach((entry, i) => list.appendChild(buildRow(entry, i)));
      document.querySelectorAll('.lb-state').forEach(el => el.classList.remove('active'));
      list.classList.add('active');
    })
    .catch(() => show('stateError'));
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
