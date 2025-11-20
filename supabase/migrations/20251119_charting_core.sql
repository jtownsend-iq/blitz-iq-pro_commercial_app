-- Core schema for in-game charting & analytics

-- Reusable enums guarded with DO blocks (CREATE TYPE lacks IF NOT EXISTS)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'chart_unit') then
    create type public.chart_unit as enum (
      'OFFENSE',
      'DEFENSE',
      'SPECIAL_TEAMS'
    );
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'chart_session_status') then
    create type public.chart_session_status as enum (
      'pending',
      'active',
      'closed'
    );
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'chart_tag_category') then
    create type public.chart_tag_category as enum (
      'FORMATION',
      'PERSONNEL',
      'COVERAGE',
      'FRONT',
      'PRESSURE',
      'SITUATION',
      'CUSTOM'
    );
  end if;
end
$$;

-- Sessions tie an analyst to a specific unit for a given game
create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  unit public.chart_unit not null,
  status public.chart_session_status not null default 'pending',
  analyst_user_id uuid references public.users(id),
  started_at timestamptz not null default timezone('utc', now()),
  ended_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists game_sessions_team_game_idx
  on public.game_sessions(team_id, game_id, unit);

create index if not exists game_sessions_analyst_idx
  on public.game_sessions(analyst_user_id, status);

create unique index if not exists game_sessions_unique_active_idx
  on public.game_sessions(game_id, unit)
  where status in ('pending', 'active');

create or replace function public.set_game_sessions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_game_sessions_updated_at on public.game_sessions;
create trigger trg_game_sessions_updated_at
before update on public.game_sessions
for each row execute function public.set_game_sessions_updated_at();

-- Immutable stream of plays/events captured by analysts
create table if not exists public.chart_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  game_session_id uuid not null references public.game_sessions(id) on delete cascade,
  sequence int not null,
  event_timestamp timestamptz not null default timezone('utc', now()),
  quarter smallint,
  clock_seconds int,
  ball_on text,
  hash_mark text,
  down smallint,
  distance smallint,
  drive_number int,
  possession text,
  opponent text,
  offensive_personnel text,
  defensive_personnel text,
  formation text,
  front text,
  coverage text,
  pressure text,
  play_call text,
  result text,
  gained_yards smallint,
  explosive boolean default false,
  turnover boolean default false,
  notes text,
  supersedes_event_id uuid references public.chart_events(id),
  created_by uuid references public.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (game_session_id, sequence)
);

create index if not exists chart_events_session_idx
  on public.chart_events(game_session_id, sequence);

create index if not exists chart_events_team_game_idx
  on public.chart_events(team_id, game_id, quarter, drive_number);

create index if not exists chart_events_created_by_idx
  on public.chart_events(created_by);

create or replace function public.set_chart_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_chart_events_updated_at on public.chart_events;
create trigger trg_chart_events_updated_at
before update on public.chart_events
for each row execute function public.set_chart_events_updated_at();

-- Tenant-specific taxonomy (formations, personnel, etc.)
create table if not exists public.chart_tags (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  label text not null,
  category public.chart_tag_category not null default 'CUSTOM',
  description text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(team_id, category, label)
);

create index if not exists chart_tags_team_category_idx
  on public.chart_tags(team_id, category, sort_order);

create or replace function public.set_chart_tags_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_chart_tags_updated_at on public.chart_tags;
create trigger trg_chart_tags_updated_at
before update on public.chart_tags
for each row execute function public.set_chart_tags_updated_at();

-- Many-to-many event tags
create table if not exists public.chart_event_tags (
  chart_event_id uuid not null references public.chart_events(id) on delete cascade,
  tag_id uuid not null references public.chart_tags(id) on delete cascade,
  primary key (chart_event_id, tag_id)
);

create index if not exists chart_event_tags_tag_idx
  on public.chart_event_tags(tag_id);

-- Aggregated drive / situation snapshots fueling AI + dashboards
create table if not exists public.chart_snapshots (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  game_session_id uuid references public.game_sessions(id) on delete cascade,
  drive_number int,
  situation jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default timezone('utc', now())
);

create index if not exists chart_snapshots_team_game_idx
  on public.chart_snapshots(team_id, game_id, drive_number);

-- Row Level Security
alter table public.game_sessions enable row level security;
alter table public.chart_events enable row level security;
alter table public.chart_tags enable row level security;
alter table public.chart_event_tags enable row level security;
alter table public.chart_snapshots enable row level security;

-- Quickstart progress per team
create table if not exists public.quickstart_progress (
  team_id uuid primary key references public.teams(id) on delete cascade,
  seeded_position_groups boolean not null default false,
  seeded_tags boolean not null default false,
  seeded_schedule boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_quickstart_progress_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_quickstart_progress_updated_at on public.quickstart_progress;
create trigger trg_quickstart_progress_updated_at
before update on public.quickstart_progress
for each row execute function public.set_quickstart_progress_updated_at();

alter table public.quickstart_progress enable row level security;

-- Audit log
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  action text not null,
  actor_user_id uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_logs_team_idx on public.audit_logs(team_id, created_at);
alter table public.audit_logs enable row level security;

-- Helpers to check membership by team
create or replace function public.is_team_member(target_team uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = target_team
      and tm.user_id = auth.uid()
  );
$$;

-- RLS policies for quickstart progress: team members can manage
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where tablename = 'quickstart_progress'
      and policyname = 'team members manage quickstart'
  ) then
    create policy "team members manage quickstart"
      on public.quickstart_progress
      using (public.is_team_member(team_id))
      with check (public.is_team_member(team_id));
  end if;

  if not exists (
    select 1
    from pg_policies
    where tablename = 'audit_logs'
      and policyname = 'team members read audit logs'
  ) then
    create policy "team members read audit logs"
      on public.audit_logs
      for select
      using (public.is_team_member(team_id));
  end if;
end
$$;

-- Policies: team members can read/write their own data
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where tablename = 'game_sessions'
      and policyname = 'team members manage game sessions'
  ) then
    create policy "team members manage game sessions"
      on public.game_sessions
      using (public.is_team_member(team_id))
      with check (public.is_team_member(team_id));
  end if;

  if not exists (
    select 1
    from pg_policies
    where tablename = 'chart_events'
      and policyname = 'team members manage chart events'
  ) then
    create policy "team members manage chart events"
      on public.chart_events
      using (public.is_team_member(team_id))
      with check (public.is_team_member(team_id));
  end if;

  if not exists (
    select 1
    from pg_policies
    where tablename = 'chart_tags'
      and policyname = 'team members manage chart tags'
  ) then
    create policy "team members manage chart tags"
      on public.chart_tags
      using (public.is_team_member(team_id))
      with check (public.is_team_member(team_id));
  end if;

  if not exists (
    select 1
    from pg_policies
    where tablename = 'chart_event_tags'
      and policyname = 'team members manage chart event tags'
  ) then
    create policy "team members manage chart event tags"
      on public.chart_event_tags
      using (
        public.is_team_member(
          (select team_id from public.chart_events ce where ce.id = chart_event_tags.chart_event_id)
        )
      )
      with check (
        public.is_team_member(
          (select team_id from public.chart_events ce where ce.id = chart_event_tags.chart_event_id)
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where tablename = 'chart_snapshots'
      and policyname = 'team members read chart snapshots'
  ) then
    create policy "team members read chart snapshots"
      on public.chart_snapshots
      for select
      using (public.is_team_member(team_id));
  end if;
end
$$;
