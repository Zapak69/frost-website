(function () {
  const tabs = document.querySelectorAll('.install-tab');
  const panels = document.querySelectorAll('.install-panel');
  if (!tabs.length) return;
  function showInstallTab(name) {
    tabs.forEach(tab => {
      const active = tab.dataset.installTab === name;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    panels.forEach(panel => { panel.hidden = panel.dataset.installPanel !== name; });
  }
  tabs.forEach(tab => tab.addEventListener('click', () => showInstallTab(tab.dataset.installTab)));
  window.frostShowInstallTab = showInstallTab;
})();

(function () {
  const params = new URLSearchParams(window.location.search);
  if (params.has('cracked')) {
    window.location.replace('cracked');
    return;
  }
  let target = null;

  for (const key of params.keys()) {
    const el = document.getElementById(key);
    if (el) { target = el; break; }
  }
  if (!target) return;

  if (target.tagName === 'DETAILS') target.open = true;
  const tabPanel = target.closest('.install-panel');
  if (tabPanel && window.frostShowInstallTab) window.frostShowInstallTab(tabPanel.dataset.installPanel);
  if (target.classList.contains('install-tab') && window.frostShowInstallTab) window.frostShowInstallTab(target.dataset.installTab);

  target.classList.add('faq-highlight');
  setTimeout(() => target.classList.remove('faq-highlight'), 1800);

  setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
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
