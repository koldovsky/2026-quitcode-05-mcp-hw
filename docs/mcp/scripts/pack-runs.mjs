#!/usr/bin/env node
// Packs run folders (meta.txt, transcript.jsonl, transcript.md, stderr.txt, approvals.*) into ONE
// readable file per run plus one archive with every original, so the PR stays under CodeRabbit's
// 100-file limit while nothing is lost.
//   node docs/mcp/scripts/pack-runs.mjs docs/mcp/runs/task-b
// For every folder <x>/ that holds a meta.txt (at any depth): writes <x>.md (meta + approvals +
// transcript), then archives the whole tree as <dir>/raw-runs.tar.gz and removes the folders.
// raw-runs.tar.gz keeps the originals byte for byte: `tar -xzf raw-runs.tar.gz` restores them.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

const ROOT = process.argv[2];
if (!ROOT) { console.error("usage: pack-runs.mjs <dir>"); process.exit(2); }
const runs = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) { if (existsSync(join(p, "meta.txt"))) runs.push(p); else walk(p); } } };
walk(ROOT);
const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");
for (const r of runs) {
  const name = relative(ROOT, r).replaceAll("/", "-");
  const parts = [`# Run \`${name}\``, "", "Packed by `docs/mcp/scripts/pack-runs.mjs`; the originals (`transcript.jsonl`, `stderr.txt`, prompts) are in",
    "`raw-runs.tar.gz` next to this file.", "", "## meta.txt", "", "```", read(join(r, "meta.txt")).trim(), "```", ""];
  if (read(join(r, "approvals.md"))) parts.push(read(join(r, "approvals.md")).replace(/^# /, "## "), "");
  parts.push(read(join(r, "transcript.md")).replace(/^# Transcript/, "## Transcript"));
  writeFileSync(join(ROOT, `${name}.md`), parts.join("\n"));
}
// any loose text files inside a packed parent (e.g. a probe's result.txt) are lifted next to it
for (const d of readdirSync(ROOT).map((f) => join(ROOT, f)).filter((p) => statSync(p).isDirectory() && !runs.includes(p) && basename(p) !== "prompts")) {
  for (const f of readdirSync(d).filter((f) => f.endsWith(".txt"))) writeFileSync(join(ROOT, `${basename(d)}-${f}`), readFileSync(join(d, f)));
}
const dirs = readdirSync(ROOT).filter((f) => statSync(join(ROOT, f)).isDirectory());
execFileSync("tar", ["-czf", "raw-runs.tar.gz", ...dirs], { cwd: ROOT });
for (const d of dirs) rmSync(join(ROOT, d), { recursive: true });
const files = execFileSync("tar", ["-tzf", join(ROOT, "raw-runs.tar.gz")], { encoding: "utf8" }).split("\n").filter((l) => l && !l.endsWith("/"));
console.log(`packed ${runs.length} runs into ${runs.length} .md files; raw-runs.tar.gz holds ${files.length} files from ${dirs.length} folders`);
