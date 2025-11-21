-- Scout core schema: imports, plays, reports with RLS and performance indexes.

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'scout_import_status') then
    create type public.scout_import_status as enum ('pending', 'failed', 'completed');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'offense_defense') then
    create type public.offense_defense as enum ('OFFENSE', 'DEFENSE');
  end if;
end
$$;

-- Imports table to track CSV/manual ingest
create table if not exists public.scout_imports (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  opponent_name text not null,
  season text,
  source text not null default 'csv',
  status public.scout_import_status not null default 'pending',
  original_filename text,
  file_hash text,
  error_log jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id),
  created_at timestamptz not null default timezone('utc', now())
);

-- Backfill column if table pre-existed without season
alter table public.scout_imports
  add column if not exists season text,
  add column if not exists file_hash text,
  add column if not exists original_filename text,
  add column if not exists error_log jsonb not null default '{}'::jsonb;

-- Uniqueness via index (IF NOT EXISTS) to avoid failures on legacy schemas
create unique index if not exists scout_imports_team_opp_season_hash_idx
  on public.scout_imports(team_id, opponent_name, season, file_hash);

create index if not exists scout_imports_team_status_idx on public.scout_imports(team_id, status);
create index if not exists scout_imports_team_opponent_idx on public.scout_imports(team_id, opponent_name, season);

-- Plays table with opponent scouting rows
create table if not exists public.scout_plays (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  opponent_name text not null,
  season text,
  game_id uuid references public.games(id) on delete set null,
  import_id uuid references public.scout_imports(id) on delete set null,
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
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.scout_plays
  add column if not exists season text,
  add column if not exists formation text,
  add column if not exists personnel text,
  add column if not exists front text,
  add column if not exists coverage text,
  add column if not exists pressure text,
  add column if not exists play_family text,
  add column if not exists result text,
  add column if not exists gained_yards smallint,
  add column if not exists explosive boolean not null default false,
  add column if not exists turnover boolean not null default false,
  add column if not exists import_id uuid references public.scout_imports(id) on delete set null,
  add column if not exists tags text[] not null default '{}'::text[];

create index if not exists scout_plays_team_opponent_idx on public.scout_plays(team_id, opponent_name, season);
create index if not exists scout_plays_team_situation_idx on public.scout_plays(team_id, down, distance);
create index if not exists scout_plays_tags_idx on public.scout_plays using gin (tags);
create index if not exists scout_plays_import_idx on public.scout_plays(import_id);

-- Reports table to store aggregated insights
create table if not exists public.scout_reports (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  opponent_name text not null,
  season text,
  notes text,
  insights jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.scout_reports
  add column if not exists season text;

create index if not exists scout_reports_team_opponent_idx on public.scout_reports(team_id, opponent_name, season);

-- RLS enablement
alter table public.scout_imports enable row level security;
alter table public.scout_plays enable row level security;
alter table public.scout_reports enable row level security;

-- RLS policies with SELECT-wrapped auth.uid()
do $policies$
begin
  -- scout_imports
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'scout_imports' and policyname = 'team members manage scout imports'
  ) then
    create policy "team members manage scout imports"
      on public.scout_imports
      using (
        exists (
          select 1 from public.team_members tm
          where tm.team_id = public.scout_imports.team_id
            and tm.user_id = (select auth.uid())
        )
      )
      with check (
        exists (
          select 1 from public.team_members tm
          where tm.team_id = public.scout_imports.team_id
            and tm.user_id = (select auth.uid())
        )
      );
  end if;

  -- scout_plays
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'scout_plays' and policyname = 'team members manage scout plays'
  ) then
    create policy "team members manage scout plays"
      on public.scout_plays
      using (
        exists (
          select 1 from public.team_members tm
          where tm.team_id = public.scout_plays.team_id
            and tm.user_id = (select auth.uid())
        )
      )
      with check (
        exists (
          select 1 from public.team_members tm
          where tm.team_id = public.scout_plays.team_id
            and tm.user_id = (select auth.uid())
        )
      );
  end if;

  -- scout_reports
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'scout_reports' and policyname = 'team members manage scout reports'
  ) then
    create policy "team members manage scout reports"
      on public.scout_reports
      using (
        exists (
          select 1 from public.team_members tm
          where tm.team_id = public.scout_reports.team_id
            and tm.user_id = (select auth.uid())
        )
      )
      with check (
        exists (
          select 1 from public.team_members tm
          where tm.team_id = public.scout_reports.team_id
            and tm.user_id = (select auth.uid())
        )
      );
  end if;
end
$policies$;
