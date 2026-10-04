// LeadDesk as an MCP server: the factory and the lead store. Both entry points use it:
//   src/server.mjs  stdio (Claude Code, Inspector)
//   src/http.mjs    Streamable HTTP on 127.0.0.1 (bonus E1)
//
// The store lives at module level, not inside the factory: createMcpHandler calls the factory
// once per HTTP request, serveStdio once per connection. A store created in the factory would
// forget every status change before the next request.
//
// Offline on the fixture: fixtures/leads.json (an unchanged copy of materials/leads.json) is read
// once at start; changes live in this process only. The file is never written.
import { McpServer } from "@modelcontextprotocol/server";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// Vocabulary of the app, not invented here: LEAD_STATUSES in lib/types.ts, leadId() in lib/db.ts.
export const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost"];
export const LEAD_ID = /^lead_\d{4}$/;
// Team decision: a closed deal is not reopened by the agent; a person does it in the dashboard.
const CLOSED = new Set(["won", "lost"]);
// The only fields the two verbs need. No fullName, email or message: those are the visitor's
// personal data and free text written by a third party.
const PUBLIC_FIELDS = ["id", "company", "status", "source", "budget", "createdAt"];
// Same naming as the app's own audit log (logAudit("lead.created", …) in app/actions.ts).
const AUDIT_ACTION = "lead.status_changed";

const FIXTURE =
  process.env.LEADDESK_FIXTURE ?? fileURLToPath(new URL("../fixtures/leads.json", import.meta.url));

function loadLeads(json) {
  const rows = JSON.parse(json);
  if (!Array.isArray(rows)) throw new Error("fixture: expected an array of leads");
  for (const r of rows) {
    if (!LEAD_ID.test(r?.id ?? "")) throw new Error(`fixture: bad lead id ${JSON.stringify(r?.id)}`);
    if (!LEAD_STATUSES.includes(r.status)) throw new Error(`fixture: ${r.id} has unknown status ${r.status}`);
  }
  return new Map(rows.map((r) => [r.id, { ...r }]));
}

const leads = loadLeads(await readFile(FIXTURE, "utf8"));
const audit = [];
console.error(`leaddesk: ${leads.size} leads loaded from the fixture (read-only file, changes stay in memory)`);

const pick = (lead) => Object.fromEntries(PUBLIC_FIELDS.map((k) => [k, lead[k]]));
const newestFirst = (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id);
const day = (iso) => iso.slice(0, 10);
const money = (n) => (n === null ? "без бюджету" : `бюджет ${n}`);
const fail = (text) => ({ isError: true, content: [{ type: "text", text }] });

export const STATUSES_URI = "leaddesk://reference/statuses";

// What each status means for the Studio Nova team. The database stores only the word; the meaning
// lives here so the agent reads it instead of guessing.
export const STATUSES_MARKDOWN = `# Статуси лідів LeadDesk

Статус — рівно одне з п'яти значень \`LEAD_STATUSES\` застосунку. Інших статусів немає.

| Статус | Що означає для команди | Хто і коли переводить сюди |
|---|---|---|
| \`new\` | Заявка з форми на сайті, з лідом ще ніхто не говорив | Застосунок, коли відвідувач надсилає форму. Вручну в \`new\` не повертаємо |
| \`contacted\` | Менеджер уперше поговорив із клієнтом: дзвінок або відповідь на лист, де клієнт відповів | Менеджер після першої розмови. Лист без відповіді — це ще \`new\` |
| \`qualified\` | Відомі задача, бюджет і термін, і вони нам підходять; можна готувати кошторис | Менеджер після розмови, де клієнт назвав задачу, бюджет і термін |
| \`won\` | Клієнт підписав договір або сплатив аванс | Акаунт-менеджер, коли є підписаний договір або аванс. Усне «так» — це ще \`qualified\` |
| \`lost\` | Угоди не буде: клієнт відмовився, обрав іншу агенцію, не відповідає 30 днів, або задача нам не підходить | Менеджер, із причиною. Причину пишемо завжди |

## Правила зміни статусу

- Кожна зміна — з причиною (3–500 символів) і записом в аудиті \`lead.status_changed\`.
- Перед зміною агент показує людині, що саме зміниться («lead_0002: new → contacted, причина …»), і
  чекає підтвердження.
- \`won\` і \`lost\` — закриті угоди. Агент їх не перевідкриває: це робить людина в дашборді.
- У \`new\` лід не повертаємо: цей статус ставить лише застосунок, коли приходить заявка.
- Той самий статус, що вже є, — помилка, а не «успішна» зміна: так видно, що дані розійшлися з очікуванням.
`;

export function createLeadDeskServer() {
  const server = new McpServer({ name: "leaddesk", version: "0.1.0" });

  server.registerTool(
    "leaddesk_find_leads",
    {
      title: "Знайти ліди LeadDesk",
      description:
        "Повертає ліди LeadDesk за статусом, найновіші першими: id, компанія, статус, джерело, бюджет і дата заявки. " +
        "Імені, email і тексту заявки не повертає. Також повертає, скільки лідів усього має цей статус. " +
        `Тільки читає, нічого не змінює. Що означає кожен статус — у ресурсі ${STATUSES_URI}.`,
      inputSchema: {
        status: z
          .enum([...LEAD_STATUSES, "any"])
          .describe("Який статус шукати: new, contacted, qualified, won або lost; any — усі статуси"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(10)
          .describe("Скільки лідів повернути, від 1 до 50; за замовчуванням 10. Поле total у відповіді каже, скільки їх усього"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ status, limit }) => {
      const matched = [...leads.values()].filter((l) => status === "any" || l.status === status).sort(newestFirst);
      const shown = matched.slice(0, limit).map(pick);
      const head = `Статус ${status}: знайдено ${matched.length}, показано ${shown.length} (найновіші першими).`;
      const lines = shown.map((l) => `- ${l.id} · ${l.company} · ${l.status} · ${l.source} · ${money(l.budget)} · ${day(l.createdAt)}`);
      return {
        content: [{ type: "text", text: [head, ...lines].join("\n") }],
        structuredContent: { status, total: matched.length, returned: shown.length, leads: shown },
      };
    },
  );

  server.registerTool(
    "leaddesk_set_lead_status",
    {
      title: "Змінити статус ліда LeadDesk",
      description:
        "ЗМІНЮЄ ДАНІ: переводить один лід LeadDesk у новий статус і пише запис в аудит (lead.status_changed). " +
        "Перед викликом покажи людині, що зміниться («lead_0002: new → contacted, причина …»), і дочекайся її підтвердження. " +
        "Той самий статус і невідомий лід — помилка. Закриті ліди (won, lost) не перевідкриває: це робить людина в дашборді. " +
        `Коли переводити в який статус — у ресурсі ${STATUSES_URI}.`,
      inputSchema: {
        leadId: z
          .string()
          .regex(LEAD_ID)
          .describe("Ідентифікатор ліда у форматі lead_0002: lead_ і чотири цифри. Невідомий — знайди через leaddesk_find_leads"),
        status: z
          .enum(LEAD_STATUSES)
          .describe("Новий статус: contacted, qualified, won або lost (new ставить лише застосунок, повернути туди не можна). Має відрізнятися від поточного"),
        reason: z
          .string()
          .trim()
          .min(3)
          .max(500)
          .describe("Чому змінюємо статус, 3–500 символів, наприклад «зателефонували, клієнт чекає кошторис». Потрапляє в аудит"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ leadId, status, reason }) => {
      const lead = leads.get(leadId);
      if (!lead) {
        return fail(`Ліда ${leadId} немає в LeadDesk. Знайди правильний ідентифікатор через leaddesk_find_leads (status: any).`);
      }
      if (lead.status === status) {
        return fail(`${leadId} уже має статус ${status}; нічого не змінено. Перевір поточний стан через leaddesk_find_leads.`);
      }
      if (CLOSED.has(lead.status)) {
        return fail(`${leadId} — закрита угода (${lead.status}); агент її не перевідкриває. Перевідкрити може людина в дашборді LeadDesk.`);
      }
      if (status === "new") { // new is set only by the app when the form arrives (resource: «Вручну в new не повертаємо»)
        return fail(`${leadId}: у new лід ставить лише застосунок, коли приходить заявка; вручну туди не повертаємо. Лист без відповіді — лишай поточний статус.`);
      }
      const from = lead.status;
      lead.status = status;
      const entry = { action: AUDIT_ACTION, leadId, at: new Date().toISOString(), from, to: status, reason, actor: "mcp:leaddesk" };
      audit.push(entry);
      console.error(`leaddesk: ${leadId} ${from} -> ${status}`); // no personal data in the log
      return {
        content: [{ type: "text", text: `${leadId} (${lead.company}): ${from} → ${status}. Запис аудиту: ${entry.action} о ${entry.at}.` }],
        structuredContent: { lead: pick(lead), audit: entry },
      };
    },
  );

  server.registerResource(
    "leaddesk-statuses",
    STATUSES_URI,
    {
      title: "Статуси лідів LeadDesk",
      description: "П'ять статусів лідів і що кожен означає для команди: коли лід стає contacted, qualified, won, lost і хто його переводить",
      mimeType: "text/markdown",
    },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: STATUSES_MARKDOWN }] }),
  );

  return server;
}
