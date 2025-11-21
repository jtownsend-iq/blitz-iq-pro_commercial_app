-- Fix RLS initplan warning on public.player_evaluations by using SELECT-wrapped auth.uid() via is_team_member
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
do $$
begin
  if exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'player_evaluations'
  ) then
    drop policy if exists "Team members can select player_evaluations for their teams" on public.player_evaluations;
    create policy "Team members can select player_evaluations for their teams"
      on public.player_evaluations
      for select
      using (public.is_team_member(team_id));

    drop policy if exists "Team members can insert player_evaluations for their teams" on public.player_evaluations;
    create policy "Team members can insert player_evaluations for their teams"
      on public.player_evaluations
      for insert
      with check (public.is_team_member(team_id));

    drop policy if exists "Team members can update player_evaluations for their teams" on public.player_evaluations;
    create policy "Team members can update player_evaluations for their teams"
      on public.player_evaluations
      for update
      using (public.is_team_member(team_id))
      with check (public.is_team_member(team_id));
  end if;
end
$$;
