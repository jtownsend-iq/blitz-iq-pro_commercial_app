-- Fix RLS initplan warnings on public.seasons by wrapping auth.uid() in SELECT
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
do $$
begin
  drop policy if exists "Team members can select seasons for their teams" on public.seasons;
  create policy "Team members can select seasons for their teams"
    on public.seasons
    for select
    using (public.is_team_member(team_id));

  drop policy if exists "Team members can insert seasons for their teams" on public.seasons;
  create policy "Team members can insert seasons for their teams"
    on public.seasons
    for insert
    with check (public.is_team_member(team_id));
end
$$;
