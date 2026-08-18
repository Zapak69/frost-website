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
  const PARTNER_STATUS_URL = 'https://bot.frostclient.eu/partner-status';
  const TOKEN_KEY = 'frostToken';
  const OAUTH_STATE_KEY = 'frostPartnerOauthState';
  const DISCORD_CLIENT_ID = '1512834635640475898';
  const DISCORD_REDIRECT_URI_PARTNER = 'https://frostclient.eu/partner';

  const modal = document.getElementById('applyModal');
  const closeBtn = document.getElementById('applyModalClose');
  if (!modal) return;

  const states = ['applyStateWorking', 'applyStateNotMember', 'applyStep1', 'applyStateDone', 'applyStateError'];
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
  function checkAlreadyPartner() {
    const token = loadToken();
    if (!token) return;
    fetch(PARTNER_STATUS_URL + '?token=' + encodeURIComponent(token), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ok && data.isPartner) {
          window.location.href = 'https://partner.frostclient.eu';
        }
      })
      .catch(function () {});
  }

  function showErrorState(msg) {
    document.getElementById('applyErrorText').textContent = msg;
    show('applyStateError');
  }
  const linkInput = document.getElementById('applyLink');
  const codeInput = document.getElementById('applyCode');
  const codeStatus = document.getElementById('applyCodeStatus');
  const submitBtn = document.getElementById('applySubmitBtn');
  const step1Error = document.getElementById('applyStep1Error');

  let codeAvailable = null;

  function updateSubmitEnabled() {
    submitBtn.disabled = !(codeAvailable === true && linkInput.value.trim());
  }
  function setCodeStatus(state, text) {
    codeInput.classList.remove('is-available', 'is-taken');
    codeStatus.className = 'code-status';
    if (!state) { codeStatus.classList.remove('show'); return; }
    codeStatus.classList.add('show', state);
    if (state === 'available') { codeInput.classList.add('is-available'); codeStatus.innerHTML = '✓ ' + text; }
    else if (state === 'taken') { codeInput.classList.add('is-taken'); codeStatus.innerHTML = '✕ ' + text; }
    else { codeStatus.innerHTML = '<span class="code-status-spinner"></span>' + text; }
  }
  let codeCheckTimer = null, codeCheckSeq = 0;
  function checkCodeAvailability() {
    const raw = codeInput.value.trim();
    clearTimeout(codeCheckTimer);
    const mySeq = ++codeCheckSeq;
    if (!raw) { codeAvailable = null; setCodeStatus(null); updateSubmitEnabled(); return; }
    if (raw.length < 3) { codeAvailable = false; setCodeStatus('taken', 'At least 3 characters.'); updateSubmitEnabled(); return; }
    codeAvailable = null;
    setCodeStatus('checking', 'Checking…');
    updateSubmitEnabled();
    codeCheckTimer = setTimeout(function () {
      const token = loadToken();
      if (!token) return;
      fetch(LITE_API_URL + '?action=mediaCodeCheck&token=' + encodeURIComponent(token) + '&code=' + encodeURIComponent(raw), { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (mySeq !== codeCheckSeq) return;
          if (data && data.ok && data.available) {
            codeAvailable = true;
            setCodeStatus('available', 'Available');
          } else {
            codeAvailable = false;
            setCodeStatus('taken', data && data.reason === 'invalid' ? 'Letters and numbers only.' : 'Already in use');
          }
          updateSubmitEnabled();
        })
        .catch(function () {
          if (mySeq !== codeCheckSeq) return;
          codeAvailable = null;
          setCodeStatus(null);
          updateSubmitEnabled();
        });
    }, 450);
  }
  codeInput.addEventListener('input', checkCodeAvailability);
  linkInput.addEventListener('input', updateSubmitEnabled);

  function resetForm() {
    linkInput.value = '';
    codeInput.value = '';
    codeAvailable = null;
    setCodeStatus(null);
    submitBtn.disabled = true;
    submitBtn.classList.remove('is-loading');
    step1Error.style.display = 'none';
  }

  submitBtn.addEventListener('click', function () {
    if (submitBtn.disabled) return;
    const token = loadToken();
    if (!token) { showErrorState('Your session expired. Please click Get Started again to sign in.'); return; }
    submitBtn.disabled = true;
    submitBtn.classList.add('is-loading');
    step1Error.style.display = 'none';
    fetch(LITE_API_URL + '?action=mediaSignup', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        partnerToken: token, code: codeInput.value.trim(), socialLink: linkInput.value.trim()
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ok) {
          resetForm();
          show('applyStateDone');
          return;
        }
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
        if (data && data.error === 'token_expired') {
          clearToken();
          showErrorState('Your session expired. Please click Get Started again to sign in.');
          return;
        }
        if (data && data.error === 'already_partner') {
          window.location.href = 'https://partner.frostclient.eu';
          return;
        }
        step1Error.style.display = 'block';
        if (data && data.error === 'invalid_code') {
          step1Error.textContent = 'That code has to be 3-20 characters, letters and numbers only.';
        } else if (data && data.error === 'code_unavailable') {
          step1Error.textContent = 'That code is already taken. Try a different one.';
        } else if (data && data.error === 'invalid_link') {
          step1Error.textContent = 'Please enter a valid link (starting with http:// or https://).';
        } else if (data && data.error === 'busy') {
          step1Error.textContent = 'A little busy right now — please try again in a moment.';
        } else if (data && data.error === 'whop_error') {
          step1Error.textContent = "Something went wrong creating your code — this isn't about the code you picked. Please try again in a moment, or reach out on Discord if it keeps happening.";
        } else {
          step1Error.textContent = "Couldn't create your code. Please try again.";
        }
      })
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
        step1Error.style.display = 'block';
        step1Error.textContent = 'Network error. Please try again.';
      });
  });

  document.getElementById('applyRetryBtn').addEventListener('click', function () { show('applyStep1'); });
  document.getElementById('applyRetryAfterJoin').addEventListener('click', function () {
    startLogin();
  });

  const applyBtns = document.querySelectorAll('.js-apply-btn');
  checkAlreadyPartner();

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

    fetchJsonWithRetry(LITE_API_URL + '?action=partnerAuth&code=' + encodeURIComponent(code), { cache: 'no-store' }, 2)
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
