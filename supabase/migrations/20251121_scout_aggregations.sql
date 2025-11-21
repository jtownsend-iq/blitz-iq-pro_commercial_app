-- Aggregation RPCs for scouting tendencies and recent plays (RLS-friendly, security invoker).

create or replace function public.get_scout_tendencies(
  p_team uuid,
  p_opponent text,
  p_season text,
  p_phase public.offense_defense default null
)
returns table (
  formation text,
  personnel text,
  play_family text,
  down_bucket text,
  distance_bucket text,
  hash text,
  samples integer,
  explosive_rate numeric,
  turnover_rate numeric,
  avg_gain numeric
)
language sql
stable
security invoker
as $$
  select
    sp.formation,
    sp.personnel,
    sp.play_family,
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
    count(*)::int as samples,
    avg(case when sp.explosive then 1 else 0 end)::numeric as explosive_rate,
    avg(case when sp.turnover then 1 else 0 end)::numeric as turnover_rate,
    avg(coalesce(sp.gained_yards, 0))::numeric as avg_gain
  from public.scout_plays sp
  where sp.team_id = p_team
    and sp.opponent_name = p_opponent
    and coalesce(sp.season, '') = coalesce(p_season, '')
    and (p_phase is null or sp.phase = p_phase)
  group by 1,2,3,4,5,6
  order by samples desc nulls last, avg_gain desc;
$$;

create or replace function public.get_scout_recent(
  p_team uuid,
  p_opponent text,
  p_season text,
  p_limit int default 25,
  p_offset int default 0
)
returns table (
  id uuid,
  created_at timestamptz,
  phase public.offense_defense,
  down smallint,
  distance smallint,
  hash text,
  field_position smallint,
  quarter smallint,
  time_remaining_seconds int,
  formation text,
  personnel text,
  play_family text,
  result text,
  gained_yards smallint,
  explosive boolean,
  turnover boolean,
  tags text[]
)
language sql
stable
security invoker
as $$
  select
    sp.id,
    sp.created_at,
    sp.phase,
    sp.down,
    sp.distance,
    sp.hash,
    sp.field_position,
    sp.quarter,
    sp.time_remaining_seconds,
    sp.formation,
    sp.personnel,
    sp.play_family,
    sp.result,
    sp.gained_yards,
    sp.explosive,
    sp.turnover,
    sp.tags
  from public.scout_plays sp
  where sp.team_id = p_team
    and sp.opponent_name = p_opponent
    and coalesce(sp.season, '') = coalesce(p_season, '')
  order by sp.created_at desc, sp.id desc
  limit greatest(p_limit, 0)
  offset greatest(p_offset, 0);
$$;
