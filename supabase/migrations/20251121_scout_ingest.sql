-- Scout ingest staging for upload/preview/commit flows (idempotent, RLS-safe).
-- Adds staging table and indexes to support validation and commit.

-- Staging table: holds parsed rows with validation errors before commit
create table if not exists public.scout_import_rows (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  import_id uuid not null references public.scout_imports(id) on delete cascade,
  opponent_name text not null,
  season text,
  phase public.offense_defense not null default 'OFFENSE',
  down smallint,
  distance smallint,
  hash text,
  field_position smallint,
  quarter smallint,
  time_remaining_seconds int,
  formation text,
  personnel text,
  front text,
  coverage text,
  pressure text,
  play_family text,
  result text,
  gained_yards smallint,
  explosive boolean not null default false,
  turnover boolean not null default false,
  tags text[] not null default '{}'::text[],
  raw_row jsonb not null default '{}'::jsonb,
  errors text[] not null default '{}'::text[],
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.scout_import_rows
  add column if not exists season text,
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists raw_row jsonb not null default '{}'::jsonb,
  add column if not exists errors text[] not null default '{}'::text[];

create index if not exists scout_import_rows_import_idx on public.scout_import_rows(import_id);
create index if not exists scout_import_rows_team_idx on public.scout_import_rows(team_id, opponent_name, season);
create index if not exists scout_import_rows_errors_idx on public.scout_import_rows using gin (errors);

-- RLS enablement
alter table public.scout_import_rows enable row level security;

-- RLS policy with SELECT-wrapped auth.uid()
do $policies$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'scout_import_rows' and policyname = 'team members manage scout import rows'
  ) then
    create policy "team members manage scout import rows"
      on public.scout_import_rows
      using (
        exists (
          select 1 from public.team_members tm
          where tm.team_id = public.scout_import_rows.team_id
            and tm.user_id = (select auth.uid())
        )
      )
      with check (
        exists (
          select 1 from public.team_members tm
          where tm.team_id = public.scout_import_rows.team_id
            and tm.user_id = (select auth.uid())
        )
      );
  end if;
end
$policies$;
