# Перевірка (Task A, Task B, бонус E)

- **Інструмент і версія, модель:** Claude Code 2.1.289 · Claude Opus 5.5
- **ОС і термінал, Node:** macOS (Darwin 25.6) · zsh · Node 24.20.0

## Task A — сервер в Inspector

- Команди, якими зроблено чотири файли в `docs/mcp/`: як у walkthrough, крок 4, з кореня репозиторію,
  `npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs …`:
  `--method tools/list` → `tools-list.json` (exit 0); `tools/call leaddesk_set_lead_status leadId=lead_0002
  status=contacted "reason=перевірка в Inspector"` → `set-status.json` (exit 0); той самий інструмент з
  `leadId=nope status=won reason=ok` → `bad-input.json` (exit 5); `resources/read --uri
  leaddesk://reference/statuses` → `resource-read.json` (exit 0). Змін у командах немає.
- `tools-list.json`: два інструменти — `leaddesk_find_leads` (`readOnlyHint: true`) і
  `leaddesk_set_lead_status` (`readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: false`).
  У кожного параметра є `description` з `.describe(…)`: модель бачить формат id (`lead_0000`, напр.
  `lead_0002`), перелік статусів із посиланням на ресурс `leaddesk://reference/statuses`, межі `limit`
  1–50 і те, що `reason` потрапляє в аудит. В описі `leaddesk_set_lead_status` прямо написано «ЗМІНЮЄ
  ДАНІ» і що перед викликом потрібне підтвердження людини.
- `bad-input.json`: зламано два аргументи — `leadId=nope` (не проходить `^lead_\d{4}$`) і `reason=ok`
  (коротше за 3 символи). Текст: `Input validation error: Invalid arguments for tool
  leaddesk_set_lead_status: leadId: Invalid string: must match pattern /^lead_\d{4}$/, reason: Too small:
  expected string to have >=3 characters`, `"isError": true`. Inspector завершився з кодом **5** і
  надрукував у stderr `{"error":{"code":"tool_is_error",…}}`.
- `set-status.json`: `lead_0002` (Rynok Books) `new` → `contacted`; запис аудиту в `structuredContent`:
  `{"action":"lead.status_changed","leadId":"lead_0002","at":"2026-10-05T08:12:26.301Z","from":"new","to":"contacted","reason":"перевірка в Inspector"}`.
  Окремо, сирим JSON-RPC по stdio, перевірено: повторна зміна на той самий статус і невідомий
  `lead_9999` → `isError: true`; `leaddesk_find_leads` віддає лише `id, company, status, source, budget,
  createdAt`.
- Самоперевірка: `grep -c '"isError": true' docs/mcp/bad-input.json` → 1; у `set-status.json` є
  `"action"`, `"at"`, `"leadId"`; `grep -rc 'console\.log' mcp/leaddesk-server/src` → 0;
  `cmp materials/leads.json mcp/leaddesk-server/fixtures/leads.json` — без різниці; `npm run lint` і
  `npm run build` — exit 0.
- Що було найважче в описах інструментів і параметрів: розвести два інструменти так, щоб модель із
  самого опису розуміла, що `find_leads` безпечний, а `set_lead_status` змінює дані й потребує
  підтвердження людини; і змусити модель брати id з `leaddesk_find_leads`, а не вгадувати його, —
  тому підказку про це додано і в опис, і в текст помилки «лід не знайдено».

## Task B — що зробили агенти з серверами

- **Supabase:** <які інструменти викликав агент для міграції й сиду; що ви схвалили вручну; чи щось відхилили>
- **Vercel:** <як задеплоїли (git-інтеграція); яким інструментом отримали лог; що в ньому>
- **Figma:** <`whoami`: план і сіт; скільки викликів витратили з квоти; з якого фрейму токени>
- **Playwright:** <ланцюжок інструментів; чи відправилась форма; що в консолі й мережі>
- Що агент зробив сам, без прохання (наприклад, викликав інструмент, який ви не очікували): <… / нічого>

## Task E (бонус)

- Варіант: <E1 HTTP-сервер / E2 отруєний опис / E3 Cursor>
- <команди, виводи, спостереження — див. walkthrough, Task E>
