-- Add covering indexes for scout_plays.import_id and scout_reports.generated_by_user_id to satisfy unindexed_foreign_keys lint
do $$
begin
  -- scout_plays.import_id
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'scout_plays'
      and indexname = 'scout_plays_import_id_idx'
  ) then
    create index scout_plays_import_id_idx
      on public.scout_plays(import_id);
  end if;

  -- scout_reports.generated_by_user_id
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'scout_reports'
      and indexname = 'scout_reports_generated_by_user_id_idx'
  ) then
    create index scout_reports_generated_by_user_id_idx
      on public.scout_reports(generated_by_user_id);
  end if;
end
$$;
