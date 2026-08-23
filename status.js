(function () {
  const STATUS_META = {
    operational: { label: 'Operational', color: 'green', severity: 0 },
    updating: { label: 'Updating', color: 'amber', severity: 1 },
    maintenance: { label: 'Under Maintenance', color: 'amber', severity: 1 },
    degraded: { label: 'Degraded Performance', color: 'amber', severity: 2 },
    outage: { label: 'Outage', color: 'red', severity: 3 }
  };

  function metaFor(status) {
    return STATUS_META[status] || STATUS_META.operational;
  }

  function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }

  function renderService(svc) {
    const meta = metaFor(svc.status);
    const row = document.createElement('div');
    row.className = 'status-row';

    const main = document.createElement('div');
    main.className = 'status-row-main';

    const name = document.createElement('span');
    name.className = 'status-name';
    const dot = document.createElement('span');
    dot.className = 'status-dot status-' + meta.color;
    name.appendChild(dot);
    name.appendChild(document.createTextNode(svc.name || ''));

    const pill = document.createElement('span');
    pill.className = 'status-pill status-pill-' + meta.color;
    pill.textContent = meta.label;

    main.appendChild(name);
    main.appendChild(pill);
    row.appendChild(main);

    if (svc.note) {
      const note = document.createElement('div');
      note.className = 'status-note';
      note.textContent = svc.note;
      row.appendChild(note);
    }
    return row;
  }

  function render(data) {
    const list = document.getElementById('statusList');
    list.innerHTML = '';
    const services = Array.isArray(data.services) ? data.services : [];
    services.forEach(svc => list.appendChild(renderService(svc)));

    let worst = STATUS_META.operational;
    services.forEach(svc => {
      const meta = metaFor(svc.status);
      if (meta.severity > worst.severity) worst = meta;
    });

    const banner = document.getElementById('statusBanner');
    const bannerText = document.getElementById('statusBannerText');
    banner.className = 'status-banner' + (worst.color !== 'green' ? ' status-banner-' + worst.color : '');
    bannerText.textContent = worst.severity === 0
      ? 'All systems operational'
      : (worst.severity === 3 ? 'Some systems are experiencing an outage' : 'Some systems are experiencing issues');

    document.getElementById('lastUpdated').textContent = data.updatedAt ? ('Last updated: ' + formatTime(data.updatedAt)) : '';
  }

  fetch('status-data.json?t=' + Date.now(), { cache: 'no-store' })
    .then(r => r.json())
    .then(render)
    .catch(() => {
      document.getElementById('lastUpdated').textContent = '';
      document.getElementById('statusList').innerHTML = '<p style="color:var(--muted);font-size:14px;">Could not load status data. Please try again shortly.</p>';
    });
})();

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
