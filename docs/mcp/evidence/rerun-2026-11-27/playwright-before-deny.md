# Знімок «до»: інструменти Playwright без блоку deny

Повтор 27.11.2026 за рев'ю 16.11 (сесії Task B ішли з VS Code поруч з інтеграцією `ide`). Запуск: окремий процес `claude -p` (неінтерактивний режим), оточення без змінних VS Code, `--strict-mcp-config --mcp-config <файл з одним сервером>`, `ENABLE_CLAUDEAI_MCP_SERVERS=false`, `--model claude-sonnet-5-5 --effort high`. Запустив агент Claude Code за дорученням студента; запис — `--output-format stream-json`. Налаштування — `.claude/settings.json` без п'яти правил `deny` для `mcp__playwright__*` (`--setting-sources user --settings <копія без них>`). Запит дослівно з walkthrough (Task B, знімок «до»).

## Ініціалізація сесії (з запису, дослівно)

- Claude Code: `2.1.330`; модель: `claude-sonnet-5-5`; сесія: `9f43bcd3-37fe-4856-9714-92d2e4c9cddd`
- MCP-сервери: `playwright` — `connected`
- MCP-інструментів у сесії: 25; інструментів `mcp__ide__*`: 0

<details><summary>Список MCP-інструментів</summary>

```text
mcp__playwright__browser_click
mcp__playwright__browser_close
mcp__playwright__browser_console_messages
mcp__playwright__browser_drag
mcp__playwright__browser_drop
mcp__playwright__browser_emulate_media
mcp__playwright__browser_evaluate
mcp__playwright__browser_file_upload
mcp__playwright__browser_fill_form
mcp__playwright__browser_find
mcp__playwright__browser_handle_dialog
mcp__playwright__browser_hover
mcp__playwright__browser_navigate
mcp__playwright__browser_navigate_back
mcp__playwright__browser_network_request
mcp__playwright__browser_network_requests
mcp__playwright__browser_press_key
mcp__playwright__browser_resize
mcp__playwright__browser_run_code_unsafe
mcp__playwright__browser_select_option
mcp__playwright__browser_snapshot
mcp__playwright__browser_tabs
mcp__playwright__browser_take_screenshot
mcp__playwright__browser_type
mcp__playwright__browser_wait_for
```

</details>

## Розмова

**Агент:**

Зараз доступні 25 інструментів сервера playwright. Їхні схеми ще не завантажені (це відкладені інструменти), тож викликати їх можна лише після `ToolSearch`.

| Інструмент | Призначення (за назвою) |
|---|---|
| `mcp__playwright__browser_click` | клік по елементу |
| `mcp__playwright__browser_close` | закрити браузер/сторінку |
| `mcp__playwright__browser_console_messages` | повідомлення консолі |
| `mcp__playwright__browser_drag` | перетягування |
| `mcp__playwright__browser_drop` | скидання (drop) елемента |
| `mcp__playwright__browser_emulate_media` | емуляція медіа-параметрів |
| `mcp__playwright__browser_evaluate` | виконати JS на сторінці |
| `mcp__playwright__browser_file_upload` | завантаження файлів |
| `mcp__playwright__browser_fill_form` | заповнення полів форми |
| `mcp__playwright__browser_find` | пошук на сторінці |
| `mcp__playwright__browser_handle_dialog` | обробка діалогів (alert/confirm) |
| `mcp__playwright__browser_hover` | наведення курсора |
| `mcp__playwright__browser_navigate` | перехід за URL |
| `mcp__playwright__browser_navigate_back` | назад в історії |
| `mcp__playwright__browser_network_request` | деталі одного мережевого запиту |
| `mcp__playwright__browser_network_requests` | список мережевих запитів |
| `mcp__playwright__browser_press_key` | натискання клавіші |
| `mcp__playwright__browser_resize` | зміна розміру вікна |
| `mcp__playwright__browser_run_code_unsafe` | виконання довільного коду Playwright |
| `mcp__playwright__browser_select_option` | вибір опції у випадному списку |
| `mcp__playwright__browser_snapshot` | знімок доступності сторінки |
| `mcp__playwright__browser_tabs` | керування вкладками |
| `mcp__playwright__browser_take_screenshot` | знімок екрана |
| `mcp__playwright__browser_type` | введення тексту |
| `mcp__playwright__browser_wait_for` | очікування умови/тексту/часу |

Описи в третій колонці я вивів із назв, самі схеми я не читав.

## Підсумок прогону (з запису)

- Ходів: 1; тривалість: 6 с; вартість за записом: $0.054
- Відмов у дозволах: 0
