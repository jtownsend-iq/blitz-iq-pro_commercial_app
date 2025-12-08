
import {
  AdvancedAnalytics,
  BaseCounts,
  BoxScoreMetrics,
  BoundaryFlags,
  ChartUnit,
  CoreWinningMetrics,
  DefensiveContext,
  DistanceBucket,
  DriveRecord,
  DriveResultBreakdown,
  DriveResultType,
  ExplosiveMetrics,
  FieldZone,
  GameMetricSnapshot,
  OffensivePlayFilter,
  OffensiveContext,
  ConversionSummary,
  PassingEfficiency,
  PassingLine,
  PlayEvent,
  PlayFamily,
  PossessionMetrics,
  RedZoneSummary,
  RushingEfficiency,
  RushingLine,
  ScoreState,
  ScoringEvent,
  ScoringSummary,
  SeasonAggregate,
  SeasonProjection,
  SuccessSummary,
  SpecialTeamsContext,
  TimeoutState,
  TurnoverBucketCounts,
  TurnoverEvent,
  TurnoverSummary,
  YardsPerPlaySummary,
} from './types'

type ChartEventRowLike = Partial<PlayEvent> & {
  id: string
  team_id?: string
  game_id?: string
  opponent?: string | null
  has_motion?: boolean | null
  has_shift?: boolean | null
  is_play_action?: boolean | null
  is_shot_play?: boolean | null
  team_score_before?: number | null
  team_score_after?: number | null
  opponent_score_before?: number | null
  opponent_score_after?: number | null
  timeouts_team?: number | null
  timeouts_opponent?: number | null
  scoring_points?: number | null
  scoring_type?: string | null
  scoring_team_side?: 'TEAM' | 'OPPONENT' | null
  turnover_type?: string | null
}

const QUARTER_LENGTH_SECONDS = 900
// Decide once and apply everywhere: turnovers on downs are counted as giveaways (and therefore affect margin).
// This aligns turnover margin with possession changes, even when the defense did not directly force the stop.
const COUNT_TURNOVER_ON_DOWNS = true

export function yardLineFromBallOn(ball_on: string | null): number {
  if (!ball_on) return 50
  const num = Number(ball_on.replace(/[^0-9]/g, ''))
  if (Number.isNaN(num)) return 50
  const upper = ball_on.toUpperCase()
  if (upper.startsWith('O')) return num
  if (upper.startsWith('D') || upper.startsWith('X')) return 100 - num
  return num
}

export function absoluteClockSeconds(quarter?: number | null, clock_seconds?: number | null): number | null {
  if (quarter == null || clock_seconds == null) return null
  return (quarter - 1) * QUARTER_LENGTH_SECONDS + (QUARTER_LENGTH_SECONDS - clock_seconds)
}

export function fieldZone(yardLine: number | null): FieldZone | null {
  if (yardLine == null) return null
  if (yardLine <= 10) return 'BACKED_UP'
  if (yardLine <= 25) return 'COMING_OUT'
  if (yardLine >= 80) return 'RED_ZONE'
  if (yardLine >= 60) return 'SCORING_RANGE'
  return 'OPEN_FIELD'
}

export function bucketDownDistance(down?: number | null, distance?: number | null) {
  if (!down || !distance) return 'any down'
  if (distance <= 2) return `short ${ordinal(down)}`
  if (distance <= 6) return `medium ${ordinal(down)}`
  return `long ${ordinal(down)}`
}

export function distanceBucket(distance?: number | null): DistanceBucket | null {
  if (distance == null) return null
  if (distance <= 2) return 'SHORT'
  if (distance <= 6) return 'MEDIUM'
  return 'LONG'
}

function ordinal(n: number) {
  const suffix = ['th', 'st', 'nd', 'rd'][((n + 90) % 100 - 10) % 10] || 'th'
  return `${n}${suffix}`
}

export function isSuccessfulPlay(ev: PlayEvent) {
  if (ev.down == null || ev.distance == null || ev.gained_yards == null) return false
  if (ev.down === 1) return ev.gained_yards >= ev.distance * 0.4
  if (ev.down === 2) return ev.gained_yards >= ev.distance * 0.6
  return ev.gained_yards >= ev.distance
}

export function isExplosivePlay(ev: PlayEvent) {
  const yards = ev.gained_yards ?? 0
  const family = ev.play_family ?? (ev.st_play_type ? 'SPECIAL_TEAMS' : null)
  if (family === 'PASS') return yards >= 20
  if (family === 'SPECIAL_TEAMS') return yards >= 30
  // Runs (and run-first RPOs) are explosive at 12+ yards; this is the authoritative threshold for the app.
  return yards >= 12
}

function resolvePlaySide(ev: PlayEvent, unitHint?: ChartUnit): ChartUnit {
  if (ev.play_family === 'SPECIAL_TEAMS' || ev.possession === 'SPECIAL_TEAMS') return 'SPECIAL_TEAMS'
  if (ev.possession === 'OFFENSE' || ev.possession === 'DEFENSE') return ev.possession as ChartUnit
  if (ev.possession_team_id && ev.team_id) {
    return ev.possession_team_id === ev.team_id ? 'OFFENSE' : 'DEFENSE'
  }
  return unitHint ?? 'OFFENSE'
}

function isTouchdownEvent(scoring: ScoringEvent | null | undefined): boolean {
  if (!scoring) return false
  return scoring.type === 'TD' || scoring.type === 'DEF_TD' || scoring.type === 'ST_TD' || scoring.points >= 6
}

function isRedZoneSnap(ev: PlayEvent): boolean {
  const fieldPos =
    ev.field_position ??
    (typeof ev.ball_on === 'string' ? 100 - yardLineFromBallOn(ev.ball_on) : null)
  return fieldPos != null && fieldPos <= 20
}

function emptyTurnoverBuckets(): TurnoverBucketCounts {
  return { interceptions: 0, fumbles: 0, downs: 0, blockedKicks: 0, other: 0 }
}

function incrementTurnoverBucket(bucket: TurnoverBucketCounts, ev: TurnoverEvent) {
  switch (ev.type) {
    case 'INTERCEPTION':
      bucket.interceptions += 1
      break
    case 'FUMBLE':
      bucket.fumbles += 1
      break
    case 'DOWNS':
      bucket.downs += 1
      break
    case 'BLOCKED_KICK':
      bucket.blockedKicks += 1
      break
    default:
      bucket.other += 1
  }
}

function shouldCountTurnover(ev: TurnoverEvent | null): ev is TurnoverEvent {
  if (!ev) return false
  if (!COUNT_TURNOVER_ON_DOWNS && ev.type === 'DOWNS') return false
  return true
}

function normalizeFieldZone(ev: PlayEvent): FieldZone | null {
  if (ev.field_zone) return ev.field_zone
  if (typeof ev.field_position === 'number') return fieldZone(ev.field_position)
  if (typeof ev.ball_on === 'string') return fieldZone(yardLineFromBallOn(ev.ball_on))
  return null
}

function asArrayFilter<T>(value?: T | T[] | null): T[] | null {
  if (value == null) return null
  return Array.isArray(value) ? value : [value]
}

function matchesSelection<T>(value: T | null | undefined, filter?: T | T[] | null): boolean {
  const set = asArrayFilter(filter)
  if (!set) return true
  return value != null ? set.includes(value) : false
}

export function filterOffensivePlays(events: PlayEvent[], unitHint?: ChartUnit, filters?: OffensivePlayFilter): PlayEvent[] {
  return events.filter((ev) => {
    const side = resolvePlaySide(ev, unitHint)
    if (side !== 'OFFENSE') return false
    if (ev.play_family === 'SPECIAL_TEAMS') return false

    if (filters?.down && !matchesSelection(ev.down, filters.down)) return false
    if (filters?.distanceBucket) {
      const bucket = distanceBucket(ev.distance)
      if (!matchesSelection(bucket, filters.distanceBucket)) return false
    }
    if (filters?.fieldZone && !matchesSelection(normalizeFieldZone(ev), filters.fieldZone)) return false
    if (
      filters?.personnelCode &&
      !matchesSelection(ev.offensive_personnel_code ?? ev.offensive_context?.personnel_code ?? null, filters.personnelCode)
    )
      return false
    if (
      filters?.formationId &&
      !matchesSelection(ev.offensive_formation_id ?? ev.offensive_context?.formation_id ?? null, filters.formationId)
    )
      return false
    if (filters?.playFamily && !matchesSelection(ev.play_family, filters.playFamily)) return false
    if (filters?.runConceptId && !matchesSelection(ev.run_concept_id ?? ev.run_concept ?? null, filters.runConceptId))
      return false
    if (filters?.passConceptId && !matchesSelection(ev.pass_concept_id ?? ev.pass_concept ?? null, filters.passConceptId))
      return false
    if (
      filters?.playAction != null &&
      (ev.play_action ?? ev.offensive_context?.play_action ?? null) !== filters.playAction
    )
      return false

    return true
  })
}

function filterEventsForUnit(events: PlayEvent[], unitHint?: ChartUnit): PlayEvent[] {
  if (!unitHint) return events
  if (unitHint === 'OFFENSE') return filterOffensivePlays(events, unitHint)
  if (unitHint === 'DEFENSE') return events.filter((ev) => resolvePlaySide(ev, unitHint) === 'DEFENSE')
  return events.filter((ev) => resolvePlaySide(ev, unitHint) === unitHint)
}

export function sumYards(list: PlayEvent[]) {
  return list.reduce((sum, ev) => sum + (ev.gained_yards ?? 0), 0)
}
function deriveScoreState(row: ChartEventRowLike, phase: 'before' | 'after'): ScoreState | null {
  const team = (phase === 'before' ? row.team_score_before : row.team_score_after) ??
    (phase === 'before' ? row.offense_score_before : row.offense_score_after)
  const opponent =
    (phase === 'before' ? row.opponent_score_before : row.opponent_score_after) ??
    (phase === 'before' ? row.defense_score_before : row.defense_score_after)
  if (team == null && opponent == null) return null
  return {
    team: typeof team === 'number' ? team : null,
    opponent: typeof opponent === 'number' ? opponent : null,
  }
}

function deriveTimeouts(row: ChartEventRowLike): TimeoutState | null {
  const offense = row.offense_timeouts ?? row.timeouts_team ?? null
  const defense = row.defense_timeouts ?? row.timeouts_opponent ?? null
  if (offense == null && defense == null) return null
  return {
    team: offense,
    opponent: defense,
    offense,
    defense,
  }
}

function normalizeBoundaryFlags(row: ChartEventRowLike): BoundaryFlags {
  return {
    is_drive_start: row.is_drive_start ?? false,
    is_drive_end: row.is_drive_end ?? false,
    is_half_start: row.is_half_start ?? false,
    is_half_end: row.is_half_end ?? false,
    is_game_start: row.is_game_start ?? false,
    is_game_end: row.is_game_end ?? false,
  }
}

function buildOffensiveContext(row: ChartEventRowLike): OffensiveContext | null {
  const context: OffensiveContext = {
    personnel_code:
      ((row as Record<string, unknown>).offensive_personnel as string | null) ??
      row.offensive_personnel_code ??
      null,
    formation_id: row.offensive_formation_id ?? null,
    backfield_code: row.backfield_code ?? null,
    qb_alignment: row.qb_alignment ?? null,
    play_family: row.play_family ?? null,
    run_concept: row.run_concept ?? null,
    run_concept_id: row.run_concept_id ?? null,
    pass_concept: row.pass_concept ?? null,
    pass_concept_id: row.pass_concept_id ?? null,
    motion: row.motion ?? row.has_motion ?? null,
    shift: row.shift ?? row.has_shift ?? null,
    play_action: row.play_action ?? row.is_play_action ?? null,
    shot: row.shot ?? row.is_shot_play ?? null,
    tempo_tag: row.tempo_tag ?? null,
    hash_preference: row.hash_preference ?? row.hash_mark ?? null,
  }
  return Object.values(context).some((value) => value !== undefined && value !== null) ? context : null
}

function buildDefensiveContext(row: ChartEventRowLike): DefensiveContext | null {
  const context: DefensiveContext = {
    front_code: row.front_code ?? null,
    defensive_structure_id: row.defensive_structure_id ?? null,
    coverage_shell_pre: row.coverage_shell_pre ?? null,
    coverage_shell_post: row.coverage_shell_post ?? null,
    pressure_code: row.pressure_code ?? null,
    strength: row.strength ?? null,
    alignment_tags: row.alignment_tags ?? null,
  }
  return Object.values(context).some((value) => value !== undefined && value !== null) ? context : null
}

function buildSpecialTeamsContext(row: ChartEventRowLike): SpecialTeamsContext | null {
  const context: SpecialTeamsContext = {
    play_type: row.st_play_type ?? null,
    variant: row.st_variant ?? null,
    return_yards: row.st_return_yards ?? null,
    unit_on_field: row.play_family === 'SPECIAL_TEAMS' ? row.play_family : null,
  }
  return Object.values(context).some((value) => value !== undefined && value !== null) ? context : null
}
function deriveScoringSide(row: ChartEventRowLike): 'TEAM' | 'OPPONENT' {
  if (row.scoring_team_side) return row.scoring_team_side
  if (row.turnover_detail?.lostBySide === 'OPPONENT') return 'TEAM'
  if (row.turnover_detail?.lostBySide === 'TEAM') return 'OPPONENT'
  if (row.possession_team_id && row.team_id) {
    return row.possession_team_id === row.team_id ? 'TEAM' : 'OPPONENT'
  }
  if (row.possession === 'DEFENSE') return 'OPPONENT'
  return 'TEAM'
}

function deriveCreditedUnit(row: ChartEventRowLike, scoringSide: 'TEAM' | 'OPPONENT'): ChartUnit | null {
  if (row.play_family === 'SPECIAL_TEAMS') return 'SPECIAL_TEAMS'
  if (row.possession === 'DEFENSE' && scoringSide === 'TEAM') return 'DEFENSE'
  if (row.possession === 'DEFENSE' && scoringSide === 'OPPONENT') return 'OFFENSE'
  if (row.possession === 'OFFENSE') return 'OFFENSE'
  if (row.possession === 'SPECIAL_TEAMS') return 'SPECIAL_TEAMS'
  return (row.possession as ChartUnit | null) ?? null
}

function normalizeScoringEvent(row: ChartEventRowLike): ScoringEvent | null {
  const inferredSide = deriveScoringSide(row)
  if (row.scoring) {
    const scoringSide = row.scoring.scoring_team_side ?? row.scoring_team_side ?? inferredSide
    return {
      ...row.scoring,
      scoring_team_side: scoringSide,
      creditedTo: row.scoring.creditedTo ?? deriveCreditedUnit(row, scoringSide),
      points: typeof row.scoring.points === 'number' ? row.scoring.points : 0,
    }
  }

  const points = row.scoring_points
  const type = (row.scoring_type as ScoringEvent['type'] | undefined) ?? null

  if (points != null || type) {
    const scoringSide = row.scoring_team_side ?? inferredSide
    const creditedTo = deriveCreditedUnit(row, scoringSide)
    return {
      team: (row.possession as ChartUnit | null) ?? null,
      scoring_team_id: row.team_id ?? null,
      scoring_team_side: scoringSide,
      points: points ?? 0,
      creditedTo,
      type: (type as ScoringEvent['type']) || 'OTHER',
      returnYards: row.st_return_yards ?? null,
    }
  }

  if (row.result && isScoringPlay(row.result)) {
    const scoringSide = row.scoring_team_side ?? inferredSide
    const creditedTo = deriveCreditedUnit(row, scoringSide)
    return {
      team: (row.possession as ChartUnit | null) ?? null,
      scoring_team_id: row.team_id ?? null,
      scoring_team_side: scoringSide,
      points: derivePointsFromResult(row.result),
      creditedTo,
      type: guessScoringType(row.result),
      returnYards: row.st_return_yards ?? null,
    }
  }

  return null
}

function normalizeTurnoverEvent(row: ChartEventRowLike): TurnoverEvent | null {
  const inferredLostSide: 'TEAM' | 'OPPONENT' | null =
    row.possession_team_id && row.team_id
      ? row.possession_team_id === row.team_id
        ? 'TEAM'
        : 'OPPONENT'
      : row.possession === 'DEFENSE'
      ? 'OPPONENT'
      : row.possession === 'OFFENSE'
      ? 'TEAM'
      : null
  if (row.turnover_detail) {
    const detailType: TurnoverEvent['type'] | null =
      row.turnover_detail.type ??
      (row.turnover_type ? (guessTurnoverType(row.turnover_type) ?? (row.turnover_type as TurnoverEvent['type'])) : null)
    return {
      ...row.turnover_detail,
      lostBy: row.turnover_detail.lostBy ?? (row.possession === 'DEFENSE' ? 'OFFENSE' : (row.possession as ChartUnit | null) ?? null),
      lostBySide: row.turnover_detail.lostBySide ?? inferredLostSide ?? 'TEAM',
      type: detailType,
      turnover_team_id: row.turnover_detail.turnover_team_id ?? row.team_id ?? null,
    }
  }

  const impliedTurnover =
    row.turnover ||
    (row.result ? /intercept|fumble|turnover|downs|pick|lost/i.test(row.result) : false) ||
    false

  if (impliedTurnover) {
    return {
      type: ((row.turnover_type as TurnoverEvent['type']) ?? null) || guessTurnoverType(row.result),
      lostBy: row.possession === 'DEFENSE' ? 'OFFENSE' : (row.possession as ChartUnit | null) ?? null,
      lostBySide: inferredLostSide ?? 'TEAM',
      turnover_team_id: row.team_id ?? null,
      returnYards: null,
      recoveredBy: ((row as Record<string, unknown>).recoveredBy as string | null) ?? null,
      forcedBy: ((row as Record<string, unknown>).forcedBy as string | null) ?? null,
    }
  }

  return null
}

export function mapChartEventToPlayEvent(
  row: ChartEventRowLike,
  defaults?: { teamId?: string; opponent?: string | null }
): PlayEvent {
  const yardLine = yardLineFromBallOn(row.ball_on ?? null)
  const opponentName = row.opponent_name ?? (typeof row.opponent === 'string' ? row.opponent : defaults?.opponent ?? null)
  const scoring = normalizeScoringEvent(row)
  const turnover_detail = normalizeTurnoverEvent(row)
  const offensive_context = buildOffensiveContext(row)
  const defensive_context = buildDefensiveContext(row)
  const special_teams_context = buildSpecialTeamsContext(row)
  const score_before = deriveScoreState(row, 'before')
  const score_after = deriveScoreState(row, 'after')
  const timeouts_before = deriveTimeouts(row)
  const boundaries = normalizeBoundaryFlags(row)
  const play_family = row.play_family ?? (row.st_play_type ? 'SPECIAL_TEAMS' : null)
  const explosive =
    typeof row.explosive === 'boolean'
      ? row.explosive
      : isExplosivePlay({ ...(row as PlayEvent), play_family, gained_yards: row.gained_yards ?? null })

  const normalized: PlayEvent = {
    id: row.id,
    team_id: row.team_id || defaults?.teamId || '',
    opponent_id: row.opponent_id ?? null,
    opponent_name: opponentName,
    game_id: row.game_id || '',
    game_session_id: row.game_session_id ?? null,
    season_id: row.season_id ?? null,
    season_label: row.season_label ?? null,
    possession_team_id: row.possession_team_id ?? null,
    sequence: row.sequence ?? null,
    quarter: row.quarter ?? null,
    clock_seconds: row.clock_seconds ?? null,
    absolute_clock_seconds: absoluteClockSeconds(row.quarter, row.clock_seconds),
    down: row.down ?? null,
    distance: row.distance ?? null,
    ball_on: row.ball_on ?? null,
    ball_spot: row.ball_spot ?? row.ball_on ?? null,
    hash_mark: row.hash_mark ?? null,
    field_position: typeof row.field_position === 'number' ? row.field_position : 100 - yardLine,
    field_zone: fieldZone(yardLine),
    possession: row.possession ?? null,
    score_before,
    score_after,
    offense_score_before: row.offense_score_before ?? null,
    defense_score_before: row.defense_score_before ?? null,
    offense_score_after: row.offense_score_after ?? null,
    defense_score_after: row.defense_score_after ?? null,
    team_score_before: row.team_score_before ?? null,
    opponent_score_before: row.opponent_score_before ?? null,
    team_score_after: row.team_score_after ?? null,
    opponent_score_after: row.opponent_score_after ?? null,
    timeouts_before,
    offense_timeouts: row.offense_timeouts ?? null,
    defense_timeouts: row.defense_timeouts ?? null,
    drive_number: row.drive_number ?? null,
    drive_id: row.drive_id ?? null,
    series_tag: row.series_tag ?? null,
    is_drive_start: row.is_drive_start ?? false,
    is_drive_end: row.is_drive_end ?? false,
    is_half_start: row.is_half_start ?? false,
    is_half_end: row.is_half_end ?? false,
    is_game_start: row.is_game_start ?? false,
    is_game_end: row.is_game_end ?? false,
    boundaries,
    play_call: row.play_call ?? null,
    result: row.result ?? null,
    gained_yards: row.gained_yards ?? null,
    explosive,
    turnover: typeof row.turnover === 'boolean' ? row.turnover : Boolean(turnover_detail),
    first_down: row.first_down ?? null,
    play_family,
    run_concept: row.run_concept ?? null,
    run_concept_id: row.run_concept_id ?? null,
    pass_concept: row.pass_concept ?? null,
    pass_concept_id: row.pass_concept_id ?? null,
    pass_result: row.pass_result ?? null,
    wr_concept_id: row.wr_concept_id ?? null,
    st_play_type: row.st_play_type ?? null,
    st_variant: row.st_variant ?? null,
    st_return_yards: row.st_return_yards ?? null,
    motion: row.motion ?? row.has_motion ?? null,
    shift: row.shift ?? row.has_shift ?? null,
    play_action: row.play_action ?? row.is_play_action ?? null,
    shot: row.shot ?? row.is_shot_play ?? null,
    tempo_tag: row.tempo_tag ?? null,
    hash_preference: row.hash_preference ?? row.hash_mark ?? null,
    offensive_personnel_code: row.offensive_personnel_code ?? null,
    offensive_formation_id: row.offensive_formation_id ?? null,
    backfield_code: row.backfield_code ?? null,
    qb_alignment: row.qb_alignment ?? null,
    offensive_context,
    defensive_structure_id: row.defensive_structure_id ?? null,
    front_code: row.front_code ?? null,
    coverage_shell_pre: row.coverage_shell_pre ?? null,
    coverage_shell_post: row.coverage_shell_post ?? null,
    pressure_code: row.pressure_code ?? null,
    strength: row.strength ?? null,
    alignment_tags: row.alignment_tags ?? null,
    defensive_context,
    special_teams_context,
    scoring,
    turnover_detail,
    penalties: row.penalties ?? [],
    participation: row.participation ?? null,
    tags: row.tags ?? [],
    notes: row.notes ?? null,
    created_at: row.created_at ?? null,
  }

  return normalized
}
export function computeBaseCounts(events: PlayEvent[]): BaseCounts {
  const penalties = events.reduce(
    (acc, ev) => {
      ;(ev.penalties || []).forEach((p) => {
        if (p.occurred) {
          acc.count += 1
          acc.yards += p.yards ?? 0
        }
      })
      return acc
    },
    { count: 0, yards: 0 }
  )

  const drives = new Set<number>()
  const scoringEvents: ScoringEvent[] = []
  const turnoverEvents: TurnoverEvent[] = []
  let pointsFor = 0
  let pointsAllowed = 0

  events.forEach((ev) => {
    if (ev.drive_number != null) drives.add(ev.drive_number)
    const scoring = normalizeScoringEvent(ev)
    if (scoring) {
      scoringEvents.push(scoring)
      if ((scoring.scoring_team_side ?? 'TEAM') === 'TEAM') {
        pointsFor += scoring.points
      } else if (scoring.scoring_team_side === 'OPPONENT') {
        pointsAllowed += scoring.points
      }
    }
    const turnover = normalizeTurnoverEvent(ev)
    if (turnover) {
      turnoverEvents.push(turnover)
    }
  })

  const scoringPlays =
    scoringEvents.length || events.filter((ev) => isScoringPlay(ev.result) || Boolean(ev.scoring)).length

  const base: BaseCounts = {
    plays: events.length,
    totalYards: events.reduce((sum, ev) => sum + (ev.gained_yards ?? 0), 0),
    explosives: events.filter(isExplosivePlay).length,
    scoringPlays,
    turnovers: turnoverEvents.length || events.filter((ev) => ev.turnover).length,
    penalties,
    firstDowns: events.filter((ev) => ev.first_down).length,
    drives: drives.size || (events.length ? 1 : 0),
    pointsFor,
    pointsAllowed,
    scoringEvents,
    turnoverEvents,
  }

  return base
}

function offenseScored(ev: PlayEvent) {
  if (ev.scoring) {
    return (ev.scoring.scoring_team_side ?? 'TEAM') !== 'OPPONENT'
  }
  return isScoringPlay(ev.result)
}

function isSeriesConversion(ev: PlayEvent) {
  const gained = ev.gained_yards
  const distance = ev.distance
  const autoFirstDown = (ev.penalties || []).some((p) => p.occurred && !p.declined && !p.offsetting && p.automaticFirstDown)
  if (ev.first_down) return true
  if (distance != null && gained != null && gained >= distance) return true
  if (offenseScored(ev)) return true
  if (autoFirstDown) return true
  return false
}

export function computeSuccessRate(
  events: PlayEvent[],
  unitHint?: ChartUnit,
  filters?: OffensivePlayFilter
): SuccessSummary {
  const pool =
    unitHint && unitHint !== 'OFFENSE'
      ? filterEventsForUnit(events, unitHint)
      : filterOffensivePlays(events, unitHint, filters)
  const candidates = pool.filter((ev) => ev.down != null && ev.distance != null && ev.gained_yards != null)
  const successes = candidates.filter(isSuccessfulPlay).length
  return {
    plays: candidates.length,
    successes,
    rate: candidates.length ? successes / candidates.length : 0,
  }
}

export function computeYardsPerPlay(
  events: PlayEvent[],
  unitHint?: ChartUnit,
  filters?: OffensivePlayFilter
): YardsPerPlaySummary {
  const pool =
    unitHint && unitHint !== 'OFFENSE'
      ? filterEventsForUnit(events, unitHint)
      : filterOffensivePlays(events, unitHint, filters)
  const yards = pool.reduce((sum, ev) => sum + (ev.gained_yards ?? 0), 0)
  return {
    plays: pool.length,
    yards,
    ypp: pool.length ? yards / pool.length : 0,
  }
}

export function computeConversionRate(
  events: PlayEvent[],
  down: 3 | 4,
  unitHint?: ChartUnit,
  filters?: OffensivePlayFilter
): ConversionSummary {
  const scoped = filterOffensivePlays(events, unitHint, { ...filters, down })
  const conversions = scoped.filter(isSeriesConversion).length
  return {
    attempts: scoped.length,
    conversions,
    rate: scoped.length ? conversions / scoped.length : 0,
  }
}

export function computeThirdDownEfficiency(
  events: PlayEvent[],
  unitHint?: ChartUnit,
  filters?: OffensivePlayFilter
): ConversionSummary {
  return computeConversionRate(events, 3, unitHint, filters)
}

export function computeFourthDownEfficiency(
  events: PlayEvent[],
  unitHint?: ChartUnit,
  filters?: OffensivePlayFilter
): ConversionSummary {
  return computeConversionRate(events, 4, unitHint, filters)
}

export function computeLateDownEfficiency(
  events: PlayEvent[],
  unitHint?: ChartUnit,
  filters?: OffensivePlayFilter
): ConversionSummary {
  const scoped = filterOffensivePlays(events, unitHint, { ...filters, down: [3, 4] })
  const conversions = scoped.filter(isSeriesConversion).length
  return {
    attempts: scoped.length,
    conversions,
    rate: scoped.length ? conversions / scoped.length : 0,
  }
}

export function aggregateConversionSummaries(summaries: ConversionSummary[]): ConversionSummary {
  const attempts = summaries.reduce((sum, s) => sum + s.attempts, 0)
  const conversions = summaries.reduce((sum, s) => sum + s.conversions, 0)
  return {
    attempts,
    conversions,
    rate: attempts ? conversions / attempts : 0,
  }
}

export function computeTurnoverMetrics(
  base: BaseCounts,
  options?: { opponentBase?: BaseCounts; opponentBox?: BoxScoreMetrics; unitHint?: ChartUnit }
): TurnoverSummary {
  const giveawaysByType = emptyTurnoverBuckets()
  const takeawaysByType = emptyTurnoverBuckets()
  const defaultLostSide: 'TEAM' | 'OPPONENT' = options?.unitHint === 'DEFENSE' ? 'OPPONENT' : 'TEAM'
  const countedBase = base.turnoverEvents.filter(shouldCountTurnover)

  const giveaways = countedBase.filter((ev) => (ev.lostBySide ?? defaultLostSide) !== 'OPPONENT')
  giveaways.forEach((ev) => incrementTurnoverBucket(giveawaysByType, ev))

  let giveawaysCount = giveaways.length
  if (giveawaysCount === 0 && base.turnovers > 0) {
    giveawaysCount = base.turnovers
    giveawaysByType.other = base.turnovers
  }

  let takeaways: TurnoverEvent[] = countedBase.filter((ev) => (ev.lostBySide ?? defaultLostSide) === 'OPPONENT')

  if (takeaways.length === 0 && options?.opponentBase) {
    // When we only have opponent events, their giveaways represent our takeaways.
    takeaways = options.opponentBase.turnoverEvents
      .filter(shouldCountTurnover)
      .filter((ev) => (ev.lostBySide ?? 'TEAM') === 'TEAM')
  }

  takeaways.forEach((ev) => incrementTurnoverBucket(takeawaysByType, ev))
  let takeawaysCount = takeaways.length
  if (takeawaysCount === 0 && options?.opponentBox) {
    // Fall back to opponent turnover totals when play-level details are not present.
    takeawaysCount = options.opponentBox.turnovers
    takeawaysByType.other += options.opponentBox.turnovers
  }

  return {
    takeaways: takeawaysCount,
    giveaways: giveawaysCount,
    margin: takeawaysCount - giveawaysCount,
    takeawaysByType,
    giveawaysByType,
    includeTurnoverOnDowns: COUNT_TURNOVER_ON_DOWNS,
  }
}

export function computeBoxScore(events: PlayEvent[], precomputedBase?: BaseCounts, unitHint?: ChartUnit): BoxScoreMetrics {
  const scopedEvents = filterEventsForUnit(events, unitHint)
  const base =
    precomputedBase && (!unitHint || precomputedBase.plays === scopedEvents.length)
      ? precomputedBase
      : computeBaseCounts(scopedEvents)
  const successSummary = computeSuccessRate(scopedEvents, unitHint)
  const thirdDown = computeThirdDownEfficiency(scopedEvents, unitHint)
  const fourthDown = computeFourthDownEfficiency(scopedEvents, unitHint)
  const lateDown = computeLateDownEfficiency(scopedEvents, unitHint)
  const totalYards = scopedEvents.reduce((sum, ev) => sum + (ev.gained_yards ?? 0), 0)
  const explosiveCount = scopedEvents.filter(isExplosivePlay).length
  const redZoneDrives = new Set<number>()
  scopedEvents.forEach((ev) => {
    if (isRedZoneSnap(ev) && ev.drive_number != null) {
      redZoneDrives.add(ev.drive_number)
    }
  })
  const avgStart =
    scopedEvents.length > 0
      ? scopedEvents.reduce((sum, ev) => sum + (ev.field_position ?? yardLineFromBallOn(ev.ball_on)), 0) / scopedEvents.length
      : null

  return {
    plays: scopedEvents.length,
    totalYards,
    yardsPerPlay: scopedEvents.length ? totalYards / scopedEvents.length : 0,
    explosives: explosiveCount,
    explosiveRate: scopedEvents.length ? explosiveCount / scopedEvents.length : 0,
    turnovers: base.turnovers,
    scoringPlays: base.scoringPlays,
    successRate: successSummary.rate,
    thirdDown,
    fourthDown,
    lateDown,
    redZoneTrips: redZoneDrives.size,
    averageStart: avgStart,
    averageDepth: successSummary.plays
      ? scopedEvents
          .filter((ev) => ev.down != null && ev.distance != null && ev.gained_yards != null)
          .reduce((sum, ev) => sum + (ev.distance ?? 0), 0) / successSummary.plays
      : null,
  }
}

export function computeCoreWinningMetrics(box: BoxScoreMetrics, opponentBox?: BoxScoreMetrics): CoreWinningMetrics {
  const explosiveMargin = box.explosives - (opponentBox?.explosives ?? 0)
  const successMargin = box.successRate - (opponentBox?.successRate ?? 0)
  const turnoverMargin = -box.turnovers + (opponentBox?.turnovers ?? 0)

  return {
    pointsPerDrive:
      box.plays && box.lateDown.attempts
        ? (box.scoringPlays * 7 + Math.max(0, box.lateDown.conversions - box.turnovers) * 3) /
          Math.max(box.lateDown.attempts, 1)
        : 0,
    turnoverMargin,
    explosiveMargin,
    successMargin,
    redZoneEfficiency: box.redZoneTrips ? box.scoringPlays / box.redZoneTrips : 0,
  }
}

function buildExplosiveBreakdown(events: PlayEvent[]): ExplosiveMetrics['offense'] {
  const plays = events.length
  const explosives = events.filter(isExplosivePlay).length
  const runPlays = events.filter((ev) => ev.play_family === 'RUN' || ev.play_family === 'RPO')
  const passPlays = events.filter((ev) => ev.play_family === 'PASS')
  const stPlays = events.filter((ev) => ev.play_family === 'SPECIAL_TEAMS')
  const runExplosives = runPlays.filter(isExplosivePlay).length
  const passExplosives = passPlays.filter(isExplosivePlay).length
  const stExplosives = stPlays.filter(isExplosivePlay).length
  return {
    plays,
    explosives,
    rate: plays ? explosives / plays : 0,
    run: { plays: runPlays.length, explosives: runExplosives, rate: runPlays.length ? runExplosives / runPlays.length : 0 },
    pass: { plays: passPlays.length, explosives: passExplosives, rate: passPlays.length ? passExplosives / passPlays.length : 0 },
    specialTeams: { plays: stPlays.length, explosives: stExplosives, rate: stPlays.length ? stExplosives / stPlays.length : 0 },
  }
}

export function computeExplosiveMetrics(events: PlayEvent[], unitHint?: ChartUnit): ExplosiveMetrics {
  const offenseEvents = events.filter((ev) => {
    const side = resolvePlaySide(ev, unitHint)
    return side === 'OFFENSE' || side === 'SPECIAL_TEAMS'
  })
  const defenseEvents = events.filter((ev) => resolvePlaySide(ev, unitHint) === 'DEFENSE')

  return {
    offense: buildExplosiveBreakdown(offenseEvents),
    defense: buildExplosiveBreakdown(defenseEvents),
  }
}

export function computeScoringSummary(base: BaseCounts, gamesPlayed = 1): ScoringSummary {
  const teamTouchdowns = base.scoringEvents.filter(
    (ev) => ev.scoring_team_side !== 'OPPONENT' && isTouchdownEvent(ev)
  )
  const defensiveTds = teamTouchdowns.filter(
    (ev) => ev.creditedTo === 'DEFENSE' || ev.type === 'DEF_TD'
  ).length
  const specialTeamsTds = teamTouchdowns.filter(
    (ev) => ev.creditedTo === 'SPECIAL_TEAMS' || ev.type === 'ST_TD'
  ).length
  const nonOffensiveTotal = defensiveTds + specialTeamsTds
  const tdRate = teamTouchdowns.length ? nonOffensiveTotal / teamTouchdowns.length : 0

  return {
    pointsFor: base.pointsFor,
    pointsAllowed: base.pointsAllowed,
    pointDifferential: base.pointsFor - base.pointsAllowed,
    pointsPerGame: gamesPlayed ? base.pointsFor / gamesPlayed : 0,
    pointsAllowedPerGame: gamesPlayed ? base.pointsAllowed / gamesPlayed : 0,
    nonOffensive: {
      defense: defensiveTds,
      specialTeams: specialTeamsTds,
      total: nonOffensiveTotal,
      rate: tdRate,
    },
  }
}

export function computeRedZoneMetrics(
  events: PlayEvent[],
  drives: DriveRecord[] = [],
  unitHint?: ChartUnit
): RedZoneSummary {
  const offense: RedZoneSummary['offense'] = {
    trips: 0,
    touchdowns: 0,
    fieldGoals: 0,
    scores: 0,
    empty: 0,
    scoringPct: 0,
    touchdownPct: 0,
  }
  const defense: RedZoneSummary['defense'] = { ...offense }

  const drivesToUse = drives.length ? drives : deriveDriveRecords(events, unitHint)
  const eventsByDrive = new Map<number, PlayEvent[]>()
  events.forEach((ev) => {
    if (ev.drive_number == null) return
    const list = eventsByDrive.get(ev.drive_number) || []
    list.push(ev)
    eventsByDrive.set(ev.drive_number, list)
  })

  drivesToUse.forEach((drive) => {
    const evs = eventsByDrive.get(drive.drive_number) || []
    const hasRedZoneEntry = evs.some(isRedZoneSnap)
    if (!hasRedZoneEntry) return

    const driveSide = drive.unit_on_field ?? drive.unit ?? (evs[0] ? resolvePlaySide(evs[0], unitHint) : unitHint) ?? 'OFFENSE'
    const scoringSide: 'TEAM' | 'OPPONENT' = driveSide === 'DEFENSE' ? 'OPPONENT' : 'TEAM'
    let touchdown = evs.some(
      (ev) => ev.scoring && (ev.scoring.scoring_team_side ?? 'TEAM') === scoringSide && isTouchdownEvent(ev.scoring)
    )
    let fieldGoal = evs.some(
      (ev) => ev.scoring && (ev.scoring.scoring_team_side ?? 'TEAM') === scoringSide && ev.scoring.type === 'FG'
    )
    if (!touchdown && !fieldGoal) {
      const result = (drive.result || '').toUpperCase()
      touchdown = result === 'TD'
      fieldGoal = result === 'FG'
    }
    const scored = touchdown || fieldGoal

    const bucket = driveSide === 'DEFENSE' ? defense : offense
    bucket.trips += 1
    if (touchdown) bucket.touchdowns += 1
    if (fieldGoal) bucket.fieldGoals += 1
    if (scored) bucket.scores += 1
    else bucket.empty += 1
  })

  const finalize = (bucket: RedZoneSummary['offense']) => {
    return {
      ...bucket,
      scoringPct: bucket.trips ? bucket.scores / bucket.trips : 0,
      touchdownPct: bucket.trips ? bucket.touchdowns / bucket.trips : 0,
    }
  }

  return {
    offense: finalize(offense),
    defense: finalize(defense),
  }
}
export function deriveDriveRecords(events: PlayEvent[], unitFallback?: ChartUnit): DriveRecord[] {
  if (events.length === 0) return []
  const sorted = [...events].sort((a, b) => {
    const driveDelta = (a.drive_number ?? 0) - (b.drive_number ?? 0)
    if (driveDelta !== 0) return driveDelta
    return (a.absolute_clock_seconds ?? 0) - (b.absolute_clock_seconds ?? 0)
  })

  const drives = new Map<number, DriveRecord>()

  sorted.forEach((ev) => {
    const driveNo = ev.drive_number ?? 0
    if (!drives.has(driveNo)) {
      const unitOnField =
        (ev.possession as ChartUnit | null) || (ev.play_family === 'SPECIAL_TEAMS' ? 'SPECIAL_TEAMS' : null) ||
        unitFallback ||
        'OFFENSE'
      drives.set(driveNo, {
        id: ev.drive_id ?? null,
        drive_number: driveNo,
        team_id: ev.team_id,
        opponent_id: ev.opponent_id ?? null,
        game_id: ev.game_id,
        season_id: ev.season_id ?? null,
        unit: unitOnField,
        unit_on_field: unitOnField,
        possession_team_id: ev.possession_team_id ?? ev.team_id,
        play_ids: [],
        start_field_position: null,
        end_field_position: null,
        start_time_seconds: null,
        end_time_seconds: null,
        start_score: null,
        end_score: null,
        yards: 0,
        result: null,
      })
    }

    const drive = drives.get(driveNo)!
    drive.play_ids.push(ev.id)
    const yardLine = ev.field_position ?? (typeof ev.ball_on === 'string' ? 100 - yardLineFromBallOn(ev.ball_on) : null)
    drive.start_field_position = drive.start_field_position ?? yardLine ?? null
    drive.end_field_position = yardLine ?? drive.end_field_position
    drive.start_time_seconds =
      drive.start_time_seconds ?? ev.absolute_clock_seconds ?? absoluteClockSeconds(ev.quarter, ev.clock_seconds)
    drive.end_time_seconds = ev.absolute_clock_seconds ?? drive.end_time_seconds ?? absoluteClockSeconds(ev.quarter, ev.clock_seconds)
    drive.start_score = drive.start_score ?? ev.score_before ?? deriveScoreState(ev, 'before')
    drive.end_score = ev.score_after ?? deriveScoreState(ev, 'after') ?? drive.end_score
    drive.yards += ev.gained_yards ?? 0
    if ((ev.is_drive_end || ev.is_half_end || ev.is_game_end) && !drive.result) {
      drive.result = classifyDriveResult(ev)
    }
  })

  return Array.from(drives.values()).map((drive) => ({
    ...drive,
    result: drive.result ?? 'UNKNOWN',
  }))
}

function isSack(ev: PlayEvent) {
  const result = (ev.pass_result || ev.result || '').toUpperCase()
  return result.includes('SACK')
}

function isThrowaway(ev: PlayEvent) {
  const resultText = (ev.pass_result || ev.result || '').toUpperCase()
  return resultText.includes('THROW') && resultText.includes('AWAY')
}

function isPassAttempt(ev: PlayEvent) {
  if (ev.play_family !== 'PASS' && ev.play_family !== 'RPO') return false
  return !isSack(ev)
}

function isPassCompletion(ev: PlayEvent) {
  if (!isPassAttempt(ev)) return false
  const code = (ev.pass_result || '').toUpperCase()
  const resultText = (ev.result || '').toUpperCase()
  if (code === 'COMPLETE' || code === 'SCREEN') return true
  if (code === 'INCOMPLETE' || code === 'INT' || code === 'THROWAWAY') return false
  if (resultText.includes('INCOMP')) return false
  if (resultText.includes('THROW') && resultText.includes('AWAY')) return false
  if (resultText.includes('INT')) return false
  if (resultText.includes('SACK')) return false
  if (ev.turnover_detail && ev.turnover_detail.type === 'INTERCEPTION') return false
  return ev.gained_yards != null
}

function buildPassingLine(passes: PlayEvent[]): PassingLine {
  const attemptsList = passes.filter(isPassAttempt)
  const completions = attemptsList.filter(isPassCompletion).length
  const throwaways = attemptsList.filter(isThrowaway).length
  const yards = attemptsList.reduce((sum, ev) => sum + (ev.gained_yards ?? 0), 0)
  const sacks = passes.filter(isSack).length
  const sackYards = passes
    .filter(isSack)
    .reduce((sum, ev) => sum + Math.abs(ev.gained_yards ?? 0), 0)
  const attempts = attemptsList.length
  const dropbacks = attempts + sacks
  const completionPct = attempts ? completions / attempts : 0
  const accuracyDenominator = Math.max(attempts - throwaways, 0)
  const accuracyPct = accuracyDenominator ? completions / accuracyDenominator : completionPct

  return {
    attempts,
    completions,
    completionPct,
    accuracyPct,
    yards,
    yardsPerAttempt: attempts ? yards / attempts : 0,
    yardsPerCompletion: completions ? yards / completions : 0,
    sacks,
    sackYards,
    dropbacks,
    netYardsPerAttempt: dropbacks ? (yards - sackYards) / dropbacks : 0,
  }
}

function buildRushingLine(plays: PlayEvent[]): RushingLine {
  const attempts = plays.length
  const yards = plays.reduce((sum, ev) => sum + (ev.gained_yards ?? 0), 0)
  return {
    attempts,
    yards,
    yardsPerCarry: attempts ? yards / attempts : 0,
  }
}

function driveDurationSeconds(drive: DriveRecord, events: PlayEvent[]): number | null {
  const first = events[0]
  const last = events[events.length - 1]
  const start =
    drive.start_time_seconds ??
    (first?.absolute_clock_seconds ?? absoluteClockSeconds(first?.quarter, first?.clock_seconds)) ??
    null
  const end =
    drive.end_time_seconds ??
    (last?.absolute_clock_seconds ?? absoluteClockSeconds(last?.quarter, last?.clock_seconds)) ??
    null
  if (start == null || end == null) return null
  return Math.max(0, end - start)
}

function clampDurationToHalf(start: number, end: number, halfIndex: 1 | 2) {
  const halfStart = halfIndex === 1 ? 0 : QUARTER_LENGTH_SECONDS * 2
  const halfEnd = halfStart + QUARTER_LENGTH_SECONDS * 2
  const clampedStart = Math.max(start, halfStart)
  const clampedEnd = Math.min(end, halfEnd)
  return Math.max(0, clampedEnd - clampedStart)
}

function normalizeDriveResult(drive: DriveRecord, events: PlayEvent[]): DriveResultType | 'OTHER' {
  const result = drive.result ?? 'UNKNOWN'
  const normalized = typeof result === 'string' ? result.toUpperCase() : result
  const knownResults: Array<DriveResultType | 'OTHER'> = [
    'TD',
    'FG',
    'MISS_FG',
    'PUNT',
    'DOWNS',
    'TURNOVER',
    'END_HALF',
    'END_GAME',
    'SAFETY',
    'UNKNOWN',
    'OTHER',
  ]
  if (knownResults.includes(normalized as DriveResultType | 'OTHER')) return normalized as DriveResultType | 'OTHER'
  const last = events[events.length - 1]
  if (last) {
    return classifyDriveResult(last)
  }
  return 'OTHER'
}

function emptyDriveResults(): DriveResultBreakdown {
  return {
    TD: 0,
    FG: 0,
    MISS_FG: 0,
    PUNT: 0,
    DOWNS: 0,
    TURNOVER: 0,
    END_HALF: 0,
    END_GAME: 0,
    SAFETY: 0,
    UNKNOWN: 0,
    OTHER: 0,
  }
}

export function computePassingEfficiency(
  events: PlayEvent[],
  unitHint?: ChartUnit,
  filters?: OffensivePlayFilter
): PassingEfficiency {
  const scoped = filterOffensivePlays(events, unitHint, { ...filters, playFamily: ['PASS', 'RPO'] as PlayFamily[] })
  const line = buildPassingLine(scoped)
  const byQuarterback = new Map<string, PlayEvent[]>()
  scoped.forEach((ev) => {
    const qb = ev.participation?.quarterback || 'TEAM'
    const list = byQuarterback.get(qb) || []
    list.push(ev)
    byQuarterback.set(qb, list)
  })

  const byQuarterbackLines: Record<string, PassingLine> = {}
  byQuarterback.forEach((plays, qb) => {
    byQuarterbackLines[qb] = buildPassingLine(plays)
  })

  return {
    ...line,
    byQuarterback: byQuarterbackLines,
  }
}

export function computeRushingEfficiency(
  events: PlayEvent[],
  unitHint?: ChartUnit,
  filters?: OffensivePlayFilter
): RushingEfficiency {
  const scoped = filterOffensivePlays(events, unitHint, { ...filters, playFamily: ['RUN', 'RPO'] as PlayFamily[] })
  const line = buildRushingLine(scoped)
  const byRusher = new Map<string, PlayEvent[]>()
  scoped.forEach((ev) => {
    const carrier = ev.participation?.primaryBallcarrier || ev.participation?.quarterback || 'TEAM'
    const list = byRusher.get(carrier) || []
    list.push(ev)
    byRusher.set(carrier, list)
  })
  const byRusherLines: Record<string, RushingLine> = {}
  byRusher.forEach((plays, rusher) => {
    byRusherLines[rusher] = buildRushingLine(plays)
  })

  return {
    ...line,
    byRusher: byRusherLines,
  }
}

export function computePossessionMetrics(
  events: PlayEvent[],
  drives: DriveRecord[] = [],
  unitHint: ChartUnit = 'OFFENSE'
): PossessionMetrics {
  const scopedDrives = drives.length ? drives : deriveDriveRecords(events, unitHint)
  const eventsByDrive = new Map<number, PlayEvent[]>()
  events.forEach((ev) => {
    if (ev.drive_number == null) return
    const list = eventsByDrive.get(ev.drive_number) || []
    list.push(ev)
    eventsByDrive.set(ev.drive_number, list)
  })

  let offenseDrives = 0
  let opponentDrives = 0
  let offenseDuration = 0
  let firstHalfSeconds = 0
  let secondHalfSeconds = 0
  let offensePlays = 0
  let offenseYards = 0
  const driveResults = emptyDriveResults()

  scopedDrives.forEach((drive) => {
    const evs = eventsByDrive.get(drive.drive_number) || []
    const driveSide = drive.unit_on_field ?? drive.unit ?? (evs[0] ? resolvePlaySide(evs[0], unitHint) : unitHint) ?? 'OFFENSE'
    if (driveSide === 'OFFENSE') {
      offenseDrives += 1
      const duration = driveDurationSeconds(drive, evs)
      if (duration != null) {
        offenseDuration += duration
        const start =
          drive.start_time_seconds ??
          (evs[0]?.absolute_clock_seconds ?? absoluteClockSeconds(evs[0]?.quarter, evs[0]?.clock_seconds)) ??
          0
        const end =
          drive.end_time_seconds ??
          (evs[evs.length - 1]?.absolute_clock_seconds ??
            absoluteClockSeconds(evs[evs.length - 1]?.quarter, evs[evs.length - 1]?.clock_seconds)) ??
          start
        firstHalfSeconds += clampDurationToHalf(start, end, 1)
        secondHalfSeconds += clampDurationToHalf(start, end, 2)
      }
      const plays = drive.play_ids.length || evs.length
      offensePlays += plays
      offenseYards += drive.yards
      const resultKey = normalizeDriveResult(drive, evs)
      driveResults[resultKey] = (driveResults[resultKey] || 0) + 1
    } else if (driveSide === 'DEFENSE') {
      opponentDrives += 1
    }
  })

  const pointsBase = computeBaseCounts(events)

  return {
    offense: {
      drives: offenseDrives,
      timeOfPossessionSeconds: offenseDuration,
      firstHalfSeconds,
      secondHalfSeconds,
      averagePlays: offenseDrives ? offensePlays / offenseDrives : 0,
      averageSeconds: offenseDrives ? offenseDuration / offenseDrives : 0,
      averageYards: offenseDrives ? offenseYards / offenseDrives : 0,
      driveResults,
      pointsPerPossession: offenseDrives ? pointsBase.pointsFor / offenseDrives : 0,
    },
    defense: {
      drives: opponentDrives,
      pointsPerPossession: opponentDrives ? pointsBase.pointsAllowed / opponentDrives : 0,
    },
  }
}

export function computeAdvancedAnalytics(
  box: BoxScoreMetrics,
  base: BaseCounts,
  drives: DriveRecord[] = []
): AdvancedAnalytics {
  const leveragePlays = drives.length ? drives.reduce((sum, d) => sum + d.play_ids.length, 0) : base.plays
  const leverageRate = base.plays ? leveragePlays / base.plays : 0
  const estimatedEPA = base.totalYards * 0.06 + base.scoringPlays * 2 - base.turnovers * 2
  const pressures = base.plays
  const havocRate = pressures ? (base.turnovers + base.penalties.count * 0.25) / pressures : 0
  const avgFieldPos =
    drives.length > 0
      ? drives.reduce((sum, d) => sum + (d.start_field_position ?? 50), 0) / drives.length
      : base.plays
      ? base.totalYards / base.plays
      : 0

  return {
    estimatedEPA,
    estimatedEPAperPlay: base.plays ? estimatedEPA / base.plays : 0,
    havocRate,
    leverageRate,
    fieldPositionAdvantage: avgFieldPos,
  }
}

export function buildStatsStack(params: {
  events: PlayEvent[]
  drives?: DriveRecord[]
  opponentEvents?: PlayEvent[]
  opponentBox?: BoxScoreMetrics
  unit?: ChartUnit
  gameId?: string
  seasonId?: string | null
  opponentId?: string | null
}) {
  const scopedEvents = filterEventsForUnit(params.events, params.unit)
  const base = computeBaseCounts(scopedEvents)
  const opponentBase = params.opponentEvents ? computeBaseCounts(params.opponentEvents) : undefined
  const box = computeBoxScore(scopedEvents, base, params.unit)
  const drives = params.drives && params.drives.length > 0 ? params.drives : deriveDriveRecords(scopedEvents, params.unit)
  const core = computeCoreWinningMetrics(box, params.opponentBox)
  const advanced = computeAdvancedAnalytics(box, base, drives)
  const turnovers = computeTurnoverMetrics(base, { opponentBase, opponentBox: params.opponentBox, unitHint: params.unit })
  const explosives = computeExplosiveMetrics(scopedEvents, params.unit)
  const redZone = computeRedZoneMetrics(scopedEvents, drives, params.unit)
  const scoring = computeScoringSummary(base, 1)
  const success = computeSuccessRate(scopedEvents, params.unit)
  const ypp = computeYardsPerPlay(scopedEvents, params.unit)
  const game: GameMetricSnapshot = {
    gameId: params.gameId ?? scopedEvents[0]?.game_id ?? undefined,
    seasonId: params.seasonId ?? scopedEvents[0]?.season_id ?? null,
    opponentId: params.opponentId ?? scopedEvents[0]?.opponent_id ?? null,
    turnover: turnovers,
    explosives,
    scoring,
    redZone,
    efficiency: {
      yardsPerPlay: ypp,
      success,
      thirdDown: box.thirdDown,
      fourthDown: box.fourthDown,
      lateDown: box.lateDown,
    },
  }
  return { base, box, core, advanced, drives, turnovers, explosives, redZone, scoring, game }
}

export function aggregateSeasonMetrics(games: GameMetricSnapshot[]): SeasonAggregate {
  const gamesPlayed = games.length
  const zeroAgg: SeasonAggregate = {
    games: gamesPlayed,
    turnover: { averageMargin: 0, trend: [], takeawaysPerGame: 0, giveawaysPerGame: 0 },
    scoring: { averagePointsFor: 0, averagePointsAllowed: 0, averageDifferential: 0, trend: [] },
    explosives: { offenseRate: 0, defenseRate: 0, offenseRunRate: 0, offensePassRate: 0 },
    efficiency: {
      yardsPerPlay: { plays: 0, yards: 0, ypp: 0 },
      success: { plays: 0, successes: 0, rate: 0 },
      thirdDown: { attempts: 0, conversions: 0, rate: 0 },
      fourthDown: { attempts: 0, conversions: 0, rate: 0 },
      lateDown: { attempts: 0, conversions: 0, rate: 0 },
    },
    redZone: { offense: { scoringPct: 0, tdPct: 0 }, defense: { scoringPct: 0, tdPct: 0 } },
    nonOffensiveTds: { perGame: 0, total: 0 },
  }
  if (gamesPlayed === 0) return zeroAgg

  const sum = (fn: (game: GameMetricSnapshot) => number) => games.reduce((acc, g) => acc + fn(g), 0)
  const turnoverTrend = games.map((g) => ({ gameId: g.gameId, opponentId: g.opponentId, value: g.turnover.margin }))
  const scoringTrend = games.map((g) => ({
    gameId: g.gameId,
    opponentId: g.opponentId,
    value: g.scoring.pointDifferential,
  }))

  const offensePlays = sum((g) => g.explosives.offense.plays)
  const offenseExplosives = sum((g) => g.explosives.offense.explosives)
  const defensePlays = sum((g) => g.explosives.defense.plays)
  const defenseExplosives = sum((g) => g.explosives.defense.explosives)
  const offenseRunPlays = sum((g) => g.explosives.offense.run.plays)
  const offenseRunExplosives = sum((g) => g.explosives.offense.run.explosives)
  const offensePassPlays = sum((g) => g.explosives.offense.pass.plays)
  const offensePassExplosives = sum((g) => g.explosives.offense.pass.explosives)

  const totalYards = sum((g) => g.efficiency.yardsPerPlay.yards)
  const totalPlays = sum((g) => g.efficiency.yardsPerPlay.plays)
  const successAttempts = sum((g) => g.efficiency.success.plays)
  const successMakes = sum((g) => g.efficiency.success.successes)
  const thirdDownAgg = aggregateConversionSummaries(games.map((g) => g.efficiency.thirdDown))
  const fourthDownAgg = aggregateConversionSummaries(games.map((g) => g.efficiency.fourthDown))
  const lateDownAgg = aggregateConversionSummaries(games.map((g) => g.efficiency.lateDown))

  const offenseTrips = sum((g) => g.redZone.offense.trips)
  const offenseScores = sum((g) => g.redZone.offense.scores)
  const offenseTds = sum((g) => g.redZone.offense.touchdowns)
  const defenseTrips = sum((g) => g.redZone.defense.trips)
  const defenseScores = sum((g) => g.redZone.defense.scores)
  const defenseTds = sum((g) => g.redZone.defense.touchdowns)

  const nonOffensiveTotal = sum((g) => g.scoring.nonOffensive.total)

  return {
    games: gamesPlayed,
    turnover: {
      averageMargin: sum((g) => g.turnover.margin) / gamesPlayed,
      trend: turnoverTrend,
      takeawaysPerGame: sum((g) => g.turnover.takeaways) / gamesPlayed,
      giveawaysPerGame: sum((g) => g.turnover.giveaways) / gamesPlayed,
    },
    scoring: {
      averagePointsFor: sum((g) => g.scoring.pointsFor) / gamesPlayed,
      averagePointsAllowed: sum((g) => g.scoring.pointsAllowed) / gamesPlayed,
      averageDifferential: sum((g) => g.scoring.pointDifferential) / gamesPlayed,
      trend: scoringTrend,
    },
    explosives: {
      offenseRate: offensePlays ? offenseExplosives / offensePlays : 0,
      defenseRate: defensePlays ? defenseExplosives / defensePlays : 0,
      offenseRunRate: offenseRunPlays ? offenseRunExplosives / offenseRunPlays : 0,
      offensePassRate: offensePassPlays ? offensePassExplosives / offensePassPlays : 0,
    },
    efficiency: {
      yardsPerPlay: { plays: totalPlays, yards: totalYards, ypp: totalPlays ? totalYards / totalPlays : 0 },
      success: {
        plays: successAttempts,
        successes: successMakes,
        rate: successAttempts ? successMakes / successAttempts : 0,
      },
      thirdDown: thirdDownAgg,
      fourthDown: fourthDownAgg,
      lateDown: lateDownAgg,
    },
    redZone: {
      offense: {
        scoringPct: offenseTrips ? offenseScores / offenseTrips : 0,
        tdPct: offenseTrips ? offenseTds / offenseTrips : 0,
      },
      defense: {
        scoringPct: defenseTrips ? defenseScores / defenseTrips : 0,
        tdPct: defenseTrips ? defenseTds / defenseTrips : 0,
      },
    },
    nonOffensiveTds: {
      perGame: nonOffensiveTotal / gamesPlayed,
      total: nonOffensiveTotal,
    },
  }
}
export function projectSeason(games: { box: BoxScoreMetrics; core: CoreWinningMetrics }[]): SeasonProjection {
  const gamesModeled = games.length
  if (gamesModeled === 0) {
    return {
      gamesModeled: 0,
      projectedWinRate: 0,
      projectedPointsPerGame: 0,
      projectedPointsAllowed: 0,
      notes: 'Insufficient data; chart games to unlock projections.',
    }
  }

  const avgPoints =
    games.reduce(
      (sum, g) => sum + (g.core.pointsPerDrive * Math.max(g.box.plays, 1)) / Math.max(g.box.lateDown.attempts || 1, 1),
      0
    ) / gamesModeled
  const avgAgainst = Math.max(0, 24 - (games.reduce((sum, g) => sum + g.core.explosiveMargin, 0) / gamesModeled) * 2)
  const projectedWinRate = Math.min(
    0.99,
    Math.max(
      0.01,
      0.5 + (games.reduce((sum, g) => sum + g.core.successMargin + g.core.turnoverMargin * 0.05, 0) / gamesModeled) * 0.3
    )
  )

  return {
    gamesModeled,
    projectedWinRate,
    projectedPointsPerGame: avgPoints,
    projectedPointsAllowed: avgAgainst,
    notes: 'Projection based on charted efficiency deltas; refines as more games are charted.',
  }
}

type TendencyOption = {
  label: string
  success: number
  explosive: number
  sample: number
  note?: string
}

export function buildTendencyLens(events: PlayEvent[], unit: ChartUnit) {
  if (events.length === 0) {
    return { summary: 'No charted plays yet to build tendencies.', options: [] as TendencyOption[] }
  }
  const current = events[0]
  const downBucket = bucketDownDistance(current.down, current.distance)
  const yardLine = yardLineFromBallOn(current.ball_on)
  const zone = fieldZone(yardLine)
  const driveLabel = current.drive_number ? `Drive ${current.drive_number}` : 'current drive'
  const filtered = events.filter((ev) => bucketDownDistance(ev.down, ev.distance) === downBucket)

  if (unit === 'OFFENSE') {
    const familyStats = aggregateByKey(filtered, (ev) => ev.play_family || 'UNKNOWN')
    const conceptStats = aggregateByKey(
      filtered,
      (ev) => ev.run_concept || ev.wr_concept_id || ev.play_call || ev.play_family || 'Concept'
    )
    const bestConcepts = topOptions(conceptStats)
    const bestFamily = topOptions(familyStats)[0]
    const summary = bestFamily
      ? `On ${downBucket} in ${driveLabel}, ${prettyLabel(bestFamily.label)} leads: ${pct(
          bestFamily.success
        )}% success, ${pct(bestFamily.explosive)}% explosive. In ${zone ?? 'open field'}, lean on ${prettyLabel(
          bestConcepts[0]?.label || bestFamily.label
        )}.`
      : `On ${downBucket} tonight, stay with your top concepts in this field zone (${zone ?? 'open field'}).`
    return { summary, options: bestConcepts.slice(0, 3) }
  }

  if (unit === 'DEFENSE') {
    const coverage = aggregateByKey(filtered, (ev) => ev.coverage_shell_post || ev.coverage_shell_pre || 'Coverage')
    const pressure = aggregateByKey(filtered, (ev) => ev.pressure_code || 'Pressure')
    const summary = coverage[0]
      ? `On ${downBucket}, ${prettyLabel(coverage[0].label)} is allowing ${pct(
          coverage[0].explosive
        )}% explosive. Consider dialing ${prettyLabel(pressure[0]?.label || 'pressure')} if they stay ahead of the sticks.`
      : `Tighten late down calls; match coverage and pressure to the field zone (${zone ?? 'open field'}).`
    return { summary, options: [...topOptions(coverage), ...topOptions(pressure)].slice(0, 3) }
  }

  const stBuckets = aggregateByKey(filtered, (ev) => ev.st_play_type || 'ST')
  const summary = stBuckets[0]
    ? `${prettyLabel(stBuckets[0].label)} showing ${pct(stBuckets[0].success)}% success with ${pct(
        stBuckets[0].explosive
      )}% explosive; watch returns in the ${zone ?? 'open field'}.`
    : 'Special teams tendencies will populate after a few charted kicks.'
  return { summary, options: topOptions(stBuckets).slice(0, 3) }
}

export function buildNumericSummary(unit: ChartUnit, events: PlayEvent[]) {
  const summary: Record<string, { plays: number; success: number; explosive: number; ypp: number }> = {}
  const byKey = (keyFn: (ev: PlayEvent) => string) => {
    summaryLoop(events, keyFn).forEach(([key, stats]) => {
      summary[key] = stats
    })
  }

  if (unit === 'OFFENSE') {
    byKey((ev) => ev.play_family || 'UNKNOWN')
  } else if (unit === 'DEFENSE') {
    byKey((ev) => ev.coverage_shell_post || ev.coverage_shell_pre || 'Coverage')
    byKey((ev) => ev.front_code || 'Front')
  } else {
    byKey((ev) => ev.st_play_type || 'ST')
  }

  return summary
}
function summaryLoop(
  list: PlayEvent[],
  keyFn: (ev: PlayEvent) => string
): Array<[string, { plays: number; success: number; explosive: number; ypp: number }]> {
  const map = new Map<
    string,
    {
      plays: number
      success: number
      explosive: number
      yards: number
    }
  >()
  list.forEach((ev) => {
    const key = keyFn(ev)
    if (!key) return
    const bucket = map.get(key) || { plays: 0, success: 0, explosive: 0, yards: 0 }
    bucket.plays += 1
    bucket.success += isSuccessfulPlay(ev) ? 1 : 0
    bucket.explosive += isExplosivePlay(ev) ? 1 : 0
    bucket.yards += ev.gained_yards ?? 0
    map.set(key, bucket)
  })
  return Array.from(map.entries()).map(([label, stats]) => [
    label,
    {
      plays: stats.plays,
      success: stats.plays ? stats.success / stats.plays : 0,
      explosive: stats.plays ? stats.explosive / stats.plays : 0,
      ypp: stats.plays ? stats.yards / stats.plays : 0,
    },
  ])
}

function aggregateByKey(list: PlayEvent[], keyFn: (ev: PlayEvent) => string | null | undefined) {
  const map = new Map<string, { success: number; explosive: number; sample: number; yards: number }>()
  list.forEach((ev) => {
    const key = keyFn(ev)
    if (!key) return
    const bucket = map.get(key) || { success: 0, explosive: 0, sample: 0, yards: 0 }
    bucket.sample += 1
    bucket.success += isSuccessfulPlay(ev) ? 1 : 0
    bucket.explosive += isExplosivePlay(ev) ? 1 : 0
    bucket.yards += ev.gained_yards ?? 0
    map.set(key, bucket)
  })
  return Array.from(map.entries()).map(([label, stats]) => ({
    label,
    success: stats.sample ? stats.success / stats.sample : 0,
    explosive: stats.sample ? stats.explosive / stats.sample : 0,
    sample: stats.sample,
    note: `YPP ${stats.sample ? (stats.yards / stats.sample).toFixed(1) : '0.0'}`,
  }))
}

function topOptions(options: TendencyOption[]) {
  return options
    .filter((opt) => opt.sample > 0)
    .sort((a, b) => b.success - a.success || b.sample - a.sample)
}

function prettyLabel(label: string) {
  return label.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function pct(n: number) {
  return Math.round(n * 100)
}

function isScoringPlay(result: string | null | undefined) {
  if (!result) return false
  const normalized = result.toLowerCase()
  return (
    normalized.includes('td') ||
    normalized.includes('touchdown') ||
    normalized.includes('fg') ||
    normalized.includes('field goal') ||
    normalized.includes('safety')
  )
}

function derivePointsFromResult(result: string): number {
  const normalized = result.toLowerCase()
  if (normalized.includes('touchdown') || normalized.includes('td')) return 6
  if (normalized.includes('two point')) return 2
  if (normalized.includes('safety')) return 2
  if (normalized.includes('fg') || normalized.includes('field goal')) return 3
  return 0
}

function guessScoringType(result: string): ScoringEvent['type'] {
  const normalized = result.toLowerCase()
  if (normalized.includes('safety')) return 'SAFETY'
  if (normalized.includes('fg') || normalized.includes('field goal')) return 'FG'
  if (normalized.includes('pat')) return 'PAT'
  if (normalized.includes('two point')) return 'TWO_POINT'
  if (normalized.includes('td') || normalized.includes('touchdown')) return 'TD'
  return 'OTHER'
}

function guessTurnoverType(result?: string | null): TurnoverEvent['type'] | null {
  if (!result) return null
  const normalized = result.toLowerCase()
  if (normalized.includes('intercept')) return 'INTERCEPTION'
  if (normalized.includes('fumble')) return 'FUMBLE'
  if (normalized.includes('downs')) return 'DOWNS'
  if (normalized.includes('block')) return 'BLOCKED_KICK'
  return 'OTHER'
}

function classifyDriveResult(ev: PlayEvent): DriveResultType {
  if (ev.scoring) {
    if (ev.scoring.type === 'FG') return 'FG'
    if (ev.scoring.type === 'SAFETY') return 'SAFETY'
    return 'TD'
  }
  if (ev.turnover_detail) {
    if (ev.turnover_detail.type === 'DOWNS') return 'DOWNS'
    return 'TURNOVER'
  }
  const result = (ev.result || '').toLowerCase()
  if (result.includes('punt')) return 'PUNT'
  if (result.includes('fg') || result.includes('field goal')) return result.includes('miss') ? 'MISS_FG' : 'FG'
  if (result.includes('intercept') || result.includes('fumble')) return 'TURNOVER'
  if (result.includes('downs')) return 'DOWNS'
  if (ev.is_half_end) return 'END_HALF'
  if (ev.is_game_end) return 'END_GAME'
  return 'UNKNOWN'
}
