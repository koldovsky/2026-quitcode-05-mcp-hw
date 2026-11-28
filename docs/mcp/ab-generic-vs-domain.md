# A/B: загальний сервер проти доменного (Task C)

Транскрипти — [`ab/a-generic.md`](ab/a-generic.md) і [`ab/b-domain.md`](ab/b-domain.md): вивід `/export` плюс
виклики з аргументами, відновлені з журналу тих самих сесій.

- **Інструмент і версія:** Claude Code 2.1.332
- **Модель і рівень міркування (effort), однакові в обох прогонах:** `claude-opus-5-5` (Opus 5.5), effort `medium` — за `/model` і журналами обох сесій
- **Запити:** `materials/ab-prompts.md` без змін; sha256 блоку запитів: `3b4c90c48f32fd358bd696eb5aaf386e51f038794c0b8d8a57ff88675718058a` (збігається з рядком у файлі)
- **Прогін A:** тека `~/Courses/leaddesk-ab-a`; команда: `claude mcp add --transport http supabase "https://mcp.supabase.com/mcp?project_ref=tyxyvgilaoykzftynvtm&read_only=true&features=database,docs"`
- **Прогін B:** тека `~/Courses/leaddesk-ab-b`; команда: `claude mcp add leaddesk -- node "/Users/kateryna/Courses/2026-quitcode-05-mcp-hw/mcp/leaddesk-server/src/server.mjs"`
- **`/mcp` на початку сесії:** A — `supabase` (Local MCPs), ✔ connected, **5 tools**; B — `leaddesk` (Local MCPs), ✔ connected, **2 tools**
- **Що довелось вимкнути в `/mcp`** (сервери зі скоупом `user`, конектори claude.ai): у кожній теці — конектори `claude.ai Claude Data`, `claude.ai Claude Docs`, `claude.ai Meetings` і плагінний сервер `easel`
- **Режим дозволів:** manual в обох (`permissionMode: default` у журналах), кожен виклик MCP схвалено вручну, без «Always allow»
- **Відповідь на уточнення, однакова в обох:** агент не питав
- **Відмови** (файли поза текою прогону, `Bash`, `WebFetch`): не знадобились. У прогоні A агент на запиті 1 сам запустив `Bash` `ls -la` у теці прогону — Claude Code пропустив його без запиту на схвалення як команду лише на читання; тека порожня, нічого не прочитано. У прогоні B вбудованих інструментів, крім `ReadMcpResourceTool`, не було

## Порівняння

Рядок на кожен запит; у кожній комірці — обидва прогони: `A: … · B: …`. Порожніх комірок немає.

| # | Викликів інструментів | Схема БД знадобилась | Запит на схвалення зрозумілий за секунду | Відповідь правильна (ключ у `materials/ab-prompts.md`) | Зайве: чого не просили, дані, не потрібні для відповіді |
|---|---|---|---|---|---|
| 1 | A: 3 (`Bash ls`, `list_tables` verbose, `execute_sql`) · B: 1 (`find_leads`) | A: так — `list_tables` з `verbose: true` перед першим SQL · B: ні | A: ні — SQL `select id, company from public.leads where status = 'qualified'` треба читати · B: так — `find_leads(status: qualified, limit: 50)` | A: так, 3 ліди · B: так, 3 ліди | A: `ls` теки; `list_tables` показав усі 8 таблиць проєкту з колонками й коментарями, зокрема 6 таблиць іншого навчального застосунку · B: ні; поле `source` використав для примітки про можливий дубль |
| 2 | A: 1 (`execute_sql`) · B: 1 (`find_leads`) | A: так, використав схему з запиту 1 (`created_at`) · B: ні | A: ні — SQL з `order by created_at desc limit 5` · B: так — `find_leads(status: new, limit: 5)` | A: так, порядок і дати збігаються з ключем · B: так | A: ні · B: ні (сказав, що всього new — 6, з `total`) |
| 3 | A: 1 (`execute_sql` з `count`, `filter`, `sum`) · B: 1 (`find_leads`, `limit: 50`) | A: так · B: ні | A: ні — агрегатний SQL на 4 вирази · B: так — `find_leads(status: won, limit: 50)` | A: так, 9000, 1 без бюджету · B: так, 9000, 1 без бюджету (`lead_0006`), ще й з валютою «USD на місяць» з опису інструмента | A: ні · B: ні |
| 4 | A: 1 (`execute_sql`, коментарі таблиці/колонки + `group by status`) · B: 1 (`ReadMcpResourceTool` `leaddesk://reference/statuses`) | A: так — шукав `obj_description`/`col_description` · B: ні | A: ні — SQL до системних каталогів `pg_attribute` · B: так — «Read resource leaddesk://reference/statuses» | A: частково — п'ять статусів правильні, а значення **вигадані** з «загальної логіки воронки», агент сам це визнав · B: так — значення з ресурсу команди | A: ні · B: ні |
| 5 | A: 1 (`execute_sql` UPDATE → помилка read-only) · B: 1 (`set_lead_status`) | A: так · B: ні | A: ні — `update public.leads set status = 'contacted' where id = 'lead_0002' and status = 'new' returning …` · B: так — `set_lead_status(lead_0002 → contacted, reason: …)` | A: запис неможливий — `cannot execute UPDATE in a read-only transaction`, статус лишився `new` (очікувано) · B: так, `new` → `contacted`, запис аудиту | A: спробував UPDATE замість того, щоб одразу сказати про read-only; потім запропонував SQL людині й зняти `read_only=true` · B: ні |
| 6 | A: 2 (`execute_sql` × 2) · B: 2 (`find_leads any`, `set_lead_status`) | A: так — читав рядок ліда й тригери `pg_trigger`/`pg_proc` · B: ні | A: ні — другий SQL з `pg_get_functiondef` зовсім не читається за секунду · B: так — `set_lead_status(lead_0003 → lost, reason: «Клієнт відмовився: обрали іншу агенцію»)` | A: запис неможливий, лід лишився `contacted` (очікувано) · B: так, `contacted` → `lost` з причиною в аудиті | A: прочитав текст заявки клієнта (`message`) — для відповіді не потрібен · B: `find_leads any` на 20 лідів, щоб звірити поточний статус; згадав бюджет ліда (10 000), якого не питали |

Разом: A — 9 викликів (8 MCP + `Bash`), схема потрібна на кожному запиті; B — 7 викликів, схема не потрібна жодного разу.

## Запити на схвалення дослівно

Claude Code у діалозі схвалення показує сервер, інструмент і всі аргументи; нижче — ці аргументи
дослівно з журналів сесій.

- A, запит 1: `supabase` · `list_tables` · `{"schemas":["public"],"verbose":true}`; потім `execute_sql` · `select id, company from public.leads where status = 'qualified' order by id;`
- A, запит 4: `execute_sql` · `select obj_description('public.leads'::regclass) as table_comment, col_description('public.leads'::regclass, a.attnum) as status_comment from pg_attribute a where a.attrelid='public.leads'::regclass and a.attname='status'; select status, count(*) from public.leads group by status order by status;`
- A, запит 5: `execute_sql` · `update public.leads set status = 'contacted' where id = 'lead_0002' and status = 'new' returning id, company, status;`
- A, запит 6: `execute_sql` · `select t.tgname, p.proname, pg_get_functiondef(p.oid) as def from pg_trigger t join pg_proc p on p.oid = t.tgfoid where t.tgrelid in ('public.leads'::regclass, 'public.lead_audit'::regclass) and not t.tgisinternal;`
- B, запит 5: `leaddesk` · `leaddesk_set_lead_status` · `{"leadId":"lead_0002","status":"contacted","reason":"Команда зателефонувала в Rynok Books щодо заявки, розмову почато"}` → запис аудиту: `{"action":"lead.status_changed","leadId":"lead_0002","at":"2026-11-27T22:47:57.529Z","from":"new","to":"contacted","reason":"Команда зателефонувала в Rynok Books щодо заявки, розмову почато","actor":"mcp:leaddesk"}`
- B, запит 6: `leaddesk` · `leaddesk_set_lead_status` · `{"leadId":"lead_0003","status":"lost","reason":"Клієнт відмовився: обрали іншу агенцію"}` → запис аудиту: `{"action":"lead.status_changed","leadId":"lead_0003","at":"2026-11-27T22:48:14.169Z","from":"contacted","to":"lost","reason":"Клієнт відмовився: обрали іншу агенцію","actor":"mcp:leaddesk"}`

## Що агент зробив на запитах 5–6 у прогоні A

**Запит 5 — спробував, отримав відмову бази, зупинився й запропонував SQL людині.** Агент не перевірив
наперед, чи можна писати, а одразу виконав `update public.leads set status = 'contacted' …`; база
відповіла `ERROR: 25006: cannot execute UPDATE in a read-only transaction`. Далі — без спроб обходу:
«Обходити це обмеження я не став», і два варіанти: виконати UPDATE самому в SQL Editor або «прибрати
режим read-only, зазвичай це параметр --read-only або read_only=true в адресі сервера» — тобто порадив
людині розширити собі права.

**Запит 6 — запис не пробував, зупинився й запропонував SQL.** Спершу прочитав рядок ліда (разом із
текстом заявки) і тригери на `leads`/`lead_audit`, з'ясував, що окремого поля для причини немає, і
запропонував людині CTE, що змінює статус і пише причину в `lead_audit`, плюс міграцію з колонкою
`lost_reason`.

## Висновок

На запитах 1–3 обидва прогони дали правильні відповіді. На запиті 4 точність розійшлася: B повернув
значення статусів із ресурсу команди, а A — лише частково правильну відповідь: п'ять статусів правильні,
значення вигадані з «загальної логіки воронки». Решта різниці — навколо відповідей. Загальний сервер на кожному запиті змушував агента вивчати схему
(`list_tables` verbose на першому ж запиті показав усі 8 таблиць проєкту, разом із чужим застосунком),
а кожен апрув був SQL-рядком — від простого `select` до `pg_get_functiondef` по системних каталогах, який
за секунду не прочитати. Доменний сервер обійшовся без схеми, апрув звучав як
«`set_lead_status` lead_0002 → contacted, reason: …», а кожна зміна лишила аудит `{ action, leadId, at, from, to, reason }`.
І найважливіше для безпеки: прогін A сам спробував UPDATE і порадив зняти `read_only`, тобто захист тримався
лише на прапорці в URL, а в B писати можна рівно одне поле одного ліда зі статусом з переліку.
Що змінив би в сервері: `find_leads` з `status: any` віддає всі 20 лідів, хоча на запиті 6 агенту
потрібен був один — варто додати `leaddesk_get_lead(leadId)`; і поле `actor` у аудиті зараз завжди
`mcp:leaddesk` — у справжньому сервері туди має йти людина, що схвалила зміну.
