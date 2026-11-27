# Знімок «після»: інструменти Playwright з блоком deny

Повтор 27.11.2026 за рев'ю 16.11 (сесії Task B ішли з VS Code поруч з інтеграцією `ide`). Запуск: окремий процес `claude -p` (неінтерактивний режим) з теки поза VS Code, оточення без жодних змінних VS Code і батьківської сесії Claude Code, `--strict-mcp-config --mcp-config <файл з одним сервером>`, `ENABLE_CLAUDEAI_MCP_SERVERS=false`, `--model claude-sonnet-5-5 --effort high`. Запустив агент Claude Code за дорученням студента; запис — `--output-format stream-json`. Налаштування — чинний `.claude/settings.json` проєкту (з `deny`, з `ask` для навігації й введення). Запит той самий.

## Ініціалізація сесії (з запису, дослівно)

- Claude Code: `2.1.330`; модель: `claude-sonnet-5-5`; сесія: `dc14e2d8-b1e2-4035-ba95-616398570138`
- MCP-сервери: `playwright` — `connected`
- MCP-інструментів у сесії: 21; інструментів `mcp__ide__*`: 0

<details><summary>Список MCP-інструментів</summary>

```text
mcp__playwright__browser_click
mcp__playwright__browser_close
mcp__playwright__browser_console_messages
mcp__playwright__browser_drag
mcp__playwright__browser_emulate_media
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

Сервер playwright зараз дає 21 інструмент. Вони відкладені (deferred): відомі лише назви, а схеми параметрів не завантажені. Перед викликом їх треба підтягнути через ToolSearch.

| # | Інструмент |
|---|---|
| 1 | `mcp__playwright__browser_click` |
| 2 | `mcp__playwright__browser_close` |
| 3 | `mcp__playwright__browser_console_messages` |
| 4 | `mcp__playwright__browser_drag` |
| 5 | `mcp__playwright__browser_emulate_media` |
| 6 | `mcp__playwright__browser_fill_form` |
| 7 | `mcp__playwright__browser_find` |
| 8 | `mcp__playwright__browser_handle_dialog` |
| 9 | `mcp__playwright__browser_hover` |
| 10 | `mcp__playwright__browser_navigate` |
| 11 | `mcp__playwright__browser_navigate_back` |
| 12 | `mcp__playwright__browser_network_request` |
| 13 | `mcp__playwright__browser_network_requests` |
| 14 | `mcp__playwright__browser_press_key` |
| 15 | `mcp__playwright__browser_resize` |
| 16 | `mcp__playwright__browser_select_option` |
| 17 | `mcp__playwright__browser_snapshot` |
| 18 | `mcp__playwright__browser_tabs` |
| 19 | `mcp__playwright__browser_take_screenshot` |
| 20 | `mcp__playwright__browser_type` |
| 21 | `mcp__playwright__browser_wait_for` |

Нічого не викликав. Описів інструментів у мене теж немає, лише назви зі списку відкладених.

## Підсумок прогону (з запису)

- Ходів: 1; тривалість: 6 с; вартість за записом: $0.055
- Відмов у дозволах: 0
