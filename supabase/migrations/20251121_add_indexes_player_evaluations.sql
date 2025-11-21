-- Add covering indexes for player_evaluations.evaluator_user_id and player_evaluations.game_id
do $$
begin
  -- evaluator_user_id
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'player_evaluations'
      and indexname = 'player_evaluations_evaluator_user_id_idx'
  ) then
    create index player_evaluations_evaluator_user_id_idx
      on public.player_evaluations(evaluator_user_id);
  end if;

  -- game_id
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'player_evaluations'
      and indexname = 'player_evaluations_game_id_idx'
  ) then
    create index player_evaluations_game_id_idx
      on public.player_evaluations(game_id);
  end if;

  -- player_id
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'player_evaluations'
      and indexname = 'player_evaluations_player_id_idx'
  ) then
    create index player_evaluations_player_id_idx
      on public.player_evaluations(player_id);
  end if;
end
$$;
