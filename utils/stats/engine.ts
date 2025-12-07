import {
  AdvancedAnalytics,
  BaseCounts,
  BoxScoreMetrics,
  ChartUnit,
  CoreWinningMetrics,
  FieldZone,
  PlayEvent,
  SeasonProjection,
  DriveRecord,
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
}

export function yardLineFromBallOn(ball_on: string | null): number {
  if (!ball_on) return 50
  const num = Number(ball_on.replace(/[^0-9]/g, ''))
  if (Number.isNaN(num)) return 50
  const upper = ball_on.toUpperCase()
  if (upper.startsWith('O')) return num
  if (upper.startsWith('D') || upper.startsWith('X')) return 100 - num
  return num
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

export function mapChartEventToPlayEvent(row: ChartEventRowLike, defaults?: { teamId?: string; opponent?: string | null }): PlayEvent {
  const yardLine = yardLineFromBallOn(row.ball_on ?? null)
  const opponentName =
    row.opponent_name ?? (typeof row.opponent === 'string' ? row.opponent : defaults?.opponent ?? null)

  const normalized: PlayEvent = {
    id: row.id,
    team_id: row.team_id || defaults?.teamId || '',
    opponent_id: row.opponent_id ?? null,
    opponent_name: opponentName,
    game_id: row.game_id || '',
    game_session_id: row.game_session_id ?? null,
    season_id: row.season_id ?? null,
    season_label: row.season_label ?? null,
    sequence: row.sequence ?? null,
    quarter: row.quarter ?? null,
    clock_seconds: row.clock_seconds ?? null,
    absolute_clock_seconds:
      row.quarter != null && row.clock_seconds != null ? (row.quarter - 1) * 900 + (900 - row.clock_seconds) : null,
    down: row.down ?? null,
    distance: row.distance ?? null,
    ball_on: row.ball_on ?? null,
    hash_mark: row.hash_mark ?? null,
    field_position: typeof row.field_position === 'number' ? row.field_position : 100 - yardLine,
    field_zone: fieldZone(yardLine),
    possession: row.possession ?? null,
    offense_score_before: row.offense_score_before ?? null,
    defense_score_before: row.defense_score_before ?? null,
    offense_score_after: row.offense_score_after ?? null,
    defense_score_after: row.defense_score_after ?? null,
    offense_timeouts: row.offense_timeouts ?? null,
    defense_timeouts: row.defense_timeouts ?? null,
    drive_number: row.drive_number ?? null,
    drive_id: row.drive_id ?? null,
    is_drive_start: row.is_drive_start ?? false,
    is_drive_end: row.is_drive_end ?? false,
    is_half_start: row.is_half_start ?? false,
    is_half_end: row.is_half_end ?? false,
    is_game_start: row.is_game_start ?? false,
    is_game_end: row.is_game_end ?? false,
    play_call: row.play_call ?? null,
    result: row.result ?? null,
    gained_yards: row.gained_yards ?? null,
    explosive: typeof row.explosive === 'boolean' ? row.explosive : isExplosivePlay({ ...(row as PlayEvent), gained_yards: row.gained_yards ?? null }),
    turnover: row.turnover ?? null,
    first_down: row.first_down ?? null,
    play_family: row.play_family ?? (row.st_play_type ? 'SPECIAL_TEAMS' : null),
    run_concept: row.run_concept ?? null,
    pass_concept: row.pass_concept ?? null,
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
    series_tag: row.series_tag ?? null,
    offensive_personnel_code: row.offensive_personnel_code ?? null,
    offensive_formation_id: row.offensive_formation_id ?? null,
    backfield_code: row.backfield_code ?? null,
    qb_alignment: row.qb_alignment ?? null,
    defensive_structure_id: row.defensive_structure_id ?? null,
    front_code: row.front_code ?? null,
    coverage_shell_pre: row.coverage_shell_pre ?? null,
    coverage_shell_post: row.coverage_shell_post ?? null,
    pressure_code: row.pressure_code ?? null,
    strength: row.strength ?? null,
    alignment_tags: row.alignment_tags ?? null,
    scoring: row.scoring ?? null,
    turnover_detail: row.turnover_detail ?? null,
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
      (ev.penalties || []).forEach((p) => {
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
  events.forEach((ev) => {
    if (ev.drive_number != null) drives.add(ev.drive_number)
  })

  const scoringPlays = events.filter((ev) => Boolean(ev.scoring) || isScoringPlay(ev.result)).length

  const base: BaseCounts = {
    plays: events.length,
    totalYards: events.reduce((sum, ev) => sum + (ev.gained_yards ?? 0), 0),
    explosives: events.filter(isExplosivePlay).length,
    scoringPlays,
    turnovers: events.filter((ev) => ev.turnover).length,
    penalties,
    firstDowns: events.filter((ev) => ev.first_down).length,
    drives: drives.size || (events.length ? 1 : 0),
  }

  return base
}

export function computeBoxScore(events: PlayEvent[]): BoxScoreMetrics {
  const base = computeBaseCounts(events)
  const successCandidates = events.filter(
    (ev) => ev.down != null && ev.distance != null && ev.gained_yards != null
  )
  const successes = successCandidates.filter(isSuccessfulPlay)
  const lateDown = successCandidates.filter((ev) => (ev.down ?? 0) >= 3)
  const lateDownConversions = lateDown.filter((ev) => (ev.gained_yards ?? 0) >= (ev.distance ?? Number.POSITIVE_INFINITY))
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
    pointsPerDrive: box.plays && box.lateDown.attempts
      ? (box.scoringPlays * 7 + Math.max(0, box.lateDown.conversions - box.turnovers) * 3) / Math.max(box.lateDown.attempts, 1)
      : 0,
    turnoverMargin,
    explosiveMargin,
    successMargin,
    redZoneEfficiency: box.redZoneTrips ? box.scoringPlays / box.redZoneTrips : 0,
  }
}

export function computeAdvancedAnalytics(box: BoxScoreMetrics, base: BaseCounts, drives: DriveRecord[] = []): AdvancedAnalytics {
  const leveragePlays = drives.length
    ? drives.reduce((sum, d) => sum + d.play_ids.length, 0)
    : base.plays
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

  const avgPoints = games.reduce((sum, g) => sum + g.core.pointsPerDrive * Math.max(g.box.plays, 1) / Math.max(g.box.lateDown.attempts || 1, 1), 0) / gamesModeled
  const avgAgainst = Math.max(0, 24 - (games.reduce((sum, g) => sum + g.core.explosiveMargin, 0) / gamesModeled) * 2)
  const projectedWinRate = Math.min(
    0.99,
    Math.max(0.01, 0.5 + (games.reduce((sum, g) => sum + g.core.successMargin + g.core.turnoverMargin * 0.05, 0) / gamesModeled) * 0.3)
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
