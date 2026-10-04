#!/usr/bin/env node
// Contract check of the LeadDesk MCP server (Task A), black-box through MCP Inspector CLI 2.8.0.
// Every case starts a fresh server process, exactly like the committed docs/mcp/*.json.
//
//   node mcp/leaddesk-server/scripts/check-contract.mjs                 check mcp/leaddesk-server
//   node mcp/leaddesk-server/scripts/check-contract.mjs --dir <copy>    check another copy of the server
//   node mcp/leaddesk-server/scripts/check-contract.mjs --self-test     break the server one rule at a time
//                                                                        in temp copies; each mutant must fail
//                                                                        its own check
// Exit: 0 all PASS · 1 a FAIL · 2 usage or setup error. Run from the repository root.
import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const ROOT = process.cwd();
const MATERIALS = join(ROOT, "materials/leads.json");
const argOf = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
const DIR = resolve(argOf("--dir") ?? "mcp/leaddesk-server");
const INSPECTOR = ["-y", "@modelcontextprotocol/inspector@2.8.0", "--cli"];
const STATUSES = ["new", "contacted", "qualified", "won", "lost"];
const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");

// One Inspector call → { code, json }. Exit 5 is Inspector's "tool returned isError".
async function inspect(dir, args) {
  const cmd = ["npx", [...INSPECTOR, "node", join(dir, "src/server.mjs"), ...args]];
  try {
    const { stdout } = await run(...cmd, { maxBuffer: 1 << 24 });
    return { code: 0, json: JSON.parse(stdout) };
  } catch (e) {
    if (e.code === undefined || e.stdout === undefined) throw e;
    let json = null;
    try { json = JSON.parse(e.stdout); } catch { /* not JSON: reported by the case */ }
    return { code: e.code, json, raw: e.stdout };
  }
}
const call = (dir, tool, args) =>
  inspect(dir, ["--method", "tools/call", "--tool-name", tool, ...Object.entries(args).flatMap(([k, v]) => ["--tool-arg", `${k}=${v}`])]);

// What the server writes to stdout on its own, with no client talking to it: must be nothing.
function stdoutWithoutClient(dir) {
  return new Promise((ok) => {
    const p = spawn("node", [join(dir, "src/server.mjs")], { stdio: ["pipe", "pipe", "ignore"] });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    setTimeout(() => p.stdin.end(), 1500); // EOF on stdin: the stdio server exits
    p.on("close", () => ok(out));
  });
}

const CHECKS = [
  ["C1", "tools/list: exactly leaddesk_find_leads and leaddesk_set_lead_status, readOnlyHint true/false", async (d) => {
    const { json } = await inspect(d, ["--method", "tools/list"]);
    const names = json.tools.map((t) => t.name).sort();
    const by = Object.fromEntries(json.tools.map((t) => [t.name, t]));
    return names.join() === "leaddesk_find_leads,leaddesk_set_lead_status"
      && by.leaddesk_find_leads.annotations?.readOnlyHint === true
      && by.leaddesk_set_lead_status.annotations?.readOnlyHint === false
      || `names=${names} annotations=${JSON.stringify(json.tools.map((t) => t.annotations))}`;
  }],
  ["C2", "tools/list: every parameter has a description; enums, id pattern and bounds come from the app", async (d) => {
    const { json } = await inspect(d, ["--method", "tools/list"]);
    const by = Object.fromEntries(json.tools.map((t) => [t.name, t.inputSchema.properties]));
    const f = by.leaddesk_find_leads, s = by.leaddesk_set_lead_status;
    const noDesc = json.tools.flatMap((t) => Object.entries(t.inputSchema.properties).filter(([, p]) => !p.description).map(([k]) => `${t.name}.${k}`));
    const bad = [
      noDesc.length && `no description: ${noDesc}`,
      JSON.stringify(f.status.enum) !== JSON.stringify([...STATUSES, "any"]) && `find.status enum ${JSON.stringify(f.status.enum)}`,
      !(f.limit.type === "integer" && f.limit.minimum === 1 && f.limit.maximum === 50 && f.limit.default === 10) && `find.limit ${JSON.stringify(f.limit)}`,
      JSON.stringify(s.status.enum) !== JSON.stringify(STATUSES) && `set.status enum ${JSON.stringify(s.status.enum)}`,
      s.leadId.pattern !== "^lead_\\d{4}$" && `set.leadId pattern ${s.leadId.pattern}`,
      !(s.reason.minLength === 3 && s.reason.maxLength === 500) && `set.reason ${JSON.stringify(s.reason)}`,
    ].filter(Boolean);
    return bad.length === 0 || bad.join("; ");
  }],
  ["C3", "tool descriptions say what the tool does and whether it changes data", async (d) => {
    const { json } = await inspect(d, ["--method", "tools/list"]);
    const by = Object.fromEntries(json.tools.map((t) => [t.name, t.description]));
    return (/тільки читає/i.test(by.leaddesk_find_leads) && /змінює дані/i.test(by.leaddesk_set_lead_status) && /підтвердження/i.test(by.leaddesk_set_lead_status))
      || JSON.stringify(by);
  }],
  ["C4", "resource leaddesk://reference/statuses, text/markdown, explains all five statuses", async (d) => {
    const list = (await inspect(d, ["--method", "resources/list"])).json.resources;
    const { json } = await inspect(d, ["--method", "resources/read", "--uri", "leaddesk://reference/statuses"]);
    const c = json.contents?.[0];
    return (list.length === 1 && list[0].uri === "leaddesk://reference/statuses" && c?.mimeType === "text/markdown"
      && STATUSES.every((s) => c.text.includes(`\`${s}\``))) || `resources=${list.map((r) => r.uri)} mimeType=${c?.mimeType}`;
  }],
  ["C5", "find any/50: 20 leads, only id company status source budget createdAt, no name/email/message", async (d) => {
    const { json } = await call(d, "leaddesk_find_leads", { status: "any", limit: 50 });
    const raw = JSON.stringify(json);
    const fixture = JSON.parse(readFileSync(MATERIALS, "utf8"));
    const leaked = fixture.flatMap((l) => [l.fullName, l.email, l.message]).filter((v) => raw.includes(v));
    const keys = [...new Set(json.structuredContent.leads.flatMap(Object.keys))].sort().join();
    return (json.structuredContent.total === 20 && json.structuredContent.leads.length === 20
      && keys === "budget,company,createdAt,id,source,status" && leaked.length === 0)
      || `total=${json.structuredContent.total} keys=${keys} leaked=${leaked.length} (e.g. ${String(leaked[0]).slice(0, 12)}…)`;
  }],
  ["C6", "find qualified → lead_0001, lead_0013, lead_0015 (answer key, prompt 1)", async (d) => {
    const ids = (await call(d, "leaddesk_find_leads", { status: "qualified" })).json.structuredContent.leads.map((l) => l.id).join();
    return ids === "lead_0001,lead_0013,lead_0015" || ids;
  }],
  ["C7", "find new/5 newest first → 0002, 0005, 0004, 0018, 0012 (prompt 2)", async (d) => {
    const ids = (await call(d, "leaddesk_find_leads", { status: "new", limit: 5 })).json.structuredContent.leads.map((l) => l.id).join();
    return ids === "lead_0002,lead_0005,lead_0004,lead_0018,lead_0012" || ids;
  }],
  ["C8", "find won: budgets sum to 9000, one lead without budget (prompt 3)", async (d) => {
    const ls = (await call(d, "leaddesk_find_leads", { status: "won" })).json.structuredContent.leads;
    const sum = ls.reduce((a, l) => a + (l.budget ?? 0), 0), nulls = ls.filter((l) => l.budget === null).length;
    return (ls.length === 5 && sum === 9000 && nulls === 1) || `n=${ls.length} sum=${sum} null=${nulls}`;
  }],
  ["C9", "set lead_0002 → contacted: new status + audit { action, leadId, at } in structuredContent", async (d) => {
    const { code, json } = await call(d, "leaddesk_set_lead_status", { leadId: "lead_0002", status: "contacted", reason: "зателефонували, чекає кошторис" });
    const a = json?.structuredContent?.audit;
    return (code === 0 && !json.isError && json.structuredContent.lead.status === "contacted"
      && a?.action === "lead.status_changed" && a.leadId === "lead_0002" && !Number.isNaN(Date.parse(a.at)) && a.from === "new")
      || `code=${code} ${JSON.stringify(json).slice(0, 200)}`;
  }],
  ["C10", "unknown lead lead_9999 → isError with a hint to leaddesk_find_leads", async (d) => {
    const { code, json } = await call(d, "leaddesk_set_lead_status", { leadId: "lead_9999", status: "won", reason: "перевірка" });
    return (code === 5 && json.isError === true && json.content[0].text.includes("leaddesk_find_leads")) || `code=${code} ${JSON.stringify(json)}`;
  }],
  ["C11", "same status (lead_0001 is qualified → qualified) → isError, not a silent success", async (d) => {
    const { code, json } = await call(d, "leaddesk_set_lead_status", { leadId: "lead_0001", status: "qualified", reason: "перевірка" });
    return (code === 5 && json.isError === true) || `code=${code} ${JSON.stringify(json).slice(0, 160)}`;
  }],
  ["C12", "closed deal (lead_0006 won → lost) → isError: the agent does not reopen won/lost", async (d) => {
    const { code, json } = await call(d, "leaddesk_set_lead_status", { leadId: "lead_0006", status: "lost", reason: "перевірка" });
    return (code === 5 && json.isError === true) || `code=${code} ${JSON.stringify(json).slice(0, 160)}`;
  }],
  ["C13", "invalid input is rejected: id nope, status hot, reason 2 and 501 chars, limit 0 / 51 / 1.5", async (d) => {
    const cases = [
      ["leaddesk_set_lead_status", { leadId: "nope", status: "won", reason: "перевірка" }],
      ["leaddesk_set_lead_status", { leadId: "lead_0002", status: "hot", reason: "перевірка" }],
      ["leaddesk_set_lead_status", { leadId: "lead_0002", status: "contacted", reason: "ok" }],
      ["leaddesk_set_lead_status", { leadId: "lead_0002", status: "contacted", reason: "x".repeat(501) }],
      ["leaddesk_set_lead_status", { leadId: "lead_0002", status: "contacted", reason: "   ok   " }],
      ["leaddesk_find_leads", { status: "new", limit: 0 }],
      ["leaddesk_find_leads", { status: "new", limit: 51 }],
      ["leaddesk_find_leads", { status: "new", limit: 1.5 }],
      ["leaddesk_find_leads", { status: "hot" }],
    ];
    const passed = [];
    for (const [tool, args] of cases) {
      const { code, json } = await call(d, tool, args);
      if (!(code === 5 && json?.isError === true)) passed.push(`${tool}(${JSON.stringify(args).slice(0, 60)}) code=${code}`);
    }
    return passed.length === 0 || `accepted: ${passed.join("; ")}`;
  }],
  ["C14", "fixture is an unchanged copy of materials/leads.json, also after the status changes above", async (d) => {
    const f = join(d, "fixtures/leads.json");
    return sha(f) === sha(MATERIALS) || `fixture sha ${sha(f).slice(0, 12)} ≠ materials ${sha(MATERIALS).slice(0, 12)}`;
  }],
  ["C15", "stdout is protocol only: nothing on stdout without a client; no console.log in src/", async (d) => {
    const out = await stdoutWithoutClient(d);
    const hits = readdirSync(join(d, "src")).filter((f) => /console\.log/.test(readFileSync(join(d, "src", f), "utf8")));
    return (out === "" && hits.length === 0) || `stdout=${JSON.stringify(out.slice(0, 60))} console.log in ${hits}`;
  }],
  ["C16", "package.json: exact versions of @modelcontextprotocol/server and zod, no sdk; src/ has only .mjs", async (d) => {
    const deps = JSON.parse(readFileSync(join(d, "package.json"), "utf8")).dependencies ?? {};
    const loose = Object.entries(deps).filter(([, v]) => !/^\d+\.\d+\.\d+$/.test(v)).map(([k]) => k);
    const notMjs = readdirSync(join(d, "src")).filter((f) => !f.endsWith(".mjs"));
    const allowed = ["@modelcontextprotocol/node", "@modelcontextprotocol/server", "zod"];
    const extra = Object.keys(deps).filter((k) => !allowed.includes(k));
    return (deps["@modelcontextprotocol/server"] && deps.zod && !deps["@modelcontextprotocol/sdk"] && loose.length === 0 && notMjs.length === 0 && extra.length === 0)
      || `loose=${loose} notMjs=${notMjs} extra=${extra}`;
  }],
  ["C17", "back to new (lead_0003 contacted → new) → isError: only the app sets new", async (d) => {
    const { code, json } = await call(d, "leaddesk_set_lead_status", { leadId: "lead_0003", status: "new", reason: "перевірка" });
    return (code === 5 && json.isError === true) || `code=${code} ${JSON.stringify(json).slice(0, 160)}`;
  }],
];

async function checkAll(dir, { quiet = false } = {}) {
  const failed = [];
  for (const [id, title, fn] of CHECKS) {
    let res;
    try { res = await fn(dir); } catch (e) { res = `threw: ${e.message.split("\n")[0]}`; }
    if (res !== true) failed.push(id);
    if (!quiet) console.log(`${res === true ? "PASS" : "FAIL"} ${id} ${title}${res === true ? "" : `\n     → ${res}`}`);
  }
  return failed;
}

// Each mutant breaks exactly one rule of the contract in a temp copy of the server.
const MUTANTS = [
  ["M1", "C5", "find returns email", ['const PUBLIC_FIELDS = ["id",', 'const PUBLIC_FIELDS = ["email", "id",']],
  ["M2", "C11", "same status is accepted silently", ["if (lead.status === status) {", "if (false) {"]],
  ["M3", "C12", "closed deals can be reopened", ["if (CLOSED.has(lead.status)) {", "if (false) {"]],
  ["M4", "C1", "set_lead_status claims to be read-only", ["annotations: { readOnlyHint: false,", "annotations: { readOnlyHint: true,"]],
  ["M5", "C7", "oldest first", ["Date.parse(b.createdAt) - Date.parse(a.createdAt)", "Date.parse(a.createdAt) - Date.parse(b.createdAt)"]],
  ["M6", "C15", "console.log on start", ["console.error(`leaddesk: ${leads.size}", "console.log(`leaddesk: ${leads.size}"]],
  ["M7", "C14", "writes the change back into the fixture", ["audit.push(entry);", 'audit.push(entry); (await import("node:fs")).writeFileSync(FIXTURE, JSON.stringify([...leads.values()], null, 2));']],
  ["M8", "C2", "invented status hot", ['export const LEAD_STATUSES = ["new",', 'export const LEAD_STATUSES = ["hot", "new",']],
  ["M9", "C9", "no audit entry in the result", ["structuredContent: { lead: pick(lead), audit: entry },", "structuredContent: { lead: pick(lead) },"]],
  ["M10", "C17", "an open lead can be sent back to new", ['if (status === "new") {', "if (false) {"]],
];

async function selfTest() {
  let ok = true;
  for (const [id, expected, what, [from, to]] of MUTANTS) {
    const tmp = mkdtempSync(join(tmpdir(), `leaddesk-${id}-`));
    try {
      for (const p of ["src", "fixtures", "package.json"]) cpSync(join(DIR, p), join(tmp, p), { recursive: true });
      symlinkSync(join(DIR, "node_modules"), join(tmp, "node_modules"));
      const file = join(tmp, "src/leaddesk.mjs");
      const code = readFileSync(file, "utf8");
      if (!code.includes(from)) { console.log(`SETUP ${id}: pattern not found — update the mutant`); ok = false; continue; }
      writeFileSync(file, code.replace(from, to));
      const failed = await checkAll(tmp, { quiet: true });
      const hit = failed.includes(expected);
      ok &&= hit;
      console.log(`${hit ? "OK  " : "MISS"} ${id} ${what}: expected ${expected} to FAIL; failed = ${failed.join(", ") || "none"}`);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
  console.log(ok ? "self-test: every mutant was caught by its own check" : "self-test: a mutant slipped through");
  return ok;
}

if (process.argv.includes("--self-test")) {
  process.exit((await selfTest()) ? 0 : 1);
} else {
  console.log(`LeadDesk MCP contract check · server ${DIR.replace(ROOT + "/", "")} · Inspector 2.8.0 · ${new Date().toISOString()}`);
  const failed = await checkAll(DIR);
  console.log(failed.length ? `RESULT: ${failed.length} FAIL (${failed.join(", ")})` : `RESULT: ${CHECKS.length}/${CHECKS.length} PASS`);
  process.exit(failed.length ? 1 : 0);
}
