(function () {
  var GATE_API_URL = 'https://script.google.com/macros/s/AKfycbxF57u1UNBsonktp5_2EseJtFkBZR0-CCxyazOGVUmEBrcwjU1-t6Us41gcrRqCsGcR/exec';
  var GATE_TIMEOUT_MS = 6000;
  var html = document.documentElement;
  html.classList.add('gate-pending');
  function reveal() {
    html.classList.remove('gate-pending');
  }
  function applyBanReason() {
    var reasonEl = document.getElementById('gateBannedReason');
    if (reasonEl && window.__frostBanReason) reasonEl.textContent = window.__frostBanReason;
    var idEl = document.getElementById('gateBannedId');
    if (idEl && window.__frostBanId) {
      idEl.textContent = 'ID: ' + window.__frostBanId;
      idEl.classList.add('visible');
    }
  }
  document.addEventListener('DOMContentLoaded', applyBanReason);
  function showBanned(reason, id) {
    clearTimeout(timeoutId);
    window.__frostBanReason = reason || 'Violation of TOS';
    window.__frostBanId = id || '';
    html.classList.remove('gate-pending');
    html.classList.add('gate-banned');
    applyBanReason();
  }

  var timeoutId = setTimeout(reveal, GATE_TIMEOUT_MS);

  window.__frostIpPromise = fetch('https://api.ipify.org?format=json', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (d) { return (d && d.ip) || ''; })
    .catch(function () { return ''; });

  window.__frostIpPromise.then(function (ip) {
    if (!ip || GATE_API_URL.indexOf('REPLACE_WITH_YOUR_DEPLOYMENT_ID') !== -1) {
      clearTimeout(timeoutId);
      reveal();
      return;
    }
    fetch(GATE_API_URL + '?action=checkban&ip=' + encodeURIComponent(ip), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res && res.banned) {
          showBanned(res.reason, res.id);
        } else {
          clearTimeout(timeoutId);
          reveal();
        }
      })
      .catch(function () { clearTimeout(timeoutId); reveal(); });
  });
})();
