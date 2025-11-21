-- Fix RLS initplan warnings on public.user_settings by using SELECT-wrapped auth.uid()
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
do $$
begin
  if exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'user_settings'
  ) then
    drop policy if exists "Users can select their own settings" on public.user_settings;
    create policy "Users can select their own settings"
      on public.user_settings
      for select
      using (user_id = (select auth.uid()));

    drop policy if exists "Users can insert their own settings" on public.user_settings;
    create policy "Users can insert their own settings"
      on public.user_settings
      for insert
      with check (user_id = (select auth.uid()));

    drop policy if exists "Users can update their own settings" on public.user_settings;
    create policy "Users can update their own settings"
      on public.user_settings
      for update
      using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()));
  end if;
end
$$;
