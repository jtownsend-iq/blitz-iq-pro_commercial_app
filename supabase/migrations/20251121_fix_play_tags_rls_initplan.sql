-- Fix RLS initplan warning on public.play_tags by using SELECT-wrapped auth.uid() via is_team_member
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
do $$
begin
  if exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'play_tags'
  ) then
    drop policy if exists "Team members can select play_tags for their teams" on public.play_tags;
    create policy "Team members can select play_tags for their teams"
      on public.play_tags
      for select
      using (public.is_team_member(team_id));

    drop policy if exists "Team members can insert play_tags for their teams" on public.play_tags;
    create policy "Team members can insert play_tags for their teams"
      on public.play_tags
      for insert
      with check (public.is_team_member(team_id));

    drop policy if exists "Team members can update play_tags for their teams" on public.play_tags;
    create policy "Team members can update play_tags for their teams"
      on public.play_tags
      for update
      using (public.is_team_member(team_id))
      with check (public.is_team_member(team_id));
  end if;
end
$$;
