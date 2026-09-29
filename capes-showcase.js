(function () {
  const CAPES_BASE = 'https://bot.frostclient.eu/launcher/capes/';
  const CAPES_JSON_URL = CAPES_BASE + 'capes.json';
  const STORE_URL = 'https://store.frostclient.eu/';
  const SHOW_COUNT = 6;
  const grid = document.getElementById('capesShowcaseGrid');
  if (!grid) return;
  const section = grid.closest('section');

  function releaseTime(cape) {
    const t = cape.store && cape.store.releaseDate ? new Date(cape.store.releaseDate).getTime() : NaN;
    return isNaN(t) ? 0 : t;
  }

  function limitedExpired(cape) {
    const until = cape.store && cape.store.limitedUntil ? new Date(cape.store.limitedUntil).getTime() : NaN;
    return !isNaN(until) && until <= Date.now();
  }

  function pickCapes(list) {
    return list.filter(function (cape) {
      return cape && cape.store && cape.file && cape.mature !== true && !limitedExpired(cape);
    }).sort(function (a, b) {
      return releaseTime(b) - releaseTime(a);
    }).slice(0, SHOW_COUNT);
  }

  function fileUrl(file) {
    return CAPES_BASE + file.split('/').map(encodeURIComponent).join('/');
  }

  const previews = [];

  function buildCard(cape) {
    const card = document.createElement('a');
    card.className = 'capes-showcase-card';
    card.href = STORE_URL + 'cape?id=' + encodeURIComponent(cape.id);
    card.rel = 'noopener';
    const wrap = document.createElement('div');
    wrap.className = 'capes-showcase-preview';
    const flat = document.createElement('div');
    flat.className = 'capes-showcase-flat';
    flat.style.backgroundImage = 'url("' + fileUrl(cape.file) + '")';
    wrap.appendChild(flat);
    card.appendChild(wrap);
    const meta = document.createElement('div');
    meta.className = 'capes-showcase-meta';
    const name = document.createElement('span');
    name.className = 'capes-showcase-name';
    name.textContent = cape.name || cape.id;
    meta.appendChild(name);
    card.appendChild(meta);
    previews.push({ cape: cape, wrap: wrap, flat: flat });
    return card;
  }

  let viewer = null;
  function getViewer() {
    if (viewer || typeof skinview3d === 'undefined') return viewer;
    try {
      viewer = new skinview3d.SkinViewer({ canvas: document.createElement('canvas'), width: 300, height: 392, renderPaused: true, preserveDrawingBuffer: true });
      viewer.controls.enabled = false;
      viewer.autoRotate = false;
      viewer.playerObject.rotation.y = Math.PI + 0.5;
      viewer.playerObject.skin.visible = false;
      viewer.controls.target.set(0, -0.5, 0);
      viewer.camera.position.set(0, 9, 24);
      viewer.camera.lookAt(0, -0.5, 0);
    } catch (err) {
      viewer = null;
    }
    return viewer;
  }

  function render3d() {
    const v = getViewer();
    if (!v) return;
    let queue = Promise.resolve();
    previews.forEach(function (item) {
      queue = queue.then(function () {
        return fetch(fileUrl(item.cape.file), { cache: 'force-cache' }).then(function (r) {
          if (!r.ok) throw new Error('http_' + r.status);
          return r.blob();
        }).then(function (blob) {
          const url = URL.createObjectURL(blob);
          return v.loadCape(url).then(function () {
            URL.revokeObjectURL(url);
            v.playerObject.skin.visible = false;
            v.playerObject.cape.visible = true;
            v.controls.update();
            v.render();
            const img = document.createElement('img');
            img.className = 'capes-showcase-img';
            img.alt = item.cape.name || '';
            img.src = v.canvas.toDataURL('image/png');
            item.wrap.replaceChild(img, item.flat);
          });
        }).catch(function () {});
      });
    });
  }

  function loadViewerScript() {
    if (typeof skinview3d !== 'undefined') {
      render3d();
      return;
    }
    const script = document.createElement('script');
    script.src = 'skinview3d.js';
    script.onload = render3d;
    document.body.appendChild(script);
  }

  fetch(CAPES_JSON_URL, { cache: 'no-cache' }).then(function (r) {
    if (!r.ok) throw new Error('http_' + r.status);
    return r.json();
  }).then(function (data) {
    const capes = pickCapes(Array.isArray(data) ? data : []);
    if (!capes.length) {
      section.hidden = true;
      return;
    }
    capes.forEach(function (cape) {
      grid.appendChild(buildCard(cape));
    });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) {
          io.disconnect();
          loadViewerScript();
        }
      }, { rootMargin: '400px 0px' });
      io.observe(section);
    } else {
      loadViewerScript();
    }
  }).catch(function () {
    section.hidden = true;
  });
})();
