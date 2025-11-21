alter table if exists public.team_invites enable row level security;

do $policy$
begin
  if not exists (
    select 1
    from pg_policies
    where tablename = 'team_invites'
      and policyname = 'team members manage invites'
  ) then
    create policy "team members manage invites"
      on public.team_invites
      using (public.is_team_member(team_id))
      with check (public.is_team_member(team_id));
  end if;
end
$policy$;
