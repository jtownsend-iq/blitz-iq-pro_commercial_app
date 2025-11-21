-- Add covering indexes for user_settings.default_team_id and users.active_team_id to satisfy unindexed_foreign_keys lint
do $$
begin
  -- user_settings.default_team_id
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'user_settings'
      and indexname = 'user_settings_default_team_id_idx'
  ) then
    create index user_settings_default_team_id_idx
      on public.user_settings(default_team_id);
  end if;

  -- users.active_team_id
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'users'
      and indexname = 'users_active_team_id_idx'
  ) then
    create index users_active_team_id_idx
      on public.users(active_team_id);
  end if;
end
$$;
