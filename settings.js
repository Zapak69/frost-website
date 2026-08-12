(function () {
  const copyBtn = document.getElementById('copyPathBtn');
  const pathEl = document.getElementById('pathText');
  copyBtn.addEventListener('click', () => {
    const text = pathEl.textContent.trim();
    navigator.clipboard.writeText(text).then(() => {
      const original = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('copied');
      setTimeout(() => { copyBtn.textContent = original; copyBtn.classList.remove('copied'); }, 1500);
    });
  });

  const params = new URLSearchParams(window.location.search);
  let target = null;
  for (const key of params.keys()) {
    const el = document.getElementById(key);
    if (el) { target = el; break; }
  }
  if (!target) return;
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
