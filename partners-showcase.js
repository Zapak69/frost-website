(function () {
  const API = 'https://bot.frostclient.eu/site/partners';
  const SHOW_COUNT = 9;
  const LINK_ORDER = ['youtube', 'tiktok', 'twitch', 'kick', 'x', 'instagram', 'discord', 'website', 'store'];
  const LINK_LABELS = { website: 'Website', discord: 'Discord', youtube: 'YouTube', twitch: 'Twitch', tiktok: 'TikTok', kick: 'Kick', x: 'X', instagram: 'Instagram', store: 'Store' };
  const PRIMARY_LINK = { creator: ['youtube', 'tiktok', 'twitch', 'kick', 'x', 'instagram', 'website', 'discord'], server: ['website', 'discord', 'store'] };
  const ICON_CREATOR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>';
  const ICON_SERVER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/><path d="M6 7h.01M6 17h.01"/></svg>';
  const row = document.getElementById('partnersShowcaseRow');
  if (!row) return;
  const section = row.closest('section');

  function validLinks(p) {
    return LINK_ORDER.filter(k => p.links && typeof p.links[k] === 'string' && /^https:\/\//.test(p.links[k]));
  }

  function primaryLink(p) {
    for (const k of PRIMARY_LINK[p.type] || PRIMARY_LINK.creator) {
      if (p.links && typeof p.links[k] === 'string' && /^https:\/\//.test(p.links[k])) return p.links[k];
    }
    return 'https://frostclient.eu/partners' + (p.type === 'server' ? '?type=server' : '');
  }

  function externalize(a) {
    if (a.href.indexOf('https://frostclient.eu/') !== 0) {
      a.target = '_blank';
      a.rel = 'noopener nofollow';
    }
  }

  function buildItem(p) {
    const card = document.createElement('article');
    card.className = 'partners-showcase-item';
    card.dataset.type = p.type;
    const top = document.createElement('a');
    top.className = 'partners-showcase-top';
    top.href = primaryLink(p);
    externalize(top);
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
      top.appendChild(img);
    } else top.appendChild(fallback);
    const text = document.createElement('span');
    text.className = 'partners-showcase-text';
    const name = document.createElement('span');
    name.className = 'partners-showcase-name';
    name.textContent = p.name;
    const type = document.createElement('span');
    type.className = 'partners-showcase-type';
    type.innerHTML = p.type === 'server' ? ICON_SERVER + 'Partner server' : ICON_CREATOR + 'Creator';
    text.append(name, type);
    top.appendChild(text);
    card.appendChild(top);
    if (p.description) {
      const desc = document.createElement('p');
      desc.className = 'partners-showcase-desc';
      desc.textContent = p.description;
      card.appendChild(desc);
    }
    if (p.type === 'server' && p.serverIp) {
      const ip = document.createElement('button');
      ip.type = 'button';
      ip.className = 'partners-showcase-ip';
      ip.setAttribute('aria-label', 'Copy server address ' + p.serverIp);
      const value = document.createElement('span');
      value.className = 'partners-showcase-ip-value';
      value.textContent = p.serverIp;
      const action = document.createElement('span');
      action.className = 'partners-showcase-ip-action';
      action.textContent = 'Copy IP';
      ip.append(value, action);
      ip.addEventListener('click', () => {
        const done = ok => {
          action.textContent = ok ? 'Copied' : 'Copy failed';
          setTimeout(() => { action.textContent = 'Copy IP'; }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(p.serverIp).then(() => done(true), () => done(false));
        else done(false);
      });
      card.appendChild(ip);
    }
    const keys = validLinks(p).slice(0, 4);
    if (keys.length) {
      const links = document.createElement('div');
      links.className = 'partners-showcase-links';
      keys.forEach(k => {
        const a = document.createElement('a');
        a.className = 'partners-showcase-link';
        a.href = p.links[k];
        a.target = '_blank';
        a.rel = 'noopener nofollow';
        a.textContent = LINK_LABELS[k];
        links.appendChild(a);
      });
      card.appendChild(links);
    }
    return card;
  }

  fetch(API).then(r => r.json()).then(data => {
    const list = (data && Array.isArray(data.partners) ? data.partners : []).filter(p => p && p.name && p.featured).slice(0, SHOW_COUNT);
    if (!list.length) return;
    list.forEach(p => row.appendChild(buildItem(p)));
    section.hidden = false;
    window.dispatchEvent(new Event('scroll'));
  }).catch(() => {});
})();
