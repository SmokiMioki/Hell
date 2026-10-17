(() => {
  const $ = (s, r = document) => r.querySelector(s);
  let data = [];
  const state = { q: '', tag: 'all' };
  const kanji = ['一','二','三','四','五','六','七','八','九','十'];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const grid = $('#grid'), chips = $('#chips'), empty = $('#empty'), count = $('#count');
  const modal = $('#modal'), body = $('#modal-body');

  /* ---------- фильтры ---------- */
  let tags = [];
  function renderChips() {
    chips.innerHTML = ['all', ...tags].map(t =>
      `<button class="chip${state.tag === t ? ' on' : ''}" data-tag="${esc(t)}">${t === 'all' ? 'Все' : esc(t)}</button>`
    ).join('');
  }
  chips.addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    state.tag = b.dataset.tag; renderChips(); renderCards();
  });

  /* ---------- карточки ---------- */
  function matches(e) {
    const q = state.q.trim().toLowerCase();
    const okTag = state.tag === 'all' || (e.tags || []).includes(state.tag);
    const hay = [e.name, e.by, e.desc, ...(e.tags || [])].join(' ').toLowerCase();
    return okTag && (!q || hay.includes(q));
  }
  function renderCards() {
    const list = data.filter(matches);
    grid.innerHTML = list.map((e, i) => `
      <article class="card" tabindex="0" data-i="${data.indexOf(e)}" style="animation-delay:${i * 70}ms">
        <span class="num jp">${kanji[i] || i + 1}</span>
        <h3>${esc(e.name)}</h3>
        <div class="by">${esc(e.by || '')}</div>
        <p>${esc(e.desc || '')}</p>
        <div class="tags">${(e.tags || []).map(t => `<span>${esc(t)}</span>`).join('')}</div>
      </article>`).join('');
    empty.hidden = list.length > 0;
    count.textContent = list.length ? `найдено: ${list.length}` : '';
  }

  /* ---------- модалка ---------- */
  function openCard(i) {
    const e = data[i]; if (!e) return;
    body.innerHTML = `
      <h3>${esc(e.name)}</h3>
      <div class="by">${esc(e.by || '')}</div>
      <p>${esc(e.desc || '')}</p>
      <div class="tags">${(e.tags || []).map(t => `<span>${esc(t)}</span>`).join('')}</div>
      <div class="install">
        <code id="url">${esc(e.repo)}</code>
        <button class="btn" id="copy">Копировать</button>
      </div>
      <p class="small">SillyTavern → Extensions → Install extension → вставь ссылку.</p>
      <div class="row">
        <a class="btn ghost" href="${esc(e.repo)}" target="_blank" rel="noopener">Открыть на GitHub</a>
      </div>`;
    modal.showModal();
    $('#copy').addEventListener('click', async ev => {
      try { await navigator.clipboard.writeText(e.repo); }
      catch { const r = document.createRange(); r.selectNodeContents($('#url')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('copy'); }
      ev.target.textContent = 'Скопировано ✓';
      setTimeout(() => ev.target.textContent = 'Копировать', 1800);
    });
  }
  grid.addEventListener('click', e => { const c = e.target.closest('.card'); if (c) openCard(+c.dataset.i); });
  grid.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('card')) { e.preventDefault(); openCard(+e.target.dataset.i); }
  });
  modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });

  /* ---------- поиск («впиши имя») ---------- */
  const q = $('#q');
  q.addEventListener('input', () => { state.q = q.value; renderCards(); });
  $('#gate').addEventListener('submit', e => {
    e.preventDefault();
    state.q = q.value; renderCards();
    $('#catalog').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  });

  /* ---------- часы ---------- */
  const clock = $('#clock');
  const pad = n => String(n).padStart(2, '0');
  function tickClock() { const d = new Date(); clock.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
  tickClock(); setInterval(tickClock, 15000);
  $('#year').textContent = new Date().getFullYear();

  /* ---------- красная нить ---------- */
  function thread() {
    const max = document.documentElement.scrollHeight - innerHeight;
    document.documentElement.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0);
  }
  addEventListener('scroll', thread, { passive: true }); addEventListener('resize', thread); thread();

  /* ---------- лепестки ---------- */
  const cv = $('#petals');
  if (!reduce && cv.getContext) {
    const ctx = cv.getContext('2d'); let W, H; const ps = [];
    const size = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; };
    const mk = init => ({
      x: Math.random() * W, y: init ? Math.random() * H : -20,
      r: 3 + Math.random() * 5, vy: .3 + Math.random() * .7, vx: -.2 + Math.random() * .4,
      a: Math.random() * 6.28, va: (Math.random() - .5) * .03, o: .25 + Math.random() * .5, ph: Math.random() * 6.28
    });
    size(); addEventListener('resize', size);
    const N = innerWidth < 700 ? 22 : 42;
    for (let i = 0; i < N; i++) ps.push(mk(true));
    (function loop(t) {
      ctx.clearRect(0, 0, W, H);
      for (const p of ps) {
        p.y += p.vy; p.x += p.vx + Math.sin(t / 1500 + p.ph) * .3; p.a += p.va;
        if (p.y > H + 20) Object.assign(p, mk(false));
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.globalAlpha = p.o;
        ctx.fillStyle = '#b3121f'; ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * .35, 0, 0, 6.28); ctx.fill(); ctx.restore();
      }
      requestAnimationFrame(loop);
    })(0);
  }

  fetch('extensions.json', { cache: 'no-store' })
    .then(r => { if (!r.ok) throw 0; return r.json(); })
    .then(j => {
      data = Array.isArray(j) ? j : [];
      tags = [...new Set(data.flatMap(e => e.tags || []))];
      if (!data.length) empty.innerHTML = 'Здесь пока тихо…<br><small>расширения появятся позже</small>';
      renderChips(); renderCards();
      if (!data.length) empty.hidden = false;
    })
    .catch(() => {
      empty.innerHTML = 'Не удалось открыть список…<br><small>на сайте через GitHub Pages всё заработает</small>';
      empty.hidden = false;
    });
})();
