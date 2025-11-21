-- Add covering index for scout_imports.imported_by_user_id to satisfy unindexed_foreign_keys lint
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'scout_imports'
      and indexname = 'scout_imports_imported_by_user_id_idx'
  ) then
    create index scout_imports_imported_by_user_id_idx
      on public.scout_imports(imported_by_user_id);
  end if;
end
$$;
