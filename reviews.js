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

  function formatAge(iso) {
    const then = new Date(iso);
    if (isNaN(then.getTime())) return '';
    const now = new Date();
    const diffMs = now - then;
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    if (days >= 7) {
      const dd = String(then.getDate()).padStart(2, '0');
      const mm = String(then.getMonth() + 1).padStart(2, '0');
      return then.getFullYear() !== now.getFullYear()
        ? `${dd}.${mm}.${then.getFullYear()}`
        : `${dd}.${mm}`;
    }
    if (days >= 1) return `${days} day${days === 1 ? '' : 's'} ago`;
    if (hours >= 1) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    if (minutes >= 1) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    return 'just now';
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

  function hasFpsData(review) {
    return review.fpsBefore != null && review.fpsAfter != null
      && !isNaN(Number(review.fpsBefore)) && !isNaN(Number(review.fpsAfter));
  }
  function hasWorseFps(review) {
    return hasFpsData(review) && Number(review.fpsBefore) > Number(review.fpsAfter);
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

    if (hasFpsData(review)) {
      const fps = document.createElement('div');
      fps.className = 'review-fps';
      const fpsIcon = document.createElement('span');
      fpsIcon.className = 'review-fps-icon';
      fpsIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>';
      const before = document.createElement('strong');
      before.textContent = Math.round(Number(review.fpsBefore)) + ' FPS';
      const after = document.createElement('strong');
      after.textContent = Math.round(Number(review.fpsAfter)) + ' FPS';
      fps.append(fpsIcon, before, ' → ', after);
      card.appendChild(fps);
    }

    const comment = document.createElement('p');
    comment.className = 'review-comment';
    comment.textContent = review.comment || '';
    card.appendChild(comment);

    if (review.submittedAt) {
      const age = document.createElement('div');
      age.className = 'review-age';
      age.textContent = formatAge(review.submittedAt);
      card.appendChild(age);
    }

    return card;
  }

  function show(id) {
    document.querySelectorAll('.reviews-state').forEach(el => el.classList.toggle('active', el.id === id));
  }

  fetch('https://bot.frostclient.eu/reviews_export.json', { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error('http_' + r.status);
      return r.json();
    })
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) {
        show('stateEmpty');
        return;
      }
      const qualifying = data.filter(r => parseStars(r.lite === true && r.liteStars ? r.liteStars : r.stars) >= 3 && !hasWorseFps(r));
      if (qualifying.length === 0) {
        show('stateEmpty');
        return;
      }
      const sorted = qualifying.slice().sort((a, b) => timestampOf(b) - timestampOf(a));
      const grid = document.getElementById('reviewsGrid');
      sorted.forEach((r, i) => grid.appendChild(buildCard(r, i === 0)));
      document.querySelectorAll('.reviews-state').forEach(el => el.classList.remove('active'));
      grid.classList.add('active');
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
