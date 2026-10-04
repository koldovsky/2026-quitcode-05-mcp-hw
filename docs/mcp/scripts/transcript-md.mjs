#!/usr/bin/env node
// Claude Code transcript (headless stream-json, or an interactive session file from
// ~/.claude/projects/<dir>/<session>.jsonl) → readable markdown with numbered tool calls.
//   node docs/mcp/scripts/transcript-md.mjs <transcript.jsonl> [--from <ISO time>] > transcript.md
// Every tool call shows its full arguments and its result (long results cut, length noted), so the
// report can cite "call N" and a reviewer can check it. Local paths under $HOME become ~.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

const file = process.argv[2];
if (!file) { console.error("usage: transcript-md.mjs <transcript.jsonl> [--from <ISO>]"); process.exit(2); }
const from = process.argv.includes("--from") ? Date.parse(process.argv[process.argv.indexOf("--from") + 1]) : 0;
const home = homedir();
const scrub = (s) => String(s).split(home).join("~");
const cut = (s, n = 3000) => (s.length > n ? `${s.slice(0, n)}\n… [cut: ${s.length - n} more chars]` : s);
const rows = readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
  .filter((r) => !from || !r.timestamp || Date.parse(r.timestamp) >= from);

const init = rows.find((r) => r.type === "system" && r.subtype === "init");
const result = rows.find((r) => r.type === "result");
const text = (c) => (typeof c === "string" ? c : (c ?? []).map((b) => (b.type === "text" ? b.text : b.type === "image" ? "[image]" : JSON.stringify(b))).join("\n"));

const out = ["# Transcript", ""];
if (init) {
  out.push("## Session", "", "```",
    `model: ${init.model} · claude ${init.claude_code_version ?? "?"} · permissionMode: ${init.permissionMode}`,
    `cwd: ${scrub(init.cwd)}`,
    `mcp_servers: ${(init.mcp_servers ?? []).map((s) => `${s.name} (${s.status})`).join(", ") || "none"}`,
    `MCP tools offered (${(init.tools ?? []).filter((t) => t.startsWith("mcp__")).length}): ${(init.tools ?? []).filter((t) => t.startsWith("mcp__")).join(", ") || "none"}`,
    `built-in tools offered: ${(init.tools ?? []).filter((t) => !t.startsWith("mcp__")).join(", ")}`,
    "```", "");
}
let n = 0;
const ordinal = new Map();
for (const r of rows) {
  const content = r?.message?.content;
  if (r.type === "user" && typeof content === "string" && content.trim()) out.push("## user", "", scrub(content.trim()), "");
  for (const b of Array.isArray(content) ? content : []) {
    if (r.type === "user" && b.type === "text" && b.text?.trim() && !b.text.startsWith("<")) out.push("## user", "", scrub(b.text.trim()), "");
    if (r.type === "assistant" && b.type === "text" && b.text?.trim()) out.push("### agent", "", scrub(b.text.trim()), "");
    if (b.type === "tool_use") {
      ordinal.set(b.id, ++n);
      out.push(`### call ${n}: \`${b.name}\``, "", "```json", scrub(JSON.stringify(b.input ?? {}, null, 2)), "```", "");
    }
    if (b.type === "tool_result") {
      const body = scrub(text(b.content));
      out.push(`→ result of call ${ordinal.get(b.tool_use_id) ?? "?"}${b.is_error ? " (**is_error**)" : ""}:`, "", "```", cut(body), "```", "");
    }
  }
}
if (result) {
  out.push("---", "", "## Result", "", "```",
    `tool calls: ${n} · turns: ${result.num_turns} · duration: ${Math.round((result.duration_ms ?? 0) / 1000)} s · cost: $${(result.total_cost_usd ?? 0).toFixed(2)}`,
    `permission denials: ${(result.permission_denials ?? []).map((d) => d.tool_name).join(", ") || "none"}`, "```", "");
}
console.log(out.join("\n"));
