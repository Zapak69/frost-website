(function () {
  var API = 'https://bot.frostclient.eu/site/appeal';
  var COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
  var ICON_COPY = '<svg class="appeal-copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg><svg class="appeal-copied-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  var ICON_CLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/></svg>';
  var ICON_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.3 2.3 4.7-5"/></svg>';
  var $ = function (id) { return document.getElementById(id); };
  var states = ['appealLoading', 'appealLoggedOut', 'appealError', 'appealEmpty'];
  var data = null;
  var revealed = false;
  var source = '';
  var urlBan = cleanBanId(new URLSearchParams(window.location.search).get('ban'));

  function cleanBanId(v) {
    var id = String(v || '').trim().toUpperCase();
    return /^[A-Z0-9-]{4,40}$/.test(id) ? id : '';
  }
  function frostToken() {
    try { return localStorage.getItem('frostToken') || ''; } catch (e) { return ''; }
  }
  function appealToken() {
    try { return sessionStorage.getItem('frostAppealToken') || ''; } catch (e) { return ''; }
  }
  function dropAppealToken() {
    try { sessionStorage.removeItem('frostAppealToken'); } catch (e) {}
  }
  function currentToken() {
    if (source === 'frost') return frostToken();
    if (source === 'appeal') return appealToken();
    return '';
  }
  function show(id) {
    states.forEach(function (s) { $(s).hidden = s !== id; });
  }
  function toMs(v) {
    if (v == null || v === '') return null;
    var n = typeof v === 'number' ? v : (/^\d+$/.test(String(v)) ? Number(v) : Date.parse(v));
    return isFinite(n) && n > 0 ? n : null;
  }
  function fmt(v) {
    var ms = toMs(v);
    if (ms == null) return '-';
    return new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function copyButton(value) {
    var btn = el('button', 'appeal-copy');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Copy Ban ID');
    btn.innerHTML = ICON_COPY + '<span>Copy</span>';
    var timer = null;
    btn.addEventListener('click', function () {
      navigator.clipboard.writeText(value).then(function () {
        btn.classList.add('is-copied');
        btn.lastChild.textContent = 'Copied';
        clearTimeout(timer);
        timer = setTimeout(function () { btn.classList.remove('is-copied'); btn.lastChild.textContent = 'Copy'; }, 1600);
      }).catch(function () {});
    });
    return btn;
  }
  function row(label, value, block) {
    var r = el('div', 'ban-row' + (block ? ' is-block' : ''));
    r.appendChild(el('span', 'appeal-label', label));
    if (typeof value === 'string') r.appendChild(el('span', 'ban-value', value));
    else r.appendChild(value);
    return r;
  }
  function latestAppeal(banId) {
    var list = (data && data.appeals || []).filter(function (a) { return a && a.banId === banId; });
    list.sort(function (a, b) { return (toMs(b.submittedAt) || 0) - (toMs(a.submittedAt) || 0); });
    return list[0] || null;
  }
  function cooldownUntil(appeal) {
    if (!appeal || appeal.status !== 'denied') return null;
    var decided = toMs(appeal.decidedAt);
    if (decided == null) return null;
    var until = decided + COOLDOWN_MS;
    return until > Date.now() ? until : null;
  }
  function statusBox(appeal) {
    var box = el('div', 'appeal-status is-' + appeal.status);
    var icon = appeal.status === 'pending' ? ICON_CLOCK : (appeal.status === 'denied' ? ICON_X : ICON_OK);
    box.innerHTML = icon;
    var body = el('div');
    if (appeal.status === 'pending') {
      body.appendChild(el('div', 'appeal-status-title', 'Your appeal is being reviewed'));
      body.appendChild(el('div', 'appeal-status-text', 'Submitted ' + fmt(appeal.submittedAt) + '. We will update this page once the team has decided.'));
    } else if (appeal.status === 'denied') {
      body.appendChild(el('div', 'appeal-status-title', 'Your appeal was denied'));
      if (appeal.decisionReason) body.appendChild(el('div', 'appeal-status-text', 'Staff note: ' + appeal.decisionReason));
      var until = cooldownUntil(appeal);
      var decided = toMs(appeal.decidedAt);
      if (until) body.appendChild(el('div', 'appeal-status-text', 'You can appeal again on ' + fmt(until) + '.'));
      else if (decided) body.appendChild(el('div', 'appeal-status-text', 'You can submit a new appeal now.'));
    } else {
      body.appendChild(el('div', 'appeal-status-title', 'Your ban was lifted'));
      if (appeal.decisionReason) body.appendChild(el('div', 'appeal-status-text', 'Staff note: ' + appeal.decisionReason));
      if (appeal.decidedAt) body.appendChild(el('div', 'appeal-status-text', 'Lifted on ' + fmt(appeal.decidedAt) + '. You can use Frost Client again.'));
    }
    box.appendChild(body);
    return box;
  }
  function banCard(ban, appeal) {
    var card = el('section', 'appeal-card ban-card');
    var head = el('div', 'ban-head');
    head.appendChild(el('h2', null, 'Ban'));
    var lifted = appeal && appeal.status === 'unbanned';
    var active = !!(ban && ban.active) && !lifted;
    var pill = el('span', 'ban-pill ' + (active ? 'is-active' : (lifted ? 'is-lifted' : 'is-inactive')), active ? 'Active' : (lifted ? 'Lifted' : 'Inactive'));
    head.appendChild(pill);
    card.appendChild(head);
    var rows = el('div', 'ban-rows');
    var idWrap = el('span', 'ban-id-wrap');
    idWrap.appendChild(el('code', 'ban-value appeal-mono', ban.banId));
    idWrap.appendChild(copyButton(ban.banId));
    rows.appendChild(row('Ban ID', idWrap));
    if (ban.reason) rows.appendChild(row('Reason', String(ban.reason), true));
    if (ban.bannedAt) rows.appendChild(row('Banned on', fmt(ban.bannedAt)));
    if (ban.known) rows.appendChild(row('Duration', ban.expiresAt == null || ban.expiresAt === '' ? 'Permanent' : 'Ends ' + fmt(ban.expiresAt)));
    card.appendChild(rows);
    if (appeal) card.appendChild(statusBox(appeal));
    return card;
  }
  function historyItem(appeal) {
    var labels = { pending: 'Waiting', denied: 'Denied', unbanned: 'Approved' };
    var status = labels[appeal.status] ? appeal.status : 'pending';
    var item = el('article', 'appeal-history-item is-' + status);
    var head = el('div', 'appeal-history-head');
    var idWrap = el('span', 'ban-id-wrap');
    idWrap.appendChild(el('code', 'ban-value appeal-mono', String(appeal.banId || '-')));
    head.appendChild(idWrap);
    head.appendChild(el('span', 'appeal-history-pill is-' + status, labels[status]));
    item.appendChild(head);
    item.appendChild(el('div', 'appeal-history-date', 'Sent ' + fmt(appeal.submittedAt)));
    if (appeal.reason) item.appendChild(el('p', 'appeal-history-text', String(appeal.reason)));
    if (status !== 'pending') {
      var decision = el('div', 'appeal-history-decision');
      decision.appendChild(el('span', 'appeal-history-decided', (status === 'denied' ? 'Denied ' : 'Approved ') + fmt(appeal.decidedAt)));
      if (appeal.decisionReason) decision.appendChild(el('span', 'appeal-history-note', 'Staff note: ' + appeal.decisionReason));
      item.appendChild(decision);
    }
    return item;
  }
  function renderHistory() {
    var list = (data.appeals || []).filter(function (a) { return a && a.banId; }).slice();
    list.sort(function (a, b) { return (toMs(b.submittedAt) || 0) - (toMs(a.submittedAt) || 0); });
    var box = $('appealHistoryList');
    box.textContent = '';
    list.forEach(function (a) { box.appendChild(historyItem(a)); });
    $('appealHistory').hidden = list.length === 0;
  }
  function canAppeal(banId) {
    var a = latestAppeal(banId);
    return !(a && (a.status === 'pending' || a.status === 'unbanned' || cooldownUntil(a)));
  }
  function render() {
    var bans = (data.bans || []).filter(function (b) { return b && b.banId; }).map(function (b) {
      return { banId: String(b.banId), reason: b.reason, bannedAt: b.bannedAt, expiresAt: b.expiresAt == null ? null : b.expiresAt, active: !!b.active, known: true };
    });
    var seen = {};
    bans.forEach(function (b) { seen[b.banId] = true; });
    (data.appeals || []).forEach(function (a) {
      if (a && a.banId && !seen[a.banId]) {
        seen[a.banId] = true;
        bans.push({ banId: String(a.banId), active: a.status !== 'unbanned', known: false });
      }
    });
    bans.sort(function (a, b) { return (b.active ? 1 : 0) - (a.active ? 1 : 0) || (toMs(b.bannedAt) || 0) - (toMs(a.bannedAt) || 0); });
    $('appealAccountName').textContent = data.discordName || data.discordId || 'Discord account';
    $('appealAccount').hidden = false;
    var list = $('appealBans');
    list.textContent = '';
    bans.forEach(function (b) { list.appendChild(banCard(b, latestAppeal(b.banId))); });
    renderHistory();
    var open = bans.filter(function (b) { return b.active && b.known && canAppeal(b.banId); });
    show(bans.length ? null : 'appealEmpty');
    var formVisible = revealed || open.length > 0;
    if (!formVisible && urlBan && !seen[urlBan]) formVisible = revealed = true;
    $('appealForm').hidden = !formVisible;
    $('appealRevealBtn').hidden = formVisible;
    var input = $('appealBanId');
    if (!input.value) {
      var pick = urlBan && canAppeal(urlBan) ? urlBan : (open[0] ? open[0].banId : urlBan);
      input.value = pick || '';
    }
    updateCounter();
  }
  function loggedOut(note) {
    data = null;
    $('appealAccount').hidden = true;
    $('appealBans').textContent = '';
    $('appealForm').hidden = true;
    $('appealRevealBtn').hidden = true;
    $('appealHistory').hidden = true;
    setNotice(note || '');
    show('appealLoggedOut');
  }
  function setNotice(text) {
    $('appealNotice').textContent = text;
    $('appealNotice').hidden = !text;
  }
  function request(method, body) {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 15000) : null;
    var opts = { method: method, cache: 'no-store', headers: { Authorization: 'Bearer ' + currentToken() } };
    if (ctrl) opts.signal = ctrl.signal;
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return fetch(API, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, body: j || {} }; });
    }).finally(function () { if (timer) clearTimeout(timer); });
  }
  function load() {
    if (frostToken()) source = 'frost';
    else if (appealToken()) source = 'appeal';
    else return loggedOut();
    show('appealLoading');
    request('GET').then(function (res) {
      if (res.status === 401) {
        if (source === 'frost' && appealToken()) {
          source = 'appeal';
          return request('GET').then(handleLoad);
        }
        if (source === 'appeal') dropAppealToken();
        return loggedOut('Your sign-in has expired. Please log in again.');
      }
      handleLoad(res);
    }).catch(function () {
      $('appealErrorText').textContent = 'We could not reach the Frost Client servers. Check your connection and try again.';
      show('appealError');
    });
  }
  function handleLoad(res) {
    if (res.status === 401) {
      if (source === 'appeal') dropAppealToken();
      return loggedOut('Your sign-in has expired. Please log in again.');
    }
    if (res.status !== 200 || !res.body || res.body.ok !== true) {
      $('appealErrorText').textContent = res.status === 429 ? 'Too many requests. Please wait a minute and try again.' : 'Please try again in a moment.';
      return show('appealError');
    }
    data = res.body;
    render();
  }
  function updateCounter() {
    var n = $('appealReason').value.trim().length;
    var c = $('appealCounter');
    c.textContent = n + ' / 2000' + (n > 0 && n < 20 ? ' (at least 20)' : '');
    c.classList.toggle('is-bad', (n > 0 && n < 20) || n > 2000);
    c.classList.toggle('is-ok', n >= 20 && n <= 2000);
  }
  function formError(text) {
    $('appealFormError').textContent = text;
    $('appealFormError').hidden = !text;
  }
  function errorText(res) {
    var e = res.body && res.body.error;
    if (res.status === 401) return '';
    if (e === 'ban_not_found') return 'We could not find a ban with that Ban ID. Copy it again from the launcher or from this page and try once more.';
    if (e === 'already_pending') return 'You already have an appeal for this ban under review. You will see the decision on this page.';
    if (e === 'cooldown') return res.body.retryAt ? 'Your last appeal for this ban was denied. You can appeal again on ' + fmt(res.body.retryAt) + '.' : 'Your last appeal for this ban was denied recently. Please wait before appealing again.';
    if (e === 'invalid_reason') return 'Your reason must be between 20 and 2000 characters.';
    if (e === 'rate_limited' || res.status === 429) return 'Too many attempts. Please wait a few minutes and try again.';
    return 'Something went wrong while sending your appeal. Please try again.';
  }
  function submit(ev) {
    ev.preventDefault();
    formError('');
    var banId = cleanBanId($('appealBanId').value);
    var reason = $('appealReason').value.trim();
    if (!banId) return formError('Enter the Ban ID shown in the launcher, for example FB-7K2M9QXA.');
    if (reason.length < 20 || reason.length > 2000) return formError('Your reason must be between 20 and 2000 characters.');
    var btn = $('appealSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    request('POST', { banId: banId, reason: reason }).then(function (res) {
      if (res.status === 401) {
        if (source === 'appeal') dropAppealToken();
        return loggedOut('Your sign-in has expired. Please log in again.');
      }
      if (res.status === 200 && res.body && res.body.ok) {
        $('appealReason').value = '';
        $('appealBanId').value = '';
        revealed = false;
        setNotice('Your appeal was submitted. The team will review it and the decision will appear here.');
        return load();
      }
      formError(errorText(res));
    }).catch(function () {
      formError('We could not reach the Frost Client servers. Check your connection and try again.');
    }).finally(function () {
      btn.disabled = false;
      btn.textContent = 'Submit appeal';
    });
  }
  function switchAccount() {
    try {
      localStorage.removeItem('frostToken');
      localStorage.removeItem('frostLiteAccess');
      localStorage.removeItem('frostAccountUser');
    } catch (e) {}
    dropAppealToken();
    $('appealBanId').value = '';
    revealed = false;
    document.dispatchEvent(new CustomEvent('frostAccountLogout'));
    loggedOut();
  }
  function init() {
    $('appealLoginBtn').addEventListener('click', function (e) {
      if (window.FrostAccount && window.FrostAccount.login) window.FrostAccount.login(e.currentTarget);
    });
    $('appealRetryBtn').addEventListener('click', load);
    $('appealSwitchBtn').addEventListener('click', switchAccount);
    $('appealRevealBtn').addEventListener('click', function () {
      revealed = true;
      $('appealForm').hidden = false;
      $('appealRevealBtn').hidden = true;
      $('appealBanId').focus();
    });
    $('appealReason').addEventListener('input', updateCounter);
    $('appealBanId').addEventListener('input', function () { formError(''); });
    $('appealForm').addEventListener('submit', submit);
    document.addEventListener('frostAccountLogin', load);
    document.addEventListener('frostAccountLogout', function () { if (source === 'frost') load(); });
    load();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
