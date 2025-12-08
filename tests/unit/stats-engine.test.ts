import { strictEqual, ok } from 'node:assert/strict'
import test from 'node:test'
import {
  buildStatsStack,
  buildTendencyLens,
  computeAdvancedAnalytics,
  computeBoxScore,
  computeBaseCounts,
  computeExplosiveMetrics,
  computeCoreWinningMetrics,
  computeRedZoneMetrics,
  computeScoringSummary,
  computeTurnoverMetrics,
  computeThirdDownEfficiency,
  computeFourthDownEfficiency,
  computeLateDownEfficiency,
  computePassingEfficiency,
  computeRushingEfficiency,
  computePossessionMetrics,
  computeSuccessRate,
  computeYardsPerPlay,
  deriveDriveRecords,
  mapChartEventToPlayEvent,
  aggregateSeasonMetrics,
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

test('explosive metrics honor 12/20 thresholds', () => {
  const plays: PlayEvent[] = [
    { ...basePlays[0], id: 'exp-run', gained_yards: 12, play_family: 'RUN' },
    { ...basePlays[1], id: 'exp-pass-short', gained_yards: 19, play_family: 'PASS' },
    { ...basePlays[2], id: 'exp-pass-hit', gained_yards: 20, play_family: 'PASS' },
  ]
  const metrics = computeExplosiveMetrics(plays, 'OFFENSE')
  strictEqual(metrics.offense.explosives, 2)
  strictEqual(metrics.offense.run.explosives, 1)
  strictEqual(metrics.offense.pass.explosives, 1)
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

test('turnover metrics break out giveaways, takeaways, and downs', () => {
  const turnoverEvents: PlayEvent[] = [
    {
      ...basePlays[0],
      id: 'to-int',
      turnover: true,
      turnover_detail: { type: 'INTERCEPTION', lostBy: 'OFFENSE', lostBySide: 'TEAM', returnYards: 0 },
      possession: 'OFFENSE',
      possession_team_id: 'team-1',
    },
    {
      ...basePlays[1],
      id: 'to-takeaway',
      turnover: true,
      turnover_detail: { type: 'FUMBLE', lostBy: 'OFFENSE', lostBySide: 'OPPONENT', returnYards: 12 },
      possession: 'DEFENSE',
      possession_team_id: 'opp-1',
    },
    {
      ...basePlays[2],
      id: 'to-downs',
      turnover: true,
      turnover_detail: { type: 'DOWNS', lostBy: 'OFFENSE', lostBySide: 'TEAM', returnYards: 0 },
      possession: 'OFFENSE',
      possession_team_id: 'team-1',
    },
  ]
  const base = computeBaseCounts(turnoverEvents)
  const summary = computeTurnoverMetrics(base, { unitHint: 'OFFENSE' })
  strictEqual(summary.giveaways, 2)
  strictEqual(summary.takeaways, 1)
  strictEqual(summary.margin, -1)
  strictEqual(summary.giveawaysByType.interceptions, 1)
  strictEqual(summary.giveawaysByType.downs, 1)
  strictEqual(summary.takeawaysByType.fumbles, 1)
  strictEqual(summary.includeTurnoverOnDowns, true)
})

test('scoring summary captures non-offensive touchdowns and differential', () => {
  const scoringEvents: PlayEvent[] = [
    {
      ...basePlays[0],
      id: 'score-off',
      scoring: { team: 'OFFENSE', scoring_team_side: 'TEAM', points: 6, creditedTo: 'OFFENSE', type: 'TD' },
    },
    {
      ...basePlays[1],
      id: 'score-def',
      possession: 'DEFENSE',
      scoring: { team: 'DEFENSE', scoring_team_side: 'TEAM', points: 6, creditedTo: 'DEFENSE', type: 'DEF_TD' },
    },
    {
      ...basePlays[2],
      id: 'score-st',
      play_family: 'SPECIAL_TEAMS',
      possession: 'SPECIAL_TEAMS',
      scoring: {
        team: 'SPECIAL_TEAMS',
        scoring_team_side: 'TEAM',
        points: 6,
        creditedTo: 'SPECIAL_TEAMS',
        type: 'ST_TD',
      },
    },
    {
      ...basePlays[2],
      id: 'score-opp',
      team_id: 'team-1',
      possession: 'DEFENSE',
      possession_team_id: 'opp-1',
      scoring: { team: 'OFFENSE', scoring_team_side: 'OPPONENT', points: 3, creditedTo: 'OFFENSE', type: 'FG' },
    },
  ]
  const base = computeBaseCounts(scoringEvents)
  const summary = computeScoringSummary(base)
  strictEqual(summary.pointsFor, 18)
  strictEqual(summary.pointsAllowed, 3)
  strictEqual(summary.pointDifferential, 15)
  strictEqual(summary.nonOffensive.total, 2)
  strictEqual(Math.round(summary.nonOffensive.rate * 100), 67)
})

test('red zone metrics track offense and defense trips', () => {
  const redZoneEvents: PlayEvent[] = [
    {
      ...basePlays[0],
      id: 'rz-off',
      drive_number: 1,
      possession: 'OFFENSE',
      possession_team_id: 'team-1',
      field_position: 15,
      ball_on: 'D15',
      scoring: { team: 'OFFENSE', scoring_team_side: 'TEAM', points: 3, creditedTo: 'OFFENSE', type: 'FG' },
      is_drive_end: true,
      result: 'FG',
    },
    {
      ...basePlays[1],
      id: 'rz-def',
      drive_number: 2,
      possession: 'DEFENSE',
      possession_team_id: 'opp-1',
      field_position: 10,
      ball_on: 'D10',
      scoring: { team: 'OFFENSE', scoring_team_side: 'OPPONENT', points: 7, creditedTo: 'OFFENSE', type: 'TD' },
      is_drive_end: true,
      result: 'TD',
    },
  ]
  const redZone = computeRedZoneMetrics(redZoneEvents)
  strictEqual(redZone.offense.trips, 1)
  strictEqual(redZone.offense.fieldGoals, 1)
  strictEqual(redZone.offense.touchdowns, 0)
  strictEqual(redZone.defense.trips, 1)
  strictEqual(redZone.defense.touchdowns, 1)
  strictEqual(redZone.defense.scores, 1)
})

test('success rate uses 40/60/100 thresholds', () => {
  const plays: PlayEvent[] = [
    { ...basePlays[0], id: 's1', down: 1, distance: 10, gained_yards: 4 },
    { ...basePlays[0], id: 's2', down: 1, distance: 10, gained_yards: 3 },
    { ...basePlays[1], id: 's3', down: 2, distance: 10, gained_yards: 6 },
    { ...basePlays[2], id: 's4', down: 3, distance: 5, gained_yards: 5 },
  ]
  const summary = computeSuccessRate(plays, 'OFFENSE')
  strictEqual(summary.plays, 4)
  strictEqual(summary.successes, 3)
  strictEqual(Math.round(summary.rate * 100), 75)
})

test('yards per play can be filtered by down', () => {
  const plays: PlayEvent[] = [
    { ...basePlays[0], id: 'y1', play_family: 'RUN', down: 1, distance: 10, gained_yards: 5 },
    { ...basePlays[1], id: 'y2', play_family: 'RUN', down: 2, distance: 5, gained_yards: 0 },
    { ...basePlays[2], id: 'y3', play_family: 'PASS', down: 3, distance: 8, gained_yards: 20 },
  ]
  const overall = computeYardsPerPlay(plays, 'OFFENSE')
  strictEqual(Math.round(overall.ypp * 100) / 100, 8.33)
  const thirdDown = computeYardsPerPlay(plays, 'OFFENSE', { down: 3 })
  strictEqual(thirdDown.plays, 1)
  strictEqual(thirdDown.yards, 20)
  strictEqual(thirdDown.ypp, 20)
})

test('late-down efficiency counts conversions via gains, scores, and penalties', () => {
  const plays: PlayEvent[] = [
    { ...basePlays[0], id: 'c1', down: 3, distance: 5, gained_yards: 6, first_down: true },
    {
      ...basePlays[0],
      id: 'c2',
      down: 3,
      distance: 8,
      gained_yards: 0,
      scoring: { team: 'OFFENSE', scoring_team_side: 'TEAM', points: 6, creditedTo: 'OFFENSE', type: 'TD' },
    },
    { ...basePlays[0], id: 'c3', down: 3, distance: 4, gained_yards: 1 },
    {
      ...basePlays[0],
      id: 'c4',
      down: 4,
      distance: 2,
      gained_yards: 0,
      penalties: [{ occurred: true, team: 'DEFENSE', yards: 5, declined: false, offsetting: false, automaticFirstDown: true, type: 'PI' }],
    },
  ]
  const third = computeThirdDownEfficiency(plays, 'OFFENSE')
  strictEqual(third.attempts, 3)
  strictEqual(third.conversions, 2)
  const fourth = computeFourthDownEfficiency(plays, 'OFFENSE')
  strictEqual(fourth.attempts, 1)
  strictEqual(fourth.conversions, 1)
  const late = computeLateDownEfficiency(plays, 'OFFENSE')
  strictEqual(late.attempts, 4)
  strictEqual(late.conversions, 3)
  strictEqual(Math.round(late.rate * 100), 75)
})

test('passing efficiency tallies attempts, sacks, and accuracy', () => {
  const passes: PlayEvent[] = [
    { ...basePlays[2], id: 'pa', play_family: 'PASS', gained_yards: 15, result: 'Complete', participation: { quarterback: 'QB1' } },
    { ...basePlays[2], id: 'pb', play_family: 'PASS', gained_yards: 0, result: 'Incomplete', participation: { quarterback: 'QB1' } },
    { ...basePlays[2], id: 'pc', play_family: 'PASS', gained_yards: -7, result: 'Sack -7', participation: { quarterback: 'QB1' } },
    { ...basePlays[2], id: 'pd', play_family: 'PASS', gained_yards: 25, result: 'Complete deep', participation: { quarterback: 'QB2' } },
    { ...basePlays[2], id: 'pe', play_family: 'PASS', gained_yards: 0, result: 'Throwaway', participation: { quarterback: 'QB2' } },
  ]
  const efficiency = computePassingEfficiency(passes, 'OFFENSE')
  strictEqual(efficiency.attempts, 4)
  strictEqual(efficiency.completions, 2)
  strictEqual(efficiency.sacks, 1)
  strictEqual(efficiency.dropbacks, 5)
  strictEqual(Math.round(efficiency.yardsPerAttempt), 10)
  strictEqual(Math.round(efficiency.accuracyPct * 100), 67)
  strictEqual(efficiency.byQuarterback.QB1.sacks, 1)
})

test('rushing efficiency groups attempts by primary ballcarrier', () => {
  const runs: PlayEvent[] = [
    { ...basePlays[0], id: 'r1', play_family: 'RUN', gained_yards: 5, participation: { primaryBallcarrier: 'RB1' } },
    { ...basePlays[0], id: 'r2', play_family: 'RUN', gained_yards: 10, participation: { primaryBallcarrier: 'RB1' } },
    { ...basePlays[0], id: 'r3', play_family: 'RUN', gained_yards: 3, participation: { primaryBallcarrier: 'RB2' } },
  ]
  const rushing = computeRushingEfficiency(runs, 'OFFENSE')
  strictEqual(rushing.attempts, 3)
  strictEqual(rushing.yards, 18)
  strictEqual(Math.round(rushing.yardsPerCarry * 10), 60)
  strictEqual(rushing.byRusher.RB1.attempts, 2)
  strictEqual(rushing.byRusher.RB1.yards, 15)
})

test('possession metrics compute drives, time, and points per possession', () => {
  const driveEvents: PlayEvent[] = [
    {
      ...basePlays[0],
      id: 'd1p1',
      drive_number: 1,
      absolute_clock_seconds: 10,
      possession: 'OFFENSE',
      down: 1,
      distance: 10,
      gained_yards: 5,
      is_drive_start: true,
    },
    {
      ...basePlays[1],
      id: 'd1p2',
      drive_number: 1,
      absolute_clock_seconds: 40,
      possession: 'OFFENSE',
      gained_yards: 5,
      scoring: { team: 'OFFENSE', scoring_team_side: 'TEAM', creditedTo: 'OFFENSE', type: 'TD', points: 6 },
      is_drive_end: true,
      result: 'TD',
    },
    {
      ...basePlays[0],
      id: 'd2p1',
      drive_number: 2,
      absolute_clock_seconds: 200,
      possession: 'OFFENSE',
      down: 1,
      distance: 10,
      gained_yards: 3,
      is_drive_start: true,
    },
    {
      ...basePlays[1],
      id: 'd2p2',
      drive_number: 2,
      absolute_clock_seconds: 230,
      possession: 'OFFENSE',
      gained_yards: 4,
      is_drive_end: true,
      result: 'Punt',
    },
    {
      ...basePlays[0],
      id: 'opp1',
      drive_number: 3,
      absolute_clock_seconds: 300,
      possession: 'DEFENSE',
      down: 1,
      distance: 10,
      gained_yards: 0,
      is_drive_start: true,
    },
    {
      ...basePlays[1],
      id: 'opp2',
      drive_number: 3,
      absolute_clock_seconds: 330,
      possession: 'DEFENSE',
      result: 'FG',
      scoring: { team: 'OFFENSE', scoring_team_side: 'OPPONENT', creditedTo: 'OFFENSE', type: 'FG', points: 3 },
      is_drive_end: true,
    },
  ]
  const drives = deriveDriveRecords(driveEvents, 'OFFENSE')
  const possession = computePossessionMetrics(driveEvents, drives, 'OFFENSE')
  strictEqual(possession.offense.drives, 2)
  strictEqual(Math.round(possession.offense.timeOfPossessionSeconds), 60)
  strictEqual(possession.offense.driveResults.TD, 1)
  strictEqual(possession.defense.drives, 1)
  strictEqual(Math.round(possession.defense.pointsPerPossession * 100) / 100, 3)
})

test('season aggregation produces trends and averages', () => {
  const gameA = buildStatsStack({ events: basePlays, unit: 'OFFENSE', gameId: 'g1' }).game
  const turnoverHeavy: PlayEvent[] = [
    ...basePlays,
    {
      ...basePlays[0],
      id: 'g2-to',
      turnover: true,
      turnover_detail: {
        type: 'INTERCEPTION',
        lostBy: 'OFFENSE',
        lostBySide: 'TEAM',
        returnYards: 0,
        turnover_team_id: 'team-1',
      },
      possession: 'OFFENSE',
      possession_team_id: 'team-1',
    },
  ]
  const gameB = buildStatsStack({ events: turnoverHeavy, unit: 'OFFENSE', gameId: 'g2' }).game
  const season = aggregateSeasonMetrics([gameA, gameB])
  strictEqual(season.games, 2)
  strictEqual(season.turnover.trend.length, 2)
  ok(season.turnover.averageMargin <= 0)
  ok(season.scoring.trend.length === 2)
})
