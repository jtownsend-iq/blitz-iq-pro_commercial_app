-- Fix RLS initplan warnings on public.play_participants by using SELECT-wrapped auth.uid() via is_team_member
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
do $$
begin
  if exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'play_participants'
  ) then
    drop policy if exists "Team members can select play_participants for their teams" on public.play_participants;
    create policy "Team members can select play_participants for their teams"
      on public.play_participants
      for select
      using (public.is_team_member(team_id));

    drop policy if exists "Team members can insert play_participants for their teams" on public.play_participants;
    create policy "Team members can insert play_participants for their teams"
      on public.play_participants
      for insert
      with check (public.is_team_member(team_id));

    drop policy if exists "Team members can update play_participants for their teams" on public.play_participants;
    create policy "Team members can update play_participants for their teams"
      on public.play_participants
      for update
      using (public.is_team_member(team_id))
      with check (public.is_team_member(team_id));
  end if;
end
$$;
