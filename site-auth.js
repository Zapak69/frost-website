
(function () {
  var LITE_API_URL = 'https://script.google.com/macros/s/AKfycbxF57u1UNBsonktp5_2EseJtFkBZR0-CCxyazOGVUmEBrcwjU1-t6Us41gcrRqCsGcR/exec';
  var TOKEN_KEY = 'frostLiteToken';
  var OAUTH_STATE_KEY = 'frostLiteOauthState';
  var ACCOUNT_URL = 'https://frostclient.eu/lite';

  function loadToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }

  function clearToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('frostLiteAccess');
    } catch (e) {}
  }

  function startLogin(btn) {
    btn.classList.add('loading');
    fetch(LITE_API_URL + '?action=liteConfig', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        if (!cfg.ok || !cfg.clientId || cfg.clientId.indexOf('PASTE_') === 0) {
          btn.classList.remove('loading');
          window.location.href = ACCOUNT_URL;
          return;
        }
        var csrfState = '';
        try {
          var buf = new Uint8Array(16);
          crypto.getRandomValues(buf);
          csrfState = Array.from(buf).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
          sessionStorage.setItem(OAUTH_STATE_KEY, csrfState);
        } catch (e) {}
        var url = 'https://discord.com/oauth2/authorize'
          + '?client_id=' + encodeURIComponent(cfg.clientId)
          + '&response_type=code'
          + '&redirect_uri=' + encodeURIComponent(cfg.redirectUri)
          + '&scope=' + encodeURIComponent('identify guilds.members.read')
          + '&state=' + csrfState;
        window.location.href = url;
      })
      .catch(function () {
        btn.classList.remove('loading');
        window.location.href = ACCOUNT_URL;
      });
  }

  function hasLiteAccess() {
    try { return localStorage.getItem('frostLiteAccess') === '1'; } catch (e) { return false; }
  }

  function applyState() {
    var loggedIn = !!loadToken();
    document.querySelectorAll('.js-site-auth-btn').forEach(function (btn) {
      var textEl = btn.querySelector('.js-site-auth-text') || btn;
      textEl.textContent = loggedIn ? 'Logout' : 'Sign in';
      btn.classList.toggle('is-logged-in', loggedIn);
    });
    var showDownloadLink = loggedIn && hasLiteAccess();
    document.querySelectorAll('.js-lite-access-link').forEach(function (a) {
      if (a.dataset.defaultHref === undefined) a.dataset.defaultHref = a.getAttribute('href');
      a.href = showDownloadLink ? 'https://frostclient.eu/lite/download' : a.dataset.defaultHref;
    });
  }

  function init() {
    applyState();
    document.querySelectorAll('.js-site-auth-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.classList.contains('is-logged-in')) {
          clearToken();
          applyState();
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
