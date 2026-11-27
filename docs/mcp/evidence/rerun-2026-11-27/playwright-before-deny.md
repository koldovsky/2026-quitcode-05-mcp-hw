# Знімок «до»: інструменти Playwright без блоку deny

Повтор 27.11.2026 за рев'ю 16.11 (сесії Task B ішли з VS Code поруч з інтеграцією `ide`). Запуск: окремий процес `claude -p` (неінтерактивний режим) з теки поза VS Code, оточення без жодних змінних VS Code і батьківської сесії Claude Code, `--strict-mcp-config --mcp-config <файл з одним сервером>`, `ENABLE_CLAUDEAI_MCP_SERVERS=false`, `--model claude-sonnet-5-5 --effort high`. Запустив агент Claude Code за дорученням студента; запис — `--output-format stream-json`. Налаштування — `.claude/settings.json` без п'яти правил `deny` для `mcp__playwright__*` (`--setting-sources user --settings <копія без них>`). Запит дослівно з walkthrough (Task B, знімок «до»). Примітка: у першому реченні агент написав «24 інструменти» при 25 у списку ініціалізації — та сама помилка лічби, що й у знімку «до» Task B.

## Ініціалізація сесії (з запису, дослівно)

- Claude Code: `2.1.330`; модель: `claude-sonnet-5-5`; сесія: `a3f98a53-c710-45f9-acb2-583b38f286f6`
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

Сервер playwright зараз дає 24 інструменти. Їхні схеми ще не завантажені, тому викликати їх можна лише після `ToolSearch`. Нічого з них я не викликав.

**Навігація й вкладки**
- `mcp__playwright__browser_navigate`: перехід за URL
- `mcp__playwright__browser_navigate_back`: назад в історії
- `mcp__playwright__browser_tabs`: керування вкладками
- `mcp__playwright__browser_close`: закрити сторінку чи браузер
- `mcp__playwright__browser_resize`: змінити розмір вікна

**Читання сторінки**
- `mcp__playwright__browser_snapshot`: знімок доступності (accessibility snapshot)
- `mcp__playwright__browser_find`: пошук на сторінці
- `mcp__playwright__browser_take_screenshot`: скріншот
- `mcp__playwright__browser_console_messages`: повідомлення консолі
- `mcp__playwright__browser_network_requests`: список мережевих запитів
- `mcp__playwright__browser_network_request`: деталі одного запиту
- `mcp__playwright__browser_wait_for`: очікування тексту чи події

**Взаємодія**
- `mcp__playwright__browser_click`: клік
- `mcp__playwright__browser_hover`: наведення
- `mcp__playwright__browser_drag`: перетягування
- `mcp__playwright__browser_drop`: скидання (drop)
- `mcp__playwright__browser_type`: введення тексту
- `mcp__playwright__browser_press_key`: натискання клавіші
- `mcp__playwright__browser_fill_form`: заповнення форми
- `mcp__playwright__browser_select_option`: вибір опції у списку
- `mcp__playwright__browser_file_upload`: завантаження файлу
- `mcp__playwright__browser_handle_dialog`: обробка діалогів (alert, confirm тощо)

**Виконання коду й емуляція**
- `mcp__playwright__browser_evaluate`: виконати JavaScript на сторінці
- `mcp__playwright__browser_run_code_unsafe`: виконати довільний код Playwright (з назви, небезпечний)
- `mcp__playwright__browser_emulate_media`: емуляція медіа-параметрів (наприклад, темна тема, друк)

Описи вище я склав за назвами інструментів. Точні параметри стануть відомі після завантаження схем.

## Підсумок прогону (з запису)

- Ходів: 1; тривалість: 7 с; вартість за записом: $0.047
- Відмов у дозволах: 0
