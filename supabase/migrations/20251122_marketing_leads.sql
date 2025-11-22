-- Marketing leads captured from landing page
create table if not exists public.marketing_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  school text not null,
  state text not null,
  classification text not null,
  region text not null,
  email text not null,
  plan text not null,
  intent text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists marketing_leads_plan_idx on public.marketing_leads(plan);
create index if not exists marketing_leads_intent_idx on public.marketing_leads(intent);
