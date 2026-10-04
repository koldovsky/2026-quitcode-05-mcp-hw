#!/usr/bin/env node
// Removes Vercel account identifiers from evidence files before they are committed: the team slug in
// deployment hostnames (<project>-<hash>-<team>.vercel.app), user and owner fields, project and team
// ids. Not "email": lead e-mails in other transcripts are synthetic fixture data and stay. Patterns only — the script itself holds no identifier. Works on .jsonl (stays valid JSON:
// replacements stay inside string values, also inside escaped JSON) and on .md / .txt.
//   node docs/mcp/scripts/scrub-vercel.mjs <file>...        rewrites in place, prints counts
//   node docs/mcp/scripts/scrub-vercel.mjs --check <file>... exit 1 if anything would change
import { readFileSync, writeFileSync } from "node:fs";

const check = process.argv[2] === "--check";
const files = process.argv.slice(check ? 3 : 2);
const RULES = [
  // team slug in *.vercel.app hostnames; personal teams end in "-projects"
  [/([a-z0-9]+(?:-[a-z0-9]+)*?)-([a-z0-9]+(?:-[a-z0-9]+)*-projects)(\.vercel\.app)/g, "$1-<team>$3"],
  // "username": "…", "ownerId": "…" … — plain and escaped-JSON forms
  [/(\\*"(?:username|ownerId|teamId|userId|uid|creatorId|githubLogin)\\*"\s*:\s*\\*")(?!<)([^"\\]+)/g, "$1<redacted>"],
  [/\bprj_[A-Za-z0-9]{12,}\b/g, "prj_<redacted>"],
  [/\bteam_[A-Za-z0-9]{16,}\b/g, "team_<redacted>"],
];
let dirty = 0;
for (const f of files) {
  const before = readFileSync(f, "utf8");
  let after = before, n = 0;
  for (const [re, to] of RULES) after = after.replace(re, (...m) => { n++; return m[0].replace(re, to); });
  if (f.endsWith(".jsonl")) for (const l of after.split("\n").filter(Boolean)) JSON.parse(l); // still valid
  if (n) { dirty++; console.log(`${check ? "would scrub" : "scrubbed"} ${n} × ${f}`); if (!check) writeFileSync(f, after); }
}
if (check && dirty) process.exit(1);
console.log(check ? `clean: ${files.length} files` : `done: ${dirty} of ${files.length} files changed`);
