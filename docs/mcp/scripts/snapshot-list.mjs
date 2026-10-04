#!/usr/bin/env node
// Tool list for mcp-before.txt / mcp-after.txt: names FROM THE AGENT'S ANSWER (the source the
// walkthrough asks for), one per line, and a cross-check against what the session was offered (init).
//   node docs/mcp/scripts/snapshot-list.mjs <transcript.jsonl> <server-key>
import { readFileSync } from "node:fs";
const [file, key] = process.argv.slice(2);
const rows = readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const answer = rows.find((r) => r.type === "result")?.result ?? "";
const init = rows.find((r) => r.type === "system" && r.subtype === "init");
const offered = init.tools.filter((t) => t.startsWith(`mcp__${key}__`)).map((t) => t.slice(`mcp__${key}__`.length)).sort();
const said = [...new Set(answer.match(/\b(?:browser|webmcp)_[a-z_]+\b/g) ?? [])];
const lines = [
  `# ${key}: tools the agent listed (answer of a fresh session, no tool called). Source: ${file.split("/").slice(-2).join("/")}`,
  ...said,
  `# total listed by the agent: ${said.length}`,
  `# cross-check with the session's init.tools (mcp__${key}__*): ${offered.length} offered; ` +
    (JSON.stringify([...said].sort()) === JSON.stringify(offered) ? "same set" : `DIFFERENT — only said: ${said.filter((t) => !offered.includes(t))}; only offered: ${offered.filter((t) => !said.includes(t))}`),
];
console.log(lines.join("\n"));
