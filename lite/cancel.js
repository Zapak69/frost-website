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

  function loadToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }

  const token = loadToken();
  if (!token) return;

  const card = document.getElementById('saveCard');
  const claimBtn = document.getElementById('claimOfferBtn');
  const resultEl = document.getElementById('saveResult');

  fetch(LITE_API_URL + '?action=retentionOfferStatus&token=' + encodeURIComponent(token), { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data && data.ok && data.eligible) {
        card.style.display = 'block';
      }
    })
    .catch(function () {});

  claimBtn.addEventListener('click', function () {
    claimBtn.disabled = true;
    claimBtn.textContent = 'Claiming...';
    fetch(LITE_API_URL + '?action=claimRetentionOffer&token=' + encodeURIComponent(token), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        claimBtn.style.display = 'none';
        if (data && data.ok) {
          resultEl.textContent = 'Done — 3 free days added to your subscription. Thanks for staying!';
          resultEl.className = 'save-result success';
        } else {
          resultEl.textContent = "This offer isn't available for your account right now — you can still cancel below.";
          resultEl.className = 'save-result error';
        }
        resultEl.style.display = '';
      })
      .catch(function () {
        claimBtn.disabled = false;
        claimBtn.textContent = 'Claim 3 free days';
        resultEl.textContent = 'Network error — please try again.';
        resultEl.className = 'save-result error';
        resultEl.style.display = '';
      });
  });
})();
