(function () {
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];
  function resizeCanvas() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  for (let i = 0; i < 80; i++) particles.push({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * 1.5 + 0.5,
    speed: Math.random() * 0.4 + 0.1,
    drift: (Math.random() - 0.5) * 0.3,
    opacity: Math.random() * 0.4 + 0.1
  });
  (function animateParticles() {
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(168,230,248,${p.opacity})`;
      ctx.fill();
      p.y += p.speed; p.x += p.drift;
      if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
      if (p.x > W + 10) p.x = -10;
      if (p.x < -10) p.x = W + 10;
    }
    requestAnimationFrame(animateParticles);
  })();
})();

(function () {
  const LITE_API_URL = 'https://script.google.com/macros/s/AKfycbxF57u1UNBsonktp5_2EseJtFkBZR0-CCxyazOGVUmEBrcwjU1-t6Us41gcrRqCsGcR/exec';
  const TOKEN_KEY = 'frostToken';
  const LEGACY_OWNER_TOKEN_KEY = 'frostStatisticsOwnerToken';
  const LEGACY_TOKEN_KEY = 'frostStatisticsToken';
  const OAUTH_STATE_KEY = 'frostStatisticsOauthState';
  const CACHE_KEY = 'frostStatisticsCache';
  const DISCORD_CLIENT_ID = '1512834635640475898';
  const DISCORD_REDIRECT_URI_STATISTICS = 'https://frostclient.eu/statistics';
  const BRIDGE_URL = 'https://bot.frostclient.eu/statistics-data';
  function saveCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) {}
  }
  function loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  const states = ['stateLoading', 'stateLogin', 'stateWorking', 'stateDenied', 'stateError', 'stateData'];
  function show(id) {
    states.forEach(s => document.getElementById(s).classList.toggle('active', s === id));
    document.getElementById('navLogoutBtn').style.display = (id === 'stateData') ? 'inline-block' : 'none';
  }

  function saveToken(t) {
    try { localStorage.setItem(TOKEN_KEY, t); } catch (e) {}
    document.dispatchEvent(new CustomEvent('frostAccountLogin'));
  }
  function loadToken() {
    try {
      const legacy = localStorage.getItem(LEGACY_OWNER_TOKEN_KEY);
      if (legacy && !localStorage.getItem(TOKEN_KEY)) localStorage.setItem(TOKEN_KEY, legacy);
      localStorage.removeItem(LEGACY_OWNER_TOKEN_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      return localStorage.getItem(TOKEN_KEY) || '';
    } catch (e) { return ''; }
  }
  function clearToken() {
    try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(CACHE_KEY); localStorage.removeItem('frostLiteAccess'); } catch (e) {}
    document.dispatchEvent(new CustomEvent('frostAccountLogout'));
  }


  function showError(msg) {
    document.getElementById('errorText').textContent = msg || 'Please try again.';
    show('stateError');
  }

  function formatDuration(ms) {
    const totalMinutes = Math.max(0, Math.floor(ms / 60000));
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) return days + 'd ' + hours + 'h';
    if (hours > 0) return hours + 'h ' + minutes + 'm';
    return minutes + 'm';
  }

  function formatNumber(n) {
    const rounded = Math.round(n * 10) / 10;
    const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    const parts = text.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return parts.join('.');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const CHART_ACCENT = '#4fc8f8';
  const CHART_MUTED = '#6b8fa8';
  const CHART_BORDER = 'rgba(79,200,248,0.15)';
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs) {
    const e = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function niceCeil(value) {
    if (value <= 0) return 1;
    const exp = Math.floor(Math.log10(value));
    const base = Math.pow(10, exp);
    const steps = [1, 2, 5, 10];
    for (const s of steps) {
      if (value <= s * base) return s * base;
    }
    return 10 * base;
  }

  function formatClock(t) {
    const d = new Date(t);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  function formatDateShort(t) {
    const d = new Date(t);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function formatDateTime(t) {
    const d = new Date(t);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' + formatClock(t);
  }

  let lastData = null;
  let currentRange = '24h';
  const INTRADAY_SPANS = { '1h': 1, '12h': 12, '24h': 24 };
  const DAILY_SPANS = { week: 7, month: 30, year: 365 };
  function rangeSpan(range) {
    if (INTRADAY_SPANS[range] != null) return { tier: 'intraday', span: INTRADAY_SPANS[range] };
    if (DAILY_SPANS[range] != null) return { tier: 'daily', span: DAILY_SPANS[range] };
    if (range === 'all') {
      const daily = (lastData && lastData.historyDaily) || [];
      return { tier: 'daily', span: Math.max(daily.length, 366) };
    }
    return null;
  }

  function seriesForRange(range) {
    if (range === '1h') {
      const fine = lastData.history1h || [];
      const cutoff = Date.now() - 60 * 60 * 1000;
      const points = fine.slice().sort((a, b) => a.t - b.t).filter(s => s.t >= cutoff);
      if (points.length) return points.map(s => ({ t: s.t, value: s.count, tooltip: formatClock(s.t) }));
    }
    if (range === '1h' || range === '12h' || range === '24h') {
      const hours = { '1h': 1, '12h': 12 }[range];
      const cutoff = hours ? Date.now() - hours * 60 * 60 * 1000 : -Infinity;
      return (lastData.history24h || [])
        .slice().sort((a, b) => a.t - b.t)
        .filter(s => s.t >= cutoff)
        .map(s => ({ t: s.t, value: s.count, tooltip: formatClock(s.t) }));
    }
    const daily = lastData.historyDaily || [];
    const byDate = {};
    daily.forEach(d => { byDate[d.date] = d.avgOnline; });
    const DAY = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const nd = new Date(now);
    const todayStart = Date.UTC(nd.getUTCFullYear(), nd.getUTCMonth(), nd.getUTCDate());
    const dayEnd = todayStart + DAY;
    let bucketMs, startTime;
    if (range === 'week') { bucketMs = DAY; startTime = todayStart - 6 * DAY; }
    else if (range === 'month') { bucketMs = DAY; startTime = todayStart - 29 * DAY; }
    else if (range === 'year') { bucketMs = 30 * DAY; startTime = todayStart - 364 * DAY; }
    else {
      const sortedDates = daily.map(d => d.date).sort();
      const earliest = sortedDates.length ? new Date(sortedDates[0] + 'T00:00:00Z').getTime() : todayStart;
      bucketMs = Math.max(DAY, (dayEnd - earliest) / 24);
      startTime = earliest;
    }
    const bucketCount = Math.max(1, Math.ceil((dayEnd - startTime) / bucketMs));
    const points = [];
    for (let i = 0; i < bucketCount; i++) {
      const bucketStart = startTime + i * bucketMs;
      const bucketEnd = bucketStart + bucketMs;
      let sum = 0, count = 0;
      for (let t = bucketStart; t < bucketEnd; t += DAY) {
        const dateKey = new Date(t).toISOString().slice(0, 10);
        if (byDate[dateKey] != null) { sum += byDate[dateKey]; count++; }
      }
      const t = bucketStart + bucketMs / 2;
      points.push({ t, value: count ? sum / count : 0, tooltip: formatDateShort(t) });
    }
    return points;
  }

  function renderTimeChart() {
    const svg = document.getElementById('timeChart');
    const emptyEl = document.getElementById('timeChartEmpty');
    const tooltip = document.getElementById('timeChartTooltip');
    const sublineEl = document.getElementById('timeChartSubline');
    svg.innerHTML = '';
    tooltip.style.display = 'none';

    const points = lastData ? seriesForRange(currentRange) : [];
    if (points.length < 2) {
      emptyEl.style.display = '';
      sublineEl.textContent = '';
      return;
    }
    emptyEl.style.display = 'none';
    const rect0 = svg.getBoundingClientRect();
    const W = Math.max(1, Math.round(rect0.width)), H = Math.max(1, Math.round(rect0.height));
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    const PAD_L = 46, PAD_R = 12, PAD_T = 16, PAD_B = 30;
    const plotW = W - PAD_L - PAD_R, plotH = H - PAD_T - PAD_B;
    const xs = points.map(p => p.t);
    const xMin = Math.min.apply(null, xs), xMax = Math.max.apply(null, xs);
    const yMax = niceCeil(Math.max.apply(null, points.map(p => p.value)) || 1);

    function xPix(t) { return PAD_L + (xMax === xMin ? plotW / 2 : (t - xMin) / (xMax - xMin) * plotW); }
    function yPix(v) { return PAD_T + plotH - (v / yMax) * plotH; }

    const GRID_STEPS = 4;
    for (let i = 0; i <= GRID_STEPS; i++) {
      const v = yMax * i / GRID_STEPS;
      const y = yPix(v);
      svg.appendChild(svgEl('line', { x1: PAD_L, x2: W - PAD_R, y1: y, y2: y, stroke: CHART_BORDER, 'stroke-width': 1 }));
      const label = svgEl('text', { x: PAD_L - 8, y: y + 4, 'text-anchor': 'end', class: 'chart-axis-label' });
      label.textContent = formatNumber(Math.round(v));
      svg.appendChild(label);
    }

    const linePath = points.map((p, i) => (i === 0 ? 'M' : 'L') + xPix(p.t).toFixed(1) + ',' + yPix(p.value).toFixed(1)).join(' ');
    const baseline = yPix(0);
    const areaPath = linePath +
      ' L' + xPix(points[points.length - 1].t).toFixed(1) + ',' + baseline +
      ' L' + xPix(points[0].t).toFixed(1) + ',' + baseline + ' Z';
    const clipRect = svgEl('rect', { x: PAD_L, y: 0, width: plotW, height: H });
    const clipPath = svgEl('clipPath', { id: 'chart-curve-clip' });
    clipPath.appendChild(clipRect);
    const defs = svgEl('defs', {});
    defs.appendChild(clipPath);
    svg.appendChild(defs);
    const curveWindow = svgEl('g', { 'clip-path': 'url(#chart-curve-clip)' });
    const curveGroup = svgEl('g', { class: 'chart-curve' });
    curveGroup.style.transformOrigin = (W - PAD_R) + 'px ' + (H / 2) + 'px';
    curveGroup.appendChild(svgEl('path', { d: areaPath, fill: CHART_ACCENT, opacity: '0.1', stroke: 'none' }));
    curveGroup.appendChild(svgEl('path', { d: linePath, fill: 'none', stroke: CHART_ACCENT, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));

    const first = points[0], last = points[points.length - 1];
    const firstLabel = svgEl('text', { x: xPix(first.t), y: H - 8, 'text-anchor': 'start', class: 'chart-axis-label' });
    firstLabel.textContent = first.tooltip;
    svg.appendChild(firstLabel);
    const lastLabel = svgEl('text', { x: xPix(last.t), y: H - 8, 'text-anchor': 'end', class: 'chart-axis-label' });
    lastLabel.textContent = last.tooltip;
    svg.appendChild(lastLabel);

    curveWindow.appendChild(curveGroup);
    svg.appendChild(curveWindow);
    svg.appendChild(svgEl('circle', { cx: xPix(last.t), cy: yPix(last.value), r: 4, fill: CHART_ACCENT, stroke: '#0d141c', 'stroke-width': 2 }));

    const crosshair = svgEl('line', { x1: 0, x2: 0, y1: PAD_T, y2: H - PAD_B, stroke: CHART_MUTED, 'stroke-width': 1, opacity: 0 });
    svg.appendChild(crosshair);
    const hoverDot = svgEl('circle', { r: 5, fill: CHART_ACCENT, stroke: '#0d141c', 'stroke-width': 2, opacity: 0 });
    svg.appendChild(hoverDot);
    const hitRect = svgEl('rect', { x: PAD_L, y: 0, width: plotW, height: H, fill: 'transparent' });
    svg.appendChild(hitRect);

    const peak = Math.max.apply(null, points.map(p => p.value));
    sublineEl.innerHTML = 'Current: <strong>' + formatNumber(last.value) + '</strong> &nbsp;·&nbsp; Peak in range: <strong>' + formatNumber(peak) + '</strong>';

    function handleMove(evt) {
      const rect = svg.getBoundingClientRect();
      const mouseX = (evt.clientX - rect.left) * (W / rect.width);
      let nearest = points[0], nearestDist = Infinity;
      for (const p of points) {
        const dist = Math.abs(xPix(p.t) - mouseX);
        if (dist < nearestDist) { nearest = p; nearestDist = dist; }
      }
      const px = xPix(nearest.t), py = yPix(nearest.value);
      crosshair.setAttribute('x1', px); crosshair.setAttribute('x2', px); crosshair.setAttribute('opacity', 1);
      hoverDot.setAttribute('cx', px); hoverDot.setAttribute('cy', py); hoverDot.setAttribute('opacity', 1);

      const containerRect = svg.parentElement.getBoundingClientRect();
      const left = (px / W) * rect.width + (rect.left - containerRect.left);
      const top = (py / H) * rect.height + (rect.top - containerRect.top);
      tooltip.style.display = 'block';
      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
      tooltip.textContent = '';
      const valueEl = document.createElement('div');
      valueEl.className = 'chart-tooltip-value';
      valueEl.textContent = formatNumber(nearest.value) + ' online';
      const labelEl = document.createElement('div');
      labelEl.className = 'chart-tooltip-label';
      labelEl.textContent = nearest.tooltip;
      tooltip.appendChild(valueEl);
      tooltip.appendChild(labelEl);
    }
    function handleLeave() {
      crosshair.setAttribute('opacity', 0);
      hoverDot.setAttribute('opacity', 0);
      tooltip.style.display = 'none';
    }
    hitRect.addEventListener('mousemove', handleMove);
    hitRect.addEventListener('mouseleave', handleLeave);
  }

  document.getElementById('rangeSwitch').addEventListener('click', function (e) {
    const btn = e.target.closest('.range-btn');
    if (!btn || btn.classList.contains('active')) return;
    document.querySelectorAll('.range-btn').forEach(b => b.classList.toggle('active', b === btn));

    const oldRange = currentRange, newRange = btn.dataset.range;
    const oldSpan = rangeSpan(oldRange), newSpan = rangeSpan(newRange);
    const sameTier = !!(oldSpan && newSpan && oldSpan.tier === newSpan.tier);
    const ratio = sameTier ? Math.min(4, Math.max(0.25, oldSpan.span / newSpan.span)) : null;
    const oldCurve = document.querySelector('#timeChart .chart-curve');

    currentRange = newRange;

    if (sameTier && ratio > 1 && oldCurve) {
      oldCurve.style.transition = 'none';
      oldCurve.style.transform = 'scaleX(1)';
      void oldCurve.offsetWidth;
      oldCurve.style.transition = '';
      oldCurve.style.transform = 'scaleX(' + ratio + ')';
      oldCurve.addEventListener('transitionend', function onDone() {
        oldCurve.removeEventListener('transitionend', onDone);
        const oldSnapshot = oldCurve.cloneNode(true);
        oldSnapshot.style.pointerEvents = 'none';
        renderTimeChart();
        const newCurve = document.querySelector('#timeChart .chart-curve');
        if (newCurve && newCurve.parentElement) {
          newCurve.parentElement.appendChild(oldSnapshot);
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              oldSnapshot.style.transition = 'opacity 0.3s ease';
              oldSnapshot.style.opacity = '0';
            });
          });
          setTimeout(() => oldSnapshot.remove(), 400);
        }
      });
    } else {
      renderTimeChart();
      const curve = document.querySelector('#timeChart .chart-curve');
      if (curve) {
        const startScale = sameTier ? Math.min(4, Math.max(1.1, 1 / ratio)) : 1.15;
        curve.style.transition = 'none';
        curve.style.transform = 'scaleX(' + startScale + ')';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            curve.style.transition = '';
            curve.style.transform = '';
          });
        });
      }
    }
  });
  const POLL_ICONS = { CRYSTAL: 'icons/crystal.png', MACE: 'icons/mace.png', SMP: 'icons/smp.png', UHC: 'icons/uhc.png' };
  function pollIcon(label) { return POLL_ICONS[String(label || '').toUpperCase()] || null; }
  function renderBarChart(svgId, emptyId, items, iconFn) {
    const svg = document.getElementById(svgId);
    const emptyEl = document.getElementById(emptyId);
    svg.innerHTML = '';
    const W = Math.max(1, Math.round(svg.getBoundingClientRect().width));

    if (!items || !items.length) {
      emptyEl.style.display = '';
      svg.setAttribute('viewBox', '0 0 ' + W + ' 40');
      return;
    }
    emptyEl.style.display = 'none';

    const LABEL_W = 140, VALUE_W = 110, BAR_H = 26, GAP = 14, PAD_TOP = 8;
    const H = items.length * (BAR_H + GAP) + PAD_TOP;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    const total = items.reduce((sum, v) => sum + v.count, 0) || 1;
    const maxCount = Math.max.apply(null, items.map(v => v.count)) || 1;
    const barMaxW = W - LABEL_W - VALUE_W;

    items.forEach((v, i) => {
      const y = PAD_TOP + i * (BAR_H + GAP);
      const barW = Math.max(3, (v.count / maxCount) * barMaxW);
      const pct = Math.round((v.count / total) * 100);

      const iconUrl = iconFn ? iconFn(v.label) : null;
      if (iconUrl) {
        svg.appendChild(svgEl('image', { href: iconUrl, x: 4, y: y + BAR_H / 2 - 10, width: 20, height: 20 }));
      }
      const label = svgEl('text', iconUrl
        ? { x: 32, y: y + BAR_H / 2 + 4, class: 'chart-version-label' }
        : { x: LABEL_W - 10, y: y + BAR_H / 2 + 4, 'text-anchor': 'end', class: 'chart-version-label' });
      label.textContent = v.label;
      svg.appendChild(label);

      svg.appendChild(svgEl('rect', { x: LABEL_W, y, width: barW, height: BAR_H, rx: 4, fill: CHART_ACCENT }));

      const valueLabel = svgEl('text', { x: LABEL_W + barW + 10, y: y + BAR_H / 2 + 4, class: 'chart-axis-label' });
      valueLabel.textContent = formatNumber(v.count) + ' (' + pct + '%)';
      svg.appendChild(valueLabel);
    });
  }
  let chartResizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(chartResizeTimer);
    chartResizeTimer = setTimeout(() => {
      if (!lastData) return;
      renderTimeChart();
      renderBarChart('versionChart', 'versionChartEmpty', lastData.versionBreakdown || []);
      renderBarChart('ratingChart', 'ratingChartEmpty', lastData.ratingBreakdown || []);
      renderBarChart('pollChart', 'pollChartEmpty', lastData.pollBreakdown || [], pollIcon);
    }, 200);
  });

  let refreshTimer = null;
  const AUTO_REFRESH_KEY = 'frostStatisticsAutoRefresh';
  function loadAutoRefreshPref() {
    try { const v = localStorage.getItem(AUTO_REFRESH_KEY); return v === null ? true : v === '1'; } catch (e) { return true; }
  }
  function saveAutoRefreshPref(on) {
    try { localStorage.setItem(AUTO_REFRESH_KEY, on ? '1' : '0'); } catch (e) {}
  }
  let autoRefreshEnabled = loadAutoRefreshPref();

  function updateAutoRefreshUI() {
    document.getElementById('autoRefreshToggle').classList.toggle('on', autoRefreshEnabled);
    document.getElementById('refreshNote').textContent = autoRefreshEnabled
      ? 'Refreshes automatically every 30 seconds.'
      : 'Auto-refresh paused — the player list won’t change until you turn it back on.';
  }

  function startAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = null;
    if (!autoRefreshEnabled) return;
    refreshTimer = setInterval(function () {
      fetchStatistics().then(d => { if (d && d.ok) { renderStats(d); renderSessions(d.sessions || []); saveCache(d); } });
    }, 30000);
  }

  document.getElementById('autoRefreshToggle').addEventListener('click', function () {
    autoRefreshEnabled = !autoRefreshEnabled;
    saveAutoRefreshPref(autoRefreshEnabled);
    updateAutoRefreshUI();
    if (autoRefreshEnabled) {
      fetchStatistics().then(d => { if (d && d.ok) { renderStats(d); renderSessions(d.sessions || []); saveCache(d); } });
    }
    startAutoRefresh();
  });

  function fetchStatistics() {
    const token = loadToken();
    if (!token) return Promise.resolve({ ok: false, error: 'token_expired' });
    return fetch(BRIDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerToken: token })
    }).then(r => r.json());
  }
  const statAnimState = {};
  const COUNT_UP_MS = 700;

  function animateStatNumber(id, toValue, formatFn) {
    const el = document.getElementById(id);
    const fromValue = typeof statAnimState[id] === 'number' ? statAnimState[id] : 0;
    statAnimState[id] = toValue;
    if (fromValue === toValue) { el.textContent = formatFn(toValue); return; }

    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / COUNT_UP_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = formatFn(fromValue + (toValue - fromValue) * eased);
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = formatFn(toValue);
    }
    requestAnimationFrame(tick);
  }

  function renderStats(data) {
    animateStatNumber('statOnline', data.onlineNow || 0, v => formatNumber(Math.round(v)));
    animateStatNumber('statOnlineLite', data.onlineNowLite || 0, v => formatNumber(Math.round(v)));
    animateStatNumber('statLauncher', data.onlineNowLauncher || 0, v => formatNumber(Math.round(v)));
    animateStatNumber('statAvg', data.avgOnline || 0, v => formatNumber(Math.round(v)));
    animateStatNumber('statPeak', data.peakOnline || 0, v => formatNumber(Math.round(v)));
    document.getElementById('statPeakAt').textContent = data.peakOnlineAt ? 'hit ' + formatDateTime(data.peakOnlineAt) : '';
    animateStatNumber('statTotalPlayers', data.totalPlayersSeen || 0, v => formatNumber(Math.round(v)));
    animateStatNumber('statPartners', data.partnerCount || 0, v => formatNumber(Math.round(v)));
    animateStatNumber('statPlaytime', data.totalPlaytimeMs || 0, v => formatDuration(Math.round(v)));
    animateStatNumber('statReviewCount', data.totalReviews || 0, v => formatNumber(Math.round(v)));
    animateStatNumber('statPollVotes', data.totalPollVotes || 0, v => formatNumber(Math.round(v)));
    document.getElementById('statVersion').textContent = data.topVersion || 'n/a';
    if (data.totalReviews) {
      animateStatNumber('statAvgRating', data.avgRating || 0, v => v.toFixed(1) + ' ★');
    } else {
      statAnimState.statAvgRating = null;
      document.getElementById('statAvgRating').textContent = 'n/a';
    }
    if (data.avgFpsBefore != null || data.avgFpsAfter != null) {
      document.getElementById('statAvgFps').textContent =
        (data.avgFpsBefore != null ? formatNumber(data.avgFpsBefore) : '?') + ' → ' +
        (data.avgFpsAfter != null ? formatNumber(data.avgFpsAfter) : '?');
      document.getElementById('statAvgFpsCount').textContent =
        'from ' + formatNumber(data.fpsReviewCount || 0) + ' review' + (data.fpsReviewCount === 1 ? '' : 's');
    } else {
      document.getElementById('statAvgFps').textContent = 'n/a';
      document.getElementById('statAvgFpsCount').textContent = '';
    }
    lastData = data;
    renderTimeChart();
    renderBarChart('versionChart', 'versionChartEmpty', data.versionBreakdown || []);
    renderBarChart('ratingChart', 'ratingChartEmpty', data.ratingBreakdown || []);
    renderBarChart('pollChart', 'pollChartEmpty', data.pollBreakdown || [], pollIcon);
  }

  let lastSessions = [];
  let serverFilter = null;
  let sessionSearch = '';
  let sessionSort = 'name';
  const SORT_DEFAULT_DIR = { name: 'asc', players: 'desc', playtime: 'desc', serverPop: 'desc' };
  let sessionSortDir = SORT_DEFAULT_DIR.name;
  const SOLO_FILTER = '__solo__';

  function serverCounts(sessions) {
    const counts = {};
    sessions.forEach(s => { counts[s.server] = (counts[s.server] || 0) + 1; });
    return counts;
  }
  function serverPopValue(s) {
    return typeof s.serverOnline === 'number' ? s.serverOnline : -1;
  }

  function renderServerFilter(sessions, counts) {
    const el = document.getElementById('serverFilter');
    el.innerHTML = '';
    if (!sessions.length) return;

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const shared = entries.filter(([, count]) => count >= 2);
    const soloCount = entries.filter(([, count]) => count === 1).length;

    if (serverFilter === SOLO_FILTER) {
      if (soloCount === 0) serverFilter = null;
    } else if (serverFilter && !counts[serverFilter]) {
      serverFilter = null;
    }

    const allChip = document.createElement('button');
    allChip.type = 'button';
    allChip.className = 'server-chip' + (serverFilter === null ? ' active' : '');
    allChip.innerHTML = 'All <span class="count">' + sessions.length + '</span>';
    allChip.addEventListener('click', () => { serverFilter = null; renderSessions(lastSessions); });
    el.appendChild(allChip);

    shared.forEach(([server, count]) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'server-chip' + (serverFilter === server ? ' active' : '');
      chip.title = server;
      chip.innerHTML = escapeHtml(server) + ' <span class="count">' + count + '</span>';
      chip.addEventListener('click', () => { serverFilter = server; renderSessions(lastSessions); });
      el.appendChild(chip);
    });

    if (soloCount > 0) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'server-chip' + (serverFilter === SOLO_FILTER ? ' active' : '');
      chip.title = 'Players each on a different server';
      chip.innerHTML = 'Other <span class="count">' + soloCount + '</span>';
      chip.addEventListener('click', () => { serverFilter = SOLO_FILTER; renderSessions(lastSessions); });
      el.appendChild(chip);
    }
  }

  function renderSessions(sessions) {
    lastSessions = sessions;
    const grid = document.getElementById('playerGrid');
    const emptyNote = document.getElementById('emptyNote');
    const countEl = document.getElementById('trackerCount');
    const searchCountEl = document.getElementById('searchResultsCount');
    const oldRects = new Map();
    grid.querySelectorAll('.player-card').forEach(card => {
      oldRects.set(card.dataset.username, card.getBoundingClientRect());
    });
    grid.innerHTML = '';

    const counts = serverCounts(sessions);
    renderServerFilter(sessions, counts);

    if (!sessions.length) {
      emptyNote.style.display = '';
      emptyNote.textContent = 'No online Frost players are currently on a multiplayer server.';
      countEl.textContent = '';
      searchCountEl.textContent = '';
      return;
    }
    emptyNote.style.display = 'none';

    let filtered = sessions;
    let countLabel = 'a server';
    if (serverFilter === SOLO_FILTER) {
      filtered = sessions.filter(s => counts[s.server] === 1);
      countLabel = 'a different server each';
    } else if (serverFilter) {
      filtered = sessions.filter(s => s.server === serverFilter);
      countLabel = serverFilter;
    }
    if (sessionSearch) {
      filtered = filtered.filter(s =>
        s.username.toLowerCase().includes(sessionSearch) ||
        (s.server || '').toLowerCase().includes(sessionSearch)
      );
    }
    searchCountEl.textContent = sessionSearch ? (filtered.length + ' result' + (filtered.length === 1 ? '' : 's')) : '';

    if (!filtered.length) {
      emptyNote.style.display = '';
      emptyNote.textContent = sessionSearch ? 'No players match your search.' : 'No players match this filter.';
      countEl.textContent = '0 online on ' + countLabel;
      return;
    }
    countEl.textContent = filtered.length + ' online on ' + countLabel;

    const now = Date.now();
    const dirSign = sessionSortDir === 'asc' ? 1 : -1;
    let sorted = filtered.slice();
    if (sessionSort === 'players') {
      sorted.sort((a, b) => dirSign * (counts[a.server] - counts[b.server]) || a.username.localeCompare(b.username));
    } else if (sessionSort === 'playtime') {
      sorted.sort((a, b) => dirSign * ((now - (a.serverSince || now)) - (now - (b.serverSince || now))));
    } else if (sessionSort === 'serverPop') {
      sorted.sort((a, b) => dirSign * (serverPopValue(a) - serverPopValue(b)) || a.username.localeCompare(b.username));
    } else {
      sorted.sort((a, b) => dirSign * a.username.localeCompare(b.username));
    }

    const newCards = [];
    sorted.forEach(s => {
      const card = document.createElement('div');
      const isLite = String(s.version || '').endsWith('-lite');
      card.className = 'player-card' + (isLite ? ' is-lite' : '');
      card.dataset.username = s.username;
      const avatarUrl = 'https://mc-heads.net/avatar/' + encodeURIComponent(s.username) + '/80';
      const serverPop = (typeof s.serverOnline === 'number')
        ? s.serverOnline + (typeof s.serverMax === 'number' && s.serverMax > 0 ? ' / ' + s.serverMax : '')
        : '—';
      card.innerHTML =
        '<div class="player-card-top">' +
          '<img class="player-avatar" src="' + avatarUrl + '" alt="" width="48" height="48"/>' +
          '<div class="player-name-col">' +
            '<div class="player-name' + (isLite ? ' is-lite' : '') + '">' + escapeHtml(s.username) + '</div>' +
            (isLite ? '<span class="player-lite-badge">LITE ACTIVE</span>' : '') +
            (s.launcher ? '<span class="player-launcher-badge">LAUNCHER</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="player-row"><span>Server</span><span class="player-row-value"><strong title="' + escapeHtml(s.server) + '">' + escapeHtml(s.server) + '</strong>' +
          '<button type="button" class="copy-btn" data-copy="' + escapeHtml(s.server) + '" title="Copy server address">⧉</button></span></div>' +
        '<div class="player-row"><span>Players on server</span><strong>' + serverPop + '</strong></div>' +
        '<div class="player-row"><span>Version</span><strong>' + escapeHtml(s.version || 'unknown') + '</strong></div>' +
        '<div class="player-row"><span>On this server</span><strong>' + formatDuration(now - (s.serverSince || now)) + '</strong></div>';
      grid.appendChild(card);
      if (!oldRects.has(s.username)) newCards.push(card);
    });
    const moved = [];
    grid.querySelectorAll('.player-card').forEach(card => {
      const old = oldRects.get(card.dataset.username);
      if (!old) return;
      const fresh = card.getBoundingClientRect();
      const dx = old.left - fresh.left, dy = old.top - fresh.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      card.style.transition = 'none';
      card.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      moved.push(card);
    });
    newCards.forEach((card, i) => {
      card.classList.add('player-card-enter');
      card.style.animationDelay = Math.min(i * 30, 300) + 'ms';
    });

    if (moved.length) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          moved.forEach(card => {
            card.style.transition = '';
            card.style.transform = '';
          });
        });
      });
    }
  }

  function updateSortDirBtn() {
    const btn = document.getElementById('sortDirBtn');
    btn.textContent = sessionSortDir === 'asc' ? '↑' : '↓';
    btn.title = sessionSortDir === 'asc' ? 'Ascending - click to reverse' : 'Descending - click to reverse';
  }
  updateSortDirBtn();

  document.getElementById('sessionSort').addEventListener('click', function (e) {
    const btn = e.target.closest('.range-btn');
    if (!btn || btn.classList.contains('active')) return;
    this.querySelectorAll('.range-btn').forEach(b => b.classList.toggle('active', b === btn));
    sessionSort = btn.dataset.sort;
    sessionSortDir = SORT_DEFAULT_DIR[sessionSort];
    updateSortDirBtn();
    renderSessions(lastSessions);
  });

  document.getElementById('sortDirBtn').addEventListener('click', function () {
    sessionSortDir = sessionSortDir === 'asc' ? 'desc' : 'asc';
    updateSortDirBtn();
    renderSessions(lastSessions);
  });

  let searchDebounce = null;
  document.getElementById('playerSearch').addEventListener('input', function () {
    const value = this.value;
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      sessionSearch = value.trim().toLowerCase();
      renderSessions(lastSessions);
    }, 150);
  });

  document.getElementById('playerGrid').addEventListener('click', function (e) {
    const btn = e.target.closest('.copy-btn');
    if (!btn) return;
    const text = btn.dataset.copy || '';
    const done = function () {
      const original = btn.textContent;
      btn.textContent = '✓';
      btn.classList.add('copied');
      setTimeout(function () { btn.textContent = original; btn.classList.remove('copied'); }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () {});
    }
  });

  function applyData(data) {
    if (!data || data.ok !== true) {
      if (data && data.error === 'forbidden') {
        try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
        show(loadToken() ? 'stateDenied' : 'stateLogin');
        return;
      }
      if (data && data.error === 'token_expired') {
        clearToken();
        show('stateLogin');
        return;
      }
      showError('Could not load statistics. Please try again.');
      return;
    }
    if (data.ownerToken) saveToken(data.ownerToken);
    renderStats(data);
    renderSessions(data.sessions || []);
    show('stateData');
    saveCache(data);
    updateAutoRefreshUI();
    startAutoRefresh();
  }

  function startLogin() {
    try { fetch(LITE_API_URL + '?action=statisticsConfig', { cache: 'no-store', keepalive: true }); } catch (e) {}
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
      + '&redirect_uri=' + encodeURIComponent(DISCORD_REDIRECT_URI_STATISTICS)
      + '&scope=' + encodeURIComponent('identify')
      + '&state=' + csrfState;
    window.location.href = url;
  }
  document.getElementById('loginBtn').addEventListener('click', startLogin);
  document.getElementById('switchAccountBtn').addEventListener('click', () => { clearToken(); show('stateLogin'); });
  document.getElementById('retryBtn').addEventListener('click', () => { show('stateLogin'); });
  document.getElementById('navLogoutBtn').addEventListener('click', () => {
    if (refreshTimer) clearInterval(refreshTimer);
    clearToken();
    show('stateLogin');
  });

  (function init() {
    const params = new URLSearchParams(window.location.search);

    if (params.has('code')) {
      show('stateWorking');
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
        showError('Sign-in session mismatch. Please try again.');
        return;
      }
      fetch(LITE_API_URL + '?action=statisticsAuth&code=' + encodeURIComponent(code), { cache: 'no-store' })
        .then(r => r.json())
        .then(applyData)
        .catch(() => showError('Network error while contacting the server. Please try again.'));
      return;
    }

    if (params.has('error')) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('error');
      cleanUrl.searchParams.delete('error_description');
      cleanUrl.searchParams.delete('state');
      window.history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
      show('stateLogin');
      return;
    }

    if (!loadToken()) { show('stateLogin'); return; }

    const cached = loadCache();
    if (cached) {
      renderStats(cached);
      renderSessions(cached.sessions || []);
      show('stateData');
    } else {
      show('stateLoading');
    }
    fetchStatistics()
      .then(applyData)
      .catch(() => { if (!cached) showError('Network error while contacting the server. Please try again.'); });
  })();
})();
