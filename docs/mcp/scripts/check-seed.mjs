#!/usr/bin/env node
// Task B / C precondition: the Supabase migration and seed carry exactly the 20 leads of
// materials/leads.json — the same data as the LeadDesk server's fixture, so the A/B compares two
// interfaces, not two datasets. Static: reads the SQL files, no database.
//   node docs/mcp/scripts/check-seed.mjs          exit 0 all PASS · 1 a FAIL
import { readFileSync } from "node:fs";

const MIG = "supabase/migrations/0001_leaddesk.sql", SEED = "supabase/seed/leads.sql";
const leads = JSON.parse(readFileSync("materials/leads.json", "utf8"));
const mig = readFileSync(MIG, "utf8"), seed = readFileSync(SEED, "utf8");
const STATUSES = ["new", "contacted", "qualified", "won", "lost"];
const sql = (v) => `'${String(v).replaceAll("'", "''")}'`;
let fails = 0;
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) fails++; };

check(/create\s+table\b[^;]*\bleads\b/i.test(mig), `${MIG}: create table … leads`);
const checkClause = mig.match(/check\s*\(\s*status\s+in\s*\(([^)]*)\)/i)?.[1] ?? "";
const allowed = [...checkClause.matchAll(/'([^']*)'/g)].map((m) => m[1]);
check(JSON.stringify([...allowed].sort()) === JSON.stringify([...STATUSES].sort()),
  `${MIG}: status limited to exactly ${STATUSES.join(", ")} (found: ${allowed.join(", ") || "no check clause"})`);

const ids = [...new Set(seed.match(/'lead_\d{4}'/g) ?? [])].map((s) => s.slice(1, -1)).sort();
check(ids.length === 20 && ids[0] === "lead_0001" && ids[19] === "lead_0020", `${SEED}: 20 distinct ids lead_0001–lead_0020 (found ${ids.length})`);
// each lead's tuple: from its id literal to the next id literal
const missing = [];
for (const l of leads) {
  const at = seed.indexOf(`'${l.id}'`);
  const next = seed.slice(at + 1).search(/'lead_\d{4}'/);
  const tuple = next < 0 ? seed.slice(at) : seed.slice(at, at + 1 + next);
  for (const k of ["fullName", "company", "email", "source", "status", "message"]) if (!tuple.includes(sql(l[k]))) missing.push(`${l.id}.${k}`);
  if (l.budget === null ? !/\bnull\b/i.test(tuple) : !new RegExp(`\\b${l.budget}\\b`).test(tuple)) missing.push(`${l.id}.budget`);
  if (!tuple.includes(l.createdAt.slice(0, 19))) missing.push(`${l.id}.createdAt`);
}
check(missing.length === 0, `${SEED}: every field of every lead equals materials/leads.json${missing.length ? ` — differs: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? " …" : ""}` : ""}`);
check(!/password|postgres:\/\/|service_role|sbp_|eyJhbGci/i.test(mig + seed), "no secrets or connection strings in the SQL");
console.log(fails ? `RESULT: ${fails} FAIL` : "RESULT: all PASS");
process.exit(fails ? 1 : 0);
