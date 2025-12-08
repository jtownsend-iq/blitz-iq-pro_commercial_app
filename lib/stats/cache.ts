import { aggregateSeasonMetrics, buildStatsStack, projectSeason } from '@/utils/stats/engine'
import type { PlayEvent, SeasonAggregate, SeasonProjection, ChartUnit } from '@/utils/stats/types'

type StackCacheEntry = {
  key: string
  signature: string
  stack: ReturnType<typeof buildStatsStack>
  lastEventAt: string | null
  computedAt: number
}

type SeasonCacheEntry = {
  signature: string
  aggregate: SeasonAggregate
  projection: SeasonProjection
  lastUpdated: string | null
  computedAt: number
}

const STACK_CACHE_LIMIT = 200
const SEASON_CACHE_LIMIT = 50
const stackCache = new Map<string, StackCacheEntry>()
const seasonCache = new Map<string, SeasonCacheEntry>()

function pruneCache<T extends { computedAt: number }>(cache: Map<string, T>, limit: number) {
  if (cache.size <= limit) return
  const entries = Array.from(cache.entries()).sort((a, b) => a[1].computedAt - b[1].computedAt)
  const removeCount = entries.length - limit
  for (let i = 0; i < removeCount; i += 1) {
    cache.delete(entries[i][0])
  }
}

function latestEventTimestamp(events: PlayEvent[]): number {
  return events.reduce((latest, ev) => {
    if (ev.created_at) {
      const ts = Date.parse(ev.created_at)
      return Number.isNaN(ts) ? latest : Math.max(latest, ts)
    }
    return latest
  }, 0)
}

function buildEventSignature(events: PlayEvent[], extras: string[] = []): { signature: string; lastEventAt: string | null } {
  if (events.length === 0) {
    return { signature: `0|${extras.join('|')}`, lastEventAt: null }
  }
  const yards = events.reduce((sum, ev) => sum + (ev.gained_yards ?? 0), 0)
  const seqSum = events.reduce((sum, ev) => sum + (ev.sequence ?? 0), 0)
  const lastTimestamp = latestEventTimestamp(events)
  const lastEventAt = lastTimestamp ? new Date(lastTimestamp).toISOString() : null
  const lastId = events[0]?.id ?? 'none'
  const signature = [events.length, yards.toFixed(1), seqSum, lastTimestamp, lastId, ...extras].join('|')
  return { signature, lastEventAt }
}

export function getCachedStack(params: {
  events: PlayEvent[]
  unit?: ChartUnit
  gameId?: string
  opponentEvents?: PlayEvent[]
  opponentDrives?: ReturnType<typeof buildStatsStack>['drives']
  opponentBox?: ReturnType<typeof buildStatsStack>['box']
  drives?: ReturnType<typeof buildStatsStack>['drives']
}) {
  const { events, unit, gameId } = params
  const extras = [unit ?? 'ALL', gameId ?? 'no-game']
  const { signature, lastEventAt } = buildEventSignature(events, extras)
  const key = `${gameId ?? 'game'}|${unit ?? 'ALL'}`
  const cached = stackCache.get(key)
  if (cached && cached.signature === signature) {
    return cached
  }
  const stack = buildStatsStack({
    events,
    unit,
    opponentEvents: params.opponentEvents,
    opponentDrives: params.opponentDrives,
    opponentBox: params.opponentBox,
    drives: params.drives,
    gameId,
  })
  const entry: StackCacheEntry = {
    key,
    signature,
    stack,
    lastEventAt,
    computedAt: Date.now(),
  }
  stackCache.set(key, entry)
  pruneCache(stackCache, STACK_CACHE_LIMIT)
  return entry
}

export function getCachedSeasonAggregate(
  teamKey: string,
  stacks: Array<{
    gameId: string
    signature: string
    lastEventAt: string | null
    stack: ReturnType<typeof buildStatsStack>
  }>
): SeasonCacheEntry {
  const signature =
    stacks.length === 0
      ? 'empty'
      : stacks
          .map((entry) => `${entry.gameId}:${entry.signature}:${entry.stack.base.plays}`)
          .join('|')
  const cached = seasonCache.get(teamKey)
  if (cached && cached.signature === signature) {
    return cached
  }

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
  const lastUpdatedTs = gamesWithEvents.reduce((latest, entry) => {
    if (!entry.lastEventAt) return latest
    const ts = Date.parse(entry.lastEventAt)
    return Number.isNaN(ts) ? latest : Math.max(latest, ts)
  }, 0)

  const entry: SeasonCacheEntry = {
    signature,
    aggregate,
    projection,
    lastUpdated: lastUpdatedTs ? new Date(lastUpdatedTs).toISOString() : null,
    computedAt: Date.now(),
  }
  seasonCache.set(teamKey, entry)
  pruneCache(seasonCache, SEASON_CACHE_LIMIT)
  return entry
}

export function clearStatsCaches() {
  stackCache.clear()
  seasonCache.clear()
}
