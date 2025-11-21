-- Add covering indexes for chart_snapshots.game_session_id and games.season_id to satisfy unindexed_foreign_keys lint
do $$
begin
  -- chart_snapshots.game_session_id
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'chart_snapshots'
      and indexname = 'chart_snapshots_game_session_id_idx'
  ) then
    create index chart_snapshots_game_session_id_idx
      on public.chart_snapshots(game_session_id);
  end if;

  -- games.season_id
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'games'
      and indexname = 'games_season_id_idx'
  ) then
    create index games_season_id_idx
      on public.games(season_id);
  end if;
end
$$;
