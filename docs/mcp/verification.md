# Перевірка (Task A, Task B, бонус E)

- **Інструмент і версія, модель:** Claude Code 2.1.283 · `claude-opus-5-5`
- **ОС і термінал, Node:** macOS 26.5 · zsh · Node 24.20.0 · MCP Inspector 2.8.0

## Task A — сервер в Inspector

- Команди, якими зроблено чотири файли в `docs/mcp/`: як у walkthrough, Task A, крок 4, з кореня
  репозиторію (`npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs …`).
  Кожен виклик — свіжий процес, тож `lead_0002` щоразу стартує зі статусом `new`.
- `tools-list.json`: два інструменти. `leaddesk_find_leads` — `"readOnlyHint": true`, параметри `status`
  (enum `new|contacted|qualified|won|lost|any`) і `limit` (1–50, за замовчуванням 10).
  `leaddesk_set_lead_status` — `"readOnlyHint": false`, параметри `leadId` (`^lead_\d{4}$`), `status`
  (enum п'яти статусів), `reason` (3–500). У кожного параметра є `description` з `.describe(…)`; опис
  інструмента зміни починається з «ЗМІНЮЄ ДАНІ» і просить підтвердження людини.
- `bad-input.json`: `leadId=nope`, `reason=ok` → `"isError": true`, текст «Input validation error: …
  leadId: Invalid string: must match pattern /^lead_\d{4}$/, reason: Too small: expected string to have
  >=3 characters». Inspector завершився з кодом **5** і надрукував у stderr
  `{"error":{"code":"tool_is_error",…}}`.
- Бізнес-помилки (не в артефактах, перевірено тими самими командами): `lead_0099` → `isError: true`,
  «Ліда lead_0099 немає в LeadDesk. Знайдіть правильний ідентифікатор через leaddesk_find_leads
  (status: "any")»; `lead_0001` → `qualified` → `isError: true`, «уже має статус qualified. Нічого не змінено».
- `set-status.json`: `lead_0002` (Rynok Books) `new` → `contacted`; запис аудиту в `structuredContent.audit`:
  `{ "action": "lead.status_changed", "leadId": "lead_0002", "at": "2026-11-27T15:27:34.104Z", "from": "new",
  "to": "contacted", "reason": "перевірка в Inspector", "actor": "mcp:leaddesk" }`. У stderr сервера —
  лише `[leaddesk] lead.status_changed lead_0002 new -> contacted`, без персональних даних.
- `resource-read.json`: `leaddesk://reference/statuses`, `"mimeType": "text/markdown"`, таблиця з п'яти
  статусів: що означає і коли переводимо.
- `leaddesk_find_leads` проти ключа A/B: `qualified` → 3 (`lead_0001`, `lead_0013`, `lead_0015`);
  `won` з `limit=50` → 5, бюджети 5000 + 1000 + 2500 + 500 = 9000, `lead_0006` без бюджету.
- Самоперевірка walkthrough: `grep -c '"isError": true' bad-input.json` → 1; `"action" "at" "leadId"` у
  `set-status.json`; `grep -rc 'console\.log' mcp/leaddesk-server/src` → 0; `cmp` фікстури з
  `materials/leads.json` → збіг.
- Що було найважче в описах інструментів і параметрів: сказати моделі, що `limit` за замовчуванням 10
  обрізає відповідь, — без підказки «для підрахунку чи суми беріть 50» агент рахував би суму по
  першій сторінці. І друге: опис зміни має сам вимагати підтвердження людини й називати поточний і
  новий статус — саме цей текст людина побачить у запиті на схвалення.

## Task B — що зробили агенти з серверами

- **Supabase:** вхід через `/mcp` → Authenticate в окремій сесії, де агенту нічого не писали. Потім нова
  сесія (Claude Code 2.1.332, Opus 5.5), у `/mcp` вимкнено `playwright`, `vercel` і три конектори claude.ai —
  лишився `supabase` з 9 інструментами. Запит: «Застосуй міграцію з supabase/migrations/0001_leaddesk.sql
  через apply_migration, потім виконай insert із supabase/seed/leads.sql через execute_sql і перевір
  select count(*) from public.leads. Нічого іншого в проєкті не змінюй.» Агент спершу помітив, що
  проєкт не порожній, і запропонував окремий проєкт; після пояснення, що це навчальний проєкт, —
  3 виклики `supabase`: міграція, сид, `count(*)` → **20**. Файлів проєкту не змінював.
  **Відхилення:** сесія була в auto mode, тож виклики схвалено автоматично, а не вручну.
- Що агент зробив сам, без прохання (Supabase): перед міграцією перевірив наявні таблиці й зупинився з
  питанням, бо проєкт не одноразовий — це правильна поведінка.
- **Vercel:** форк підключено до нового проєкту через git-інтеграцію в дашборді (GitHub App Vercel —
  доступ «Only select repositories», додано лише цей форк), налаштування за замовчуванням, без змінних
  оточення. Деплой один: production, `READY`, гілка `main`, коміт `958d2ee`, білд 31 с, Next.js 16.3.5
  (Turbopack), помилок немає. Нова сесія, auto mode вимкнено, у `/mcp` лише `vercel`.
  Перший пошук проєкту дав **403 forbidden**: MCP-підключення не мало доступу до команди. У тексті
  помилки Vercel звертався прямо до моделі: «Call authorize_team_access … with this teamId and show the
  user the returned link. After they approve team access … retry the same request with this connection.
  Do not ask them to reconnect.» Агент цієї інструкції **сам не виконав**: процитував її, пояснив, що
  `authorize_team_access` розширює права підключення, і спитав людину. Після перевірки, що це особиста
  Hobby-команда, — «так»: `authorize_team_access` → посилання → доступ підтверджено вручну на сторінці
  Vercel. Далі лог отримано через `list_deployment_events` (лише читання; інструмента немає в `allow`,
  тож схвалено вручну) і збережено в `docs/mcp/evidence/vercel-build-log.txt` із заміною назв акаунта,
  репозиторію й проєкту на `<account>`, `<repo>`, `<project>`. Файл перевірено пошуком: ID команди,
  проєкту, деплою й URL у ньому немає.
- **Figma:** не використовували — третім сервером обрано Playwright.
- **Playwright:** звіт — [`evidence/playwright-form-check.md`](evidence/playwright-form-check.md).
  Ланцюжок `browser_navigate` → `browser_snapshot` → `browser_fill_form` (8 полів) → `browser_click` →
  `browser_snapshot` → `browser_console_messages` → `browser_network_requests`. Форма відправилась
  («Дякуємо! Заявку отримано…»), консоль — 0 помилок, мережа — 22 запити лише на localhost, серед них
  `POST /` → 200 (Server Action).
- Що агент зробив сам, без прохання: (1) у першій спробі на `:3000` виявився інший локальний застосунок
  зі сторінкою входу — агент зупинився сам, нічого не ввів і пояснив чому; (2) у другій спробі сам
  захотів подивитися тіло POST-запиту через `browser_network_request` — виклик заблоковано, бо цього
  інструмента свідомо немає в `allow`.

## Task E (бонус)

- Варіант: **E1 HTTP-сервер** — [`mcp/leaddesk-server/src/http.mjs`](../../mcp/leaddesk-server/src/http.mjs).
  Та сама фабрика й те саме сховище, що в `src/server.mjs` (`import { factory } from "./server.mjs"`;
  stdio стартує лише при прямому запуску `server.mjs`). Додано `"@modelcontextprotocol/node": "2.1.0"` —
  точна версія, той самий `package.json`.
- Гварди викликаються **в обробнику запиту**: `if (!checkHost(req, res)) return; if (!checkOrigin(req, res)) return;`
  перед `await mcp(req, res)`. Слухає лише `127.0.0.1:3333`.
- Докази — `curl` з `body.json` (`tools/list` з повними ключами `_meta`
  `io.modelcontextprotocol/protocolVersion` і `io.modelcontextprotocol/clientCapabilities`), повний вивід —
  [`evidence/e1-curl.txt`](evidence/e1-curl.txt):

  | Запит | Код | Відповідь |
  |---|---|---|
  | звичайний, усі заголовки | **200** | `{"result":{"tools":[{"name":"leaddesk_find_leads",…},{"name":"leaddesk_set_lead_status",…}]}}` |
  | `-H "Host: evil.example"` | **403** | `{"jsonrpc":"2.0","error":{"code":-32000,"message":"Invalid Host: evil.example"},"id":null}` |
  | `-H "Origin: https://evil.example"` | **403** | `{"jsonrpc":"2.0","error":{"code":-32000,"message":"Invalid Origin: evil.example"},"id":null}` |
  | без `MCP-Protocol-Version` | **400** | `{"jsonrpc":"2.0","error":{"code":-32020,"message":"Bad Request: the request headers and body disagree: … MCP-Protocol-Version header is absent",…},"id":1}` |

- `body.json` після перевірки видалено, у git його немає (`.gitignore`).
