import test from 'node:test'
import assert from 'node:assert/strict'

import {
  BuildDashboardViewModelInput,
  buildDashboardViewState,
} from '../../app/(app)/dashboard/viewModel'

const baseTeam = { id: 'team-1', name: 'Tigers', level: null, school_name: null }
const baseMembership = { team_id: 'team-1', role: 'Coach' }

function makeInput(overrides: Partial<BuildDashboardViewModelInput> = {}): BuildDashboardViewModelInput {
  return {
    team: baseTeam,
    membership: baseMembership,
    sessions: [],
    events: [],
    counts: { totalPlays: 0, explosivePlays: 0, turnovers: 0, activeSessions: 0 },
    scoutingImports: [],
    scoutingPlaysCount: 0,
    ...overrides,
  }
}

test('returns default hero and CTA when no sessions exist', () => {
  const state = buildDashboardViewState(makeInput())
  assert.equal(state.hero.title, "Set tonight's matchup")
  assert.equal(state.hero.ctaHref, '/games')
  assert.equal(state.hero.ctaLabel, 'Open game-day view')
  assert.equal(state.hero.modeLabel, 'Pregame')
  assert.equal(state.scouting.status, 'missing')
  assert.equal(state.scouting.errorsStatus, 'clean')
})

test('uses upcoming game hero and defensive CTA for pending session', () => {
  const state = buildDashboardViewState(
    makeInput({
      membership: { team_id: 'team-1', role: 'Defensive Coordinator' },
      sessions: [
        {
          id: 'sess-1',
          unit: 'defense',
          status: 'pending',
          started_at: '2025-09-01T12:00:00Z',
          game_id: 'game-2',
          games: { opponent_name: 'Rivals', start_time: '2025-09-02T18:00:00Z' },
        },
      ],
    })
  )

  assert.equal(state.hero.title, 'Upcoming game locked in')
  assert.ok(state.hero.subtitle.includes('Rivals'))
  assert.equal(state.hero.ctaLabel, 'Open defense chart')
  assert.equal(state.hero.ctaHref, '/games/game-2/chart/defense')
  assert.equal(state.hero.modeLabel, 'Pregame')
})

test('prefers live session hero, offensive CTA, and current session routing', () => {
  const state = buildDashboardViewState(
    makeInput({
      membership: { team_id: 'team-1', role: 'Offensive Coordinator' },
      sessions: [
        {
          id: 'sess-1',
          unit: 'offense',
          status: 'active',
          started_at: '2025-09-01T12:00:00Z',
          game_id: 'game-3',
          games: { opponent_name: 'Sharks', start_time: '2025-09-01T18:00:00Z' },
        },
      ],
      events: [
        {
          id: 'evt-1',
          sequence: 1,
          play_call: null,
          result: null,
          gained_yards: null,
          explosive: true,
          turnover: false,
          created_at: '2025-09-01T18:05:00Z',
          game_sessions: { unit: 'offense', game_id: 'game-3' },
        },
        {
          id: 'evt-2',
          sequence: 2,
          play_call: null,
          result: null,
          gained_yards: null,
          explosive: false,
          turnover: false,
          created_at: '2025-09-01T18:06:00Z',
          game_sessions: { unit: 'defense', game_id: 'game-99' },
        },
      ],
      counts: { totalPlays: 2, explosivePlays: 1, turnovers: 0, activeSessions: 1 },
    })
  )

  assert.equal(state.hero.title, 'Live game-day control')
  assert.equal(state.hero.ctaLabel, 'Open offense chart')
  assert.equal(state.hero.ctaHref, '/games/game-3/chart/offense')
  assert.equal(state.hero.modeLabel, 'Game live')
  assert.equal(state.realtime.lastEventAt, '2025-09-01T18:06:00Z')
  assert.equal(state.realtime.liveSessionCount, 1)
})

test('scouting status and issues count mirror import state', () => {
  const readyState = buildDashboardViewState(
    makeInput({
      scoutingImports: [{ status: 'processed', error_log: null }],
      scoutingPlaysCount: 12,
    })
  )
  assert.equal(readyState.scouting.status, 'ready')
  assert.equal(readyState.scouting.errorsStatus, 'clean')
  assert.equal(readyState.scouting.playsCount, 12)
  assert.equal(readyState.scouting.issuesCount, 0)

  const needsFixes = buildDashboardViewState(
    makeInput({
      scoutingImports: [
        { status: 'error', error_log: 'failed csv' },
        { status: 'in_progress', error_log: null },
      ],
    })
  )
  assert.equal(needsFixes.scouting.status, 'incomplete')
  assert.equal(needsFixes.scouting.errorsStatus, 'needs_fixes')
  assert.equal(needsFixes.scouting.issuesCount, 2)
})
