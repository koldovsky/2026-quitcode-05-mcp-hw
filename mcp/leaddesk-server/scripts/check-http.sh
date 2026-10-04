#!/usr/bin/env bash
# Bonus E1 evidence: the HTTP variant of the LeadDesk server (src/http.mjs) under curl.
#   1. the four responses of docs/walkthrough.md, Task E1: 200 · 403 (Host) · 403 (Origin) · 400 (-32020)
#   2. attacks on the guards: look-alike hosts and origins, missing Host, the LAN address
#   3. state across requests: set a status in one request, read it in the next
#   4. ablation in temp copies: guards passed as a toNodeHandler option (the trap), no guards at all,
#      store created inside the factory — each must visibly break the check it protects
# The request body goes to a temp file, never to ./body.json. Run from the repository root.
# Exit 0 when every expectation holds, 1 otherwise.
set -u
cd "$(git rev-parse --show-toplevel)" || exit 2
SRV=mcp/leaddesk-server
PORT=${PORT:-3333}
URL="http://127.0.0.1:$PORT/mcp"
TMP=$(mktemp -d)
trap 'stop; rm -rf "$TMP"' EXIT
fails=0
PID=""

start() { # $1 = path to http.mjs
  if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then echo "port $PORT is busy — not ours, stopping"; exit 2; fi
  LEADDESK_HTTP_PORT=$PORT node "$1" 2>>"$TMP/server.log" & PID=$!
  for _ in $(seq 1 50); do
    owner=$(lsof -nP -t -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | head -1)
    [ "$owner" = "$PID" ] && return 0
    sleep 0.1
  done
  echo "server did not start"; exit 2
}
stop() { if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then kill "$PID"; wait "$PID" 2>/dev/null; fi; PID=""; }
expect() { # $1 label, $2 expected, $3 actual
  if [ "$2" = "$3" ]; then echo "  ok   $1: $3"; else echo "  FAIL $1: expected $2, got $3"; fails=$((fails + 1)); fi
}

META='"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientCapabilities":{}}'
printf '%s' "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\",\"params\":{$META}}" > "$TMP/body.json"
H=(-H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -H "MCP-Protocol-Version: 2026-07-28" -H "Mcp-Method: tools/list")
code() { curl -s -o /dev/null -m 5 -w '%{http_code}' "$@" || true; }
call() { # $1 tool, $2 arguments JSON → response body
  curl -s -m 5 -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
    -H "MCP-Protocol-Version: 2026-07-28" -H "Mcp-Method: tools/call" -H "Mcp-Name: $1" \
    --data-binary "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"$1\",\"arguments\":$2,$META}}" "$URL" || true
}
new_total() { call leaddesk_find_leads '{"status":"new","limit":1}' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).result.structuredContent.total)}catch{console.log("no-result")}})'; }

echo "LeadDesk MCP over HTTP · $(date -u +%FT%TZ) · node $(node --version) · $SRV/src/http.mjs"
start "$SRV/src/http.mjs"
echo "listening: $(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN | awk 'NR>1{print $1, $9}') (pid is ours: $PID)"

echo "1. The four responses of the walkthrough (verbatim commands, body from a temp file)"
r1=$(curl -s -w '\nHTTP %{http_code}' "${H[@]}" --data-binary @"$TMP/body.json" "$URL")
r2=$(curl -s -w '\nHTTP %{http_code}' "${H[@]}" -H "Host: evil.example" --data-binary @"$TMP/body.json" "$URL")
r3=$(curl -s -w '\nHTTP %{http_code}' "${H[@]}" -H "Origin: https://evil.example" --data-binary @"$TMP/body.json" "$URL")
r4=$(curl -s -w '\nHTTP %{http_code}' -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Method: tools/list" --data-binary @"$TMP/body.json" "$URL")
for r in "$r1" "$r2" "$r3" "$r4"; do printf '%s\n' "$r" | sed -E 's/("description":")[^"]{60}[^"]*"/\1…"/g' | cut -c1-400; done
expect "no forged headers" "HTTP 200" "$(printf '%s' "$r1" | tail -1)"
expect "tools in the 200 body" "leaddesk_find_leads,leaddesk_set_lead_status" "$(printf '%s' "$r1" | sed '$d' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).result.tools.map(t=>t.name).join()))')"
expect "Host: evil.example" "HTTP 403" "$(printf '%s' "$r2" | tail -1)"
expect "Origin: https://evil.example" "HTTP 403" "$(printf '%s' "$r3" | tail -1)"
expect "no MCP-Protocol-Version" "HTTP 400" "$(printf '%s' "$r4" | tail -1)"
expect "error code without MCP-Protocol-Version" "-32020" "$(printf '%s' "$r4" | grep -o '"code":-32020' | cut -d: -f2)"

echo "2. Attacks on the guards"
for h in "localhost:$PORT" "127.0.0.1:$PORT" "[::1]:$PORT" "LOCALHOST:$PORT"; do expect "Host $h" 200 "$(code "${H[@]}" -H "Host: $h" --data-binary @"$TMP/body.json" "$URL")"; done
for h in "localhost.evil.example" "127.0.0.1.nip.io" "evil.example:$PORT" "localhost@evil.example"; do expect "Host $h" 403 "$(code "${H[@]}" -H "Host: $h" --data-binary @"$TMP/body.json" "$URL")"; done
# no Host header at all: node:http itself answers 400 (requireHostHeader) before the guard runs
expect "no Host header (rejected by node:http, not by the guard)" 400 "$(code "${H[@]}" -H "Host:" --data-binary @"$TMP/body.json" "$URL")"
expect "empty Host header" 403 "$(code "${H[@]}" -H "Host: " --data-binary @"$TMP/body.json" "$URL")"
for o in "null" "http://localhost.evil.example" "https://127.0.0.1.nip.io" "not a url"; do expect "Origin $o" 403 "$(code "${H[@]}" -H "Origin: $o" --data-binary @"$TMP/body.json" "$URL")"; done
# port-agnostic by design: any page served from localhost on ANY port passes (a limit, see threat model)
for o in "http://localhost:3000" "http://127.0.0.1:5173"; do expect "Origin $o (any localhost port passes)" 200 "$(code "${H[@]}" -H "Origin: $o" --data-binary @"$TMP/body.json" "$URL")"; done
LAN=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')
if [ -n "$LAN" ]; then expect "connect via the LAN address (listens on 127.0.0.1 only)" 000 "$(code -m 3 "http://$LAN:$PORT/mcp")"; fi

echo "3. State across requests (module-level store)"
expect "new leads before" 6 "$(new_total)"
expect "set lead_0002 → contacted" "lead.status_changed" "$(call leaddesk_set_lead_status '{"leadId":"lead_0002","status":"contacted","reason":"дзвінок, перевірка HTTP"}' | grep -o '"action":"lead.status_changed"' | cut -d'"' -f4)"
expect "new leads in the next request" 5 "$(new_total)"
stop

echo "4. Ablation in temp copies (each breaks one protection)"
mkdir -p "$TMP/copy" && cp -R "$SRV/src" "$SRV/fixtures" "$SRV/package.json" "$TMP/copy/" && ln -s "$PWD/$SRV/node_modules" "$TMP/copy/node_modules"
ablate() { # $1 label, $2 file, $3 from, $4 to
  cp "$SRV/src/$2" "$TMP/copy/src/$2"
  F="$1" FROM="$3" TO="$4" node -e 'const fs=require("fs"),f=process.argv[1],s=fs.readFileSync(f,"utf8");if(!s.includes(process.env.FROM)){console.error("pattern not found: "+process.env.F);process.exit(2)}fs.writeFileSync(f,s.replace(process.env.FROM,process.env.TO))' "$TMP/copy/src/$2" || exit 2
}
ablate "A1" http.mjs 'const mcp = toNodeHandler(createMcpHandler(createLeadDeskServer));' 'const mcp = toNodeHandler(createMcpHandler(createLeadDeskServer), { hostValidation: localhostHostValidation(), originValidation: localhostOriginValidation(), allowedHosts: ["localhost", "127.0.0.1"] });'
ablate "A1" http.mjs '  if (!checkHost(req, res)) return; // the guard has already answered 403
  if (!checkOrigin(req, res)) return;
' ''
start "$TMP/copy/src/http.mjs"
echo "  A1 guards passed as toNodeHandler options instead of being called:"
expect "A1 Host: evil.example (option silently ignored)" 200 "$(code "${H[@]}" -H "Host: evil.example" --data-binary @"$TMP/body.json" "$URL")"
expect "A1 Origin: https://evil.example" 200 "$(code "${H[@]}" -H "Origin: https://evil.example" --data-binary @"$TMP/body.json" "$URL")"
stop
cp "$SRV/src/http.mjs" "$TMP/copy/src/http.mjs"
ablate "A2" http.mjs '  if (!checkOrigin(req, res)) return;
' ''
start "$TMP/copy/src/http.mjs"
echo "  A2 Origin guard removed, Host guard kept:"
expect "A2 Host: evil.example (still guarded)" 403 "$(code "${H[@]}" -H "Host: evil.example" --data-binary @"$TMP/body.json" "$URL")"
expect "A2 Origin: https://evil.example (now passes)" 200 "$(code "${H[@]}" -H "Origin: https://evil.example" --data-binary @"$TMP/body.json" "$URL")"
stop
cp "$SRV/src/http.mjs" "$TMP/copy/src/http.mjs"
cp "$SRV/src/leaddesk.mjs" "$TMP/copy/src/leaddesk.mjs"  # A3: two edits in one file
node -e 'const fs=require("fs"),f=process.argv[1];let s=fs.readFileSync(f,"utf8");
s=s.replace("const leads = loadLeads(await readFile(FIXTURE, \"utf8\"));","const LEADS0 = loadLeads(await readFile(FIXTURE, \"utf8\"));\nconst leads = LEADS0;");
s=s.replace("export function createLeadDeskServer() {\n","export function createLeadDeskServer() {\n  const leads = new Map([...LEADS0].map(([k, v]) => [k, { ...v }])); // ABLATION: store per factory call\n");
fs.writeFileSync(f,s)' "$TMP/copy/src/leaddesk.mjs"
grep -c "ABLATION" "$TMP/copy/src/leaddesk.mjs" >/dev/null || { echo "A3 not applied"; exit 2; }
start "$TMP/copy/src/http.mjs"
echo "  A3 lead store created inside the factory (once per HTTP request):"
expect "A3 set lead_0002 → contacted" "lead.status_changed" "$(call leaddesk_set_lead_status '{"leadId":"lead_0002","status":"contacted","reason":"дзвінок, перевірка HTTP"}' | grep -o '"action":"lead.status_changed"' | cut -d'"' -f4)"
expect "A3 new leads in the next request (change lost)" 6 "$(new_total)"
stop

echo "server log (stderr), personal data must be absent:"
sed 's/^/  /' "$TMP/server.log"
expect "emails in server log" 0 "$(grep -c '@' "$TMP/server.log")"
[ -e body.json ] && { echo "  FAIL ./body.json exists"; fails=$((fails + 1)); }
echo "RESULT: $([ $fails -eq 0 ] && echo "all expectations met" || echo "$fails FAIL")"
exit $([ $fails -eq 0 ] && echo 0 || echo 1)
