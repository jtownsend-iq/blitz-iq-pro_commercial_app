import test from 'node:test'
import { strictEqual, ok } from 'node:assert/strict'
import { buildStacksForGames } from '@/lib/stats/pipeline'
import type { GameMeta } from '@/lib/stats/pipeline'
import type { PlayEvent } from '@/utils/stats/types'

test('buildStacksForGames caches aggregates per team and surfaces freshness', () => {
  const events: PlayEvent[] = [
    {
      id: 'g1-play-1',
      team_id: 'team-1',
      game_id: 'game-1',
      play_family: 'RUN',
      gained_yards: 6,
      down: 1,
      distance: 10,
      ball_on: 'O25',
      quarter: 1,
      clock_seconds: 900,
      created_at: '2025-08-01T00:00:00Z',
    },
    {
      id: 'g1-play-2',
      team_id: 'team-1',
      game_id: 'game-1',
      play_family: 'PASS',
      gained_yards: 18,
      down: 2,
      distance: 4,
      ball_on: 'O43',
      quarter: 1,
      clock_seconds: 880,
      created_at: '2025-08-01T00:00:20Z',
      scoring: { team: 'OFFENSE', scoring_team_side: 'TEAM', creditedTo: 'OFFENSE', type: 'TD', points: 7 },
    },
  ]
  const games: GameMeta[] = [
    { id: 'game-1', opponent_name: 'Rivals', start_time: '2025-08-02T18:00:00Z', season_label: '2025', status: 'scheduled' },
  ]

  const first = buildStacksForGames(events, games, { teamId: 'team-1' })
  const second = buildStacksForGames(events, games, { teamId: 'team-1' })

  strictEqual(first.stacks[0].gameId, 'game-1')
  strictEqual(first.stacks[0].lastEventAt, '2025-08-01T00:00:20.000Z')
  ok(first.stacks[0].signature.length > 0)
  strictEqual(first.stacks[0].signature, second.stacks[0].signature)
  strictEqual(first.aggregate, second.aggregate)
  strictEqual(first.projection.projectedWinRate, second.projection.projectedWinRate)
})
