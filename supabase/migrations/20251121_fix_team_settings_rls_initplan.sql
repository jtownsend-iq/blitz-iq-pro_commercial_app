-- Fix RLS initplan warning on public.team_settings by using SELECT-wrapped auth.uid() via is_team_member
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
do $$
begin
  if exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'team_settings'
  ) then
    drop policy if exists "Team members can select team_settings" on public.team_settings;
    create policy "Team members can select team_settings"
      on public.team_settings
      for select
      using (public.is_team_member(team_id));

    drop policy if exists "Team members can insert team_settings" on public.team_settings;
    create policy "Team members can insert team_settings"
      on public.team_settings
      for insert
      with check (public.is_team_member(team_id));

    drop policy if exists "Team members can update team_settings" on public.team_settings;
    create policy "Team members can update team_settings"
      on public.team_settings
      for update
      using (public.is_team_member(team_id))
      with check (public.is_team_member(team_id));
  end if;
end
$$;
