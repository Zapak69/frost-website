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
  const scrollBtn = document.getElementById('scrollDownBtn');
  const applyBox = document.querySelector('.partner-apply-box');
  if (!scrollBtn || !applyBox) return;

  scrollBtn.addEventListener('click', function () {
    applyBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        scrollBtn.classList.toggle('hidden', entry.isIntersecting);
      });
    }, { threshold: 0.2 });
    observer.observe(applyBox);
  }
})();

(function () {
  const LITE_API_URL = 'https://script.google.com/macros/s/AKfycbxF57u1UNBsonktp5_2EseJtFkBZR0-CCxyazOGVUmEBrcwjU1-t6Us41gcrRqCsGcR/exec';
  const PARTNER_APPLY_URL = 'https://bot.frostclient.eu/partner-apply';
  const TOKEN_KEY = 'frostPartnerToken';
  const OAUTH_STATE_KEY = 'frostPartnerOauthState';
  const APPLIED_KEY = 'frostPartnerApplied';
  const DISCORD_CLIENT_ID = '1512834635640475898';
  const DISCORD_REDIRECT_URI_PARTNER = 'https://frostclient.eu/partner';

  const modal = document.getElementById('applyModal');
  const closeBtn = document.getElementById('applyModalClose');
  if (!modal) return;

  const states = ['applyStateWorking', 'applyStateNotMember', 'applyStep1', 'applyStep2', 'applyStateDone', 'applyStateError'];
  function show(id) {
    states.forEach(s => document.getElementById(s).classList.toggle('active', s === id));
  }
  function openModal() { modal.classList.add('active'); }
  function closeModal() { modal.classList.remove('active'); }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('active')) closeModal(); });

  function loadToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }
  function saveToken(t) {
    try { localStorage.setItem(TOKEN_KEY, t); } catch (e) {}
  }
  function clearToken() {
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
  }
  function markApplied() {
    try { localStorage.setItem(APPLIED_KEY, '1'); } catch (e) {}
    document.querySelectorAll('.js-apply-btn').forEach(function (btn) { btn.style.display = 'none'; });
    const normal = document.getElementById('applyBoxNormal');
    const submitted = document.getElementById('applyBoxSubmitted');
    if (normal) normal.style.display = 'none';
    if (submitted) submitted.style.display = 'block';
  }
  function hasApplied() {
    try { return localStorage.getItem(APPLIED_KEY) === '1'; } catch (e) { return false; }
  }

  function showErrorState(msg) {
    document.getElementById('applyErrorText').textContent = msg;
    show('applyStateError');
  }
  let tier = null, platform = null;
  const tierRow = document.getElementById('applyTierRow');
  const platformRow = document.getElementById('applyPlatformRow');
  const linkInput = document.getElementById('applyLink');
  const nextBtn = document.getElementById('applyNextBtn');
  const confirmCheck = document.getElementById('applyConfirmCheck');
  const submitBtn = document.getElementById('applySubmitBtn');

  function updateNextEnabled() {
    nextBtn.disabled = !(tier && platform && linkInput.value.trim());
  }
  tierRow.querySelectorAll('.apply-pill').forEach(function (pill) {
    pill.addEventListener('click', function () {
      tierRow.querySelectorAll('.apply-pill').forEach(function (p) { p.classList.remove('selected'); });
      pill.classList.add('selected');
      tier = pill.dataset.value;
      updateNextEnabled();
    });
  });
  platformRow.querySelectorAll('.apply-pill').forEach(function (pill) {
    pill.addEventListener('click', function () {
      platformRow.querySelectorAll('.apply-pill').forEach(function (p) { p.classList.remove('selected'); });
      pill.classList.add('selected');
      platform = pill.dataset.value;
      updateNextEnabled();
    });
  });
  linkInput.addEventListener('input', updateNextEnabled);

  nextBtn.addEventListener('click', function () {
    if (nextBtn.disabled) return;
    show('applyStep2');
  });
  confirmCheck.addEventListener('change', function () {
    submitBtn.disabled = !confirmCheck.checked;
  });

  function resetForm() {
    tier = null; platform = null;
    tierRow.querySelectorAll('.apply-pill').forEach(function (p) { p.classList.remove('selected'); });
    platformRow.querySelectorAll('.apply-pill').forEach(function (p) { p.classList.remove('selected'); });
    linkInput.value = '';
    confirmCheck.checked = false;
    submitBtn.disabled = true;
    nextBtn.disabled = true;
  }

  submitBtn.addEventListener('click', function () {
    if (submitBtn.disabled) return;
    const token = loadToken();
    if (!token) { showErrorState('Your session expired. Please click Apply again to sign in.'); return; }
    submitBtn.disabled = true;
    fetch(PARTNER_APPLY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partnerToken: token, tier: tier, platform: platform,
        link: linkInput.value.trim(), confirmed: true
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ok) {
          resetForm();
          show('applyStateDone');
          markApplied();
          return;
        }
        if (data && data.error === 'not_member') {
          show('applyStateNotMember');
          return;
        }
        if (data && data.error === 'token_expired') {
          clearToken();
          showErrorState('Your session expired. Please click Apply again to sign in.');
          return;
        }
        submitBtn.disabled = false;
        showErrorState("Couldn't submit your application. Please try again.");
      })
      .catch(function () { submitBtn.disabled = false; showErrorState('Network error. Please try again.'); });
  });

  document.getElementById('applyRetryBtn').addEventListener('click', function () { show('applyStep1'); });
  document.getElementById('applyRetryAfterJoin').addEventListener('click', function () {
    startLogin();
  });

  const applyBtns = document.querySelectorAll('.js-apply-btn');
  if (hasApplied()) markApplied();

  function startLogin() {
    let csrfState = '';
    try {
      const buf = new Uint8Array(16);
      crypto.getRandomValues(buf);
      csrfState = Array.from(buf).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
      sessionStorage.setItem(OAUTH_STATE_KEY, csrfState);
    } catch (e) {}
    const url = 'https://discord.com/oauth2/authorize'
      + '?client_id=' + encodeURIComponent(DISCORD_CLIENT_ID)
      + '&response_type=code'
      + '&redirect_uri=' + encodeURIComponent(DISCORD_REDIRECT_URI_PARTNER)
      + '&scope=' + encodeURIComponent('identify guilds.members.read')
      + '&state=' + csrfState;
    window.location.href = url;
  }

  applyBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const token = loadToken();
      if (token) {
        resetForm();
        show('applyStep1');
        openModal();
        return;
      }
      startLogin();
    });
  });
  (function init() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('code') && !params.has('error')) return;

    if (params.has('error')) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('error');
      cleanUrl.searchParams.delete('error_description');
      cleanUrl.searchParams.delete('state');
      window.history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
      return;
    }

    const code = params.get('code');
    const returnedState = params.get('state') || '';
    let storedState = '';
    try { storedState = sessionStorage.getItem(OAUTH_STATE_KEY) || ''; } catch (e) {}
    try { sessionStorage.removeItem(OAUTH_STATE_KEY); } catch (e) {}

    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('code');
    cleanUrl.searchParams.delete('state');
    window.history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);

    openModal();
    show('applyStateWorking');

    if (storedState && returnedState !== storedState) {
      showErrorState('Sign-in session mismatch. Please try again.');
      return;
    }

    fetch(LITE_API_URL + '?action=partnerAuth&code=' + encodeURIComponent(code), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.ok) {
          showErrorState('Discord sign-in failed. Please try again.');
          return;
        }
        if (data.status === 'not_member') {
          show('applyStateNotMember');
          return;
        }
        if (data.status === 'already_partner') {
          window.location.href = 'https://partner.frostclient.eu';
          return;
        }
        if (data.status === 'eligible' && data.partnerToken) {
          saveToken(data.partnerToken);
          resetForm();
          show('applyStep1');
          return;
        }
        showErrorState('Something unexpected happened. Please try again.');
      })
      .catch(function () { showErrorState('Network error while contacting the server. Please try again.'); });
  })();
})();

(function () {
  const el = document.getElementById('modrinthDownloads');
  if (!el) return;
  fetch('https://api.modrinth.com/v2/project/frost-client', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (typeof data.downloads !== 'number') return;
      el.textContent = data.downloads.toLocaleString('en-US');
    })
    .catch(function () {  });
})();
