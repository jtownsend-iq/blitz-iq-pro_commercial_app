-- Add covering indexes for scout_reports.import_id and team_invites.invited_by to satisfy unindexed_foreign_keys lint
do $$
begin
  -- scout_reports.import_id
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'scout_reports'
      and indexname = 'scout_reports_import_id_idx'
  ) then
    create index scout_reports_import_id_idx
      on public.scout_reports(import_id);
  end if;

  -- team_invites.invited_by
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'team_invites'
      and indexname = 'team_invites_invited_by_idx'
  ) then
    create index team_invites_invited_by_idx
      on public.team_invites(invited_by);
  end if;
end
$$;
