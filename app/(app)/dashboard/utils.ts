import {
  EventRow,
  EventSummary,
  EventSummarySession,
  SessionRow,
  SessionSummaryGame,
  SparkPoint,
} from './types'

export function normalizeSessionGame(games: SessionRow['games']): SessionSummaryGame | null {
  if (!games) return null
  return Array.isArray(games) ? games[0] ?? null : games
}

export function normalizeEventSession(
  gameSessions: EventRow['game_sessions']
): EventSummarySession | null {
  if (!gameSessions) return null
  return Array.isArray(gameSessions) ? gameSessions[0] ?? null : gameSessions
}

export function formatUnitLabel(unit?: string | null) {
  if (!unit) return 'Unknown unit'
  const lower = unit.toLowerCase()
  if (lower === 'special_teams') return 'Special Teams'
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

export function formatDateShort(value: string | null) {
  if (!value) return 'TBD'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatRelativeTime(value: string | null) {
  if (!value) return 'unknown'
  const delta = Date.now() - new Date(value).getTime()
  const minutes = Math.floor(delta / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function formatEventTimestamp(value: string | null) {
  if (!value) return 'just now'
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function buildVolumeSparkline(events: EventSummary[]): SparkPoint[] {
  const chronological = [...events].reverse()
  if (chronological.length === 0) {
    return createFlatSparkline(6, 0)
  }

  return chronological.map((_, index) => ({
    index,
    value: index + 1,
  }))
}

export function buildExplosiveSparkline(events: EventSummary[]): SparkPoint[] {
  const chronological = [...events].reverse()
  if (chronological.length === 0) {
    return createFlatSparkline(6, 0)
  }

  let running = 0
  return chronological.map((event, index) => {
    if (event.explosive) running += 1
    return { index, value: running || 0.2 * (index + 1) }
  })
}

function createFlatSparkline(points: number, value: number): SparkPoint[] {
  return Array.from({ length: points }).map((_, index) => ({
    index,
    value,
  }))
}
