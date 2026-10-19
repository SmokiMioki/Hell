(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const LS = 'gates-admin';
  const FILE = 'extensions.json';
  let list = [], sha = null, editing = -1;
  const cfg = { owner: '', repo: '', branch: 'main', token: '' };

  /* ---------- служебное ---------- */
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toB64 = s => { const b = new TextEncoder().encode(s); let t = ''; b.forEach(x => t += String.fromCharCode(x)); return btoa(t); };
  const fromB64 = s => { const t = atob(s); return new TextDecoder().decode(Uint8Array.from(t, c => c.charCodeAt(0))); };
  const status = (msg, kind = 'wait') => { const el = $('#status'); el.textContent = msg; el.className = 'status ' + kind; el.hidden = !msg; };
  const busy = on => document.querySelectorAll('button').forEach(b => b.disabled = on);

  async function api(path, opt = {}, auth = true) {
    const h = { Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' };
    if (auth && cfg.token) h.Authorization = 'Bearer ' + cfg.token;
    return fetch('https://api.github.com' + path, { ...opt, headers: h });
  }
  const base = () => `/repos/${cfg.owner}/${cfg.repo}/contents/${FILE}`;

  /*FEED-START*/
  const FEED = 'feed.xml';
  const slug = n => String(n).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
  const xesc = s => String(s).replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));
  const siteUrl = () => location.origin + location.pathname.replace(/[^\/]*$/, '');
  function buildFeed() {
    const b = siteUrl();
    const items = list.filter(e => e.added).sort((x, y) => y.added.localeCompare(x.added)).slice(0, 50);
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>Врата расширений</title>
<link>${xesc(b)}</link>
<description>Новые расширения для SillyTavern</description>
<language>ru</language>
<atom:link href="${xesc(b + FEED)}" rel="self" type="application/rss+xml"/>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items.map(e => `<item><title>${xesc(e.name)}</title><link>${xesc(b + '#' + encodeURIComponent(slug(e.name)))}</link><guid isPermaLink="false">${xesc(slug(e.name) + '-' + e.added)}</guid><pubDate>${new Date(e.added).toUTCString()}</pubDate><description>${xesc(e.desc || '')}</description></item>`).join('\n')}
</channel></rss>
`;
  }
  async function saveFeed() {
    const path = `/repos/${cfg.owner}/${cfg.repo}/contents/${FEED}`;
    let fsha = null;
    const g = await api(`${path}?ref=${encodeURIComponent(cfg.branch)}&t=${Date.now()}`);
    if (g.ok) fsha = (await g.json()).sha;
    const body = { message: 'Update feed', content: toB64(buildFeed()), branch: cfg.branch };
    if (fsha) body.sha = fsha;
    const r = await api(path, { method: 'PUT', body: JSON.stringify(body) });
    if (!r.ok) throw new Error('feed');
  }
  async function feedSave() { try { await saveFeed(); return true; } catch { return false; } }
  /*FEED-END*/

  /* ---------- главный тег ---------- */
  const catOf = e => String(e.cat || (e.tags || [])[0] || '').trim();
  const uniqTags = (arr, cat) => {
    const seen = new Set(cat ? [cat.toLowerCase()] : []);
    return arr.map(t => t.trim()).filter(t => t && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()));
  };
  function renderCats() {
    const n = {};
    list.forEach(e => { const c = catOf(e); if (c) n[c] = (n[c] || 0) + 1; });
    const cats = Object.keys(n).sort((a, b) => n[b] - n[a] || a.localeCompare(b, 'ru'));
    $('#cats').innerHTML = cats.map(c => `<option value="${esc(c)}">`).join('');
    $('#catpick').innerHTML = cats.map(c => `<button class="chip" type="button" data-c="${esc(c)}">${esc(c)}</button>`).join('');
  }
  $('#catpick').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    $('#f-cat').value = b.dataset.c;
  });

  /* ---------- картинки ---------- */
  const MAX_IMG = 8;
  let pics = []; // { path, preview } — уже в репо; { blob, preview } — ещё не загружена

  const fileApi = p => `/repos/${cfg.owner}/${cfg.repo}/contents/${p.split('/').map(encodeURIComponent).join('/')}`;
  const blobB64 = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(b); });

  async function shrink(file) {
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch { bmp = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); }); }
    const w0 = bmp.width || bmp.naturalWidth, h0 = bmp.height || bmp.naturalHeight;
    const k = Math.min(1, 1280 / Math.max(w0, h0));
    const c = document.createElement('canvas');
    c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const toBlob = (t, q) => new Promise(r => c.toBlob(r, t, q));
    let b = await toBlob('image/webp', .82);
    if (!b || b.type !== 'image/webp') b = await toBlob('image/jpeg', .85);
    return b;
  }

  async function putImage(blob, name, k) {
    const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/jpeg' ? 'jpg' : 'png';
    const stem = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'ext';
    const path = `img/${stem}-${Date.now().toString(36)}${k}.${ext}`;
    const r = await api(fileApi(path), { method: 'PUT', body: JSON.stringify({ message: 'Add image: ' + name, content: await blobB64(blob), branch: cfg.branch }) });
    if (!r.ok) {
      let m = ''; try { m = (await r.json()).message; } catch {}
      throw new Error('Картинка не загрузилась: ' + (m || r.status));
    }
    return { path, sha: (await r.json()).content.sha };
  }

  async function rmFile(path, sha) {
    if (!/^img\/[\w.-]+$/.test(path)) return;
    try {
      if (!sha) {
        const g = await api(`${fileApi(path)}?ref=${encodeURIComponent(cfg.branch)}&t=${Date.now()}`);
        if (!g.ok) return;
        sha = (await g.json()).sha;
      }
      await api(fileApi(path), { method: 'DELETE', body: JSON.stringify({ message: 'Remove image', sha, branch: cfg.branch }) });
    } catch {}
  }

  function renderThumbs() {
    $('#thumbs').innerHTML = pics.map((p, i) => `<div class="th${i ? '' : ' first'}" data-i="${i}"><img src="${esc(p.preview)}" alt=""><button class="rm" type="button" data-i="${i}" aria-label="Убрать">×</button></div>`).join('');
  }

  $('#add-img').addEventListener('click', () => $('#f-files').click());
  $('#f-files').addEventListener('change', async e => {
    const files = [...e.target.files].filter(f => f.type.startsWith('image/'));
    e.target.value = '';
    if (!files.length) return;
    const room = MAX_IMG - pics.length;
    if (room <= 0) return status(`Максимум ${MAX_IMG} картинок.`, 'err');
    busy(true); status('Сжимаю…');
    try {
      for (const f of files.slice(0, room)) {
        const blob = await shrink(f);
        pics.push({ blob, preview: URL.createObjectURL(blob) });
      }
      renderThumbs();
      if (files.length > room) status(`Влезло только ${room}, остальные пропущены.`, 'err'); else status('');
    } catch { status('Не смог прочитать картинку.', 'err'); }
    busy(false);
  });

  $('#thumbs').addEventListener('click', e => {
    const rm = e.target.closest('.rm');
    if (rm) {
      const [p] = pics.splice(+rm.dataset.i, 1);
      if (p.blob) URL.revokeObjectURL(p.preview);
      renderThumbs(); return;
    }
    const th = e.target.closest('.th');
    if (!th || th.dataset.i === '0') return;
    pics.unshift(...pics.splice(+th.dataset.i, 1));
    renderThumbs();
  });

  /* ---------- автозаполнение полей подключения ---------- */
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(LS) || '{}')); } catch {}
  if (!cfg.owner) {
    const m = location.hostname.match(/^(.+)\.github\.io$/);
    if (m) { cfg.owner = m[1]; cfg.repo = location.pathname.split('/')[1] || (m[1] + '.github.io'); }
  }
  $('#owner').value = cfg.owner; $('#repo').value = cfg.repo;
  $('#branch').value = cfg.branch || 'main'; $('#token').value = cfg.token || '';

  /* ---------- подключение ---------- */
  async function load() {
    const r = await api(`${base()}?ref=${encodeURIComponent(cfg.branch)}&t=${Date.now()}`);
    if (r.status === 404) { list = []; sha = null; return; }
    if (r.status === 401 || r.status === 403) throw new Error('Токен не подходит или нет прав Contents: Read and write.');
    if (!r.ok) throw new Error('GitHub ответил ошибкой ' + r.status);
    const j = await r.json();
    sha = j.sha;
    list = JSON.parse(fromB64(j.content.replace(/\n/g, '')) || '[]');
  }

  $('#connect').addEventListener('click', async () => {
    cfg.owner = $('#owner').value.trim();
    cfg.repo = $('#repo').value.trim();
    cfg.branch = $('#branch').value.trim() || 'main';
    cfg.token = $('#token').value.trim();
    if (!cfg.owner || !cfg.repo || !cfg.token) return status('Заполни аккаунт, репозиторий и токен.', 'err');
    busy(true); status('Подключаюсь…');
    try {
      await load();
      if ($('#remember').checked) localStorage.setItem(LS, JSON.stringify(cfg)); else localStorage.removeItem(LS);
      $('#p-add').hidden = false; $('#p-list').hidden = false;
      render(); status('Подключено ✓', 'ok');
    } catch (e) { status(e.message, 'err'); }
    busy(false);
  });

  /* ---------- подтянуть данные с GitHub ---------- */
  const parseUrl = u => { const m = u.match(/github\.com\/([^\/\s]+)\/([^\/\s#?]+)/i); return m ? { o: m[1], r: m[2].replace(/\.git$/, '') } : null; };
  const pretty = s => { s = s.replace(/[-_]+/g, ' ').trim(); return s.charAt(0).toUpperCase() + s.slice(1); };

  $('#pull').addEventListener('click', async () => {
    const p = parseUrl($('#url').value);
    if (!p) return status('Не похоже на ссылку GitHub-репозитория.', 'err');
    busy(true); status('Читаю репозиторий…');
    try {
      const r = await api(`/repos/${p.o}/${p.r}`);
      if (!r.ok) throw new Error(r.status === 404 ? 'Репозиторий не найден (или он приватный).' : 'GitHub ответил ошибкой ' + r.status);
      const j = await r.json();
      $('#f-name').value = pretty(j.name);
      $('#f-by').value = j.owner.login;
      $('#f-desc').value = j.description || '';
      const known = new Map(list.map(catOf).filter(Boolean).map(c => [c.toLowerCase(), c]));
      const topics = j.topics || [];
      const hit = topics.find(t => known.has(t.toLowerCase()));
      $('#f-cat').value = hit ? known.get(hit.toLowerCase()) : '';
      $('#f-tags').value = topics.filter(t => t !== hit).join(', ');
      $('#f-repo').value = j.html_url;
      status($('#f-cat').value ? 'Поля заполнены — проверь и отправляй.' : 'Поля заполнены. Выбери главный тег — и можно отправлять.', 'ok');
    } catch (e) { status(e.message, 'err'); }
    busy(false);
  });

  /* ---------- сохранение ---------- */
  async function save(message) {
    const body = { message, content: toB64(JSON.stringify(list, null, 2) + '\n'), branch: cfg.branch };
    if (sha) body.sha = sha;
    const r = await api(base(), { method: 'PUT', body: JSON.stringify(body) });
    if (!r.ok) {
      let m = ''; try { m = (await r.json()).message; } catch {}
      if (r.status === 409 || r.status === 422) throw new Error('Файл изменился в другом месте. Нажми «Подключиться» ещё раз и повтори.');
      throw new Error(m || 'Не удалось сохранить (' + r.status + ')');
    }
    sha = (await r.json()).content.sha;
  }

  $('#form').addEventListener('submit', async e => {
    e.preventDefault();
    const item = {
      name: $('#f-name').value.trim(),
      by: $('#f-by').value.trim(),
      desc: $('#f-desc').value.trim(),
      cat: $('#f-cat').value.trim(),
      tags: [],
      repo: $('#f-repo').value.trim()
    };
    item.tags = uniqTags($('#f-tags').value.split(','), item.cat);
    if (!item.name || !item.repo) return status('Нужны название и ссылка.', 'err');
    if (!item.cat) return status('Выбери главный тег.', 'err');
    item.added = (editing >= 0 && list[editing].added) || new Date().toISOString();
    const prev = list.slice();
    const wasEditing = editing;
    const oldImgs = wasEditing >= 0 ? (list[wasEditing].images || []) : [];
    const fresh = pics.filter(p => p.blob);
    busy(true);
    try {
      /* сначала картинки, потом JSON — чтобы в каталоге не было битых ссылок */
      let n = 0;
      for (const p of fresh) {
        status(`Загружаю картинки ${++n}/${fresh.length}…`);
        Object.assign(p, await putImage(p.blob, item.name, n));
      }
      if (pics.length) item.images = pics.map(p => p.path);
      status('Сохраняю…');
      if (wasEditing >= 0) list[wasEditing] = item; else list.push(item);
      await save((wasEditing >= 0 ? 'Update: ' : 'Add: ') + item.name);
      const feedOk = await feedSave();
      for (const p of oldImgs) if (!(item.images || []).includes(p)) await rmFile(p);
      resetForm(); render();
      status('Сохранено ✓ Сайт обновится через минуту.' + (feedOk ? '' : ' (RSS-ленту обновить не удалось.)'), 'ok');
    } catch (err) {
      list = prev; render(); status(err.message, 'err');
      /* откатываем уже залитые новые картинки, чтобы не копились сироты */
      for (const p of fresh) if (p.sha) { await rmFile(p.path, p.sha); delete p.path; delete p.sha; }
    }
    busy(false);
  });

  /* ---------- список ---------- */
  function render() {
    renderCats();
    $('#n').textContent = list.length ? `(${list.length})` : '';
    $('#list').innerHTML = list.length ? list.map((e, i) => `
      <li><div class="t"><b>${esc(e.name)}</b><span><em>${esc(catOf(e))}</em>${esc(e.by || '')}${(e.cat ? e.tags || [] : (e.tags || []).slice(1)).length ? ' · ' + esc((e.cat ? e.tags : e.tags.slice(1)).join(', ')) : ''}</span></div>
      <button data-a="edit" data-i="${i}">Править</button>
      <button class="del" data-a="del" data-i="${i}">Удалить</button></li>`).join('')
      : '<li class="none">Пока пусто — добавь первое расширение выше.</li>';
  }

  $('#list').addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    const i = +b.dataset.i, it = list[i];
    if (b.dataset.a === 'edit') {
      editing = i;
      $('#f-name').value = it.name; $('#f-by').value = it.by || ''; $('#f-desc').value = it.desc || '';
      $('#f-cat').value = catOf(it);
      $('#f-tags').value = (it.cat ? it.tags || [] : (it.tags || []).slice(1)).join(', '); $('#f-repo').value = it.repo;
      pics.forEach(p => p.blob && URL.revokeObjectURL(p.preview));
      pics = (it.images || []).map(p => ({ path: p, preview: p })); renderThumbs();
      $('#form-title').textContent = 'Правка: ' + it.name;
      $('#submit').textContent = 'Сохранить изменения'; $('#cancel').hidden = false;
      $('#p-add').scrollIntoView({ behavior: 'smooth' });
    } else if (b.dataset.a === 'del') {
      if (!confirm(`Удалить «${it.name}» из каталога?`)) return;
      const prev = list.slice(); list.splice(i, 1);
      busy(true); status('Удаляю…');
      try {
        await save('Remove: ' + it.name); await feedSave();
        for (const p of it.images || []) await rmFile(p);
        resetForm(); render(); status('Удалено ✓', 'ok');
      }
      catch (err) { list = prev; render(); status(err.message, 'err'); }
      busy(false);
    }
  });

  function resetForm() {
    editing = -1; $('#form').reset(); $('#url').value = '';
    pics.forEach(p => p.blob && URL.revokeObjectURL(p.preview)); pics = []; renderThumbs();
    $('#form-title').textContent = '2 · Добавить расширение';
    $('#submit').textContent = 'Отправить в каталог'; $('#cancel').hidden = true;
  }
  $('#cancel').addEventListener('click', resetForm);

  /* авто-подключение, если токен уже сохранён */
  if (cfg.owner && cfg.repo && cfg.token) $('#connect').click();
})();
