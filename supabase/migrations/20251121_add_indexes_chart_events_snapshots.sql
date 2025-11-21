-- Add covering indexes for foreign keys on chart_events.supersedes_event_id and chart_snapshots.game_id
do $$
begin
  -- chart_events.supersedes_event_id
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'chart_events'
      and indexname = 'chart_events_supersedes_event_id_idx'
  ) then
    create index chart_events_supersedes_event_id_idx
      on public.chart_events(supersedes_event_id);
  end if;

  -- chart_snapshots.game_id
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'chart_snapshots'
      and indexname = 'chart_snapshots_game_id_idx'
  ) then
    create index chart_snapshots_game_id_idx
      on public.chart_snapshots(game_id);
  end if;
end
$$;
