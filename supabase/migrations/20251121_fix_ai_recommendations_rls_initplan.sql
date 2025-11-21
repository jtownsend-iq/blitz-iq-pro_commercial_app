-- Fix RLS initplan warnings on public.ai_recommendations by using SELECT-wrapped auth.uid() via is_team_member
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
do $$
begin
  if exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'ai_recommendations'
  ) then
    drop policy if exists "Team members can select ai_recommendations for their teams" on public.ai_recommendations;
    create policy "Team members can select ai_recommendations for their teams"
      on public.ai_recommendations
      for select
      using (public.is_team_member(team_id));

    drop policy if exists "Team members can insert ai_recommendations for their teams" on public.ai_recommendations;
    create policy "Team members can insert ai_recommendations for their teams"
      on public.ai_recommendations
      for insert
      with check (public.is_team_member(team_id));

    drop policy if exists "Team members can update ai_recommendations for their teams" on public.ai_recommendations;
    create policy "Team members can update ai_recommendations for their teams"
      on public.ai_recommendations
      for update
      using (public.is_team_member(team_id))
      with check (public.is_team_member(team_id));
  end if;
end
$$;
