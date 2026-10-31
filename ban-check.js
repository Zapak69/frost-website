(function () {
  var STATUS_URL = 'https://bot.frostclient.eu/site/ban-status';
  var DL_PREFIX = 'https://bot.frostclient.eu/public_dl/';
  var ICON_BLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m5.7 5.7 12.6 12.6"/></svg>';
  var ICON_COPY = '<svg class="fbg-copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg><svg class="fbg-copied-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  var ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  var busy = false;
  var overlay = null;

  function token() {
    try { return localStorage.getItem('frostToken') || sessionStorage.getItem('frostAppealToken') || ''; } catch (e) { return ''; }
  }
  function checkStatus() {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var t = token();
    var opts = { cache: 'no-store', headers: t ? { Authorization: 'Bearer ' + t } : {} };
    if (ctrl) opts.signal = ctrl.signal;
    var timeout = new Promise(function (resolve) {
      setTimeout(function () { if (ctrl) ctrl.abort(); resolve(null); }, 4000);
    });
    var req = fetch(STATUS_URL, opts).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    return Promise.race([req, timeout]).then(function (j) {
      return j && j.ok === true && j.banned === true ? { banned: true, banId: j.banId ? String(j.banId) : '' } : { banned: false };
    });
  }
  function injectStyles() {
    if (document.getElementById('fbgStyles')) return;
    var s = document.createElement('style');
    s.id = 'fbgStyles';
    s.textContent = [
      '.fbg-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,0.55);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);animation:fbgIn .18s ease}',
      '@keyframes fbgIn{from{opacity:0}to{opacity:1}}',
      '.fbg-box{position:relative;width:420px;max-width:100%;padding:32px 28px 26px;text-align:center;color:var(--text,#f5f5f7);background:rgba(23,16,31,0.82);background:color-mix(in srgb,var(--surface,#1c1c1e) 82%,transparent);border:1px solid var(--border-strong,rgba(255,255,255,0.14));border-radius:22px;box-shadow:0 30px 80px -24px rgba(0,0,0,0.75);backdrop-filter:blur(22px) saturate(1.4);-webkit-backdrop-filter:blur(22px) saturate(1.4);font-family:inherit}',
      '.fbg-close{position:absolute;top:14px;right:14px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:1px solid var(--border,rgba(255,255,255,0.08));background:rgba(255,255,255,0.04);color:var(--muted,#999);cursor:pointer}',
      '.fbg-close:hover{color:var(--text,#fff);background:rgba(255,255,255,0.08)}',
      '.fbg-close svg{width:15px;height:15px}',
      '.fbg-icon{width:56px;height:56px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;border-radius:16px;color:var(--red,#ff6961);background:rgba(255,105,97,0.1);border:1px solid rgba(255,105,97,0.28)}',
      '.fbg-icon svg{width:28px;height:28px}',
      '.fbg-title{font-size:20px;font-weight:700;letter-spacing:-0.3px;margin:0 0 8px}',
      '.fbg-text{font-size:14.5px;line-height:1.6;color:var(--muted,#9a9a9a);margin:0}',
      '.fbg-id{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:20px 0 0;padding:11px 14px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid var(--border,rgba(255,255,255,0.08));text-align:left}',
      '.fbg-label{font-size:11px;font-weight:600;letter-spacing:.6px;text-transform:uppercase;color:var(--muted,#999)}',
      '.fbg-id-val{display:flex;align-items:center;gap:8px}',
      '.fbg-id code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13.5px;letter-spacing:.4px;color:var(--text,#fff)}',
      '.fbg-copy{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 10px;border-radius:8px;border:1px solid var(--border-strong,rgba(255,255,255,0.14));background:rgba(255,255,255,0.04);color:var(--muted,#999);font:600 12px/1 inherit;font-family:inherit;cursor:pointer}',
      '.fbg-copy:hover{color:var(--text,#fff);background:rgba(255,255,255,0.08)}',
      '.fbg-copy svg{width:13px;height:13px}',
      '.fbg-copy .fbg-copied-icon,.fbg-copy.is-copied .fbg-copy-icon{display:none}',
      '.fbg-copy.is-copied .fbg-copied-icon{display:block}',
      '.fbg-copy.is-copied{color:var(--green,#32d74b);border-color:rgba(50,215,75,0.35)}',
      '.fbg-actions{display:flex;gap:8px;margin-top:22px}',
      '.fbg-actions a,.fbg-actions button{flex:1;padding:13px 18px;font-size:14.5px}',
      '.fbg-checking{opacity:.6;pointer-events:none;cursor:progress}'
    ].join('\n');
    document.head.appendChild(s);
  }
  function closeOverlay() {
    if (overlay) overlay.remove();
    overlay = null;
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) {
    if (e.key === 'Escape') closeOverlay();
  }
  function showBlocked(banId) {
    injectStyles();
    closeOverlay();
    overlay = document.createElement('div');
    overlay.className = 'fbg-overlay';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'fbgTitle');
    var box = document.createElement('div');
    box.className = 'fbg-box';
    box.innerHTML = '<button type="button" class="fbg-close" aria-label="Close">' + ICON_CLOSE + '</button><div class="fbg-icon">' + ICON_BLOCK + '</div><h2 class="fbg-title" id="fbgTitle">Download blocked</h2><p class="fbg-text">Downloads are blocked: this device or network is banned from Frost Client.</p>';
    if (banId) {
      var idRow = document.createElement('div');
      idRow.className = 'fbg-id';
      idRow.innerHTML = '<span class="fbg-label">Ban ID</span><span class="fbg-id-val"><code></code><button type="button" class="fbg-copy" aria-label="Copy Ban ID">' + ICON_COPY + '<span>Copy</span></button></span>';
      idRow.querySelector('code').textContent = banId;
      var copy = idRow.querySelector('.fbg-copy');
      copy.addEventListener('click', function () {
        navigator.clipboard.writeText(banId).then(function () {
          copy.classList.add('is-copied');
          copy.lastChild.textContent = 'Copied';
          setTimeout(function () { copy.classList.remove('is-copied'); copy.lastChild.textContent = 'Copy'; }, 1600);
        }).catch(function () {});
      });
      box.appendChild(idRow);
    }
    var actions = document.createElement('div');
    actions.className = 'fbg-actions';
    var appeal = document.createElement('a');
    appeal.className = 'btn-primary';
    appeal.href = '/appeal.html' + (banId ? '?ban=' + encodeURIComponent(banId) : '');
    appeal.textContent = 'Appeal';
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'btn-secondary';
    close.textContent = 'Close';
    actions.appendChild(appeal);
    actions.appendChild(close);
    box.appendChild(actions);
    overlay.appendChild(box);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeOverlay(); });
    close.addEventListener('click', closeOverlay);
    box.querySelector('.fbg-close').addEventListener('click', closeOverlay);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    appeal.focus();
  }
  function targetUrl(target) {
    if (!target || !target.closest) return '';
    var alt = target.closest('.dl-tile-alt-link');
    if (alt && alt.dataset.file) return DL_PREFIX + alt.dataset.file;
    var a = target.closest('a[href]');
    if (!a) return '';
    var href = a.href || '';
    return href.indexOf(DL_PREFIX + 'Frost-Launcher') === 0 ? href : '';
  }
  function gate(e) {
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    if (e.type === 'click' && (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return;
    var url = targetUrl(e.target);
    if (!url) return;
    if (e.type === 'keydown' && !(e.target.closest && e.target.closest('.dl-tile-alt-link'))) return;
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    busy = true;
    var holder = e.target.closest('a, .dl-tile-alt-link');
    if (holder) holder.classList.add('fbg-checking');
    injectStyles();
    checkStatus().then(function (res) {
      if (res.banned) showBlocked(res.banId);
      else window.location.href = url;
    }).finally(function () {
      busy = false;
      if (holder) holder.classList.remove('fbg-checking');
    });
  }
  document.addEventListener('click', gate, true);
  document.addEventListener('keydown', gate, true);
  window.FrostBanGate = { check: checkStatus, showBlocked: showBlocked };
})();
