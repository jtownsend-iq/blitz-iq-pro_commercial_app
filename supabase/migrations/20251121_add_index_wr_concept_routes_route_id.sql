-- Add covering index for wr_concept_routes.route_id to satisfy unindexed_foreign_keys lint
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'wr_concept_routes'
      and indexname = 'wr_concept_routes_route_id_idx'
  ) then
    create index wr_concept_routes_route_id_idx
      on public.wr_concept_routes(route_id);
  end if;
end
$$;
