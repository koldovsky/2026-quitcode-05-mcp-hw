#!/usr/bin/env node
// Static check of the permission carriers .mcp.json and .claude/settings.json against the Task B rules
// of README «Як це оцінюється» / docs/walkthrough.md, plus this repo's own narrowing of Vercel.
//   node docs/mcp/scripts/check-config.mjs        exit 0 all PASS · 1 a FAIL
import { readFileSync } from "node:fs";

const mcp = JSON.parse(readFileSync(".mcp.json", "utf8")).mcpServers;
const raw = readFileSync(".mcp.json", "utf8");
const { allow, deny } = JSON.parse(readFileSync(".claude/settings.json", "utf8")).permissions;
let fails = 0;
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) fails++; };

check(["supabase", "vercel", "playwright"].every((k) => mcp[k]), ".mcp.json has supabase, vercel and playwright");
check(Object.values(mcp).every((s) => !s.url || s.type), "every entry with url has type");
const su = new URL(mcp.supabase.url);
const features = (su.searchParams.get("features") ?? "").split(",");
check(su.searchParams.get("project_ref") && features.length > 0 && !features.some((f) => ["account", "functions", "branching"].includes(f)),
  `supabase: project_ref and features=${features.join(",")} without account, functions, branching`);
check(mcp.vercel.url === "https://mcp.vercel.com", "vercel: https://mcp.vercel.com");
const pa = mcp.playwright.args ?? [];
const pkg = pa.find((a) => a.startsWith("@playwright/mcp@")) ?? "";
check(/^@playwright\/mcp@\d+\.\d+\.\d+$/.test(pkg) && pa.includes("--isolated") && pa.includes("--no-webmcp")
  && !pa.some((a) => ["--extension", "--cdp-endpoint", "--user-data-dir", "--allow-unrestricted-file-access", "--port", "--host", "--allowed-hosts"].includes(a)),
  `playwright: exact ${pkg}, --isolated, --no-webmcp, no extension/cdp/user-data-dir/port/host`);
// --allowed-origins is a convenience, not a boundary (a redirect from an allowed origin passes, see
// runs/task-b/allowed-origins-probe-result.txt); this only confirms the declared value is local
const oi = pa.indexOf("--allowed-origins");
const origins = oi >= 0 ? (pa[oi + 1] ?? "").split(/[;,]/).filter(Boolean) : [];
check(origins.length > 0 && origins.every((o) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)),
  `playwright: --allowed-origins only localhost (${origins.join(", ") || "missing"})`);
check(!/@latest/.test(raw), "no @latest in .mcp.json");
check(!/(Bearer\s+[A-Za-z0-9._-]{10,}|sbp_|sk-[A-Za-z0-9]|ghp_|figd_)/.test(raw), "no plaintext secret in .mcp.json");

const VERCEL11 = ["buy_pro", "buy_credits", "buy_addon", "buy_domain", "deploy_to_vercel", "get_access_to_vercel_url",
  "import-claude-design-from-url", "reply_to_toolbar_thread", "edit_toolbar_message", "change_toolbar_thread_resolve_status", "add_toolbar_reaction"];
check(VERCEL11.every((t) => deny.includes(`mcp__vercel__${t}`)), "deny: all 11 Vercel tools of the walkthrough by exact name");
const PW = ["browser_run_code_unsafe", "webmcp_*", "browser_file_upload", "browser_drop"];
check(PW.every((t) => deny.includes(`mcp__playwright__${t}`)), "deny: playwright browser_run_code_unsafe, webmcp_*, browser_file_upload, browser_drop");
check(!deny.includes("mcp__*") && !deny.includes("mcp__vercel__*") && !deny.includes("mcp__playwright__*"), "no server-wide deny (mcp__*, mcp__<server>__*)");
check(allow.filter((r) => r.startsWith("mcp__")).every((r) => !r.includes("*")), "allow: exact names only, no * in any mcp__ rule");
check(!allow.some((r) => /execute_sql|apply_migration/.test(r)), "allow: no execute_sql, no apply_migration");
const keys = Object.keys(mcp);
const prefixes = [...allow, ...deny].filter((r) => r.startsWith("mcp__")).map((r) => r.split("__")[1]);
check(prefixes.every((p) => keys.includes(p)), `every mcp__<server>__ prefix is a key of .mcp.json (${[...new Set(prefixes)].join(", ")})`);
// this repo's own rule: every Vercel tool whose name starts with a state-changing verb is denied
const VERBS = ["buy_", "create_", "delete_", "update_", "edit_", "add_", "assign_", "cancel_", "accept_", "approve_", "complete_", "activate_",
  "revoke_", "request_", "rerequest_", "pause_", "unpause_", "patch_", "put_", "upload_", "issue_", "invalidate_", "restore_", "start_",
  "stop_", "kill_", "run_", "write_", "exchange_", "import", "reply_", "change_", "join_", "sign_", "record_", "stage_", "test_", "retry_",
  "replace_", "upsert_", "extend_"];
check(VERBS.every((v) => deny.includes(`mcp__vercel__${v}*`)), `deny: ${VERBS.length} state-changing Vercel verb prefixes (docs/mcp/connections.md)`);
console.log(fails ? `RESULT: ${fails} FAIL` : "RESULT: all PASS");
process.exit(fails ? 1 : 0);
