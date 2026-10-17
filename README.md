# Врата расширений

Каталог расширений для SillyTavern в мрачной эстетике «Адской девочки». Чистый HTML/CSS/JS, без сборки.

## Файлы

| Файл | Зачем |
|---|---|
| `index.html`, `style.css`, `script.js` | сам сайт |
| `intro.css`, `intro.js` | заставка с огоньком и свет от курсора |
| `features.css`, `theme.js` | нить между карточками, эпиграф, счётчик, свеча-переключатель темы |
| `feed.xml` | RSS-лента новинок (админка обновляет её сама) |
| `extensions.json` | список расширений (его правит админ-страница, руками не нужно) |
| `admin.html`, `admin.js`, `admin.css` | страница `/admin.html`, где ты добавляешь расширения |

## Публикация

1. Создай репозиторий на GitHub и загрузи все файлы в корень.
2. Settings → Pages → Deploy from a branch → `main` / `(root)` → Save.
3. Сайт будет по адресу `https://USERNAME.github.io/REPO/`.

## Добавление расширений через сайт

1. Открой `https://USERNAME.github.io/REPO/admin.html`.
2. Создай токен: [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new) → Only select repositories → репозиторий сайта → Contents: **Read and write**.
3. Вставь токен, нажми «Подключиться» (при «запомнить» делать это нужно один раз на устройстве).
4. Вставь ссылку на репозиторий расширения → «Подтянуть» → «Отправить в каталог».
5. Через минуту каталог обновится.

Токен хранится только в браузере и уходит только на api.github.com.

## Под себя

- Цвета: переменные в начале `style.css`.
- Тексты: `index.html`.
