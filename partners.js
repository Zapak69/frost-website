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
  const API = 'https://bot.frostclient.eu/site/partners';
  const LINK_ORDER = ['youtube', 'tiktok', 'twitch', 'kick', 'x', 'instagram', 'discord', 'website', 'store'];
  const LINK_LABELS = { website: 'Website', discord: 'Discord', youtube: 'YouTube', twitch: 'Twitch', tiktok: 'TikTok', kick: 'Kick', x: 'X', instagram: 'Instagram', store: 'Store' };
  const ICON_ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>';
  const ICON_COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const ICON_CREATOR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>';
  const ICON_SERVER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/><path d="M6 7h.01M6 17h.01"/></svg>';
  const grid = document.getElementById('partnersGrid');
  const empty = document.getElementById('partnersEmpty');
  const filterBtns = Array.from(document.querySelectorAll('.partners-filter-btn'));
  let filter = 'all';
  let toastTimer = null;

  function toast(text) {
    let el = document.querySelector('.partners-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'partners-toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  function avatar(p) {
    const fallback = document.createElement('div');
    fallback.className = 'partner-avatar';
    fallback.textContent = (p.name || '?').charAt(0).toUpperCase();
    if (!p.image) return fallback;
    const img = document.createElement('img');
    img.className = 'partner-avatar';
    img.src = p.image;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', () => img.replaceWith(fallback), { once: true });
    return img;
  }

  function buildCard(p) {
    const card = document.createElement('article');
    card.className = 'partner-card';
    card.dataset.type = p.type;
    const top = document.createElement('div');
    top.className = 'partner-card-top';
    top.appendChild(avatar(p));
    const titles = document.createElement('div');
    const name = document.createElement('h2');
    name.className = 'partner-name';
    name.textContent = p.name;
    const type = document.createElement('div');
    type.className = 'partner-type';
    type.innerHTML = p.type === 'server' ? ICON_SERVER + 'Server' : ICON_CREATOR + 'Creator';
    titles.append(name, type);
    top.appendChild(titles);
    card.appendChild(top);
    if (p.description) {
      const desc = document.createElement('p');
      desc.className = 'partner-desc';
      desc.textContent = p.description;
      card.appendChild(desc);
    }
    if (p.type === 'server' && p.serverIp) {
      const ip = document.createElement('button');
      ip.type = 'button';
      ip.className = 'partner-ip';
      ip.setAttribute('aria-label', 'Copy server address ' + p.serverIp);
      const value = document.createElement('span');
      value.className = 'partner-ip-value';
      value.textContent = p.serverIp;
      const action = document.createElement('span');
      action.className = 'partner-ip-action';
      action.innerHTML = ICON_COPY + 'Copy IP';
      ip.append(value, action);
      ip.addEventListener('click', () => {
        const done = () => toast('Copied ' + p.serverIp);
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(p.serverIp).then(done, () => toast('Copy failed, select the address manually'));
        else toast('Copy failed, select the address manually');
      });
      card.appendChild(ip);
    }
    const keys = LINK_ORDER.filter(k => p.links && typeof p.links[k] === 'string' && /^https:\/\//.test(p.links[k]));
    if (keys.length) {
      const links = document.createElement('div');
      links.className = 'partner-links';
      keys.forEach(k => {
        const a = document.createElement('a');
        a.className = 'partner-link';
        a.href = p.links[k];
        a.target = '_blank';
        a.rel = 'noopener nofollow';
        a.innerHTML = ICON_ARROW;
        a.prepend(document.createTextNode(LINK_LABELS[k]));
        links.appendChild(a);
      });
      card.appendChild(links);
    }
    return card;
  }

  function applyFilter() {
    let shown = 0;
    grid.querySelectorAll('.partner-card').forEach(card => {
      const visible = filter === 'all' || card.dataset.type === filter;
      card.hidden = !visible;
      if (visible) shown++;
    });
    empty.hidden = shown > 0;
    if (!shown) empty.textContent = filter === 'server' ? 'No partner servers yet.' : filter === 'creator' ? 'No partner creators yet.' : 'No partners yet. Check back soon.';
  }

  filterBtns.forEach(btn => btn.addEventListener('click', () => {
    filter = btn.dataset.filter;
    filterBtns.forEach(b => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-selected', String(b === btn));
    });
    applyFilter();
  }));

  fetch(API).then(r => r.json()).then(data => {
    const list = (data && Array.isArray(data.partners) ? data.partners : []).filter(p => p && p.name);
    grid.innerHTML = '';
    list.forEach(p => grid.appendChild(buildCard(p)));
    const counts = { all: list.length, creator: list.filter(p => p.type === 'creator').length, server: list.filter(p => p.type === 'server').length };
    document.querySelectorAll('.partners-count').forEach(el => {
        el.textContent = counts[el.dataset.count] || '';
    });
    const requested = new URLSearchParams(location.search).get('type');
    const btn = filterBtns.find(b => b.dataset.filter === requested);
    if (btn) btn.click();
    else applyFilter();
  }).catch(() => {
    grid.innerHTML = '';
    empty.hidden = false;
    empty.textContent = 'Partners could not be loaded right now. Refresh the page in a moment.';
  });
})();
