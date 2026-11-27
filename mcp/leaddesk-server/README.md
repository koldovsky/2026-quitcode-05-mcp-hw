# LeadDesk MCP server

Доменний MCP-сервер LeadDesk (Task A): два бізнес-дієслова замість SQL на всю базу.

| Ім'я | Що робить | Анотації |
|---|---|---|
| `leaddesk_find_leads` | ліди за статусом (`new`…`lost` або `any`), найновіші першими; лише `id`, `company`, `status`, `source`, `budget`, `createdAt` | `readOnlyHint: true` |
| `leaddesk_set_lead_status` | змінює статус одного ліда й повертає запис аудиту `{ action, leadId, at, from, to, reason, actor }` | `readOnlyHint: false` |
| `leaddesk://reference/statuses` | ресурс `text/markdown`: що кожен статус означає для команди | — |

Працює офлайн на `fixtures/leads.json` — незмінній копії `materials/leads.json`. Фікстуру сервер читає
один раз; зміни живуть у пам'яті процесу, файл не переписується. Перезапуск — і дані знову ті самі.

## Запуск

Node.js ≥ 22.19.

```bash
cd mcp/leaddesk-server
npm ci
node src/server.mjs          # stdio; сам по собі чекає клієнта MCP
```

Змінні оточення (усі необов'язкові, секретів немає):

- `LEADDESK_FIXTURE` — інший JSON із лідами замість `fixtures/leads.json`;
- `LEADDESK_HTTP_PORT` — порт HTTP-варіанта (за замовчуванням `3333`).

## Перевірка Inspector'ом

З кореня репозиторію:

```bash
npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs --method tools/list
npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
  --method tools/call --tool-name leaddesk_find_leads --tool-arg status=qualified
npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
  --method resources/read --uri leaddesk://reference/statuses
```

Збережені результати — у [`docs/mcp/`](../../docs/mcp/).

## Підключення до Claude Code

Зі скоупом `local` (у git нічого не потрапляє), з теки, де працюватиме агент:

```bash
claude mcp add leaddesk -- node "/повний/шлях/до/репозиторію/mcp/leaddesk-server/src/server.mjs"
```

Потім `/mcp` → `leaddesk` має показати два інструменти. Кожен виклик `leaddesk_set_lead_status`
схвалюйте вручну.

## HTTP-варіант (Task E1)

```bash
cd mcp/leaddesk-server
node src/http.mjs            # http://127.0.0.1:3333/mcp, лише 127.0.0.1
```

Та сама фабрика, що в `src/server.mjs`. Гварди Host і Origin (`localhostHostValidation`,
`localhostOriginValidation` з `@modelcontextprotocol/node`) викликаються в обробнику запиту до MCP:
підроблений `Host` чи чужий `Origin` дає 403. Докази — `docs/mcp/evidence/e1-curl.txt`.
