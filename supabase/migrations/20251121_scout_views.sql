-- Saved views for scouting filters (per-team, RLS enforced)

create table if not exists public.scout_views (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  opponent_name text,
  season text,
  filters jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.scout_views
  add column if not exists opponent_name text,
  add column if not exists season text,
  add column if not exists filters jsonb not null default '{}'::jsonb,
  add column if not exists created_by uuid references public.users(id),
  add column if not exists created_at timestamptz not null default timezone('utc', now());

create index if not exists scout_views_team_idx on public.scout_views(team_id, name);

alter table public.scout_views enable row level security;

do $policies$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'scout_views' and policyname = 'team members manage scout views'
  ) then
    create policy "team members manage scout views"
      on public.scout_views
      using (
        exists (
          select 1 from public.team_members tm
          where tm.team_id = public.scout_views.team_id
            and tm.user_id = (select auth.uid())
        )
      )
      with check (
        exists (
          select 1 from public.team_members tm
          where tm.team_id = public.scout_views.team_id
            and tm.user_id = (select auth.uid())
        )
      );
  end if;
end
$policies$;
