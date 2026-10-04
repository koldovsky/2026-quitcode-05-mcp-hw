# Перевірка (Task A, Task B, бонус E)

Тут лише те, що справді сталося: команди, коди виходу, числа й цитати. Біля кожного — файл, звідки воно
взяте. A/B описано в [`ab-generic-vs-domain.md`](ab-generic-vs-domain.md), threat model — у
[`threat-model.md`](threat-model.md), права й сесії — у [`connections.md`](connections.md).

- **Інструмент і версія, модель:**
  - Claude Code 2.1.282: Task A, E1 і Playwright-частина Task B, 28.09.2026;
  - Claude Code 2.1.289: решта Task B і Task C, 04.10.2026.
  - Сесії агента: `claude-opus-5-5` для знімків Playwright, перевірки форми й знімків Vercel; `claude-sonnet-5-5` для міграції, логу білду й A/B (через ліміт акаунта). Модель кожного прогону записана в його `meta.txt` або в заголовку транскрипту.
- **ОС і термінал, Node:** macOS (Darwin 25.6) · zsh · Node 22.21.0 (walkthrough вимагає ≥ 22.19 для Inspector 2.8.0).
- **Усі перевірки однією командою:** `bash docs/mcp/scripts/run-checks.sh` — базова лінія `main` у свіжому worktree,
  lint і build гілки, контракт, self-test, HTTP, конфіг, сид, підрахунок deny Vercel, посилання, знеособлення,
  таблиця файлів, незмінність кореневих `package*.json`. Кожен крок і його exit code —
  [`evidence/checks.txt`](evidence/checks.txt).

## Базова лінія (`main` = `958d2ee`, до будь-яких змін)

- `npm ci`, `npm run lint`, `npm run build` у свіжому worktree `main` — exit 0, 9 маршрутів
  ([`evidence/checks.txt`](evidence/checks.txt), розділ «baseline»).
- `npm install` на цій машині переписав кореневий `package-lock.json`: прибрав поля `libc`. Зміну
  відкочено (`git checkout package-lock.json`), далі ставив лише `npm ci`. Кореневий lock-файл у гілці не змінено.

## Task A — сервер в Inspector

- **Команди.** Чотири файли в `docs/mcp/` зроблено командами walkthrough (Task A, крок 4) через
  [`mcp/leaddesk-server/scripts/make-inspector-artifacts.sh`](../../mcp/leaddesk-server/scripts/make-inspector-artifacts.sh).
  Скрипт ще й перевіряє, що кожен файл — чистий JSON. Він пише вивід Inspector'а в `/dev/null`, щоб діагностика не
  змішувалась із JSON; самі команди не змінено.
- **`tools-list.json`.** Рівно два інструменти. `leaddesk_find_leads` має `{"readOnlyHint":true,"openWorldHint":false}`,
  `leaddesk_set_lead_status` — `{"readOnlyHint":false,"destructiveHint":false,"idempotentHint":false,"openWorldHint":false}`.
  У кожного параметра є `description`. Модель бачить, наприклад, такі описи:
  - `leadId`: «Ідентифікатор ліда у форматі lead_0002: lead_ і чотири цифри. Невідомий — знайди через leaddesk_find_leads»;
  - `limit`: «… Поле total у відповіді каже, скільки їх усього»;
  - опис `set_lead_status` починається з «ЗМІНЮЄ ДАНІ: …» і вимагає підтвердження людини.
- **`bad-input.json`.** Зламані аргументи: `leadId=nope` і `reason=ok`. Текст помилки: «Input validation error: Invalid arguments
  for tool leaddesk_set_lead_status: leadId: Invalid string: must match pattern /^lead_\d{4}$/, reason: Too small:
  expected string to have >=3 characters», `"isError": true`. Inspector завершився з **exit 5**.
- **`set-status.json`.** Лід `lead_0002`: `new` → `contacted`. Запис аудиту:
  `{ "action": "lead.status_changed", "leadId": "lead_0002", "at": "…Z", "from": "new", "to": "contacted", "reason":
  "перевірка в Inspector", "actor": "mcp:leaddesk" }`. Форма — `AuditEntry` застосунку; назва дії — як у `logAudit("lead.created", …)`.
- **`resource-read.json`.** `leaddesk://reference/statuses`, `"mimeType": "text/markdown"`.
- **Перевірка контракту.** [`check-contract.mjs`](../../mcp/leaddesk-server/scripts/check-contract.mjs) дає **17/17 PASS**
  ([`evidence/task-a/check-contract.txt`](evidence/task-a/check-contract.txt)). Перевірки чорною скринькою через
  Inspector:
  - відповіді за ключем A/B (запити 1–3);
  - відсутність імен, email і текстів заявок у `find` (порівняно з усіма 20 лідами фікстури);
  - той самий статус, невідомий лід, закрита угода і повернення в `new` — усі дають `isError` (C17 і заборону `new`
    додано після рев'ю CodeRabbit, див. нижче);
  - 9 невалідних входів: `leadId=nope`; статус `hot` в обох інструментах; `reason` з 2 символів, з 501 символа,
    `"   ok   "` (після `trim` — 2); `limit` 0, 51, 1.5;
  - фікстура після змін незмінна; stdout без клієнта порожній.
- **Self-test.** 10 мутантів сервера, кожен порушує одне правило. Кожного ловить своя перевірка: «self-test: every
  mutant was caught by its own check» ([`evidence/task-a/check-contract-self-test.txt`](evidence/task-a/check-contract-self-test.txt)).
- **Що було найважче:**
  1. Описи пишуться для моделі, а не для людини. Тому в `limit` прямо сказано про `total`: без нього агент на
     «скільки лідів» рахував би лише показані 10. А в `set_lead_status` прямо написано «ЗМІНЮЄ ДАНІ». Те, що це
     спрацювало, видно в A/B: прогін B на запиті 2 відповів «усього їх 6» з поля `total`.
  2. Межа «двох дієслів»: агент не може перевідкрити `won`/`lost`. Це рішення команди, а не вимога рубрики, і воно
     перевіряється мутантом M3.
- **Що з'ясувалось під час роботи:**
  - **Inspector змішав stderr сервера зі stdout.** У найпершому запуску рядок журналу сервера
    («leaddesk: 20 leads loaded…») потрапив у `tools-list.json` після JSON, і файл перестав парситись
    ([`evidence/task-a/tools-list.first-run.invalid.txt`](evidence/task-a/tools-list.first-run.invalid.txt)). За 20
    повторами це не відтворилося: 0 з 20 ([`evidence/task-a/inspector-stdout-repeat.txt`](evidence/task-a/inspector-stdout-repeat.txt)).
    Причину не встановлено, тому скрипт генерації тепер відмовляється залишати не-JSON.
  - **Inspector не помічає `console.log`.** Мутант M6 (`console.log` на старті) пройшов **усі** перевірки через
    Inspector і впав лише на окремій перевірці stdout (C15). Отже, Inspector 2.8.0 мовчки пропускає сміття в stdout.
  - **Фабрику викликають не раз.** `createMcpHandler` викликає її на **кожен** HTTP-запит (тип `McpServerFactory`
    у `@modelcontextprotocol/server` 2.1.0), а `serveStdio` — на кожне з'єднання. Тому ліди й аудит живуть на рівні
    модуля `src/leaddesk.mjs`, а не у фабриці. Абляція в E1 це доводить.

## Task B — що зробили агенти з серверами

- **Supabase** ([`connections.md`](connections.md), розділ «Supabase: схема й сид»). Агент прочитав
  `materials/leads.json`, записав обидва SQL-файли, викликав `list_tables` (`{"tables":[]}`) і два `select`. Перед
  `apply_migration` він **зупинився й попросив «так»**, як вимагає `AGENTS.md`. Людина відповіла «так» і вручну схвалила
  `apply_migration`, `execute_sql` (insert на 20 рядків) і `execute_sql` (`count` → `[{"count":20}]`). Нічого не
  відхиляли. У базу пішов той самий SQL, що лежить у файлах (`runs/task-b/applied-sql-vs-files.txt`), а сид збігається з
  фікстурою поле в поле (`check-seed.mjs` → all PASS). Роль: `select current_user, session_user,
  current_setting('is_superuser')` → `postgres`, `postgres`, `off`.
- **Vercel.** Деплой зроблено через git-інтеграцію в дашборді: форк, гілка `main`, коміт `958d2ee`. Лог отримано
  інструментом `list_deployment_events` (`get_deployment_build_logs` у walkthrough на сервері вже немає). Перед ним агент
  викликав `get_deployment` за hostname. У логу 76 подій: «Cloning github.com/HryhoriiHaponiukQuitCode/2026-quitcode-05-mcp-hw
  (Branch: main, Commit: 958d2ee)» … «Build Completed in /vercel/output [35s]» … «Deployment completed», жодного
  `error`/`failed` ([`evidence/vercel-build-log.txt`](evidence/vercel-build-log.txt)).
- **Playwright.** Ланцюжок: `navigate` → `snapshot` → `fill_form` → `console_messages` → `click` → `snapshot` →
  `console_messages` → `network_requests` ×2. Форма відправилась (`POST /` → 200, «Дякуємо! Заявку отримано.»). У консолі
  0 помилок і 0 попереджень, усі 22 запити йшли лише на `localhost:3000`
  ([`evidence/playwright-form-check.md`](evidence/playwright-form-check.md)).
- **Що агент зробив сам, без прохання:**
  - Агент Vercel після `ToolSearch` одразу викликав `list_teams`, потім `list_projects`. Обидва виклики відхилено, бо їх немає в
    `allow`, тож результату немає (`runs/task-b/vercel-build-log-1-list-denied.md`). Далі агенту дали hostname деплою.
  - Агент Supabase сам додав у міграцію RLS без політик і два індекси. Про RLS він сам сказав, що на виклики MCP під
    `postgres` це не впливає.
  - У тестовому прогоні хоста схвалень (`haiku`, не в доказах) агент, у якого забрали `Bash`, запустив субагента
    `Agent`, і той пройшов без жодного запиту на дозвіл. Відтоді кожна інтерактивна сесія (міграція, A/B) має
    `--disallowedTools Bash,WebFetch,WebSearch,Agent,Task`. Headless-сесії (`-p --permission-mode default`) дістають лише
    інструменти з `--allowedTools`, і схвалити решту там нікому.
- **Сервер Vercel не той, під який писали walkthrough.** 244 інструменти; з 11 імен deny існують 10; дозволеного
  `get_deployment_build_logs` немає. Що розширено в deny і чому — у [`connections.md`](connections.md), розділ «Що
  змінилось проти walkthrough». Deny із walkthrough закриває 10 інструментів, лишається 234. 41 глоб на дієслова закриває 107, 5 точних імен — ще 5,
  разом 113, лишається 131 ([`count-vercel-deny.mjs`](scripts/count-vercel-deny.mjs) →
  `runs/task-b/vercel-deny-count.txt`). Спершу в `connections.md` стояло «93» — число, яке я не зміг відтворити;
  замінено на 107 з підрахунку.
- **`allow` проєкту для MCP-інструментів у headless не діє.** Це виміряно 8 сесіями
  (`runs/task-b/allow-probe.txt`). Тому headless-кроки отримують ті самі імена через `--allowedTools`, згенеровані з
  файла.
- **Хто схвалював.** Ви доручили мені зробити це самому, і перший крок міграції пройшов через мій скрипт-хост
  ([`scripts/approval-host.mjs`](scripts/approval-host.mjs)) із записаною політикою (`runs/task-b/supabase-build.md`).
  Схвалення зміни бази від імені людини класифікатор Claude Code заблокував («Create Unsafe Agents»). Я не шукав
  обхідного шляху: «так» і всі схвалення запису дала людина в терміналі.

## Task E (бонус)

- **Варіант:** E1, HTTP-сервер [`mcp/leaddesk-server/src/http.mjs`](../../mcp/leaddesk-server/src/http.mjs) — та сама
  фабрика `createLeadDeskServer` і те саме сховище, що в `server.mjs`. `@modelcontextprotocol/node` 2.1.0 стоїть точною
  версією. Сервер слухає лише `127.0.0.1:3333`. Гварди `localhostHostValidation()` і `localhostOriginValidation()`
  **викликаються** в обробнику до `mcp(req, res)`.
- **Чотири відповіді `curl`** командами walkthrough. Тіло запиту — у тимчасовому файлі, `body.json` у репозиторії не
  створюється ([`evidence/task-e/http-check.txt`](evidence/task-e/http-check.txt)):
  - без підроблених заголовків → **HTTP 200**, у тілі `leaddesk_find_leads` і `leaddesk_set_lead_status`;
  - `Host: evil.example` → **HTTP 403**, `{"code":-32000,"message":"Invalid Host: evil.example"}`;
  - `Origin: https://evil.example` → **HTTP 403**, `"Invalid Origin: evil.example"`;
  - без `MCP-Protocol-Version` → **HTTP 400**, `"code":-32020`, «the required MCP-Protocol-Version header is absent».
- **Атаки на гварди.** Усього 33 очікування, усі виконано (`RESULT: all expectations met`):
  - `localhost.evil.example`, `127.0.0.1.nip.io`, `evil.example:3333`, `localhost@evil.example` і порожній `Host` → 403;
  - запит **без** `Host` → 400 від самого `node:http`, ще до гварда. Спершу я очікував тут 403 і помилився;
  - `Origin: null`, `http://localhost.evil.example`, `https://127.0.0.1.nip.io`, `not a url` → 403;
  - з'єднання на LAN-адресу → `000`, бо сервер слухає лише `127.0.0.1`.
- **Чого гварди не закривають.** `Origin` перевіряється **без порту**: `http://localhost:3000` і
  `http://127.0.0.1:5173` проходять (200). Будь-яка сторінка з будь-якого локального порту може викликати сервер, а
  автентифікації в нього немає. Це внесено в threat model.
- **Абляція в тимчасових копіях:**
  - **A1:** гварди передано опцією в `toNodeHandler` замість виклику → `Host: evil.example` дає **200**: пастку з
    walkthrough відтворено;
  - **A2:** без гварда `Origin` → підроблений `Origin` проходить (200), `Host` і далі 403;
  - **A3:** сховище створюється у фабриці → `set_lead_status` повертає успіх, а наступний запит бачить 6 нових лідів
    замість 5, тобто зміну втрачено.
- **Стан між запитами** на справжньому коді: `new` до зміни 6, після `set lead_0002 → contacted` у наступному
  HTTP-запиті 5. Журнал сервера без email (перевірено: `0`).

## Рев'ю CodeRabbit (full review, `61bbcf6`) і що з ним зроблено

Кожне зауваження перевірено на коді перед виправленням; усі п'ять підтвердились, як і попередження pre-merge check по Task C.

| Зауваження | Перевірка | Що зроблено |
|---|---|---|
| `leaddesk_set_lead_status` дозволяє повернути відкритий лід у `new`, хоча ресурс каже «Вручну в \`new\` не повертаємо» | так: `lead_0003` `contacted` → `new` проходив з аудитом | сервер відхиляє `new` з `isError` до зміни й аудиту; опис параметра й правила ресурсу кажуть це прямо; нова перевірка C17 і мутант M10 (17/17, 10 мутантів), артефакти Inspector перегенеровано. A/B прогнано **до** цієї зміни; запити 5–6 переводять у `contacted` і `lost`, тож їх вона не зачіпає |
| `approval-host.mjs`: політика `supabase-build` пропускає `insert … on conflict … do update` (upsert змінює наявні рядки) | так | upsert і другий оператор після `;` (поза рядковими літералами) відхиляються; сид — один `insert`, його це не зачіпає |
| `check-config.mjs` не перевіряє `--allowed-origins` | так | перевірка вимагає прапорець і лише `localhost`/`127.0.0.1`; у коментарі — що це зручність, не межа (редирект проходить) |
| `check-links.mjs` не перевіряє `runs/task-b/` | так, і ще не перевіряв посилання виду `runs/task-b/…` | додано `docs/mcp/ab` і `docs/mcp/runs/task-b` і цей формат; 3 посилання на `.playwright-mcp/*.yml` (знімки агента, які не комітимо за правилом) виводяться окремо, а не як мертві |
| `ab/metrics.txt`: запит 4 позначено «matches key», хоча ключ перевіряє лише назви статусів | так | `ab-metrics.mjs` для запиту 4 пише окремо: назви збігаються; значення A — ні з якого результату інструмента, B — з `leaddesk://reference/statuses` |
| Pre-merge check «Task C»: для B немає `/mcp` на початку сесії; діалоги 5–6 наведено не дослівно («…», «той самий діалог») | так: у прогоні 1 термінал не записувався, буфер зберіг лише частину | A/B прогнано вдруге з нуля, кожна сесія під `script`; `/mcp` і **всі** діалоги — дослівно з запису ([`tty-excerpts.mjs`](scripts/tty-excerpts.mjs)). Прогін 1 збережено в `ab/run1/`. У прогоні 2 в A `/mcp` перед першим запитом не ввели — знято в тій самій сесії через `--resume` |

### Друге рев'ю (`5293bec`)

| Зауваження | Перевірка | Що зроблено |
|---|---|---|
| `approval-host`: `with x as (update … returning …) select …` проходить як читання; міграцію з `disable row level security` теж схвалено б | так: список «поганих слів» цього не ловив | SQL-політику переписано як **allowlist** в окремому [`sql-policy.mjs`](scripts/sql-policy.mjs): міграція — лише DDL таблиці `leads` (create table / index / enable RLS / comment), `execute_sql` — один оператор: простий `insert into leads` або читання без жодного слова, що пише. `--self-test`: 16 випадків, серед них атаки з обох рев'ю; закомічені міграція й сид проходять |
| `ab-metrics.mjs`: для запиту 3 `lead_0006` без суми давав «matches key» | так, `\|\|` без дужок | умову згруповано: сума **і** (один без бюджету або `lead_0006`); обидва прогони перераховано — без змін |
| `run-mcp-session.sh` повертав 0, навіть коли `claude -p` впав | так | скрипт завершується кодом `claude` |
| `make-inspector-artifacts.sh` не перевіряв коди виходу й зміст | так | очікує 0, 0, 5, 0 і перевіряє зміст кожного файла (два інструменти з `readOnlyHint`, аудит, `isError`, URI й `mimeType`) |
| Pre-merge check «Task C» знову: в A2 `/mcp` знято після прогону (`--resume`), а не на старті | так | прогін A3 теж пішов без `/mcp` першим; прогін **A4** запущено як `claude "/mcp" …` — панель відкривається першим повідомленням сесії. A4 — основний прогін A; A2 і A3 збережено в `ab/a-reruns/`. В A3 агент сам виконав `alter table` — зупинила база (read-only) |
| Типовий `.mcp.json` піднімає всі три сервери в одній сесії; розділення тримається на тому, як запущено сесію | так, і це вже записано в threat model («Що ми забороняємо…», останні рядки) | не змінено: усі три записи в `.mcp.json` вимагає Task B; кожна сесія домашки — `--strict-mcp-config` з одним сервером |

## Мої помилки і що з ними зроблено

| Що сталося | Як помітив | Що зроблено |
|---|---|---|
| `npm install` змінив кореневий `package-lock.json` | `git status` після встановлення | відкат, далі лише `npm ci` |
| `meta.txt` писав «dirty: no» для файла поза git і sha `settings.json` для сесій **поза** репозиторієм, де він не діяв | перечитав `meta.txt` перед звітом | скрипт виправлено; у двох `meta.txt` дописано позначене виправлення |
| Знеособлювач Vercel замінив і синтетичні email лідів у транскрипті Supabase | ненульовий лічильник замін у транскрипті, де Vercel немає | email відновлено з фікстури в початковому порядку, вміст `Read` знову дорівнює `materials/leads.json` (перевірено), правило `email` прибрано, перевірка `--check` ідемпотентна |
| Перевірка ключа A/B позначила правильну відповідь A на запит 3 як хибну — двічі | розходження з текстом відповіді | прогін 1: у JavaScript `\b` не працює поруч із кирилицею; прогін 2: «Один лід без бюджету» не містить «одн». Обидва виправлено, прогін 1 перераховано — без змін |
| A/B прогін 1 без запису терміналу | pre-merge check CodeRabbit | прогін 2 під `script` (див. рев'ю вище) |
| Знімок Vercel із deny walkthrough перезаписано новим | перед звітом не знайшов файла | повторний прогін з тимчасово відновленим `settings.json` |
| Упаковувач прогонів витягнув `meta`/`stderr` окремими файлами й пропустив прогін без `meta.txt` | перелік файлів після упаковки | виправлено; архів розпаковується в оригінали (перевірено `diff -r`) |
| `"test"` у `mcp/leaddesk-server/package.json` вказував на неіснуючу теку `test/` | звіряння перед здачею | `npm test` тепер запускає `check-contract.mjs` з кореня репозиторію |
| Звіти твердили більше, ніж доказано: «93» інструменти Vercel, `--disallowedTools` «у кожній сесії», цитати вендора, яких у знімку немає | окремий агент-звіряльник (read-only) порівняв звіти з доказами | кожну розбіжність виправлено в `verification.md`, `threat-model.md`, `connections.md`; числа, яких не було в доказах, тепер записано (`checks.txt`, `vercel-deny-count.txt`, `vercel-cli.txt`) або прибрано |
| Очікування «запит без `Host` → 403» | `check-http.sh` FAIL | це 400 від `node:http`; очікування розділено на «без заголовка» і «порожній заголовок» |

## Усі змінені файли

Таблицю згенеровано з `git diff --name-status main...HEAD` скриптом
[`scripts/changed-files.mjs`](scripts/changed-files.mjs); `--check` перевіряє, що вона не розійшлася з гілкою.

<!-- changed-files:start -->
Generated by `changed-files.mjs --write` from `git diff --name-status --no-renames main...HEAD`; `--check` fails when this table and the diff disagree. **86 files in total.**

| File | Status | Task | Commits | What changed |
|---|---|---|---|---|
| `.claude/settings.json` | added | B | `ee8f9a2` | deny: 11 walkthrough names + 41 verb globs + 5 exact Vercel names, 5 Playwright rules; allow: exact read-only names only |
| `.mcp.json` | added | B | `ee8f9a2` | supabase (`project_ref`, `features=database,development,docs`), vercel, playwright pinned `0.0.82` with `--isolated --no-webmcp --allowed-origins` |
| `docs/mcp/ab-generic-vs-domain.md` | added | C | `55b4206` `ef4b503` `a8a0d7d` `55b5598` | A/B report |
| `docs/mcp/ab/a-generic.md` | added | C | `55b4206` `ef4b503` `55b5598` | A/B main runs A4 and B2: transcripts with /mcp and every approval dialog verbatim, measures, init probe |
| `docs/mcp/ab/a-reruns/a2-generic.md` | added | C | `55b5598` | runs A2 and A3: /mcp was not the first action, so not the main run A; kept with measures against B2 |
| `docs/mcp/ab/a-reruns/a3-generic.md` | added | C | `55b5598` | runs A2 and A3: /mcp was not the first action, so not the main run A; kept with measures against B2 |
| `docs/mcp/ab/a-reruns/metrics-a2-b2.txt` | added | C | `55b5598` | runs A2 and A3: /mcp was not the first action, so not the main run A; kept with measures against B2 |
| `docs/mcp/ab/a-reruns/metrics-a3-b2.txt` | added | C | `55b5598` | runs A2 and A3: /mcp was not the first action, so not the main run A; kept with measures against B2 |
| `docs/mcp/ab/b-domain.md` | added | C | `55b4206` `ef4b503` | A/B main runs A4 and B2: transcripts with /mcp and every approval dialog verbatim, measures, init probe |
| `docs/mcp/ab/init-probe.txt` | added | C | `55b4206` | A/B main runs A4 and B2: transcripts with /mcp and every approval dialog verbatim, measures, init probe |
| `docs/mcp/ab/metrics.txt` | added | C | `55b4206` `35f6fb1` `ef4b503` `55b5598` | A/B main runs A4 and B2: transcripts with /mcp and every approval dialog verbatim, measures, init probe |
| `docs/mcp/ab/run1/a-generic.md` | added | C | `ef4b503` | first A/B run, kept unchanged: report, transcripts, measures (replaced by run 2) |
| `docs/mcp/ab/run1/b-domain.md` | added | C | `ef4b503` | first A/B run, kept unchanged: report, transcripts, measures (replaced by run 2) |
| `docs/mcp/ab/run1/metrics.txt` | added | C | `ef4b503` | first A/B run, kept unchanged: report, transcripts, measures (replaced by run 2) |
| `docs/mcp/ab/run1/report.md` | added | C | `ef4b503` | first A/B run, kept unchanged: report, transcripts, measures (replaced by run 2) |
| `docs/mcp/ab/terminal-logs.tar.gz` | added | C | `ef4b503` `55b5598` | `script` recordings of sessions A2, A3, A4 and B2: what the human saw, incl. /mcp and every dialog |
| `docs/mcp/bad-input.json` | added | A | `e9f4141` | Inspector artifact, regenerated by `make-inspector-artifacts.sh` |
| `docs/mcp/connections.md` | added | B | `ee8f9a2` `8e45363` | a row per server with five columns, sessions, accounts, Vercel CLI, what differs from the walkthrough |
| `docs/mcp/evidence/checks.txt` | added | A–E | `git log main..HEAD -- docs/mcp/evidence/checks.txt` | output of `run-checks.sh` |
| `docs/mcp/evidence/mcp-after.txt` | added | B | `ee8f9a2` | Playwright tool list without and with the deny rules (`snapshot-list.mjs`) |
| `docs/mcp/evidence/mcp-before.txt` | added | B | `ee8f9a2` | Playwright tool list without and with the deny rules (`snapshot-list.mjs`) |
| `docs/mcp/evidence/playwright-form-check.md` | added | B | `ee8f9a2` | form check in the browser: chain, console, network |
| `docs/mcp/evidence/task-a/check-contract-self-test.txt` | added | A | `e9f4141` `35f6fb1` | evidence: contract check, self-test, first-run stdout incident and its 20 reruns |
| `docs/mcp/evidence/task-a/check-contract.txt` | added | A | `e9f4141` `150bddd` `35f6fb1` | evidence: contract check, self-test, first-run stdout incident and its 20 reruns |
| `docs/mcp/evidence/task-a/inspector-stdout-repeat.txt` | added | A | `e9f4141` | evidence: contract check, self-test, first-run stdout incident and its 20 reruns |
| `docs/mcp/evidence/task-a/tools-list.first-run.invalid.txt` | added | A | `e9f4141` | evidence: contract check, self-test, first-run stdout incident and its 20 reruns |
| `docs/mcp/evidence/task-e/http-check.txt` | added | E | `150bddd` | output of `check-http.sh` |
| `docs/mcp/evidence/vercel-build-log.txt` | added | B | `ee8f9a2` | build log from `list_deployment_events`, account identifiers scrubbed |
| `docs/mcp/resource-read.json` | added | A | `e9f4141` `35f6fb1` | Inspector artifact, regenerated by `make-inspector-artifacts.sh` |
| `docs/mcp/runs/task-b/allow-probe.txt` | added | B | `ee8f9a2` | probe or check output referenced from `connections.md` / `threat-model.md` |
| `docs/mcp/runs/task-b/allowed-origins-probe-direct.md` | added | B | `ee8f9a2` | one run: meta + approvals + transcript (`pack-runs.mjs`) |
| `docs/mcp/runs/task-b/allowed-origins-probe-redirect.md` | added | B | `ee8f9a2` | one run: meta + approvals + transcript (`pack-runs.mjs`) |
| `docs/mcp/runs/task-b/allowed-origins-probe-result.txt` | added | B | `ee8f9a2` | probe or check output referenced from `connections.md` / `threat-model.md` |
| `docs/mcp/runs/task-b/applied-sql-vs-files.txt` | added | B | `ee8f9a2` | probe or check output referenced from `connections.md` / `threat-model.md` |
| `docs/mcp/runs/task-b/check-config.txt` | added | B | `ee8f9a2` | probe or check output referenced from `connections.md` / `threat-model.md` |
| `docs/mcp/runs/task-b/check-seed.txt` | added | B | `ee8f9a2` | probe or check output referenced from `connections.md` / `threat-model.md` |
| `docs/mcp/runs/task-b/playwright-after.md` | added | B | `ee8f9a2` | one run: meta + approvals + transcript (`pack-runs.mjs`) |
| `docs/mcp/runs/task-b/playwright-before.md` | added | B | `ee8f9a2` | one run: meta + approvals + transcript (`pack-runs.mjs`) |
| `docs/mcp/runs/task-b/playwright-form-check-1-denied.md` | added | B | `ee8f9a2` | one run: meta + approvals + transcript (`pack-runs.mjs`) |
| `docs/mcp/runs/task-b/playwright-form-check.md` | added | B | `ee8f9a2` | one run: meta + approvals + transcript (`pack-runs.mjs`) |
| `docs/mcp/runs/task-b/raw-runs.tar.gz` | added | B | `ee8f9a2` | every original run folder (`transcript.jsonl`, `meta.txt`, `stderr.txt`, prompts), byte for byte |
| `docs/mcp/runs/task-b/servers-without-strict.txt` | added | B | `ee8f9a2` | probe or check output referenced from `connections.md` / `threat-model.md` |
| `docs/mcp/runs/task-b/supabase-build-2.md` | added | B | `ee8f9a2` | one run: meta + approvals + transcript (`pack-runs.mjs`) |
| `docs/mcp/runs/task-b/supabase-build.md` | added | B | `ee8f9a2` | one run: meta + approvals + transcript (`pack-runs.mjs`) |
| `docs/mcp/runs/task-b/supabase-tools.md` | added | B | `ee8f9a2` | one run: meta + approvals + transcript (`pack-runs.mjs`) |
| `docs/mcp/runs/task-b/vercel-build-log-1-list-denied.md` | added | B | `ee8f9a2` | one run: meta + approvals + transcript (`pack-runs.mjs`) |
| `docs/mcp/runs/task-b/vercel-build-log.md` | added | B | `ee8f9a2` | one run: meta + approvals + transcript (`pack-runs.mjs`) |
| `docs/mcp/runs/task-b/vercel-cli.txt` | added | B | `8e45363` | probe or check output referenced from `connections.md` / `threat-model.md` |
| `docs/mcp/runs/task-b/vercel-deny-count.txt` | added | B | `8e45363` | probe or check output referenced from `connections.md` / `threat-model.md` |
| `docs/mcp/runs/task-b/vercel-describe.md` | added | B | `ee8f9a2` | one run: meta + approvals + transcript (`pack-runs.mjs`) |
| `docs/mcp/runs/task-b/vercel-tools-no-deny.md` | added | B | `ee8f9a2` | one run: meta + approvals + transcript (`pack-runs.mjs`) |
| `docs/mcp/runs/task-b/vercel-tools-walkthrough-deny.md` | added | B | `ee8f9a2` | one run: meta + approvals + transcript (`pack-runs.mjs`) |
| `docs/mcp/runs/task-b/vercel-tools.md` | added | B | `ee8f9a2` | one run: meta + approvals + transcript (`pack-runs.mjs`) |
| `docs/mcp/scripts/ab-metrics.mjs` | added | C | `55b4206` `35f6fb1` `ef4b503` `5fee389` | A/B measures computed from the two session files |
| `docs/mcp/scripts/approval-host.mjs` | added | B | `ee8f9a2` `35f6fb1` `5fee389` | SDK host that answers permission prompts by a written policy (its write approval was blocked; humans approved); SQL decisions come from sql-policy.mjs |
| `docs/mcp/scripts/changed-files.mjs` | added | A–E | `8e45363` | this table: generator and per-file descriptions |
| `docs/mcp/scripts/changed-files.rules.json` | added | A–E | `8e45363` `35f6fb1` `ef4b503` `5fee389` `55b5598` | this table: generator and per-file descriptions |
| `docs/mcp/scripts/check-config.mjs` | added | B | `ee8f9a2` `35f6fb1` | static check of `.mcp.json` and `.claude/settings.json` against the rubric |
| `docs/mcp/scripts/check-links.mjs` | added | B–D | `ee8f9a2` `35f6fb1` `ef4b503` `55b5598` | every relative link and `file:line` reference in the reports resolves |
| `docs/mcp/scripts/check-seed.mjs` | added | B | `ee8f9a2` | seed SQL equals the fixture field by field |
| `docs/mcp/scripts/count-vercel-deny.mjs` | added | B | `8e45363` | how many Vercel tools each part of the deny list closes, from the run's `init` (244 → 131) |
| `docs/mcp/scripts/pack-runs.mjs` | added | B | `ee8f9a2` | packs run folders into one `.md` each plus `raw-runs.tar.gz` |
| `docs/mcp/scripts/probe-allowed-origins.sh` | added | B, D | `ee8f9a2` | direct vs redirect navigation probe for `--allowed-origins` |
| `docs/mcp/scripts/run-checks.sh` | added | A–E | `8e45363` `5fee389` | every check the reports rely on, baseline `main` included, with exit codes |
| `docs/mcp/scripts/run-mcp-session.sh` | added | B | `ee8f9a2` `5fee389` | headless session runner: exactly one server, `--strict-mcp-config`, records meta |
| `docs/mcp/scripts/scrub-vercel.mjs` | added | B | `ee8f9a2` | removes account identifiers from Vercel evidence; `--check` is idempotent |
| `docs/mcp/scripts/snapshot-list.mjs` | added | B | `ee8f9a2` | lists the tools a session really got (`init` event) |
| `docs/mcp/scripts/sql-policy.mjs` | added | B | `5fee389` | SQL allowlist of the supabase-build approval policy (leads DDL; one plain insert or a read without writes); --self-test with the review attacks |
| `docs/mcp/scripts/transcript-md.mjs` | added | B, C | `ee8f9a2` | renders a session JSONL as readable markdown |
| `docs/mcp/scripts/tty-excerpts.mjs` | added | C | `ef4b503` `55b5598` | renders a `script` recording and extracts /mcp panels and permission dialogs verbatim |
| `docs/mcp/set-status.json` | added | A | `e9f4141` `35f6fb1` | Inspector artifact, regenerated by `make-inspector-artifacts.sh` |
| `docs/mcp/threat-model.md` | added | D | `8e45363` | threat model: data, exfiltration channels, what is denied and by what, contract |
| `docs/mcp/tools-list.json` | added | A | `e9f4141` `35f6fb1` | Inspector artifact, regenerated by `make-inspector-artifacts.sh` |
| `docs/mcp/verification.md` | added | A, B, E | `git log main..HEAD -- docs/mcp/verification.md` | verification report and this table |
| `mcp/leaddesk-server/README.md` | added | A, E | `e9f4141` `150bddd` `35f6fb1` | how to run, test and connect the server; HTTP variant |
| `mcp/leaddesk-server/fixtures/leads.json` | added | A | `e9f4141` | byte-for-byte copy of `materials/leads.json`; the server never writes it |
| `mcp/leaddesk-server/package-lock.json` | added | A, E | `e9f4141` | lock file of the server package (`npm install` inside `mcp/leaddesk-server/`) |
| `mcp/leaddesk-server/package.json` | added | A, E | `e9f4141` `8e45363` | own package: exact `@modelcontextprotocol/server`, `zod`, later `@modelcontextprotocol/node`; scripts `start`, `start:http`, `test` |
| `mcp/leaddesk-server/scripts/check-contract.mjs` | added | A | `e9f4141` `35f6fb1` | checks C1–C17 through Inspector; `--self-test` runs 10 mutants, each caught by its own check |
| `mcp/leaddesk-server/scripts/check-http.sh` | added | E | `150bddd` | four `curl` answers, guard attacks, state across requests, ablations A1–A3 |
| `mcp/leaddesk-server/scripts/make-inspector-artifacts.sh` | added | A | `e9f4141` `5fee389` | walkthrough commands for the four `docs/mcp/*.json`, refuses non-JSON output |
| `mcp/leaddesk-server/src/http.mjs` | added | E | `150bddd` | HTTP entry on `127.0.0.1`: `createMcpHandler` + `toNodeHandler`, Host and Origin guards called in the request handler |
| `mcp/leaddesk-server/src/leaddesk.mjs` | added | A, E | `e9f4141` `35f6fb1` | factory `createLeadDeskServer`: `leaddesk_find_leads` (6 public fields + `total`), `leaddesk_set_lead_status` (`isError` for unknown / same / closed lead and for a return to `new`, audit entry), resource `leaddesk://reference/statuses`; the store lives at module level so HTTP requests share it |
| `mcp/leaddesk-server/src/server.mjs` | added | A | `e9f4141` | stdio entry: `serveStdio(createLeadDeskServer)`, no `console.log` |
| `supabase/migrations/0001_leaddesk.sql` | added | B | `ee8f9a2` | table `public.leads` with the 5 statuses, 2 indexes, RLS on (written by the agent, applied after human approval) |
| `supabase/seed/leads.sql` | added | B | `ee8f9a2` | the same 20 leads as the fixture (`check-seed.mjs`) |
<!-- changed-files:end -->
