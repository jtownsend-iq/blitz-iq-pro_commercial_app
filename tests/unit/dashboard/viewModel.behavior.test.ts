import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDashboardViewState, BuildDashboardViewModelInput } from '../../../app/(app)/dashboard/viewModel'

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

test('pregame with no sessions produces Pregame mode and missing scouting', () => {
  const state = buildDashboardViewState(makeInput())
  assert.equal(state.hero.modeLabel, 'Pregame')
  assert.equal(state.scouting.status, 'missing')
})

test('pregame with scheduled session and incomplete scouting', () => {
  const state = buildDashboardViewState(
    makeInput({
      sessions: [
        {
          id: 'sess-1',
          unit: 'defense',
          status: 'pending',
          started_at: null,
          game_id: 'game-2',
          games: { opponent_name: 'Rivals', start_time: '2099-01-01T18:00:00Z' },
        },
      ],
      scoutingImports: [{ status: 'in_progress', error_log: null }],
    })
  )
  assert.equal(state.hero.modeLabel, 'Pregame')
  assert.equal(state.scouting.status, 'incomplete')
})

test('live game with active session populates metrics and per-unit stats', () => {
  const state = buildDashboardViewState(
    makeInput({
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
      ],
      counts: { totalPlays: 1, explosivePlays: 1, turnovers: 0, activeSessions: 1 },
    })
  )

  assert.equal(state.hero.modeLabel, 'Game live')
  assert.equal(state.realtime.liveSessionCount, 1)
  assert.ok(state.globalMetrics.drives.length > 0)
  assert.ok(state.perUnit.some((unit) => unit.unit === 'OFFENSE' && unit.primaryStats[0]?.value === '1'))
})

test('postgame scenario returns Final mode', () => {
  const state = buildDashboardViewState(
    makeInput({
      sessions: [
        {
          id: 'sess-1',
          unit: 'defense',
          status: 'completed',
          started_at: '2025-09-01T12:00:00Z',
          game_id: 'game-5',
          games: { opponent_name: 'Bears', start_time: '2025-09-01T18:00:00Z' },
        },
      ],
      events: [
        {
          id: 'evt-1',
          sequence: 1,
          play_call: null,
          result: null,
          gained_yards: null,
          explosive: false,
          turnover: false,
          created_at: '2025-09-01T18:05:00Z',
          game_sessions: { unit: 'defense', game_id: 'game-5' },
        },
      ],
      counts: { totalPlays: 1, explosivePlays: 0, turnovers: 0, activeSessions: 0 },
    })
  )

  assert.equal(state.hero.modeLabel, 'Final')
})

test('scout import errors set errorsStatus to needs_fixes', () => {
  const state = buildDashboardViewState(
    makeInput({
      scoutingImports: [{ status: 'error', error_log: 'bad csv' }],
    })
  )
  assert.equal(state.scouting.errorsStatus, 'needs_fixes')
})
