// LeadDesk as a domain MCP server — QuitCode Workshop 5, Task A.
// Two business verbs instead of SQL on the whole database:
//   leaddesk_find_leads       reads: leads by status, newest first, only the fields the team needs
//   leaddesk_set_lead_status  writes: changes one lead's status and leaves an audit entry
// plus the resource leaddesk://reference/statuses — what each status means for the team.
//
//   node src/server.mjs                                   stdio, offline on fixtures/leads.json
//   LEADDESK_FIXTURE=/path/to/leads.json node src/server.mjs
//
// The fixture is read once; changes live in process memory only and the file is never written.
// stdout is the protocol channel: nothing is printed to it, diagnostics go to stderr without personal data.
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { z } from "zod";

// The vocabulary comes from the app: LEAD_STATUSES in lib/types.ts, leadId() in lib/db.ts.
export const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost"];
const LEAD_ID = /^lead_\d{4}$/;

const FIXTURE = process.env.LEADDESK_FIXTURE ?? fileURLToPath(new URL("../fixtures/leads.json", import.meta.url));

// One store per process: every session of the HTTP variant sees the same leads and audit log.
const leads = new Map(JSON.parse(await readFile(FIXTURE, "utf8")).map((lead) => [lead.id, { ...lead }]));
const audit = [];

// Only what the two verbs need: no name, e-mail or message text of the lead.
const publicLead = ({ id, company, status, source, budget, createdAt }) => ({ id, company, status, source, budget, createdAt });

const STATUS_MEANING = `# Статуси лідів LeadDesk

П'ять статусів — рівно \`LEAD_STATUSES\` застосунку. Статус змінює лише людина з команди Studio Nova
або агент із її підтвердження; кожна зміна лишає запис в аудиті.

| Статус | Що означає для команди | Коли переводимо сюди |
|---|---|---|
| \`new\` | Заявка з форми чи каналу, з клієнтом ще ніхто не говорив | Автоматично, коли заявка надходить |
| \`contacted\` | Менеджер зв'язався з клієнтом (дзвінок, лист, месенджер), розмову почато | Після першого реального контакту, не після автолиста |
| \`qualified\` | Є задача, бюджет і людина, що ухвалює рішення; готуємо кошторис | Коли на дзвінку підтверджено потребу, бюджет і терміни |
| \`won\` | Клієнт погодив кошторис і підписав договір або сплатив аванс | Лише акаунт-менеджер, після підпису чи оплати |
| \`lost\` | Угоди не буде: відмова, інша агенція, немає бюджету, не виходить на зв'язок | З причиною в полі \`reason\`, щоб команда бачила, чому втратили |

Звичайний шлях: \`new\` → \`contacted\` → \`qualified\` → \`won\`. З будь-якого статусу лід може стати \`lost\`.
`;

const fail = (text) => ({ isError: true, content: [{ type: "text", text }] });

export const factory = () => {
  const server = new McpServer({ name: "leaddesk", version: "0.1.0" });

  server.registerTool(
    "leaddesk_find_leads",
    {
      title: "Знайти ліди за статусом",
      description:
        "Повертає ліди LeadDesk із заданим статусом, найновіші першими: id, компанія, статус, джерело, бюджет (USD на місяць, може бути null) і дата заявки. Імен, email і тексту заявки не повертає. Тільки читає, нічого не змінює. Що означає кожен статус — у ресурсі leaddesk://reference/statuses.",
      inputSchema: {
        status: z
          .enum([...LEAD_STATUSES, "any"])
          .describe("Який статус шукати: new, contacted, qualified, won або lost; any — ліди в усіх статусах"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(10)
          .describe("Скільки лідів повернути, від 1 до 50; за замовчуванням 10. Для підрахунку чи суми беріть 50"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ status, limit = 10 }) => {
      const matching = [...leads.values()]
        .filter((lead) => status === "any" || lead.status === status)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const page = matching.slice(0, limit).map(publicLead);
      const lines = page.map((l) => `- ${l.id} · ${l.company} · ${l.status} · ${l.source} · бюджет ${l.budget ?? "—"} · ${l.createdAt.slice(0, 10)}`);
      return {
        content: [
          {
            type: "text",
            text: `Статус ${status}: знайдено ${matching.length}, показано ${page.length} (найновіші першими).\n${lines.join("\n")}`,
          },
        ],
        structuredContent: { status, total: matching.length, returned: page.length, leads: page },
      };
    },
  );

  server.registerTool(
    "leaddesk_set_lead_status",
    {
      title: "Змінити статус ліда",
      description:
        "ЗМІНЮЄ ДАНІ: переводить один лід LeadDesk у новий статус і пише запис в аудит (хто/що/коли). Перед викликом отримай підтвердження людини: назви лід, поточний і новий статус. Лише статуси з переліку; той самий статус, що вже є, — помилка. Ідентифікатор ліда, якщо не знаєш його, знайди через leaddesk_find_leads.",
      inputSchema: {
        leadId: z
          .string()
          .regex(LEAD_ID)
          .describe("Ідентифікатор ліда у форматі lead_ і чотири цифри, напр. lead_0002"),
        status: z
          .enum(LEAD_STATUSES)
          .describe("Новий статус: new, contacted, qualified, won або lost. Значення — у ресурсі leaddesk://reference/statuses"),
        reason: z
          .string()
          .trim()
          .min(3)
          .max(500)
          .describe("Чому змінюємо статус, 3–500 символів, напр. «зателефонували, домовились про бриф». Потрапляє в аудит"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ leadId, status, reason }) => {
      const lead = leads.get(leadId);
      if (!lead) {
        return fail(`Ліда ${leadId} немає в LeadDesk. Знайдіть правильний ідентифікатор через leaddesk_find_leads (status: "any").`);
      }
      if (lead.status === status) {
        return fail(`Лід ${leadId} (${lead.company}) уже має статус ${status}. Нічого не змінено.`);
      }
      const from = lead.status;
      const at = new Date().toISOString();
      lead.status = status;
      lead.updatedAt = at;
      const entry = { action: "lead.status_changed", leadId, at, from, to: status, reason, actor: "mcp:leaddesk" };
      audit.push(entry);
      console.error(`[leaddesk] ${entry.action} ${leadId} ${from} -> ${status}`);
      return {
        content: [{ type: "text", text: `Лід ${leadId} (${lead.company}): ${from} → ${status}. Запис аудиту: ${entry.action} о ${at}.` }],
        structuredContent: { lead: publicLead(lead), audit: entry },
      };
    },
  );

  server.registerResource(
    "leaddesk-statuses",
    "leaddesk://reference/statuses",
    {
      title: "Статуси лідів LeadDesk",
      description: "П'ять статусів ліда і що кожен означає для команди: коли переводимо, хто вирішує",
      mimeType: "text/markdown",
    },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: STATUS_MEANING }] }),
  );

  return server;
};

// Started directly → stdio. Imported (by src/http.mjs) → only the factory and the shared store.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await serveStdio(factory);
}
