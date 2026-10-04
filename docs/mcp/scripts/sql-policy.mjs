#!/usr/bin/env node
// SQL part of the `supabase-build` policy of approval-host.mjs: what a careful human approves in the
// Task B step (create the leads table, seed it, read it back) — as an ALLOWLIST, not a list of bad words.
//   node docs/mcp/scripts/sql-policy.mjs --self-test     cases below, incl. the attacks from the PR review
// Each verdict is [approve: boolean, reason].

// string literals and comments removed, so keywords inside data neither block nor hide anything
const strip = (q) => q.replace(/'(?:[^']|'')*'/g, "''").replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
const statements = (q) => strip(q).split(";").map((s) => s.trim()).filter(Boolean);
const LEADS = String.raw`(?:public\.)?leads\b`;
const WRITES = /\b(insert|update|delete|merge|truncate|drop|alter|create|grant|revoke|copy|call|do|execute|set|reset|lock|vacuum|comment|security|lo_import|pg_read\w*|dblink\w*)\b/i;

// migration: only the statements the leads table needs, one by one
const MIGRATION_OK = [
  new RegExp(String.raw`^create\s+table\s+(?:if\s+not\s+exists\s+)?${LEADS}\s*\(`, "i"),
  new RegExp(String.raw`^create\s+index\s+(?:if\s+not\s+exists\s+)?\w+\s+on\s+${LEADS}\s*\(`, "i"),
  new RegExp(String.raw`^alter\s+table\s+${LEADS}\s+enable\s+row\s+level\s+security$`, "i"),
  new RegExp(String.raw`^comment\s+on\s+(?:table\s+${LEADS}|column\s+${LEADS}\.\w+)\s+is\s+''$`, "i"),
];
export function migrationVerdict(query) {
  const st = statements(query ?? "");
  if (!st.length) return [false, "empty migration"];
  const bad = st.find((s) => !MIGRATION_OK.some((re) => re.test(s)));
  return bad ? [false, `not part of the leads table DDL: «${bad.slice(0, 60)}»`] : [true, "leads table DDL only: create table / index / enable RLS / comment"];
}

// execute_sql: exactly one statement — a plain insert into leads (no upsert) or a read without any write
export function executeSqlVerdict(query) {
  const st = statements(query ?? "");
  if (st.length !== 1) return [false, "one statement per call"];
  const s = st[0];
  if (new RegExp(String.raw`^insert\s+into\s+${LEADS}`, "i").test(s)) {
    if (/\bon\s+conflict\b/i.test(s)) return [false, "upsert (on conflict) is not approved in this step"];
    const rest = s.replace(new RegExp(String.raw`^insert\s+into\s+${LEADS}`, "i"), "");
    return WRITES.test(rest) ? [false, "insert carries another statement or a write"] : [true, "plain insert into leads"];
  }
  if (/^(select|with)\b/i.test(s)) {
    // a data-modifying CTE (with x as (update … returning …) select …) is a write behind a read prefix
    return WRITES.test(s) ? [false, "read prefix, but the query writes or changes the schema"] : [true, "read-only select"];
  }
  return [false, "only insert into leads and select are approved in this step"];
}

if (process.argv.includes("--self-test")) {
  const mig = (await import("node:fs")).readFileSync(new URL("../../../supabase/migrations/0001_leaddesk.sql", import.meta.url), "utf8");
  const seed = (await import("node:fs")).readFileSync(new URL("../../../supabase/seed/leads.sql", import.meta.url), "utf8");
  const CASES = [
    ["migration", mig, true, "the committed migration"],
    ["migration", "alter table public.leads disable row level security", false, "review: RLS off"],
    ["migration", "create table public.leads (id text); alter table public.other enable row level security", false, "second table"],
    ["migration", "create table public.leads (id text); drop table public.users", false, "drop after allowed DDL"],
    ["migration", "create function f() returns int language sql security definer as 'select 1'", false, "security definer function"],
    ["sql", seed, true, "the committed seed (one insert, ';' and keywords inside messages)"],
    ["sql", "select count(*) from public.leads", true, "count"],
    ["sql", "with s as (select status from leads) select count(*) from s", true, "read-only CTE"],
    ["sql", "with x as (update public.leads as l set status = 'won' returning l.id) select * from x", false, "review: data-modifying CTE"],
    ["sql", "with x as (insert into public.audit values (1) returning *) select * from x", false, "review: CTE insert into another table"],
    ["sql", "insert into leads (id) values ('a') on conflict (id) do update set status = 'won'", false, "review: upsert"],
    ["sql", "insert into leads (id) values ('a'); delete from leads", false, "second statement"],
    ["sql", "insert into leads (id) values ('x; drop table leads')", true, "';' inside a string literal"],
    ["sql", "update public.leads set status = 'lost' where id = 'lead_0003'", false, "plain update"],
    ["sql", "delete from leads", false, "delete"],
    ["sql", "select pg_read_file('/etc/passwd')", false, "file read function"],
  ];
  let ok = true;
  for (const [kind, q, want, what] of CASES) {
    const [got, why] = kind === "migration" ? migrationVerdict(q) : executeSqlVerdict(q);
    ok &&= got === want;
    console.log(`${got === want ? "OK  " : "FAIL"} ${kind} · ${what}: ${got ? "approve" : "refuse"} (${why})`);
  }
  console.log(ok ? `RESULT: ${CASES.length}/${CASES.length} cases as expected` : "RESULT: a case FAILED");
  process.exit(ok ? 0 : 1);
}
