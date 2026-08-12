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

const scrollBar  = document.getElementById('scroll-bar');
const navEl      = document.querySelector('nav');
const fpsFills   = document.querySelectorAll('.fps-fill');
const perfSect   = document.getElementById('performance');

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href').slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

const revealEls = [...document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale')];
const DELAY_MAP = { 'reveal-delay-1': 80, 'reveal-delay-2': 160, 'reveal-delay-3': 240,
                    'reveal-delay-4': 340, 'reveal-delay-5': 440 };

revealEls.forEach(el => {
  el._delayPx = 0;
  for (const [cls, px] of Object.entries(DELAY_MAP)) {
    if (el.classList.contains(cls)) el._delayPx = px;
  }
});

function getRevealP(rect, delayPx) {
  const vh         = window.innerHeight;
  const enterStart = vh * 0.95 - delayPx;
  const enterEnd   = vh * 0.55;
  const exitStart  = -vh * 0.05;
  const exitEnd    = -vh * 0.55;

  if (rect.top > enterStart) return 0;
  if (rect.top < exitEnd)    return 0;
  if (rect.top >= enterEnd)  return (enterStart - rect.top) / (enterStart - enterEnd);
  if (rect.top >= exitStart) return 1;
  return (rect.top - exitEnd) / (exitStart - exitEnd);
}

function updateReveal() {
  revealEls.forEach(el => {
    const raw = getRevealP(el.getBoundingClientRect(), el._delayPx);
    el.style.setProperty('--p', Math.max(0, Math.min(1, raw)).toFixed(4));
  });
}

function updateFps() {
  if (!perfSect) return;
  const r  = perfSect.getBoundingClientRect();
  const vh = window.innerHeight;
  const on = r.top < vh * 0.72 && r.bottom > 0;
  fpsFills.forEach(f => f.classList.toggle('active', on));
}

function onScroll() {
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const pct = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
  scrollBar.style.width = pct.toFixed(2) + '%';

  navEl.style.background = window.scrollY > 40
    ? 'rgba(8,12,16,0.95)'
    : 'rgba(8,12,16,0.75)';

  updateReveal();
  updateFps();
}

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);

onScroll();

const cursorGlow = document.getElementById('cursor-glow');
const HALF = 280;

document.addEventListener('mousemove', (e) => {
  cursorGlow.style.transform = `translate(${e.clientX - HALF}px,${e.clientY - HALF}px)`;

  const under = document.elementFromPoint(e.clientX, e.clientY);
  const isInteractive = under && under.closest(
    'a, button, nav, [class*="btn"], .feature-card, .mock-row, .stat-item, .footer-col'
  );
  cursorGlow.style.opacity = isInteractive ? '0' : '1';
});

document.addEventListener('mouseleave', () => { cursorGlow.style.opacity = '0'; });

document.querySelectorAll('.btn-primary').forEach(btn => {
  btn.addEventListener('mousemove', (e) => {
    const r = btn.getBoundingClientRect();
    btn.style.setProperty('--mx', ((e.clientX - r.left) / r.width  * 100).toFixed(1) + '%');
    btn.style.setProperty('--my', ((e.clientY - r.top)  / r.height * 100).toFixed(1) + '%');
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.removeProperty('--mx');
    btn.style.removeProperty('--my');
  });
});

(function () {
  const countdownEl = document.getElementById('countdownText');
  if (!countdownEl) return;

  const RELEASE_DATE = new Date('2026-06-26T10:00:00Z').getTime();

  function pad(n) { return String(n).padStart(2, '0'); }

  function updateCountdown() {
    const remaining = Math.max(0, RELEASE_DATE - Date.now());
    const totalSeconds = Math.floor(remaining / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    countdownEl.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    if (remaining <= 0) clearInterval(timerId);
  }

  updateCountdown();
  const timerId = setInterval(updateCountdown, 1000);
})();

(function () {
  const EA_API_URL = 'https://script.google.com/macros/s/AKfycbxF57u1UNBsonktp5_2EseJtFkBZR0-CCxyazOGVUmEBrcwjU1-t6Us41gcrRqCsGcR/exec';
  const modal       = document.getElementById('eaModal');
  const modalBox    = document.getElementById('eaModalBox');
  const openBtns    = document.querySelectorAll('.js-ea-trigger');
  const closeBtn    = document.getElementById('eaCloseBtn');
  const stepCode    = document.getElementById('eaStepCode');
  const stepTos     = document.getElementById('eaStepTos');
  const codeInput   = document.getElementById('eaCodeInput');
  const codeError   = document.getElementById('eaCodeError');
  const verifyBtn   = document.getElementById('eaVerifyBtn');
  const agreeCheck  = document.getElementById('eaAgreeCheck');
  const downloadBtn = document.getElementById('eaDownloadBtn');
  const claimError  = document.getElementById('eaClaimError');
  const invitedByEl = document.getElementById('eaInvitedBy');

  const versionModal     = document.getElementById('versionModal');
  const versionCloseBtn  = document.getElementById('versionCloseBtn');
  const versionVulkanBtn = document.getElementById('versionVulkanBtn');
  const versionOpenglBtn = document.getElementById('versionOpenglBtn');
  let pendingVulkanUrl = null;
  let pendingOpenglUrl = null;

  function closeVersionModal() { versionModal.classList.remove('active'); }

  function applyVersionCardState(cardEl, url, downloaded) {
    cardEl.classList.toggle('downloaded', !!downloaded);
    cardEl.disabled = !url || !!downloaded;
  }

  function openVersionModal(vulkanUrl, openglUrl, vulkanDownloaded, openglDownloaded) {
    pendingVulkanUrl = vulkanUrl;
    pendingOpenglUrl = openglUrl;
    applyVersionCardState(versionVulkanBtn, vulkanUrl, vulkanDownloaded);
    applyVersionCardState(versionOpenglBtn, openglUrl, openglDownloaded);
    versionModal.classList.add('active');
  }

  async function claimVariant(variant, url, btnEl) {
    if (!url || btnEl.disabled) return;
    btnEl.disabled = true;
    btnEl.classList.add('loading');

    try {
      const ip = await (window.__frostIpPromise || Promise.resolve(''));
      const code = codeInput.value.trim();
      const res = await fetch(`${EA_API_URL}?action=downloadVariant&code=${encodeURIComponent(code)}&ip=${encodeURIComponent(ip)}&variant=${variant}`);
      const data = await res.json();

      btnEl.classList.remove('loading');
      if (data && data.allowed) {
        window.open(url, '_blank');
        applyVersionCardState(btnEl, url, true);
        closeVersionModal();
      } else {
        applyVersionCardState(btnEl, url, true);
      }
    } catch (err) {
      btnEl.classList.remove('loading');
      btnEl.disabled = false;
    }
  }

  if (versionCloseBtn) versionCloseBtn.addEventListener('click', closeVersionModal);
  if (versionModal) versionModal.addEventListener('click', (e) => { if (e.target === versionModal) closeVersionModal(); });
  if (versionVulkanBtn) versionVulkanBtn.addEventListener('click', () => claimVariant('vulkan', pendingVulkanUrl, versionVulkanBtn));
  if (versionOpenglBtn) versionOpenglBtn.addEventListener('click', () => claimVariant('opengl', pendingOpenglUrl, versionOpenglBtn));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && versionModal && versionModal.classList.contains('active')) closeVersionModal();
  });

  if (!modal) return;

  const STEP_TRANSITION_MS = 200;
  let verifyErrorTimer = null;

  function showError(msg) {
    codeError.textContent = msg;
    codeError.classList.toggle('visible', !!msg);
    clearTimeout(verifyErrorTimer);
    if (msg) {
      codeInput.classList.remove('shake');
      void codeInput.offsetWidth;
      codeInput.classList.add('shake');
      verifyBtn.classList.remove('loading');
      verifyBtn.classList.add('error');
      verifyErrorTimer = setTimeout(() => verifyBtn.classList.remove('error'), 1800);
    } else {
      verifyBtn.classList.remove('error');
    }
  }

  function switchStep(fromEl, toEl) {
    modalBox.classList.toggle('wide', toEl === stepTos);
    fromEl.classList.add('step-leaving');
    setTimeout(() => {
      fromEl.classList.remove('active', 'step-leaving');
      toEl.classList.add('active');
    }, STEP_TRANSITION_MS);
  }

  function openModal() {
    resetModal();
    modal.classList.add('active');
    setTimeout(() => codeInput.focus(), 300);
  }
  function closeModal() {
    modal.classList.remove('active');
  }
  function resetModal() {
    clearTimeout(verifyErrorTimer);
    stepCode.classList.add('active');
    stepCode.classList.remove('step-leaving');
    stepTos.classList.remove('active', 'step-leaving');
    modalBox.classList.remove('wide');
    codeInput.value = '';
    codeInput.classList.remove('shake');
    codeError.textContent = '';
    codeError.classList.remove('visible');
    verifyBtn.disabled = false;
    verifyBtn.classList.remove('loading', 'error');
    agreeCheck.checked = false;
    downloadBtn.disabled = true;
    downloadBtn.classList.remove('unlocked', 'loading', 'error');
    claimError.textContent = '';
    claimError.classList.remove('visible');
    invitedByEl.textContent = '';
    invitedByEl.classList.remove('visible');
  }
  const myClaimPromise = EA_API_URL.includes('REPLACE_WITH_YOUR_DEPLOYMENT_ID')
    ? Promise.resolve(null)
    : (window.__frostIpPromise || Promise.resolve('')).then((ip) => {
        if (!ip) return null;
        return fetch(`${EA_API_URL}?action=myClaim&ip=${encodeURIComponent(ip)}`, { cache: 'no-store' })
          .then((r) => r.json())
          .catch(() => null);
      });

  async function handleEaTriggerClick() {
    try {
      const data = await myClaimPromise;
      if (data && data.claimed) {
        let vulkanUrl = null;
        let openglUrl = null;
        try { vulkanUrl = data.dlVulkan ? atob(data.dlVulkan) : null; } catch (err) { vulkanUrl = null; }
        try { openglUrl = data.dlOpenGL ? atob(data.dlOpenGL) : null; } catch (err) { openglUrl = null; }
        if (vulkanUrl || openglUrl) {
          codeInput.value = data.code || '';
          openVersionModal(vulkanUrl, openglUrl, data.vulkanDownloaded, data.openglDownloaded);
          return;
        }
      }
    } catch (err) {}
    openModal();
  }

  openBtns.forEach(btn => btn.addEventListener('click', handleEaTriggerClick));
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('active')) closeModal(); });

  codeInput.addEventListener('input', () => {
    let v = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (v.length > 3) v = v.slice(0, 3) + '-' + v.slice(3);
    codeInput.value = v;
    showError('');
  });
  codeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') verifyBtn.click(); });

  verifyBtn.addEventListener('click', async () => {
    if (verifyBtn.classList.contains('loading')) return;

    const code = codeInput.value.trim();
    if (!/^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(code)) {
      showError('Enter a code in the format XXX-XXX.');
      return;
    }
    if (EA_API_URL.includes('REPLACE_WITH_YOUR_DEPLOYMENT_ID')) {
      showError('Backend not configured yet.');
      return;
    }

    verifyBtn.disabled = true;
    verifyBtn.classList.remove('error');
    verifyBtn.classList.add('loading');
    showError('');

    try {
      const ip = await (window.__frostIpPromise || Promise.resolve(''));
      const res = await fetch(`${EA_API_URL}?code=${encodeURIComponent(code)}&ip=${encodeURIComponent(ip)}`);
      const data = await res.json();

      if (data.valid) {
        verifyBtn.classList.remove('loading');
        if (data.invitedBy) {
          invitedByEl.textContent = data.invitedBy;
          invitedByEl.classList.add('visible');
        }
        switchStep(stepCode, stepTos);
      } else {
        const msgs = {
          already_used: 'This code has already been used.',
          not_found: 'Invalid code. Please check and try again.',
          banned: 'This code cannot be redeemed from your network.',
          ip_already_claimed: "You've already claimed a different code from this network."
        };
        showError(msgs[data.error] || 'Invalid code. Please check and try again.');
      }
    } catch (err) {
      showError('Could not verify code. Please try again.');
    } finally {
      verifyBtn.disabled = false;
      verifyBtn.classList.remove('loading');
    }
  });

  agreeCheck.addEventListener('change', () => {
    const checked = agreeCheck.checked;
    downloadBtn.disabled = !checked;
    downloadBtn.classList.toggle('unlocked', checked);
    if (checked) {
      downloadBtn.classList.remove('error');
      claimError.textContent = '';
      claimError.classList.remove('visible');
    }
  });

  function showClaimError(msg) {
    downloadBtn.classList.remove('loading');
    downloadBtn.classList.add('error');
    downloadBtn.disabled = true;
    claimError.textContent = msg;
    claimError.classList.add('visible');
  }

  downloadBtn.addEventListener('click', async () => {
    if (downloadBtn.disabled || downloadBtn.classList.contains('loading') || downloadBtn.classList.contains('error')) return;

    downloadBtn.classList.add('loading');
    downloadBtn.disabled = true;
    claimError.textContent = '';
    claimError.classList.remove('visible');

    try {
      const ip = await (window.__frostIpPromise || Promise.resolve(''));
      const code = codeInput.value.trim();
      const res = await fetch(`${EA_API_URL}?action=claim&code=${encodeURIComponent(code)}&ip=${encodeURIComponent(ip)}`);
      const data = await res.json();

      if (data.valid) {
        let vulkanUrl = null;
        let openglUrl = null;
        try { vulkanUrl = data.dlVulkan ? atob(data.dlVulkan) : null; } catch (decodeErr) { vulkanUrl = null; }
        try { openglUrl = data.dlOpenGL ? atob(data.dlOpenGL) : null; } catch (decodeErr) { openglUrl = null; }

        if (vulkanUrl || openglUrl) {
          downloadBtn.classList.remove('loading');
          closeModal();
          openVersionModal(vulkanUrl, openglUrl, data.vulkanDownloaded, data.openglDownloaded);
        } else {
          showClaimError('Something went wrong. Please try again.');
        }
      } else {
        const msgs = {
          already_used: 'This code was just claimed by someone else.',
          ip_already_claimed: "You've already claimed a different code from this network.",
          banned: 'This code cannot be claimed from your network.',
          not_found: 'This code is no longer valid.'
        };
        showClaimError(msgs[data.error] || 'Could not claim this code. Please try again.');
      }
    } catch (err) {
      showClaimError('Network error. Please try again.');
    }
  });
  (function prefillFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('code');
    if (!raw) return;

    let v = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (v.length > 3) v = v.slice(0, 3) + '-' + v.slice(3);
    if (!v) return;

    openModal();
    codeInput.value = v;

    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('code');
    window.history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
  })();
})();
