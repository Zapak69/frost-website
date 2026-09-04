(() => {
  const BOT_BASE = 'https://bot.frostclient.eu';
  const params = new URLSearchParams(location.search);
  const code = (params.get('c') || location.hash.slice(1) || '').trim().toUpperCase();
  const states = { loading: document.getElementById('stateLoading'), error: document.getElementById('stateError'), ready: document.getElementById('stateReady') };

  function show(name) {
    Object.keys(states).forEach(key => states[key].classList.toggle('active', key === name));
  }

  function showError(title, text) {
    document.getElementById('errorTitle').textContent = title;
    document.getElementById('errorText').textContent = text;
    show('error');
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function stat(value, label, sub) {
    const box = el('div', 'stat');
    box.appendChild(el('div', 'stat-value', String(value)));
    box.appendChild(el('div', 'stat-label', label));
    box.appendChild(el('div', 'stat-sub', sub));
    return box;
  }

  function listBlock(title, items) {
    if (!items.length) return null;
    const details = el('details');
    const summary = el('summary');
    summary.appendChild(el('span', null, title + ' (' + items.length + ')'));
    details.appendChild(summary);
    const ul = el('ul');
    items.forEach(item => {
      const li = el('li', item.modrinth || item.pack ? '' : 'missing');
      li.appendChild(el('span', null, item.name || item.file));
      li.appendChild(el('span', null, item.modrinth ? 'Modrinth' : (item.pack ? 'Frost pack' : 'manual')));
      ul.appendChild(li);
    });
    details.appendChild(ul);
    return details;
  }

  function render(data) {
    const share = data.share;
    const inst = share.instance || {};
    document.getElementById('instName').textContent = inst.name || 'Shared instance';
    document.getElementById('instVersion').textContent = [inst.minecraftVersion, inst.renderer].filter(Boolean).join(' ');
    document.getElementById('instCreator').textContent = 'Shared by ' + ((share.creator && share.creator.name) || 'a Frost user');
    document.getElementById('instExpiry').textContent = share.expiresAt ? 'Expires ' + new Date(share.expiresAt).toLocaleDateString() : '';
    const mods = share.mods || [];
    const packs = share.resourcepacks || [];
    const shaders = share.shaderpacks || [];
    const onModrinth = list => list.filter(i => i.modrinth).length;
    const stats = document.getElementById('stats');
    stats.appendChild(stat(mods.length, 'Mods', onModrinth(mods) + ' on Modrinth'));
    stats.appendChild(stat(packs.length, 'Resource packs', onModrinth(packs) + ' on Modrinth'));
    stats.appendChild(stat(shaders.length, 'Shaders', share.activeShader && share.activeShader !== 'OFF' ? 'Active: ' + share.activeShader.replace(/\.zip$/i, '') : 'None active'));
    stats.appendChild(stat(share.config && share.config.included ? 'Yes' : 'No', 'Config', share.config && share.config.included ? Math.max(1, Math.round((share.config.size || 0) / 1024)) + ' KB' : 'Not included'));
    const lists = document.getElementById('lists');
    [listBlock('Mods', mods), listBlock('Resource packs', packs), listBlock('Shaders', shaders)].filter(Boolean).forEach(node => lists.appendChild(node));
    const unresolved = [...mods, ...packs, ...shaders].filter(i => !i.modrinth && !i.pack);
    if (unresolved.length) {
      const chips = document.getElementById('unresolvedChips');
      unresolved.forEach(i => chips.appendChild(el('span', 'chip', i.name || i.file)));
      document.getElementById('unresolved').hidden = false;
    }
    document.getElementById('openBtn').href = 'frostclient://share/' + share.code;
    document.getElementById('codeText').textContent = share.code;
    document.title = (inst.name || 'Shared instance') + ' | Frost Client';
    show('ready');
  }

  document.getElementById('copyBtn').addEventListener('click', () => {
    const text = document.getElementById('codeText').textContent;
    const done = () => {
      const btn = document.getElementById('copyBtn');
      btn.classList.add('copied');
      const label = btn.childNodes[2];
      const original = label.textContent;
      label.textContent = ' Copied ';
      setTimeout(() => { label.textContent = original; btn.classList.remove('copied'); }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(() => {});
  });

  if (!/^[A-Z0-9]{6,16}$/.test(code)) {
    showError('No share code', 'This page needs a share code, for example frostclient.eu/share/?c=ABCD2345.');
    return;
  }
  fetch(BOT_BASE + '/share/' + code).then(async res => {
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!data || !data.ok) {
      if (data && data.error === 'expired') showError('Share expired', 'This share link is older than 30 days. Ask the creator to share the instance again.');
      else showError('Share not found', 'This share code does not exist. Check the link and try again.');
      return;
    }
    render(data);
  }).catch(() => showError('Could not load share', 'The Frost server did not respond. Please try again in a moment.'));
})();
