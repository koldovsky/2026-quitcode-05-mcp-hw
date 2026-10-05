# Підключення MCP-серверів LeadDesk (Task B)

- **Акаунти** (особисті, без клієнтських організацій і команд): Supabase — особистий акаунт, окрема
  організація на Free-плані з одним одноразовим проєктом для цієї домашки · Vercel — особистий
  Hobby-акаунт (одна особиста команда, без клієнтських) · Figma — не використовували
- **Третій сервер:** Playwright — акаунт не потрібен і немає квоти викликів (у Figma Starter — 20 на
  місяць на все), а перевірка форми в браузері прямо стосується застосунку, який ми деплоїмо.
- **Vercel CLI на цій машині:** не встановлено (`command -v vercel` → not found, теки конфігурації CLI
  немає). Пропозицію агента запустити `npx vercel inspect --logs` відхилено.

## Сервери

| Сервер | Який доступ | Навіщо нам | Що станеться при компрометації | Чим саме звужено |
|---|---|---|---|---|
| `supabase` | 9 інструментів на один проєкт: 7 лише читають (`search_docs`, `list_tables`, `list_extensions`, `list_migrations`, `get_project_url`, `get_publishable_keys`, `generate_typescript_types`), 2 пишуть (`apply_migration`, `execute_sql`). `execute_sql` ходить як `postgres` — не суперюзер, але власник `public.leads`, RLS на нього не діє: читає й змінює всі рядки, будь-який SQL у межах проєкту | Міграція схеми й сид 20 лідів для Task C | Повний доступ до бази одноразового проєкту: читання й зміна всіх таблиць, `drop`, будь-які дані (тут — синтетичні); видача publishable-ключа й URL проєкту. Інших проєктів і організацій акаунта не видно | URL: `project_ref=…` (прив'язка до одного проєкту, з схем зникає `project_id`), `features=database,development,docs` — немає `account` (9 інструментів на кшталт `list_organizations`, `create_project`), `functions` (канал назовні), `branching` (платне). `read_only=true` не ставимо: треба `apply_migration`. На клієнті: `execute_sql` і `apply_migration` не в `allow` — кожен виклик схвалюю вручну |
| `vercel` | OAuth зі скоупом `openid` — токен рівний моєму користувачу Vercel цілком: деплої, проєкти, покупки, toolbar-коментарі. Читання деплоїв і метаданих працює; лог білду через MCP отримати не вдалося (404/401) | Знайти деплой і лог білду | Списання з картки (`buy_*`), деплой у production, публічні посилання в обхід Deployment Protection, коментарі від мого імені в toolbar клієнта, читання всіх проєктів акаунта | Звузити на сервері нічим (один скоуп, URL без проєкту). На клієнті: `deny` на всі 11 інструментів, що змінюють стан (`buy_pro`, `buy_credits`, `buy_addon`, `buy_domain`, `deploy_to_vercel`, `get_access_to_vercel_url`, `import-claude-design-from-url`, 4 toolbar); `allow` — лише 3 точні імені на читання. CLI не встановлено, тож `use_vercel_cli` нікуди не веде |
| `playwright` | Локальний браузер Chromium під керуванням агента: відкривати сторінки, читати DOM, консоль, мережу, кліки й введення. Після deny — 21 інструмент | Перевірити форму заявки на `localhost:3000` | Канал виносу назовні: агент може відкрити будь-яку адресу й передати в URL чи формі дані з контексту сесії. Без deny — виконання коду на машині (`browser_run_code_unsafe`, «RCE-equivalent») і читання файлів проєкту, зокрема `.env.local` (`browser_file_upload`, `browser_drop`) | Точна версія `@playwright/mcp@0.0.82` (не плаваючий тег), `--isolated` (профіль лише в пам'яті, без логінів), `--no-webmcp` (сторінка не додає інструментів), `--allowed-origins http://localhost:3000` (зручність, не межа безпеки). `deny`: `browser_run_code_unsafe`, `webmcp_*`, `browser_file_upload`, `browser_drop`, `browser_evaluate`. `allow`: 10 точних імен для перевірки форми; `browser_network_request` (заголовки з `Cookie`) — ні там, ні там, щоразу питає |

## Supabase: схема й сид

- Міграція `supabase/migrations/0001_leaddesk.sql` створює таблицю `public.leads` (id, full_name,
  company, email, source, status з `check` на 5 статусів, budget, message, created_at), індекси за
  `status` і `created_at`, RLS без політик.
- Сид `supabase/seed/leads.sql`: 20 рядків, `lead_0001`–`lead_0020`, ті самі, що в `materials/leads.json`
  (порівняно поле за полем — 0 розбіжностей; у базі new 6 / contacted 4 / qualified 3 / won 5 / lost 2).
- Скільки інструментів Supabase видно в `/mcp` із нашим URL: 9.
- Якими викликами створено схему й дані: `apply_migration` (`0001_leaddesk`) і `execute_sql` (insert на
  20 рядків, потім перевірочні `select`). Кожен виклик схвалено вручну, жодного не відхилено.

## Сесії: що вмикаємо разом

У кожній сесії — щонайбільше один сервер із правом запису; браузерний сервер — ніколи разом із Supabase.
Конектори з акаунта claude.ai (Supabase, Vercel, Gmail, n8n, Make, Airtable …) з'являються в кожній
сесії незалежно від `.mcp.json` — їх теж вимикаємо в `/mcp`.

| Крок | Увімкнено в `/mcp` | Сервер із правом запису в цій сесії |
|---|---|---|
| Вхід (OAuth) | `supabase`, `vercel` — лише автентифікація, агенту нічого не писали | — |
| Міграція й сид | `supabase` | `supabase` |
| Лог білду | `vercel` | —, записуючі інструменти під deny |
| Знімок «до» / «після» | `playwright` | — (нічого не викликали) |
| Перевірка форми в браузері | `playwright` (Supabase, Vercel і всі конектори claude.ai вимкнено) | `playwright` (браузер) |

## До і після звуження: третій сервер

- Як отримали перелік: нова сесія лише з `playwright`, запит «Перелічи всі інструменти сервера
  playwright, які тобі зараз доступні. Нічого не викликай.» — до і після додавання deny.
- `docs/mcp/evidence/mcp-before.txt`: 25 інструментів
- `docs/mcp/evidence/mcp-after.txt`: 21 інструмент; зникли: `browser_run_code_unsafe`,
  `browser_file_upload`, `browser_drop`, `browser_evaluate` (`webmcp_*` не було й до — діє `--no-webmcp`).
