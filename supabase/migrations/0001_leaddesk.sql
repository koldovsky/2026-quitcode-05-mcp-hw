-- LeadDesk: leads table for Task B / Task C. Fields follow materials/leads.json,
-- statuses and sources follow LEAD_STATUSES and LEAD_SOURCES in lib/types.ts,
-- ids follow leadId() in lib/db.ts (lead_0001).
-- Applied through Supabase MCP apply_migration (approved by hand).

create table public.leads (
  id          text primary key check (id ~ '^lead_\d{4}$'),
  full_name   text not null,
  company     text not null,
  email       text not null,
  source      text not null check (source in ('website', 'google-ads', 'facebook-ads', 'linkedin', 'referral', 'webinar')),
  status      text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'won', 'lost')),
  budget      integer check (budget is null or budget >= 0),
  message     text not null default '',
  created_at  timestamptz not null default now()
);

create index leads_status_created_at_idx on public.leads (status, created_at desc);

-- Same shape as AuditEntry in lib/types.ts: { action, leadId, at }.
create table public.lead_audit (
  id       bigint generated always as identity primary key,
  action   text not null,
  lead_id  text not null references public.leads (id),
  at       timestamptz not null default now()
);

-- No policies: the anon and authenticated roles of the Data API see nothing.
-- The agent works through MCP with developer rights, never through the public API.
alter table public.leads enable row level security;
alter table public.lead_audit enable row level security;
