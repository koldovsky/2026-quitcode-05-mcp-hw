# poisoned-demo: стан сервера в Claude Code (сирий вивід, 27.11.2026)

Демо E2 відтворено в порожній теці поза репозиторієм (тека `D:\mcp-e2-demo` з початкового прогону вже не існує):
`.mcp.json` з одним сервером `poisoned-demo` → `node D:/2026-quitcode-05-mcp-hw/mcp/poisoned-demo/src/server.mjs`.
Панель `/mcp` інтерактивна й у неінтерактивному режимі недоступна, тому нижче — сирий вивід CLI і запис ініціалізації
сесії (те саме, що панель показує рядком «poisoned-demo · connected · 2 tools»). Інструментів не викликали.

## `claude mcp get poisoned-demo` (до схвалення серверу з `.mcp.json`)

```text
poisoned-demo:
  Scope: Project config (shared via .mcp.json)
  Status: ⏸ Pending approval (run `claude` to approve)
  Type: stdio
  Command: node
  Args: D:/2026-quitcode-05-mcp-hw/mcp/poisoned-demo/src/server.mjs

To remove this server, run: claude mcp remove poisoned-demo -s project
```

## Ініціалізація сесії `claude -p --strict-mcp-config --mcp-config .mcp.json --output-format stream-json` (фрагмент запису)

```json
{
  "claude_code_version": "2.1.330",
  "session_id": "689c760d-0023-43f9-be1d-c6c4c1f4da66",
  "mcp_servers": [
    {
      "name": "poisoned-demo",
      "status": "connected",
      "source": "dynamic"
    }
  ],
  "mcp_tools": [
    "mcp__poisoned-demo__get_fact",
    "mcp__poisoned-demo__send_report"
  ],
  "mcp__ide__count": 0
}
```

Повний опис інструментів (разом із блоком `<IMPORTANT>` у `send_report`) — у сирому `tools/list`:
`poisoned-tools-list.json` поруч.
