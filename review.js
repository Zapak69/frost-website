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
  const LEGACY_TOKEN_KEY = 'frostReviewToken';
  const OAUTH_STATE_KEY = 'frostReviewOauthState';
  const DISCORD_CLIENT_ID = '1512834635640475898';
  const DISCORD_REDIRECT_URI_REVIEW = 'https://frostclient.eu/review';

  const states = ['stateLoading', 'stateLogin', 'stateWorking', 'stateForm', 'stateSubmitting', 'stateDone', 'stateError'];
  function show(id) {
    states.forEach(s => document.getElementById(s).classList.toggle('active', s === id));
  }

  function saveToken(t) {
    if (!t) return;
    let changed = false;
    try { changed = localStorage.getItem(TOKEN_KEY) !== t; localStorage.setItem(TOKEN_KEY, t); } catch (e) {}
    if (changed) document.dispatchEvent(new CustomEvent('frostAccountLogin'));
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

  function showError(msg) {
    document.getElementById('errorText').textContent = msg || "We couldn't sign you in. Please try again.";
    show('stateError');
  }

  let currentUser = null;
  let selectedRating = 0;
  let isLiteMember = false;
  const MAX_LEN = 1000;

  function paintStars() {
    document.querySelectorAll('.star-btn').forEach(btn => {
      btn.classList.toggle('filled', Number(btn.dataset.star) <= selectedRating);
    });
  }
  document.getElementById('starRow').addEventListener('click', (e) => {
    const btn = e.target.closest('.star-btn');
    if (!btn) return;
    selectedRating = Number(btn.dataset.star);
    paintStars();
  });

  const commentBox = document.getElementById('commentBox');
  const charCount = document.getElementById('charCount');
  commentBox.addEventListener('input', () => {
    charCount.textContent = String(commentBox.value.length);
  });

  const fpsKnownCheck = document.getElementById('fpsKnownCheck');
  const fpsSliders = document.getElementById('fpsSliders');
  const fpsBeforeSlider = document.getElementById('fpsBeforeSlider');
  const fpsAfterSlider = document.getElementById('fpsAfterSlider');
  const fpsBeforeValue = document.getElementById('fpsBeforeValue');
  const fpsAfterValue = document.getElementById('fpsAfterValue');
  fpsKnownCheck.addEventListener('change', () => {
    fpsSliders.classList.toggle('show', fpsKnownCheck.checked);
  });
  fpsBeforeSlider.addEventListener('input', () => { fpsBeforeValue.textContent = fpsBeforeSlider.value; });
  fpsAfterSlider.addEventListener('input', () => { fpsAfterValue.textContent = fpsAfterSlider.value; });

  function showForm(user, review) {
    currentUser = user;
    document.getElementById('reviewerAvatar').src = user.avatar
      ? 'https://cdn.discordapp.com/avatars/' + user.id + '/' + user.avatar + '.png?size=64'
      : 'https://cdn.discordapp.com/embed/avatars/0.png';
    document.getElementById('reviewerName').textContent = user.name || user.username || 'Discord user';
    document.getElementById('reviewerSub').textContent = review ? 'Editing your review' : 'Writing a new review';
    document.getElementById('formError').style.display = 'none';

    document.getElementById('liteReviewerNote').classList.toggle('show', isLiteMember);
    document.getElementById('commentLabel').textContent = isLiteMember
      ? "What's different with Lite? (optional)"
      : 'Your comment (optional)';
    commentBox.placeholder = isLiteMember
      ? 'More FPS? Smoother gameplay? What have you noticed since switching to Lite?'
      : 'What do you like, or what should we improve?';

    selectedRating = review ? review.rating : 0;
    paintStars();
    commentBox.value = review ? (review.comment || '') : '';
    charCount.textContent = String(commentBox.value.length);
    document.getElementById('publicCheck').checked = review ? !!review.isPublic : true;

    const hasFps = !!(review && (review.fpsBefore != null || review.fpsAfter != null));
    fpsKnownCheck.checked = hasFps;
    fpsSliders.classList.toggle('show', hasFps);
    fpsBeforeSlider.value = (review && review.fpsBefore != null) ? review.fpsBefore : 60;
    fpsAfterSlider.value = (review && review.fpsAfter != null) ? review.fpsAfter : 120;
    fpsBeforeValue.textContent = fpsBeforeSlider.value;
    fpsAfterValue.textContent = fpsAfterSlider.value;

    document.getElementById('submitBtn').textContent = review ? 'Update review' : 'Submit review';
    show('stateForm');
  }

  function formError(msg) {
    const el = document.getElementById('formError');
    el.textContent = msg;
    el.style.display = 'block';
  }

  document.getElementById('submitBtn').addEventListener('click', () => {
    if (selectedRating < 1 || selectedRating > 5) {
      formError('Please pick a star rating.');
      return;
    }
    const token = loadToken();
    if (!token) { show('stateLogin'); return; }

    show('stateSubmitting');
    fetch(LITE_API_URL + '?action=submitReview', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        token: token,
        rating: selectedRating,
        comment: commentBox.value.slice(0, MAX_LEN),
        isPublic: document.getElementById('publicCheck').checked,
        fpsBefore: fpsKnownCheck.checked ? Number(fpsBeforeSlider.value) : null,
        fpsAfter: fpsKnownCheck.checked ? Number(fpsAfterSlider.value) : null
      })
    })
      .then(r => r.json())
      .then(data => {
        if (data.error === 'token_expired') { clearToken(); show('stateLogin'); return; }
        if (!data.ok) {
          show('stateForm');
          formError('Could not send your review. Please try again.');
          return;
        }
        show('stateDone');
      })
      .catch(() => {
        show('stateForm');
        formError('Network error while sending your review. Please try again.');
      });
  });

  document.getElementById('editAgainBtn').addEventListener('click', () => {
    if (currentUser) showForm(currentUser, {
      rating: selectedRating, comment: commentBox.value, isPublic: document.getElementById('publicCheck').checked,
      fpsBefore: fpsKnownCheck.checked ? Number(fpsBeforeSlider.value) : null,
      fpsAfter: fpsKnownCheck.checked ? Number(fpsAfterSlider.value) : null
    });
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearToken();
    currentUser = null;
    show('stateLogin');
  });

  document.getElementById('retryBtn').addEventListener('click', () => show('stateLogin'));

  function startLogin() {
    try { fetch(LITE_API_URL + '?action=identifyConfig', { cache: 'no-store', keepalive: true }); } catch (e) {}
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
      + '&redirect_uri=' + encodeURIComponent(DISCORD_REDIRECT_URI_REVIEW)
      + '&scope=' + encodeURIComponent('identify guilds.members.read')
      + '&state=' + csrfState;
    window.location.href = url;
  }
  document.getElementById('loginBtn').addEventListener('click', startLogin);

  function applyStatus(data) {
    if (!data.ok || !data.user) {
      clearToken();
      show('stateLogin');
      return;
    }
    saveToken(data.token);
    isLiteMember = data.isLiteMember === true;
    showForm(data.user, data.review);
  }

  (function init() {
    const params = new URLSearchParams(window.location.search);

    if (params.has('code')) {
      show('stateWorking');
      const code = params.get('code');
      const returnedState = params.get('state') || '';
      let storedState = '';
      try { storedState = sessionStorage.getItem(OAUTH_STATE_KEY) || ''; } catch (e) {}
      try { sessionStorage.removeItem(OAUTH_STATE_KEY); } catch (e) {}

      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('code');
      cleanUrl.searchParams.delete('state');
      window.history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);

      if (storedState && returnedState !== storedState) {
        showError('Sign-in session mismatch. Please try again.');
        return;
      }
      fetch(LITE_API_URL + '?action=identifyAuth&code=' + encodeURIComponent(code), { cache: 'no-store' })
        .then(r => r.json())
        .then(applyStatus)
        .catch(() => showError('Network error while contacting the server. Please try again.'));
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

    const token = loadToken();
    if (!token) { show('stateLogin'); return; }
    show('stateLoading');
    fetch(LITE_API_URL + '?action=identifyCheck&token=' + encodeURIComponent(token), { cache: 'no-store' })
      .then(r => r.json())
      .then(applyStatus)
      .catch(() => showError('Network error while contacting the server. Please try again.'));
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
