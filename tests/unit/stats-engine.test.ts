import { strictEqual, ok } from 'node:assert/strict'
import test from 'node:test'
import {
  buildStatsStack,
  buildTendencyLens,
  computeAdvancedAnalytics,
  computeAdjustedNetYardsPerAttempt,
  computeBoxScore,
  computeBaseCounts,
  computeExplosiveMetrics,
  computeCoreWinningMetrics,
  computeEpaAggregates,
  computeExpectedPoints,
  computeGameControlMetric,
  computeRedZoneMetrics,
  computeScoringSummary,
  computeSpPlusLikeRatings,
  computeTurnoverMetrics,
  computeThirdDownEfficiency,
  computeFourthDownEfficiency,
  computeLateDownEfficiency,
  computeWinProbabilitySummary,
  computePostGameWinExpectancy,
  computePassingEfficiency,
  computeDefensiveMetrics,
  computeRushingEfficiency,
  computePossessionMetrics,
  computeSpecialTeamsMetrics,
  computeBoxScoreReport,
  computeSuccessRate,
  computeYardsPerPlay,
  deriveDriveRecords,
  mapChartEventToPlayEvent,
  aggregateSeasonMetrics,
  projectSeason,
  simulateSeasonOutcomes,
  computeQuarterbackRatings,
  yardLineFromBallOn,
} from '../../utils/stats/engine'
import type { PlayEvent, DriveRecord, EpaAggregate } from '../../utils/stats/types'

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

test('computeBoxScoreReport builds team and player lines', () => {
  const events: PlayEvent[] = [
    { ...basePlays[2], id: 'bx-pass-comp', play_family: 'PASS', gained_yards: 15, yards_after_catch: 5, participation: { quarterback: 'QB1', primaryTarget: 'WR1' } },
    {
      ...basePlays[2],
      id: 'bx-pass-td',
      play_family: 'PASS',
      gained_yards: 25,
      yards_after_catch: 10,
      participation: { quarterback: 'QB1', primaryTarget: 'WR1' },
      scoring: { team: 'OFFENSE', scoring_team_side: 'TEAM', creditedTo: 'OFFENSE', type: 'TD', points: 6 },
    },
    {
      ...basePlays[2],
      id: 'bx-pass-int',
      play_family: 'PASS',
      gained_yards: 0,
      participation: { quarterback: 'QB1', primaryTarget: 'WR2' },
      turnover_detail: { type: 'INTERCEPTION', lostBy: 'OFFENSE', lostBySide: 'TEAM', returnYards: 12 },
      result: 'Intercepted',
    },
    { ...basePlays[2], id: 'bx-sack', play_family: 'PASS', gained_yards: -7, participation: { quarterback: 'QB1' }, result: 'Sack -7' },
    { ...basePlays[0], id: 'bx-run', play_family: 'RUN', gained_yards: 8, participation: { primaryBallcarrier: 'RB1' }, first_down: true },
    {
      ...basePlays[0],
      id: 'bx-run-fum',
      play_family: 'RUN',
      gained_yards: 3,
      participation: { primaryBallcarrier: 'RB1' },
      turnover_detail: { type: 'FUMBLE', lostBy: 'OFFENSE', lostBySide: 'TEAM', returnYards: 0 },
    },
    {
      ...basePlays[0],
      id: 'bx-def-sack',
      possession: 'DEFENSE',
      possession_team_id: 'opp-1',
      play_family: 'PASS',
      gained_yards: -5,
      participation: { sackers: ['DL1'], soloTacklers: ['DL1'] },
      result: 'Sack -5',
    },
    {
      ...basePlays[1],
      id: 'bx-def-int',
      possession: 'DEFENSE',
      possession_team_id: 'opp-1',
      play_family: 'PASS',
      gained_yards: 12,
      participation: { interceptors: ['CB1'], passDefenders: ['CB1'] },
      turnover_detail: { type: 'INTERCEPTION', lostBy: 'OFFENSE', lostBySide: 'OPPONENT', returnYards: 12 },
      scoring: { team: 'DEFENSE', scoring_team_side: 'TEAM', creditedTo: 'DEFENSE', type: 'DEF_TD', points: 6 },
    },
    {
      ...basePlays[1],
      id: 'bx-def-ff',
      possession: 'DEFENSE',
      possession_team_id: 'opp-1',
      play_family: 'RUN',
      gained_yards: -2,
      participation: { soloTacklers: ['LB1'], forcedFumble: 'LB1', recovery: 'S1' },
      turnover_detail: { type: 'FUMBLE', lostBy: 'OFFENSE', lostBySide: 'OPPONENT', returnYards: 20 },
      scoring: { team: 'DEFENSE', scoring_team_side: 'TEAM', creditedTo: 'DEFENSE', type: 'DEF_TD', points: 6 },
    },
    {
      ...basePlays[0],
      id: 'bx-fg',
      play_family: 'SPECIAL_TEAMS',
      st_play_type: 'FG',
      participation: { kicker: 'K1' },
      scoring: { team: 'OFFENSE', scoring_team_side: 'TEAM', creditedTo: 'SPECIAL_TEAMS', type: 'FG', points: 3 },
    },
    { ...basePlays[0], id: 'bx-punt', play_family: 'SPECIAL_TEAMS', st_play_type: 'PUNT', gained_yards: 45, st_return_yards: 5, participation: { punter: 'P1', returner: 'RET1' } },
    { ...basePlays[0], id: 'bx-ko-ret', play_family: 'SPECIAL_TEAMS', st_play_type: 'KICKOFF', gained_yards: 60, st_return_yards: 35, participation: { returner: 'RET2' }, possession: 'SPECIAL_TEAMS' },
  ]

  const boxScore = computeBoxScoreReport(events, [], 'OFFENSE')
  strictEqual(boxScore.passing.team.attempts, 3)
  strictEqual(boxScore.passing.team.completions, 2)
  strictEqual(boxScore.passing.team.interceptions, 1)
  strictEqual(boxScore.passing.team.sacks, 1)
  strictEqual(boxScore.passing.players.QB1.touchdowns, 1)
  strictEqual(boxScore.receiving.players.WR1.receptions, 2)
  strictEqual(boxScore.rushing.team.fumblesLost, 1)
  strictEqual(boxScore.rushing.players.RB1.fumbles, 1)
  strictEqual(boxScore.defense.players.DL1.sacks >= 1, true)
  strictEqual(boxScore.defense.players.CB1.interceptions, 1)
  strictEqual(boxScore.kicking.players.K1.fgMade, 1)
  strictEqual(boxScore.punting.players.P1.punts, 1)
  strictEqual(boxScore.returns.kickoff.team.returns, 1)
  strictEqual(boxScore.team.turnovers.total, 2)
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

test('defensive metrics capture stops, havoc, and takeaways', () => {
  const defensivePlays: PlayEvent[] = [
    {
      ...basePlays[0],
      id: 'def-1',
      possession: 'DEFENSE',
      possession_team_id: 'opp-1',
      down: 3,
      distance: 7,
      gained_yards: 2,
      field_position: 70,
      ball_on: 'D30',
      play_family: 'PASS',
      drive_number: 1,
      participation: { passDefenders: ['CB1'] },
      is_drive_start: true,
    },
    {
      ...basePlays[0],
      id: 'def-2',
      possession: 'DEFENSE',
      possession_team_id: 'opp-1',
      down: 4,
      distance: 1,
      gained_yards: 0,
      field_position: 68,
      ball_on: 'D32',
      play_family: 'RUN',
      drive_number: 1,
      is_drive_end: true,
      result: 'Punt',
    },
    {
      ...basePlays[0],
      id: 'def-3',
      possession: 'DEFENSE',
      possession_team_id: 'opp-1',
      down: 3,
      distance: 6,
      gained_yards: 8,
      field_position: 50,
      ball_on: 'D50',
      play_family: 'RUN',
      drive_number: 2,
      first_down: true,
    },
    {
      ...basePlays[0],
      id: 'def-4',
      possession: 'DEFENSE',
      possession_team_id: 'opp-1',
      down: 4,
      distance: 2,
      gained_yards: -2,
      field_position: 48,
      ball_on: 'D48',
      play_family: 'RUN',
      drive_number: 2,
      is_drive_end: true,
      turnover: true,
      turnover_detail: { type: 'DOWNS', lostBy: 'OFFENSE', lostBySide: 'OPPONENT', returnYards: 0 },
      result: 'Turnover on downs',
    },
    {
      ...basePlays[0],
      id: 'def-5',
      possession: 'DEFENSE',
      possession_team_id: 'opp-1',
      down: 3,
      distance: 10,
      gained_yards: -6,
      field_position: 60,
      ball_on: 'D40',
      play_family: 'PASS',
      pass_result: 'Sack -6',
      drive_number: 3,
      participation: { sackers: ['DL1'] },
    },
    {
      ...basePlays[0],
      id: 'def-6',
      possession: 'DEFENSE',
      possession_team_id: 'opp-1',
      down: 2,
      distance: 8,
      gained_yards: -1,
      field_position: 55,
      ball_on: 'D45',
      play_family: 'RUN',
      drive_number: 3,
      participation: { soloTacklers: ['LB1'] },
    },
    {
      ...basePlays[0],
      id: 'def-7',
      possession: 'DEFENSE',
      possession_team_id: 'opp-1',
      down: 3,
      distance: 9,
      gained_yards: 0,
      field_position: 52,
      ball_on: 'D48',
      play_family: 'PASS',
      drive_number: 3,
      is_drive_end: true,
      turnover: true,
      turnover_detail: {
        type: 'INTERCEPTION',
        lostBy: 'OFFENSE',
        lostBySide: 'OPPONENT',
        returnYards: 15,
        recoveredBy: 'DB1',
      },
      participation: { interceptors: ['DB1'], passDefenders: ['DB1'] },
      result: 'Interception',
    },
    {
      ...basePlays[0],
      id: 'def-8',
      possession: 'DEFENSE',
      possession_team_id: 'opp-1',
      down: 3,
      distance: 5,
      gained_yards: -1,
      field_position: 40,
      ball_on: 'D60',
      play_family: 'RUN',
      drive_number: 4,
    },
    {
      ...basePlays[0],
      id: 'def-9',
      possession: 'DEFENSE',
      possession_team_id: 'opp-1',
      down: 3,
      distance: 4,
      gained_yards: -1,
      field_position: 35,
      ball_on: 'D65',
      play_family: 'RUN',
      drive_number: 4,
      is_drive_end: true,
      turnover: true,
      turnover_detail: {
        type: 'FUMBLE',
        lostBy: 'OFFENSE',
        lostBySide: 'OPPONENT',
        returnYards: 0,
        forcedBy: 'DL2',
        recoveredBy: 'DL2',
      },
      participation: { soloTacklers: ['DL2'], forcedFumble: 'DL2' },
      result: 'Fumble',
    },
  ]

  const defense = computeDefensiveMetrics(defensivePlays)
  strictEqual(defense.takeaways.total, 3)
  strictEqual(defense.thirdDown.attempts, 6)
  strictEqual(Math.round(defense.thirdDown.stopRate * 100), 83)
  strictEqual(defense.fourthDown.stops, 2)
  strictEqual(Math.round(defense.threeAndOuts.rate * 100), 75)
  strictEqual(defense.tfls.total, 5)
  strictEqual(defense.tfls.sacks, 1)
  ok(defense.havoc.rate > 0.7)
  strictEqual(defense.drives.pointsAllowed, 0)
})

test('special teams metrics capture returns and kicking phases', () => {
  const stEvents: PlayEvent[] = [
    {
      ...basePlays[0],
      id: 'ko-return',
      play_family: 'SPECIAL_TEAMS',
      st_play_type: 'KICKOFF',
      st_return_yards: 35,
      possession_team_id: 'team-1',
      ball_on: 'O5',
      field_position: 95,
      gained_yards: 0,
    },
    {
      ...basePlays[0],
      id: 'ko-cover',
      play_family: 'SPECIAL_TEAMS',
      st_play_type: 'KICKOFF',
      st_return_yards: 20,
      possession_team_id: 'opp-1',
      ball_on: 'O35',
      field_position: 65,
      gained_yards: 65,
    },
    {
      ...basePlays[0],
      id: 'fg-make',
      play_family: 'SPECIAL_TEAMS',
      st_play_type: 'FG',
      ball_on: 'D25',
      field_position: 25,
      gained_yards: 0,
      scoring: { team: 'OFFENSE', creditedTo: 'SPECIAL_TEAMS', type: 'FG', points: 3, scoring_team_side: 'TEAM' },
    },
    {
      ...basePlays[0],
      id: 'punt-kick',
      play_family: 'SPECIAL_TEAMS',
      st_play_type: 'PUNT',
      possession_team_id: 'team-1',
      ball_on: 'O40',
      field_position: 60,
      gained_yards: 45,
      st_return_yards: 5,
    },
    {
      ...basePlays[0],
      id: 'punt-return',
      play_family: 'SPECIAL_TEAMS',
      st_play_type: 'PUNT RETURN',
      possession_team_id: 'team-1',
      ball_on: 'D45',
      field_position: 55,
      st_return_yards: 18,
    },
  ]
  const drives: DriveRecord[] = [
    {
      drive_number: 1,
      team_id: 'team-1',
      opponent_id: null,
      game_id: 'g-st',
      season_id: null,
      unit: 'OFFENSE',
      unit_on_field: 'OFFENSE',
      possession_team_id: 'team-1',
      play_ids: [],
      start_field_position: 30,
      end_field_position: 0,
      start_time_seconds: 0,
      end_time_seconds: 0,
      start_score: null,
      end_score: null,
      yards: 50,
      result: 'TD',
    },
    {
      drive_number: 2,
      team_id: 'team-1',
      opponent_id: null,
      game_id: 'g-st',
      season_id: null,
      unit: 'DEFENSE',
      unit_on_field: 'DEFENSE',
      possession_team_id: 'opp-1',
      play_ids: [],
      start_field_position: 65,
      end_field_position: 0,
      start_time_seconds: 0,
      end_time_seconds: 0,
      start_score: null,
      end_score: null,
      yards: 0,
      result: 'PUNT',
    },
  ]
  const special = computeSpecialTeamsMetrics(stEvents, drives)
  strictEqual(special.kickoffReturns.team.returns, 1)
  strictEqual(special.kickoff.kicks, 1)
  strictEqual(Math.round(special.kickoff.opponentAverageStart ?? 0), 20)
  strictEqual(special.punting.team.punts, 1)
  strictEqual(Math.round(special.punting.team.net), 40)
  strictEqual(special.puntReturns.team.returns, 1)
  strictEqual(Math.round(special.fieldGoals.overall.pct * 100), 100)
  ok((special.fieldGoals.longestMade ?? 0) >= 40)
  strictEqual(special.fieldPosition.offenseStart, 30)
  strictEqual(special.fieldPosition.defenseStart, 65)
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
  strictEqual(season.defense.takeawaysPerGame, 0)
  strictEqual(season.defense.thirdDown.attempts, 0)
  ok(season.specialTeams.fieldGoals.overallPct >= 0)
})

test('expected points curve is monotonic with field position', () => {
  const backedUp = computeExpectedPoints({
    down: 1,
    distance: 10,
    yardLine: 20,
    clockSecondsRemaining: 1800,
    scoreDiff: 0,
    offenseTimeouts: 3,
    defenseTimeouts: 3,
  })
  const midfield = computeExpectedPoints({
    down: 1,
    distance: 10,
    yardLine: 50,
    clockSecondsRemaining: 1800,
    scoreDiff: 0,
    offenseTimeouts: 3,
    defenseTimeouts: 3,
  })
  const redZone = computeExpectedPoints({
    down: 1,
    distance: 10,
    yardLine: 85,
    clockSecondsRemaining: 1800,
    scoreDiff: 0,
    offenseTimeouts: 3,
    defenseTimeouts: 3,
  })
  ok(backedUp.points < midfield.points)
  ok(midfield.points < redZone.points)
})

test('epa aggregates account for touchdowns and drives', () => {
  const epaEvents: PlayEvent[] = [
    {
      ...basePlays[0],
      id: 'epa-1',
      play_family: 'PASS',
      down: 1,
      distance: 10,
      gained_yards: 12,
      absolute_clock_seconds: 100,
      drive_number: 1,
      possession: 'OFFENSE',
      possession_team_id: 'team-1',
      team_score_before: 0,
      opponent_score_before: 0,
      timeouts_before: { team: 3, opponent: 3, offense: 3, defense: 3 },
    },
    {
      ...basePlays[1],
      id: 'epa-2',
      play_family: 'RUN',
      down: 2,
      distance: 5,
      gained_yards: 5,
      first_down: true,
      absolute_clock_seconds: 130,
      drive_number: 1,
      possession: 'OFFENSE',
      possession_team_id: 'team-1',
      team_score_before: 0,
      opponent_score_before: 0,
    },
    {
      ...basePlays[2],
      id: 'epa-3',
      play_family: 'PASS',
      down: 1,
      distance: 10,
      gained_yards: 10,
      absolute_clock_seconds: 160,
      drive_number: 1,
      possession: 'OFFENSE',
      possession_team_id: 'team-1',
      team_score_before: 0,
      opponent_score_before: 0,
      team_score_after: 7,
      opponent_score_after: 0,
      scoring: { team: 'OFFENSE', scoring_team_side: 'TEAM', points: 7, creditedTo: 'OFFENSE', type: 'TD' },
    },
  ]
  const epa = computeEpaAggregates(epaEvents)
  ok(epa.perPlay > 0)
  strictEqual(epa.byDrive['1'].plays, 3)
  ok(epa.byUnit.OFFENSE.epa > 0)
})

test('ANY/A penalizes interceptions and sacks', () => {
  const anyAEvents: PlayEvent[] = [
    { ...basePlays[2], id: 'aa-1', play_family: 'PASS', gained_yards: 25, result: 'Complete', participation: { quarterback: 'QB1' } },
    { ...basePlays[2], id: 'aa-2', play_family: 'PASS', gained_yards: -6, result: 'Sack -6', participation: { quarterback: 'QB1' } },
    {
      ...basePlays[2],
      id: 'aa-3',
      play_family: 'PASS',
      gained_yards: 0,
      result: 'Interception',
      participation: { quarterback: 'QB1' },
      turnover_detail: { type: 'INTERCEPTION', lostBy: 'OFFENSE', lostBySide: 'TEAM', returnYards: 0 },
    },
  ]
  const anyA = computeAdjustedNetYardsPerAttempt(anyAEvents, 'OFFENSE')
  ok(Number.isFinite(anyA.team))
  ok(anyA.byQuarterback.QB1 < 25)
})

test('win probability reacts to go-ahead score', () => {
  const wpEvents: PlayEvent[] = [
    {
      ...basePlays[0],
      id: 'wp-1',
      quarter: 4,
      clock_seconds: 240,
      absolute_clock_seconds: (4 - 1) * 900 + (900 - 240),
      down: 3,
      distance: 7,
      ball_on: 'D12',
      field_position: 12,
      team_score_before: 7,
      opponent_score_before: 14,
      possession: 'OFFENSE',
      possession_team_id: 'team-1',
    },
    {
      ...basePlays[0],
      id: 'wp-2',
      quarter: 4,
      clock_seconds: 220,
      absolute_clock_seconds: (4 - 1) * 900 + (900 - 220),
      down: 3,
      distance: 7,
      ball_on: 'D5',
      field_position: 5,
      team_score_before: 7,
      opponent_score_before: 14,
      team_score_after: 14,
      opponent_score_after: 14,
      possession: 'OFFENSE',
      possession_team_id: 'team-1',
      scoring: { team: 'OFFENSE', scoring_team_side: 'TEAM', points: 7, creditedTo: 'OFFENSE', type: 'TD' },
    },
  ]
  const wp = computeWinProbabilitySummary(wpEvents, 'OFFENSE')
  strictEqual(wp.timeline.length, 2)
  ok(wp.timeline[1].winProbability > wp.timeline[0].winProbability)
})

test('post-game win expectancy favors dominant profiles', () => {
  const teamProfile = {
    yardsFor: 450,
    yardsAllowed: 300,
    successRateFor: 0.5,
    successRateAllowed: 0.35,
    explosivePlaysFor: 6,
    explosivePlaysAllowed: 2,
    turnoversFor: 1,
    turnoversAllowed: 2,
    avgStartFieldPosition: 65,
    penalties: 40,
    plays: 70,
  }
  const opponentProfile = {
    yardsFor: 300,
    yardsAllowed: 450,
    successRateFor: 0.35,
    successRateAllowed: 0.5,
    explosivePlaysFor: 2,
    explosivePlaysAllowed: 6,
    turnoversFor: 2,
    turnoversAllowed: 1,
    avgStartFieldPosition: 55,
    penalties: 60,
    plays: 60,
  }
  const expectancy = computePostGameWinExpectancy(teamProfile, opponentProfile)
  ok(expectancy.teamWinExpectancy > 0.6)
})

test('SP+ style ratings reward efficient offense', () => {
  const epaEvents: PlayEvent[] = [
    { ...basePlays[0], id: 'sp1', play_family: 'RUN', gained_yards: 8, down: 1, distance: 10 },
    { ...basePlays[1], id: 'sp2', play_family: 'RUN', gained_yards: 6, down: 2, distance: 4, first_down: true },
    { ...basePlays[2], id: 'sp3', play_family: 'PASS', gained_yards: 22, down: 1, distance: 10, first_down: true },
  ]
  const epa = computeEpaAggregates(epaEvents)
  const sp = computeSpPlusLikeRatings(epaEvents, epa, 0.2)
  ok(sp.offense > 50)
  ok(sp.overall > 40)
})

test('QBR-like rating weights quarterback conversions and context', () => {
  const qbEvents: PlayEvent[] = [
    {
      ...basePlays[2],
      id: 'qbr1',
      play_family: 'PASS',
      down: 1,
      distance: 10,
      gained_yards: 8,
      participation: { quarterback: 'QB-CTX' },
    },
    {
      ...basePlays[2],
      id: 'qbr2',
      play_family: 'PASS',
      down: 2,
      distance: 10,
      gained_yards: 6,
      participation: { quarterback: 'QB-CTX' },
    },
  ]
  const syntheticEpa: EpaAggregate = {
    plays: 2,
    total: 0.8,
    adjustedTotal: 0.8,
    perPlay: 0.4,
    perDrive: 0.4,
    byDrive: { '1': { epa: 0.8, adjusted: 0.8, plays: 2 } },
    byPlayer: {},
    byUnit: {
      OFFENSE: { epa: 0.8, adjusted: 0.8, plays: 2, perPlay: 0.4 },
      DEFENSE: { epa: 0, adjusted: 0, plays: 0, perPlay: 0 },
      SPECIAL_TEAMS: { epa: 0, adjusted: 0, plays: 0, perPlay: 0 },
    },
    playsDetail: {
      qbr1: {
        playId: 'qbr1',
        raw: 0.5,
        adjusted: 0.5,
        preEp: 0,
        postEp: 0.5,
        points: 0,
        unit: 'OFFENSE',
        driveNumber: 1,
        leverage: 0.12,
        possession: 'TEAM',
        scoreDiff: 0,
        secondsRemaining: 900,
        players: ['QB-CTX'],
      },
      qbr2: {
        playId: 'qbr2',
        raw: 0.3,
        adjusted: 0.3,
        preEp: 0,
        postEp: 0.3,
        points: 0,
        unit: 'OFFENSE',
        driveNumber: 1,
        leverage: 0.1,
        possession: 'TEAM',
        scoreDiff: 0,
        secondsRemaining: 870,
        players: ['QB-CTX'],
      },
    },
  }
  const qbr = computeQuarterbackRatings(qbEvents, syntheticEpa, 0)
  strictEqual(Number(qbr.byQuarterback['QB-CTX'].adjustedEpaPerPlay.toFixed(2)), 0.4)
  strictEqual(Number(qbr.byQuarterback['QB-CTX'].rating.toFixed(1)), 57.4)
  strictEqual(Number(qbr.teamRating.toFixed(1)), 57.4)
})

test('points per drive uses late-down scoring weight', () => {
  const lateDownScore: PlayEvent[] = [
    {
      ...basePlays[0],
      id: 'ppd-late',
      down: 3,
      distance: 5,
      gained_yards: 6,
      play_family: 'RUN',
      first_down: true,
      scoring: { team: 'OFFENSE', scoring_team_side: 'TEAM', creditedTo: 'OFFENSE', type: 'TD', points: 6 },
    },
  ]
  const stack = buildStatsStack({ events: lateDownScore, unit: 'OFFENSE', gameId: 'ppd-game' })
  strictEqual(stack.core.pointsPerDrive, 10)
})

test('adjusted net yards per attempt penalizes sacks and interceptions exactly', () => {
  const anyAEvents: PlayEvent[] = [
    { ...basePlays[2], id: 'aa-pass', play_family: 'PASS', gained_yards: 20, result: 'Complete', participation: { quarterback: 'QB1' } },
    {
      ...basePlays[2],
      id: 'aa-int',
      play_family: 'PASS',
      gained_yards: 0,
      result: 'Interception',
      participation: { quarterback: 'QB1' },
      turnover_detail: { type: 'INTERCEPTION', lostBy: 'OFFENSE', lostBySide: 'TEAM', returnYards: 0 },
    },
    { ...basePlays[2], id: 'aa-sack', play_family: 'PASS', gained_yards: -10, result: 'Sack -10', participation: { quarterback: 'QB1' } },
    {
      ...basePlays[2],
      id: 'aa-td',
      play_family: 'PASS',
      gained_yards: 10,
      result: 'Touchdown',
      participation: { quarterback: 'QB1' },
      scoring: { team: 'OFFENSE', scoring_team_side: 'TEAM', creditedTo: 'OFFENSE', type: 'TD', points: 6 },
    },
  ]
  const anyA = computeAdjustedNetYardsPerAttempt(anyAEvents, 'OFFENSE')
  strictEqual(anyA.team, -3)
  strictEqual(anyA.byQuarterback.QB1, -3)
})

test('season aggregates carry advanced efficiency averages', () => {
  const explosiveGame: PlayEvent[] = [
    { ...basePlays[0], id: 'adv-1', play_family: 'RUN', gained_yards: 14, down: 1, distance: 10 },
    {
      ...basePlays[2],
      id: 'adv-2',
      play_family: 'PASS',
      gained_yards: 24,
      down: 2,
      distance: 6,
      first_down: true,
      absolute_clock_seconds: 120,
      drive_number: 1,
      team_score_before: 0,
      opponent_score_before: 0,
      team_score_after: 7,
      opponent_score_after: 0,
      scoring: { team: 'OFFENSE', scoring_team_side: 'TEAM', creditedTo: 'OFFENSE', type: 'TD', points: 7 },
    },
  ]
  const baseStack = buildStatsStack({ events: basePlays, unit: 'OFFENSE', gameId: 'adv-a' })
  const explosiveStack = buildStatsStack({ events: explosiveGame, unit: 'OFFENSE', gameId: 'adv-b' })
  const aggregate = aggregateSeasonMetrics([baseStack.game, explosiveStack.game])
  const expectedEpa =
    (baseStack.advanced.estimatedEPAperPlay + explosiveStack.advanced.estimatedEPAperPlay) / 2
  const expectedAnyA = (baseStack.advanced.anyA.team + explosiveStack.advanced.anyA.team) / 2
  const expectedPointsPerDrive = (baseStack.core.pointsPerDrive + explosiveStack.core.pointsPerDrive) / 2
  strictEqual(Number(aggregate.advanced.estimatedEpaPerPlay.toFixed(4)), Number(expectedEpa.toFixed(4)))
  strictEqual(Number(aggregate.advanced.adjustedNetYardsPerAttempt.toFixed(3)), Number(expectedAnyA.toFixed(3)))
  strictEqual(Number(aggregate.advanced.pointsPerDrive.toFixed(3)), Number(expectedPointsPerDrive.toFixed(3)))
})

test('season simulation returns deterministic projections', () => {
  const sim = simulateSeasonOutcomes({
    teamRating: 80,
    offenseRating: 78,
    defenseRating: 75,
    specialTeamsRating: 55,
    schedule: [
      { opponentId: 'sim-a', opponentRating: 60, isConference: true, homeField: 1 },
      { opponentId: 'sim-b', opponentRating: 70, isConference: true, homeField: -1 },
    ],
    iterations: 200,
    seed: 3,
  })
  strictEqual(Number(sim.winProbability.toFixed(2)), 0.94)
  strictEqual(Number(sim.winOutProbability.toFixed(3)), 0.885)
  strictEqual(Number(sim.conferenceWinProbability.toFixed(3)), 0.885)
  strictEqual(Number(sim.playoffProbability.toFixed(3)), 0.995)
  strictEqual(sim.strengthOfSchedule, 65)
  strictEqual(sim.gameResults.length, 2)
  strictEqual(Number(sim.gameResults[0].winRate.toFixed(2)), 0.94)
})

test('game control metric tracks sustained leads', () => {
  const summary = {
    timeline: [
      { playId: 'gc1', winProbability: 0.6, wpa: 0, leverage: 0.05, unit: 'OFFENSE' as const, secondsRemaining: 2700 },
      { playId: 'gc2', winProbability: 0.75, wpa: 0, leverage: 0.04, unit: 'OFFENSE' as const, secondsRemaining: 900 },
      { playId: 'gc3', winProbability: 0.9, wpa: 0, leverage: 0.02, unit: 'OFFENSE' as const, secondsRemaining: 0 },
    ],
    averageWinProbability: 0.75,
    wpaByPlayer: {},
    wpaByUnit: { OFFENSE: 0, DEFENSE: 0, SPECIAL_TEAMS: 0 },
    highLeverage: [],
  }
  const gameControl = computeGameControlMetric(summary)
  ok(gameControl.averageLeadWinProb > 0.6)
  ok(gameControl.timeLedPct > 0.5)
})
