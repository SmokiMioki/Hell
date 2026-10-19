(() => {
  const root = document.documentElement;
  const intro = document.getElementById('intro');
  const KEY = 'gate-intro';

  /* ---------- заставка ---------- */
  function finish() {
    if (intro) intro.remove();
    root.classList.remove('intro-on');
    try { sessionStorage.setItem(KEY, '1'); } catch {}
    document.dispatchEvent(new Event('gate:ready'));
  }

  if (intro) {
    if (!root.classList.contains('intro-on')) {
      intro.remove();
    } else {
      let opened = false;
      const open = () => {
        if (opened) return; opened = true;
        intro.classList.add('open');
        setTimeout(() => {                 // дальше: растворяем остатки и убираем слой
          intro.style.transition = 'opacity .5s';
          intro.style.opacity = '0';
          setTimeout(finish, 520);
        }, 1700);
      };
      const timer = setTimeout(open, 3200);
      document.getElementById('skip').addEventListener('click', () => { clearTimeout(timer); open(); });
    }
  }

  /* ---------- свет от курсора ---------- */
  if (matchMedia('(hover:hover) and (pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const g = document.createElement('div');
    g.className = 'cursor-glow';
    document.body.appendChild(g);
    let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y;
    addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; g.classList.add('on'); }, { passive: true });
    document.addEventListener('mouseleave', () => g.classList.remove('on'));
    (function follow() {
      x += (tx - x) * .12; y += (ty - y) * .12;
      g.style.transform = `translate(${x}px,${y}px)`;
      requestAnimationFrame(follow);
    })();
  }
})();
