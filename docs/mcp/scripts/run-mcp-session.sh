#!/usr/bin/env bash
# One fresh headless Claude Code session with exactly ONE server from the committed .mcp.json.
#   bash docs/mcp/scripts/run-mcp-session.sh <server-key> <out-dir> <prompt-file>
# Env: MODEL (opus) · EFFORT (high) · CWD (repository root)
#      ALLOW_FROM_SETTINGS=1 — also pass the allow rules of .claude/settings.json for <server-key> as
#      --allowedTools, generated from the file. Measured: headless ignores project allow rules for MCP
#      tools (docs/mcp/runs/task-b/allow-probe.txt), deny rules do apply.
#
# Why this shape:
# - --strict-mcp-config + a config with only <server-key>, copied from .mcp.json unchanged: user-scope
#   servers and claude.ai connectors never enter the session; one server per session (rule 3).
#   Without it, `claude -p` in the repo would start every .mcp.json server with no questions asked.
# - --setting-sources project: only the committed .claude/settings.json decides allow/deny, so the
#   session measures exactly the rules under review.
# - headless has nobody to approve: anything not in "allow" is refused. That is the point for
#   read-only steps (snapshots, the form check); steps that need a human approval run interactively.
# Writes <out-dir>/meta.txt, transcript.jsonl (stream-json), stderr.txt, transcript.md.
set -uo pipefail
KEY=$1; OUT=$(mkdir -p "$2" && cd "$2" && pwd); PROMPT=$(cd "$(dirname "$3")" && pwd)/$(basename "$3")
ROOT=$(git rev-parse --show-toplevel); CWD=${CWD:-$ROOT}
MODEL=${MODEL:-opus}; EFFORT=${EFFORT:-high}
state() { # committed at <hash> / committed + local changes / untracked
  if ! git -C "$ROOT" ls-files --error-unmatch "$1" >/dev/null 2>&1; then echo untracked
  elif git -C "$ROOT" diff --quiet HEAD -- "$1"; then echo "as committed in $(git -C "$ROOT" log -1 --format=%h -- "$1")"
  else echo "local changes on top of $(git -C "$ROOT" log -1 --format=%h -- "$1")"; fi
}
ALLOW=""
if [ "${ALLOW_FROM_SETTINGS:-}" = 1 ]; then
  ALLOW=$(node -e 'console.log(require(process.argv[1]).permissions.allow.filter(r=>r.startsWith(`mcp__${process.argv[2]}__`)).join(","))' "$ROOT/.claude/settings.json" "$KEY")
fi
CFG=$(mktemp); trap 'rm -f "$CFG"' EXIT
node -e 'const c=require(process.argv[1]).mcpServers[process.argv[2]];if(!c){console.error("no such key in .mcp.json");process.exit(2)}console.log(JSON.stringify({mcpServers:{[process.argv[2]]:c}}))' \
  "$ROOT/.mcp.json" "$KEY" > "$CFG" || exit 2
{
  echo "claude: $(claude --version)"
  echo "model: $MODEL · effort: $EFFORT · cwd: ${CWD/#$HOME/~}"
  echo "server: $KEY = $(cat "$CFG")"
  if [ "$CWD" = "$ROOT" ]; then
    echo "settings.json sha256: $(shasum -a 256 "$ROOT/.claude/settings.json" | cut -d' ' -f1) · git: $(state .claude/settings.json)"
  else
    echo "settings.json: NOT loaded — cwd is outside the repository, the session has no project settings (no allow, no deny)"
  fi
  echo ".mcp.json sha256: $(shasum -a 256 "$ROOT/.mcp.json" | cut -d' ' -f1) · git: $(state .mcp.json)"
  echo "prompt sha256: $(shasum -a 256 "$PROMPT" | cut -d' ' -f1)"
  echo "prompt: $(cat "$PROMPT")"
  echo "flags: -p --model $MODEL --effort $EFFORT --output-format stream-json --verbose --setting-sources project --strict-mcp-config --mcp-config <only $KEY> --permission-mode default${ALLOW:+ --allowedTools $ALLOW}"
  echo "started: $(date -u +%FT%TZ)"
} > "$OUT/meta.txt"
START=$(date +%s)
(cd "$CWD" && claude -p --model "$MODEL" --effort "$EFFORT" --output-format stream-json --verbose \
  --setting-sources project --strict-mcp-config --mcp-config "$CFG" --permission-mode default ${ALLOW:+--allowedTools "$ALLOW"} \
  < "$PROMPT" > "$OUT/transcript.jsonl" 2> "$OUT/stderr.txt")
CODE=$?
echo "exit: $CODE · wall: $(( $(date +%s) - START ))s" >> "$OUT/meta.txt"
node "$ROOT/docs/mcp/scripts/transcript-md.mjs" "$OUT/transcript.jsonl" > "$OUT/transcript.md"
cat "$OUT/meta.txt"
exit "$CODE" # a failed session must not look like a successful one to the caller
