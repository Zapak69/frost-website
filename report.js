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
  const TOKEN_KEY = 'frostToken';
  const LEGACY_TOKEN_KEY = 'frostReportToken';
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
    try {
      const legacy = localStorage.getItem(LEGACY_TOKEN_KEY);
      if (legacy) {
        localStorage.removeItem(LEGACY_TOKEN_KEY);
        if (!localStorage.getItem(TOKEN_KEY)) localStorage.setItem(TOKEN_KEY, legacy);
      }
      return localStorage.getItem(TOKEN_KEY) || '';
    } catch (e) {
        return '';
    }
  }
  function saveToken(t) {
    try {
        localStorage.setItem(TOKEN_KEY, t);
    } catch (e) {}
    document.dispatchEvent(new CustomEvent('frostAccountLogin'));
  }
  function clearToken() {
    try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('frostLiteAccess');
    } catch (e) {}
    document.dispatchEvent(new CustomEvent('frostAccountLogout'));
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
    if (!msg) {
        formError.hidden = true;
        formError.textContent = '';
        return;
    }
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
  const buglogDropzone = document.getElementById('buglogDropzone');

  function fileBannerIcon() {
    const icon = document.createElement('div');
    icon.className = 'report-file-banner-icon';
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';
    return icon;
  }

  function buildFileBanner(f, thumb, metaText, onRemove) {
    const banner = document.createElement('div');
    banner.className = 'report-file-banner';
    banner.appendChild(thumb);
    const info = document.createElement('div');
    info.className = 'report-file-banner-info';
    const name = document.createElement('div');
    name.className = 'report-file-banner-name';
    name.textContent = f.name;
    const meta = document.createElement('div');
    meta.className = 'report-file-banner-meta';
    meta.textContent = metaText;
    info.appendChild(name);
    info.appendChild(meta);
    banner.appendChild(info);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'report-file-banner-remove';
    remove.title = 'Remove file';
    remove.setAttribute('aria-label', 'Remove ' + f.name);
    remove.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
    remove.addEventListener('click', onRemove);
    banner.appendChild(remove);
    return banner;
  }

  function renderBuglogBanner(f) {
    const box = document.getElementById('buglogChosen');
    box.innerHTML = '';
    buglogDropzone.hidden = !!f;
    if (!f) return;
    box.appendChild(buildFileBanner(f, fileBannerIcon(), 'Bug log · ' + formatBytes(f.size), () => {
      buglogInput.value = '';
      buglogFile = null;
      setFormError('');
      renderBuglogBanner(null);
      updateSubmitEnabled();
    }));
  }

  function acceptBuglogFile(f) {
    setFormError('');
    if (!f) {
      buglogFile = null;
      renderBuglogBanner(null);
      updateSubmitEnabled();
      return;
    }
    if (!f.name.toLowerCase().endsWith('.buglog')) {
      setFormError('Please choose a .buglog file.');
      buglogInput.value = '';
      buglogFile = null;
      renderBuglogBanner(null);
      updateSubmitEnabled();
      return;
    }
    if (f.size > MAX_BUGLOG_BYTES) {
      setFormError('That bug log file is too large (max 15 MB).');
      buglogInput.value = '';
      buglogFile = null;
      renderBuglogBanner(null);
      updateSubmitEnabled();
      return;
    }
    buglogFile = f;
    renderBuglogBanner(f);
    updateSubmitEnabled();
  }
  buglogDropzone.addEventListener('click', () => buglogInput.click());
  buglogInput.addEventListener('change', () => acceptBuglogFile(buglogInput.files[0]));
  ['dragenter', 'dragover'].forEach(evt => buglogDropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    buglogDropzone.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach(evt => buglogDropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    buglogDropzone.classList.remove('dragover');
  }));
  buglogDropzone.addEventListener('drop', (e) => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) acceptBuglogFile(f);
  });

  const mediaInput = document.getElementById('mediaInput');
  const mediaDropzone = document.getElementById('mediaDropzone');
  const mediaGrid = document.getElementById('mediaGrid');
  let mediaPreviewUrls = [];

  function renderMediaGrid() {
    for (const url of mediaPreviewUrls) URL.revokeObjectURL(url);
    mediaPreviewUrls = [];
    mediaGrid.innerHTML = '';
    mediaFiles.forEach((f, idx) => {
      const url = URL.createObjectURL(f);
      mediaPreviewUrls.push(url);
      const isVideo = f.type.startsWith('video/');
      let thumb;
      if (isVideo) {
        thumb = document.createElement('video');
        thumb.muted = true;
        thumb.playsInline = true;
        thumb.preload = 'metadata';
      } else {
        thumb = document.createElement('img');
        thumb.alt = '';
      }
      thumb.className = 'report-file-banner-thumb';
      thumb.src = url;
      const meta = (isVideo ? 'Video' : 'Image') + ' · ' + formatBytes(f.size);
      mediaGrid.appendChild(buildFileBanner(f, thumb, meta, () => {
        mediaFiles.splice(idx, 1);
        setFormError('');
        renderMediaGrid();
      }));
    });
  }

  function acceptMediaFiles(list) {
    setFormError('');
    const incoming = Array.from(list || []);
    for (const f of incoming) {
      if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) {
        setFormError('"' + f.name + '" is not an image or video.');
        continue;
      }
      if (f.size > MAX_MEDIA_FILE_BYTES) {
        setFormError('"' + f.name + '" is too large (max 8 MB per file — trim or compress long videos).');
        continue;
      }
      if (mediaFiles.length >= MAX_MEDIA_FILES) {
        setFormError('You can attach at most ' + MAX_MEDIA_FILES + ' files.');
        break;
      }
      const total = mediaFiles.reduce((sum, x) => sum + x.size, 0);
      if (total + f.size > MAX_MEDIA_TOTAL_BYTES) {
        setFormError('Attached files are too large combined (max 24 MB total).');
        break;
      }
      mediaFiles.push(f);
    }
    renderMediaGrid();
  }

  mediaDropzone.addEventListener('click', () => mediaInput.click());
  mediaInput.addEventListener('change', () => {
    acceptMediaFiles(mediaInput.files);
    mediaInput.value = '';
  });
  ['dragenter', 'dragover'].forEach(evt => mediaDropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    mediaDropzone.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach(evt => mediaDropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    mediaDropzone.classList.remove('dragover');
  }));
  mediaDropzone.addEventListener('drop', (e) => {
    const fl = e.dataTransfer && e.dataTransfer.files;
    if (fl && fl.length) acceptMediaFiles(fl);
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
    if (!token) {
        showErrorState('Your session expired. Please sign in again.');
        return;
    }
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
      try {
          storedState = sessionStorage.getItem(OAUTH_STATE_KEY) || '';
      } catch (e) {}
      try {
          sessionStorage.removeItem(OAUTH_STATE_KEY);
      } catch (e) {}

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
