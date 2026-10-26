/* Theme switching, screenshot lightbox and lazy start of the 3D bulb. */
(function () {
  const root = document.documentElement;
  const SCRIPT = document.currentScript;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- theme ---------- */
  const listeners = [];
  const theme = {
    get: () => (root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'),
    set(next) {
      if (next === theme.get()) return;
      const apply = () => {
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) {}
        syncMeta();
        listeners.forEach((fn) => fn(next));
      };
      if (window.sfx) window.sfx.switchClick(next === 'dark');
      // crossfade via View Transitions (opacity only, see site.css); instant switch elsewhere
      if (!document.startViewTransition || reduceMotion) { apply(); return; }
      document.startViewTransition(apply);
    },
    toggle() { theme.set(theme.get() === 'dark' ? 'light' : 'dark'); },
    onChange(fn) { listeners.push(fn); }
  };
  window.theme = theme;

  function syncMeta() {
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
  }
  syncMeta();

  /* ---------- bulb button: keyboard + no-WebGL fallback ---------- */
  const bulb = document.getElementById('bulb');
  const bulbBtn = bulb && bulb.querySelector('.bulb-toggle');
  function syncBulbLabel() {
    if (!bulbBtn) return;
    const on = theme.get() === 'dark';
    bulbBtn.setAttribute('aria-pressed', String(on));
    bulbBtn.setAttribute('aria-label', bulbBtn.dataset[on ? 'labelOn' : 'labelOff']);
  }
  if (bulbBtn) {
    syncBulbLabel();
    theme.onChange(syncBulbLabel);
    bulbBtn.addEventListener('click', (e) => {
      // with the 3D bulb running, pointer taps are handled in bulb.js; only keyboard clicks (detail 0) land here
      if (bulb.classList.contains('is-ready') && e.detail !== 0) return;
      theme.toggle();
      window.dispatchEvent(new CustomEvent('bulb:nudge'));
    });
  }

  /* load three.js + the bulb after the page itself is ready */
  function startBulb() {
    if (!bulb) return;
    import(new URL('bulb.js', SCRIPT.src).href).catch(() => bulb.classList.add('is-fallback'));
    setTimeout(() => { if (!bulb.classList.contains('is-ready')) bulb.classList.add('is-fallback'); }, 6000);
  }
  if (document.readyState === 'complete') startBulb();
  else window.addEventListener('load', startBulb);

  /* ---------- lightbox for work screenshots ---------- */
  const lb = document.getElementById('lightbox');
  if (lb && typeof lb.showModal === 'function') {
    const img = lb.querySelector('img');
    const cap = lb.querySelector('figcaption');
    let items = [], idx = 0;
    const show = () => {
      const b = items[idx];
      const t = b.querySelector('img');
      img.src = b.dataset.full;
      img.alt = t.alt;
      cap.textContent = t.alt + (items.length > 1 ? '  ·  ' + (idx + 1) + ' / ' + items.length : '');
    };
    const step = (d) => { idx = (idx + d + items.length) % items.length; show(); };
    document.querySelectorAll('.shots').forEach((group) => {
      const list = Array.from(group.querySelectorAll('.shot'));
      list.forEach((b, i) => b.addEventListener('click', () => {
        items = list; idx = i; show();
        lb.querySelector('.lb-prev').hidden = lb.querySelector('.lb-next').hidden = list.length < 2;
        lb.showModal();
      }));
    });
    lb.querySelector('.lb-close').addEventListener('click', () => lb.close());
    lb.querySelector('.lb-prev').addEventListener('click', () => step(-1));
    lb.querySelector('.lb-next').addEventListener('click', () => step(1));
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target.tagName === 'FIGURE') lb.close(); });
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    });
  }
})();
