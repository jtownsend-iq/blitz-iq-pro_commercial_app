-- Maintenance: purge old staging rows and optionally cron it

-- Function to purge staging rows older than 30 days
create or replace function public.purge_old_scout_staging(p_days int default 30)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.scout_import_rows
  where created_at < (timezone('utc', now()) - make_interval(days => p_days));
$$;

-- Schedule daily purge at 03:15 UTC if pg_cron is available
do $$
begin
  if exists (select 1 from pg_catalog.pg_namespace where nspname = 'cron') then
    perform cron.schedule('purge-scout-staging-daily', '15 3 * * *', 'select public.purge_old_scout_staging();');
  end if;
end;
$$;
