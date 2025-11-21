-- Add covering index for chart_events.game_id to satisfy unindexed_foreign_keys lint
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'chart_events'
      and indexname = 'chart_events_game_id_idx'
  ) then
    create index chart_events_game_id_idx
      on public.chart_events(game_id);
  end if;
end
$$;
