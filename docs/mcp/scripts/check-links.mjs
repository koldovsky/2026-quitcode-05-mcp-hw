#!/usr/bin/env node
// Every relative markdown link and every `task-b/…` / `runs/task-b/…` / `task-a/…` / `task-e/…` path cited
// in the docs/mcp reports, evidence, A/B transcripts and packed runs exists on disk. Exit 1 on a dead reference.
// Links into .playwright-mcp/ (snapshots the browser agent wrote; never committed, by rule) are listed, not failed.
//   node docs/mcp/scripts/check-links.mjs
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
const docs = ["docs/mcp", "docs/mcp/evidence", "docs/mcp/ab", "docs/mcp/ab/run1", "docs/mcp/ab/a-reruns", "docs/mcp/runs/task-b"].flatMap((d) => readdirSync(d).filter((f) => f.endsWith(".md")).map((f) => join(d, f)));
let dead = 0, absentByRule = 0;
for (const f of docs) {
  const s = readFileSync(f, "utf8");
  for (const [, href] of s.matchAll(/\]\(([^)#\s]+)\)/g)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) continue; // https:, about:blank, …
    if (/(^|\/)\.playwright-mcp\//.test(href)) { console.log(`ABSENT BY RULE ${f}: ${href}`); absentByRule++; continue; }
    if (!existsSync(join(dirname(f), href))) { console.log(`DEAD ${f}: ${href}`); dead++; }
  }
  for (const [, p] of s.matchAll(/`(?:runs\/)?(task-[abe]\/[^`\s…]+)`/g)) {
    const base = p.startsWith("task-b/") ? "docs/mcp/runs" : "docs/mcp/evidence";
    if (!existsSync(join(base, p.replace(/\/$/, "")))) { console.log(`DEAD ${f}: ${p} (looked in ${base})`); dead++; }
  }
}
console.log(dead ? `RESULT: ${dead} dead` : `RESULT: all references exist (${docs.length} files; ${absentByRule} links into .playwright-mcp/, not committed by rule)`);
process.exit(dead ? 1 : 0);
