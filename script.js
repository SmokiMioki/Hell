(() => {
  const $ = (s, r = document) => r.querySelector(s);
  let data = [];
  const state = { q: '', cat: 'all', extra: new Set(), sort: 'new', all: false };
  const kanji = ['一','二','三','四','五','六','七','八','九','十'];
  const root = document.documentElement;

  /* ---------- ссылки на карточки ---------- */
  const slug = n => String(n).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
  const hashSlug = () => { try { return decodeURIComponent(location.hash.slice(1)); } catch { return ''; } };
  const hashIndex = () => { const h = hashSlug(); return h ? data.findIndex(e => slug(e.name) === h) : -1; };
  function openFromHash() { const i = hashIndex(); if (i >= 0) openCard(i); }
  async function copyText(text, btn, label) {
    try { await navigator.clipboard.writeText(text); }
    catch { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
    btn.textContent = 'Скопировано ✓';
    setTimeout(() => btn.textContent = label, 1800);
  }

  /* ---------- эпиграф ---------- */
  const quotes = [
    'Пока горит огонь, дверь открыта…',
    'Каждое имя ищет своё место в списке.',
    'Тихо. Слышно, как шуршат лепестки.',
    'Красная нить всегда ведёт к нужному.',
    'Что вписано в полночь, останется до рассвета.',
    'Не торопись: расширения подождут.',
    'Один огонёк — и в темноте виден путь.',
    'У каждой истории есть своя тень, а у тени — свой плагин.',
    'Лиса знает дорогу, но не всегда о ней говорит.',
    'Девять хвостов — девять способов найти нужное.',
    'Иди за голубым огоньком: он не обманет.',
    'За каждым ярким пламенем бродит лиса.'
  ];
  function setEpigraph() {
    const el = $('#epigraph');
    if (el) el.textContent = quotes[Math.floor(Math.random() * quotes.length)];
  }

  /* ---------- счётчик «книга имён» ---------- */
  function plural(n) {
    const a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return 'расширение';
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return 'расширения';
    return 'расширений';
  }
  function setTally(n) {
    const el = $('#tally'); if (!el) return;
    el.hidden = false;
    if (!n) { el.textContent = 'Книга имён пока пуста'; return; }
    el.innerHTML = `Сегодня в книге имён — <b id="tn">${reduce ? n : 0}</b> ${plural(n)}`;
    if (reduce) return;
    const run = () => {
      const tn = $('#tn'); if (!tn) return;
      const t0 = performance.now();
      (function step(t) {
        const k = Math.min(1, (t - t0) / 900);
        tn.textContent = Math.round(n * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    };
    if (root.classList.contains('intro-on')) document.addEventListener('gate:ready', run, { once: true });
    else run();
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const grid = $('#grid'), chips = $('#chips'), empty = $('#empty'), count = $('#count');
  const modal = $('#modal'), body = $('#modal-body');

  /* ---------- теги: главный + «Прочее» ---------- */
  const NOCAT = 'Без категории';
  const TAG_LIMIT = 12;
  const labels = new Map();                       // ключ (нижний регистр) → как показывать
  const key = s => String(s).trim().toLowerCase();
  const reg = s => { const k = key(s); if (!labels.has(k)) labels.set(k, String(s).trim()); return k; };
  const more = $('#more'), moreN = $('#more-n'), extraBox = $('#extra'), extraChips = $('#extra-chips');
  const showAll = $('#showall'), resetBtn = $('#reset'), sortSel = $('#sort');
  const catBtn = $('#catbtn'), catLbl = $('#cat-l'), catN = $('#cat-n'), catBox = $('#catbox');
  let panelOpen = false, catOpen = false;

  // у каждого расширения: главный тег (cat) + остальные (tags)
  function prep(e) {
    const tags = (e.tags || []).map(t => String(t).trim()).filter(Boolean);
    let cat = String(e.cat || '').trim(), rest = tags;
    if (!cat) { cat = tags[0] || NOCAT; rest = tags.slice(1); }   // старые записи без cat
    e._cat = reg(cat);
    e._extra = [...new Set(rest.map(reg))].filter(k => k !== e._cat);
  }

  function ok(e, o = {}) {
    if (!o.noCat && state.cat !== 'all' && e._cat !== state.cat) return false;
    for (const t of state.extra) if (!e._extra.includes(t)) return false;
    const q = state.q.trim().toLowerCase();
    if (!q) return true;
    if (window.gateLogic) {                         // логический поиск (logic-search.js)
      const L = window.gateLogic.test(q, { name: e.name, by: e.by, desc: e.desc, cat: labels.get(e._cat), tag: e._extra.map(k => labels.get(k)).join(' ') });
      if (L !== undefined) return L;
    }
    return [e.name, e.by, e.desc, labels.get(e._cat), ...e._extra.map(k => labels.get(k))].join(' ').toLowerCase().includes(q);
  }

  function renderFilters() {
    const total = {}; data.forEach(e => total[e._cat] = (total[e._cat] || 0) + 1);
    const nokey = key(NOCAT);
    const cats = Object.keys(total).sort((a, b) =>
      (a === nokey) - (b === nokey) || total[b] - total[a] || labels.get(a).localeCompare(labels.get(b), 'ru'));
    const cnt = {}; data.forEach(e => { if (ok(e, { noCat: true })) cnt[e._cat] = (cnt[e._cat] || 0) + 1; });
    const sum = Object.values(cnt).reduce((x, y) => x + y, 0);
    chips.innerHTML = [['all', 'Все', sum], ...cats.map(k => [k, labels.get(k), cnt[k] || 0])].map(([k, l, n]) =>
      `<button class="chip${state.cat === k ? ' on' : ''}${n || state.cat === k ? '' : ' zero'}" type="button" data-k="${esc(k)}" aria-pressed="${state.cat === k}">${esc(l)}<span class="n">${n}</span></button>`
    ).join('');

    // кнопка «Категории»: показывает выбранную категорию или общее число
    const picked = state.cat !== 'all';
    catLbl.textContent = picked ? labels.get(state.cat) : 'Категории';
    catN.hidden = picked; catN.textContent = cats.length;
    catBtn.classList.toggle('active', picked);
    catBtn.setAttribute('aria-expanded', String(catOpen));
    catBox.hidden = !catOpen;

    // «Прочее»: теги только из того, что сейчас видно, со счётчиками
    const c = {};
    data.filter(e => ok(e)).forEach(e => e._extra.forEach(t => c[t] = (c[t] || 0) + 1));
    state.extra.forEach(t => { if (!(t in c)) c[t] = 0; });
    const list = Object.keys(c).sort((a, b) => c[b] - c[a] || labels.get(a).localeCompare(labels.get(b), 'ru'));
    const shown = state.all ? list : list.filter((t, i) => i < TAG_LIMIT || state.extra.has(t));
    extraChips.innerHTML = shown.map(t =>
      `<button class="tagchip${state.extra.has(t) ? ' on' : ''}" type="button" data-k="${esc(t)}" aria-pressed="${state.extra.has(t)}">${esc(labels.get(t))}<span class="n">${c[t]}</span></button>`
    ).join('');
    showAll.hidden = list.length <= TAG_LIMIT;
    showAll.textContent = state.all ? 'Свернуть' : `Показать все (${list.length})`;
    more.hidden = !list.length;
    moreN.hidden = !state.extra.size; moreN.textContent = state.extra.size;
    more.setAttribute('aria-expanded', String(panelOpen && !!list.length));
    extraBox.hidden = !panelOpen || !list.length;
    resetBtn.hidden = state.cat === 'all' && !state.extra.size;
  }
  const refresh = () => { renderFilters(); renderCards(); };

  chips.addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    state.cat = b.dataset.k; state.extra.clear(); state.all = false; catOpen = false; refresh();
  });
  catBtn.addEventListener('click', () => { catOpen = !catOpen; if (catOpen) panelOpen = false; renderFilters(); });
  document.addEventListener('click', e => {           // клик мимо панели категорий — закрыть
    if (catOpen && !e.target.closest('#catbox, #catbtn')) { catOpen = false; renderFilters(); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && catOpen) { catOpen = false; renderFilters(); catBtn.focus(); }
  });
  extraChips.addEventListener('click', e => {
    const b = e.target.closest('.tagchip'); if (!b) return;
    const t = b.dataset.k; state.extra.has(t) ? state.extra.delete(t) : state.extra.add(t); refresh();
  });
  more.addEventListener('click', () => { panelOpen = !panelOpen; if (panelOpen) catOpen = false; renderFilters(); });
  showAll.addEventListener('click', () => { state.all = !state.all; renderFilters(); });
  resetBtn.addEventListener('click', () => { state.cat = 'all'; state.extra.clear(); state.all = false; refresh(); });
  try { const sv = localStorage.getItem('gate-sort'); if (sv && [...sortSel.options].some(o => o.value === sv)) state.sort = sv; } catch {}
  sortSel.value = state.sort;
  sortSel.addEventListener('change', () => {
    state.sort = sortSel.value;
    try { localStorage.setItem('gate-sort', state.sort); } catch {}
    renderCards();
  });

  /* ---------- карточки ---------- */
  const cmp = {
    new: (a, b) => (b.added || '').localeCompare(a.added || ''),
    old: (a, b) => (a.added || '9').localeCompare(b.added || '9'),
    name: (a, b) => a.name.localeCompare(b.name, 'ru'),
    author: (a, b) => (a.by || '').localeCompare(b.by || '', 'ru') || a.name.localeCompare(b.name, 'ru')
  };
  function tagsHtml(e, max) {
    const x = e._extra.map(k => labels.get(k)), v = max ? x.slice(0, max) : x;
    return `<span class="cat">${esc(labels.get(e._cat))}</span>` + v.map(t => `<span>${esc(t)}</span>`).join('') +
      (max && x.length > max ? `<span class="rest">+${x.length - max}</span>` : '');
  }
  function renderCards() {
    const list = data.filter(e => ok(e)).sort(cmp[state.sort] || cmp.new);
    grid.innerHTML = list.map((e, i) => {
      const im = e.images || [];
      return `
      <article class="card${im.length ? ' has-shot' : ''}" tabindex="0" data-i="${data.indexOf(e)}" style="animation-delay:${i * 70}ms">
        ${im.length ? `<div class="shot"><img src="${esc(im[0])}" alt="" loading="lazy" decoding="async">${im.length > 1 ? `<span class="cnt">${im.length}</span>` : ''}</div>` : ''}
        <span class="num jp">${kanji[i] || i + 1}</span>
        <h3>${esc(e.name)}</h3>
        <div class="by">${esc(e.by || '')}</div>
        <p>${esc(e.desc || '')}</p>
        <div class="tags">${tagsHtml(e, 3)}</div>
      </article>`;
    }).join('');
    empty.hidden = list.length > 0;
    count.textContent = list.length ? `найдено: ${list.length}` : '';
    grid.appendChild(linkSvg);
    clearLink();
  }

  /* ---------- модалка ---------- */
  function openCard(i) {
    const e = data[i]; if (!e) return;
    const im = e.images || [];
    const gal = im.length ? `
      <div class="gal">
        <button class="gal-main" type="button" aria-label="Увеличить"><img id="gal-img" src="${esc(im[0])}" alt="${esc(e.name)}"></button>
        ${im.length > 1 ? `<div class="gal-strip">${im.map((p, k) => `<button class="gal-t${k ? '' : ' on'}" type="button" data-k="${k}" aria-label="Картинка ${k + 1}"><img src="${esc(p)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
      </div>` : '';
    body.innerHTML = `
      ${gal}
      <h3>${esc(e.name)}</h3>
      <div class="by">${esc(e.by || '')}</div>
      <p>${esc(e.desc || '')}</p>
      <div class="tags">${tagsHtml(e)}</div>
      <div class="install">
        <code id="url">${esc(e.repo)}</code>
        <button class="btn" id="copy">Копировать</button>
      </div>
      <p class="small">SillyTavern → Extensions → Install extension → вставь ссылку.</p>
      <div class="row">
        <a class="btn ghost" href="${esc(e.repo)}" target="_blank" rel="noopener">Открыть на GitHub</a>
        <button class="btn ghost" id="share" type="button">Ссылка на карточку</button>
      </div>`;
    const anchor = '#' + encodeURIComponent(slug(e.name));
    if (im.length) {
      let cur = 0;
      $('.gal-main', body).addEventListener('click', () => openLightbox(im, cur));
      const strip = $('.gal-strip', body);
      if (strip) strip.addEventListener('click', ev => {
        const t = ev.target.closest('.gal-t'); if (!t) return;
        cur = +t.dataset.k; $('#gal-img').src = im[cur];
        body.querySelectorAll('.gal-t').forEach(b => b.classList.toggle('on', b === t));
      });
    }
    if (!modal.open) modal.showModal();
    history.replaceState(null, '', location.pathname + location.search + anchor);
    $('#share').addEventListener('click', ev => copyText(location.origin + location.pathname + anchor, ev.target, 'Ссылка на карточку'));
    $('#copy').addEventListener('click', async ev => {
      try { await navigator.clipboard.writeText(e.repo); }
      catch { const r = document.createRange(); r.selectNodeContents($('#url')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('copy'); }
      ev.target.textContent = 'Скопировано ✓';
      setTimeout(() => ev.target.textContent = 'Копировать', 1800);
    });
  }
  /* ---------- лайтбокс ---------- */
  const lb = document.createElement('dialog');
  lb.id = 'lightbox';
  lb.innerHTML = '<button class="x" type="button" aria-label="Закрыть">×</button><button class="lb-nav prev" type="button" aria-label="Назад">‹</button><img alt=""><button class="lb-nav next" type="button" aria-label="Вперёд">›</button><span class="lb-n"></span>';
  document.body.appendChild(lb);
  let lbList = [], lbI = 0;
  function lbShow(k) {
    lbI = (k + lbList.length) % lbList.length;
    $('img', lb).src = lbList[lbI];
    $('.lb-n', lb).textContent = lbList.length > 1 ? `${lbI + 1} / ${lbList.length}` : '';
  }
  function openLightbox(arr, k) {
    lbList = arr; lb.classList.toggle('single', arr.length < 2);
    lbShow(k); lb.showModal();
  }
  lb.addEventListener('click', e => {
    if (e.target.closest('.x') || e.target === lb) lb.close();
    else if (e.target.closest('.prev')) lbShow(lbI - 1);
    else if (e.target.closest('.next')) lbShow(lbI + 1);
  });
  lb.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') lbShow(lbI - 1); else if (e.key === 'ArrowRight') lbShow(lbI + 1);
  });

  /* ---------- красная нить к соседней карточке ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const linkSvg = document.createElementNS(NS, 'svg');
  linkSvg.setAttribute('class', 'card-link');
  linkSvg.setAttribute('aria-hidden', 'true');
  let hovered = null;
  function clearLink() { linkSvg.innerHTML = ''; hovered = null; }
  function drawLink(c) {
    linkSvg.innerHTML = '';
    const cards = [...grid.querySelectorAll('.card')];
    const n = cards[cards.indexOf(c) + 1];
    if (!n) return;
    const a = { x: c.offsetLeft, y: c.offsetTop, w: c.offsetWidth, h: c.offsetHeight };
    const b = { x: n.offsetLeft, y: n.offsetTop, w: n.offsetWidth, h: n.offsetHeight };
    let x1, y1, x2, y2;
    if (Math.abs(a.y - b.y) < 4) { x1 = a.x + a.w; y1 = a.y + a.h / 2; x2 = b.x; y2 = b.y + b.h / 2; }
    else { x1 = a.x + a.w / 2; y1 = a.y + a.h; x2 = b.x + b.w / 2; y2 = b.y; }
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + 28;
    linkSvg.innerHTML =
      `<path class="lk" pathLength="1" d="M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}"/>` +
      `<circle class="lk-dot" cx="${x1}" cy="${y1}" r="4"/><circle class="lk-dot end" cx="${x2}" cy="${y2}" r="4"/>`;
  }
  if (matchMedia('(hover:hover)').matches) {
    grid.addEventListener('mouseover', e => {
      const c = e.target.closest('.card');
      if (c === hovered) return;
      hovered = c;
      if (c) drawLink(c); else linkSvg.innerHTML = '';
    });
    grid.addEventListener('mouseleave', clearLink);
  }

  grid.addEventListener('click', e => { const c = e.target.closest('.card'); if (c) openCard(+c.dataset.i); });
  grid.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('card')) { e.preventDefault(); openCard(+e.target.dataset.i); }
  });
  modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });
  modal.addEventListener('close', () => { if (hashIndex() >= 0) history.replaceState(null, '', location.pathname + location.search); });

  /* ---------- поиск («впиши имя») ---------- */
  const q = $('#q');
  q.addEventListener('input', () => { state.q = q.value; refresh(); });
  $('#gate').addEventListener('submit', e => {
    e.preventDefault();
    state.q = q.value; refresh();
    $('#catalog').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    document.dispatchEvent(new CustomEvent('gate:search', { detail: { q: q.value, found: grid.querySelectorAll('.card').length } }));
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

  addEventListener('hashchange', openFromHash);
  setEpigraph();

  fetch('extensions.json', { cache: 'no-store' })
    .then(r => { if (!r.ok) throw 0; return r.json(); })
    .then(j => {
      data = Array.isArray(j) ? j : [];
      data.forEach(prep);
      if (!data.length) empty.innerHTML = 'Здесь пока тихо…<br><small>расширения появятся позже</small>';
      refresh();
      if (!data.length) empty.hidden = false;
      setTally(data.length);
      if (root.classList.contains('intro-on')) document.addEventListener('gate:ready', openFromHash, { once: true });
      else openFromHash();
    })
    .catch(() => {
      empty.innerHTML = 'Не удалось открыть список…<br><small>на сайте через GitHub Pages всё заработает</small>';
      empty.hidden = false;
    });
})();
