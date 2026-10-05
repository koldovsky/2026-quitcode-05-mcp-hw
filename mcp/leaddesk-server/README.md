# LeadDesk MCP server

Доменний stdio-сервер LeadDesk (Task A): два бізнес-дієслова замість SQL на всю базу.

| Ім'я | Що робить | Анотації |
|---|---|---|
| `leaddesk_find_leads` | ліди за статусом (`any` — усі), найновіші першими; лише `id`, `company`, `status`, `source`, `budget`, `createdAt` | `readOnlyHint: true` |
| `leaddesk_set_lead_status` | змінює статус ліда й пише запис аудиту `{ action, leadId, at, from, to, reason }` | `readOnlyHint: false` |
| `leaddesk://reference/statuses` | ресурс `text/markdown`: п'ять статусів і що кожен означає для команди | — |

Дані — `fixtures/leads.json` (незмінна копія `materials/leads.json`, 20 лідів). Сервер читає файл один
раз і тримає зміни в пам'яті процесу: після перезапуску стан знову вихідний, файл не переписується.

## Запуск

```bash
cd mcp/leaddesk-server
npm ci
node src/server.mjs        # stdio; чекає на JSON-RPC у stdin
```

Змінні оточення (необов'язкові):

- `LEADDESK_FIXTURE` — шлях до іншого JSON з лідами. Без неї — `fixtures/leads.json` поруч із модулем.

## Перевірка Inspector'ом

З кореня репозиторію:

```bash
npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs --method tools/list
npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
  --method tools/call --tool-name leaddesk_find_leads --tool-arg status=new --tool-arg limit=5
npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
  --method resources/read --uri leaddesk://reference/statuses
```

Збережені результати — у `docs/mcp/*.json`.

## HTTP-режим (Task E1)

```bash
node src/http.mjs          # http://127.0.0.1:3333/mcp — лише localhost
```

Та сама фабрика (`src/leaddesk.mjs`), транспорт Streamable HTTP. Гварди Host і Origin викликаються в
обробнику запиту: підроблений `Host` чи `Origin` → 403. Автентифікації немає — не виставляйте сервер
за межі `127.0.0.1`. Перевірки `curl` — `docs/mcp/verification.md`, розділ «Task E».

## Підключення до Claude Code

Абсолютний шлях, бо Claude Code запускає сервер не з вашої теки:

```bash
claude mcp add leaddesk -- node "/абсолютний/шлях/до/репо/mcp/leaddesk-server/src/server.mjs"
```

Після цього в `/mcp` має бути `leaddesk` з двома інструментами. `leaddesk_set_lead_status` змінює дані —
кожен виклик схвалюйте вручну.
