-- Fix RLS initplan warning: wrap auth.uid() in a SELECT to avoid per-row re-evaluation
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
do $$
begin
  drop policy if exists "Users can select their own profile" on public.users;
  create policy "Users can select their own profile"
    on public.users
    for select
    using (id = (select auth.uid()));

  drop policy if exists "Users can update their own profile" on public.users;
  create policy "Users can update their own profile"
    on public.users
    for update
    using (id = (select auth.uid()))
    with check (id = (select auth.uid()));
end
$$;
