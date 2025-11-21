-- Fix RLS initplan warnings on public.players by using SELECT-wrapped auth.uid() via is_team_member
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
do $$
begin
  if exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'players'
  ) then
    drop policy if exists "Team members can select players for their teams" on public.players;
    create policy "Team members can select players for their teams"
      on public.players
      for select
      using (public.is_team_member(team_id));

    drop policy if exists "Team members can insert players for their teams" on public.players;
    create policy "Team members can insert players for their teams"
      on public.players
      for insert
      with check (public.is_team_member(team_id));

    drop policy if exists "Team members can update players for their teams" on public.players;
    create policy "Team members can update players for their teams"
      on public.players
      for update
      using (public.is_team_member(team_id))
      with check (public.is_team_member(team_id));
  end if;
end
$$;
