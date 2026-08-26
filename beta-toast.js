(function () {
  if (/(^|\/)beta(\.html)?\/?$/.test(location.pathname)) return;
  const style = document.createElement('style');
  style.textContent = [
    '.beta-toast {',
    '  position: fixed; z-index: 150;',
    '  left: 24px; bottom: 24px; max-width: 340px;',
    '  background: #2c2c2e;',
    '  border: 1px solid rgba(255,105,97,0.4); border-radius: 20px;',
    '  padding: 18px 20px;',
    '  display: flex; align-items: flex-start; gap: 12px;',
    '  box-shadow: 0 20px 60px -12px rgba(0,0,0,0.6), 0 0 24px rgba(255,105,97,0.08);',
    '  transform: translateX(-130%); opacity: 0; pointer-events: none;',
    '  transition: transform 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.25s ease, bottom 0.3s ease;',
    '}',
    '.beta-toast.show { transform: translateX(0); opacity: 1; pointer-events: auto; }',
    '.beta-toast-body { display: flex; flex-direction: column; gap: 10px; }',
    '.beta-toast-text { font-size: 13.5px; color: #f5f5f7; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Space Grotesk", sans-serif; }',
    '.beta-toast-text strong { color: #ff6961; }',
    '.beta-toast-cta {',
    '  display: inline-flex; align-items: center; align-self: flex-start; gap: 6px;',
    '  font-size: 13px; font-weight: 700; color: #fff; text-decoration: none;',
    '  background: #d9453c; padding: 8px 16px; border-radius: 980px;',
    '  transition: filter 0.2s;',
    '  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Space Grotesk", sans-serif;',
    '}',
    '.beta-toast-cta:hover { filter: brightness(1.1); }',
    '@media(max-width:600px){ .beta-toast { left: 16px; right: 16px; max-width: none; } }'
  ].join('\n');
  document.head.appendChild(style);

  const toast = document.createElement('div');
  toast.className = 'beta-toast';
  toast.id = 'betaToast';
  toast.innerHTML =
    '<div class="beta-toast-body">' +
      '<div class="beta-toast-text"><strong>FrostClient is in BETA</strong> — bugs can happen while we build the new era.</div>' +
      '<a href="https://frostclient.eu/beta" class="beta-toast-cta">Read the full statement →</a>' +
    '</div>';
  document.body.appendChild(toast);

  function reposition() {
    let bottom = 24;
    ['promoToast', 'pollToast'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.classList.contains('show')) bottom += el.getBoundingClientRect().height + 16;
    });
    toast.style.bottom = bottom + 'px';
  }
  setTimeout(() => { reposition(); toast.classList.add('show'); }, 1200);
  ['promoToastClose', 'pollToastCta'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => setTimeout(reposition, 350));
  });
  window.addEventListener('resize', reposition);
})();
