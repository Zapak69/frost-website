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
  const LITE_API_URL = 'https://script.google.com/macros/s/AKfycbxF57u1UNBsonktp5_2EseJtFkBZR0-CCxyazOGVUmEBrcwjU1-t6Us41gcrRqCsGcR/exec';
  const STAFF_APPLY_URL = 'https://bot.frostclient.eu/staff-apply';
  const STAFF_APPLY_STATUS_URL = 'https://bot.frostclient.eu/staff-apply-status';
  const TOKEN_KEY = 'frostToken';
  const OAUTH_STATE_KEY = 'frostStaffOauthState';
  const APPLIED_KEY = 'frostStaffApplied';
  const DISCORD_CLIENT_ID = '1512834635640475898';
  const DISCORD_REDIRECT_URI_STAFF = 'https://frostclient.eu/staff';

  const modal = document.getElementById('applyModal');
  const closeBtn = document.getElementById('applyModalClose');
  if (!modal) return;

  const states = ['applyStateWorking', 'applyStateNotMember', 'applyStateClosed', 'applyStep1', 'applyStateDone', 'applyStateError'];
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
  function fetchJsonWithRetry(url, options, retries) {
    return fetch(url, options)
      .then(function (r) { return r.json(); })
      .catch(function (err) {
        if (retries > 0) {
          return new Promise(function (resolve) { setTimeout(resolve, 1200); })
            .then(function () { return fetchJsonWithRetry(url, options, retries - 1); });
        }
        throw err;
      });
  }
  const BOX_IDS = ['applyBoxNormal', 'applyBoxClosed', 'applyBoxSubmitted', 'applyBoxAccepted', 'applyBoxDenied'];
  function setBoxState(id) {
    BOX_IDS.forEach(function (b) {
      const el = document.getElementById(b);
      if (el) el.style.display = b === id ? 'block' : 'none';
    });
    document.querySelectorAll('.js-staff-apply-btn').forEach(function (btn) {
      btn.style.display = id === 'applyBoxNormal' ? '' : 'none';
    });
  }
  function markApplied() {
    try { localStorage.setItem(APPLIED_KEY, '1'); } catch (e) {}
    setBoxState('applyBoxSubmitted');
  }
  function hasApplied() {
    try { return localStorage.getItem(APPLIED_KEY) === '1'; } catch (e) { return false; }
  }
  function markClosed() {
    setBoxState('applyBoxClosed');
  }
  function formatRetryDate(ms) {
    try {
      return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) { return ''; }
  }
  function checkStatus() {
    const token = loadToken();
    if (!token) return;
    fetch(STAFF_APPLY_STATUS_URL + '?token=' + encodeURIComponent(token), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.ok) return;
        if (data.status === 'pending') {
          setBoxState('applyBoxSubmitted');
        } else if (data.status === 'accepted') {
          setBoxState('applyBoxAccepted');
        } else if (data.status === 'denied') {
          if (data.retryAt && data.retryAt > Date.now()) {
            const dateEl = document.getElementById('applyRetryDate');
            if (dateEl) dateEl.textContent = formatRetryDate(data.retryAt);
            setBoxState('applyBoxDenied');
          } else {
            try { localStorage.removeItem(APPLIED_KEY); } catch (e) {}
            setBoxState('applyBoxNormal');
          }
        }
      })
      .catch(function () {});
  }

  function showErrorState(msg) {
    document.getElementById('applyErrorText').textContent = msg;
    show('applyStateError');
  }

  const qFields = [
    ['qAge', 'age'], ['qTimezone', 'timezone'], ['qHours', 'hoursPerWeek'],
    ['qExperience', 'experience'], ['qWhy', 'why'],
    ['qConflict', 'conflictScenario'], ['qCrash', 'crashScenario']
  ];
  const qExtra = document.getElementById('qExtra');
  const submitBtn = document.getElementById('applySubmitBtn');

  function updateSubmitEnabled() {
    submitBtn.disabled = !qFields.every(function (f) { return document.getElementById(f[0]).value.trim(); });
  }
  qFields.forEach(function (f) {
    document.getElementById(f[0]).addEventListener('input', updateSubmitEnabled);
  });

  function resetForm() {
    qFields.forEach(function (f) { document.getElementById(f[0]).value = ''; });
    qExtra.value = '';
    submitBtn.disabled = true;
  }

  submitBtn.addEventListener('click', function () {
    if (submitBtn.disabled) return;
    const token = loadToken();
    if (!token) { showErrorState('Your session expired. Please click Apply again to sign in.'); return; }
    submitBtn.disabled = true;
    const answers = {};
    qFields.forEach(function (f) { answers[f[1]] = document.getElementById(f[0]).value.trim(); });
    answers.extra = qExtra.value.trim();
    fetch(STAFF_APPLY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffToken: token, answers: answers })
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

  document.getElementById('applyRetryBtn').addEventListener('click', function () { show('applyStep1'); updateSubmitEnabled(); });
  document.getElementById('applyRetryAfterJoin').addEventListener('click', function () {
    startLogin();
  });

  const applyBtns = document.querySelectorAll('.js-staff-apply-btn');
  if (hasApplied()) markApplied();
  checkStatus();

  let appsOpen = true;
  fetch(LITE_API_URL + '?action=staffApplyConfig', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data && data.ok && !data.open) {
        appsOpen = false;
        if (!hasApplied()) markClosed();
      }
    })
    .catch(function () {});

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
      + '&redirect_uri=' + encodeURIComponent(DISCORD_REDIRECT_URI_STAFF)
      + '&scope=' + encodeURIComponent('identify guilds.members.read')
      + '&state=' + csrfState;
    window.location.href = url;
  }

  applyBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!appsOpen) { openModal(); show('applyStateClosed'); return; }
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

    fetchJsonWithRetry(LITE_API_URL + '?action=staffApplyAuth&code=' + encodeURIComponent(code), { cache: 'no-store' }, 2)
      .then(function (data) {
        if (!data.ok) {
          if (data.error === 'closed') {
            show('applyStateClosed');
            return;
          }
          showErrorState('Discord sign-in failed. Please try again.');
          return;
        }
        if (data.status === 'not_member') {
          show('applyStateNotMember');
          return;
        }
        if (data.status === 'eligible' && data.staffToken) {
          saveToken(data.staffToken);
          resetForm();
          show('applyStep1');
          return;
        }
        showErrorState('Something unexpected happened. Please try again.');
      })
      .catch(function () { showErrorState('Network error while contacting the server. Please try again.'); });
  })();
})();
