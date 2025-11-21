-- Extend charting taxonomy to support per-team defaults and thresholds.

-- Add optional unit + context to chart_tags for richer grouping.
alter table if exists public.chart_tags
  add column if not exists unit public.chart_unit,
  add column if not exists context text;

create index if not exists chart_tags_team_category_unit_idx
  on public.chart_tags(team_id, unit, category, sort_order);

-- Store per-team explosive/success thresholds (optionally per unit).
create table if not exists public.charting_defaults (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  unit public.chart_unit,
  explosive_run_threshold smallint not null default 12,
  explosive_pass_threshold smallint not null default 18,
  success_1st_yards smallint not null default 4,
  success_2nd_pct smallint not null default 70,
  success_3rd_pct smallint not null default 60,
  success_4th_pct smallint not null default 60,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Uniqueness: one row per team/unit; allow a single NULL (no-unit) row via partial index.
create unique index if not exists charting_defaults_team_unit_idx
  on public.charting_defaults(team_id, unit)
  where unit is not null;

create unique index if not exists charting_defaults_team_null_unit_idx
  on public.charting_defaults(team_id)
  where unit is null;

create or replace function public.set_charting_defaults_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_charting_defaults_updated_at on public.charting_defaults;
create trigger trg_charting_defaults_updated_at
before update on public.charting_defaults
for each row execute function public.set_charting_defaults_updated_at();

-- RLS: team members may manage their thresholds.
alter table if exists public.charting_defaults enable row level security;

do $policy$
begin
  if not exists (
    select 1
    from pg_policies
    where tablename = 'charting_defaults'
      and policyname = 'team members manage charting defaults'
  ) then
    create policy "team members manage charting defaults"
      on public.charting_defaults
      using (public.is_team_member(team_id))
      with check (public.is_team_member(team_id));
  end if;
end
$policy$;
