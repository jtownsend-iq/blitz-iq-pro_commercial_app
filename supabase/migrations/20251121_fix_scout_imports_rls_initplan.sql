-- Fix RLS initplan warnings on public.scout_imports by using SELECT-wrapped auth.uid() via is_team_member
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
do $$
begin
  if exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'scout_imports'
  ) then
    drop policy if exists "Team members can select scout_imports for their teams" on public.scout_imports;
    create policy "Team members can select scout_imports for their teams"
      on public.scout_imports
      for select
      using (public.is_team_member(team_id));

    drop policy if exists "Team members can insert scout_imports for their teams" on public.scout_imports;
    create policy "Team members can insert scout_imports for their teams"
      on public.scout_imports
      for insert
      with check (public.is_team_member(team_id));

    drop policy if exists "Team members can update scout_imports for their teams" on public.scout_imports;
    create policy "Team members can update scout_imports for their teams"
      on public.scout_imports
      for update
      using (public.is_team_member(team_id))
      with check (public.is_team_member(team_id));
  end if;
end
$$;
