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
  const BUG_REPORT_URL = 'https://bot.frostclient.eu/bug-report';
  const TOKEN_KEY = 'frostReportToken';
  const OAUTH_STATE_KEY = 'frostReportOauthState';
  const DISCORD_CLIENT_ID = '1512834635640475898';
  const DISCORD_REDIRECT_URI = 'https://frostclient.eu/report';

  const MAX_BUGLOG_BYTES = 15 * 1024 * 1024;
  const MAX_MEDIA_FILE_BYTES = 8 * 1024 * 1024;
  const MAX_MEDIA_TOTAL_BYTES = 24 * 1024 * 1024;
  const MAX_MEDIA_FILES = 5;

  const states = ['stateLoading', 'stateLogin', 'stateForm', 'stateSubmitting', 'stateDone', 'stateError'];
  function show(id) {
    states.forEach(s => document.getElementById(s).classList.toggle('active', s === id));
  }

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
      .then(r => r.json())
      .catch(err => {
        if (retries > 0) {
          return new Promise(resolve => setTimeout(resolve, 1200)).then(() => fetchJsonWithRetry(url, options, retries - 1));
        }
        throw err;
      });
  }

  function startLogin() {
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
      + '&redirect_uri=' + encodeURIComponent(DISCORD_REDIRECT_URI)
      + '&scope=' + encodeURIComponent('identify')
      + '&state=' + csrfState;
    window.location.href = url;
  }

  document.getElementById('reportLoginBtn').addEventListener('click', startLogin);

  function showErrorState(msg) {
    document.getElementById('errorText').textContent = msg;
    show('stateError');
  }
  document.getElementById('reportRetryBtn').addEventListener('click', () => {
    show(loadToken() ? 'stateForm' : 'stateLogin');
  });

  // --- Form state ---
  let category = null;
  let moddedChoice = null;
  let buglogFile = null;
  let mediaFiles = [];

  const modListField = document.getElementById('modListField');
  const modListInput = document.getElementById('modListInput');
  const descriptionInput = document.getElementById('descriptionInput');
  const linkInput = document.getElementById('linkInput');
  const submitBtn = document.getElementById('reportSubmitBtn');
  const formError = document.getElementById('formError');

  function setFormError(msg) {
    if (!msg) { formError.hidden = true; formError.textContent = ''; return; }
    formError.hidden = false;
    formError.textContent = msg;
  }

  function updateSubmitEnabled() {
    let ok = !!category && !!moddedChoice && !!buglogFile && descriptionInput.value.trim().length > 0;
    if (moddedChoice === 'modded' && !modListInput.value.trim()) ok = false;
    submitBtn.disabled = !ok;
  }

  document.querySelectorAll('#categoryToggle .pill-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#categoryToggle .pill-toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      category = btn.dataset.value;
      updateSubmitEnabled();
    });
  });

  document.querySelectorAll('#moddedToggle .pill-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#moddedToggle .pill-toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      moddedChoice = btn.dataset.value;
      modListField.hidden = moddedChoice !== 'modded';
      updateSubmitEnabled();
    });
  });

  descriptionInput.addEventListener('input', updateSubmitEnabled);
  modListInput.addEventListener('input', updateSubmitEnabled);

  document.getElementById('howtoToggle').addEventListener('click', () => {
    const box = document.getElementById('howtoBox');
    box.hidden = !box.hidden;
  });

  const buglogInput = document.getElementById('buglogInput');
  document.getElementById('buglogPickBtn').addEventListener('click', () => buglogInput.click());
  buglogInput.addEventListener('change', () => {
    const f = buglogInput.files[0];
    setFormError('');
    if (!f) { buglogFile = null; document.getElementById('buglogChosen').textContent = ''; updateSubmitEnabled(); return; }
    if (!f.name.toLowerCase().endsWith('.buglog')) {
      setFormError('Please choose a .buglog file.');
      buglogInput.value = '';
      buglogFile = null;
      document.getElementById('buglogChosen').textContent = '';
      updateSubmitEnabled();
      return;
    }
    if (f.size > MAX_BUGLOG_BYTES) {
      setFormError('That bug log file is too large (max 15 MB).');
      buglogInput.value = '';
      buglogFile = null;
      document.getElementById('buglogChosen').textContent = '';
      updateSubmitEnabled();
      return;
    }
    buglogFile = f;
    document.getElementById('buglogChosen').textContent = f.name + ' (' + formatBytes(f.size) + ')';
    updateSubmitEnabled();
  });

  const mediaInput = document.getElementById('mediaInput');
  document.getElementById('mediaPickBtn').addEventListener('click', () => mediaInput.click());
  mediaInput.addEventListener('change', () => {
    setFormError('');
    const files = Array.from(mediaInput.files || []);
    if (files.length > MAX_MEDIA_FILES) {
      setFormError('You can attach at most ' + MAX_MEDIA_FILES + ' files.');
      mediaInput.value = '';
      mediaFiles = [];
      document.getElementById('mediaChosen').textContent = '';
      return;
    }
    let total = 0;
    for (const f of files) {
      if (f.size > MAX_MEDIA_FILE_BYTES) {
        setFormError('"' + f.name + '" is too large (max 8 MB per file).');
        mediaInput.value = '';
        mediaFiles = [];
        document.getElementById('mediaChosen').textContent = '';
        return;
      }
      total += f.size;
    }
    if (total > MAX_MEDIA_TOTAL_BYTES) {
      setFormError('Attached files are too large combined (max 24 MB total).');
      mediaInput.value = '';
      mediaFiles = [];
      document.getElementById('mediaChosen').textContent = '';
      return;
    }
    mediaFiles = files;
    document.getElementById('mediaChosen').textContent = files.map(f => f.name).join(', ');
  });

  function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const idx = result.indexOf(',');
        resolve(idx >= 0 ? result.slice(idx + 1) : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  submitBtn.addEventListener('click', async () => {
    if (submitBtn.disabled) return;
    const token = loadToken();
    if (!token) { showErrorState('Your session expired. Please sign in again.'); return; }
    setFormError('');
    show('stateSubmitting');
    try {
      const buglogContent = await readFileAsBase64(buglogFile);
      const attachments = [];
      for (const f of mediaFiles) {
        attachments.push({ fileName: f.name, content: await readFileAsBase64(f) });
      }
      const res = await fetch(BUG_REPORT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          category,
          isModded: moddedChoice === 'modded',
          modList: modListInput.value.trim(),
          description: descriptionInput.value.trim(),
          buglog: { fileName: buglogFile.name, content: buglogContent },
          attachments,
          linkUrl: linkInput.value.trim()
        })
      });
      const data = await res.json();
      if (data && data.ok) {
        show('stateDone');
        return;
      }
      if (data && data.error === 'invalid_token') {
        clearToken();
        showErrorState('Your session expired. Please sign in again.');
        return;
      }
      showErrorState("Couldn't send your report. Please try again.");
    } catch (err) {
      showErrorState('Network error. Please try again.');
    }
  });

  (function init() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('code') || params.has('error')) {
      if (params.has('error')) {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('error');
        cleanUrl.searchParams.delete('error_description');
        cleanUrl.searchParams.delete('state');
        window.history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
        showErrorState('Discord sign-in was cancelled or failed. Please try again.');
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

      if (storedState && returnedState !== storedState) {
        showErrorState('Sign-in session mismatch. Please try again.');
        return;
      }

      show('stateLoading');
      fetchJsonWithRetry(LITE_API_URL + '?action=bugReportAuth&code=' + encodeURIComponent(code), { cache: 'no-store' }, 2)
        .then(data => {
          if (!data.ok || !data.reportToken) {
            showErrorState('Discord sign-in failed. Please try again.');
            return;
          }
          saveToken(data.reportToken);
          show('stateForm');
        })
        .catch(() => showErrorState('Network error while contacting the server. Please try again.'));
      return;
    }

    show(loadToken() ? 'stateForm' : 'stateLogin');
  })();
})();
