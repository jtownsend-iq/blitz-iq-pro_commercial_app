-- Fix RLS initplan warning on public.scout_reports by using SELECT-wrapped auth.uid() via is_team_member
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
do $$
begin
  if exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'scout_reports'
  ) then
    drop policy if exists "Team members can select scout_reports for their teams" on public.scout_reports;
    create policy "Team members can select scout_reports for their teams"
      on public.scout_reports
      for select
      using (public.is_team_member(team_id));

    drop policy if exists "Team members can insert scout_reports for their teams" on public.scout_reports;
    create policy "Team members can insert scout_reports for their teams"
      on public.scout_reports
      for insert
      with check (public.is_team_member(team_id));

    drop policy if exists "Team members can update scout_reports for their teams" on public.scout_reports;
    create policy "Team members can update scout_reports for their teams"
      on public.scout_reports
      for update
      using (public.is_team_member(team_id))
      with check (public.is_team_member(team_id));
  end if;
end
$$;
