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
      $('#f-tags').value = (j.topics || []).join(', ');
      $('#f-repo').value = j.html_url;
      status('Поля заполнены — проверь и отправляй.', 'ok');
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
      tags: $('#f-tags').value.split(',').map(t => t.trim()).filter(Boolean),
      repo: $('#f-repo').value.trim()
    };
    if (!item.name || !item.repo) return status('Нужны название и ссылка.', 'err');
    item.added = (editing >= 0 && list[editing].added) || new Date().toISOString();
    const prev = list.slice();
    const wasEditing = editing;
    if (editing >= 0) list[editing] = item; else list.push(item);
    busy(true); status('Сохраняю…');
    try {
      await save((wasEditing >= 0 ? 'Update: ' : 'Add: ') + item.name);
      const feedOk = await feedSave();
      resetForm(); render();
      status('Сохранено ✓ Сайт обновится через минуту.' + (feedOk ? '' : ' (RSS-ленту обновить не удалось.)'), 'ok');
    } catch (err) { list = prev; render(); status(err.message, 'err'); }
    busy(false);
  });

  /* ---------- список ---------- */
  function render() {
    $('#n').textContent = list.length ? `(${list.length})` : '';
    $('#list').innerHTML = list.length ? list.map((e, i) => `
      <li><div class="t"><b>${esc(e.name)}</b><span>${esc(e.by || '')} · ${esc((e.tags || []).join(', '))}</span></div>
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
      $('#f-tags').value = (it.tags || []).join(', '); $('#f-repo').value = it.repo;
      $('#form-title').textContent = 'Правка: ' + it.name;
      $('#submit').textContent = 'Сохранить изменения'; $('#cancel').hidden = false;
      $('#p-add').scrollIntoView({ behavior: 'smooth' });
    } else if (b.dataset.a === 'del') {
      if (!confirm(`Удалить «${it.name}» из каталога?`)) return;
      const prev = list.slice(); list.splice(i, 1);
      busy(true); status('Удаляю…');
      try { await save('Remove: ' + it.name); await feedSave(); resetForm(); render(); status('Удалено ✓', 'ok'); }
      catch (err) { list = prev; render(); status(err.message, 'err'); }
      busy(false);
    }
  });

  function resetForm() {
    editing = -1; $('#form').reset(); $('#url').value = '';
    $('#form-title').textContent = '2 · Добавить расширение';
    $('#submit').textContent = 'Отправить в каталог'; $('#cancel').hidden = true;
  }
  $('#cancel').addEventListener('click', resetForm);

  /* авто-подключение, если токен уже сохранён */
  if (cfg.owner && cfg.repo && cfg.token) $('#connect').click();
})();
