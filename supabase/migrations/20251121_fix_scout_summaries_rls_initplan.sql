-- Fix RLS initplan warning on public.scout_summaries by using SELECT-wrapped auth.uid() via is_team_member
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
do $$
begin
  if exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'scout_summaries'
  ) then
    drop policy if exists "Team members can select scout_summaries for their teams" on public.scout_summaries;
    create policy "Team members can select scout_summaries for their teams"
      on public.scout_summaries
      for select
      using (public.is_team_member(team_id));

    drop policy if exists "Team members can insert scout_summaries for their teams" on public.scout_summaries;
    create policy "Team members can insert scout_summaries for their teams"
      on public.scout_summaries
      for insert
      with check (public.is_team_member(team_id));

    drop policy if exists "Team members can update scout_summaries for their teams" on public.scout_summaries;
    create policy "Team members can update scout_summaries for their teams"
      on public.scout_summaries
      for update
      using (public.is_team_member(team_id))
      with check (public.is_team_member(team_id));
  end if;
end
$$;
