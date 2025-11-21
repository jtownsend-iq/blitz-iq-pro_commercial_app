-- Fix RLS initplan warnings by wrapping auth.uid() in a SELECT to avoid per-row re-evaluation
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
do $$
begin
  -- Recreate policy for team_members to avoid per-row auth.uid() evaluation
  drop policy if exists "Users can see their own team memberships" on public.team_members;
  create policy "Users can see their own team memberships"
    on public.team_members
    for select
    using (user_id = (select auth.uid()));

  -- Recreate policy for teams so membership checks use stable auth.uid() reference
  drop policy if exists "Team members can select their teams" on public.teams;
  create policy "Team members can select their teams"
    on public.teams
    for select
    using (
      exists (
        select 1
        from public.team_members tm
        where tm.team_id = public.teams.id
          and tm.user_id = (select auth.uid())
      )
    );
end
$$;

-- Align is_team_member helper with the same pattern to keep planners efficient
create or replace function public.is_team_member(target_team uuid)
returns boolean
set search_path = public
language sql
stable
as $fn$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = target_team
      and tm.user_id = (select auth.uid())
  );
$fn$;
