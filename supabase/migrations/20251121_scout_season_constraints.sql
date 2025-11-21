-- Tighten season requirements and add helper to refresh all tendencies for a team

-- Backfill null/empty season values to 'unspecified' to enable NOT NULL constraints
update public.scout_imports set season = 'unspecified' where season is null or season = '';
update public.scout_plays set season = 'unspecified' where season is null or season = '';
update public.scout_reports set season = 'unspecified' where season is null or season = '';
update public.scout_tendencies_mv set season = 'unspecified' where season is null or season = '';

-- Length guard on season and NOT NULL (idempotent)
alter table public.scout_imports
  alter column season set not null;

alter table public.scout_plays
  alter column season set not null;

alter table public.scout_reports
  alter column season set not null;

alter table public.scout_tendencies_mv
  alter column season set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'scout_imports_season_len'
  ) then
    alter table public.scout_imports
      add constraint scout_imports_season_len check (char_length(season) between 1 and 32);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'scout_plays_season_len'
  ) then
    alter table public.scout_plays
      add constraint scout_plays_season_len check (char_length(season) between 1 and 32);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'scout_reports_season_len'
  ) then
    alter table public.scout_reports
      add constraint scout_reports_season_len check (char_length(season) between 1 and 32);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'scout_tendencies_mv_season_len'
  ) then
    alter table public.scout_tendencies_mv
      add constraint scout_tendencies_mv_season_len check (char_length(season) between 1 and 32);
  end if;
end;
$$;

-- Helper to refresh all tendencies for a team (distinct opponent/season)
create or replace function public.refresh_all_scout_tendencies(p_team uuid)
returns void
language plpgsql
security invoker
as $$
begin
  perform public.refresh_scout_tendencies(p_team, opponent_name, season)
  from (
    select distinct opponent_name, season
    from public.scout_plays
    where team_id = p_team
  ) t;
end;
$$;
