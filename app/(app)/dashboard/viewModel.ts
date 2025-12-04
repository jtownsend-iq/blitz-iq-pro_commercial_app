import { DashboardCounts, EventSummary, SessionSummary, TeamMemberRow, TeamRow } from './types'

export type Unit = 'OFFENSE' | 'DEFENSE' | 'SPECIAL_TEAMS'
export type StatTileIntent = 'neutral' | 'good' | 'bad' | 'warning'

export type StatTile = {
  id: string
  label: string
  value: string
  deltaLabel?: string
  context?: string
  intent?: StatTileIntent
}

export type UnitSummary = {
  unit: Unit
  primaryStats: StatTile[]
  secondaryStats: StatTile[]
}

export type GlobalGameMetrics = {
  drives: StatTile[]
  efficiency: StatTile[]
  fieldPosition: StatTile[]
}

export type ScoutingPreview = {
  status: 'missing' | 'incomplete' | 'ready'
  errorsStatus: 'clean' | 'needs_fixes'
  playsCount: number
  issuesCount: number
  topTendencies: StatTile[]
}

export type RealtimeStatus = 'connected' | 'degraded' | 'disconnected'

export type RoleCategory =
  | 'offense'
  | 'defense'
  | 'special_teams'
  | 'analyst'
  | 'it'
  | 'admin'
  | 'coach'

export type DashboardHero = {
  title: string
  subtitle: string
  modeLabel: 'Pregame' | 'Game live' | 'Final'
  roleLabel: string
  ctaLabel: string
  ctaHref: string
}

export type DashboardViewState = {
  hero: DashboardHero
  gameContext: {
    opponentName: string | null
    kickoffLabel: string | null
    scoreLabel: string | null
  }
  globalMetrics: GlobalGameMetrics
  perUnit: UnitSummary[]
  scouting: ScoutingPreview
  realtime: {
    liveSessionCount: number
    recentEventsCount: number
    lastEventAt: string | null
    status: RealtimeStatus
  }
  rawCounts: DashboardCounts
}

export type ScoutingImport = {
  status?: string | null
  error_log?: string | null
  opponent_name?: string | null
  season?: string | null
}

export type BuildDashboardViewModelInput = {
  team: TeamRow
  membership: TeamMemberRow | null
  sessions: SessionSummary[]
  events: EventSummary[]
  counts: DashboardCounts
  scoutingImports: ScoutingImport[]
  scoutingPlaysCount: number
}

export function buildDashboardViewState(input: BuildDashboardViewModelInput): DashboardViewState {
  const { membership, sessions, events, counts, scoutingImports, scoutingPlaysCount } = input

  const activeRole = membership?.role || 'Coach'
  const normalizedRole = normalizeRole(activeRole)
  const activeSessions = sessions.filter((session) => session.status === 'active')
  const activeOrPendingSessions = sessions.filter(
    (session) => session.status === 'active' || session.status === 'pending'
  )
  const upcomingSessions = sessions.filter((session) => session.status !== 'completed')
  const nextGameSession =
    [...upcomingSessions].sort((a, b) => {
      const aStart = a.games?.start_time || a.started_at || ''
      const bStart = b.games?.start_time || b.started_at || ''
      return aStart.localeCompare(bStart)
    })[0] || null
  const currentSession = activeOrPendingSessions[0] || nextGameSession || sessions[0] || null
  const currentGameId = currentSession?.game_id ?? null
  const currentGameEvents = currentGameId
    ? events.filter((event) => event.game_sessions?.game_id === currentGameId)
    : []

  const playsThisGame = currentGameEvents.length
  const explosiveThisGame = currentGameEvents.filter((event) => Boolean(event.explosive)).length
  const turnoversThisGame = currentGameEvents.filter((event) => Boolean(event.turnover)).length
  const explosiveRate = playsThisGame ? Math.round((explosiveThisGame / playsThisGame) * 100) : 0
  const liveSessionCount = activeSessions.length
  const hasSessions = sessions.length > 0

  const opponentName = currentSession?.games?.opponent_name || 'Opponent TBD'
  const kickoffLabel = formatKickoff(currentSession?.games?.start_time)
  const hasUpcomingGame = Boolean(nextGameSession)
  const hasLiveSession = liveSessionCount > 0

  const heroTitleDefault = "Set tonight's matchup"
  const heroSubtitleDefault =
    'No upcoming game is scheduled. Lock in opponent and kickoff so the staff can chart in one click.'

  let heroTitle = heroTitleDefault
  let heroSubtitle = heroSubtitleDefault

  if (hasUpcomingGame && !hasLiveSession) {
    heroTitle = 'Upcoming game locked in'
    heroSubtitle = `vs ${opponentName} - ${kickoffLabel}. Start charting or assign units before warmups.`
  }

  if (hasLiveSession) {
    heroTitle = 'Live game-day control'
    heroSubtitle = `vs ${opponentName} - ${kickoffLabel}. Active sessions are ready for the staff.`
  }

  const ctaLabel = selectCtaLabel(normalizedRole)

  const ctaHref = currentSession
    ? `/games/${currentSession.game_id}/chart/${unitSlug(currentSession.unit)}`
    : '/games'

  const globalMetrics: GlobalGameMetrics = {
    drives: [
      {
        id: 'plays-total',
        label: 'Total plays',
        value: playsThisGame.toLocaleString(),
        context: 'Recent charted plays for this matchup',
        intent: 'neutral',
      },
    ],
    efficiency: [
      {
        id: 'explosive-plays',
        label: 'Explosive plays',
        value: explosiveThisGame.toLocaleString(),
        context: `${explosiveRate}% explosive rate`,
        intent: explosiveRate >= 15 ? 'good' : 'neutral',
      },
    ],
    fieldPosition: [
      {
        id: 'turnovers',
        label: 'Turnovers',
        value: turnoversThisGame.toLocaleString(),
        context: 'Giveaways recorded this game',
        intent: turnoversThisGame > 0 ? 'warning' : 'good',
      },
    ],
  }

  const perUnit: UnitSummary[] = [
    buildUnitSummary('OFFENSE', currentGameEvents),
    buildUnitSummary('DEFENSE', currentGameEvents),
    buildUnitSummary('SPECIAL_TEAMS', currentGameEvents),
  ]

  const scouting = buildScoutingPreview({
    imports: scoutingImports,
    playsCount: scoutingPlaysCount,
  })

  const realtimeLastEventAt = findLastEventAt(events)

  return {
    hero: {
      title: heroTitle,
      subtitle: heroSubtitle,
      modeLabel: selectModeLabel({ hasLiveSession, hasUpcomingGame, hasSessions }),
      roleLabel: activeRole,
      ctaLabel,
      ctaHref,
    },
    gameContext: {
      opponentName,
      kickoffLabel,
      scoreLabel: null,
    },
    globalMetrics,
    perUnit,
    scouting,
    realtime: {
      liveSessionCount: counts.activeSessions,
      recentEventsCount: events.length,
      lastEventAt: realtimeLastEventAt,
      status: 'connected',
    },
    rawCounts: counts,
  }
}

function selectModeLabel({
  hasLiveSession,
  hasUpcomingGame,
  hasSessions,
}: {
  hasLiveSession: boolean
  hasUpcomingGame: boolean
  hasSessions: boolean
}): DashboardHero['modeLabel'] {
  if (hasLiveSession) return 'Game live'
  if (hasUpcomingGame) return 'Pregame'
  if (hasSessions) return 'Final'
  return 'Pregame'
}

function formatKickoff(value?: string | null) {
  if (!value) return 'Kickoff time TBD'
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function unitSlug(value?: string | null) {
  return (value || 'offense').toLowerCase().replace(/_/g, '-')
}

function normalizeRole(role: string): RoleCategory {
  const lower = (role || '').toLowerCase()
  if (lower.includes('offensive') || lower.includes('oc')) return 'offense'
  if (lower.includes('defensive') || lower.includes('dc')) return 'defense'
  if (lower.includes('special')) return 'special_teams'
  if (lower.includes('analyst')) return 'analyst'
  if (lower.includes('it') || lower.includes('admin')) return 'admin'
  return 'coach'
}

function selectCtaLabel(role: RoleCategory) {
  switch (role) {
    case 'offense':
      return 'Open offense chart'
    case 'defense':
      return 'Open defense chart'
    case 'special_teams':
      return 'Open special teams chart'
    case 'analyst':
      return 'Open charting for tonight'
    case 'admin':
      return "Manage tonight's sessions"
    default:
      return 'Open game-day view'
  }
}

function normalizeUnit(unit?: string | null): Unit | null {
  const lower = (unit || '').toLowerCase()
  if (lower === 'offense') return 'OFFENSE'
  if (lower === 'defense') return 'DEFENSE'
  if (lower === 'special_teams' || lower === 'special-teams' || lower === 'special teams')
    return 'SPECIAL_TEAMS'
  return null
}

function buildUnitSummary(targetUnit: Unit, events: EventSummary[]): UnitSummary {
  const unitEvents = events.filter(
    (event) => normalizeUnit(event.game_sessions?.unit) === targetUnit
  )
  const plays = unitEvents.length
  const explosiveCount = unitEvents.filter((event) => Boolean(event.explosive)).length
  const explosiveRate = plays ? Math.round((explosiveCount / plays) * 100) : 0

  return {
    unit: targetUnit,
    primaryStats: [
      {
        id: `${targetUnit}-plays`,
        label: 'Plays',
        value: plays.toLocaleString(),
        intent: 'neutral',
      },
    ],
    secondaryStats: [
      {
        id: `${targetUnit}-explosive-rate`,
        label: 'Explosive rate',
        value: `${explosiveRate}%`,
        context: `${explosiveCount.toLocaleString()} explosive`,
        intent: explosiveRate >= 15 ? 'good' : 'neutral',
      },
    ],
  }
}

function buildScoutingPreview({
  imports,
  playsCount,
}: {
  imports: ScoutingImport[]
  playsCount: number
}): ScoutingPreview {
  const normalizedImports = imports || []
  const hasSuccessfulImport = normalizedImports.some((imp) => {
    const status = (imp.status || '').toLowerCase()
    return status === 'success' || status === 'completed' || status === 'processed'
  })
  const hasImports = normalizedImports.length > 0
  const hasImportErrors =
    normalizedImports.some((imp) => {
      const status = (imp.status || '').toLowerCase()
      return status === 'error' || status === 'failed' || status === 'failure'
    }) || normalizedImports.some((imp) => Boolean(imp.error_log))

  const issuesCount = normalizedImports.filter((imp) => {
    const status = (imp.status || '').toLowerCase()
    const nonSuccess =
      status && status !== 'success' && status !== 'completed' && status !== 'processed'
    return nonSuccess || Boolean(imp.error_log)
  }).length

  const status: ScoutingPreview['status'] = hasSuccessfulImport
    ? 'ready'
    : hasImports
    ? 'incomplete'
    : 'missing'

  const errorsStatus: ScoutingPreview['errorsStatus'] = hasImportErrors ? 'needs_fixes' : 'clean'

  return {
    status,
    errorsStatus,
    playsCount,
    issuesCount,
    topTendencies: [],
  }
}

function findLastEventAt(events: EventSummary[]): string | null {
  return events.reduce<string | null>((latest, event) => {
    if (!event.created_at) return latest
    if (!latest) return event.created_at
    return new Date(event.created_at).getTime() > new Date(latest).getTime()
      ? event.created_at
      : latest
  }, null)
}
