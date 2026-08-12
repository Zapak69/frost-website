(function () {
  const params = new URLSearchParams(window.location.search);
  let target = null;

  for (const key of params.keys()) {
    const el = document.getElementById(key);
    if (el) { target = el; break; }
  }
  if (!target) return;

  if (target.tagName === 'DETAILS') target.open = true;

  target.classList.add('faq-highlight');
  setTimeout(() => target.classList.remove('faq-highlight'), 1800);

  setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
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
