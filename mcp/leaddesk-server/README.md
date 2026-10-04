# LeadDesk MCP server (Task A)

Два бізнес-дієслова LeadDesk замість SQL на всю базу: знайти ліди за статусом і змінити статус
одного ліда із записом в аудит. Плюс ресурс зі значенням статусів для команди. stdio, офлайн на
фікстурі, JavaScript-модулі без збірки.

| Що | Тип | Змінює дані |
|---|---|---|
| `leaddesk_find_leads` (`status`: `new`…`lost` або `any`, `limit` 1–50) | інструмент, `readOnlyHint: true` | ні |
| `leaddesk_set_lead_status` (`leadId` `^lead_\d{4}$`, `status`, `reason` 3–500) | інструмент, `readOnlyHint: false` | так, у пам'яті процесу, + запис аудиту |
| `leaddesk://reference/statuses` | ресурс, `text/markdown` | — |

Рішення, які сервер тримає сам, а не просить у моделі:

- `leaddesk_find_leads` віддає лише `id`, `company`, `status`, `source`, `budget`, `createdAt`,
  найновіші першими, і `total`: скільки лідів має цей статус, навіть коли показано менше (`limit`).
  Імені, email і тексту заявки у відповіді немає.
- `leaddesk_set_lead_status`: невідомий лід, той самий статус і **закрита угода** (`won`, `lost`) —
  `isError: true` з підказкою, що робити. Закриту угоду перевідкриває людина в дашборді, не агент.
- Запис аудиту — форма `AuditEntry` застосунку (`{ action, leadId, at }`) з `action:
  "lead.status_changed"` (як `lead.created` у `app/actions.ts`), плюс `from`, `to`, `reason`, `actor`.
- Ліди й аудит живуть на рівні модуля `src/leaddesk.mjs`, а не у фабриці: `createMcpHandler` викликає
  фабрику на кожен HTTP-запит, і стан у фабриці губив би кожну зміну.
- `fixtures/leads.json` — незмінна копія `materials/leads.json`; сервер читає її один раз і не пише.
  Шлях рахується від модуля; інший файл — змінна `LEADDESK_FIXTURE`.
- stdout — лише протокол. Журнал — `console.error`, без персональних даних (лише `lead_0002 new -> contacted`).

## Файли

| Файл | Що це |
|---|---|
| `src/leaddesk.mjs` | фабрика `createLeadDeskServer()`, сховище в пам'яті, два інструменти, ресурс |
| `src/server.mjs` | stdio: `serveStdio(createLeadDeskServer)` |
| `src/http.mjs` | бонус E1: Streamable HTTP лише на `127.0.0.1:3333`, гварди Host і Origin викликано в обробнику |
| `scripts/check-contract.mjs` | перевірка контракту через Inspector (C1–C17) і `--self-test` на 10 мутантах |
| `scripts/make-inspector-artifacts.sh` | чотири JSON у `docs/mcp/` командами walkthrough + перевірка, що це чистий JSON |
| `scripts/check-http.sh` | бонус E1: чотири `curl` (200/403/403/400), атаки на гварди, стан між запитами, абляція |

## Запуск і перевірка

Node.js ≥ 22.19. З кореня репозиторію:

```bash
(cd mcp/leaddesk-server && npm ci)
npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs --method tools/list
node mcp/leaddesk-server/scripts/check-contract.mjs            # 17/17 PASS, exit 0
node mcp/leaddesk-server/scripts/check-contract.mjs --self-test # кожен мутант ловить своя перевірка
bash mcp/leaddesk-server/scripts/make-inspector-artifacts.sh    # оновити docs/mcp/*.json
bash mcp/leaddesk-server/scripts/check-http.sh                  # E1: HTTP-варіант, exit 0
```

## Підключення до Claude Code

Скоуп `local` (запис у `~/.claude.json`, у git нічого), шлях абсолютний:

```bash
claude mcp add leaddesk -- node "/абсолютний/шлях/до/2026-quitcode-05-mcp-hw/mcp/leaddesk-server/src/server.mjs"
```

У новій сесії `/mcp` показує `leaddesk` із двома інструментами. Прибрати: `claude mcp remove leaddesk`.
Змінні оточення: лише необов'язкова `LEADDESK_FIXTURE`; секретів сервер не потребує.
