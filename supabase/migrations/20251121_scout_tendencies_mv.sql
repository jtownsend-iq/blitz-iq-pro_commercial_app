-- Precomputed tendencies table + refresh function for performance

create table if not exists public.scout_tendencies_mv (
  team_id uuid not null references public.teams(id) on delete cascade,
  opponent_name text not null,
  season text,
  phase public.offense_defense not null,
  down_bucket text not null,
  distance_bucket text not null,
  hash text,
  formation text,
  personnel text,
  play_family text,
  samples integer not null,
  explosive_rate numeric not null,
  turnover_rate numeric not null,
  avg_gain numeric not null,
  season_key text generated always as (coalesce(season, '')) stored,
  hash_key text generated always as (coalesce(hash, '')) stored,
  formation_key text generated always as (coalesce(formation, '')) stored,
  personnel_key text generated always as (coalesce(personnel, '')) stored,
  play_family_key text generated always as (coalesce(play_family, '')) stored,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (team_id, opponent_name, season_key, phase, down_bucket, distance_bucket, hash_key, formation_key, personnel_key, play_family_key)
);

create index if not exists scout_tendencies_mv_team_idx on public.scout_tendencies_mv(team_id, opponent_name, season, phase);

alter table public.scout_tendencies_mv enable row level security;

do $policies$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'scout_tendencies_mv' and policyname = 'team members access scout tendencies mv'
  ) then
    create policy "team members access scout tendencies mv"
      on public.scout_tendencies_mv
      using (
        exists (
          select 1 from public.team_members tm
          where tm.team_id = public.scout_tendencies_mv.team_id
            and tm.user_id = (select auth.uid())
        )
      );
  end if;
end
$policies$;

-- Refresh function (service role or authorized callers)
create or replace function public.refresh_scout_tendencies(p_team uuid, p_opponent text, p_season text)
returns void
language sql
security invoker
as $$
  delete from public.scout_tendencies_mv
  where team_id = p_team
    and opponent_name = p_opponent
    and coalesce(season, '') = coalesce(p_season, '');

  insert into public.scout_tendencies_mv (
    team_id, opponent_name, season, phase, down_bucket, distance_bucket, hash, formation, personnel, play_family,
    samples, explosive_rate, turnover_rate, avg_gain, updated_at
  )
  select
    sp.team_id,
    sp.opponent_name,
    sp.season,
    sp.phase,
    case
      when sp.down = 1 then '1st'
      when sp.down = 2 then '2nd'
      when sp.down = 3 then '3rd'
      when sp.down = 4 then '4th'
      else 'unknown'
    end as down_bucket,
    case
      when sp.distance is null then 'unknown'
      when sp.distance <= 2 then 'short'
      when sp.distance <= 6 then 'medium'
      when sp.distance <= 12 then 'long'
      else 'x-long'
    end as distance_bucket,
    coalesce(sp.hash, 'NA') as hash,
    sp.formation,
    sp.personnel,
    sp.play_family,
    count(*)::int as samples,
    avg(case when sp.explosive then 1 else 0 end)::numeric as explosive_rate,
    avg(case when sp.turnover then 1 else 0 end)::numeric as turnover_rate,
    avg(coalesce(sp.gained_yards, 0))::numeric as avg_gain,
    timezone('utc', now()) as updated_at
  from public.scout_plays sp
  where sp.team_id = p_team
    and sp.opponent_name = p_opponent
    and coalesce(sp.season, '') = coalesce(p_season, '')
  group by 1,2,3,4,5,6,7,8,9,10;
$$;
