-- Player enhancements: availability, packages, tagging, notes, goals

-- Enum for player status
do $$
begin
  if not exists (select 1 from pg_type where typname = 'player_status') then
    create type public.player_status as enum ('READY', 'LIMITED', 'OUT', 'QUESTIONABLE');
  end if;
end
$$;

-- Extend players table with status/availability fields
alter table public.players
  add column if not exists status public.player_status not null default 'READY',
  add column if not exists status_reason text,
  add column if not exists return_target_date date,
  add column if not exists pitch_count int check (pitch_count >= 0),
  add column if not exists packages text[] not null default '{}'::text[],
  add column if not exists scout_team boolean not null default false,
  add column if not exists tags text[] not null default '{}'::text[];

-- Helpful index for roster queries
create index if not exists players_team_status_idx
  on public.players(team_id, status, position, class_year);

-- Accelerate package/tag filters
create index if not exists players_packages_idx on public.players using gin (packages);
create index if not exists players_tags_idx on public.players using gin (tags);

-- Notes table for per-player communication
create table if not exists public.player_notes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  author_id uuid references public.users(id),
  body text not null,
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists player_notes_team_player_created_idx
  on public.player_notes(team_id, player_id, created_at desc);

-- Goals table for development plans
create table if not exists public.player_goals (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  owner_id uuid references public.users(id),
  goal text not null,
  status text not null default 'open',
  due_date date,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists player_goals_team_player_due_idx
  on public.player_goals(team_id, player_id, coalesce(due_date, '2099-12-31'::date));

-- Optimize status-based goal queries (status first to support open/closed filtering)
create index if not exists player_goals_team_player_status_idx
  on public.player_goals(team_id, player_id, status, coalesce(due_date, '2099-12-31'::date));

-- RLS: enforce tenant isolation
alter table public.player_notes enable row level security;
alter table public.player_goals enable row level security;

do $policies$
begin
  -- player_notes: team members can read/write notes for their team
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'player_notes' and policyname = 'team members manage player notes'
  ) then
    create policy "team members manage player notes"
      on public.player_notes
      using (
        exists (
          select 1 from public.team_members tm
          where tm.team_id = player_notes.team_id
            and tm.user_id = (select auth.uid())
        )
      )
      with check (
        exists (
          select 1 from public.team_members tm
          where tm.team_id = player_notes.team_id
            and tm.user_id = (select auth.uid())
        )
      );
  end if;

  -- player_goals: team members can read/write goals for their team
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'player_goals' and policyname = 'team members manage player goals'
  ) then
    create policy "team members manage player goals"
      on public.player_goals
      using (
        exists (
          select 1 from public.team_members tm
          where tm.team_id = player_goals.team_id
            and tm.user_id = (select auth.uid())
        )
      )
      with check (
        exists (
          select 1 from public.team_members tm
          where tm.team_id = player_goals.team_id
            and tm.user_id = (select auth.uid())
        )
      );
  end if;
end
$policies$;
