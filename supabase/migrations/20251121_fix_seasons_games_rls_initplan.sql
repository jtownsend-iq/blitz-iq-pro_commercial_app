-- Fix RLS initplan warnings on seasons (update) and games (select) by using SELECT-wrapped auth.uid() via is_team_member
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
do $$
begin
  -- Seasons update policy
  drop policy if exists "Team members can update seasons for their teams" on public.seasons;
  create policy "Team members can update seasons for their teams"
    on public.seasons
    for update
    using (public.is_team_member(team_id))
    with check (public.is_team_member(team_id));

  -- Games select policy
  drop policy if exists "Team members can select games for their teams" on public.games;
  create policy "Team members can select games for their teams"
    on public.games
    for select
    using (public.is_team_member(team_id));

  -- Games insert policy
  drop policy if exists "Team members can insert games for their teams" on public.games;
  create policy "Team members can insert games for their teams"
    on public.games
    for insert
    with check (public.is_team_member(team_id));

  -- Games update policy
  drop policy if exists "Team members can update games for their teams" on public.games;
  create policy "Team members can update games for their teams"
    on public.games
    for update
    using (public.is_team_member(team_id))
    with check (public.is_team_member(team_id));
end
$$;
