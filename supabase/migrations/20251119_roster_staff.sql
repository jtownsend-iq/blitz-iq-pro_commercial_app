-- Roster table for players tied to a tenant/team
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  jersey_number text,
  position text,
  unit text,
  class_year int,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists players_team_id_idx on public.players(team_id);

create or replace function public.set_players_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_players_updated_at on public.players;
create trigger trg_players_updated_at
before update on public.players
for each row execute function public.set_players_updated_at();

-- Team position groups allow tenants to customize roster groupings
create table if not exists public.team_position_groups (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  group_name text not null,
  units text[] not null default '{}',
  sort_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(team_id, group_name)
);

create index if not exists team_position_groups_team_id_idx
  on public.team_position_groups(team_id, sort_order);

create or replace function public.set_team_position_groups_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_team_position_groups_updated_at on public.team_position_groups;
create trigger trg_team_position_groups_updated_at
before update on public.team_position_groups
for each row execute function public.set_team_position_groups_updated_at();

-- Pending staff invites with simple token-based tracking
create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  role text not null default 'ANALYST',
  invited_by uuid references public.users(id),
  status text not null default 'pending',
  token text not null,
  expires_at timestamptz not null default timezone('utc', now()) + interval '7 days',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists team_invites_team_id_idx on public.team_invites(team_id);
create unique index if not exists team_invites_unique_pending_idx
  on public.team_invites(team_id, email)
  where status = 'pending';

create or replace function public.set_team_invites_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_team_invites_updated_at on public.team_invites;
create trigger trg_team_invites_updated_at
before update on public.team_invites
for each row execute function public.set_team_invites_updated_at();
