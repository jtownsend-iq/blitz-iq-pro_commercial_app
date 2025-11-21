-- Add covering index for ai_recommendations.play_id to satisfy unindexed_foreign_keys lint
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'ai_recommendations'
      and indexname = 'ai_recommendations_play_id_idx'
  ) then
    create index ai_recommendations_play_id_idx
      on public.ai_recommendations(play_id);
  end if;
end
$$;
