
import {
  AdvancedAnalytics,
  AdjustedNetYardsPerAttempt,
  BaseCounts,
  BoxScoreMetrics,
  BoundaryFlags,
  ChartUnit,
  CoreWinningMetrics,
  DefensiveConversionMetrics,
  DefensiveContext,
  DefensiveHavocMetrics,
  DefensiveMetrics,
  DefensiveSituational,
  DefensiveTakeawayMetrics,
  DefensiveTflMetrics,
  DistanceBucket,
  DriveRecord,
  DriveResultBreakdown,
  DriveResultType,
  EpaAggregate,
  ExplosiveMetrics,
  ExpectedPointsInput,
  ExpectedPointsResult,
  FieldZone,
  GameMetricSnapshot,
  GameControlMetric,
  OffensivePlayFilter,
  OffensiveContext,
  ConversionSummary,
  PassingEfficiency,
  PassingLine,
  PlayEvent,
  PlayFamily,
  PlayEpaResult,
  PostGameWinExpectancy,
  PostGameWinExpectancyInput,
  QuarterbackRatings,
  QuarterbackRating,
  PossessionMetrics,
  RedZoneSummary,
  RushingEfficiency,
  RushingLine,
  ScoreState,
  ScoringEvent,
  ScoringSummary,
  SeasonAggregate,
  SeasonProjection,
  SeasonSimulationInput,
  SeasonSimulationResult,
  SimulatedGame,
  SpecialTeamsMetrics,
  SpPlusLikeRatings,
  WinProbabilityState,
  WinProbabilityPoint,
  WinProbabilitySummary,
  FieldGoalMetrics,
  FieldPositionMetrics,
  PuntingMetrics,
  KickoffMetrics,
  ReturnMetrics,
  ReturnLine,
  FieldGoalSplits,
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
const GAME_LENGTH_SECONDS = QUARTER_LENGTH_SECONDS * 4

// Expected points curve tuned for college-style possessions, monotonically increasing with field position.
// Yard line is measured from the offense's goal line (0 = own goal, 100 = opponent goal line).
const EXPECTED_POINTS_CURVE = [
  { yardLine: 1, ep: -2.5 },
  { yardLine: 10, ep: -1.6 },
  { yardLine: 20, ep: -0.9 },
  { yardLine: 30, ep: -0.1 },
  { yardLine: 40, ep: 0.8 },
  { yardLine: 50, ep: 1.6 },
  { yardLine: 60, ep: 2.6 },
  { yardLine: 70, ep: 3.6 },
  { yardLine: 80, ep: 4.5 },
  { yardLine: 90, ep: 5.3 },
  { yardLine: 99, ep: 5.9 },
]

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

function possessingSide(ev: PlayEvent): 'TEAM' | 'OPPONENT' | null {
  const side = resolvePlaySide(ev, 'OFFENSE')
  if (side === 'OFFENSE') return 'TEAM'
  if (side === 'DEFENSE') return 'OPPONENT'
  return null
}

function possessingTeamScored(ev: PlayEvent): boolean {
  if (!ev.scoring) return false
  const side = possessingSide(ev)
  if (!side) return false
  return (ev.scoring.scoring_team_side ?? 'TEAM') === side
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

function filterDefensivePlays(events: PlayEvent[], unitHint?: ChartUnit): PlayEvent[] {
  return events.filter((ev) => resolvePlaySide(ev, unitHint) === 'DEFENSE' && ev.play_family !== 'SPECIAL_TEAMS')
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
  if (possessingTeamScored(ev)) return true
  if (ev.turnover_detail) return false
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

type SampleRate = DefensiveSituational['overall']

function makeSampleRate(count: number, sample: number): SampleRate {
  return { count, sample, rate: sample ? count / sample : 0 }
}

function mergeSampleRate(a: SampleRate, b: SampleRate): SampleRate {
  const sample = a.sample + b.sample
  const count = a.count + b.count
  return makeSampleRate(count, sample)
}

function mergeRateRecord(recordA: Record<string, SampleRate>, recordB: Record<string, SampleRate>) {
  const merged: Record<string, SampleRate> = {}
  const keys = new Set([...Object.keys(recordA), ...Object.keys(recordB)])
  keys.forEach((key) => {
    merged[key] = mergeSampleRate(recordA[key] || makeSampleRate(0, 0), recordB[key] || makeSampleRate(0, 0))
  })
  return merged
}

function buildSituationalBreakdown(domain: PlayEvent[], matches: PlayEvent[]): DefensiveSituational {
  const matchIds = new Set(matches.map((ev) => ev.id))
  const quarterBuckets: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4]
  const zoneBuckets: Array<FieldZone | 'UNKNOWN'> = ['BACKED_UP', 'COMING_OUT', 'OPEN_FIELD', 'SCORING_RANGE', 'RED_ZONE', 'UNKNOWN']
  const downBuckets: Array<'1' | '2' | '3' | '4'> = ['1', '2', '3', '4']

  const rateFor = (filterFn: (ev: PlayEvent) => boolean): SampleRate => {
    const subset = domain.filter(filterFn)
    const count = subset.reduce((sum, ev) => sum + (matchIds.has(ev.id) ? 1 : 0), 0)
    return makeSampleRate(count, subset.length)
  }

  const buildCall = (resolver: (ev: PlayEvent) => string | null | undefined) => {
    const map: Record<string, SampleRate> = {}
    const keys = new Set(
      domain
        .map((ev) => resolver(ev) || 'UNKNOWN')
        .filter((val) => typeof val === 'string')
    )
    keys.forEach((key) => {
      map[key] = rateFor((ev) => (resolver(ev) || 'UNKNOWN') === key)
    })
    if (!map.UNKNOWN) {
      map.UNKNOWN = makeSampleRate(0, 0)
    }
    return map
  }

  return {
    overall: makeSampleRate(matches.length, domain.length),
    byHalf: {
      first: rateFor((ev) => ev.quarter === 1 || ev.quarter === 2),
      second: rateFor((ev) => ev.quarter === 3 || ev.quarter === 4),
    },
    byQuarter: quarterBuckets.reduce(
      (acc, q) => ({ ...acc, [q]: rateFor((ev) => ev.quarter === q) }),
      {} as DefensiveSituational['byQuarter']
    ),
    byFieldZone: zoneBuckets.reduce((acc, zone) => {
      acc[zone] = rateFor((ev) => (normalizeFieldZone(ev) ?? 'UNKNOWN') === zone)
      return acc
    }, {} as DefensiveSituational['byFieldZone']),
    byDown: downBuckets.reduce((acc, down) => {
      const downNum = Number(down)
      acc[down] = rateFor((ev) => ev.down === downNum)
      return acc
    }, {} as DefensiveSituational['byDown']),
    byCall: {
      front: buildCall((ev) => ev.front_code ?? null),
      coverage: buildCall((ev) => ev.coverage_shell_post ?? ev.coverage_shell_pre ?? null),
      pressure: buildCall((ev) => ev.pressure_code ?? null),
    },
  }
}

function mergeSituational(a: DefensiveSituational, b: DefensiveSituational): DefensiveSituational {
  return {
    overall: mergeSampleRate(a.overall, b.overall),
    byHalf: {
      first: mergeSampleRate(a.byHalf.first, b.byHalf.first),
      second: mergeSampleRate(a.byHalf.second, b.byHalf.second),
    },
    byQuarter: {
      1: mergeSampleRate(a.byQuarter[1], b.byQuarter[1]),
      2: mergeSampleRate(a.byQuarter[2], b.byQuarter[2]),
      3: mergeSampleRate(a.byQuarter[3], b.byQuarter[3]),
      4: mergeSampleRate(a.byQuarter[4], b.byQuarter[4]),
    },
    byFieldZone: mergeRateRecord(a.byFieldZone, b.byFieldZone),
    byDown: {
      '1': mergeSampleRate(a.byDown['1'], b.byDown['1']),
      '2': mergeSampleRate(a.byDown['2'], b.byDown['2']),
      '3': mergeSampleRate(a.byDown['3'], b.byDown['3']),
      '4': mergeSampleRate(a.byDown['4'], b.byDown['4']),
    },
    byCall: {
      front: mergeRateRecord(a.byCall.front, b.byCall.front),
      coverage: mergeRateRecord(a.byCall.coverage, b.byCall.coverage),
      pressure: mergeRateRecord(a.byCall.pressure, b.byCall.pressure),
    },
  }
}

function emptySituational(): DefensiveSituational {
  const fresh = () => makeSampleRate(0, 0)
  return {
    overall: fresh(),
    byHalf: { first: fresh(), second: fresh() },
    byQuarter: { 1: fresh(), 2: fresh(), 3: fresh(), 4: fresh() },
    byFieldZone: {
      BACKED_UP: fresh(),
      COMING_OUT: fresh(),
      OPEN_FIELD: fresh(),
      SCORING_RANGE: fresh(),
      RED_ZONE: fresh(),
      UNKNOWN: fresh(),
    },
    byDown: { '1': fresh(), '2': fresh(), '3': fresh(), '4': fresh() },
    byCall: { front: {}, coverage: {}, pressure: {} },
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

function filterDefensiveDrives(drives: DriveRecord[]) {
  return drives.filter((drive) => (drive.unit_on_field ?? drive.unit ?? 'OFFENSE') === 'DEFENSE')
}

export function computeDefensiveTakeaways(events: PlayEvent[]): DefensiveTakeawayMetrics {
  const defensiveEvents = filterDefensivePlays(events, 'DEFENSE')
  const takeaways = defensiveEvents.filter((ev) => {
    const turnover = normalizeTurnoverEvent(ev)
    if (!turnover || !shouldCountTurnover(turnover)) return false
    if ((turnover.lostBySide ?? 'TEAM') !== 'OPPONENT') return false
    if (turnover.type === 'INTERCEPTION' || turnover.type === 'FUMBLE') return true
    if (COUNT_TURNOVER_ON_DOWNS && turnover.type === 'DOWNS') return true
    return turnover.type === 'BLOCKED_KICK'
  })

  const byType = emptyTurnoverBuckets()
  takeaways.forEach((ev) => {
    const turnover = normalizeTurnoverEvent(ev)
    if (turnover) incrementTurnoverBucket(byType, turnover)
  })

  const total =
    byType.interceptions +
    byType.fumbles +
    byType.blockedKicks +
    byType.other +
    (COUNT_TURNOVER_ON_DOWNS ? byType.downs : 0)

  return {
    total,
    perGame: total,
    byType,
    situational: buildSituationalBreakdown(defensiveEvents, takeaways),
  }
}

export function computeDefensiveStopSummary(events: PlayEvent[], down: 3 | 4): DefensiveConversionMetrics {
  const defensiveEvents = filterDefensivePlays(events, 'DEFENSE')
  const attempts = defensiveEvents.filter((ev) => ev.down === down)
  const conversionsAllowed = attempts.filter(isSeriesConversion).length
  const stops = attempts.length - conversionsAllowed
  const stopsList = attempts.filter((ev) => !isSeriesConversion(ev))

  return {
    attempts: attempts.length,
    stops,
    conversionsAllowed,
    stopRate: attempts.length ? stops / attempts.length : 0,
    situational: buildSituationalBreakdown(attempts, stopsList),
  }
}

function computeForcedThreeAndOuts(drives: DriveRecord[], events: PlayEvent[]) {
  const defensiveDrives = filterDefensiveDrives(drives)
  const eventsByDrive = new Map<number, PlayEvent[]>()
  events.forEach((ev) => {
    if (ev.drive_number == null) return
    const list = eventsByDrive.get(ev.drive_number) || []
    list.push(ev)
    eventsByDrive.set(ev.drive_number, list)
  })

  let count = 0
  defensiveDrives.forEach((drive) => {
    const evs = eventsByDrive.get(drive.drive_number) || []
    const defensivePlays = evs.filter((ev) => resolvePlaySide(ev, 'DEFENSE') === 'DEFENSE')
    if (defensivePlays.length === 0) return
    const result = normalizeDriveResult(drive, defensivePlays)
    const terminal =
      result === 'PUNT' || result === 'TURNOVER' || result === 'DOWNS' || result === 'END_HALF' || result === 'END_GAME'
    const converted = defensivePlays.some((ev) => isSeriesConversion(ev))
    const scored = defensivePlays.some((ev) => possessingTeamScored(ev))

    if (defensivePlays.length <= 3 && terminal && !converted && !scored) {
      count += 1
    }
  })

  const drivesFaced = defensiveDrives.length
  return {
    count,
    drives: drivesFaced,
    rate: drivesFaced ? count / drivesFaced : 0,
  }
}

function isTackleForLoss(ev: PlayEvent) {
  if (isSack(ev)) return true
  if (ev.play_family === 'RUN' || ev.play_family === 'RPO') {
    return (ev.gained_yards ?? 0) < 0
  }
  return false
}

function isForcedFumble(ev: PlayEvent) {
  if (ev.participation?.forcedFumble) return true
  if (ev.turnover_detail?.type === 'FUMBLE') {
    return (ev.turnover_detail.lostBySide ?? 'TEAM') === 'OPPONENT'
  }
  return false
}

function isInterceptionTakeaway(ev: PlayEvent) {
  if (!ev.turnover_detail) return false
  if ((ev.turnover_detail.lostBySide ?? 'TEAM') !== 'OPPONENT') return false
  return ev.turnover_detail.type === 'INTERCEPTION'
}

function isPassDeflection(ev: PlayEvent) {
  return (ev.participation?.passDefenders?.length ?? 0) > 0
}

export function computeDefensiveTflMetrics(events: PlayEvent[]): DefensiveTflMetrics {
  const defensiveEvents = filterDefensivePlays(events, 'DEFENSE')
  const tflEvents: PlayEvent[] = []
  const byPlayer: Record<string, { tfl: number; sacks: number }> = {}

  defensiveEvents.forEach((ev) => {
    const sack = isSack(ev)
    const tfl = sack || isTackleForLoss(ev)
    if (!tfl) return
    tflEvents.push(ev)

    const sackers = ev.participation?.sackers ?? []
    const tacklers = [
      ...(ev.participation?.soloTacklers ?? []),
      ...(ev.participation?.assistedTacklers ?? []),
    ]
    const candidates = sack && sackers.length ? sackers : tacklers
    const players = candidates.length ? candidates : []
    ;[...new Set(players)].forEach((player) => {
      const bucket = byPlayer[player] || { tfl: 0, sacks: 0 }
      bucket.tfl += 1
      if (sack) bucket.sacks += 1
      byPlayer[player] = bucket
    })
  })

  const sacks = tflEvents.filter((ev) => isSack(ev)).length

  return {
    total: tflEvents.length,
    sacks,
    perGame: tflEvents.length,
    byPlayer,
    situational: buildSituationalBreakdown(defensiveEvents, tflEvents),
  }
}

export function computeDefensiveHavocMetrics(events: PlayEvent[], tfls?: DefensiveTflMetrics): DefensiveHavocMetrics {
  const defensiveEvents = filterDefensivePlays(events, 'DEFENSE')
  const havocEvents: PlayEvent[] = []
  let tflCount = tfls?.total ?? 0
  let sackCount = tfls?.sacks ?? 0
  let forcedFumbles = 0
  let interceptions = 0
  let passDeflections = 0

  defensiveEvents.forEach((ev) => {
    const sack = isSack(ev)
    const tfl = isTackleForLoss(ev)
    const forcedFumble = isForcedFumble(ev)
    const interception = isInterceptionTakeaway(ev)
    const deflection = isPassDeflection(ev)
    const havoc = tfl || forcedFumble || interception || deflection
    if (havoc) havocEvents.push(ev)
    if (tfl && !(tfls && tfls.total > 0)) tflCount += 1
    if (sack && !(tfls && tfls.sacks > 0)) sackCount += 1
    if (forcedFumble) forcedFumbles += 1
    if (interception) interceptions += 1
    if (deflection) passDeflections += 1
  })

  return {
    plays: defensiveEvents.length,
    havocPlays: havocEvents.length,
    rate: defensiveEvents.length ? havocEvents.length / defensiveEvents.length : 0,
    components: {
      tfl: tflCount,
      sacks: sackCount,
      forcedFumbles,
      interceptions,
      passDeflections,
    },
    situational: buildSituationalBreakdown(defensiveEvents, havocEvents),
  }
}

export function computeDefensiveMetrics(events: PlayEvent[], drives: DriveRecord[] = []): DefensiveMetrics {
  const defensiveEvents = filterDefensivePlays(events, 'DEFENSE')
  const defensiveBase = computeBaseCounts(defensiveEvents)
  const scopedDrives = filterDefensiveDrives(drives.length ? drives : deriveDriveRecords(defensiveEvents, 'DEFENSE'))
  const possession = computePossessionMetrics(defensiveEvents, scopedDrives, 'DEFENSE')

  const takeaways = computeDefensiveTakeaways(defensiveEvents)
  const thirdDown = computeDefensiveStopSummary(defensiveEvents, 3)
  const fourthDown = computeDefensiveStopSummary(defensiveEvents, 4)
  const threeAndOuts = computeForcedThreeAndOuts(scopedDrives, defensiveEvents)
  const tfls = computeDefensiveTflMetrics(defensiveEvents)
  const havoc = computeDefensiveHavocMetrics(defensiveEvents, tfls)
  const redZone = computeRedZoneMetrics(defensiveEvents, scopedDrives, 'DEFENSE').defense

  const drivesFaced = scopedDrives.length
  const pointsPerDrive = drivesFaced ? defensiveBase.pointsAllowed / drivesFaced : 0

  return {
    snaps: defensiveEvents.length,
    takeaways,
    thirdDown,
    fourthDown,
    threeAndOuts: { count: threeAndOuts.count, rate: threeAndOuts.rate, drives: threeAndOuts.drives },
    tfls,
    havoc,
    drives: {
      drivesFaced,
      threeAndOuts: { count: threeAndOuts.count, rate: threeAndOuts.rate },
      pointsAllowed: defensiveBase.pointsAllowed,
      pointsPerGame: defensiveBase.pointsAllowed,
      pointsPerDrive,
      pointsPerPossession: possession.defense.pointsPerPossession,
    },
    redZone,
  }
}

function averageNumber(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((v): v is number => typeof v === 'number' && !Number.isNaN(v))
  if (!valid.length) return null
  return valid.reduce((sum, v) => sum + v, 0) / valid.length
}

function teamPossessesSpecialTeams(ev: PlayEvent): boolean {
  if (ev.possession_team_id && ev.team_id) return ev.possession_team_id === ev.team_id
  if (ev.possession === 'DEFENSE') return false
  return true
}

function normalizeStartYardLine(ev: PlayEvent): number | null {
  if (typeof ev.ball_on === 'string') return yardLineFromBallOn(ev.ball_on)
  if (typeof ev.field_position === 'number') {
    return Math.max(0, Math.min(100, 100 - ev.field_position))
  }
  return null
}

function isKickoffPlay(ev: PlayEvent): boolean {
  const code = (ev.st_play_type || ev.play_call || ev.result || '').toUpperCase()
  return ev.play_family === 'SPECIAL_TEAMS' && (code.includes('KICKOFF') || code.includes('KO') || code.includes('KICK OFF'))
}

function isPuntPlay(ev: PlayEvent): boolean {
  const code = (ev.st_play_type || ev.play_call || ev.result || '').toUpperCase()
  return ev.play_family === 'SPECIAL_TEAMS' && code.includes('PUNT')
}

function isFieldGoalAttempt(ev: PlayEvent): boolean {
  const code = (ev.st_play_type || ev.play_call || ev.result || '').toUpperCase()
  if (ev.scoring?.type === 'FG') return true
  return ev.play_family === 'SPECIAL_TEAMS' && (code.includes('FG') || code.includes('FIELD GOAL'))
}

function isExtraPointAttempt(ev: PlayEvent): boolean {
  const code = (ev.st_play_type || ev.play_call || ev.result || '').toUpperCase()
  if (ev.scoring?.type === 'PAT') return true
  return ev.play_family === 'SPECIAL_TEAMS' && (code.includes('PAT') || code.includes('XP') || code.includes('EXTRA POINT'))
}

function isTouchbackEvent(ev: PlayEvent): boolean {
  const code = (ev.st_variant || ev.result || '').toUpperCase()
  return code.includes('TOUCHBACK')
}

function isReturnPlay(ev: PlayEvent): boolean {
  if (ev.st_return_yards != null) return true
  const code = (ev.st_play_type || ev.result || '').toUpperCase()
  return code.includes('RETURN')
}

function estimateKickDistance(ev: PlayEvent): number | null {
  const yardsToGoal =
    typeof ev.field_position === 'number'
      ? ev.field_position
      : typeof ev.ball_on === 'string'
      ? 100 - yardLineFromBallOn(ev.ball_on)
      : null
  if (yardsToGoal == null) return null
  return Math.max(0, Math.min(100, yardsToGoal + 17))
}

function emptyReturnLine(): ReturnLine {
  return { returns: 0, yards: 0, average: 0, longest: 0, touchdowns: 0 }
}

function finalizeReturnLine(line: ReturnLine): ReturnLine {
  return { ...line, average: line.returns ? line.yards / line.returns : 0 }
}

function computeReturnMetrics(events: PlayEvent[], predicate: (ev: PlayEvent) => boolean): ReturnMetrics {
  const team = emptyReturnLine()
  const byReturner: Record<string, ReturnLine> = {}

  events.forEach((ev) => {
    if (!predicate(ev)) return
    const yards = ev.st_return_yards ?? ev.gained_yards
    if (yards == null) return
    const td = ev.scoring ? isTouchdownEvent(ev.scoring) : false
    team.returns += 1
    team.yards += yards
    if (td) team.touchdowns += 1
    if (yards > team.longest) team.longest = yards

    const returner = ev.participation?.returner || ev.participation?.primaryBallcarrier || 'TEAM'
    const bucket = byReturner[returner] || emptyReturnLine()
    bucket.returns += 1
    bucket.yards += yards
    if (td) bucket.touchdowns += 1
    if (yards > bucket.longest) bucket.longest = yards
    byReturner[returner] = bucket
  })

  return {
    team: finalizeReturnLine(team),
    byReturner: Object.fromEntries(Object.entries(byReturner).map(([k, v]) => [k, finalizeReturnLine(v)])),
  }
}

function bandFromDistance(distance: number | null): keyof FieldGoalSplits['bands'] | null {
  if (distance == null) return null
  if (distance < 30) return 'inside30'
  if (distance < 40) return 'from30to39'
  if (distance < 50) return 'from40to49'
  return 'from50Plus'
}

function emptyBand() {
  return { attempts: 0, made: 0, pct: 0 }
}

function emptyFieldGoalSplits(): FieldGoalSplits {
  return {
    overall: emptyBand(),
    bands: {
      inside30: emptyBand(),
      from30to39: emptyBand(),
      from40to49: emptyBand(),
      from50Plus: emptyBand(),
    },
    extraPoint: emptyBand(),
    longestMade: 0,
  }
}

function finalizeFieldGoalSplits(splits: FieldGoalSplits): FieldGoalSplits {
  const finalizeBand = (band: ReturnType<typeof emptyBand>) => ({
    ...band,
    pct: band.attempts ? band.made / band.attempts : 0,
  })
  return {
    overall: finalizeBand(splits.overall),
    bands: {
      inside30: finalizeBand(splits.bands.inside30),
      from30to39: finalizeBand(splits.bands.from30to39),
      from40to49: finalizeBand(splits.bands.from40to49),
      from50Plus: finalizeBand(splits.bands.from50Plus),
    },
    extraPoint: finalizeBand(splits.extraPoint),
    longestMade: splits.longestMade,
  }
}

export function computeFieldGoalMetrics(events: PlayEvent[]): FieldGoalMetrics {
  const teamSplits = emptyFieldGoalSplits()
  const byKicker: Record<string, FieldGoalSplits> = {}

  events.forEach((ev) => {
    const isFg = isFieldGoalAttempt(ev)
    const isPat = isExtraPointAttempt(ev) && !isFg
    if (!isFg && !isPat) return

    const made =
      (ev.scoring?.type === 'FG' || ev.scoring?.type === 'PAT') ||
      (ev.result ? /(good|made)/i.test(ev.result) : false)
    const distance = estimateKickDistance(ev)
    const band = isFg ? bandFromDistance(distance) : null
    const kicker = ev.participation?.kicker || 'TEAM'
    if (!byKicker[kicker]) byKicker[kicker] = emptyFieldGoalSplits()
    const target = byKicker[kicker]
    if (isFg) {
      teamSplits.overall.attempts += 1
      target.overall.attempts += 1
      if (band) {
        teamSplits.bands[band].attempts += 1
        target.bands[band].attempts += 1
      }
      if (made) {
        teamSplits.overall.made += 1
        target.overall.made += 1
        if (band) {
          teamSplits.bands[band].made += 1
          target.bands[band].made += 1
        }
        if (distance != null && distance > teamSplits.longestMade) teamSplits.longestMade = distance
        if (distance != null && distance > target.longestMade) target.longestMade = distance
      }
    } else if (isPat) {
      teamSplits.extraPoint.attempts += 1
      target.extraPoint.attempts += 1
      if (made) {
        teamSplits.extraPoint.made += 1
        target.extraPoint.made += 1
      }
    }
  })

  return {
    ...finalizeFieldGoalSplits(teamSplits),
    byKicker: Object.fromEntries(Object.entries(byKicker).map(([k, v]) => [k, finalizeFieldGoalSplits(v)])),
  }
}

function emptyPuntingLine(): PuntingMetrics['team'] {
  return {
    punts: 0,
    yards: 0,
    gross: 0,
    touchbacks: 0,
    inside20: 0,
    net: 0,
    longest: 0,
    opponentAverageStart: null,
  }
}

export function computePuntingMetrics(events: PlayEvent[]): PuntingMetrics {
  const punts = events.filter(
    (ev) =>
      isPuntPlay(ev) &&
      !((ev.st_play_type || '').toUpperCase().includes('RETURN')) &&
      teamPossessesSpecialTeams(ev)
  )
  const team = emptyPuntingLine()
  const byPunter: Record<string, ReturnType<typeof emptyPuntingLine>> = {}
  const opponentStarts: number[] = []
  const punterStarts: Record<string, number[]> = {}

  punts.forEach((ev) => {
    const gross = Math.max(0, ev.gained_yards ?? 0)
    const returnYards = Math.max(0, ev.st_return_yards ?? 0)
    const touchback = isTouchbackEvent(ev)
    const startLine = normalizeStartYardLine(ev) ?? 35
    const endLine = touchback ? 75 : Math.min(100, Math.max(0, startLine + gross - returnYards))
    const oppStart = 100 - endLine
    const inside20 = !touchback && oppStart <= 20 ? 1 : 0
    const net = gross - returnYards - (touchback ? 20 : 0)

    const update = (line: ReturnType<typeof emptyPuntingLine>) => {
      line.punts += 1
      line.yards += gross
      line.touchbacks += touchback ? 1 : 0
      line.inside20 += inside20
      line.net += net
      if (gross > line.longest) line.longest = gross
    }

    update(team)
    opponentStarts.push(oppStart)

    const punter = ev.participation?.punter || 'TEAM'
    if (!byPunter[punter]) byPunter[punter] = emptyPuntingLine()
    update(byPunter[punter])
    if (!punterStarts[punter]) punterStarts[punter] = []
    punterStarts[punter].push(oppStart)
  })

  const finalizeLine = (line: ReturnType<typeof emptyPuntingLine>, starts: number[]) => ({
    ...line,
    gross: line.punts ? line.yards / line.punts : 0,
    net: line.punts ? line.net / line.punts : 0,
    opponentAverageStart: averageNumber(starts),
  })

  return {
    team: finalizeLine(team, opponentStarts),
    byPunter: Object.fromEntries(
      Object.entries(byPunter).map(([k, v]) => [k, finalizeLine(v, punterStarts[k] || [])])
    ),
  }
}

export function computeKickoffMetrics(events: PlayEvent[]): KickoffMetrics {
  const kickoffs = events.filter((ev) => isKickoffPlay(ev) && !teamPossessesSpecialTeams(ev))
  let kicks = 0
  let touchbacks = 0
  let longestReturnAllowed = 0
  const opponentStarts: number[] = []

  kickoffs.forEach((ev) => {
    kicks += 1
    const touchback = isTouchbackEvent(ev)
    if (touchback) {
      touchbacks += 1
      opponentStarts.push(25)
      return
    }
    const startLine = normalizeStartYardLine(ev) ?? 35
    const gross = Math.max(0, ev.gained_yards ?? 0)
    const returnYards = Math.max(0, ev.st_return_yards ?? 0)
    const endLine = Math.min(100, Math.max(0, startLine + gross - returnYards))
    opponentStarts.push(100 - endLine)
    if (returnYards > longestReturnAllowed) longestReturnAllowed = returnYards
  })

  return {
    kicks,
    touchbacks,
    touchbackPct: kicks ? touchbacks / kicks : 0,
    opponentAverageStart: averageNumber(opponentStarts),
    longestReturnAllowed,
  }
}

export function computeCoverageMetrics(events: PlayEvent[]) {
  const emptyCoverage = () => ({ attempts: 0, yards: 0, average: 0, longest: 0, touchdownsAllowed: 0 })
  const kickoff = emptyCoverage()
  const punt = emptyCoverage()

  events.forEach((ev) => {
    if (!isReturnPlay(ev)) return
    const returnYards = Math.max(0, ev.st_return_yards ?? 0)
    const isOpponentScore =
      ev.scoring && (ev.scoring.scoring_team_side ?? 'TEAM') === 'OPPONENT' && isTouchdownEvent(ev.scoring)
    if (isKickoffPlay(ev) && !teamPossessesSpecialTeams(ev)) {
      kickoff.attempts += 1
      kickoff.yards += returnYards
      if (returnYards > kickoff.longest) kickoff.longest = returnYards
      if (isOpponentScore) kickoff.touchdownsAllowed += 1
    }
    if (isPuntPlay(ev) && !teamPossessesSpecialTeams(ev)) {
      punt.attempts += 1
      punt.yards += returnYards
      if (returnYards > punt.longest) punt.longest = returnYards
      if (isOpponentScore) punt.touchdownsAllowed += 1
    }
  })

  const finalize = (cov: ReturnType<typeof emptyCoverage>) => ({
    ...cov,
    average: cov.attempts ? cov.yards / cov.attempts : 0,
  })

  return {
    kickoff: finalize(kickoff),
    punt: finalize(punt),
  }
}

function computeFieldPositionAdvantage(drives: DriveRecord[], opponentDrives: DriveRecord[] = []): FieldPositionMetrics {
  const offenseStarts = drives.filter((d) => d.unit_on_field === 'OFFENSE' || d.unit === 'OFFENSE')
  const defenseStarts =
    opponentDrives.length > 0
      ? opponentDrives.filter((d) => d.unit_on_field === 'OFFENSE' || d.unit === 'OFFENSE')
      : drives.filter((d) => d.unit_on_field === 'DEFENSE' || d.unit === 'DEFENSE')

  const offenseAvg = averageNumber(offenseStarts.map((d) => d.start_field_position ?? null))
  const defenseAvg = averageNumber(defenseStarts.map((d) => d.start_field_position ?? null))
  return {
    offenseStart: offenseAvg,
    defenseStart: defenseAvg,
    netStart: offenseAvg != null && defenseAvg != null ? offenseAvg - defenseAvg : null,
  }
}

function latestTimeoutState(events: PlayEvent[]): TimeoutState | null {
  const sorted = [...events].sort((a, b) => {
    const aTime = a.absolute_clock_seconds ?? absoluteClockSeconds(a.quarter, a.clock_seconds) ?? 0
    const bTime = b.absolute_clock_seconds ?? absoluteClockSeconds(b.quarter, b.clock_seconds) ?? 0
    return bTime - aTime
  })
  for (const ev of sorted) {
    if (ev.timeouts_before) return ev.timeouts_before
    if (ev.offense_timeouts != null || ev.defense_timeouts != null) return deriveTimeouts(ev)
  }
  return null
}

export function computeSpecialTeamsMetrics(
  events: PlayEvent[],
  drives: DriveRecord[] = [],
  opponentEvents: PlayEvent[] = [],
  opponentDrives: DriveRecord[] = []
): SpecialTeamsMetrics {
  const allDrives = drives.length ? drives : deriveDriveRecords(events)
  const otherDrives =
    opponentDrives.length > 0 ? opponentDrives : opponentEvents.length ? deriveDriveRecords(opponentEvents) : []

  const fieldPosition = computeFieldPositionAdvantage(allDrives, otherDrives)
  const kickoffReturns = computeReturnMetrics(
    events,
    (ev) => isKickoffPlay(ev) && teamPossessesSpecialTeams(ev) && isReturnPlay(ev)
  )
  const puntReturns = computeReturnMetrics(
    events,
    (ev) => isPuntPlay(ev) && isReturnPlay(ev) && (ev.st_play_type || '').toUpperCase().includes('RETURN')
  )
  const fieldGoals = computeFieldGoalMetrics(events)
  const punting = computePuntingMetrics(events)
  const kickoff = computeKickoffMetrics(events)
  const coverage = computeCoverageMetrics(events)

  return {
    fieldPosition,
    kickoffReturns,
    puntReturns,
    coverage,
    fieldGoals,
    punting,
    kickoff,
  }
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function sigmoid(x: number) {
  return 1 / (1 + Math.exp(-x))
}

function interpolateExpectedPoints(yardLineRaw: number): number {
  const yardLine = clampNumber(yardLineRaw, 1, 99)
  for (let i = 0; i < EXPECTED_POINTS_CURVE.length - 1; i++) {
    const current = EXPECTED_POINTS_CURVE[i]
    const next = EXPECTED_POINTS_CURVE[i + 1]
    if (yardLine >= current.yardLine && yardLine <= next.yardLine) {
      const span = next.yardLine - current.yardLine || 1
      const pct = (yardLine - current.yardLine) / span
      return current.ep + pct * (next.ep - current.ep)
    }
  }
  return EXPECTED_POINTS_CURVE[EXPECTED_POINTS_CURVE.length - 1].ep
}

export function computeExpectedPoints(state: ExpectedPointsInput): ExpectedPointsResult {
  const yardLine = state.yardLine == null ? 50 : clampNumber(state.yardLine, 1, 99)
  const baseFieldPosition = interpolateExpectedPoints(yardLine)
  const distance = state.distance ?? 10
  const down = state.down ?? 1
  const baseConversion = clampNumber(1 - Math.log1p(distance) / (down === 4 ? 2.8 : 3.6), 0.05, 0.98)
  const downMultiplier = down === 1 ? 1 : down === 2 ? 0.82 : down === 3 ? 0.58 : 0.28
  const conversionProbability = clampNumber(baseConversion * downMultiplier + (down === 1 ? 0.08 : 0), 0.05, 0.98)
  const opponentYardLine = clampNumber(100 - yardLine + Math.min(distance, 10), 1, 99)
  const turnoverPenalty = interpolateExpectedPoints(opponentYardLine)
  const urgency = 1 - clampNumber((state.clockSecondsRemaining ?? GAME_LENGTH_SECONDS) / GAME_LENGTH_SECONDS, 0, 1)
  const scorePressure = clampNumber(-state.scoreDiff / 21, -1, 1)
  const tempoAdjustment = scorePressure * urgency * 0.9
  const timeoutAdjustment = ((state.offenseTimeouts ?? 2) - (state.defenseTimeouts ?? 2)) * 0.12
  const points =
    baseFieldPosition * (0.35 + 0.65 * conversionProbability) -
    turnoverPenalty * (1 - conversionProbability) * (down === 4 ? 0.95 : down === 3 ? 0.6 : 0.35) +
    tempoAdjustment +
    timeoutAdjustment

  return {
    points,
    components: { baseFieldPosition, conversionProbability, turnoverPenalty, tempoAdjustment, timeoutAdjustment },
  }
}

function resolveYardLineForEvent(ev: PlayEvent): number | null {
  if (typeof ev.ball_on === 'string') return yardLineFromBallOn(ev.ball_on)
  if (ev.field_position != null) return 100 - ev.field_position
  if (ev.field_zone === 'RED_ZONE') return 90
  if (ev.field_zone === 'SCORING_RANGE') return 70
  if (ev.field_zone === 'COMING_OUT') return 15
  return null
}

function resolveScoreDifferential(ev: PlayEvent): number {
  if (ev.team_score_before != null && ev.opponent_score_before != null) {
    return (ev.team_score_before ?? 0) - (ev.opponent_score_before ?? 0)
  }
  if (ev.score_before) return (ev.score_before.team ?? 0) - (ev.score_before.opponent ?? 0)
  if (ev.offense_score_before != null && ev.defense_score_before != null) {
    return (ev.offense_score_before ?? 0) - (ev.defense_score_before ?? 0)
  }
  return 0
}

function resolveClockRemaining(ev: PlayEvent): number | null {
  const abs = ev.absolute_clock_seconds ?? absoluteClockSeconds(ev.quarter, ev.clock_seconds)
  if (abs == null) return null
  return Math.max(0, GAME_LENGTH_SECONDS - abs)
}

function possessionAfterPlay(ev: PlayEvent, pre: 'TEAM' | 'OPPONENT'): 'TEAM' | 'OPPONENT' {
  if (ev.turnover_detail?.lostBySide === 'TEAM') return 'OPPONENT'
  if (ev.turnover_detail?.lostBySide === 'OPPONENT') return 'TEAM'
  if (ev.scoring) return (ev.scoring.scoring_team_side ?? pre) === 'TEAM' ? 'OPPONENT' : 'TEAM'
  if (ev.is_drive_end && ev.result && ev.result.toLowerCase().includes('punt')) {
    return pre === 'TEAM' ? 'OPPONENT' : 'TEAM'
  }
  return pre
}

function estimateNextSeriesState(ev: PlayEvent, yardLineBefore: number) {
  const gained = ev.gained_yards ?? 0
  const distance = ev.distance ?? 10
  const down = ev.down ?? 1
  const achieved = ev.first_down || gained >= distance || offenseScored(ev)
  const nextYardLine = clampNumber(yardLineBefore + gained, 1, 99)
  const yardsToGoal = 100 - nextYardLine
  const nextDown = achieved ? 1 : Math.min(4, down + 1)
  const nextDistance = achieved ? Math.max(1, Math.min(10, yardsToGoal)) : Math.max(1, distance - gained)
  return { nextYardLine, nextDown, nextDistance }
}

function derivePointsForTeam(ev: PlayEvent): number {
  if (ev.scoring) {
    const side = ev.scoring.scoring_team_side ?? possessingSide(ev) ?? 'TEAM'
    return side === 'TEAM' ? ev.scoring.points : -ev.scoring.points
  }
  if (isScoringPlay(ev.result)) {
    const pts = derivePointsFromResult(ev.result ?? '')
    const side = possessingSide(ev) ?? 'TEAM'
    return side === 'TEAM' ? pts : -pts
  }
  return 0
}

function collectPlayers(ev: PlayEvent): string[] {
  const ids = new Set<string>()
  const p = ev.participation
  if (p?.quarterback) ids.add(p.quarterback)
  if (p?.primaryBallcarrier) ids.add(p.primaryBallcarrier)
  if (p?.primaryTarget) ids.add(p.primaryTarget)
  if (p?.returner) ids.add(p.returner)
  if (p?.interceptors) p.interceptors.forEach((id) => id && ids.add(id))
  if (p?.sackers) p.sackers.forEach((id) => id && ids.add(id))
  if (p?.forcedFumble) ids.add(p.forcedFumble)
  if (p?.recovery) ids.add(p.recovery)
  return Array.from(ids).filter(Boolean)
}

function computeLeverageFactor(scoreDiff: number, secondsRemaining: number | null, down: number | null, distance: number | null) {
  const timePressure = secondsRemaining != null ? 1 - clampNumber(secondsRemaining / GAME_LENGTH_SECONDS, 0, 1) : 0.25
  const scorePressure = Math.min(1, Math.abs(scoreDiff) / 21)
  const downWeight = down ? (down >= 4 ? 1 : down === 3 ? 0.7 : down === 2 ? 0.45 : 0.2) : 0.3
  const distanceWeight = distance != null ? clampNumber(distance / 12, 0, 1) * 0.3 : 0
  return clampNumber(timePressure + scorePressure * 0.5 + downWeight + distanceWeight, 0, 2)
}

export function computeEpaAggregates(events: PlayEvent[], drives: DriveRecord[] = []): EpaAggregate {
  const ordered = [...events].sort((a, b) => {
    const aTime = a.absolute_clock_seconds ?? absoluteClockSeconds(a.quarter, a.clock_seconds) ?? 0
    const bTime = b.absolute_clock_seconds ?? absoluteClockSeconds(b.quarter, b.clock_seconds) ?? 0
    return aTime - bTime
  })

  const playsDetail: Record<string, PlayEpaResult> = {}
  const byDrive: EpaAggregate['byDrive'] = {}
  const byPlayer: EpaAggregate['byPlayer'] = {}
  const byUnit: EpaAggregate['byUnit'] = {
    OFFENSE: { epa: 0, adjusted: 0, plays: 0, perPlay: 0 },
    DEFENSE: { epa: 0, adjusted: 0, plays: 0, perPlay: 0 },
    SPECIAL_TEAMS: { epa: 0, adjusted: 0, plays: 0, perPlay: 0 },
  }

  let total = 0
  let adjustedTotal = 0

  ordered.forEach((ev) => {
    const possessionSide = possessingSide(ev) ?? 'TEAM'
    const yardLine = resolveYardLineForEvent(ev) ?? 50
    const secondsRemaining = resolveClockRemaining(ev)
    const scoreDiff = resolveScoreDifferential(ev)
    const timeouts = ev.timeouts_before ?? deriveTimeouts(ev)
    const preEp = computeExpectedPoints({
      down: ev.down,
      distance: ev.distance,
      yardLine,
      clockSecondsRemaining: secondsRemaining,
      scoreDiff,
      offenseTimeouts: timeouts?.team ?? ev.offense_timeouts ?? null,
      defenseTimeouts: timeouts?.opponent ?? ev.defense_timeouts ?? null,
    }).points
    const teamPreEp = possessionSide === 'TEAM' ? preEp : -preEp
    const points = derivePointsForTeam(ev)
    const state = estimateNextSeriesState(ev, yardLine)
    const nextSecondsRemaining = secondsRemaining != null ? Math.max(0, secondsRemaining - 6) : null
    const nextScoreDiff = scoreDiff + points
    const nextPossession = possessionAfterPlay(ev, possessionSide)
    const postEpRaw = computeExpectedPoints({
      down: ev.turnover_detail ? 1 : state.nextDown,
      distance: ev.turnover_detail ? 10 : state.nextDistance,
      yardLine: ev.turnover_detail ? clampNumber(100 - state.nextYardLine, 1, 99) : state.nextYardLine,
      clockSecondsRemaining: nextSecondsRemaining,
      scoreDiff: nextScoreDiff,
      offenseTimeouts: timeouts?.team ?? ev.offense_timeouts ?? null,
      defenseTimeouts: timeouts?.opponent ?? ev.defense_timeouts ?? null,
    }).points
    const teamPostEp = nextPossession === 'TEAM' ? postEpRaw : -postEpRaw
    const raw = points + teamPostEp - teamPreEp
    const leverage = computeLeverageFactor(scoreDiff, secondsRemaining, ev.down, ev.distance)
    const adjusted = raw * (1 + leverage * 0.35)
    const detail: PlayEpaResult = {
      playId: ev.id,
      raw,
      adjusted,
      preEp: teamPreEp,
      postEp: teamPostEp,
      points,
      unit: resolvePlaySide(ev, 'OFFENSE'),
      driveNumber: ev.drive_number ?? null,
      leverage,
      possession: possessionSide,
      scoreDiff,
      secondsRemaining,
      players: collectPlayers(ev),
    }
    playsDetail[ev.id] = detail
    total += raw
    adjustedTotal += adjusted

    const driveKey = ev.drive_number != null ? String(ev.drive_number) : ev.drive_id ?? 'unknown'
    byDrive[driveKey] = byDrive[driveKey] || { epa: 0, adjusted: 0, plays: 0 }
    byDrive[driveKey].epa += raw
    byDrive[driveKey].adjusted += adjusted
    byDrive[driveKey].plays += 1

    collectPlayers(ev).forEach((player) => {
      byPlayer[player] = byPlayer[player] || { epa: 0, adjusted: 0, plays: 0 }
      byPlayer[player].epa += raw
      byPlayer[player].adjusted += adjusted
      byPlayer[player].plays += 1
    })

    const unit = resolvePlaySide(ev, 'OFFENSE')
    byUnit[unit].epa += raw
    byUnit[unit].adjusted += adjusted
    byUnit[unit].plays += 1
  })

  Object.values(byUnit).forEach((bucket) => {
    bucket.perPlay = bucket.plays ? bucket.epa / bucket.plays : 0
  })

  const drivesUsed =
    drives.length ||
    new Set(
      ordered
        .map((ev) => ev.drive_number)
        .filter((n) => n != null)
        .map((n) => String(n))
    ).size

  return {
    plays: ordered.length,
    total,
    adjustedTotal,
    perPlay: ordered.length ? total / ordered.length : 0,
    perDrive: drivesUsed ? total / drivesUsed : 0,
    byDrive,
    byPlayer,
    byUnit,
    playsDetail,
  }
}

export function computeAdjustedNetYardsPerAttempt(events: PlayEvent[], unitHint?: ChartUnit): AdjustedNetYardsPerAttempt {
  const pool = unitHint ? filterEventsForUnit(events, unitHint) : events
  const passes = pool.filter((ev) => (ev.play_family || '').toUpperCase() === 'PASS')
  let attempts = 0
  let yards = 0
  let touchdowns = 0
  let interceptions = 0
  let sacks = 0
  let sackYards = 0
  const byQuarterback: Record<string, { yards: number; attempts: number; sacks: number; sackYards: number; tds: number; ints: number }> = {}

  passes.forEach((ev) => {
    const qb = ev.participation?.quarterback ?? 'TEAM'
    const gained = ev.gained_yards ?? 0
    const result = (ev.result || '').toLowerCase()
    const isSack = result.includes('sack') || (gained < 0 && result.includes('loss'))
    const isAttempt = !result.includes('spike')
    if (isAttempt) attempts += 1
    if (isSack) sacks += 1
    if (isSack) sackYards += Math.abs(gained)
    yards += gained
    if (ev.scoring && ev.scoring.type === 'TD') touchdowns += 1
    if (ev.turnover_detail?.type === 'INTERCEPTION' || result.includes('intercept')) interceptions += 1

    byQuarterback[qb] = byQuarterback[qb] || { yards: 0, attempts: 0, sacks: 0, sackYards: 0, tds: 0, ints: 0 }
    if (isAttempt) byQuarterback[qb].attempts += 1
    if (isSack) byQuarterback[qb].sacks += 1
    if (isSack) byQuarterback[qb].sackYards += Math.abs(gained)
    byQuarterback[qb].yards += gained
    if (ev.scoring && ev.scoring.type === 'TD') byQuarterback[qb].tds += 1
    if (ev.turnover_detail?.type === 'INTERCEPTION' || result.includes('intercept')) byQuarterback[qb].ints += 1
  })

  const attemptsDenominator = attempts + sacks
  const teamAnyA = attemptsDenominator
    ? (yards + touchdowns * 20 - interceptions * 45 - sackYards) / attemptsDenominator
    : 0

  const byQuarterbackResult: Record<string, number> = {}
  Object.entries(byQuarterback).forEach(([qb, stats]) => {
    const denom = stats.attempts + stats.sacks
    byQuarterbackResult[qb] = denom ? (stats.yards + stats.tds * 20 - stats.ints * 45 - stats.sackYards) / denom : 0
  })

  return {
    team: teamAnyA,
    attempts,
    sacks,
    byQuarterback: byQuarterbackResult,
  }
}

function buildWinProbStateFromEvent(ev: PlayEvent, possessionSide: 'TEAM' | 'OPPONENT', scoreDiff: number): WinProbabilityState {
  const yardLine = resolveYardLineForEvent(ev)
  const secondsRemaining = resolveClockRemaining(ev) ?? GAME_LENGTH_SECONDS
  const timeouts = ev.timeouts_before ?? deriveTimeouts(ev)
  return {
    scoreDiff,
    secondsRemaining,
    yardLine,
    down: ev.down,
    distance: ev.distance,
    offenseTimeouts: possessionSide === 'TEAM' ? timeouts?.team ?? ev.offense_timeouts ?? null : timeouts?.opponent ?? ev.defense_timeouts ?? null,
    defenseTimeouts: possessionSide === 'TEAM' ? timeouts?.opponent ?? ev.defense_timeouts ?? null : timeouts?.team ?? ev.offense_timeouts ?? null,
    possession: possessionSide === 'TEAM' ? 'OFFENSE' : 'DEFENSE',
  }
}

export function computeWinProbability(state: WinProbabilityState): number {
  const yardTerm = state.yardLine != null ? (state.yardLine - 50) / 25 : 0
  const scoreTerm = state.scoreDiff / 10
  const timeTerm = Math.log1p(state.secondsRemaining) / Math.log1p(GAME_LENGTH_SECONDS)
  const downTerm = state.down ? 1.2 - state.down * 0.3 : 0
  const distanceTerm = state.distance != null ? -Math.log1p(state.distance) / 3 : 0
  const timeoutTerm = ((state.offenseTimeouts ?? 2) - (state.defenseTimeouts ?? 2)) * 0.08
  const pregame = (state.pregameEdge ?? 0) / 15
  const possessionTilt = state.possession === 'DEFENSE' ? -0.25 : 0.25
  const z =
    0.9 * scoreTerm +
    0.5 * yardTerm +
    0.35 * timeTerm +
    0.25 * downTerm +
    0.2 * distanceTerm +
    timeoutTerm +
    pregame +
    possessionTilt
  return clampNumber(sigmoid(z), 0.01, 0.99)
}

export function computeWinProbabilitySummary(events: PlayEvent[], unitHint?: ChartUnit): WinProbabilitySummary {
  if (events.length === 0) {
    return {
      timeline: [],
      averageWinProbability: 0.5,
      wpaByPlayer: {},
      wpaByUnit: { OFFENSE: 0, DEFENSE: 0, SPECIAL_TEAMS: 0 },
      highLeverage: [],
    }
  }

  const ordered = [...events].sort((a, b) => {
    const aTime = a.absolute_clock_seconds ?? absoluteClockSeconds(a.quarter, a.clock_seconds) ?? 0
    const bTime = b.absolute_clock_seconds ?? absoluteClockSeconds(b.quarter, b.clock_seconds) ?? 0
    return aTime - bTime
  })

  const timeline: WinProbabilityPoint[] = []
  const wpaByPlayer: Record<string, number> = {}
  const wpaByUnit: Record<ChartUnit, number> = { OFFENSE: 0, DEFENSE: 0, SPECIAL_TEAMS: 0 }
  let previousWp = 0.5

  ordered.forEach((ev) => {
    const possessionSide: 'TEAM' | 'OPPONENT' =
      unitHint === 'DEFENSE' ? 'OPPONENT' : unitHint === 'OFFENSE' ? 'TEAM' : possessingSide(ev) ?? 'TEAM'
    const scoreDiff = resolveScoreDifferential(ev)
    const state = buildWinProbStateFromEvent(ev, possessionSide, scoreDiff)
    const wp = computeWinProbability(state)
    const wpa = wp - previousWp
    const leverage = Math.abs(wpa)
    const point: WinProbabilityPoint = {
      playId: ev.id,
      winProbability: wp,
      wpa,
      leverage,
      unit: resolvePlaySide(ev, 'OFFENSE'),
      secondsRemaining: state.secondsRemaining,
    }
    timeline.push(point)
    previousWp = wp

    collectPlayers(ev).forEach((player) => {
      wpaByPlayer[player] = (wpaByPlayer[player] ?? 0) + wpa
    })
    const unit = resolvePlaySide(ev, 'OFFENSE')
    wpaByUnit[unit] = (wpaByUnit[unit] ?? 0) + wpa
  })

  const averageWinProbability = timeline.length
    ? timeline.reduce((sum, pt) => sum + pt.winProbability, 0) / timeline.length
    : 0.5
  const highLeverage = timeline.filter((pt) => pt.leverage >= 0.05 || Math.abs(pt.wpa) >= 0.05)

  return { timeline, averageWinProbability, wpaByPlayer, wpaByUnit, highLeverage }
}

function buildWinExpectancyProfile(box: BoxScoreMetrics, base: BaseCounts): PostGameWinExpectancyInput {
  return {
    yardsFor: box.totalYards,
    yardsAllowed: 0,
    successRateFor: box.successRate,
    successRateAllowed: 0,
    explosivePlaysFor: box.explosives,
    explosivePlaysAllowed: 0,
    turnoversFor: base.turnovers,
    turnoversAllowed: 0,
    avgStartFieldPosition: null,
    penalties: base.penalties.yards,
    plays: box.plays,
  }
}

export function computePostGameWinExpectancy(
  team: PostGameWinExpectancyInput,
  opponent?: PostGameWinExpectancyInput
): PostGameWinExpectancy {
  const opp: PostGameWinExpectancyInput = opponent ?? {
    yardsFor: team.yardsAllowed,
    yardsAllowed: team.yardsFor,
    successRateFor: team.successRateAllowed,
    successRateAllowed: team.successRateFor,
    explosivePlaysFor: team.explosivePlaysAllowed,
    explosivePlaysAllowed: team.explosivePlaysFor,
    turnoversFor: team.turnoversAllowed,
    turnoversAllowed: team.turnoversFor,
    avgStartFieldPosition: team.avgStartFieldPosition,
    penalties: team.penalties,
    plays: team.plays,
  }

  const yardMargin = (team.yardsFor - opp.yardsFor) / 100
  const successMargin = team.successRateFor - opp.successRateFor
  const explosiveMargin =
    (team.explosivePlaysFor - opp.explosivePlaysFor) / Math.max(1, Math.min(team.plays || 1, opp.plays || 1))
  const turnoverMargin = -(team.turnoversFor - opp.turnoversFor) * 0.35
  const fieldPosAdj = ((team.avgStartFieldPosition ?? 50) - (opp.avgStartFieldPosition ?? 50)) / 25
  const penaltyAdj = -(team.penalties - opp.penalties) / 120

  const z = 0.28 * yardMargin + 0.32 * successMargin + 0.22 * explosiveMargin + turnoverMargin + fieldPosAdj * 0.25 + penaltyAdj
  const winExp = clampNumber(sigmoid(z), 0.01, 0.99)
  return {
    teamWinExpectancy: winExp,
    opponentWinExpectancy: 1 - winExp,
    notes: 'Deterministic win expectancy combining yardage, efficiency, explosives, turnovers, field position, and penalties.',
  }
}

export function computeSpPlusLikeRatings(
  events: PlayEvent[],
  epa: EpaAggregate,
  defenseHavoc: number,
  specialTeams?: SpecialTeamsMetrics
): SpPlusLikeRatings {
  const success = computeSuccessRate(events, 'OFFENSE')
  const successfulPlays = events.filter((ev) => isSuccessfulPlay(ev))
  const successEpa = successfulPlays
    .map((ev) => epa.playsDetail[ev.id]?.raw ?? 0)
    .filter((v) => Number.isFinite(v))
  const isoPpp = successEpa.length ? successEpa.reduce((a, b) => a + b, 0) / successEpa.length : 0
  const stContribution = specialTeams?.fieldPosition.netStart ?? 0

  const offense = clampNumber(50 + (success.rate - 0.45) * 120 + isoPpp * 35 + epa.perPlay * 60, 0, 100)
  const defense = clampNumber(50 - (success.rate - 0.45) * 90 - epa.perPlay * 40 + defenseHavoc * 25, 0, 100)
  const specialTeamsRating = clampNumber(50 + stContribution * 0.6, 0, 100)
  const overall = clampNumber(offense - (100 - defense) * 0.6 + (specialTeamsRating - 50) * 0.3 + 50, 0, 100)

  return {
    offense,
    defense,
    specialTeams: specialTeamsRating,
    overall,
    isoPpp,
    successRate: success.rate,
    havoc: defenseHavoc,
    epaPerPlay: epa.perPlay,
  }
}

export function computeQuarterbackRatings(
  events: PlayEvent[],
  epa: EpaAggregate,
  opponentDefRating = 0
): QuarterbackRatings {
  const buckets = new Map<string, { adj: number; plays: number }>()
  events.forEach((ev) => {
    const qb = ev.participation?.quarterback
    if (!qb) return
    const detail = epa.playsDetail[ev.id]
    if (!detail) return
    let adj = detail.adjusted
    if (isSeriesConversion(ev)) {
      const difficulty = ev.distance != null ? clampNumber(ev.distance / 12, 0, 1) : 0.2
      adj *= 1.1 + difficulty * 0.35
    }
    if ((ev.play_family || '').toUpperCase() === 'PASS' && (ev.distance ?? 0) <= 5 && (ev.gained_yards ?? 0) >= 15) {
      adj *= 0.7
    }
    const secondsRemaining = resolveClockRemaining(ev)
    const scoreDiff = resolveScoreDifferential(ev)
    if (secondsRemaining != null && secondsRemaining < 300 && Math.abs(scoreDiff) > 16) {
      adj *= 0.3
    }
    adj *= 1 + opponentDefRating / 100
    const bucket = buckets.get(qb) || { adj: 0, plays: 0 }
    bucket.adj += adj
    bucket.plays += 1
    buckets.set(qb, bucket)
  })

  const byQuarterback: Record<string, QuarterbackRating> = {}
  buckets.forEach((bucket, qb) => {
    const perPlay = bucket.plays ? bucket.adj / bucket.plays : 0
    const rating = clampNumber(50 + perPlay * 18 + bucket.plays * 0.1, 0, 100)
    byQuarterback[qb] = {
      quarterback: qb,
      plays: bucket.plays,
      adjustedEpa: bucket.adj,
      adjustedEpaPerPlay: perPlay,
      rating,
    }
  })

  const qbValues = Object.values(byQuarterback)
  const teamRating = qbValues.length ? qbValues.reduce((sum, qb) => sum + qb.rating, 0) / qbValues.length : 0

  return { byQuarterback, teamRating }
}

function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function simulateSeasonOutcomes(input: SeasonSimulationInput): SeasonSimulationResult {
  const iterations = input.iterations ?? 2000
  const rng = mulberry32(input.seed ?? 1)
  const sorRng = mulberry32((input.seed ?? 1) + 131)

  let totalWins = 0
  let winOut = 0
  let conferencePerfect = 0
  let playoffHits = 0
  const gameResults = input.schedule.map((game) => ({ opponentId: game.opponentId, winRate: 0 }))
  const conferenceGames = input.schedule.filter((g) => g.isConference).length

  for (let i = 0; i < iterations; i++) {
    let wins = 0
    let conferenceWins = 0
    input.schedule.forEach((game, idx) => {
      const ratingDiff =
        input.teamRating - game.opponentRating + (game.homeField ?? 0) * 1.5 + (input.specialTeamsRating ?? 0) * 0.1
      const prob = clampNumber(sigmoid(ratingDiff / 6 + input.offenseRating * 0.01 - input.defenseRating * 0.01), 0.05, 0.95)
      const result = rng() < prob
      if (result) wins += 1
      if (result && game.isConference) conferenceWins += 1
      if (result) gameResults[idx].winRate += 1
    })
    totalWins += wins
    if (wins === input.schedule.length) winOut += 1
    if (conferenceWins === conferenceGames && conferenceGames > 0) conferencePerfect += 1
    const playoffQualify =
      wins >= input.schedule.length - 1 ||
      (wins >= Math.ceil(input.schedule.length * 0.75) && conferenceWins >= Math.max(1, Math.floor(conferenceGames * 0.7)))
    if (playoffQualify) playoffHits += 1
  }

  gameResults.forEach((gr) => {
    gr.winRate = iterations ? gr.winRate / iterations : 0
  })

  const expectedWins = iterations ? totalWins / iterations : 0
  const winProbability = input.schedule.length ? expectedWins / input.schedule.length : 0
  const winOutProbability = iterations ? winOut / iterations : 0
  const conferenceWinProbability = iterations ? conferencePerfect / iterations : 0
  const playoffProbability = iterations ? playoffHits / iterations : 0
  const strengthOfSchedule = input.schedule.length
    ? input.schedule.reduce((sum, game) => sum + game.opponentRating, 0) / input.schedule.length
    : 0

  // Strength of record: how often an average team (rating 0) would match expected wins.
  let sorBetter = 0
  for (let i = 0; i < iterations; i++) {
    let wins = 0
    input.schedule.forEach((game) => {
      const prob = clampNumber(sigmoid((0 - game.opponentRating + (game.homeField ?? 0) * 1.5) / 6), 0.05, 0.95)
      if (sorRng() < prob) wins += 1
    })
    if (wins >= expectedWins) sorBetter += 1
  }
  const strengthOfRecord = iterations ? sorBetter / iterations : 0
  const gameControl = clampNumber(0.5 + (input.teamRating - strengthOfSchedule) / 40, 0, 1)

  return {
    winProbability,
    expectedWins,
    winOutProbability,
    conferenceWinProbability,
    playoffProbability,
    strengthOfSchedule,
    strengthOfRecord,
    gameControl,
    gameResults,
  }
}

export function computeGameControlMetric(
  timeline: WinProbabilitySummary,
  totalSeconds: number = GAME_LENGTH_SECONDS
): GameControlMetric {
  if (timeline.timeline.length === 0) {
    return { averageLeadWinProb: 0.5, timeLedPct: 0, dominationIndex: 0 }
  }
  const sorted = [...timeline.timeline].sort((a, b) => b.secondsRemaining - a.secondsRemaining)
  let lastTime = totalSeconds
  let weighted = 0
  let ledSeconds = 0

  sorted.forEach((pt) => {
    const delta = Math.max(0, lastTime - pt.secondsRemaining)
    weighted += pt.winProbability * delta
    if (pt.winProbability > 0.5) ledSeconds += delta
    lastTime = pt.secondsRemaining
  })

  if (lastTime > 0) {
    const tailWeight = timeline.timeline[timeline.timeline.length - 1]?.winProbability ?? 0.5
    weighted += tailWeight * lastTime
    if (tailWeight > 0.5) ledSeconds += lastTime
  }

  const averageLeadWinProb = weighted / totalSeconds
  const timeLedPct = ledSeconds / totalSeconds
  const dominationIndex = clampNumber((averageLeadWinProb + timeLedPct) / 2, 0, 1)
  return { averageLeadWinProb, timeLedPct, dominationIndex }
}

export function computeAdvancedAnalytics(
  box: BoxScoreMetrics,
  base: BaseCounts,
  drives: DriveRecord[] = [],
  defense?: DefensiveMetrics,
  events: PlayEvent[] = [],
  opponentBox?: BoxScoreMetrics,
  opponentBase?: BaseCounts,
  unit?: ChartUnit,
  specialTeams?: SpecialTeamsMetrics
): AdvancedAnalytics {
  const leveragePlays = drives.length ? drives.reduce((sum, d) => sum + d.play_ids.length, 0) : base.plays
  const leverageRate = base.plays ? leveragePlays / base.plays : 0
  const estimatedEPA = base.totalYards * 0.06 + base.scoringPlays * 2 - base.turnovers * 2
  const pressures = base.plays
  const havocRate = defense ? defense.havoc.rate : pressures ? (base.turnovers + base.penalties.count * 0.25) / pressures : 0
  const avgFieldPos =
    specialTeams?.fieldPosition.netStart ??
    (drives.length > 0
      ? drives.reduce((sum, d) => sum + (d.start_field_position ?? 50), 0) / drives.length
      : base.plays
      ? base.totalYards / base.plays
      : 0)

  const epa = computeEpaAggregates(events, drives)
  const expectedPointsModel = {
    latest: events.length
      ? computeExpectedPoints({
          down: events[0].down,
          distance: events[0].distance,
          yardLine: resolveYardLineForEvent(events[0]),
          clockSecondsRemaining: resolveClockRemaining(events[0]),
          scoreDiff: resolveScoreDifferential(events[0]),
          offenseTimeouts: events[0].timeouts_before?.team ?? events[0].offense_timeouts ?? null,
          defenseTimeouts: events[0].timeouts_before?.opponent ?? events[0].defense_timeouts ?? null,
        })
      : null,
    curve: EXPECTED_POINTS_CURVE.map((pt) => pt.ep),
  }
  const winProbability = computeWinProbabilitySummary(events, unit)
  const gameControl = computeGameControlMetric(winProbability)
  const teamProfile = buildWinExpectancyProfile(box, base)
  if (opponentBox) {
    teamProfile.yardsAllowed = opponentBox.totalYards
    teamProfile.successRateAllowed = opponentBox.successRate
    teamProfile.explosivePlaysAllowed = opponentBox.explosives
    teamProfile.turnoversAllowed = opponentBox.turnovers
  }
  const opponentProfile = opponentBox
    ? {
        ...buildWinExpectancyProfile(opponentBox, opponentBase ?? base),
        yardsAllowed: box.totalYards,
        successRateAllowed: box.successRate,
        explosivePlaysAllowed: box.explosives,
        turnoversAllowed: base.turnovers,
      }
    : undefined
  const postGameWinExpectancy = computePostGameWinExpectancy(teamProfile, opponentProfile)
  const spPlus = computeSpPlusLikeRatings(events, epa, havocRate, specialTeams)
  const anyA = computeAdjustedNetYardsPerAttempt(events, unit)
  const qbr = computeQuarterbackRatings(events, epa, defense ? defense.havoc.rate * 10 : 0)
  const schedule: SimulatedGame[] = opponentBox
    ? [
        {
          opponentId: 'opponent',
          opponentName: opponentBox ? 'opponent' : undefined,
          opponentRating: opponentBox.yardsPerPlay * 10,
          isConference: true,
          homeField: 0,
        },
      ]
    : []
  const seasonSimulation = schedule.length
    ? simulateSeasonOutcomes({
        teamRating: spPlus.overall,
        offenseRating: spPlus.offense,
        defenseRating: spPlus.defense,
        specialTeamsRating: spPlus.specialTeams,
        schedule,
        iterations: 750,
        seed: 7,
      })
    : undefined

  return {
    estimatedEPA,
    estimatedEPAperPlay: base.plays ? estimatedEPA / base.plays : 0,
    havocRate,
    leverageRate,
    fieldPositionAdvantage: avgFieldPos ?? 0,
    expectedPointsModel,
    epa,
    winProbability,
    postGameWinExpectancy,
    spPlus,
    anyA,
    qbr,
    seasonSimulation,
    gameControl,
  }
}

export function buildStatsStack(params: {
  events: PlayEvent[]
  drives?: DriveRecord[]
  opponentEvents?: PlayEvent[]
  opponentDrives?: DriveRecord[]
  opponentBox?: BoxScoreMetrics
  unit?: ChartUnit
  gameId?: string
  seasonId?: string | null
  opponentId?: string | null
}) {
  const scopedEvents = filterEventsForUnit(params.events, params.unit)
  const defensiveEvents = filterDefensivePlays(params.events, 'DEFENSE')
  const base = computeBaseCounts(scopedEvents)
  const opponentBase = params.opponentEvents ? computeBaseCounts(params.opponentEvents) : undefined
  const box = computeBoxScore(scopedEvents, base, params.unit)
  const drives = params.drives && params.drives.length > 0 ? params.drives : deriveDriveRecords(scopedEvents, params.unit)
  const allDrives = params.drives && params.drives.length > 0 ? params.drives : deriveDriveRecords(params.events, params.unit)
  const opponentDerivedDrives =
    params.opponentDrives && params.opponentDrives.length > 0
      ? params.opponentDrives
      : params.opponentEvents
      ? deriveDriveRecords(params.opponentEvents)
      : []
  const defensiveDrives =
    params.drives && params.drives.length > 0 ? params.drives : deriveDriveRecords(defensiveEvents, 'DEFENSE')
  const defenseMetrics = computeDefensiveMetrics(defensiveEvents, defensiveDrives)
  const core = computeCoreWinningMetrics(box, params.opponentBox)
  const specialTeams = computeSpecialTeamsMetrics(params.events, allDrives, params.opponentEvents ?? [], opponentDerivedDrives)
  const advanced = computeAdvancedAnalytics(
    box,
    base,
    drives,
    defenseMetrics,
    scopedEvents,
    params.opponentBox,
    opponentBase,
    params.unit,
    specialTeams
  )
  const turnovers = computeTurnoverMetrics(base, { opponentBase, opponentBox: params.opponentBox, unitHint: params.unit })
  const explosives = computeExplosiveMetrics(scopedEvents, params.unit)
  const redZone = computeRedZoneMetrics(scopedEvents, drives, params.unit)
  const scoring = computeScoringSummary(base, 1)
  const success = computeSuccessRate(scopedEvents, params.unit)
  const ypp = computeYardsPerPlay(scopedEvents, params.unit)
  const timeouts = latestTimeoutState(params.events)
  const game: GameMetricSnapshot = {
    gameId: params.gameId ?? scopedEvents[0]?.game_id ?? undefined,
    seasonId: params.seasonId ?? scopedEvents[0]?.season_id ?? null,
    opponentId: params.opponentId ?? scopedEvents[0]?.opponent_id ?? null,
    turnover: turnovers,
    specialTeams,
    timeouts,
    explosives,
    scoring,
    redZone,
    defense: defenseMetrics,
    efficiency: {
      yardsPerPlay: ypp,
      success,
      thirdDown: box.thirdDown,
      fourthDown: box.fourthDown,
      lateDown: box.lateDown,
    },
  }
  return {
    base,
    box,
    core,
    advanced,
    drives,
    turnovers,
    explosives,
    redZone,
    scoring,
    defense: defenseMetrics,
    specialTeams,
    timeouts,
    game,
  }
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
    specialTeams: {
      fieldPosition: { offenseStart: null, defenseStart: null, netStart: null },
      kickoffReturns: { returns: 0, yards: 0, average: 0, longest: 0, touchdowns: 0 },
      puntReturns: { returns: 0, yards: 0, average: 0, longest: 0, touchdowns: 0 },
      fieldGoals: {
        overallPct: 0,
        extraPointPct: 0,
        longestMade: 0,
        bands: {
          inside30: { attempts: 0, made: 0, pct: 0 },
          from30to39: { attempts: 0, made: 0, pct: 0 },
          from40to49: { attempts: 0, made: 0, pct: 0 },
          from50Plus: { attempts: 0, made: 0, pct: 0 },
        },
      },
      punting: {
        punts: 0,
        gross: 0,
        net: 0,
        touchbackPct: 0,
        inside20Pct: 0,
        longest: 0,
        opponentAverageStart: null,
      },
      kickoff: { touchbackPct: 0, opponentAverageStart: null, longestReturnAllowed: 0 },
    },
    defense: {
      takeawaysPerGame: 0,
      takeawaysByType: emptyTurnoverBuckets(),
      thirdDown: { attempts: 0, stops: 0, conversionsAllowed: 0, stopRate: 0, situational: emptySituational() },
      fourthDown: { attempts: 0, stops: 0, conversionsAllowed: 0, stopRate: 0, situational: emptySituational() },
      threeAndOutRate: 0,
      havocRate: 0,
      tflPerGame: 0,
      sackPerGame: 0,
      drivesFaced: 0,
      pointsAllowedPerGame: 0,
      pointsAllowedPerDrive: 0,
      redZone: { scoringPct: 0, tdPct: 0 },
      situational: {
        takeaways: emptySituational(),
        havoc: emptySituational(),
        tfl: emptySituational(),
      },
    },
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
  const defenseGames = games.filter((g) => g.defense)
  const defenseCount = defenseGames.length
  const defenseSum = (fn: (def: DefensiveMetrics) => number) =>
    defenseGames.reduce((acc, g) => acc + (g.defense ? fn(g.defense) : 0), 0)
  const mergedTakeawaySituational = defenseGames.reduce(
    (acc, g) => (g.defense ? mergeSituational(acc, g.defense.takeaways.situational) : acc),
    emptySituational()
  )
  const mergedHavocSituational = defenseGames.reduce(
    (acc, g) => (g.defense ? mergeSituational(acc, g.defense.havoc.situational) : acc),
    emptySituational()
  )
  const mergedTflSituational = defenseGames.reduce(
    (acc, g) => (g.defense ? mergeSituational(acc, g.defense.tfls.situational) : acc),
    emptySituational()
  )
  const mergedThirdSituational = defenseGames.reduce(
    (acc, g) => (g.defense ? mergeSituational(acc, g.defense.thirdDown.situational) : acc),
    emptySituational()
  )
  const mergedFourthSituational = defenseGames.reduce(
    (acc, g) => (g.defense ? mergeSituational(acc, g.defense.fourthDown.situational) : acc),
    emptySituational()
  )
  const takeawaysByType = defenseGames.reduce((acc, g) => {
    if (!g.defense) return acc
    acc.interceptions += g.defense.takeaways.byType.interceptions
    acc.fumbles += g.defense.takeaways.byType.fumbles
    acc.downs += g.defense.takeaways.byType.downs
    acc.blockedKicks += g.defense.takeaways.byType.blockedKicks
    acc.other += g.defense.takeaways.byType.other
    return acc
  }, emptyTurnoverBuckets())
  const thirdDownDefense = defenseGames.reduce(
    (acc, g) => {
      if (!g.defense) return acc
      acc.attempts += g.defense.thirdDown.attempts
      acc.stops += g.defense.thirdDown.stops
      acc.conversionsAllowed += g.defense.thirdDown.conversionsAllowed
      return acc
    },
    { attempts: 0, stops: 0, conversionsAllowed: 0 }
  )
  const fourthDownDefense = defenseGames.reduce(
    (acc, g) => {
      if (!g.defense) return acc
      acc.attempts += g.defense.fourthDown.attempts
      acc.stops += g.defense.fourthDown.stops
      acc.conversionsAllowed += g.defense.fourthDown.conversionsAllowed
      return acc
    },
    { attempts: 0, stops: 0, conversionsAllowed: 0 }
  )
  const totalDefensiveSnaps = defenseSum((d) => d.snaps)
  const totalHavocPlays = defenseSum((d) => d.havoc.havocPlays)
  const totalDefenseDrives = defenseSum((d) => d.drives.drivesFaced)
  const totalThreeAndOuts = defenseSum((d) => d.threeAndOuts.count)
  const totalPointsAllowed = defenseSum((d) => d.drives.pointsAllowed)
  const totalRedZoneTrips = defenseSum((d) => d.redZone.trips)
  const totalRedZoneScores = defenseSum((d) => d.redZone.scores)
  const totalRedZoneTds = defenseSum((d) => d.redZone.touchdowns)
  const fieldPosOffenseAvg = averageNumber(games.map((g) => g.specialTeams?.fieldPosition.offenseStart ?? null))
  const fieldPosDefenseAvg = averageNumber(games.map((g) => g.specialTeams?.fieldPosition.defenseStart ?? null))
  const kickoffReturnAgg = (() => {
    let returns = 0
    let yards = 0
    let touchdowns = 0
    let longest = 0
    games.forEach((g) => {
      const line = g.specialTeams?.kickoffReturns.team
      if (!line) return
      returns += line.returns
      yards += line.yards
      touchdowns += line.touchdowns
      if (line.longest > longest) longest = line.longest
    })
    return {
      returns,
      yards,
      touchdowns,
      longest,
      average: returns ? yards / Math.max(1, returns) : 0,
    }
  })()
  const puntReturnAgg = (() => {
    let returns = 0
    let yards = 0
    let touchdowns = 0
    let longest = 0
    games.forEach((g) => {
      const line = g.specialTeams?.puntReturns.team
      if (!line) return
      returns += line.returns
      yards += line.yards
      touchdowns += line.touchdowns
      if (line.longest > longest) longest = line.longest
    })
    return {
      returns,
      yards,
      touchdowns,
      longest,
      average: returns ? yards / Math.max(1, returns) : 0,
    }
  })()
  const fieldGoalAgg = (() => {
    let attempts = 0
    let made = 0
    let xpAttempts = 0
    let xpMade = 0
    let longestMade = 0
    const bands = {
      inside30: { attempts: 0, made: 0 },
      from30to39: { attempts: 0, made: 0 },
      from40to49: { attempts: 0, made: 0 },
      from50Plus: { attempts: 0, made: 0 },
    }
    games.forEach((g) => {
      const fg = g.specialTeams?.fieldGoals
      if (!fg) return
      attempts += fg.overall.attempts
      made += fg.overall.made
      xpAttempts += fg.extraPoint.attempts
      xpMade += fg.extraPoint.made
      longestMade = Math.max(longestMade, fg.longestMade)
      ;(Object.keys(bands) as Array<keyof typeof bands>).forEach((key) => {
        bands[key].attempts += fg.bands[key].attempts
        bands[key].made += fg.bands[key].made
      })
    })
    const pct = (m: number, a: number) => (a ? m / a : 0)
    return {
      overallPct: pct(made, attempts),
      extraPointPct: pct(xpMade, xpAttempts),
      longestMade,
      bands: {
        inside30: { attempts: bands.inside30.attempts, made: bands.inside30.made, pct: pct(bands.inside30.made, bands.inside30.attempts) },
        from30to39: {
          attempts: bands.from30to39.attempts,
          made: bands.from30to39.made,
          pct: pct(bands.from30to39.made, bands.from30to39.attempts),
        },
        from40to49: {
          attempts: bands.from40to49.attempts,
          made: bands.from40to49.made,
          pct: pct(bands.from40to49.made, bands.from40to49.attempts),
        },
        from50Plus: {
          attempts: bands.from50Plus.attempts,
          made: bands.from50Plus.made,
          pct: pct(bands.from50Plus.made, bands.from50Plus.attempts),
        },
      },
    }
  })()
  const puntingAgg = (() => {
    let punts = 0
    let grossYards = 0
    let netYards = 0
    let touchbacks = 0
    let inside20 = 0
    let longest = 0
    let opponentStartSum = 0
    let opponentStartCount = 0
    games.forEach((g) => {
      const punt = g.specialTeams?.punting.team
      if (!punt) return
      punts += punt.punts
      grossYards += punt.yards
      netYards += punt.net * punt.punts
      touchbacks += punt.touchbacks
      inside20 += punt.inside20
      longest = Math.max(longest, punt.longest)
      if (punt.opponentAverageStart != null) {
        opponentStartSum += punt.opponentAverageStart * punt.punts
        opponentStartCount += punt.punts
      }
    })
    return {
      punts,
      gross: punts ? grossYards / punts : 0,
      net: punts ? netYards / punts : 0,
      touchbackPct: punts ? touchbacks / punts : 0,
      inside20Pct: punts ? inside20 / punts : 0,
      longest,
      opponentAverageStart: opponentStartCount ? opponentStartSum / opponentStartCount : null,
    }
  })()
  const kickoffAgg = (() => {
    let kicks = 0
    let touchbacks = 0
    let longestReturnAllowed = 0
    let opponentStartSum = 0
    let opponentStartCount = 0
    games.forEach((g) => {
      const ko = g.specialTeams?.kickoff
      if (!ko) return
      kicks += ko.kicks
      touchbacks += ko.touchbacks
      longestReturnAllowed = Math.max(longestReturnAllowed, ko.longestReturnAllowed)
      if (ko.opponentAverageStart != null) {
        opponentStartSum += ko.opponentAverageStart * ko.kicks
        opponentStartCount += ko.kicks
      }
    })
    return {
      touchbackPct: kicks ? touchbacks / kicks : 0,
      opponentAverageStart: opponentStartCount ? opponentStartSum / opponentStartCount : null,
      longestReturnAllowed,
    }
  })()

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
    specialTeams: {
      fieldPosition: {
        offenseStart: fieldPosOffenseAvg,
        defenseStart: fieldPosDefenseAvg,
        netStart:
          fieldPosOffenseAvg != null && fieldPosDefenseAvg != null ? fieldPosOffenseAvg - fieldPosDefenseAvg : null,
      },
      kickoffReturns: {
        returns: kickoffReturnAgg.returns,
        yards: kickoffReturnAgg.yards,
        average: kickoffReturnAgg.average,
        longest: kickoffReturnAgg.longest,
        touchdowns: kickoffReturnAgg.touchdowns,
      },
      puntReturns: {
        returns: puntReturnAgg.returns,
        yards: puntReturnAgg.yards,
        average: puntReturnAgg.average,
        longest: puntReturnAgg.longest,
        touchdowns: puntReturnAgg.touchdowns,
      },
      fieldGoals: fieldGoalAgg,
      punting: puntingAgg,
      kickoff: kickoffAgg,
    },
    defense: {
      takeawaysPerGame: defenseCount ? defenseSum((d) => d.takeaways.total) / defenseCount : 0,
      takeawaysByType,
      thirdDown: {
        attempts: thirdDownDefense.attempts,
        stops: thirdDownDefense.stops,
        conversionsAllowed: thirdDownDefense.conversionsAllowed,
        stopRate: thirdDownDefense.attempts ? thirdDownDefense.stops / thirdDownDefense.attempts : 0,
        situational: mergedThirdSituational,
      },
      fourthDown: {
        attempts: fourthDownDefense.attempts,
        stops: fourthDownDefense.stops,
        conversionsAllowed: fourthDownDefense.conversionsAllowed,
        stopRate: fourthDownDefense.attempts ? fourthDownDefense.stops / fourthDownDefense.attempts : 0,
        situational: mergedFourthSituational,
      },
      threeAndOutRate: totalDefenseDrives ? totalThreeAndOuts / totalDefenseDrives : 0,
      havocRate: totalDefensiveSnaps ? totalHavocPlays / totalDefensiveSnaps : 0,
      tflPerGame: defenseCount ? defenseSum((d) => d.tfls.total) / defenseCount : 0,
      sackPerGame: defenseCount ? defenseSum((d) => d.tfls.sacks) / defenseCount : 0,
      drivesFaced: totalDefenseDrives,
      pointsAllowedPerGame: defenseCount ? totalPointsAllowed / defenseCount : 0,
      pointsAllowedPerDrive: totalDefenseDrives ? totalPointsAllowed / totalDefenseDrives : 0,
      redZone: {
        scoringPct: totalRedZoneTrips ? totalRedZoneScores / totalRedZoneTrips : 0,
        tdPct: totalRedZoneTrips ? totalRedZoneTds / totalRedZoneTrips : 0,
      },
      situational: {
        takeaways: mergedTakeawaySituational,
        havoc: mergedHavocSituational,
        tfl: mergedTflSituational,
      },
    },
  }
}
export function projectSeason(
  games: { box: BoxScoreMetrics; core: CoreWinningMetrics; advanced?: AdvancedAnalytics }[],
  schedule: SimulatedGame[] = []
): SeasonProjection {
  const gamesModeled = games.length
  if (gamesModeled === 0) {
    return {
      gamesModeled: 0,
      projectedWinRate: 0,
      projectedWinOut: 0,
      projectedConferenceWinRate: 0,
      projectedPlayoffRate: 0,
      projectedPointsPerGame: 0,
      projectedPointsAllowed: 0,
      strengthOfSchedule: 0,
      strengthOfRecord: 0,
      gameControl: 0.5,
      notes: 'Insufficient data; chart games to unlock projections.',
    }
  }

  const avgPoints =
    games.reduce(
      (sum, g) => sum + (g.core.pointsPerDrive * Math.max(g.box.plays, 1)) / Math.max(g.box.lateDown.attempts || 1, 1),
      0
    ) / gamesModeled
  const avgAgainst = Math.max(0, 24 - (games.reduce((sum, g) => sum + g.core.explosiveMargin, 0) / gamesModeled) * 2)

  const avgOffRating =
    games.reduce((sum, g) => sum + (g.advanced?.spPlus.offense ?? g.core.pointsPerDrive * 120), 0) / gamesModeled
  const avgDefRating =
    games.reduce((sum, g) => sum + (g.advanced?.spPlus.defense ?? (1 - g.core.successMargin) * 100), 0) / gamesModeled
  const avgStr =
    games.reduce((sum, g) => sum + (g.advanced?.spPlus.specialTeams ?? 50), 0) / gamesModeled
  const teamRating = clampNumber((avgOffRating - (100 - avgDefRating)) * 0.6 + avgStr * 0.4, 0, 120)

  const remaining = Math.max(1, 12 - gamesModeled)
  const effectiveSchedule: SimulatedGame[] =
    schedule.length > 0
      ? schedule
      : Array.from({ length: remaining }).map(
          (_, idx): SimulatedGame => ({
            opponentId: `sim-${idx + 1}`,
            opponentName: null,
            opponentRating: clampNumber(teamRating - 5 + idx, 20, 95),
            isConference: idx < Math.max(1, Math.floor(remaining / 2)),
            homeField: (idx % 2 === 0 ? 1 : -1) as 1 | -1,
          })
        )

  const simulation = simulateSeasonOutcomes({
    teamRating,
    offenseRating: avgOffRating,
    defenseRating: avgDefRating,
    specialTeamsRating: avgStr,
    schedule: effectiveSchedule,
    iterations: 1200,
    seed: 17,
  })

  return {
    gamesModeled,
    projectedWinRate: simulation.winProbability,
    projectedWinOut: simulation.winOutProbability,
    projectedConferenceWinRate: simulation.conferenceWinProbability,
    projectedPlayoffRate: simulation.playoffProbability,
    projectedPointsPerGame: avgPoints,
    projectedPointsAllowed: avgAgainst,
    strengthOfSchedule: simulation.strengthOfSchedule,
    strengthOfRecord: simulation.strengthOfRecord,
    gameControl: simulation.gameControl,
    notes: 'Projection uses deterministic Monte Carlo on team/offense/defense/special teams efficiency and opponent strength.',
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
