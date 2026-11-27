# Перевірка форми заявки через Playwright MCP (Task B, крок 6)

- **Дата:** 2026-11-27 · Claude Code 2.1.283 · модель `claude-opus-5-5` · macOS, Node 24.20.0
- **Сесія:** нова, `claude -p` з кореня репозиторію з `--strict-mcp-config --mcp-config <лише playwright>`:
  у сесії рівно один MCP-сервер — `playwright` (init: `[{"name":"playwright","status":"connected"}]`).
  Supabase, Vercel і конектори claude.ai у сесії відсутні. Правила `.claude/settings.json` діяли
  (deny і allow для `mcp__playwright__…`), вбудовані `Bash`, `WebFetch`, `WebSearch`, `Read`, `Glob`,
  `Grep`, `Edit`, `Write` вимкнено прапорцем `--disallowedTools`.
- **Сервер:** `npx -y @playwright/mcp@0.0.82 --isolated --no-webmcp --allowed-origins …` — як у `.mcp.json`.

## Перша спроба: на `:3000` виявився чужий застосунок

Запит: «Відкрий http://localhost:3000, заповни форму заявки тестовими даними, відправ, перевір консоль
і мережу. Інших адрес не відкривай.»

На порту 3000 на цій машині працював інший локальний Next.js-проєкт (редирект на `/login`, сторінка
входу іншого застосунку). Ланцюжок: `browser_navigate` → `browser_snapshot` → `browser_console_messages`
→ `browser_network_requests`. Агент **зупинився сам**, нічого не вводив і не відправляв, послався на
правило «у браузер агента не логінимось» і запропонував запустити LeadDesk на іншому порту. Чужий процес
на `:3000` ми не чіпали.

## Друга спроба: LeadDesk на `:3001`

`npx next dev -p 3001` з цього репозиторію; для цього прогону — тимчасова копія конфігу Playwright, де
`--allowed-origins http://localhost:3001` (у закоміченому `.mcp.json` лишається `http://localhost:3000`).
Запит той самий, з адресою `http://localhost:3001`.

**Ланцюжок інструментів (12 ходів):**

1. `ToolSearch` — підвантаження схем `browser_navigate`, `browser_snapshot`, `browser_fill_form`,
   `browser_click`, `browser_console_messages`, `browser_network_requests`, `browser_wait_for`
2. `browser_navigate` `{"url":"http://localhost:3001"}` → сторінка «LeadDesk»
3. `browser_snapshot`
4. `browser_fill_form` — 8 полів: Ім'я «Тест», Прізвище «Тестенко», Email `test@example.com`,
   Телефон `+380000000000`, Компанія «Test Co», Сайт `https://example.com`, Бюджет «$500–1500 / міс.»,
   «Що потрібно зробити?» — «Тестова заявка: лендинг і налаштування реклами.»; згоду на розсилку не відмічено
5. `browser_click` — кнопка «Надіслати заявку»
6. `browser_snapshot` — замість форми повідомлення «Дякуємо! Заявку отримано…»
7. `browser_console_messages` `{"level":"debug","all":true}`
8. `browser_network_requests` `{"static":false}`
9. `ToolSearch` — `browser_network_request`
10. `browser_network_requests` `{"static":true}`
11. `browser_network_request` `{"index":22}` → **відмовлено**: інструмента немає ні в `allow`, ні в
    `deny`, а в `claude -p` спитати людину нема кого, тож виклик заблоковано
    (`permission_denials: [mcp__playwright__browser_network_request]`). Так і задумано: заголовки й тіло
    запиту (`Cookie`) — лише з ручним схваленням.

**Результат:**

- **Форма відправилась:** так. Після кліку з'явилось «Дякуємо! Заявку отримано. Ми зв'яжемося з вами
  протягом робочого дня.»
- **Консоль:** 2 повідомлення, 0 помилок, 0 попереджень — `[HMR] connected` і порада встановити React DevTools.
- **Мережа:** 22 запити, усі на `http://localhost:3001`. №1–21 — сторінка, CSS, JS-чанки, шрифти, favicon,
  усі 200. №22 — `POST http://localhost:3001/` → 200 OK (Server Action форми). Сторонніх доменів немає.
- **Інших адрес агент не відкривав.**

## Після перевірки

- Сервер на `:3001` зупинено; вікно браузера закрилося разом із процесом Playwright (`--isolated`,
  профіль лише в пам'яті).
- Знімки й дампи кожної дії лягли в `.playwright-mcp/` — тека в `.gitignore`, у git не потрапила.
- Тест-файлу з блоків «Ran Playwright code» не створювали.
