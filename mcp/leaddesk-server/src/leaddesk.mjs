// LeadDesk as a domain MCP server (Task A, Workshop 5): the factory shared by both transports.
// Two business verbs instead of SQL on the whole database: find leads, change a lead's status.
//
//   src/server.mjs   stdio (Claude Code, Inspector)
//   src/http.mjs     Streamable HTTP on 127.0.0.1 (Task E1)
//
// The fixture is read once; changes live in process memory only, the file is never written.
// In stdio mode stdout is the protocol channel: log only to stderr (console.error), without personal data.
import { McpServer } from "@modelcontextprotocol/server";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const FIXTURE = process.env.LEADDESK_FIXTURE ?? fileURLToPath(new URL("../fixtures/leads.json", import.meta.url));

// Same vocabulary as the app: LEAD_STATUSES in lib/types.ts, leadId() in lib/db.ts.
const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost"];
const LEAD_ID = /^lead_\d{4}$/;

const leads = JSON.parse(await readFile(FIXTURE, "utf8"));
const audit = [];

// Only what the two verbs need: no name, email or request text.
const publicLead = ({ id, company, status, source, budget, createdAt }) => ({ id, company, status, source, budget, createdAt });

const fail = (text) => ({ isError: true, content: [{ type: "text", text }] });

export const factory = () => {
  const server = new McpServer({ name: "leaddesk", version: "0.1.0" });

  server.registerTool(
    "leaddesk_find_leads",
    {
      title: "Знайти ліди LeadDesk",
      description:
        "Повертає ліди LeadDesk за статусом, найновіші першими: id, компанія, статус, джерело, бюджет, дата створення. Без імен, email і тексту заявки. Застосовуй, щоб побачити, хто в роботі, або знайти id ліда перед зміною статусу. Тільки читає, нічого не змінює.",
      inputSchema: {
        status: z
          .enum([...LEAD_STATUSES, "any"])
          .describe("Статус лідів: new, contacted, qualified, won, lost; any — усі статуси. Значення статусів — у ресурсі leaddesk://reference/statuses"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(10)
          .describe("Скільки лідів повернути, від 1 до 50. За замовчуванням 10"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ status, limit = 10 }) => {
      const found = leads
        .filter((l) => status === "any" || l.status === status)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)
        .map(publicLead);
      const lines = found.map((l) => `- ${l.id} · ${l.company} · ${l.status} · ${l.source} · ${l.budget ?? "—"} · ${l.createdAt.slice(0, 10)}`);
      const text = found.length
        ? `Лідів зі статусом ${status}: ${found.length}\n${lines.join("\n")}`
        : `Лідів зі статусом ${status} немає`;
      return { content: [{ type: "text", text }], structuredContent: { status, count: found.length, leads: found } };
    },
  );

  server.registerTool(
    "leaddesk_set_lead_status",
    {
      title: "Змінити статус ліда LeadDesk",
      description:
        "ЗМІНЮЄ ДАНІ: переводить один лід LeadDesk у новий статус і пише запис в аудит { action, leadId, at }. Перед викликом покажи людині, який лід, з якого статусу на який і чому, та отримай її підтвердження. Id ліда бери з leaddesk_find_leads, не вгадуй. Той самий статус, що вже є, — помилка.",
      inputSchema: {
        leadId: z.string().regex(LEAD_ID).describe("Ідентифікатор ліда у форматі lead_0000, напр. lead_0002"),
        status: z.enum(LEAD_STATUSES).describe("Новий статус: new, contacted, qualified, won або lost. Що кожен означає — у ресурсі leaddesk://reference/statuses"),
        reason: z.string().min(3).max(500).describe("Чому змінюємо статус, 3–500 символів, напр. «дзвінок 12.10: погодили бриф». Потрапляє в аудит"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ leadId, status, reason }) => {
      const lead = leads.find((l) => l.id === leadId);
      if (!lead) return fail(`Лід ${leadId} не знайдено. Знайди правильний id через leaddesk_find_leads (status: "any").`);
      if (lead.status === status) return fail(`Лід ${leadId} уже має статус ${status}. Нічого не змінено.`);

      const from = lead.status;
      lead.status = status;
      const entry = { action: "lead.status_changed", leadId, at: new Date().toISOString(), from, to: status, reason };
      audit.push(entry);
      console.error(`[leaddesk] ${leadId}: ${from} -> ${status}`);

      return {
        content: [{ type: "text", text: `Статус ${leadId} змінено: ${from} → ${status}. Запис аудиту: ${entry.action} о ${entry.at}` }],
        structuredContent: { lead: publicLead(lead), audit: entry },
      };
    },
  );

  server.registerResource(
    "leaddesk-statuses",
    "leaddesk://reference/statuses",
    {
      title: "Статуси лідів LeadDesk",
      description: "П'ять статусів ліда і що кожен означає для команди Studio Nova: коли й хто переводить лід далі",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "text/markdown", text: STATUSES_MD }],
    }),
  );

  return server;
};

const STATUSES_MD = `# Статуси лідів LeadDesk

Лід рухається зліва направо: \`new\` → \`contacted\` → \`qualified\` → \`won\` або \`lost\`.
Кожна зміна — через \`leaddesk_set_lead_status\` з причиною й підтвердженням людини.

| Статус | Що означає | Хто і коли переводить сюди |
|---|---|---|
| \`new\` | Заявка прийшла з форми чи реклами, з клієнтом ще ніхто не говорив | Створюється автоматично. Повертати в \`new\` — лише якщо статус змінили помилково |
| \`contacted\` | Менеджер зв'язався з клієнтом: дзвінок або лист із відповіддю | Менеджер — одразу після першого реального контакту, не після відправки шаблонного листа |
| \`qualified\` | Є підтверджена потреба, бюджет і особа, що ухвалює рішення; можна готувати кошторис | Менеджер — після дзвінка-брифу, коли всі три пункти відомі |
| \`won\` | Клієнт погодив кошторис або підписав договір | Лише керівник акаунта (owner) — після підпису чи передоплати |
| \`lost\` | Клієнт відмовився, не відповідає 14 днів або не підходить нам | Менеджер — у причині обов'язково вказує, чому втратили |
`;
