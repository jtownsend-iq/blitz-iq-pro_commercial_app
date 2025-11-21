-- Add covering indexes for play_participants.player_id and play_tags.tag_id to satisfy unindexed_foreign_keys lint
do $$
begin
  -- play_participants.player_id
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'play_participants'
      and indexname = 'play_participants_player_id_idx'
  ) then
    create index play_participants_player_id_idx
      on public.play_participants(player_id);
  end if;

  -- play_tags.tag_id
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'play_tags'
      and indexname = 'play_tags_tag_id_idx'
  ) then
    create index play_tags_tag_id_idx
      on public.play_tags(tag_id);
  end if;
end
$$;
