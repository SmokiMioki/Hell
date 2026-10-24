/* Умный поиск для каталога.
 *
 * Что умеет:
 *   • синонимы:      «картинки» находит «изображения», «арт», «галерея»; «rp» — «ролевая игра» и т. д.
 *   • морфологию:    «персонажей» = «персонаж» = «персонажи» (падежи, числа, окончания)
 *   • ё = е:         «чёрный» = «черный»
 *   • опечатки:      одна лишняя / пропущенная / переставленная буква («картинки» ← «катринки»)
 *   • частичный ввод: «изобр» → «изображения»
 *   • точную подстроку (как раньше): «st» найдёт «ST Facets».
 *
 * Чтобы добавить синонимы — допиши группу в GROUPS ниже: слова одной группы считаются равнозначными.
 * Слова пиши в начальной форме, форму поиск подберёт сам. Фразы из нескольких слов тоже можно.
 */
(() => {
  const root = typeof window !== 'undefined' ? window : globalThis;

  const norm = s => String(s == null ? '' : s).toLowerCase().replace(/ё/g, 'е');
  const words = s => norm(s).match(/[a-zа-я0-9+]+/g) || [];

  /* ---------- «лёгкий» стеммер: отбрасывает окончания ---------- */
  const SUF = /(ами|ями|ого|его|ому|ему|ыми|ими|ией|ием|ов|ев|ей|ом|ем|ах|ях|ам|ям|ой|ую|юю|ая|яя|ое|ее|ые|ие|ий|ый)$/;
  const stemCache = new Map();
  function stem(w) {
    if (stemCache.has(w)) return stemCache.get(w);
    let s = w;
    if (/^[a-z0-9+]+$/.test(w)) {                     // латиница: убираем -s / -es / -ing / -ed
      if (w.length > 4) s = w.replace(/(ing|ed|es|s)$/, '');
    } else if (w.length > 3) {
      const n = s.replace(SUF, '');
      if (n.length >= 3) s = n;
      for (let i = 0; i < 2 && s.length > 3; i++) {   // хвостовые гласные: изображени-я → изображен
        const m = s.replace(/[аяуюоеыиэйь]$/, '');
        if (m.length >= 3) s = m; else break;
      }
    }
    if (stemCache.size > 4000) stemCache.clear();
    stemCache.set(w, s);
    return s;
  }
  const stems = s => words(s).map(stem);

  /* основа s найдена среди основ слов документа hw.
     Слово, которое ввёл сам человек, ищем по началу слова (от 4 букв);
     слово-синоним — строже (по началу слова от 5 букв, короткие только целиком), чтобы «карт» не цеплял «карточки». */
  const has = (hw, s) => s.length >= 4 ? hw.some(w => w.startsWith(s)) : hw.includes(s);
  const hasStrict = (hw, s) => s.length >= 5 ? hw.some(w => w.startsWith(s)) : hw.includes(s);

  /* расстояние Дамерау — Левенштейна, с отсечкой по максимуму */
  function dist(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    const d = [];
    for (let i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const c = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
    return d[a.length][b.length];
  }

  /* ---------- группы синонимов ---------- */
  const GROUPS = [
    // картинки
    ['изображение', 'картинка', 'арт', 'фото', 'фотография', 'иллюстрация', 'рисунок', 'графика', 'галерея', 'image', 'picture', 'pic', 'img', 'art', 'gallery'],
    ['аватар', 'аватарка', 'юзерпик', 'userpic', 'avatar', 'pfp', 'портрет', 'спрайт', 'sprite'],
    ['скрыть', 'скрытие', 'спрятать', 'hide', 'размытие', 'blur', 'затемнение', 'спойлер'],
    // ролевка, персонажи, миры
    ['ролевая игра', 'ролевка', 'рп', 'rp', 'rpg', 'ролеплей', 'roleplay', 'role-play', 'отыгрыш', 'отыгрывать'],
    ['персонаж', 'герой', 'чар', 'char', 'character', 'карточка персонажа', 'нпс', 'npc', 'персона'],
    ['лорбук', 'лор', 'lorebook', 'lore', 'world info', 'wi', 'книга мира'],
    ['миростроение', 'worldbuilding', 'world building', 'мир', 'сеттинг', 'setting', 'вселенная', 'альтернативные вселенные'],
    ['сцена', 'scene', 'режиссура', 'режиссер', 'director', 'постановка'],
    ['сюжет', 'история', 'сторилайн', 'story', 'plot', 'повествование', 'нарратив', 'storyline', 'сторителлинг'],
    ['отношения', 'романтика', 'relationship', 'романс', 'romance', 'любовь', 'романтический'],
    ['эмоция', 'настроение', 'чувство', 'emotion', 'mood'],
    ['хаос', 'random', 'случайный', 'рандом', 'рандомный', 'chaos', 'непредсказуемый', 'неожиданный', 'шанс'],
    ['визуальная новелла', 'vn', 'визуальный роман', 'новелла', 'visual novel'],
    ['игра', 'мини-игра', 'game', 'геймификация', 'гейм', 'головоломка', 'квест'],
    ['достижение', 'ачивка', 'награда', 'achievement', 'trophy', 'трофей'],
    // чат и сообщения
    ['чат', 'переписка', 'диалог', 'беседа', 'chat', 'чатик'],
    ['сообщение', 'месседж', 'реплика', 'message', 'msg', 'пост'],
    ['мессенджер', 'телеграм', 'telegram', 'messenger', 'тг', 'tg'],
    ['телефон', 'смартфон', 'мобильный', 'phone', 'mobile', 'мобила', 'мобильник', 'андроид', 'android'],
    ['звонок', 'вызов', 'call', 'созвон'],
    ['свайп', 'swipe', 'регенерация', 'regen', 'перегенерация', 'reroll'],
    ['ветвление', 'branch', 'ветка', 'форк', 'fork', 'ветвь'],
    // оформление и интерфейс
    ['тема', 'оформление', 'скин', 'дизайн', 'внешний вид', 'theme', 'skin', 'design'],
    ['стиль', 'css', 'style', 'кастомизация', 'кастом', 'custom'],
    ['интерфейс', 'ui', 'gui', 'interface', 'оболочка'],
    ['анимация', 'animation', 'эффект', 'effect', 'анимированный', 'vfx'],
    ['плавающий', 'floating', 'окно', 'window', 'панель', 'panel', 'попап', 'popup', 'модальное', 'диалоговое окно'],
    ['перетаскивание', 'drag', 'drag-and-drop', 'dnd', 'перенос', 'перетащить'],
    ['уведомление', 'оповещение', 'notification', 'нотификация', 'пуш', 'push', 'toast', 'тост'],
    // ИИ, текст, контекст
    ['ии', 'ai', 'нейросеть', 'нейронка', 'llm', 'ллм', 'модель', 'gpt', 'искусственный интеллект'],
    ['бот', 'bot', 'агент', 'agent', 'помощник', 'ассистент', 'assistant'],
    ['промпт', 'prompt', 'инструкция', 'системный промпт'],
    ['пресет', 'preset', 'шаблон', 'template', 'конфиг', 'профиль', 'profile'],
    ['токен', 'token'],
    ['контекст', 'context', 'контекстное окно'],
    ['память', 'воспоминание', 'memory', 'мемори', 'запоминание', 'долговременная память'],
    ['суммаризация', 'саммари', 'резюме', 'summary', 'summarize', 'сводка', 'краткое содержание', 'конспект'],
    ['генерация', 'создание', 'генератор', 'generate', 'generation', 'gen', 'генерировать'],
    ['перевод', 'переводчик', 'translate', 'translation', 'translator', 'локализация'],
    ['цитата', 'quote', 'высказывание'],
    ['редактирование', 'редактор', 'edit', 'editor', 'править', 'исправление', 'исправить', 'fix', 'правка'],
    // звук, время, карты
    ['музыка', 'аудио', 'звук', 'трек', 'радио', 'плейлист', 'плеер', 'music', 'audio', 'sound', 'song', 'песня', 'саундтрек'],
    ['время', 'таймлайн', 'хронология', 'дата', 'time', 'clock', 'timeline', 'календарь', 'часы', 'date'],
    ['карта', 'map', 'интерактивная карта', 'локация', 'location', 'география'],
    // данные и файлы
    ['удаление', 'удалить', 'очистка', 'чистка', 'delete', 'clear', 'cleanup', 'clean', 'стереть', 'убрать', 'wipe'],
    ['резервная копия', 'бэкап', 'бекап', 'backup', 'копия', 'резервирование'],
    ['сохранение', 'автосохранение', 'save', 'сейв', 'autosave', 'сохранить'],
    ['закладка', 'bookmark', 'избранное', 'favorite', 'favourite', 'фаворит'],
    ['заметка', 'записка', 'note', 'дневник', 'журнал', 'блокнот', 'diary', 'journal', 'log'],
    ['папка', 'folder', 'директория', 'организация', 'сортировка', 'sort', 'упорядочить'],
    ['поиск', 'search', 'найти', 'искать', 'find', 'lookup'],
    ['фильтр', 'фильтрация', 'filter', 'отфильтровать'],
    ['скрипт', 'script', 'js', 'javascript', 'код', 'code'],
    ['расширение', 'плагин', 'аддон', 'дополнение', 'extension', 'plugin', 'addon', 'add-on', 'мод', 'mod', 'надстройка'],
    ['менеджер', 'manager', 'управление', 'управлять', 'organizer', 'контроль'],
    ['статистика', 'аналитика', 'stats', 'statistics', 'analytics', 'метрики', 'расход', 'трекер', 'tracker', 'счетчик', 'counter'],
    ['мониторинг', 'monitor', 'наблюдатель', 'слежение', 'отслеживание', 'tracking', 'watch', 'watcher', 'observer', 'наблюдение'],
    ['безопасность', 'safety', 'security', 'защита', 'приватность', 'privacy', 'антиспам', 'spam', 'спам'],
    ['nsfw', '18+', 'взрослый']
  ];
  const GROUPS_N = GROUPS.map(g => g.map(norm));

  /* слово запроса попадает в группу, если совпало с её членом (точно, по основе или по началу слова) */
  function memberHit(m, q, qs) {
    if (m === q) return true;
    if (m.indexOf(' ') >= 0) return false;            // фразу-члена цепляем только целиком (m === q)
    const ms = stem(m);
    if (ms === qs) return true;
    return qs.length >= 4 && ms.length >= 4 && ms.startsWith(qs);   // частичный ввод: «изобр» → «изображение»
  }

  const expCache = new Map();
  /* → список «вариантов»; вариант = массив основ, которые должны найтись все */
  function expand(q) {
    if (expCache.has(q)) return expCache.get(q);
    const qs = stem(q);
    const out = [[qs]];
    let hit = false;
    GROUPS_N.forEach(g => {
      if (!g.some(m => memberHit(m, q, qs))) return;
      hit = true;
      g.forEach(m => out.push(stems(m)));
    });
    if (!hit && qs.length >= 5) {                     // опечатка в слове из словаря синонимов
      GROUPS_N.forEach(g => {
        if (!g.some(m => m.indexOf(' ') < 0 && stem(m).length >= 5 && dist(stem(m), qs, 1) <= 1)) return;
        g.forEach(m => out.push(stems(m)));
      });
    }
    if (expCache.size > 300) expCache.clear();
    expCache.set(q, out);
    return out;
  }

  /* ---------- API ---------- */
  /* match(текст, слово, { exact }) → подходит ли слово запроса к тексту */
  function match(h, term, opts) {
    const q = norm(term).trim();
    if (!q) return true;
    const H = norm(h);
    if (H.includes(q)) return true;                   // как раньше: подстрока
    if (opts && opts.exact) return false;             // «в кавычках» — только точная фраза

    const hw = stems(h);
    const qw = words(q);
    if (!qw.length) return false;
    if (qw.length > 1) return qw.every(w => match(h, w));

    const variants = expand(qw[0]);
    for (let i = 0; i < variants.length; i++) {
      const test = i === 0 ? has : hasStrict;         // variants[0] — само слово запроса
      if (variants[i].every(s => test(hw, s))) return true;
    }

    const qs = stem(qw[0]);                           // опечатка на одну букву
    if (qs.length >= 5) for (const w of hw) if (w.length >= 4 && dist(w, qs, 1) <= 1) return true;
    return false;
  }

  /* matchAll(текст, запрос) — каждое слово запроса должно подойти */
  function matchAll(h, query) {
    const q = norm(query).trim();
    if (!q) return true;
    if (norm(h).includes(q)) return true;
    return q.split(/\s+/).every(t => match(h, t));
  }

  root.gateSmart = { match, matchAll, expand, stem };
})();
