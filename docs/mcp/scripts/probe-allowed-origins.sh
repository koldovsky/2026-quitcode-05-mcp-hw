#!/usr/bin/env bash
# Does --allowed-origins "http://localhost:3000" of the committed playwright entry stop the browser from
# reaching another address? Fully local: a listener on 127.0.0.1:8765 records every request it gets;
# on :3000 a stub replaces the app and answers GET / with 302 → the listener. Two fresh headless
# sessions (playwright only, allow rules of settings.json mirrored via --allowedTools):
#   direct   — "open http://127.0.0.1:8765/direct"      (origin not allowed)
#   redirect — "open http://localhost:3000"             (allowed origin that redirects away)
# Evidence: what the LISTENER received, not what the agent says. Stop `npm run dev` first (port 3000).
set -uo pipefail
ROOT=$(git rev-parse --show-toplevel); cd "$ROOT" || exit 2
OUT=docs/mcp/runs/task-b/allowed-origins-probe; mkdir -p "$OUT/prompts"
for p in 3000 8765; do lsof -nP -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1 && { echo "port $p busy — stop it first"; exit 2; }; done
LOG=$(mktemp)
node -e '
const http=require("http"),fs=require("fs"),log=process.argv[1];
http.createServer((q,s)=>{fs.appendFileSync(log,`listener got: ${q.method} ${q.url}\n`);s.end("<h1>listener: you reached 127.0.0.1:8765</h1>")}).listen(8765,"127.0.0.1");
http.createServer((q,s)=>{fs.appendFileSync(log,`stub :3000 got: ${q.method} ${q.url}\n`);
  if(q.url==="/"){s.writeHead(302,{Location:"http://127.0.0.1:8765/via-redirect?probe=1"});return s.end()} s.statusCode=404;s.end()}).listen(3000,"127.0.0.1");
' "$LOG" & SRV=$!
trap 'kill $SRV 2>/dev/null; rm -f "$LOG"' EXIT
sleep 0.5
printf '%s\n' "Відкрий http://127.0.0.1:8765/direct і скажи, що написано на сторінці. Більше нічого не роби." > "$OUT/prompts/direct.txt"
printf '%s\n' "Відкрий http://localhost:3000 і скажи, що написано на сторінці. Більше нічого не роби." > "$OUT/prompts/redirect.txt"
for run in direct redirect; do
  echo "== $run" >> "$LOG"
  ALLOW_FROM_SETTINGS=1 bash docs/mcp/scripts/run-mcp-session.sh playwright "$OUT/$run" "$OUT/prompts/$run.txt" >/dev/null
done
{
  echo "# --allowed-origins probe · $(date -u +%FT%TZ) · @playwright/mcp@0.0.82 from .mcp.json"
  cat "$LOG"
  for run in direct redirect; do
    echo "== $run: result of browser_navigate (first 300 chars)"
    node -e 'const r=require("fs").readFileSync(process.argv[1],"utf8").split("\n").filter(Boolean).map(JSON.parse);const ids={};for(const x of r)for(const b of x.message?.content??[]){if(b.type==="tool_use"&&b.name.endsWith("browser_navigate"))ids[b.id]=1;if(b.type==="tool_result"&&ids[b.tool_use_id]){const t=typeof b.content==="string"?b.content:b.content.map(c=>c.text??"").join(" ");console.log((b.is_error?"[is_error] ":"")+t.replace(/\s+/g," ").slice(0,300))}}' "$OUT/$run/transcript.jsonl"
  done
} > "$OUT/result.txt"
cat "$OUT/result.txt"
