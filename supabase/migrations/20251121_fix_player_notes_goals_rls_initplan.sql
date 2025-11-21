-- Recreate player_notes and player_goals policies with SELECT-wrapped auth.uid() to satisfy initplan lint
do $$
begin
  -- player_notes
  drop policy if exists "team members manage player notes" on public.player_notes;
  create policy "team members manage player notes"
    on public.player_notes
    using (
      exists (
        select 1
        from public.team_members tm
        where tm.team_id = public.player_notes.team_id
          and tm.user_id = (select auth.uid())
      )
    )
    with check (
      exists (
        select 1
        from public.team_members tm
        where tm.team_id = public.player_notes.team_id
          and tm.user_id = (select auth.uid())
      )
    );

  -- player_goals
  drop policy if exists "team members manage player goals" on public.player_goals;
  create policy "team members manage player goals"
    on public.player_goals
    using (
      exists (
        select 1
        from public.team_members tm
        where tm.team_id = public.player_goals.team_id
          and tm.user_id = (select auth.uid())
      )
    )
    with check (
      exists (
        select 1
        from public.team_members tm
        where tm.team_id = public.player_goals.team_id
          and tm.user_id = (select auth.uid())
      )
    );
end
$$;
