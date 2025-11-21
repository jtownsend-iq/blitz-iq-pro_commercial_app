-- Optional scheduled refresh for scout tendencies (uses refresh_all_scout_tendencies)
-- Creates a SECURITY DEFINER helper to refresh all teams with scouting data.
-- If pg_cron is available, schedules a nightly job; otherwise no-op.

create or replace function public.refresh_scout_tendencies_all_teams()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
begin
  for rec in
    select distinct team_id
    from public.scout_plays
  loop
    perform public.refresh_all_scout_tendencies(rec.team_id);
  end loop;
end;
$$;

-- Schedule nightly at 03:30 UTC if pg_cron is installed
do $$
begin
  if exists (select 1 from pg_catalog.pg_namespace where nspname = 'cron') then
    perform cron.schedule('refresh-scout-tendencies-nightly', '30 3 * * *', 'select public.refresh_scout_tendencies_all_teams();');
  end if;
end;
$$;
