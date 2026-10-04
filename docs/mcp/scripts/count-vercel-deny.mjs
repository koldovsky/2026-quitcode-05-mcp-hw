#!/usr/bin/env node
// How many of the Vercel tools the session really got (`init` of the run without deny) each part of
// the deny list in .claude/settings.json closes. Reads the original transcript from raw-runs.tar.gz.
//   node docs/mcp/scripts/count-vercel-deny.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "vercel-deny-"));
execFileSync("tar", ["-xzf", "docs/mcp/runs/task-b/raw-runs.tar.gz", "-C", dir, "vercel-tools-no-deny/transcript.jsonl"]);
const init = readFileSync(join(dir, "vercel-tools-no-deny/transcript.jsonl"), "utf8").split("\n").filter(Boolean)
  .map((l) => JSON.parse(l)).find((r) => r.subtype === "init");
rmSync(dir, { recursive: true });
const tools = init.tools.filter((t) => t.startsWith("mcp__vercel__"));
const deny = JSON.parse(readFileSync(".claude/settings.json", "utf8")).permissions.deny.filter((d) => d.startsWith("mcp__vercel__"));
const hits = (t, d) => (d.endsWith("*") ? t.startsWith(d.slice(0, -1)) : t === d);
const closedBy = (rules) => tools.filter((t) => rules.some((d) => hits(t, d))).length;
const walkthrough = deny.slice(0, 11), globs = deny.filter((d) => d.endsWith("*")), exact = deny.slice(11).filter((d) => !d.endsWith("*"));
console.log(`vercel tools in init (run without deny): ${tools.length}`);
console.log(`walkthrough deny (11 names): ${walkthrough.filter((d) => tools.includes(d)).length} exist, close ${closedBy(walkthrough)} → ${tools.length - closedBy(walkthrough)} left`);
console.log(`${globs.length} verb globs close ${closedBy(globs)}; ${exact.length} exact names close ${closedBy(exact)}`);
console.log(`whole deny list closes ${closedBy(deny)} → ${tools.length - closedBy(deny)} left`);
