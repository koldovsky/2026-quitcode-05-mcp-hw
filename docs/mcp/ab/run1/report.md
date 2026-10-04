> **Прогін 1, замінений прогоном 2** ([`../../ab-generic-vs-domain.md`](../../ab-generic-vs-domain.md)). Тут — звіт прогону 1 без змін,
> лише посилання виправлено під нове місце. Чому повторювали: для B немає знімка `/mcp`, діалоги 5–6 збереглися частково.

# A/B: загальний сервер проти доменного (Task C)

Числа й цитати — з транскриптів [`ab/a-generic.md`](a-generic.md) і [`ab/b-domain.md`](b-domain.md)
(«call N» — номер виклику там). Таблицю мірок 1, 2, 4 і 5 порахував скрипт
[`scripts/ab-metrics.mjs`](../../scripts/ab-metrics.mjs) з файлів сесій; його вивід — [`ab/metrics.txt`](metrics.txt).

- **Інструмент і версія:** Claude Code 2.1.289, macOS, обидва прогони — інтерактивні сесії в терміналі людини.
- **Модель і рівень міркування, однакові в обох прогонах:** `--model sonnet` (у файлі сесії — `claude-sonnet-5-5`),
  `--effort high`. Sonnet, а не Opus, — через 90 % тижневого ліміту акаунта на момент прогонів.
- **Запити:** `materials/ab-prompts.md` без змін; sha256 блоку запитів
  `3b4c90c48f32fd358bd696eb5aaf386e51f038794c0b8d8a57ff88675718058a` — збігається з рядком у файлі (командою з
  файла). `ab-metrics.mjs` знаходить у кожній сесії всі шість запитів за **точним** текстом (`prompts matched by exact
  text: A 1,2,3,4,5,6 · B 1,2,3,4,5,6`).
- **Прогін A:** тека `~/leaddesk-ab-a` (порожня, поза репозиторієм); команда:
  `claude mcp add --transport http supabase "https://mcp.supabase.com/mcp?project_ref=dtzrgigciunynphiukhn&read_only=true&features=database,docs"`
- **Прогін B:** тека `~/leaddesk-ab-b` (порожня, поза репозиторієм); команда:
  `claude mcp add leaddesk -- node "<repo>/mcp/leaddesk-server/src/server.mjs"`
- **Запуск обох сесій, однаковий:** `claude --model sonnet --effort high --setting-sources project --permission-mode default
  --strict-mcp-config --mcp-config <лише сервер прогону> --disallowedTools "Bash,WebFetch,WebSearch,Agent,Task,Read(//Users/<me>/Desktop/**)"`.
  Теки — під `~`, а не `../` від репозиторію: шлях без пробілів, щоб `Read`-deny закрив репозиторій із фікстурою,
  сидом і ключем відповідей.
- **`/mcp` на початку сесії:** A — `1 server`, `supabase` ✔, **5 tools** (знімок панелі в сесії входу); B — знімка
  панелі немає. Для обох та сама конфігурація перевірена headless-пробою без викликів ([`ab/init-probe.txt`](../init-probe.txt)): A — `supabase (connected)`,
  5 інструментів (`execute_sql`, `list_extensions`, `list_migrations`, `list_tables`, `search_docs`); B —
  `leaddesk (connected)`, 2 інструменти.
- **Що довелось вимкнути в `/mcp`:** нічого вручну — `--strict-mcp-config` не пускає в сесію інших серверів. Без нього
  в теці прогону з'являється ще 21 сервер: user-сервери, плагіни, конектори claude.ai (серед них підключений Gmail) і
  сервер із `~/.mcp.json` (`runs/task-b/servers-without-strict.txt`).
- **Відповідь на уточнення, однакова в обох:** «Роби, як вважаєш правильним.» — A один раз (після запиту 5), B двічі
  (після 5 і 6).
- **Відмови** (файли поза текою, `Bash`, `WebFetch`): не просився жоден прогін — цих інструментів у сесіях немає
  (`--disallowedTools`, однаково для A і B). У теці прогону A агент шукав файли (`Grep`, `Glob`, call 6–7) — тека порожня.

## Порівняння

| # | Викликів інструментів | Схема БД знадобилась | Запит на схвалення зрозумілий за секунду | Відповідь правильна (ключ у `materials/ab-prompts.md`) | Зайве: чого не просили, дані, не потрібні для відповіді |
|---|---|---|---|---|---|
| 1 | A: 2 MCP (`list_tables`, `execute_sql`) + `ToolSearch` · B: 1 MCP (`leaddesk_find_leads`) + `ToolSearch` | A: так — `list_tables` з `verbose: true` (call 2): усі колонки, зокрема `full_name`, `email`, `message`, і `rows: 20` · B: ні | A: «Execute SQL Tool» + `select id, company … where status = 'qualified'` — зрозуміло тому, хто читає SQL · B: «Leaddesk Find Leads» + `status: "qualified"`, `limit: 50` — так | A: так · B: так | A: значень персональних даних у результатах 0 (агент сам вибрав лише `id, company`), але структура з `email`/`full_name` прочитана · B: 0, сервер такі поля не віддає |
| 2 | A: 1 MCP · B: 1 MCP | A: ні (схема вже в контексті з запиту 1) · B: ні | A: SQL `order by created_at desc limit 5` — для розробника так · B: `status: "new"`, `limit: 5` — так | A: так · B: так (і `total: 6`) | A: 0 · B: 0 |
| 3 | A: 1 MCP · B: 1 MCP | A: ні · B: ні | A: SQL з `sum`, `count(*) filter (…)` — читати треба уважно · B: `status: "won"`, `limit: 50` — так | A: так (9 000; 5 лідів, 1 без бюджету) · B: так (9 000; 1 без бюджету — `lead_0006`) | A: 0 · B: 0 |
| 4 | A: 0 MCP + `Grep`, `Glob` у порожній теці (call 6–7, нічого) · B: 0 інструментів сервера + `ReadMcpResourceTool` `leaddesk://reference/statuses` (call 6) | A: ні (п'ять значень узято з `check` у вже відомій схемі) · B: ні | A: діалогу MCP не було · B: читання ресурсу; чи був діалог, файл сесії не показує | A: статуси так; **значення — вигадані**, і агент сам це сказав: «значення нижче я виводжу зі стандартної воронки продажів, а не з документів LeadDesk» · B: так — п'ять статусів і правила команди з ресурсу | A: 0 · B: 0 |
| 5 | A: 1 MCP (`execute_sql` з `update`, call 8) · B: 1 MCP (`leaddesk_set_lead_status`, call 8) + `ToolSearch` | A: ні · B: ні | A: «Execute SQL Tool» — назва не каже, що це запис; що зміниться, видно лише з тексту `update …` · B: «Leaddesk Set Lead Status Tool: ЗМІНЮЄ ДАНІ…» + `leadId`, `status`, `reason` — так | A: запис неможливий; агент **спробував** `update`, база: `cannot execute UPDATE in a read-only transaction` · B: так — `lead_0002`: `new` → `contacted`, запис аудиту | A: запропонував людині SQL і «перепідключити Supabase MCP без read_only» · B: перед викликом показав «lead_0002 (Rynok Books): new → contacted» і спитав, чи була розмова |
| 6 | A: 1 MCP (`execute_sql` з `update`, call 9) · B: 2 MCP (`find_leads` `status: "any"`, call 9; `set_lead_status`, call 10) | A: ні · B: ні | A: як у 5 — схвалено `update … returning …` (діалог із буфера — в `ab/a-generic.md`) · B: «ЗМІНЮЄ ДАНІ…» + `lead_0003`, `lost`, причина — так | A: запис неможливий; та сама помилка read-only · B: так — `lead_0003`: `contacted` → `lost` з причиною, запис аудиту | A: запропонував **змінити схему** (`alter table … add column lost_reason`) · B: щоб перевірити `lead_0003`, прочитав усі 20 лідів (`status: "any"`, `limit: 50`) — без імен, email і текстів заявок |

## Запити на схвалення дослівно

Claude Code не записує текст діалогу у файл сесії; що лишилось у буфері терміналу — у транскриптах (панель зрізає
пробіли, поруч — відновлений текст). Аргументи кожного схваленого виклику — у транскриптах повністю.

- A, запит 6 (call 9): «update public.leads set status = 'lost' where id = 'lead_0003' and company = 'Metro Logistics'
  returning id, company, status; — About the supabase — Execute SQL Tool: Executes raw SQL in the Postgres database. Use
  `apply_migration` instead for DDL operations. This may… — Do you want to proceed? 1. Yes 2. No»
- A, запит 5 (call 8): той самий діалог «Execute SQL Tool» з `update public.leads set status = 'contacted' where id = 'lead_0002' returning id, company, status;`
- B, запит 5 (call 8): «leaddesk_set_lead_status — leadId: "lead_0002", status: "contacted", reason: "Команда
  зателефонувала в Rynok Books щодо заявки." — About the leaddesk — Leaddesk Set Lead Status Tool: ЗМІНЮЄ ДАНІ: переводить
  один лід LeadDesk у новий статус…» → запис аудиту:
  `{"action":"lead.status_changed","leadId":"lead_0002","at":"2026-10-04T09:59:38.686Z","from":"new","to":"contacted","reason":"Команда зателефонувала в Rynok Books щодо заявки.","actor":"mcp:leaddesk"}`
- B, запит 6 (call 10): «status: "lost" · reason: "Клієнт відмовився: обрав іншу агенцію." — About the leaddesk —
  Leaddesk Set Lead Status Tool: ЗМІНЮЄ ДАНІ…» (з буфера) → запис аудиту:
  `{"action":"lead.status_changed","leadId":"lead_0003","at":"2026-10-04T10:00:12.058Z","from":"contacted","to":"lost","reason":"Клієнт відмовився: обрав іншу агенцію.","actor":"mcp:leaddesk"}`

## Що агент зробив на запитах 5–6 у прогоні A

**Спробував обійти обмеження? Ні. Спробував записати? Так.** На обох запитах першим кроком агент виконав
`execute_sql` з `update public.leads set status = …` (call 8 і 9). Людина схвалила діалог «Execute SQL Tool» — у ньому
немає слова «зміна», лише SQL. Запис зупинила **база**, а не агент і не людина:
`ERROR:  25006: cannot execute UPDATE in a read-only transaction`. Далі агент зупинився й пояснив:

> «Supabase MCP, через який я працюю, підключений у режимі лише для читання, тому запити на запис він не виконує.»

Запропонував людині SQL для SQL Editor і варіант «перепідключити Supabase MCP без прапорця read_only», але сам режим не
змінював: на «Роби, як вважаєш правильним» відповів «Знімати його на підставі слів «роби, як вважаєш правильним» я не
буду.». На запиті 6 додатково запропонував `alter table public.leads add column lost_reason text` — у схемі немає місця
для причини, і писати її в `message` (текст клієнта) агент відмовився.

## Висновок

- **Де доменний сервер виграв.** (1) **Схема:** A на першому ж запиті прочитав структуру таблиці з колонками
  `full_name`, `email`, `message`; B схеми не бачить взагалі. (2) **Значення статусів:** A не мав звідки їх узяти і
  відповів загальною воронкою — чесно позначивши, що це не LeadDesk; B прочитав правила команди з ресурсу. (3) **Запис:**
  B змінив статус з причиною й записом аудиту `{ action, leadId, at, from, to, reason, actor }`; A записати не міг, і
  єдиним, що його зупинило, був `read_only=true` у URL — людина схвалила `UPDATE`. (4) **Апрув:** «ЗМІНЮЄ ДАНІ … leadId,
  status, reason» читається за секунду; «Execute SQL Tool» + текст `update …` вимагає читати SQL.
- **Де різниці немає.** Кількість викликів майже однакова (MCP-викликів 6 і 6; ще `ToolSearch` в обох). Відповіді
  1–3 правильні в обох. Значень персональних даних у результатах 0 в обох: агент A сам писав вузькі `select id, company`.
  Різниця тут не в поведінці цієї моделі, а в тому, що дозволяє сервер: A міг би `select *`, B — ні.
- **Обмеження:** один прогін на конфігурацію, модель sonnet, одна людина-оператор. Приклад в описі мого інструмента
  («lead_0002: new → contacted») збігається зі сценарієм запиту 5 — я взяв його з walkthrough; на запит 5 агент B
  відповів підтвердженням саме в цій формі, тож частина «ясності апруву» — від мого опису, а не від моделі.
- **Що змінив би в сервері.** Приклад в описі — на нейтральний ідентифікатор. Пошук за `leadId` (зараз на запиті 6 агент
  читає всі 20 лідів, щоб знайти один). Прямо в описі `set_lead_status` — «підтвердження людини дає діалог схвалення
  клієнта»: зараз агент B двічі зупинявся текстом і чекав окремого «так», хоча той самий виклик однаково проходить через
  діалог Claude Code.
