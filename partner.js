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
  const STAFF_APPLY_URL = 'https://bot.frostclient.eu/staff-apply';
  const STAFF_APPLY_STATUS_URL = 'https://bot.frostclient.eu/staff-apply-status';
  const STAFF_APPLY_CONFIG_URL = 'https://bot.frostclient.eu/staff-apply-config';
  const INTENT_KEY = 'frostPartnerApplyIntent';
  const SERVER_ROLE = 'server_partnership';
  const SERVER_FIELDS = [
    ['serverName', 'Server name', 'e.g. FrostMC Network', false],
    ['serverIp', 'Server IP / address', 'play.example.com', false],
    ['serverVersion', 'Minecraft version(s) and platform', 'e.g. 1.21.x, Java, Paper / Fabric...', false],
    ['playerCount', 'Average and peak player count', 'e.g. 150 average, 400 peak', false],
    ['discordInvite', 'Server Discord invite', 'https://discord.gg/...', false],
    ['website', 'Website, store or socials', 'Links to your website, store, YouTube, TikTok... (or "none")', false],
    ['contact', 'Your role on the server and how to reach you', 'Owner / manager / marketing, Discord username or e-mail', false],
    ['offer', 'What would the partnership look like and what can you offer FrostClient players?', 'Cross-promotion, events, in-game perks, featured spots...', true],
    ['why', 'Why do you want to partner with FrostClient?', 'Tell us why your server and FrostClient are a good match...', true]
  ];

  const modal = document.getElementById('applyModal');
  const closeBtn = document.getElementById('applyModalClose');
  if (!modal) return;

  const states = ['applyStateWorking', 'applyStateNotMember', 'applyStep1', 'applyStateDone', 'applyStepServer', 'applyStateServerDone', 'applyStateError'];
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
    document.dispatchEvent(new CustomEvent('frostAccountLogin'));
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
  let alreadyPartner = false;
  function markAlreadyPartner() {
    alreadyPartner = true;
    const normal = document.getElementById('applyBoxNormal');
    const partnerBox = document.getElementById('applyBoxPartner');
    if (normal) normal.style.display = 'none';
    if (partnerBox) partnerBox.style.display = '';
    document.querySelectorAll('.js-apply-btn').forEach(function (btn) {
      if (btn.closest('.partner-apply-box')) return;
      btn.textContent = 'Open Dashboard';
    });
  }
  function applyAuthUi() {
    const loggedIn = !!loadToken();
    document.querySelectorAll('.js-apply-btn, .js-server-apply-btn').forEach(function (btn) { btn.classList.toggle('is-logged-in', loggedIn); });
    [document.getElementById('applyBoxIntro'), document.getElementById('serverBoxIntro')].forEach(function (intro) {
      if (intro) intro.textContent = loggedIn ? intro.dataset.loggedIn : intro.dataset.loggedOut;
    });
  }
  function checkAlreadyPartner() {
    const token = loadToken();
    if (!token) return;
    fetch(PARTNER_STATUS_URL + '?token=' + encodeURIComponent(token), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ok && data.isPartner) markAlreadyPartner();
      })
      .catch(function () {});
  }

  function showErrorState(msg) {
    document.getElementById('applyErrorText').textContent = msg;
    show('applyStateError');
  }

  let currentFlow = 'creator';
  let serverClosed = false;
  let serverBoxState = 'serverBoxNormal';
  const SERVER_BOX_IDS = ['serverBoxNormal', 'serverBoxClosed', 'serverBoxSubmitted', 'serverBoxAccepted', 'serverBoxDenied'];
  function setServerBoxState(id) {
    serverBoxState = id;
    SERVER_BOX_IDS.forEach(function (b) {
      const el = document.getElementById(b);
      if (el) el.style.display = b === id ? '' : 'none';
    });
  }
  function applyServerClosed() {
    if (serverClosed && serverBoxState === 'serverBoxNormal') setServerBoxState('serverBoxClosed');
  }
  function setApplyTab(tab) {
    document.querySelectorAll('#applySwitch .apply-switch-btn').forEach(function (btn) {
      const on = btn.dataset.applyTab === tab;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', String(on));
    });
    const creator = document.getElementById('applyTabCreator');
    const server = document.getElementById('applyTabServer');
    if (creator) creator.style.display = tab === 'creator' ? '' : 'none';
    if (server) server.style.display = tab === 'server' ? '' : 'none';
  }
  document.querySelectorAll('#applySwitch .apply-switch-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { setApplyTab(btn.dataset.applyTab); });
  });
  if (window.location.hash === '#server') setApplyTab('server');
  function formatRetryDate(ms) {
    try { return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) { return ''; }
  }
  function checkServerStatus() {
    const token = loadToken();
    if (!token) return;
    fetch(STAFF_APPLY_STATUS_URL + '?token=' + encodeURIComponent(token), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.ok || data.role !== SERVER_ROLE) return;
        if (data.status === 'pending') {
          setServerBoxState('serverBoxSubmitted');
        } else if (data.status === 'accepted') {
          setServerBoxState('serverBoxAccepted');
        } else if (data.status === 'denied' && data.retryAt && data.retryAt > Date.now()) {
          const dateEl = document.getElementById('serverRetryDate');
          if (dateEl) dateEl.textContent = formatRetryDate(data.retryAt);
          const reasonEl = document.getElementById('serverDenyReason');
          if (reasonEl) {
            reasonEl.textContent = data.denyReason ? 'Reason: ' + data.denyReason : '';
            reasonEl.style.display = data.denyReason ? '' : 'none';
          }
          setServerBoxState('serverBoxDenied');
        }
      })
      .catch(function () {});
  }
  fetch(STAFF_APPLY_CONFIG_URL, { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      const role = data && data.ok && data.roles && data.roles[SERVER_ROLE];
      if (role && !role.open) { serverClosed = true; applyServerClosed(); }
    })
    .catch(function () {});
  const serverFieldsWrap = document.getElementById('serverFields');
  const serverSubmitBtn = document.getElementById('serverSubmitBtn');
  const serverStepError = document.getElementById('serverStepError');
  function updateServerSubmitEnabled() {
    serverSubmitBtn.disabled = !Array.from(serverFieldsWrap.querySelectorAll('.apply-input')).every(function (el) { return el.dataset.key === 'extra' || el.value.trim(); });
  }
  function buildServerForm() {
    serverFieldsWrap.innerHTML = '';
    SERVER_FIELDS.concat([['extra', 'Anything else we should know?', 'Optional', true]]).forEach(function (f) {
      const wrap = document.createElement('div');
      wrap.className = 'apply-field';
      const label = document.createElement('label');
      label.textContent = f[1] + ' ';
      const tag = document.createElement('span');
      tag.className = f[0] === 'extra' ? 'optional-tag' : 'required-star';
      tag.textContent = f[0] === 'extra' ? '(optional)' : '*';
      label.appendChild(tag);
      wrap.appendChild(label);
      const input = document.createElement(f[3] ? 'textarea' : 'input');
      if (!f[3]) input.type = 'text';
      input.className = 'apply-input';
      input.dataset.key = f[0];
      input.placeholder = f[2];
      input.autocomplete = 'off';
      input.addEventListener('input', updateServerSubmitEnabled);
      wrap.appendChild(input);
      serverFieldsWrap.appendChild(wrap);
    });
    serverSubmitBtn.disabled = true;
    serverSubmitBtn.classList.remove('is-loading');
    serverStepError.style.display = 'none';
  }
  function openServerForm() {
    currentFlow = 'server';
    buildServerForm();
    show('applyStepServer');
    openModal();
  }
  function showServerError(msg) {
    serverStepError.style.display = 'block';
    serverStepError.textContent = msg;
  }
  serverSubmitBtn.addEventListener('click', function () {
    if (serverSubmitBtn.disabled) return;
    const token = loadToken();
    if (!token) { showErrorState('Your session expired. Please click Apply now again to sign in.'); return; }
    serverSubmitBtn.disabled = true;
    serverSubmitBtn.classList.add('is-loading');
    serverStepError.style.display = 'none';
    const answers = {};
    serverFieldsWrap.querySelectorAll('.apply-input').forEach(function (el) { answers[el.dataset.key] = el.value.trim(); });
    fetch(STAFF_APPLY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffToken: token, role: SERVER_ROLE, answers: answers })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ok) {
          show('applyStateServerDone');
          setServerBoxState('serverBoxSubmitted');
          return;
        }
        serverSubmitBtn.disabled = false;
        serverSubmitBtn.classList.remove('is-loading');
        if (data && data.error === 'not_member') { show('applyStateNotMember'); return; }
        if (data && data.error === 'token_expired') {
          clearToken();
          showErrorState('Your session expired. Please click Apply now again to sign in.');
          return;
        }
        if (data && data.error === 'role_closed') {
          serverClosed = true;
          applyServerClosed();
          showServerError('Server applications are closed right now. Please check back later.');
          return;
        }
        if (data && data.error === 'cooldown') { showServerError('Your previous application was not accepted — you can apply again from ' + formatRetryDate(data.retryAt) + '.'); return; }
        if (data && data.error === 'missing_fields') { showServerError('Please fill in every required field.'); return; }
        showServerError("Couldn't send your application. Please try again.");
      })
      .catch(function () {
        serverSubmitBtn.disabled = false;
        serverSubmitBtn.classList.remove('is-loading');
        showServerError('Network error. Please try again.');
      });
  });
  document.getElementById('serverDoneCloseBtn').addEventListener('click', closeModal);
  document.querySelectorAll('.js-server-apply-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (serverClosed) return;
      currentFlow = 'server';
      if (loadToken()) { openServerForm(); return; }
      startLogin();
    });
  });
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
            let msg = 'Already in use';
            if (data && data.reason === 'invalid') msg = 'Letters and numbers only.';
            else if (data && data.reason === 'blocked') msg = 'Not allowed — pick a different code.';
            setCodeStatus('taken', msg);
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
          closeModal();
          markAlreadyPartner();
          return;
        }
        step1Error.style.display = 'block';
        if (data && data.error === 'invalid_code') {
          step1Error.textContent = 'That code has to be 3-20 characters, letters and numbers only.';
        } else if (data && data.error === 'code_unavailable') {
          step1Error.textContent = 'That code is already taken. Try a different one.';
        } else if (data && data.error === 'code_blocked') {
          step1Error.textContent = "That code isn't allowed. Please pick a different one.";
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

  document.getElementById('applyRetryBtn').addEventListener('click', function () { show(currentFlow === 'server' ? 'applyStepServer' : 'applyStep1'); });
  document.getElementById('applyRetryAfterJoin').addEventListener('click', function () {
    startLogin();
  });

  const applyBtns = document.querySelectorAll('.js-apply-btn');
  applyAuthUi();
  document.addEventListener('frostAccountLogin', applyAuthUi);
  document.addEventListener('frostAccountLogout', function () {
    alreadyPartner = false;
    applyAuthUi();
    setServerBoxState('serverBoxNormal');
    applyServerClosed();
    const normal = document.getElementById('applyBoxNormal');
    const partnerBox = document.getElementById('applyBoxPartner');
    if (normal) normal.style.display = '';
    if (partnerBox) partnerBox.style.display = 'none';
    document.querySelectorAll('.js-apply-btn').forEach(function (btn) {
      if (btn.closest('.partner-apply-box')) return;
      btn.textContent = btn.classList.contains('footer-link-btn') ? 'Get your Media code' : 'Get Started';
    });
  });
  checkAlreadyPartner();
  checkServerStatus();
  document.addEventListener('frostAccountLogin', checkServerStatus);

  function startLogin() {
    let csrfState = '';
    try {
      const buf = new Uint8Array(16);
      crypto.getRandomValues(buf);
      csrfState = Array.from(buf).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
      sessionStorage.setItem(OAUTH_STATE_KEY, csrfState);
      sessionStorage.setItem(INTENT_KEY, currentFlow);
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
      currentFlow = 'creator';
      if (alreadyPartner) {
        window.location.href = 'https://partner.frostclient.eu';
        return;
      }
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
    let intent = '';
    try { intent = sessionStorage.getItem(INTENT_KEY) || ''; sessionStorage.removeItem(INTENT_KEY); } catch (e) {}
    if (intent === 'server') { currentFlow = 'server'; setApplyTab('server'); }

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
          if (data.partnerToken) saveToken(data.partnerToken);
          markAlreadyPartner();
          if (intent === 'server' && data.partnerToken) { openServerForm(); return; }
          closeModal();
          return;
        }
        if (data.status === 'eligible' && data.partnerToken) {
          saveToken(data.partnerToken);
          if (intent === 'server') { openServerForm(); return; }
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
