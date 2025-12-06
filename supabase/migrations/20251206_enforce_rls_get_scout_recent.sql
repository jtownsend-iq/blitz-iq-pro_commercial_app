-- Enforce membership inside RPC to avoid accidental bypass via parameters
create or replace function public.get_scout_recent(
  p_team uuid,
  p_opponent text,
  p_season text,
  p_limit int default 25,
  p_offset int default 0,
  p_tags text[] default null,
  p_tag_logic text default 'OR',
  p_hash text default null,
  p_field_bucket text default null
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
language plpgsql
stable
security invoker
as $$
begin
  if not public.is_team_member(p_team) then
    raise exception 'RLS: not a member of this team' using errcode = '42501';
  end if;

  return query
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
    and (
      p_hash is null
      or lower(coalesce(sp.hash, '')) = lower(p_hash)
    )
    and (
      p_field_bucket is null
      or p_field_bucket = ''
      or (
        case upper(p_field_bucket)
          when 'RZ' then sp.field_position >= 80
          when 'BACKED_UP' then sp.field_position <= 20
          when 'MIDFIELD' then sp.field_position between 21 and 79
          else true
        end
      )
    )
    and (
      p_tags is null
      or cardinality(p_tags) = 0
      or (
        case when upper(coalesce(p_tag_logic, 'OR')) = 'AND'
          then array(
            select lower(t)
            from unnest(coalesce(sp.tags, '{}')) t
          ) @> array(
            select lower(t) from unnest(p_tags) t
          )
          else exists (
            select 1
            from unnest(p_tags) t
            where lower(t) = any(array(select lower(x) from unnest(coalesce(sp.tags, '{}')) x))
          )
        end
      )
    )
  order by sp.created_at desc, sp.id desc
  limit greatest(p_limit, 0)
  offset greatest(p_offset, 0);
end;
$$;
