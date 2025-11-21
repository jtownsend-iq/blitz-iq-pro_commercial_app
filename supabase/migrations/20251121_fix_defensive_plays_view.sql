-- Ensure views use caller rights (security invoker) to honor RLS/policies.
do $$
begin
  if exists (
    select 1
    from pg_views
    where schemaname = 'public'
      and viewname = 'defensive_plays'
  ) then
    -- Postgres 15+ supports security_invoker on views.
    execute 'alter view public.defensive_plays set (security_invoker = true)';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_views
    where schemaname = 'public'
      and viewname = 'user_teams'
  ) then
    execute 'alter view public.user_teams set (security_invoker = true)';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_views
    where schemaname = 'public'
      and viewname = 'offensive_plays'
  ) then
    execute 'alter view public.offensive_plays set (security_invoker = true)';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_views
    where schemaname = 'public'
      and viewname = 'player_dev_summary'
  ) then
    execute 'alter view public.player_dev_summary set (security_invoker = true)';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_views
    where schemaname = 'public'
      and viewname = 'scout_opponent_index'
  ) then
    execute 'alter view public.scout_opponent_index set (security_invoker = true)';
  end if;
end
$$;
