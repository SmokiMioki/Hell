/* Лиса-проводник: живёт внизу экрана, встречает у поиска, ведёт к найденной карточке. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const OFF = 'gate-fox-off', HELLO = 'gate-fox-hello';
  const ls = { get: k => { try { return localStorage.getItem(k); } catch { return null; } },
               set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
               del: k => { try { localStorage.removeItem(k); } catch {} } };
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];

  /* ---------- кадры ---------- */
  const NAMES = ['idle_1', 'idle_2', 'idle_3', 'point_1', 'sad_1', 'talk_1', 'talk_2', 'walk_1', 'walk_2', 'walk_3', 'walk_4'];
  const WALK = ['walk_1', 'walk_2', 'walk_3', 'walk_4'];
  const pics = {};
  NAMES.forEach(n => { const i = new Image(); i.src = `img/fox/${n}.webp`; pics[n] = i; });

  /* ---------- реплики ---------- */
  const HELLO_LINES = ['Впиши имя расширения — и я проведу тебя.'];
  const FOUND = ['Вот оно. Нашла.', 'Это здесь. Смотри.', 'Иди за красной нитью — она ведёт сюда.'];
  const MANY = n => `Нашла несколько (${n}). Вот первое.`;
  const NONE = ['Не нашла… Попробуй написать иначе.', 'Тут пусто. Может, другое имя?'];
  const EMPTY = ['Сначала впиши имя…'];
  const POKE = ['Ищешь расширение? Впиши имя наверху.', 'Я здесь, пока горит огонёк.', 'Тише… слышишь? Это шуршат расширения.', 'Нажми на карточку — внутри ссылка для установки.'];

  /* ---------- DOM ---------- */
  const fox = document.createElement('div');
  fox.id = 'fox'; fox.setAttribute('aria-hidden', 'true');
  fox.innerHTML = '<div class="fox-bubble"></div><div class="fox-flip"><img class="fox-body breathe" alt="" draggable="false"><span class="fox-hit"></span></div>';
  document.body.appendChild(fox);
  const bubble = fox.querySelector('.fox-bubble'), flip = fox.querySelector('.fox-flip'), body = fox.querySelector('.fox-body');
  const hit = fox.querySelector('.fox-hit');

  /* ---------- положение: pos — точка под лапами, в координатах окна ---------- */
  const RATIO = 520 / 720;
  const fw = () => fox.offsetWidth || 260, fh = () => fw() * RATIO;
  const vw = () => document.documentElement.clientWidth;
  let pos = { x: -300, y: innerHeight - 8 };
  const place = () => { fox.style.transform = `translate3d(${pos.x - fw() / 2}px,${pos.y - fh()}px,0)`; };
  let dir = 1;
  const setDir = d => { if (d !== dir) { dir = d; flip.classList.toggle('left', d < 0); } };
  let cur = '';
  const setPic = n => { if (cur !== n) { cur = n; body.src = pics[n].src; } };

  const homePoint = () => ({ x: fw() * .55 + 14, y: innerHeight - 8 });
  const onScreen = r => r.bottom > 60 && r.top < innerHeight - 60;
  const clampX = x => Math.min(vw() - fw() * .45, Math.max(fw() * .45, x));

  // точки, куда может встать лиса
  const spots = {
    home: () => homePoint(),
    gate: () => {                                  // справа от поля поиска, если хватает места
      const r = $('#gate').getBoundingClientRect();
      const x = r.right + fw() * .56;
      if (x + fw() * .45 > vw() || !onScreen(r)) return null;
      return { x, y: Math.min(innerHeight - 8, r.bottom + 6) };
    },
    card: el => () => {                            // рядом с карточкой, лицом к ней; на узком экране — на её верхней части
      const r = el.getBoundingClientRect(); if (!onScreen(r)) return null;
      const side = r.right + fw() * .45;
      if (side + fw() * .45 <= vw()) return { x: side, y: Math.min(innerHeight - 8, r.top + fh() * .95), face: -1 };
      return { x: clampX(r.left + r.width * .6), y: Math.min(innerHeight - 8, r.top + fh() * .88), face: 1 };
    }
  };
  const $ = s => document.querySelector(s);

  /* ---------- движение ---------- */
  let path = null, perch = null, walkT = 0, last = performance.now();
  let pose = 'idle', talkUntil = 0, blinkAt = last + rand(3000, 7000), blinkUntil = 0;

  function walkTo(p, cb) {
    if (reduce) { pos = { x: p.x, y: p.y }; place(); path = null; cb && cb(); return; }
    path = { x: p.x, y: p.y, cb };
  }
  function goSpot(get, cb) {
    const p = get && get();
    perch = p ? { get } : null;
    walkTo(p || homePoint(), () => { if (p && p.face) setDir(p.face); cb && cb(); });
  }
  function goHome(cb) { perch = null; walkTo(homePoint(), cb); }

  function follow() {                              // держимся за своей точкой при прокрутке
    if (!perch || path) return;
    const p = perch.get();
    if (!p) { goHome(); return; }
    pos = { x: p.x, y: p.y }; place();
    if (bubble.classList.contains('on')) fitBubble();
  }
  let pend = false;
  addEventListener('scroll', () => { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; follow(); }); }, { passive: true });
  addEventListener('resize', () => { if (!path) { perch ? follow() : (pos = homePoint(), place()); } });
  setInterval(() => { if (!path) follow(); }, 500);

  function tick(t) {
    const dt = Math.min(.05, (t - last) / 1000); last = t;
    if (path) {
      const dx = path.x - pos.x, dy = path.y - pos.y, d = Math.hypot(dx, dy), step = 340 * (fw() / 260) * dt;
      if (d <= step) {
        pos = { x: path.x, y: path.y }; const cb = path.cb; path = null; body.classList.remove('walking'); place(); cb && cb();
      } else {
        pos.x += dx / d * step; pos.y += dy / d * step;
        if (Math.abs(dx) > 1) setDir(dx > 0 ? 1 : -1);
        walkT += dt; setPic(WALK[Math.floor(walkT * 9) % 4]); body.classList.add('walking'); place();
        if (bubble.classList.contains('on')) fitBubble();
      }
    } else if (t < talkUntil) {
      setPic(((t / 150) | 0) % 2 ? 'talk_2' : 'talk_1');
    } else if (pose === 'point') setPic('point_1');
    else if (pose === 'sad') setPic('sad_1');
    else if (t < blinkUntil) setPic('idle_3');
    else { setPic('idle_2'); if (t > blinkAt) { blinkUntil = t + 160; blinkAt = t + rand(3500, 7500); } }
    requestAnimationFrame(tick);
  }

  /* ---------- речь ---------- */
  let typing = 0, hideT = 0, hideCb = null;
  function fitBubble() {
    bubble.style.setProperty('--bx', '0px');
    const r = bubble.getBoundingClientRect();
    let s = 0;
    if (r.left < 10) s = 10 - r.left; else if (r.right > vw() - 10) s = vw() - 10 - r.right;
    bubble.style.setProperty('--bx', s + 'px');
  }
  function unsay(runCb = true) {
    clearInterval(typing); clearTimeout(hideT); pose = 'idle'; talkUntil = 0;
    bubble.classList.remove('on');
    const cb = hideCb; hideCb = null; if (runCb && cb) cb();
  }
  function say(text, { pose: p = 'idle', hold = 3600, after } = {}) {
    unsay(false);
    hideCb = after || null;
    const step = reduce ? 0 : 32, esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    let k = step ? 0 : text.length;
    const render = () => { bubble.innerHTML = `${esc(text.slice(0, k))}<span style="visibility:hidden">${esc(text.slice(k))}</span>`; };
    render(); bubble.classList.add('on'); fitBubble();
    const finish = () => { talkUntil = 0; pose = p; hideT = setTimeout(() => unsay(true), hold); };
    if (!step) { finish(); return; }
    talkUntil = performance.now() + text.length * step + 60;
    typing = setInterval(() => { k++; render(); if (k >= text.length) { clearInterval(typing); finish(); } }, step);
  }

  /* ---------- сценарии ---------- */
  let busy = false, job = 0;
  function enter() {
    if (ls.get(OFF) === '1') return;
    pos = { x: -fw(), y: innerHeight - 8 }; place(); fox.classList.add('show');
    const hello = !sessionStorage.getItem(HELLO);
    goSpot(spots.gate, () => { if (hello) { try { sessionStorage.setItem(HELLO, '1'); } catch {} say(pick(HELLO_LINES)); } });
  }

  document.addEventListener('gate:search', e => {
    if (ls.get(OFF) === '1') return;
    const { q, found } = e.detail;
    unsay(false); path = null; perch = null; body.classList.remove('walking'); busy = true;
    const my = ++job;
    const leave = () => setTimeout(() => { if (my === job && !path && !bubble.classList.contains('on')) goHome(); }, 900);
    setTimeout(() => {
      busy = false;
      if (my !== job) return;
      if (!q.trim()) { goSpot(spots.gate, () => say(pick(EMPTY))); return; }
      if (found) {
        const card = $('.card');
        if (!card) return;
        goSpot(spots.card(card), () => say(found > 1 ? MANY(found) : pick(FOUND), { pose: 'point', hold: 4200, after: leave }));
      } else {
        goSpot(spots.card($('#empty')), () => say(pick(NONE), { pose: 'sad', hold: 4200, after: leave }));
      }
    }, reduce ? 0 : 800);
  });

  hit.addEventListener('click', () => { if (!path) say(pick(POKE), { hold: 3200 }); });

  /* ---------- выключатель ---------- */
  const foot = $('.foot p');
  const tg = document.createElement('button');
  tg.type = 'button'; tg.className = 'fox-toggle';
  const sync = () => { tg.textContent = ls.get(OFF) === '1' ? 'позвать лису' : 'спрятать лису'; };
  tg.addEventListener('click', () => {
    if (ls.get(OFF) === '1') { ls.del(OFF); sync(); enter(); }
    else { ls.set(OFF, '1'); sync(); unsay(false); path = null; fox.classList.remove('show'); }
  });
  sync(); if (foot) foot.appendChild(tg);

  /* ---------- старт ---------- */
  Promise.all(NAMES.map(n => (pics[n].decode ? pics[n].decode().catch(() => {}) : 0))).then(() => {
    setPic('idle_2'); place(); requestAnimationFrame(tick);
    const start = () => setTimeout(enter, 400);
    if (document.documentElement.classList.contains('intro-on')) document.addEventListener('gate:ready', start, { once: true });
    else start();
  });
})();
