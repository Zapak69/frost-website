
(function () {
  var LITE_API_URL = 'https://script.google.com/macros/s/AKfycbxF57u1UNBsonktp5_2EseJtFkBZR0-CCxyazOGVUmEBrcwjU1-t6Us41gcrRqCsGcR/exec';
  var TOKEN_KEY = 'frostToken';
  var OAUTH_STATE_KEY = 'frostLiteOauthState';
  var ACCOUNT_URL = 'https://frostclient.eu/lite';
  var DISCORD_CLIENT_ID = '1512834635640475898';
  var DISCORD_REDIRECT_URI = 'https://frostclient.eu/lite';

  function loadToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }

  function clearToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('frostLiteAccess');
    } catch (e) {}
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

  function startLogin(btn) {
    try { fetch(LITE_API_URL + '?action=liteConfig', { cache: 'no-store', keepalive: true }); } catch (e) {}
    var csrfState = '';
    try {
      var buf = new Uint8Array(16);
      crypto.getRandomValues(buf);
      csrfState = Array.from(buf).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
      sessionStorage.setItem(OAUTH_STATE_KEY, csrfState);
    } catch (e) {}
    var url = 'https://discord.com/oauth2/authorize'
      + '?client_id=' + encodeURIComponent(DISCORD_CLIENT_ID)
      + '&response_type=code'
      + '&redirect_uri=' + encodeURIComponent(DISCORD_REDIRECT_URI)
      + '&scope=' + encodeURIComponent('identify guilds.members.read')
      + '&state=' + csrfState;
    window.location.href = url;
  }

  function hasLiteAccess() {
    try { return localStorage.getItem('frostLiteAccess') === '1'; } catch (e) { return false; }
  }

  function applyState() {
    var loggedIn = !!loadToken();
    document.querySelectorAll('.js-site-auth-btn').forEach(function (btn) {
      var textEl = btn.querySelector('.js-site-auth-text') || btn;
      textEl.textContent = loggedIn ? 'Manage' : 'Sign in';
      btn.classList.toggle('is-logged-in', loggedIn);
    });
    var showDownloadLink = loggedIn && hasLiteAccess();
    document.querySelectorAll('.js-lite-access-link').forEach(function (a) {
      if (a.dataset.defaultHref === undefined) a.dataset.defaultHref = a.getAttribute('href');
      a.href = showDownloadLink ? 'https://frostclient.eu/lite/download' : a.dataset.defaultHref;
    });
  }

  var modalBuilt = false;
  var modalEls = null;

  function avatarUrl(user) {
    if (user && user.avatar) {
      return 'https://cdn.discordapp.com/avatars/' + user.id + '/' + user.avatar + '.png?size=128';
    }
    var idx = 0;
    try { idx = Number((BigInt((user && user.id) || '0') >> 22n) % 6n); } catch (e) { idx = 0; }
    return 'https://cdn.discordapp.com/embed/avatars/' + idx + '.png';
  }

  function formatDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function injectModalStyles() {
    if (document.getElementById('frostAccountStyles')) return;
    var style = document.createElement('style');
    style.id = 'frostAccountStyles';
    style.textContent = [
      '.frost-account-overlay{position:fixed;inset:0;z-index:1000;background:rgba(4,6,9,0.6);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);',
      'display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;pointer-events:none;transition:opacity 0.25s ease;}',
      '.frost-account-overlay.open{opacity:1;pointer-events:auto;}',
      '.frost-account-modal{position:relative;width:100%;max-width:400px;background:linear-gradient(180deg,#171a1f,#101113);',
      'border:1px solid var(--border,rgba(79,200,248,0.15));border-radius:18px;padding:30px 26px 26px;',
      'box-shadow:0 20px 60px rgba(0,0,0,0.55);transform:translateY(10px) scale(0.98);opacity:0;transition:transform 0.3s cubic-bezier(0.22,1,0.36,1),opacity 0.3s ease;',
      'font-family:"Space Grotesk",sans-serif;color:var(--text,#e8f4fc);max-height:calc(100vh - 48px);overflow-y:auto;}',
      '.frost-account-overlay.open .frost-account-modal{transform:translateY(0) scale(1);opacity:1;}',
      '.frost-account-close{position:absolute;top:16px;right:16px;width:30px;height:30px;border-radius:8px;border:1px solid var(--border,rgba(79,200,248,0.15));',
      'background:rgba(255,255,255,0.04);color:var(--muted,#6b8fa8);font-size:18px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:color 0.2s,background 0.2s;}',
      '.frost-account-close:hover{color:var(--text,#e8f4fc);background:rgba(255,255,255,0.08);}',
      '.frost-account-loading,.frost-account-error{font-size:13.5px;color:var(--muted,#6b8fa8);text-align:center;padding:30px 6px;}',
      '.frost-account-error{color:#ff8a8a;}',
      '.frost-account-head{display:flex;align-items:center;gap:14px;margin-bottom:20px;}',
      '.frost-account-avatar{width:56px;height:56px;border-radius:50%;border:2px solid var(--border,rgba(79,200,248,0.15));flex-shrink:0;object-fit:cover;}',
      '.frost-account-headcol{min-width:0;flex:1;}',
      '.frost-account-name{font-weight:700;font-size:16.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.frost-account-username{font-size:12.5px;color:var(--muted,#6b8fa8);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.frost-account-badges{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;}',
      '.frost-account-badge{display:inline-flex;align-items:center;gap:5px;font-family:"Space Mono",monospace;font-size:10px;font-weight:700;',
      'letter-spacing:0.5px;padding:5px 10px;border-radius:6px;white-space:nowrap;}',
      '.frost-account-badge-lite{background:linear-gradient(90deg,var(--boost,#ff73fa),var(--boost-deep,#b845ff));color:#1a0a1f;border:1px solid transparent;}',

      '.frost-account-badge-booster{background:rgba(255,255,255,0.06);color:var(--boost,#ff73fa);border:1px solid var(--boost,#ff73fa);}',
      '.frost-account-badge-free{background:rgba(255,255,255,0.06);color:var(--muted,#6b8fa8);border:1px solid var(--border,rgba(79,200,248,0.15));}',
      '.frost-account-rows{display:flex;flex-direction:column;gap:0;border-top:1px solid var(--border,rgba(79,200,248,0.15));margin-bottom:22px;}',
      '.frost-account-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid var(--border,rgba(79,200,248,0.15));}',
      '.frost-account-row-label{font-size:12.5px;color:var(--muted,#6b8fa8);flex-shrink:0;}',
      '.frost-account-row-value{font-size:13px;font-weight:600;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:60%;}',
      '.frost-account-row-value a{color:var(--frost-blue,#4fc8f8);text-decoration:underline;text-underline-offset:2px;}',
      '.frost-account-idval-group{display:flex;align-items:center;gap:6px;}',
      '.frost-account-idval-wrap{position:relative;display:inline-block;max-width:108px;overflow:hidden;border-radius:4px;}',
      '.frost-account-idval{display:block;font-family:"Space Mono",monospace;font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;',
      'white-space:nowrap;filter:blur(4px);transition:filter 0.25s ease;user-select:none;}',
      '.frost-account-idval-wrap:hover .frost-account-idval{filter:blur(0);user-select:text;}',
      '.frost-account-icon-btn{width:23px;height:23px;flex-shrink:0;border-radius:6px;border:1px solid var(--border,rgba(79,200,248,0.15));',
      'background:rgba(255,255,255,0.04);color:var(--muted,#6b8fa8);font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:color 0.2s,background 0.2s;}',
      '.frost-account-icon-btn:hover{color:var(--text,#e8f4fc);background:rgba(255,255,255,0.08);}',
      '.frost-account-actions{display:flex;flex-direction:column;gap:10px;margin-bottom:12px;}',
      '.frost-account-actions-row{display:flex;gap:10px;}',
      '.frost-account-btn{flex:1;text-align:center;font-size:12.5px;font-weight:600;padding:11px 10px;border-radius:9px;text-decoration:none;',
      'border:1px solid var(--border,rgba(79,200,248,0.15));background:rgba(255,255,255,0.04);color:var(--text,#e8f4fc);transition:border-color 0.2s,background 0.2s,transform 0.2s;cursor:pointer;}',
      '.frost-account-btn:hover{border-color:rgba(255,255,255,0.28);background:rgba(255,255,255,0.08);transform:translateY(-1px);}',
      '.frost-account-btn-download{background:linear-gradient(100deg,var(--frost-blue,#4fc8f8),var(--frost-deep,#1a7fc4));border:none;color:#06121c;font-weight:700;}',

      '.frost-account-btn-download:hover{background:linear-gradient(100deg,var(--frost-blue,#4fc8f8),var(--frost-deep,#1a7fc4));filter:brightness(1.12);transform:translateY(-1px);}',
      '.frost-account-btn-subscribe{width:100%;background:linear-gradient(100deg,var(--boost,#ff73fa),var(--boost-deep,#b845ff));border:none;color:#1a0a1f;font-weight:700;}',

      '.frost-account-btn-subscribe:hover{background:linear-gradient(100deg,var(--boost,#ff73fa),var(--boost-deep,#b845ff));filter:brightness(1.12);transform:translateY(-1px);}',

      '.frost-account-slide-window{display:block;height:19px;line-height:19px;overflow:hidden;}',
      '.frost-account-slide{display:block;transition:transform 0.35s cubic-bezier(0.22,1,0.36,1);transform:translateY(-19px);}',
      '.frost-account-slide-row{display:block;height:19px;line-height:19px;}',
      '.frost-account-btn-cancel:hover .frost-account-slide{transform:translateY(0);}',
      '.frost-account-logout-btn{width:100%;text-align:center;font-size:13px;font-weight:700;padding:12px 10px;border-radius:9px;',
      'border:1px solid rgba(212,18,18,0.4);background:rgba(212,18,18,0.1);color:#ff8a8a;cursor:pointer;transition:background 0.2s,border-color 0.2s;}',
      '.frost-account-logout-btn:hover{background:rgba(212,18,18,0.2);border-color:rgba(212,18,18,0.65);}'
    ].join('');
    document.head.appendChild(style);
  }

  function buildModal() {
    if (modalBuilt) return modalEls;
    injectModalStyles();

    var overlay = document.createElement('div');
    overlay.className = 'frost-account-overlay';
    overlay.innerHTML = [
      '<div class="frost-account-modal" role="dialog" aria-modal="true" aria-label="Account">',
      '  <button type="button" class="frost-account-close" aria-label="Close">×</button>',
      '  <div class="frost-account-loading">Loading account…</div>',
      '  <div class="frost-account-error" style="display:none"></div>',
      '  <div class="frost-account-content" style="display:none">',
      '    <div class="frost-account-head">',
      '      <img class="frost-account-avatar" src="" alt="">',
      '      <div class="frost-account-headcol">',
      '        <div class="frost-account-name">—</div>',
      '        <div class="frost-account-username">—</div>',
      '        <div class="frost-account-badges">',
      '          <span class="frost-account-badge frost-account-badge-lite" style="display:none">LITE ACTIVE</span>',
      '          <span class="frost-account-badge frost-account-badge-booster" style="display:none">SERVER BOOSTER</span>',
      '          <span class="frost-account-badge frost-account-badge-free" style="display:none">FREE</span>',
      '        </div>',
      '      </div>',
      '    </div>',
      '    <div class="frost-account-rows">',
      '      <div class="frost-account-row frost-account-row-name" style="display:none"><span class="frost-account-row-label">Name</span><span class="frost-account-row-value frost-account-whop-name">—</span></div>',
      '      <div class="frost-account-row frost-account-row-email" style="display:none"><span class="frost-account-row-label">Email</span><span class="frost-account-row-value frost-account-email">—</span></div>',
      '      <div class="frost-account-row frost-account-row-whopid" style="display:none">',
      '        <span class="frost-account-row-label">Whop ID</span>',
      '        <span class="frost-account-idval-group">',
      '          <span class="frost-account-idval-wrap">',
      '            <span class="frost-account-idval frost-account-whopid-val">—</span>',
      '          </span>',
      '          <button type="button" class="frost-account-icon-btn frost-account-copy-btn" aria-label="Copy Whop ID">⧉</button>',
      '        </span>',
      '      </div>',
      '      <div class="frost-account-row frost-account-row-valid" style="display:none"><span class="frost-account-row-label">Active until</span><span class="frost-account-row-value frost-account-valid-until">—</span></div>',
      '      <div class="frost-account-row"><span class="frost-account-row-label">Member since</span><span class="frost-account-row-value frost-account-member-since">—</span></div>',
      '      <div class="frost-account-row"><span class="frost-account-row-label">Subscriber since</span><span class="frost-account-row-value frost-account-sub-since">—</span></div>',
      '    </div>',
      '    <div class="frost-account-actions">',
      '      <a class="frost-account-btn frost-account-btn-download" href="https://frostclient.eu/lite/download">Download Lite</a>',
      '      <a class="frost-account-btn frost-account-btn-subscribe" href="https://frostclient.eu/lite" style="display:none">Subscribe</a>',
      '      <div class="frost-account-actions-row">',
      '        <a class="frost-account-btn frost-account-btn-cancel" href="https://frostclient.eu/lite/cancel">',
      '          <span class="frost-account-slide-window">',
      '            <span class="frost-account-slide">',
      '              <span class="frost-account-slide-row frost-account-slide-emoji">😥</span>',
      '              <span class="frost-account-slide-row frost-account-slide-text">Cancel Subscription</span>',
      '            </span>',
      '          </span>',
      '        </a>',
      '        <a class="frost-account-btn" href="https://whop.com/hub" target="_blank" rel="noopener">Manage Whop</a>',
      '      </div>',
      '    </div>',
      '    <button type="button" class="frost-account-logout-btn">Logout</button>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(overlay);

    modalEls = {
      overlay: overlay,
      loading: overlay.querySelector('.frost-account-loading'),
      error: overlay.querySelector('.frost-account-error'),
      content: overlay.querySelector('.frost-account-content'),
      avatar: overlay.querySelector('.frost-account-avatar'),
      name: overlay.querySelector('.frost-account-name'),
      username: overlay.querySelector('.frost-account-username'),
      badgeLite: overlay.querySelector('.frost-account-badge-lite'),
      badgeBooster: overlay.querySelector('.frost-account-badge-booster'),
      badgeFree: overlay.querySelector('.frost-account-badge-free'),
      nameRow: overlay.querySelector('.frost-account-row-name'),
      whopName: overlay.querySelector('.frost-account-whop-name'),
      emailRow: overlay.querySelector('.frost-account-row-email'),
      email: overlay.querySelector('.frost-account-email'),
      whopIdRow: overlay.querySelector('.frost-account-row-whopid'),
      whopIdVal: overlay.querySelector('.frost-account-whopid-val'),
      copyBtn: overlay.querySelector('.frost-account-copy-btn'),
      validRow: overlay.querySelector('.frost-account-row-valid'),
      validUntil: overlay.querySelector('.frost-account-valid-until'),
      memberSince: overlay.querySelector('.frost-account-member-since'),
      subSince: overlay.querySelector('.frost-account-sub-since'),
      downloadBtn: overlay.querySelector('.frost-account-btn-download'),
      subscribeBtn: overlay.querySelector('.frost-account-btn-subscribe'),
      actionsRow: overlay.querySelector('.frost-account-actions-row'),
      manageWhopLink: overlay.querySelector('.frost-account-actions a[href*="whop.com"]'),
      logoutBtn: overlay.querySelector('.frost-account-logout-btn'),
      closeBtn: overlay.querySelector('.frost-account-close')
    };

    function close() {
      overlay.classList.remove('open');
    }
    modalEls.closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('open')) close();
    });
    modalEls.logoutBtn.addEventListener('click', function () {
      clearToken();
      close();
      document.dispatchEvent(new CustomEvent('frostAccountLogout'));
    });

    modalEls.copyBtn.addEventListener('click', function () {
      var real = modalEls.whopIdVal.dataset.real || '';
      if (!real) return;
      var done = function () {
        var original = modalEls.copyBtn.textContent;
        modalEls.copyBtn.textContent = '✓';
        setTimeout(function () { modalEls.copyBtn.textContent = original; }, 1200);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(real).then(done).catch(function () {});
      }
    });

    modalBuilt = true;
    return modalEls;
  }

  function fetchAccountInfo(token) {
    return fetchJsonWithRetry(LITE_API_URL + '?action=accountInfo&token=' + encodeURIComponent(token), { cache: 'no-store' }, 2);
  }

  function populateModal(els, data) {
    var user = data.user || {};
    els.avatar.src = avatarUrl(user);
    els.name.textContent = user.name || user.username || 'Unknown';
    els.username.textContent = user.username ? '@' + user.username : '';
    var isBooster = data.isBooster === true;
    els.badgeLite.style.display = data.liteActive ? '' : 'none';
    els.badgeBooster.style.display = isBooster ? '' : 'none';
    els.badgeFree.style.display = (!data.liteActive && !isBooster) ? '' : 'none';

    var whop = data.whop || null;
    var gift = data.gift || null;
    var hasLite = data.liteActive === true;
    els.nameRow.style.display = whop ? '' : 'none';
    els.emailRow.style.display = whop ? '' : 'none';
    els.whopIdRow.style.display = whop ? '' : 'none';
    if (whop) {
      els.whopName.textContent = whop.name || '—';
      els.email.textContent = whop.email || '—';
      els.whopIdVal.dataset.real = whop.whopId || '';
      els.whopIdVal.textContent = whop.whopId || '—';
    }

    els.validRow.style.display = hasLite ? '' : 'none';
    if (hasLite) {
      var validUntilIso = (whop && whop.validUntil) || (gift && gift.until) || null;
      els.validUntil.textContent = validUntilIso ? formatDate(validUntilIso) : '—';
    }
    els.downloadBtn.style.display = hasLite ? '' : 'none';
    els.actionsRow.style.display = (hasLite && whop) ? '' : 'none';

    els.subscribeBtn.style.display = whop ? 'none' : '';

    els.memberSince.textContent = formatDate(data.memberSince);
    if (whop && whop.subscriberSince) {
      els.subSince.textContent = formatDate(whop.subscriberSince);
    } else if (gift) {
      els.subSince.textContent = 'Gifted';
    } else {
      els.subSince.textContent = '';
      var subscribeLink = document.createElement('a');
      subscribeLink.href = 'https://frostclient.eu/lite';
      subscribeLink.textContent = 'Subscribe?';
      els.subSince.appendChild(subscribeLink);
    }
    if (els.manageWhopLink && whop && whop.manageUrl) {
      els.manageWhopLink.href = whop.manageUrl;
    }
  }

  var accountDataCache = null;
  var accountDataPromise = null;

  function prefetchAccountInfo() {
    var token = loadToken();
    if (!token) return;
    accountDataPromise = fetchAccountInfo(token).then(function (data) {
      if (data && data.ok) accountDataCache = data;
      return data;
    }).catch(function () { return null; });
  }

  function openAccountModal() {
    var token = loadToken();
    if (!token) return;
    var els = buildModal();
    els.overlay.classList.add('open');

    function showError(msg) {
      els.loading.style.display = 'none';
      els.content.style.display = 'none';
      els.error.style.display = '';
      els.error.textContent = msg;
    }

    function handleResult(data, isBackgroundRefresh) {
      if (!data || !data.ok) {
        if (data && data.error === 'token_expired') {
          clearToken();
          document.dispatchEvent(new CustomEvent('frostAccountLogout'));
          els.overlay.classList.remove('open');
          return;
        }
        if (!isBackgroundRefresh) showError("Couldn't load your account. Please try again.");
        return;
      }
      accountDataCache = data;
      els.loading.style.display = 'none';
      els.error.style.display = 'none';
      els.content.style.display = '';
      populateModal(els, data);
    }

    if (accountDataCache) {

      handleResult(accountDataCache, false);
      fetchAccountInfo(token).then(function (data) { handleResult(data, true); }).catch(function () {});
      return;
    }

    els.loading.style.display = '';
    els.error.style.display = 'none';
    els.content.style.display = 'none';
    (accountDataPromise || fetchAccountInfo(token))
      .then(function (data) { handleResult(data, false); })
      .catch(function () { showError('Network error while loading your account. Please try again.'); });
  }

  window.FrostAccount = { open: openAccountModal };

  function init() {
    applyState();
    document.addEventListener('frostAccountLogout', applyState);
    if (loadToken()) prefetchAccountInfo();
    document.querySelectorAll('.js-site-auth-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.classList.contains('is-logged-in')) {
          openAccountModal();
        } else {
          startLogin(btn);
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
