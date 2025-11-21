-- Normalize function search_path to avoid definer context bleed.
create or replace function public.set_quickstart_progress_updated_at()
returns trigger
set search_path = public
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create or replace function public.set_users_updated_at()
returns trigger
set search_path = public
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create or replace function public.set_players_updated_at()
returns trigger
set search_path = public
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create or replace function public.set_team_position_groups_updated_at()
returns trigger
set search_path = public
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create or replace function public.set_team_invites_updated_at()
returns trigger
set search_path = public
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create or replace function public.set_game_sessions_updated_at()
returns trigger
set search_path = public
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create or replace function public.set_chart_events_updated_at()
returns trigger
set search_path = public
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create or replace function public.set_chart_tags_updated_at()
returns trigger
set search_path = public
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create or replace function public.set_charting_defaults_updated_at()
returns trigger
set search_path = public
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create or replace function public.is_team_member(target_team uuid)
returns boolean
set search_path = public
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

-- Generic updated_at helper for shared tables (if present elsewhere)
create or replace function public.set_updated_at()
returns trigger
set search_path = public
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;
