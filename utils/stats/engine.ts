
import {
  AdvancedAnalytics,
  BaseCounts,
  BoxScoreMetrics,
  BoundaryFlags,
  ChartUnit,
  CoreWinningMetrics,
  DefensiveContext,
  DriveRecord,
  DriveResultType,
  FieldZone,
  OffensiveContext,
  PlayEvent,
  ScoreState,
  ScoringEvent,
  SeasonProjection,
  SpecialTeamsContext,
  TimeoutState,
  TurnoverEvent,
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
  if (yardLine <= 75) return 'OPEN_FIELD'
  if (yardLine <= 90) return 'SCORING_RANGE'
  return 'RED_ZONE'
}

export function bucketDownDistance(down?: number | null, distance?: number | null) {
  if (!down || !distance) return 'any down'
  if (distance <= 2) return `short ${ordinal(down)}`
  if (distance <= 6) return `medium ${ordinal(down)}`
  return `long ${ordinal(down)}`
}

function ordinal(n: number) {
  const suffix = ['th', 'st', 'nd', 'rd'][((n + 90) % 100 - 10) % 10] || 'th'
  return `${n}${suffix}`
}

export function isSuccessfulPlay(ev: PlayEvent) {
  if (ev.down == null || ev.distance == null || ev.gained_yards == null) return false
  if (ev.down === 1) return ev.gained_yards >= ev.distance * 0.5
  if (ev.down === 2) return ev.gained_yards >= ev.distance * 0.7
  return ev.gained_yards >= ev.distance
}

export function isExplosivePlay(ev: PlayEvent) {
  const yards = ev.gained_yards ?? 0
  if (yards >= 40) return true
  if (ev.play_family === 'PASS') return yards >= 15
  if (ev.play_family === 'SPECIAL_TEAMS') return yards >= 25
  return yards >= 12
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
function normalizeScoringEvent(row: ChartEventRowLike): ScoringEvent | null {
  if (row.scoring) {
    return {
      ...row.scoring,
      scoring_team_side: row.scoring.scoring_team_side ?? row.scoring_team_side ?? 'TEAM',
      points: typeof row.scoring.points === 'number' ? row.scoring.points : 0,
    }
  }

  const points = row.scoring_points
  const type = (row.scoring_type as ScoringEvent['type'] | undefined) ?? null

  if (points != null || type) {
    const creditedTo: ChartUnit | null =
      row.play_family === 'SPECIAL_TEAMS' ? 'SPECIAL_TEAMS' : ((row.possession as ChartUnit | null) ?? null)
    return {
      team: (row.possession as ChartUnit | null) ?? null,
      scoring_team_id: row.team_id ?? null,
      scoring_team_side: row.scoring_team_side ?? 'TEAM',
      points: points ?? 0,
      creditedTo,
      type: (type as ScoringEvent['type']) || 'OTHER',
      returnYards: row.st_return_yards ?? null,
    }
  }

  if (row.result && isScoringPlay(row.result)) {
    const creditedTo: ChartUnit | null =
      row.play_family === 'SPECIAL_TEAMS' ? 'SPECIAL_TEAMS' : ((row.possession as ChartUnit | null) ?? null)
    return {
      team: (row.possession as ChartUnit | null) ?? null,
      scoring_team_id: row.team_id ?? null,
      scoring_team_side: 'TEAM',
      points: derivePointsFromResult(row.result),
      creditedTo,
      type: guessScoringType(row.result),
      returnYards: row.st_return_yards ?? null,
    }
  }

  return null
}

function normalizeTurnoverEvent(row: ChartEventRowLike): TurnoverEvent | null {
  if (row.turnover_detail) {
    const detailType: TurnoverEvent['type'] | null =
      row.turnover_detail.type ??
      (row.turnover_type ? (guessTurnoverType(row.turnover_type) ?? (row.turnover_type as TurnoverEvent['type'])) : null)
    return {
      ...row.turnover_detail,
      lostBySide: row.turnover_detail.lostBySide ?? 'TEAM',
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
      lostBy: (row.possession as ChartUnit | null) ?? null,
      lostBySide: 'TEAM',
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

export function computeBoxScore(events: PlayEvent[], precomputedBase?: BaseCounts): BoxScoreMetrics {
  const base = precomputedBase ?? computeBaseCounts(events)
  const successCandidates = events.filter((ev) => ev.down != null && ev.distance != null && ev.gained_yards != null)
  const successes = successCandidates.filter(isSuccessfulPlay)
  const lateDown = successCandidates.filter((ev) => (ev.down ?? 0) >= 3)
  const lateDownConversions = lateDown.filter(
    (ev) => (ev.gained_yards ?? 0) >= (ev.distance ?? Number.POSITIVE_INFINITY)
  )
  const redZoneDrives = new Set<number>()
  events.forEach((ev) => {
    if (ev.field_zone === 'RED_ZONE' && ev.drive_number != null) {
      redZoneDrives.add(ev.drive_number)
    }
  })
  const avgStart =
    events.length > 0
      ? events.reduce((sum, ev) => sum + (ev.field_position ?? yardLineFromBallOn(ev.ball_on)), 0) / events.length
      : null

  return {
    plays: base.plays,
    totalYards: base.totalYards,
    yardsPerPlay: base.plays ? base.totalYards / base.plays : 0,
    explosives: base.explosives,
    explosiveRate: base.plays ? base.explosives / base.plays : 0,
    turnovers: base.turnovers,
    scoringPlays: base.scoringPlays,
    successRate: successCandidates.length ? successes.length / successCandidates.length : 0,
    lateDown: {
      attempts: lateDown.length,
      conversions: lateDownConversions.length,
      rate: lateDown.length ? lateDownConversions.length / lateDown.length : 0,
    },
    redZoneTrips: redZoneDrives.size,
    averageStart: avgStart,
    averageDepth: successCandidates.length
      ? successCandidates.reduce((sum, ev) => sum + (ev.distance ?? 0), 0) / successCandidates.length
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
  opponentBox?: BoxScoreMetrics
  unit?: ChartUnit
}) {
  const base = computeBaseCounts(params.events)
  const box = computeBoxScore(params.events, base)
  const drives = params.drives && params.drives.length > 0 ? params.drives : deriveDriveRecords(params.events, params.unit)
  const core = computeCoreWinningMetrics(box, params.opponentBox)
  const advanced = computeAdvancedAnalytics(box, base, drives)
  return { base, box, core, advanced, drives }
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
