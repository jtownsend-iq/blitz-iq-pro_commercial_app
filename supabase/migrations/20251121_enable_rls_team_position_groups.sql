alter table if exists public.team_position_groups enable row level security;

do $policy$
begin
  if not exists (
    select 1
    from pg_policies
    where tablename = 'team_position_groups'
      and policyname = 'team members manage position groups'
  ) then
    create policy "team members manage position groups"
      on public.team_position_groups
      using (public.is_team_member(team_id))
      with check (public.is_team_member(team_id));
  end if;
end
$policy$;
