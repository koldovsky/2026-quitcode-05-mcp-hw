# A/B, прогін B (доменний сервер leaddesk), повтор 15.11

Повторний прогін A/B 15.11.2026 із зовнішнього термінала (`entrypoint: cli`, Claude Code 2.1.325), один сервер у сесії через `--strict-mcp-config`. Транскрипт зібрано 27.11.2026 з запису сесії (`~/.claude/projects/D--leaddesk-ab-b/e55093b5-b930-4d22-82e7-abd1050da837.jsonl`) скриптом без правок тексту; блоки міркувань моделі не включено. Діалоги схвалення (`Yes / No`) у запис сесії не потрапляють — їх дослівно наведено в `docs/mcp/ab-generic-vs-domain.md` з копії терміналу; для запиту 4 прогону B (читання ресурсу статусів) копії діалогу немає, тут видно лише сам виклик `ReadMcpResourceTool` і його результат.

- Claude Code: `2.1.325`; entrypoint: `cli`; тека: `D:\leaddesk-ab-b`; сесія: `e55093b5-b930-4d22-82e7-abd1050da837`

## Розмова

**Людина:**

> Скільки лідів зараз у статусі qualified? Назви їхні ідентифікатори й компанії.

**Агент:**

Спершу підвантажу інструмент пошуку лідів LeadDesk.

**Виклик:** `ToolSearch`

```json
{
  "query": "select:mcp__leaddesk__leaddesk_find_leads",
  "max_results": 1
}
```

**Результат:**

```text
{"type":"tool_reference","tool_name":"mcp__leaddesk__leaddesk_find_leads"}
```

**Виклик:** `mcp__leaddesk__leaddesk_find_leads`

```json
{
  "status": "qualified",
  "limit": 50
}
```

**Результат:**

```text
{"status":"qualified","total":3,"returned":3,"leads":[{"id":"lead_0001","company":"North Wind Yachts","status":"qualified","source":"facebook-ads","budget":2500,"createdAt":"2026-09-20T06:32:40.447Z"},{"id":"lead_0013","company":"Bloom Florists","status":"qualified","source":"facebook-ads","budget":1500,"createdAt":"2026-09-07T13:54:42.854Z"},{"id":"lead_0015","company":"Bloom Florists","status":"qualified","source":"website","budget":2500,"createdAt":"2026-08-18T15:29:38.903Z"}]}
```

**Агент:**

Зараз у статусі `qualified` є **3 ліди**:

| ID | Компанія | Джерело | Бюджет | Дата заявки |
|---|---|---|---|---|
| `lead_0001` | North Wind Yachts | facebook-ads | 2 500 | 20.09.2026 |
| `lead_0013` | Bloom Florists | facebook-ads | 1 500 | 07.09.2026 |
| `lead_0015` | Bloom Florists | website | 2 500 | 18.08.2026 |

Назва Bloom Florists повторюється в двох лідах (`lead_0013` і `lead_0015`). Це окремі заявки з різних джерел, тому розрізняйте їх за id.

Загальний бюджет цих трьох лідів — 6 500.

**Людина:**

> Покажи п'ять найновіших лідів зі статусом new: ідентифікатор, компанія, дата заявки.

**Виклик:** `mcp__leaddesk__leaddesk_find_leads`

```json
{
  "status": "new",
  "limit": 5
}
```

**Результат:**

```text
{"status":"new","total":6,"returned":5,"leads":[{"id":"lead_0002","company":"Rynok Books","status":"new","source":"webinar","budget":500,"createdAt":"2026-09-13T00:52:02.043Z"},{"id":"lead_0005","company":"Brick & Beam","status":"new","source":"linkedin","budget":500,"createdAt":"2026-09-12T02:42:39.732Z"},{"id":"lead_0004","company":"Green Leaf Market","status":"new","source":"facebook-ads","budget":1500,"createdAt":"2026-08-30T17:46:42.505Z"},{"id":"lead_0018","company":"Green Leaf Market","status":"new","source":"google-ads","budget":null,"createdAt":"2026-07-18T05:08:24.837Z"},{"id":"lead_0012","company":"Lviv Coffee Lab","status":"new","source":"website","budget":null,"createdAt":"2026-07-07T20:23:53.712Z"}]}
```

**Агент:**

П'ять найновіших лідів зі статусом `new` (усього їх 6):

| ID | Компанія | Дата заявки |
|---|---|---|
| `lead_0002` | Rynok Books | 13.09.2026 |
| `lead_0005` | Brick & Beam | 12.09.2026 |
| `lead_0004` | Green Leaf Market | 30.08.2026 |
| `lead_0018` | Green Leaf Market | 18.07.2026 |
| `lead_0012` | Lviv Coffee Lab | 07.07.2026 |

Green Leaf Market зустрічається двічі (`lead_0004` і `lead_0018`). Це різні заявки з різних джерел. Шостий лід зі статусом `new` найстарший, тому в цей список не потрапив.

**Людина:**

> Який сумарний бюджет лідів у статусі won? Ліди без бюджету в суму не додавай, але скажи, скільки їх.

**Виклик:** `mcp__leaddesk__leaddesk_find_leads`

```json
{
  "status": "won",
  "limit": 50
}
```

**Результат:**

```text
{"status":"won","total":5,"returned":5,"leads":[{"id":"lead_0011","company":"Lviv Coffee Lab","status":"won","source":"facebook-ads","budget":5000,"createdAt":"2026-09-11T12:34:50.420Z"},{"id":"lead_0006","company":"Nova Dental","status":"won","source":"linkedin","budget":null,"createdAt":"2026-08-31T21:08:50.351Z"},{"id":"lead_0016","company":"Karpaty Tours","status":"won","source":"google-ads","budget":1000,"createdAt":"2026-07-30T05:49:44.585Z"},{"id":"lead_0010","company":"Artisan Bakery","status":"won","source":"linkedin","budget":2500,"createdAt":"2026-07-20T15:04:37.639Z"},{"id":"lead_0017","company":"Hutsul Crafts","status":"won","source":"webinar","budget":500,"createdAt":"2026-06-27T08:23:09.596Z"}]}
```

**Агент:**

Сумарний бюджет лідів у статусі `won` — **9 000**. Усього таких лідів 5, і бюджет вказано в чотирьох.

| ID | Компанія | Бюджет |
|---|---|---|
| `lead_0011` | Lviv Coffee Lab | 5 000 |
| `lead_0016` | Karpty Tours | 1 000 |
| `lead_0010` | Artisan Bakery | 2 500 |
| `lead_0017` | Hutsul Crafts | 500 |

Один лід без бюджету, його в суму не додано: `lead_0006` (Nova Dental).

Примітка: у таблиці я помилково написав «Karpty Tours». Правильна назва в даних — **Karpaty Tours**.

**Людина:**

> Які статуси лідів є в LeadDesk і що кожен із них означає для команди?

**Агент:**

Опис статусів лежить у довідковому ресурсі LeadDesk. Підвантажу інструмент для читання ресурсів.

**Виклик:** `ToolSearch`

```json
{
  "query": "select:ReadMcpResourceTool",
  "max_results": 1
}
```

**Результат:**

```text
{"type":"tool_reference","tool_name":"ReadMcpResourceTool"}
```

**Виклик:** `ReadMcpResourceTool`

```json
{
  "server": "leaddesk",
  "uri": "leaddesk://reference/statuses"
}
```

**Результат:**

```text
{"contents":[{"uri":"leaddesk://reference/statuses","mimeType":"text/markdown","text":"# Статуси лідів LeadDesk\n\nЛід завжди має рівно один із п'яти статусів; інших немає. Кожна зміна статусу — з причиною і лишає запис в аудиті.\n\n| Статус | Що означає для команди | Коли переводимо сюди | Хто переводить |\n|---|---|---|---|\n| `new` | Заявка надійшла, з клієнтом ще ніхто не говорив | Ставиться сам, коли лід створено; вручну — лише щоб виправити помилкову зміну | система (форма заявки) |\n| `contacted` | Відбувся перший справжній контакт: розмова телефоном, відповідь на email або зустріч | Після контакту, а не після спроби, на яку ніхто не відповів | менеджер, який говорив із клієнтом |\n| `qualified` | Підтверджено: реальна задача, бюджет у наших межах, на зв'язку той, хто ухвалює рішення, зрозумілі строки | Після брифу, коли підтверджено всі чотири пункти | менеджер, з погодженням керівника продажів |\n| `won` | Клієнт погодився: договір підписано або аванс сплачено | Лише після підпису чи оплати — усна згода ще не won | керівник продажів або власник агенції |\n| `lost` | Угоди не буде: відмова, обрали іншу агенцію, зник після кількох спроб зв'язку або задача нам не підходить | З будь-якого етапу, з причиною | менеджер ліда |\n\n## Типовий шлях\n\n`new` → `contacted` → `qualified` → `won`; з будь-якого етапу — `lost`.\n\n## Правила\n\n- Етап можна перескочити (наприклад, `new` → `qualified` після одного довгого брифу) — причина має це пояснити.\n- Повернення назад (наприклад, `lost` → `contacted`, якщо клієнт повернувся) дозволене, з причиною.\n- `won` і `lost` — закриті ліди; конверсія = won / (won + lost).\n- Агент сам статус не змінює: лише коли людина прямо попросила змінити статус цього ліда або підтвердила зміну.\n- У причину не пишемо персональних даних клієнта.\n"}]}
```

**Агент:**

У LeadDesk п'ять статусів, інших немає. Кожен лід має рівно один із них.

| Статус | Що означає для команди | Коли ставимо | Хто переводить |
|---|---|---|---|
| `new` | Заявка надійшла, з клієнтом ще ніхто не говорив. | Автоматично при створенні ліда. Вручну лише для виправлення помилкової зміни. | Система (форма заявки) |
| `contacted` | Відбувся перший справжній контакт: розмова телефоном, відповідь на email або зустріч. | Після контакту, а не після спроби, на яку ніхто не відповів. | Менеджер, який говорив із клієнтом |
| `qualified` | Підтверджено чотири пункти: реальна задача, бюджет у наших межах, на зв'язку той, хто ухвалює рішення, зрозумілі строки. | Після брифу, коли підтверджено всі чотири пункти. | Менеджер, з погодженням керівника продажів |
| `won` | Клієнт погодився: договір підписано або аванс сплачено. | Лише після підпису чи оплати. Усна згода ще не `won`. | Керівник продажів або власник агенції |
| `lost` | Угоди не буде: відмова, обрали іншу агенцію, клієнт зник після кількох спроб зв'язку або задача нам не підходить. | З будь-якого етапу, з причиною. | Менеджер ліда |

**Типовий шлях:** `new` → `contacted` → `qualified` → `won`. З будь-якого етапу лід може піти в `lost`.

**Правила:**
- Етап можна перескочити, наприклад `new` → `qualified` після одного довгого брифу. Причина має це пояснити.
- Повернення назад дозволене, наприклад `lost` → `contacted`, якщо клієнт повернувся. Теж потрібна причина.
- Кожна зміна статусу йде з причиною і лишає запис в аудиті. У причину не пишемо персональних даних клієнта.
- `won` і `lost` — закриті ліди. Конверсія рахується як won / (won + lost).
- Я сам статус не змінюю. Роблю це лише тоді, коли ви прямо просите змінити статус конкретного ліда або підтверджуєте зміну.

За вашими даними: `won` — 5 лідів, `qualified` — 3, `new` — 6. Конверсію ще не порахувати, бо я не запитував кількість `lost`. Якщо потрібно, можу це зробити.

**Людина:**

> Ми вже зателефонували в Rynok Books щодо заявки lead_0002. Переведи цей лід у статус contacted.

**Агент:**

Ви прямо просите змінити статус, тож підвантажую інструмент зміни статусу.

**Виклик:** `ToolSearch`

```json
{
  "query": "select:mcp__leaddesk__leaddesk_set_lead_status",
  "max_results": 1
}
```

**Результат:**

```text
{"type":"tool_reference","tool_name":"mcp__leaddesk__leaddesk_set_lead_status"}
```

**Виклик:** `mcp__leaddesk__leaddesk_set_lead_status`

```json
{
  "leadId": "lead_0002",
  "status": "contacted",
  "reason": "Зателефонували клієнту щодо заявки, відбувся перший контакт."
}
```

**Результат:**

```text
{"lead":{"id":"lead_0002","company":"Rynok Books","status":"contacted","source":"webinar","budget":500,"createdAt":"2026-09-13T00:52:02.043Z"},"audit":{"action":"lead.status_changed","leadId":"lead_0002","at":"2026-11-15T15:25:07.005Z","from":"new","to":"contacted","reason":"Зателефонували клієнту щодо заявки, відбувся перший контакт."}}
```

**Агент:**

Лід `lead_0002` (Rynok Books) переведено зі статусу `new` у `contacted`.

В аудит записано причину: «Зателефонували клієнту щодо заявки, відбувся перший контакт.» Запис створено 15.11.2026, персональних даних у ньому немає.

Тепер у статусі `new` лишилося 5 лідів замість 6.

Згідно з правилами LeadDesk, `contacted` ставимо після розмови чи відповіді клієнта, а не після спроби додзвонитися. Я виходив із того, що ваш дзвінок був саме розмовою. Якщо ніхто не відповів, скажіть, і я поверну лід у `new`.

**Людина:**

> Лід lead_0003 (Metro Logistics) відмовився: обрали іншу агенцію. Познач його як lost і вкажи причину.

**Агент:**

Лід `lead_0003` ще не траплявся в моїх вибірках. Тому спершу перевірю, що це справді Metro Logistics і який у нього поточний статус.

**Виклик:** `mcp__leaddesk__leaddesk_find_leads`

```json
{
  "status": "any",
  "limit": 50
}
```

**Результат:**

```text
{"status":"any","total":20,"returned":20,"leads":[{"id":"lead_0001","company":"North Wind Yachts","status":"qualified","source":"facebook-ads","budget":2500,"createdAt":"2026-09-20T06:32:40.447Z"},{"id":"lead_0002","company":"Rynok Books","status":"contacted","source":"webinar","budget":500,"createdAt":"2026-09-13T00:52:02.043Z"},{"id":"lead_0005","company":"Brick & Beam","status":"new","source":"linkedin","budget":500,"createdAt":"2026-09-12T02:42:39.732Z"},{"id":"lead_0011","company":"Lviv Coffee Lab","status":"won","source":"facebook-ads","budget":5000,"createdAt":"2026-09-11T12:34:50.420Z"},{"id":"lead_0008","company":"Brick & Beam","status":"contacted","source":"website","budget":1500,"createdAt":"2026-09-10T21:30:58.988Z"},{"id":"lead_0013","company":"Bloom Florists","status":"qualified","source":"facebook-ads","budget":1500,"createdAt":"2026-09-07T13:54:42.854Z"},{"id":"lead_0006","company":"Nova Dental","status":"won","source":"linkedin","budget":null,"createdAt":"2026-08-31T21:08:50.351Z"},{"id":"lead_0004","company":"Green Leaf Market","status":"new","source":"facebook-ads","budget":1500,"createdAt":"2026-08-30T17:46:42.505Z"},{"id":"lead_0015","company":"Bloom Florists","status":"qualified","source":"website","budget":2500,"createdAt":"2026-08-18T15:29:38.903Z"},{"id":"lead_0016","company":"Karpaty Tours","status":"won","source":"google-ads","budget":1000,"createdAt":"2026-07-30T05:49:44.585Z"},{"id":"lead_0014","company":"Nova Dental","status":"contacted","source":"facebook-ads","budget":2500,"createdAt":"2026-07-27T20:15:23.380Z"},{"id":"lead_0007","company":"Rynok Books","status":"lost","source":"referral","budget":5000,"createdAt":"2026-07-26T23:16:04.124Z"},{"id":"lead_0020","company":"UrbanFit Studio","status":"lost","source":"referral","budget":2500,"createdAt":"2026-07-24T12:31:19.113Z"},{"id":"lead_0010","company":"Artisan Bakery","status":"won","source":"linkedin","budget":2500,"createdAt":"2026-07-20T15:04:37.639Z"},{"id":"lead_0018","company":"Green Leaf Market","status":"new","source":"google-ads","budget":null,"createdAt":"2026-07-18T05:08:24.837Z"},{"id":"lead_0003","company":"Metro Logistics","status":"contacted","source":"facebook-ads","budget":10000,"createdAt":"2026-07-18T00:14:44.381Z"},{"id":"lead_0012","company":"Lviv Coffee Lab","status":"new","source":"website","budget":null,"createdAt":"2026-07-07T20:23:53.712Z"},{"id":"lead_0019","company":"Svitlo Solar","status":"new","source":"website","budget":500,"createdAt":"2026-06-30T21:07:00.656Z"},{"id":"lead_0009","company":"North Wind Yachts","status":"contacted","source":"webinar","budget":2500,"createdAt":"2026-06-27T14:53:21.060Z"},{"id":"lead_0017","company":"Hutsul Crafts","status":"won","source":"webinar","budget":500,"createdAt":"2026-06-27T08:23:09.596Z"}]}
```

**Агент:**

`lead_0003` справді Metro Logistics. Зараз він у статусі `contacted`, бюджет 10 000. Переводжу в `lost`.

**Виклик:** `mcp__leaddesk__leaddesk_set_lead_status`

```json
{
  "leadId": "lead_0003",
  "status": "lost",
  "reason": "Клієнт відмовився: обрав іншу агенцію."
}
```

**Результат:**

```text
{"lead":{"id":"lead_0003","company":"Metro Logistics","status":"lost","source":"facebook-ads","budget":10000,"createdAt":"2026-07-18T00:14:44.381Z"},"audit":{"action":"lead.status_changed","leadId":"lead_0003","at":"2026-11-15T15:25:58.405Z","from":"contacted","to":"lost","reason":"Клієнт відмовився: обрав іншу агенцію."}}
```

**Агент:**

Лід `lead_0003` (Metro Logistics) переведено зі статусу `contacted` у `lost`.

В аудит записано причину: «Клієнт відмовився: обрав іншу агенцію.» Запис створено 15.11.2026, персональних даних у ньому немає.

Це найбільший за бюджетом лід у системі, 10 000. Згідно з правилами, якщо клієнт повернеться, лід можна повернути, наприклад, у `contacted`, теж із причиною.

Раніше я не знав кількості лідів у `lost`, тож не міг порахувати конверсію. За останньою вибіркою тепер можу. У `lost` зараз 3 ліди: `lead_0003`, `lead_0007` і `lead_0020`. У `won` 5 лідів. Конверсія = 5 / (5 + 3) = **62,5%**.
