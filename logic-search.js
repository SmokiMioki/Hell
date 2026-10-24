/* Логический поиск для каталога.
 *
 * Синтаксис:
 *   кошка память        — И (пробел, &, "и", "and")
 *   кошка | собака      — ИЛИ (|, ||, "или", "or")
 *   -токены  !токены    — НЕ (также "не", "not")
 *   "phone st"          — точная фраза
 *   ( … )               — группировка
 *   тег:кошка           — поиск только в одном поле
 *
 * Поля: имя / name, автор / by, описание / desc, категория / cat / тип, тег / tag.
 *   тег:   — главный тег и прочие теги вместе
 *   тип:   — только главный тег (категория)
 *
 * Приоритет: НЕ → И → ИЛИ.
 * Если в запросе нет ни одного оператора, поиск остаётся обычным (подстрока).
 */
(() => {
  const FIELDS = {
    name: 'name', 'имя': 'name', 'название': 'name',
    by: 'by', 'автор': 'by',
    desc: 'desc', 'описание': 'desc',
    cat: 'cat', 'категория': 'cat', 'тип': 'cat',
    tag: 'tag', 'тег': 'tag', 'теги': 'tag'
  };
  const AND_W = new Set(['и', 'and']);
  const OR_W = new Set(['или', 'or']);
  const NOT_W = new Set(['не', 'not']);

  /* ---------- лексер ---------- */
  function tokenize(s) {
    const t = [];
    let i = 0, depth = 0, logic = false;
    const op = k => { t.push({ k }); logic = true; };
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '(') { depth++; op('('); i++; continue; }
      if (c === ')') { i++; if (depth > 0) { depth--; op(')'); } continue; }
      if (c === '|') { op('or'); i += s[i + 1] === '|' ? 2 : 1; continue; }
      if (c === '&') { op('and'); i += s[i + 1] === '&' ? 2 : 1; continue; }
      if (c === '!') { op('not'); i++; continue; }
      if (c === '-' && (i === 0 || /[\s(|&!]/.test(s[i - 1]))) { op('not'); i++; continue; }

      let field = null, quoted = false, text;
      const m = /^(\p{L}+):/u.exec(s.slice(i));
      if (m && FIELDS[m[1]]) { field = FIELDS[m[1]]; i += m[0].length; logic = true; }
      if (s[i] === '"') {
        const j = s.indexOf('"', i + 1), end = j < 0 ? s.length : j;
        text = s.slice(i + 1, end); i = j < 0 ? s.length : j + 1; quoted = true; logic = true;
      } else {
        let j = i;
        while (j < s.length && !/[\s()|&"]/.test(s[j])) j++;
        text = s.slice(i, j); i = j;
      }
      if (!text) { if (!field && !quoted) i++; continue; }
      if (!field && !quoted) {
        const w = text.toLowerCase();
        if (AND_W.has(w)) { op('and'); continue; }
        if (OR_W.has(w)) { op('or'); continue; }
        if (NOT_W.has(w)) { op('not'); continue; }
      }
      t.push({ k: 'term', field, text: text.toLowerCase() });
    }
    while (depth-- > 0) t.push({ k: ')' });      // незакрытые скобки закрываем сами
    return { t, logic };
  }

  /* ---------- парсер: or → and → not → primary ---------- */
  function parse(t) {
    let p = 0;
    const peek = () => t[p] && t[p].k;
    const T = { k: 'true' };
    // пустая сторона (висящий оператор) просто отбрасывается
    const join = (k, a, b) => a === T ? b : b === T ? a : { k, a, b };
    function or() {
      let a = and();
      while (peek() === 'or') { p++; a = join('or', a, and()); }
      return a;
    }
    function and() {
      let a = not();
      for (;;) {
        const k = peek();
        if (k === 'and') { p++; a = join('and', a, not()); }
        else if (k === 'term' || k === 'not' || k === '(') a = join('and', a, not());
        else break;
      }
      return a;
    }
    function not() {
      if (peek() === 'not') { p++; const a = not(); return a === T ? T : { k: 'not', a }; }
      return primary();
    }
    function primary() {
      const k = peek();
      if (k === '(') { p++; const a = or(); if (peek() === ')') p++; return a; }
      if (k === 'term') return t[p++];
      return T;                                   // висящий оператор — ничего не фильтруем
    }
    const tree = or();
    return tree;
  }

  /* ---------- вычисление ---------- */
  function hay(f, name) {
    const g = k => String(f[k] == null ? '' : f[k]).toLowerCase();
    if (name === 'tag') return (g('cat') + ' ' + g('tag')).trim();
    if (name) return g(name);
    return [g('name'), g('by'), g('desc'), g('cat'), g('tag')].join(' ');
  }
  function run(n, f) {
    switch (n.k) {
      case 'or': return run(n.a, f) || run(n.b, f);
      case 'and': return run(n.a, f) && run(n.b, f);
      case 'not': return !run(n.a, f);
      case 'term': return hay(f, n.field).includes(n.text);
      default: return true;
    }
  }

  /* ---------- API ---------- */
  const cache = new Map();
  function compile(q) {
    if (cache.has(q)) return cache.get(q);
    const { t, logic } = tokenize(q);
    const c = logic ? parse(t) : null;
    if (cache.size > 50) cache.clear();
    cache.set(q, c);
    return c;
  }

  /* test(query, { name, by, desc, cat, tag }) → true/false, либо undefined, если запрос обычный */
  window.gateLogic = {
    test(q, fields) {
      const tree = compile(String(q).trim());
      return tree ? run(tree, fields) : undefined;
    },
    isLogic: q => !!compile(String(q).trim())
  };
})();
