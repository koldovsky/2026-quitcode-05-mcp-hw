#!/usr/bin/env bash
# Every check the reports rely on, with its exit code, in one file:
#   bash docs/mcp/scripts/run-checks.sh > docs/mcp/evidence/checks.txt
# Baseline: lint and build of `main` in a throw-away git worktree (npm ci there), then the same on this
# branch, then the repo's own checks. Run from the repo root. Exit 1 if any step fails.
set -u
fail=0
step() { # step <title> <command...>: prints the last lines of output and the exit code
  local title=$1; shift
  local out; out=$("$@" 2>&1); local code=$?
  printf '\n## %s\n$ %s\n%s\nexit=%s\n' "$title" "$*" "$(printf '%s\n' "$out" | tail -n "${TAIL:-3}")" "$code"
  [ "$code" -eq 0 ] || fail=1
  return "$code"
}
routes() { npm run build 2>&1 | grep -E '^(┌|├|└) ' ; return "${PIPESTATUS[0]}"; }

echo "# checks · $(date -u +%Y-%m-%dT%H:%MZ) · node $(node -v) · branch $(git rev-parse --abbrev-ref HEAD) @ $(git rev-parse --short HEAD)"

base=$(mktemp -d)/main
git worktree add --detach "$base" main >/dev/null 2>&1
echo; echo "# baseline: main @ $(git -C "$base" rev-parse --short HEAD), fresh worktree"
( cd "$base" && step "npm ci (main)" npm ci --no-audit --no-fund && step "npm run lint (main)" npm run lint && TAIL=20 step "npm run build (main), routes" routes ) || fail=1
git worktree remove --force "$base"

echo; echo "# this branch"
step "npm run lint" npm run lint
TAIL=20 step "npm run build, routes" routes
step "contract (Task A)" node mcp/leaddesk-server/scripts/check-contract.mjs
step "contract self-test (Task A)" node mcp/leaddesk-server/scripts/check-contract.mjs --self-test
TAIL=1 step "HTTP variant (Task E)" bash mcp/leaddesk-server/scripts/check-http.sh
step "config (Task B)" node docs/mcp/scripts/check-config.mjs
TAIL=1 step "approval-host SQL policy self-test (Task B)" node docs/mcp/scripts/sql-policy.mjs --self-test
step "seed = fixture (Task B)" node docs/mcp/scripts/check-seed.mjs
TAIL=4 step "Vercel deny counts (Task B)" node docs/mcp/scripts/count-vercel-deny.mjs
step "links in the reports" node docs/mcp/scripts/check-links.mjs
step "no Vercel identifiers left" node docs/mcp/scripts/scrub-vercel.mjs --check docs/mcp/evidence/vercel-build-log.txt docs/mcp/runs/task-b/vercel-*.md
step "changed-files table = diff" node docs/mcp/scripts/changed-files.mjs --check
step "root package files untouched" git diff --exit-code --stat main -- package.json package-lock.json
echo; echo "RESULT: $([ $fail -eq 0 ] && echo 'all steps exit 0' || echo 'a step FAILED')"
exit $fail
