import { strictEqual, ok } from 'node:assert/strict'
import test from 'node:test'
import {
  buildStatsStack,
  buildTendencyLens,
  computeAdvancedAnalytics,
  computeBoxScore,
  computeBaseCounts,
  computeCoreWinningMetrics,
  deriveDriveRecords,
  mapChartEventToPlayEvent,
  projectSeason,
  yardLineFromBallOn,
} from '../../utils/stats/engine'
import type { PlayEvent } from '../../utils/stats/types'

const basePlays: PlayEvent[] = [
  {
    id: 'p1',
    team_id: 'team-1',
    opponent_name: 'Opp',
    game_id: 'game-1',
    quarter: 1,
    clock_seconds: 720,
    down: 1,
    distance: 10,
    ball_on: 'O25',
    field_position: 25,
    play_call: 'Inside zone',
    gained_yards: 6,
    play_family: 'RUN',
    drive_number: 1,
    explosive: false,
    turnover: false,
    penalties: [],
  },
  {
    id: 'p2',
    team_id: 'team-1',
    opponent_name: 'Opp',
    game_id: 'game-1',
    quarter: 1,
    clock_seconds: 705,
    down: 2,
    distance: 4,
    ball_on: 'O31',
    field_position: 31,
    play_call: 'Duo',
    gained_yards: 5,
    play_family: 'RUN',
    drive_number: 1,
    first_down: true,
    explosive: false,
    turnover: false,
    penalties: [],
  },
  {
    id: 'p3',
    team_id: 'team-1',
    opponent_name: 'Opp',
    game_id: 'game-1',
    quarter: 1,
    clock_seconds: 660,
    down: 1,
    distance: 10,
    ball_on: 'O40',
    field_position: 40,
    play_call: 'Flood',
    gained_yards: 22,
    play_family: 'PASS',
    drive_number: 1,
    explosive: true,
    turnover: false,
    penalties: [],
  },
]

test('mapChartEventToPlayEvent normalizes field zone and clock', () => {
  const mapped = mapChartEventToPlayEvent({
    ...basePlays[0],
    ball_on: 'O12',
    quarter: 2,
    clock_seconds: 450,
    offense_score_before: 7,
    defense_score_before: 3,
    offense_score_after: 14,
    defense_score_after: 3,
    offense_timeouts: 2,
    defense_timeouts: 3,
  })
  strictEqual(mapped.field_zone, 'COMING_OUT')
  strictEqual(mapped.absolute_clock_seconds, (2 - 1) * 900 + (900 - 450))
  strictEqual(mapped.score_before?.team, 7)
  strictEqual(mapped.score_after?.team, 14)
  strictEqual(mapped.timeouts_before?.team, 2)
})

test('computeBoxScore returns deterministic aggregates', () => {
  const box = computeBoxScore(basePlays)
  strictEqual(box.plays, 3)
  strictEqual(box.totalYards, 33)
  strictEqual(box.explosives, 1)
  strictEqual(Math.round(box.yardsPerPlay * 10) / 10, 11)
  strictEqual(box.successRate, 1)
  strictEqual(box.lateDown.attempts, 0)
})

test('buildStatsStack layers outputs consistently', () => {
  const stack = buildStatsStack({ events: basePlays })
  strictEqual(stack.base.plays, basePlays.length)
  strictEqual(stack.box.totalYards, 33)
  ok(stack.core.pointsPerDrive >= 0)
  ok(stack.advanced.estimatedEPAperPlay >= 0)
})

test('core/advanced metrics stack on box results', () => {
  const box = computeBoxScore(basePlays)
  const opponentBox = computeBoxScore([
    { ...basePlays[0], id: 'opp-1', team_id: 'opp', gained_yards: 2, play_family: 'RUN' },
  ])
  const core = computeCoreWinningMetrics(box, opponentBox)
  ok(core.explosiveMargin > 0)
  const adv = computeAdvancedAnalytics(box, computeBaseCounts(basePlays))
  ok(Number.isFinite(adv.estimatedEPAperPlay))
})

test('deriveDriveRecords captures drive boundaries', () => {
  const driveEvents: PlayEvent[] = [
    {
      ...basePlays[0],
      id: 'd1p1',
      drive_number: 1,
      absolute_clock_seconds: 10,
      score_before: { team: 0, opponent: 0 },
      is_drive_start: true,
    },
    {
      ...basePlays[1],
      id: 'd1p2',
      drive_number: 1,
      absolute_clock_seconds: 40,
    },
    {
      ...basePlays[2],
      id: 'd1p3',
      drive_number: 1,
      absolute_clock_seconds: 70,
      scoring: { team: 'OFFENSE', creditedTo: 'OFFENSE', type: 'TD', points: 6, returnYards: null, scoring_team_side: 'TEAM' },
      is_drive_end: true,
    },
  ]
  const drives = deriveDriveRecords(driveEvents, 'OFFENSE')
  strictEqual(drives.length, 1)
  strictEqual(drives[0].play_ids.length, 3)
  strictEqual(drives[0].result, 'TD')
  ok(drives[0].start_field_position != null)
  ok(drives[0].end_field_position != null)
})

test('tendency lens surfaces options', () => {
  const lens = buildTendencyLens(basePlays, 'OFFENSE')
  ok(lens.options.length > 0)
  ok(lens.summary.length > 0)
})

test('season projection runs on stacked games', () => {
  const box = computeBoxScore(basePlays)
  const core = computeCoreWinningMetrics(box)
  const projection = projectSeason([{ box, core }])
  ok(projection.projectedWinRate > 0)
})

test('yardLineFromBallOn handles offense/defense notation', () => {
  strictEqual(yardLineFromBallOn('O20'), 20)
  strictEqual(yardLineFromBallOn('D30'), 70)
})
