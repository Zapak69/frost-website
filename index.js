(function () {
  const VERSION_PAGE = 'https://modrinth.com/modpack/frost-client/version/';
  const VERSIONS = {
    vulkan: [
      { label: '26.1.2',  url: VERSION_PAGE + '26.1.2_Vulkan' },
      { label: '1.21.11', url: VERSION_PAGE + '1.21.11_Vulkan' },
      { label: '1.21.10', url: VERSION_PAGE + '1.21.10_Vulkan' },
      { label: '1.21.5',  url: VERSION_PAGE + '1.21.5_Vulkan' },
      { label: '1.21.4',  url: VERSION_PAGE + '1.21.4_Vulkan' },
      { label: '1.21.1',  url: VERSION_PAGE + '1.21.1_Vulkan' }
    ],
    opengl: [
      { label: '26.2',    url: VERSION_PAGE + '26.2_OpenGL' },
      { label: '26.1.2',  url: VERSION_PAGE + '26.1.2_OpenGL' },
      { label: '1.21.11', url: VERSION_PAGE + '1.21.11_OpenGL' },
      { label: '1.21.10', url: VERSION_PAGE + '1.21.10_OpenGL' },
      { label: '1.21.8',  url: VERSION_PAGE + '1.21.8_OpenGL' },
      { label: '1.21.5',  url: VERSION_PAGE + '1.21.5_OpenGL' },
      { label: '1.21.4',  url: VERSION_PAGE + '1.21.4_OpenGL' },
      { label: '1.21.1',  url: VERSION_PAGE + '1.21.1_OpenGL' }
    ]
  };

  const openBtns     = document.querySelectorAll('.js-download-trigger');
  const modal         = document.getElementById('versionModal');
  const closeBtn      = document.getElementById('versionCloseBtn');
  const vulkanBtn      = document.getElementById('rendererVulkanBtn');
  const openglBtn       = document.getElementById('rendererOpenglBtn');
  const perfNote       = document.getElementById('versionPerfNote');
  const versionSelect  = document.getElementById('versionSelect');
  const finalBtn       = document.getElementById('finalDownloadBtn');
  const finalLabel     = document.getElementById('finalDownloadLabel');

  let renderer = 'vulkan';
  let selectedVersion = null;

  function renderVersionSelect() {
    const list = VERSIONS[renderer];
    const keepSelected = selectedVersion && list.some(v => v.label === selectedVersion.label);
    if (!keepSelected) selectedVersion = null;

    versionSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.textContent = 'Select a version...';
    placeholder.value = '';
    versionSelect.appendChild(placeholder);

    list.forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v.label;
      opt.textContent = v.label;
      versionSelect.appendChild(opt);
    });
    versionSelect.value = selectedVersion ? selectedVersion.label : '';
  }

  function updateFinalButton() {
    if (selectedVersion) {
      finalBtn.classList.add('unlocked');
      finalBtn.href = selectedVersion.url;
      finalLabel.textContent = 'Download Frost (' + selectedVersion.label + ')';
      finalBtn.classList.remove('just-unlocked');
      void finalBtn.offsetWidth;
      finalBtn.classList.add('just-unlocked');
    } else {
      finalBtn.classList.remove('unlocked', 'just-unlocked');
      finalBtn.href = '#';
      finalLabel.textContent = 'Select a version';
    }
  }

  function selectRenderer(next) {
    renderer = next;
    vulkanBtn.classList.toggle('selected', renderer === 'vulkan');
    openglBtn.classList.toggle('selected', renderer === 'opengl');
    perfNote.style.visibility = renderer === 'vulkan' ? 'visible' : 'hidden';
    renderVersionSelect();
    updateFinalButton();
  }

  function openModal(initialRenderer) {
    finalBtn.classList.remove('clicked', 'just-unlocked');
    selectRenderer(initialRenderer || 'vulkan');
    modal.classList.add('active');
  }
  function closeModal() { modal.classList.remove('active'); }

  const downloadChoiceModal = document.getElementById('downloadChoiceModal');
  const downloadChoiceCloseBtn = document.getElementById('downloadChoiceCloseBtn');
  function openDownloadChoice() { downloadChoiceModal.classList.add('active'); }
  function closeDownloadChoice() { downloadChoiceModal.classList.remove('active'); }
  downloadChoiceCloseBtn.addEventListener('click', closeDownloadChoice);
  downloadChoiceModal.addEventListener('click', (e) => { if (e.target === downloadChoiceModal) closeDownloadChoice(); });

  (function setLauncherOsIcon() {
    const ua = (navigator.userAgent || '') + ' ' + (navigator.platform || '');
    let os = 'win';
    if (/Windows|Win32|Win64/i.test(ua)) os = 'win';
    else if (/Macintosh|Mac OS X|MacIntel|MacARM/i.test(ua)) os = 'mac';
    else if (/Linux|X11/i.test(ua)) os = 'linux';
    document.querySelectorAll('.dl-os-icon').forEach(el => {
      el.classList.toggle('active', el.dataset.os === os);
    });
  })();

  openBtns.forEach(btn => btn.addEventListener('click', () => openDownloadChoice()));
  document.getElementById('downloadModpackBtn').addEventListener('click', () => {
    closeDownloadChoice();
    openModal();
  });
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (downloadChoiceModal.classList.contains('active')) closeDownloadChoice();
    else if (modal.classList.contains('active')) closeModal();
  });
  vulkanBtn.addEventListener('click', () => selectRenderer('vulkan'));
  openglBtn.addEventListener('click', () => selectRenderer('opengl'));
  versionSelect.addEventListener('change', () => {
    const list = VERSIONS[renderer];
    selectedVersion = list.find(v => v.label === versionSelect.value) || null;
    updateFinalButton();
  });
  finalBtn.addEventListener('click', (e) => {
    if (!finalBtn.classList.contains('unlocked')) { e.preventDefault(); return; }
    finalBtn.classList.add('clicked');
    setTimeout(() => { closeModal(); finalBtn.classList.remove('clicked'); }, 420);
  });

  (function openFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('openDownload')) return;

    const requested = (params.get('openDownload') || '').toLowerCase();
    openModal(requested === 'opengl' ? 'opengl' : 'vulkan');

    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('openDownload');
    window.history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
  })();
})();

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
  const KEY = 'frostTeamToastDismissed';
  const toast = document.getElementById('promoToast');
  const closeBtn = document.getElementById('promoToastClose');
  if (!toast || !closeBtn) return;
  let dismissed = false;
  try { dismissed = localStorage.getItem(KEY) === '1'; } catch (e) {}
  if (dismissed) return;
  setTimeout(() => toast.classList.add('show'), 1200);
  closeBtn.addEventListener('click', () => {
    toast.classList.remove('show');
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
  });
})();
(function () {
  const POLL_VOTE_URL = 'https://bot.frostclient.eu/poll-vote';
  const POLL_RESULTS_URL = 'https://bot.frostclient.eu/poll-votes';
  const VOTED_KEY = 'frostPollVotedAnswer';
  const ANSWERS = ['CRYSTAL', 'MACE', 'SMP', 'UHC'];

  const toast = document.getElementById('pollToast');
  const toastText = toast ? toast.querySelector('.poll-toast-text') : null;
  const toastCta = document.getElementById('pollToastCta');
  const modal = document.getElementById('pollModal');
  const closeBtn = document.getElementById('pollModalCloseBtn');
  const optionsWrap = document.getElementById('pollOptions');
  const options = optionsWrap ? Array.from(optionsWrap.querySelectorAll('.poll-option')) : [];
  const submitBtn = document.getElementById('pollSubmitBtn');
  const thanksEl = document.getElementById('pollThanks');
  const noteEl = document.getElementById('pollNote');
  if (!toast || !modal || !optionsWrap || !submitBtn || !thanksEl) return;
  const promoToast = document.getElementById('promoToast');
  function repositionToast() {
    if (promoToast && promoToast.classList.contains('show')) {
      toast.style.bottom = (promoToast.getBoundingClientRect().height + 24 + 16) + 'px';
    } else {
      toast.style.bottom = '';
    }
  }
  const promoCloseBtn = document.getElementById('promoToastClose');
  if (promoCloseBtn) promoCloseBtn.addEventListener('click', repositionToast);

  let votedAnswer = null;
  try { votedAnswer = localStorage.getItem(VOTED_KEY); } catch (e) {}
  function updateToastContent() {
    if (!toastText || !toastCta) return;
    if (votedAnswer) {
      toastText.innerHTML = '<strong>Thanks for voting!</strong> See how everyone else answered.';
      toastCta.textContent = 'Show Answers →';
    } else {
      toastText.innerHTML = '<strong>Got 10 seconds?</strong> Answer one quick question.';
      toastCta.textContent = 'Vote Now →';
    }
  }
  updateToastContent();
  let openedViaVoteParam = false;
  try { openedViaVoteParam = new URLSearchParams(location.search).has('vote'); } catch (e) {}
  if (openedViaVoteParam) {
    try {
      const url = new URL(location.href);
      url.searchParams.delete('vote');
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch (e) {}
  } else {
    setTimeout(() => { repositionToast(); toast.classList.add('show'); }, 1200);
  }

  function animatePct(el, toVal) {
    const fromVal = parseInt(el.dataset.pct || '0', 10) || 0;
    el.dataset.pct = toVal;
    if (fromVal === toVal) { el.textContent = toVal + '%'; return; }
    const start = performance.now();
    const DUR = 700;
    function tick(now) {
      const t = Math.min(1, (now - start) / DUR);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(fromVal + (toVal - fromVal) * eased) + '%';
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = toVal + '%';
    }
    requestAnimationFrame(tick);
  }

  function renderResults(votes) {
    const total = ANSWERS.reduce((sum, a) => sum + (votes[a] || 0), 0) || 1;
    let maxCount = -1, winner = null;
    ANSWERS.forEach(a => {
      const c = votes[a] || 0;
      if (c > maxCount) { maxCount = c; winner = a; }
    });
    options.forEach(opt => {
      const answer = opt.dataset.answer;
      const count = votes[answer] || 0;
      const pct = Math.round((count / total) * 100);
      opt.classList.add('voted');
      opt.classList.toggle('winner', answer === winner && maxCount > 0);
      opt.classList.toggle('selected', answer === votedAnswer);
      const pctEl = opt.querySelector('.poll-option-pct');
      if (pctEl) { pctEl.style.display = 'block'; animatePct(pctEl, pct); }
      const fill = opt.querySelector('.poll-option-bar-fill');
      if (fill) fill.style.width = pct + '%';
    });
    submitBtn.style.display = 'none';
    if (noteEl) noteEl.style.display = 'none';
    thanksEl.style.display = 'block';
  }

  let optionsAnimTimer = null;
  function playOptionsEntrance() {
    optionsWrap.classList.remove('animate-in');
    void optionsWrap.offsetWidth;
    optionsWrap.classList.add('animate-in');
    clearTimeout(optionsAnimTimer);
    optionsAnimTimer = setTimeout(() => optionsWrap.classList.remove('animate-in'), 750);
  }

  function openModal() {
    modal.classList.add('active');
    toast.classList.remove('show');
    playOptionsEntrance();
    if (votedAnswer) {
      fetch(POLL_RESULTS_URL, { cache: 'no-store' })
        .then(r => r.json())
        .then(data => { if (data && data.ok) renderResults(data.votes); })
        .catch(() => {});
    }
  }
  function closeModal() {
    modal.classList.remove('active');
    updateToastContent();
    setTimeout(() => { repositionToast(); toast.classList.add('show'); }, 400);
  }

  if (toastCta) toastCta.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
  });

  if (votedAnswer) {
    options.forEach(opt => opt.classList.add('voted'));
    submitBtn.style.display = 'none';
    if (noteEl) noteEl.style.display = 'none';
    thanksEl.style.display = 'block';
  } else {
    let selected = null;
    options.forEach(opt => {
      opt.addEventListener('click', () => {
        if (opt.classList.contains('voted')) return;
        options.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        selected = opt.dataset.answer;
        submitBtn.disabled = false;
      });
    });
    submitBtn.addEventListener('click', () => {
      if (!selected || submitBtn.disabled) return;
      submitBtn.disabled = true;
      fetch(POLL_VOTE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: selected })
      })
        .then(r => r.json())
        .then(data => {
          if (!data || !data.ok) { submitBtn.disabled = false; return; }
          votedAnswer = selected;
          try { localStorage.setItem(VOTED_KEY, selected); } catch (e) {}
          renderResults(data.votes);
        })
        .catch(() => { submitBtn.disabled = false; });
    });
  }

  if (openedViaVoteParam) openModal();
})();
const scrollBar  = document.getElementById('scroll-bar');
const navEl      = document.querySelector('nav');
const fpsFills   = document.querySelectorAll('.fps-fill');
const perfSect   = document.getElementById('performance');
const liteSect   = document.getElementById('lite');
const navLiteBtn = document.querySelector('.nav-cta--lite');
const navSpyLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')]
  .map(a => ({ link: a, section: document.getElementById(a.getAttribute('href').slice(1)) }))
  .filter(x => x.section);
function updateNavSpy() {
  const refY = window.innerHeight * 0.5;
  let current = null;
  for (const { link, section } of navSpyLinks) {
    const r = section.getBoundingClientRect();
    if (r.top <= refY && r.bottom > refY) current = link;
  }
  navSpyLinks.forEach(({ link }) => link.classList.toggle('active', link === current));
}
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
  const enterEnd   = enterStart - vh * 0.17;
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
  navEl.classList.toggle('nav-scrolled', window.scrollY > 40);
  updateNavSpy();
  updateReveal();
  updateFps();
  if (liteSect && navLiteBtn) {
    const r = liteSect.getBoundingClientRect();
    const vh = window.innerHeight;
    navLiteBtn.classList.toggle('in-lite', r.top < vh * 0.6 && r.bottom > vh * 0.25);
  }
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

  function buildReviewCard(review, isLatest) {
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

  const grid = document.getElementById('reviewsGridTeaser');
  if (!grid) return;
  fetch('https://bot.frostclient.eu/reviews_export.json', { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error('http_' + r.status);
      return r.json();
    })
    .then(data => {
      if (!Array.isArray(data)) return;
      data.filter(r => parseStars(r.lite === true && r.liteStars ? r.liteStars : r.stars) >= 3 && !hasWorseFps(r))
        .sort((a, b) => timestampOf(b) - timestampOf(a))
        .slice(0, 6)
        .forEach((r, i) => grid.appendChild(buildReviewCard(r, i === 0)));
    })
    .catch(() => {});
})();

(function () {
  const el = document.getElementById('heroOnlineCount');
  if (!el) return;
  const peakEl = document.getElementById('heroPeakOnline');
  const avgEl = document.getElementById('heroAvgOnline');
  function formatNum(n) {
    const text = Number.isInteger(n) ? String(n) : n.toFixed(1);
    const parts = text.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return parts.join('.');
  }
  fetch('https://bot.frostclient.eu/online-count', { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error('http_' + r.status);
      return r.json();
    })
    .then(data => {
      if (!data || data.ok !== true || typeof data.count !== 'number') return;
      el.textContent = formatNum(data.count);
      if (peakEl && typeof data.peakOnline === 'number') peakEl.textContent = formatNum(data.peakOnline);
      if (avgEl && typeof data.avgOnline === 'number') avgEl.textContent = formatNum(data.avgOnline);
    })
    .catch(() => {});
})();
