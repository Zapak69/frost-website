(function () {
  const API = 'https://bot.frostclient.eu/site/partners';
  const SHOW_COUNT = 10;
  const PRIMARY_LINK = { creator: ['youtube', 'tiktok', 'twitch', 'kick', 'x', 'instagram', 'website', 'discord'], server: ['website', 'discord', 'store'] };
  const row = document.getElementById('partnersShowcaseRow');
  if (!row) return;
  const section = row.closest('section');

  function primaryLink(p) {
    const keys = PRIMARY_LINK[p.type] || PRIMARY_LINK.creator;
    for (const k of keys) {
      if (p.links && typeof p.links[k] === 'string' && /^https:\/\//.test(p.links[k])) return p.links[k];
    }
    return 'https://frostclient.eu/partners' + (p.type === 'server' ? '?type=server' : '');
  }

  function buildItem(p) {
    const a = document.createElement('a');
    a.className = 'partners-showcase-item';
    a.dataset.type = p.type;
    a.href = primaryLink(p);
    if (a.href.indexOf('https://frostclient.eu/') !== 0) {
      a.target = '_blank';
      a.rel = 'noopener nofollow';
    }
    const fallback = document.createElement('div');
    fallback.className = 'partners-showcase-avatar';
    fallback.textContent = (p.name || '?').charAt(0).toUpperCase();
    if (p.image) {
      const img = document.createElement('img');
      img.className = 'partners-showcase-avatar';
      img.src = p.image;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', () => img.replaceWith(fallback), { once: true });
      a.appendChild(img);
    } else a.appendChild(fallback);
    const text = document.createElement('span');
    text.className = 'partners-showcase-text';
    const name = document.createElement('span');
    name.className = 'partners-showcase-name';
    name.textContent = p.name;
    const type = document.createElement('span');
    type.className = 'partners-showcase-type';
    type.textContent = p.type === 'server' ? (p.serverIp || 'Server') : 'Creator';
    text.append(name, type);
    a.appendChild(text);
    return a;
  }

  fetch(API).then(r => r.json()).then(data => {
    const list = (data && Array.isArray(data.partners) ? data.partners : []).filter(p => p && p.name && p.featured).slice(0, SHOW_COUNT);
    if (!list.length) return;
    list.forEach(p => row.appendChild(buildItem(p)));
    section.hidden = false;
    window.dispatchEvent(new Event('scroll'));
  }).catch(() => {});
})();
