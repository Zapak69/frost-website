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
  const SUMS_URL = 'https://bot.frostclient.eu/public_dl/SHA256SUMS';
  const rows = Array.prototype.slice.call(document.querySelectorAll('.checksum-hash[data-file]'));
  const status = document.getElementById('checksumStatus');
  if (!rows.length || !status || typeof fetch !== 'function') return;
  const scanned = ((document.getElementById('scanHash') || {}).textContent || '').trim().toLowerCase();
  let controller = null;
  try { controller = new AbortController(); } catch (e) {}
  const timer = controller ? setTimeout(function () { controller.abort(); }, 8000) : null;
  fetch(SUMS_URL, { cache: 'no-store', signal: controller ? controller.signal : undefined })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    })
    .then(function (text) {
      const sums = {};
      text.split(/\r?\n/).forEach(function (line) {
        const m = /^([a-fA-F0-9]{64})\s+\*?(.+?)\s*$/.exec(line);
        if (m) sums[m[2]] = m[1].toLowerCase();
      });
      let found = 0;
      rows.forEach(function (el) {
        const hash = sums[el.dataset.file];
        if (hash) { el.textContent = hash; found++; }
      });
      if (!found) throw new Error('empty');
      const win = sums['Frost-Launcher-win.exe'];
      if (win && scanned && win !== scanned) {
        status.classList.add('is-warning');
        status.textContent = 'The Windows build we serve right now is newer than the scan summary above. ';
        const link = document.createElement('a');
        link.href = 'https://www.virustotal.com/gui/file/' + win;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = 'Open its VirusTotal report';
        status.appendChild(link);
        status.appendChild(document.createTextNode('.'));
      } else {
        status.textContent = 'Live values, computed from the files on our download server.';
      }
    })
    .catch(function () {
      status.textContent = "Showing the hashes from our latest release - the live list couldn't be loaded right now.";
    })
    .then(function () {
      if (timer) clearTimeout(timer);
    });
})();
