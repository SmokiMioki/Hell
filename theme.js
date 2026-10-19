(() => {
  const root = document.documentElement;
  const btn = document.getElementById('candle');
  if (!btn) return;
  const meta = document.querySelector('meta[name="theme-color"]');

  function sync() {
    const light = root.dataset.theme === 'light';
    btn.setAttribute('aria-pressed', String(light));
    btn.title = light ? 'Зажечь свечу (тёмная тема)' : 'Погасить свечу (светлая тема)';
    if (meta) meta.content = light ? '#f5eddf' : '#150f1a';
  }

  btn.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    try { localStorage.setItem('gate-theme', next); } catch {}
    sync();
  });

  sync();
})();
