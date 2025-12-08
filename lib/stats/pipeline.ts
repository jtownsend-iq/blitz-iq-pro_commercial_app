import { aggregateSeasonMetrics, buildStatsStack, mapChartEventToPlayEvent, projectSeason } from '@/utils/stats/engine'
import type { PlayEvent, SeasonAggregate, SeasonProjection } from '@/utils/stats/types'
import { applyAnalyticsPreferences } from './preferences'
import type { AnalyticsPreferences } from '../preferences'

// Shared column projection for loading chart events into the stats engine.
export const DASHBOARD_EVENT_COLUMNS = [
  'id',
  'team_id',
  'game_id',
  'game_session_id',
  'sequence',
  'quarter',
  'clock_seconds',
  'down',
  'distance',
  'ball_on',
  'hash_mark',
  'possession',
  'play_call',
  'result',
  'gained_yards',
  'created_at',
  'drive_number',
  'explosive',
  'turnover',
  'play_family',
  'run_concept',
  'wr_concept_id',
  'st_play_type',
  'st_variant',
  'st_return_yards',
  'offensive_personnel_code:offensive_personnel',
  'offensive_formation_id',
  'backfield_code',
  'qb_alignment',
  'front_code:front',
  'defensive_structure_id',
  'coverage_shell_pre',
  'coverage_shell_post:coverage',
  'pressure_code:pressure',
  'strength',
  'tags',
].join(', ')

export type GameMeta = {
  id: string
  opponent_name: string | null
  start_time: string | null
  season_label?: string | null
}

export type GameStack = {
  gameId: string
  stack: ReturnType<typeof buildStatsStack>
  opponentName: string | null
  startTime: string | null
  seasonLabel?: string | null
}

export function mapChartRowsToEvents(
  rows: unknown[] | null | undefined,
  defaults: { teamId: string; opponent?: string | null },
  options?: { preferences?: AnalyticsPreferences }
): PlayEvent[] {
  if (!Array.isArray(rows)) return []

  const events = rows.map((row) =>
    mapChartEventToPlayEvent(row as PlayEvent, {
      teamId: defaults.teamId,
      opponent:
        ((row as Record<string, unknown>).opponent_name as string | null) ??
        ((row as Record<string, unknown>).opponent as string | null) ??
        defaults.opponent ??
        null,
    })
  )

  if (options?.preferences) {
    return applyAnalyticsPreferences(events, options.preferences)
  }

  return events
}

export function buildStacksForGames(events: PlayEvent[], games: GameMeta[]): {
  stacks: GameStack[]
  aggregate: SeasonAggregate
  projection: SeasonProjection
} {
  const byGame = new Map<string, PlayEvent[]>()

  events.forEach((ev) => {
    if (!ev.game_id) return
    const bucket = byGame.get(ev.game_id) ?? []
    bucket.push(ev)
    byGame.set(ev.game_id, bucket)
  })

  const stacks: GameStack[] = games.map((game) => {
    const evs = byGame.get(game.id) ?? []
    return {
      gameId: game.id,
      stack: buildStatsStack({ events: evs, gameId: game.id }),
      opponentName: game.opponent_name,
      startTime: game.start_time,
      seasonLabel: game.season_label ?? undefined,
    }
  })

  const gamesWithEvents = stacks.filter((entry) => entry.stack.base.plays > 0)
  const aggregate = aggregateSeasonMetrics(gamesWithEvents.map((entry) => entry.stack.game))
  const projection = projectSeason(
    gamesWithEvents.map((entry) => ({
      box: entry.stack.box,
      core: entry.stack.core,
      advanced: entry.stack.advanced,
    })),
    []
  )

  return { stacks, aggregate, projection }
}
