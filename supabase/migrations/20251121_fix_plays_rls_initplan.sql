-- Fix RLS initplan warnings on public.plays by using SELECT-wrapped auth.uid() via is_team_member
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
do $$
begin
  drop policy if exists "Team members can select plays for their teams" on public.plays;
  create policy "Team members can select plays for their teams"
    on public.plays
    for select
    using (public.is_team_member(team_id));

  drop policy if exists "Team members can insert plays for their teams" on public.plays;
  create policy "Team members can insert plays for their teams"
    on public.plays
    for insert
    with check (public.is_team_member(team_id));

  drop policy if exists "Team members can update plays for their teams" on public.plays;
  create policy "Team members can update plays for their teams"
    on public.plays
    for update
    using (public.is_team_member(team_id))
    with check (public.is_team_member(team_id));
end
$$;
