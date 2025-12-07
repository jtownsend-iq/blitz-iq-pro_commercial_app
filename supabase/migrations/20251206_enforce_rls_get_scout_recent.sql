-- Normalize tags to lowercase for consistent comparisons and indexing
create or replace function public.lower_text_array(input text[])
returns text[]
language sql
immutable
as $$
  select coalesce(array_agg(lower(t)), '{}'::text[])
  from unnest(coalesce(input, '{}'::text[])) as t;
$$;

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
declare
  v_limit int := least(greatest(coalesce(p_limit, 25), 1), 200);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_tag_logic text := upper(coalesce(p_tag_logic, 'OR'));
  v_tags text[] := case when p_tags is null then null else public.lower_text_array(p_tags) end;
  v_hash text := lower(nullif(p_hash, ''));
  v_field_bucket text := upper(nullif(p_field_bucket, ''));
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
      v_hash is null
      or lower(coalesce(sp.hash, '')) = v_hash
    )
    and (
      v_field_bucket is null
      or (
        case v_field_bucket
          when 'RZ' then sp.field_position >= 80
          when 'BACKED_UP' then sp.field_position <= 20
          when 'MIDFIELD' then sp.field_position between 21 and 79
          else true
        end
      )
    )
    and (
      v_tags is null
      or cardinality(v_tags) = 0
      or (
        case when v_tag_logic = 'AND'
          then public.lower_text_array(sp.tags) @> v_tags
          else public.lower_text_array(sp.tags) && v_tags
        end
      )
    )
  order by sp.created_at desc, sp.id desc
  limit v_limit
  offset v_offset;
end;
$$;

-- Indexes to support get_scout_recent filters and ordering without full scans
create index if not exists scout_plays_team_opponent_season_created_idx
  on public.scout_plays(team_id, opponent_name, season, created_at desc, id desc);

create index if not exists scout_plays_team_hash_lower_idx
  on public.scout_plays(team_id, lower(hash));

create index if not exists scout_plays_tags_lower_gin
  on public.scout_plays using gin (public.lower_text_array(tags));
