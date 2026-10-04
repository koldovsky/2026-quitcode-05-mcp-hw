#!/usr/bin/env node
// Runs one fresh Claude Code session as its SDK host and answers every permission prompt by a WRITTEN
// policy, logging each prompt verbatim. Used when the person delegated the approvals ("зроби це сам"):
// the approver is then this script + its policy, not a human — the reports say so.
//
//   node docs/mcp/scripts/approval-host.mjs --policy <supabase-build|ab> --mcp-config <json file>
//        --cwd <dir> --prompts <file> --out <dir> [--model sonnet] [--effort high] [--disallowed <list>]
//
// --prompts: a JSON array of messages, sent one by one; the next goes after the previous turn's result.
// Session: claude -p --input-format stream-json --output-format stream-json --permission-prompts host
//   --setting-sources project --strict-mcp-config --permission-mode default: every tool call that would
//   show a dialog reaches this host as control_request/can_use_tool {tool_name, input} — the content of
//   the dialog a human would have read.
// Writes <out>/meta.txt, transcript.jsonl (everything the session printed), approvals.jsonl (every
// request + decision + reason), approvals.md (readable), stderr.txt.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync, realpathSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";
import { executeSqlVerdict, migrationVerdict } from "./sql-policy.mjs";

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const POLICY = arg("--policy"), CFG = resolve(arg("--mcp-config")), CWD = realpathSync(resolve(arg("--cwd")));
const PROMPTS_FILE = resolve(arg("--prompts")), OUT = resolve(arg("--out"));
const MODEL = arg("--model", "sonnet"), EFFORT = arg("--effort", "high");
// Built-in tools removed for the whole session. Needed because Claude Code runs "safe" Bash commands
// (echo, cat, ls…) without any permission prompt, so the policy alone could not refuse them; and
// Agent/Task: a sub-agent ran with no prompt reaching this host (smoke test, haiku), so it is removed too.
const DISALLOWED = arg("--disallowed", "Bash,WebFetch,WebSearch,Agent,Task");
const prompts = JSON.parse(readFileSync(PROMPTS_FILE, "utf8"));
const servers = Object.keys(JSON.parse(readFileSync(CFG, "utf8")).mcpServers);
if (!["supabase-build", "ab"].includes(POLICY) || servers.length !== 1) { console.error("need --policy supabase-build|ab and exactly one server"); process.exit(2); }
const SERVER = servers[0];
mkdirSync(OUT, { recursive: true });

// ---- the policy: what a careful human approves in this step, and nothing else ----------------------
const inside = (p) => { const a = isAbsolute(p) ? p : resolve(CWD, p); const r = relative(CWD, a); return r === "" || (!r.startsWith("..") && !isAbsolute(r)); };
const isEnv = (p) => /(^|\/)\.env(?!\.example$)/.test(p);
const CLARIFY = "Роби, як вважаєш правильним";
const POLICIES = {
  // Task B: create the leads table, seed 20 rows, verify. No destructive SQL, files only the two SQL files.
  "supabase-build": (tool, input) => {
    // SQL: an allowlist in sql-policy.mjs (its --self-test holds the cases, incl. the PR review attacks)
    if (tool === "mcp__supabase__apply_migration") return migrationVerdict(input.query);
    if (tool === "mcp__supabase__execute_sql") return executeSqlVerdict(input.query);
    if (tool.startsWith("mcp__supabase__")) return [true, "read-only Supabase tool of this profile"];
    if (["Read", "Glob", "Grep"].includes(tool)) {
      const p = input.file_path ?? input.path ?? CWD;
      return inside(p) && !isEnv(p) ? [true, "read inside the repository, not .env*"] : [false, "outside the repository or a .env file"];
    }
    if (tool === "Write" || tool === "Edit") {
      const r = relative(CWD, resolve(CWD, input.file_path ?? ""));
      return ["supabase/migrations/0001_leaddesk.sql", "supabase/seed/leads.sql"].includes(r) ? [true, "one of the two SQL files the task asks for"] : [false, `writing ${r} is not part of this step`];
    }
    if (tool === "AskUserQuestion") return [false, CLARIFY];
    return [false, `${tool} is not needed for this step`];
  },
  // Task C: exactly the protocol of materials/ab-prompts.md — every call of the run's single server is
  // approved (one call, no "always allow"); files outside the run folder, Bash and WebFetch are refused.
  ab: (tool, input) => {
    if (tool.startsWith(`mcp__${SERVER}__`)) return [true, "tool of the run's only MCP server"];
    if (["Read", "Glob", "Grep"].includes(tool)) {
      const p = input.file_path ?? input.path ?? CWD;
      return inside(p) ? [true, "inside the empty run folder"] : [false, "Відмова: файли поза текою прогону"];
    }
    if (tool === "AskUserQuestion") return [false, CLARIFY];
    return [false, `Відмова: ${tool} у цьому прогоні не дозволено`];
  },
};
const decide = POLICIES[POLICY];

// ---- the session ------------------------------------------------------------------------------------
const flags = ["-p", "--model", MODEL, "--effort", EFFORT, "--input-format", "stream-json", "--output-format", "stream-json", "--verbose",
  "--setting-sources", "project", "--strict-mcp-config", "--mcp-config", CFG, "--permission-mode", "default", "--permission-prompts", "host", "--permission-prompt-tool", "stdio", "--disallowedTools", DISALLOWED];
const sha = (s) => createHash("sha256").update(s).digest("hex");
writeFileSync(`${OUT}/meta.txt`, [
  `claude: ${(await new Promise((ok) => { let s = ""; const p = spawn("claude", ["--version"]); p.stdout.on("data", (d) => (s += d)); p.on("close", () => ok(s.trim())); }))}`,
  `policy: ${POLICY} (docs/mcp/scripts/approval-host.mjs) · approver: this script, on the person's instruction "зроби це сам"`,
  `model: ${MODEL} · effort: ${EFFORT} · cwd: ${CWD.replace(process.env.HOME, "~")}`,
  `server: ${readFileSync(CFG, "utf8").trim()}`,
  `prompts: ${prompts.length} messages · sha256 of the messages joined by "\\n": ${sha(prompts.join("\n"))}`,
  `flags: claude ${flags.join(" ").replace(CFG, "<only " + SERVER + ">")}`,
  `started: ${new Date().toISOString()}`, ""].join("\n"));

const child = spawn("claude", flags, { cwd: CWD, stdio: ["pipe", "pipe", "pipe"] });
child.stderr.on("data", (d) => appendFileSync(`${OUT}/stderr.txt`, d));
const send = (o) => child.stdin.write(JSON.stringify(o) + "\n");
const sendUser = (text) => { appendFileSync(`${OUT}/approvals.md`, `\n## message ${++msgNo}: ${text}\n\n`); send({ type: "user", message: { role: "user", content: text }, parent_tool_use_id: null, session_id: "" }); };
let msgNo = 0, next = 0, n = 0, clarified = new Set();
writeFileSync(`${OUT}/approvals.md`, `# Permission prompts and decisions (${POLICY})\n\nEvery tool call that needed approval, in order: tool, arguments verbatim, decision, reason.\n`);
writeFileSync(`${OUT}/approvals.jsonl`, "");
writeFileSync(`${OUT}/transcript.jsonl`, "");

let buf = "";
child.stdout.on("data", (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    if (!line.trim()) continue;
    appendFileSync(`${OUT}/transcript.jsonl`, line + "\n");
    let m; try { m = JSON.parse(line); } catch { continue; }
    if (m.type === "control_request" && m.request?.subtype === "can_use_tool") {
      const { tool_name: tool, input } = m.request;
      const [ok, why] = decide(tool, input ?? {});
      n++;
      appendFileSync(`${OUT}/approvals.jsonl`, JSON.stringify({ n, message: msgNo, tool, input, decision: ok ? "allow" : "deny", why }) + "\n");
      appendFileSync(`${OUT}/approvals.md`, `### prompt ${n} · \`${tool}\` → **${ok ? "allow" : "deny"}** (${why})\n\n\`\`\`json\n${JSON.stringify(input, null, 2)}\n\`\`\`\n\n`);
      send({ type: "control_response", response: { subtype: "success", request_id: m.request_id,
        response: ok ? { behavior: "allow", updatedInput: input } : { behavior: "deny", message: why } } });
    } else if (m.type === "result") {
      const text = String(m.result ?? "");
      // a clarifying question at the end of a turn gets the protocol's fixed answer, once per message
      if (/\?\s*$/.test(text.slice(-300).trim()) && !clarified.has(msgNo)) { clarified.add(msgNo); sendUser(CLARIFY); }
      else if (next < prompts.length) sendUser(prompts[next++]);
      else child.stdin.end();
    }
  }
});
sendUser(prompts[next++]);
child.on("close", (code) => {
  appendFileSync(`${OUT}/meta.txt`, `exit: ${code} · finished: ${new Date().toISOString()} · permission prompts: ${n}\n`);
  console.log(readFileSync(`${OUT}/meta.txt`, "utf8"));
});
