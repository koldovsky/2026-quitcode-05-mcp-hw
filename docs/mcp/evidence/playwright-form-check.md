# Перевірка форми заявки в браузері (Task B, Playwright)

Джерело кожного рядка — транскрипт сесії
[`../runs/task-b/playwright-form-check.md`](../runs/task-b/playwright-form-check.md) (на початку файла —
`meta.txt` з прапорцями й sha256; сирий `transcript.jsonl` — у `../runs/task-b/raw-runs.tar.gz`). «Виклик N» — номер у цьому транскрипті.

- **Сесія:** нова, headless, `claude -p` (Claude Code 2.1.282, `claude-opus-5-5`, effort high),
  скрипт [`docs/mcp/scripts/run-mcp-session.sh`](../scripts/run-mcp-session.sh). У сесії **лише**
  `playwright` (`--strict-mcp-config`, у `init.mcp_servers` — один сервер); Supabase та інших серверів
  у ній немає. Застосунок — `npm run dev` на `http://localhost:3000`.
- **Права:** `deny` і `allow` — з `.claude/settings.json`. Проєктний `allow` для MCP-інструментів
  headless-сесія не застосувала: перша спроба зупинилась на виклику 2 `browser_navigate` з
  «Claude requested permissions to use mcp__playwright__browser_navigate, but you haven't granted it yet»
  ([`../runs/task-b/playwright-form-check-1-denied.md`](../runs/task-b/playwright-form-check-1-denied.md)).
  Окремий замір — [`../runs/task-b/allow-probe.txt`](../runs/task-b/allow-probe.txt): проєктний `allow` діє для
  `Bash(...)`, не діє для `mcp__…`, те саме правило з CLI діє. Тож у другій спробі ті самі 10 точних імен
  з `allow` передано через `--allowedTools`, згенеровано з файла (`ALLOW_FROM_SETTINGS=1`).

## Запит

> Відкрий http://localhost:3000, заповни форму заявки тестовими даними, відправ, перевір консоль і
> мережу. Інших адрес не відкривай.

## Ланцюжок інструментів

| # | Інструмент | Що сталося |
|---|---|---|
| 1 | `ToolSearch` | агент завантажив схеми інструментів Playwright (вони в сесії відкладені) |
| 2 | `browser_navigate` | `http://localhost:3000` |
| 3 | `browser_snapshot` | форма: Ім'я, Прізвище, Email, Телефон, Компанія, Сайт, Бюджет (`combobox`), Опис, згода |
| 4 | `browser_fill_form` | синтетичні дані: «Тест Тестенко», `test@example.com`, `+380000000000`, «Test Co», сайт `https://example.com` (лише текст у полі), бюджет `$500–1500 / міс.` |
| 5 | `browser_console_messages` | до відправки |
| 6 | `browser_click` | «Надіслати заявку» |
| 7 | `browser_snapshot` | «Дякуємо! Заявку отримано.» (результат виклику 7) |
| 8 | `browser_console_messages` | `Total messages: 2 (Errors: 0, Warnings: 0)`: порада React DevTools і `[HMR] connected` |
| 9–10 | `browser_network_requests` | 22 запити: 21 `GET` статики й `POST http://localhost:3000/ => [200] OK` (Server Action) |

Відмов немає (`permission denials: none`), 10 викликів, 45 с, $0.22.

## Результат

- **Форма відправилась:** `POST /` → 200, на сторінці «Дякуємо! Заявку отримано.»
- **Консоль:** 0 помилок, 0 попереджень.
- **Мережа:** усі 22 запити — на `localhost:3000`. Інші адреси в транскрипті (`https://example.com`,
  `https://react.dev`) — текст поля «Сайт» і текст повідомлення консолі, а не запити браузера.
- **Заборонені інструменти** (`browser_run_code_unsafe`, `browser_evaluate`, `browser_file_upload`,
  `browser_drop`) у сесії відсутні: `init.tools` має 21 інструмент `mcp__playwright__*`, як
  [`mcp-after.txt`](mcp-after.txt).
- `.playwright-mcp/` зі знімками з'явилась у корені; тека в `.gitignore` і в git не потрапила.

## Атака на `--allowed-origins`

[`../runs/task-b/allowed-origins-probe-result.txt`](../runs/task-b/allowed-origins-probe-result.txt), скрипт
[`docs/mcp/scripts/probe-allowed-origins.sh`](../scripts/probe-allowed-origins.sh). Усе локально: слухач
на `127.0.0.1:8765` записує, що до нього дійшло; на `:3000` замість застосунку — заглушка з `302`.

| Прогін | Що просили | Що отримав слухач |
|---|---|---|
| `direct` | відкрити `http://127.0.0.1:8765/direct` | нічого: `net::ERR_BLOCKED_BY_CLIENT` |
| `redirect` | відкрити дозволений `http://localhost:3000`, який відповідає `302` на слухача | `GET /via-redirect?probe=1` |

Висновок: прапорець зупиняє прямий перехід, але дозволена адреса з редиректом виносить query-рядок на
будь-яку іншу. Це підтверджує слова вендора «не межа безпеки» замірами, і тому канал
`browser_navigate` у threat model позначено як відкритий.
