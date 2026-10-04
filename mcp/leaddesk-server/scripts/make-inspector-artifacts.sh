#!/usr/bin/env bash
# Regenerates the four Task A artifacts in docs/mcp/ with the exact commands of docs/walkthrough.md
# (Task A, step 4), stderr dropped; fails unless each exit code (0, 0, 5, 0) and each file's content is as expected.
# Why the check: in the very first run of this server, Inspector 2.8.0 wrote the server's stderr line after the JSON
# into stdout (docs/mcp/verification.md, Task A). Run from the repository root.
set -u
I=(npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs)
cd "$(git rev-parse --show-toplevel)" || exit 2

bad=0
run() { # run <file> <expected exit> <inspector args…>: writes docs/mcp/<file>.json, checks the exit code
  local f=$1 want=$2; shift 2
  "${I[@]}" "$@" > "docs/mcp/$f.json" 2>/dev/null; local got=$?
  if [ "$got" -eq "$want" ]; then echo "$f.json exit=$got (expected $want)"; else echo "$f.json exit=$got, expected $want — FAIL"; bad=1; fi
}
run tools-list 0 --method tools/list
run set-status 0 --method tools/call --tool-name leaddesk_set_lead_status \
  --tool-arg leadId=lead_0002 --tool-arg status=contacted --tool-arg "reason=перевірка в Inspector"
run bad-input 5 --method tools/call --tool-name leaddesk_set_lead_status \
  --tool-arg leadId=nope --tool-arg status=won --tool-arg reason=ok   # 5: the tool returned isError
run resource-read 0 --method resources/read --uri leaddesk://reference/statuses

# pure JSON (see above) and the content each artifact exists to show
node --input-type=module - <<'JS' || bad=1
import { readFileSync } from "node:fs";
const CHECK = {
  "tools-list": (j) => JSON.stringify(j.tools?.map((t) => t.name).sort()) === '["leaddesk_find_leads","leaddesk_set_lead_status"]'
    && j.tools.every((t) => typeof t.annotations?.readOnlyHint === "boolean"),
  "set-status": (j) => j.isError !== true && j.structuredContent?.lead?.status === "contacted"
    && j.structuredContent?.audit?.action === "lead.status_changed" && j.structuredContent.audit.leadId === "lead_0002" && !!j.structuredContent.audit.at,
  "bad-input": (j) => j.isError === true,
  "resource-read": (j) => j.contents?.[0]?.uri === "leaddesk://reference/statuses" && j.contents[0].mimeType === "text/markdown",
};
let fail = 0;
for (const [f, ok] of Object.entries(CHECK)) {
  let j; try { j = JSON.parse(readFileSync(`docs/mcp/${f}.json`, "utf8")); } catch { console.log(`NOT JSON: docs/mcp/${f}.json — run again`); fail = 1; continue; }
  if (ok(j)) console.log(`valid JSON with the expected content: docs/mcp/${f}.json`); else { console.log(`WRONG CONTENT: docs/mcp/${f}.json`); fail = 1; }
}
process.exit(fail);
JS
exit $bad
