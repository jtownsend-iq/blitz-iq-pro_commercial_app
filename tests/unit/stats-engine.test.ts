import { strictEqual, ok } from 'node:assert/strict'
import test from 'node:test'
import {
  buildTendencyLens,
  computeAdvancedAnalytics,
  computeBoxScore,
  computeBaseCounts,
  computeCoreWinningMetrics,
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
  })
  strictEqual(mapped.field_zone, 'COMING_OUT')
  strictEqual(mapped.absolute_clock_seconds, (2 - 1) * 900 + (900 - 450))
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
