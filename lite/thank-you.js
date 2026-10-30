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
  const LITE_API_URL = 'https://bot.frostclient.eu/sheets';
  const PAYMENT_ID_KEY = 'frostWhopPaymentId';
  const OAUTH_STATE_KEY = 'frostWhopOauthState';
  const DISCORD_CLIENT_ID = '1512834635640475898';
  const DISCORD_REDIRECT_URI_THANKYOU = 'https://frostclient.eu/lite/thank-you';

  const states = ['stateLogin', 'stateClaiming', 'stateGranted', 'stateNoPayment', 'stateError'];
  const TOKEN_KEY = 'frostToken';
  const liteHero = document.getElementById('liteHero');
  const litePageEl = document.querySelector('.lite-page');
  function show(id) {
    states.forEach(s => document.getElementById(s).classList.toggle('active', s === id));
    if (liteHero) liteHero.style.display = id === 'stateNoPayment' ? 'none' : '';
    if (litePageEl) litePageEl.classList.toggle('centered', id === 'stateNoPayment');
  }

  function showError(msg, detail) {
    document.getElementById('errorText').textContent = msg || "We couldn't verify your purchase. Please try again.";
    const detailEl = document.getElementById('errorDetail');
    detailEl.textContent = detail || '';
    detailEl.style.display = detail ? 'block' : 'none';
    show('stateError');
  }

  function claim(code, paymentId, attempt) {
    attempt = attempt || 0;
    show('stateClaiming');
    fetch(LITE_API_URL + '?action=whopClaim&code=' + encodeURIComponent(code) + '&payment_id=' + encodeURIComponent(paymentId), { cache: 'no-store' })
      .then(r => r.json().then(data => ({ status: r.status, data: data })))
      .then(({ status, data }) => {
        if (!data || !data.ok) {
          if (((status === 503 && data && data.error === 'busy') || status === 429) && attempt < 3) {
            setTimeout(() => claim(code, paymentId, attempt + 1), 2000 * (attempt + 1));
            return;
          }
          const messages = {
            already_claimed_by_other: 'This purchase was already claimed by a different Discord account.',
            payment_not_found: "We couldn't find that purchase. Please try again or contact support.",
            payment_not_paid: 'This purchase is not marked as paid yet.',
            no_whop_user: "We couldn't find an account tied to this purchase.",
            role_grant_failed: "Discord wouldn't let us grant the role. Please contact support.",
            discord_auth_failed: 'Discord sign-in failed. Please try again.',
            not_lite_purchase: "This payment isn't a Frost Lite purchase, so it can't unlock Lite. If you bought a cloak, it unlocks on the store instead.",
            subscription_inactive: "Your Lite subscription isn't active right now. If you just paid, wait a minute and try again, or contact support.",
            busy: 'Our server is busy right now. Please wait a minute, then press Try again and sign in once more.'
          };
          const error = data && data.error;
          const trialUsed = error === 'subscription_inactive' && /trial_already_used/.test(String(data.detail || ''));
          showError(trialUsed ? 'A free trial was already used on this Discord account, so this purchase can\'t start another one. Contact support if you think this is a mistake.' : (messages[error] || "Something went wrong verifying your purchase."), trialUsed || error === 'busy' ? '' : data && data.detail);
          return;
        }
        try { localStorage.setItem(TOKEN_KEY, data.gameToken); } catch (e) {}
        document.dispatchEvent(new CustomEvent('frostAccountLogin'));
        show('stateGranted');
      })
      .catch(() => showError('Network error while contacting the server. Please try again.'));
  }

  const loginBtn = document.getElementById('loginBtn');
  loginBtn.addEventListener('click', () => {
    const paymentId = sessionStorage.getItem(PAYMENT_ID_KEY) || '';
    if (!paymentId) { show('stateNoPayment'); return; }
    try { fetch(LITE_API_URL + '?action=whopClaimConfig', { cache: 'no-store', keepalive: true }); } catch (e) {}
    let csrfState = '';
    try {
      const buf = new Uint8Array(16);
      crypto.getRandomValues(buf);
      csrfState = Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
      sessionStorage.setItem(OAUTH_STATE_KEY, csrfState);
    } catch (e) {}
    const state = csrfState + '.p.' + paymentId;
    const url = 'https://discord.com/oauth2/authorize'
      + '?client_id=' + encodeURIComponent(DISCORD_CLIENT_ID)
      + '&response_type=code'
      + '&redirect_uri=' + encodeURIComponent(DISCORD_REDIRECT_URI_THANKYOU)
      + '&scope=' + encodeURIComponent('identify guilds.members.read guilds.join')
      + '&state=' + state;
    window.location.href = url;
  });

  document.getElementById('retryBtn').addEventListener('click', () => show('stateLogin'));

  (function init() {
    const params = new URLSearchParams(window.location.search);

    if (params.has('code')) {
      const code = params.get('code');
      const returnedState = params.get('state') || '';
      let storedState = '';
      try { storedState = sessionStorage.getItem(OAUTH_STATE_KEY) || ''; } catch (e) {}
      try { sessionStorage.removeItem(OAUTH_STATE_KEY); } catch (e) {}

      const pIdx = returnedState.indexOf('.p.');
      const csrfState = pIdx === -1 ? returnedState : returnedState.slice(0, pIdx);
      let paymentId = pIdx !== -1 ? returnedState.slice(pIdx + 3) : '';
      if (!paymentId) {
        try { paymentId = sessionStorage.getItem(PAYMENT_ID_KEY) || ''; } catch (e) {}
      }

      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('code');
      cleanUrl.searchParams.delete('state');
      window.history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);

      if (!storedState || csrfState !== storedState) {
        showError('Sign-in session mismatch. Please try again.');
        return;
      }
      if (!paymentId) { show('stateNoPayment'); return; }
      try { sessionStorage.setItem(PAYMENT_ID_KEY, paymentId); } catch (e) {}
      claim(code, paymentId);
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
    const paymentId = params.get('payment_id') || params.get('receipt_id') || '';
    if (paymentId) {
      try { sessionStorage.setItem(PAYMENT_ID_KEY, paymentId); } catch (e) {}
      const cleanUrl = new URL(window.location.href);
      ['receipt_id', 'payment_id', 'checkout_status', 'status', 'state_id'].forEach(k => cleanUrl.searchParams.delete(k));
      window.history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
      show('stateLogin');
      return;
    }

    let cachedPaymentId = '';
    try { cachedPaymentId = sessionStorage.getItem(PAYMENT_ID_KEY) || ''; } catch (e) {}
    show(cachedPaymentId ? 'stateLogin' : 'stateNoPayment');
  })();
})();
