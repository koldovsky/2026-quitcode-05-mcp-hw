#!/usr/bin/env node
// What the human saw in an interactive Claude Code session, verbatim, from a `script -q <log> claude …`
// terminal recording: every /mcp panel and every permission dialog («Do you want to proceed?»).
//   node docs/mcp/scripts/tty-excerpts.mjs <tty.log>            excerpts as markdown
//   node docs/mcp/scripts/tty-excerpts.mjs <tty.log> --render   the whole screen history as plain lines
// The session file (.jsonl) keeps tool arguments but not the dialog text, hence the recording.
// Rendering: the TUI places words with CSI n G (absolute column) and CSI n C (forward); those are honoured,
// any other cursor move starts a new line, colours are dropped. The TUI redraws a dialog many times while
// it is open; consecutive duplicate lines are dropped and each dialog is printed once (its last redraw).
import { readFileSync } from "node:fs";

const [file, flag] = process.argv.slice(2);
if (!file) { console.error("usage: tty-excerpts.mjs <tty.log> [--render]"); process.exit(2); }
const s = readFileSync(file, "utf8");
const TOK = /\x1b\[([0-9;?<>=]*)([A-Za-z])|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[()][0-9A-Za-z]|\x1b[=>78]|\r|\n|[^\x1b\r\n]+/g;
const lines = []; let cur = [], col = 0;
const flush = () => { lines.push(cur.join("").trimEnd()); cur = []; col = 0; };
for (const m of s.matchAll(TOK)) {
  const t = m[0];
  if (m[2]) {
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : 1;
    if (m[2] === "G") col = n - 1; else if (m[2] === "C") col += n; else if (!"mhlKJ".includes(m[2])) flush();
  } else if (t === "\r") col = 0;
  else if (t === "\n") flush();
  else if (!t.startsWith("\x1b")) for (const ch of t) { while (cur.length < col) cur.push(" "); cur[col++] = ch; }
}
flush();
const out = lines.filter((l, i) => l.trim() && l !== lines[i - 1]);
if (flag === "--render") { console.log(out.join("\n")); process.exit(0); }

// a block starts at its title line and ends at its footer line
const blocks = [];
for (let i = 0; i < out.length; i++) {
  const start = /^\s*Tool use\s*$/.test(out[i]) ? "dialog" : /^\s*Manage MCP servers\s*$/.test(out[i]) && /\d+ servers?/.test(out[i + 1] ?? "") ? "mcp" : null;
  if (!start) continue;
  let j = i + 1;
  while (j < out.length && !/Esc to (cancel|back)/.test(out[j]) && j - i < 80) j++;
  // the /mcp list is followed by the server detail panel (Status, Auth, URL, Tools) — keep it too
  if (start === "mcp") { let k = j + 1; while (k < out.length && k - j < 25 && !/Esc to back/.test(out[k])) k++; if (/Esc to back/.test(out[k] ?? "")) j = k; }
  blocks.push({ kind: start, text: out.slice(i, j + 1).join("\n") });
  i = j;
}
// a dialog redrawn while open shows up again right after itself; a partial redraw repaints only some cells,
// so the copy can miss characters. A block whose text (spaces and frame characters aside) is a subsequence
// of the previous block's is that same dialog: the first, complete copy is kept.
const norm = (t) => [...t.replace(/[\s│]/g, "")];
const subseq = (a, b) => { let i = 0; for (const ch of b) if (ch === a[i]) i++; return i === a.length; };
const uniq = blocks.filter((b, i) => i === 0 || b.kind !== blocks[i - 1].kind || !subseq(norm(b.text), norm(blocks[i - 1].text)));
let n = 0;
for (const b of uniq) {
  console.log(b.kind === "mcp" ? "### `/mcp`\n" : `### Діалог ${++n}\n`);
  console.log("```text\n" + b.text + "\n```\n");
}
