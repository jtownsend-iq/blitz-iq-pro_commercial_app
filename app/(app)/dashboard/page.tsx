import type { ElementType } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Activity,
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Circle,
  FileText,
  Radio,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Upload,
  Users,
  Zap,
} from 'lucide-react'
import { LiveEventFeed } from '@/components/dashboard/LiveEventFeed'
import { LiveSessionList } from '@/components/dashboard/LiveSessionList'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { requireAuth } from '@/utils/auth/requireAuth'
import {
  DASHBOARD_EVENT_COLUMNS,
  buildStacksForGames,
  mapChartRowsToEvents,
} from '@/lib/stats/pipeline'
import { buildStatsStack } from '@/utils/stats/engine'
import type {
  EventRow,
  EventSummary,
  GameListRow,
  SessionRow,
  SessionSummary,
  TeamMemberRow,
  TeamRow,
} from './types'
import { normalizeEventSession, normalizeSessionGame } from './utils'
import type { SeasonAggregate } from '@/utils/stats/types'
import { loadTeamPreferences } from '@/lib/preferences'

const RENDER_TIMESTAMP = Date.now()

type HeroCta = { href: string; label: string }

type SeasonContextUi = {
  label: string
  weekLabel: string
  gamesRemaining: number
  recordLabel: string
  conferenceRank: number | null
  playoffOdds: number | null
  projectedWins: number | null
}

type OpponentContext = {
  name: string
  startTime: string | null
  location: string | null
  homeAway: string | null
  winProbability: number | null
} | null

type WorkflowTask = { key: string; label: string; status: boolean }

type PrepSessionDisplay = {
  id: string
  unit: string
  status: SessionSummary['status']
  title: string
  scheduledDate: string | null
  assignedTo: string | null
  progress: number | null
}

type UnitMetric = { label: string; value: string; rank?: number | null; positive?: boolean }

type UnitPerformanceDisplay = {
  id: string
  name: string
  leagueRank: number | null
  trend: 'up' | 'down' | 'flat'
  metrics: UnitMetric[]
  coordinator: string | null
}

type Insight = {
  id: string
  type: 'opportunity' | 'warning' | 'trend'
  title: string
  description: string
  source: string
  confidence: number | null
}

export default async function DashboardPage() {
  const { user, activeTeamId } = await requireAuth()
  const supabase = await createSupabaseServerClient()

  const { data: membershipsData } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', user.id)

  const memberships: TeamMemberRow[] = (membershipsData as TeamMemberRow[] | null) ?? []
  if (memberships.length === 0) redirect('/onboarding/team')

  const teamIds = memberships.map((m) => m.team_id)
  const { data: teamsData } = await supabase
    .from('teams')
    .select('id, name, level, school_name')
    .in('id', teamIds)

  const teams: TeamRow[] = (teamsData as TeamRow[] | null) ?? []
  if (!activeTeamId) throw new Error('No active team set for user.')
  const activeTeam = teams.find((team) => team.id === activeTeamId)
  if (!activeTeam) throw new Error('Active team not found.')
  const activeTeamName = activeTeam.name ?? 'Team'
  const activeTeamInitials = activeTeamName.slice(0, 2).toUpperCase()

  const preferences = await loadTeamPreferences(supabase, activeTeam.id)

  const { data: sessionsData } = await supabase
    .from('game_sessions')
    .select(
      'id, unit, status, started_at, game_id, games:games(id, opponent_name, start_time, home_or_away, location, status, season_label)'
    )
    .eq('team_id', activeTeam.id)
    .order('started_at', { ascending: false })
    .limit(12)

  const sessionRows: SessionRow[] = (sessionsData as SessionRow[] | null) ?? []
  const sessions: SessionSummary[] = sessionRows.map((session) => ({
    ...session,
    games: normalizeSessionGame(session.games),
  }))

  const { data: gamesData } = await supabase
    .from('games')
    .select('id, opponent_name, start_time, home_or_away, location, status, season_label')
    .eq('team_id', activeTeam.id)
    .order('start_time', { ascending: true })
    .limit(10)

  const games: GameListRow[] = (gamesData as GameListRow[] | null) ?? []

  const activeSessions = sessions.filter((s) => s.status === 'active' || s.status === 'pending')
  const upcomingGameFromGames =
    games.find((g) => (g.start_time ? new Date(g.start_time).getTime() : 0) >= RENDER_TIMESTAMP) ?? null
  const upcomingSession =
    sessions.find(
      (s) => s.games?.start_time && new Date(s.games.start_time).getTime() >= RENDER_TIMESTAMP
    ) ?? null
  const upcomingSessionGame: GameListRow | null = upcomingSession
    ? {
        id: upcomingSession.game_id,
        opponent_name: upcomingSession.games?.opponent_name ?? null,
        start_time: upcomingSession.games?.start_time ?? null,
        home_or_away: upcomingSession.games?.home_or_away ?? null,
        location: upcomingSession.games?.location ?? null,
        status: upcomingSession.games?.status ?? null,
        season_label: upcomingSession.games?.season_label ?? null,
      }
    : null

  const primarySession = activeSessions[0] ?? null
  const currentGameId =
    primarySession?.game_id ??
    upcomingGameFromGames?.id ??
    upcomingSession?.game_id ??
    sessions[0]?.game_id ??
    games[0]?.id ??
    null
  const currentGame: GameListRow | null =
    (currentGameId ? games.find((g) => g.id === currentGameId) : null) ??
    upcomingGameFromGames ??
    upcomingSessionGame

  const { data: recentEventsData } = await supabase
    .from('chart_events')
    .select(
      'id, sequence, play_call, result, gained_yards, explosive, turnover, created_at, game_sessions!inner(unit, game_id)'
    )
    .eq('team_id', activeTeam.id)
    .order('created_at', { ascending: false })
    .limit(40)

  const recentEventRows: EventRow[] = (recentEventsData as EventRow[] | null) ?? []
  const recentEvents: EventSummary[] = recentEventRows.map((event) => ({
    ...event,
    game_sessions: normalizeEventSession(event.game_sessions),
  }))

  const { data: currentGameEventsData } =
    currentGameId && currentGameId.length > 0
      ? await supabase
          .from('chart_events')
          .select(DASHBOARD_EVENT_COLUMNS)
          .eq('team_id', activeTeam.id)
          .eq('game_id', currentGameId)
          .order('created_at', { ascending: false })
          .limit(400)
      : { data: [] }

  const currentGameEvents = mapChartRowsToEvents(currentGameEventsData as unknown[] | null, {
    teamId: activeTeam.id,
    opponent: currentGame?.opponent_name ?? null,
  }, { preferences: preferences.analytics })

  const { data: seasonEventsData } = await supabase
    .from('chart_events')
    .select(DASHBOARD_EVENT_COLUMNS)
    .eq('team_id', activeTeam.id)
    .order('created_at', { ascending: false })
    .limit(900)

  const seasonEvents = mapChartRowsToEvents(
    seasonEventsData as unknown[] | null,
    {
      teamId: activeTeam.id,
    },
    { preferences: preferences.analytics }
  )

  const offenseStack = buildStatsStack({ events: currentGameEvents, unit: 'OFFENSE', gameId: currentGameId ?? undefined })
  const defenseStack = buildStatsStack({ events: currentGameEvents, unit: 'DEFENSE', gameId: currentGameId ?? undefined })
  const specialStack = buildStatsStack({
    events: currentGameEvents,
    unit: 'SPECIAL_TEAMS',
    gameId: currentGameId ?? undefined,
  })
  const gameStack = buildStatsStack({ events: currentGameEvents, gameId: currentGameId ?? undefined })
  const {
    aggregate: seasonAggregate,
    projection,
    lastUpdated: seasonStatsUpdatedAt,
  } = buildStacksForGames(seasonEvents, games, { teamId: activeTeam.id })

  const heroCta = resolveHeroCta(primarySession, currentGameId)
  const lastEventAt = recentEvents[0]?.created_at ?? null
  const freshnessUpdatedAt = seasonStatsUpdatedAt ?? lastEventAt
  const sessionList = mergeUpcomingSessions(sessions, games)
  const seasonContextUi = buildSeasonContextUi({ seasonAggregate, projection, games })
  const opponentContext = buildOpponentContext(currentGame ?? upcomingSessionGame)
  const unitPerformance = buildUnitPerformance({ offenseStack, defenseStack, specialStack })
  const prepSessions = buildPrepSessions(sessions)
  const workflowTasks = buildWorkflowTasks({
    currentGameId,
    seasonEventsCount: seasonEvents.length,
    sessions,
  })
  const insights = buildInsights({ gameStack, seasonAggregate })

  return (
    <div className="min-h-screen tactical-grid-bg" style={{ background: 'var(--surface-base)' }}>
      <div className="scan-line-container">
        <div className="scan-line" />
      </div>

      <nav
        className="border-b sticky top-0 z-50"
        style={{
          borderColor: 'var(--border-strong)',
          background: 'rgba(9, 9, 11, 0.98)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 1px 0 0 rgba(56, 189, 248, 0.1)',
        }}
      >
        <div className="app-container">
          <div className="flex items-center justify-between" style={{ height: '64px' }}>
            <div className="flex items-center" style={{ gap: 'var(--space-4)' }}>
              <div>
                <div
                  style={{
                    fontWeight: 'var(--font-bold)',
                    fontSize: 'var(--text-xl)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '-0.02em',
                lineHeight: '1.2',
              }}
            >
                  BlitzIQ Pro
                </div>
                <div className="tagline" style={{ marginTop: '1px' }}>
                  Engineered to Destroy Egos
                </div>
              </div>
              <div
                aria-hidden
                style={{ width: '1px', height: '32px', background: 'var(--border-default)' }}
              />
              <div>
                <div style={{ color: 'var(--text-quaternary)', fontSize: 'var(--text-xs)' }}>Team</div>
                <div
                  className="data-metric"
                  style={{ fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}
                >
                  {activeTeamName}
                </div>
              </div>
            </div>

            <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
              {primarySession ? (
                <span
                  className="badge badge-brand"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Radio style={{ width: 14, height: 14 }} />
                  Live: {primarySession.unit || 'Session'}
                </span>
              ) : null}
              <div
                className="flex items-center"
                style={{
                  gap: 'var(--space-2)',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-default)',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <Trophy style={{ width: 16, height: 16, color: 'var(--field-400)' }} />
                <span
                  className="data-metric"
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--text-primary)',
                    fontWeight: 'var(--font-semibold)',
                  }}
                >
                  {seasonContextUi.recordLabel}
                </span>
              </div>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-full)',
                  border: '2px solid var(--border-brand)',
                  boxShadow: '0 0 12px rgba(56, 189, 248, 0.2)',
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(255,255,255,0.03)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-secondary)',
                  fontWeight: 'var(--font-semibold)',
                  fontFamily: 'var(--font-display)',
                }}
                aria-label="User avatar"
              >
                {activeTeamInitials}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="app-container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-8)' }}>
        <div
          className="mission-control-card"
          style={{
            position: 'sticky',
            top: 'var(--space-4)',
            zIndex: 30,
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
                <span className="badge badge-brand">
                  {primarySession ? `Live: ${primarySession.unit ?? 'Session'}` : 'Idle'}
                </span>
                <span className="data-metric" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
                  {seasonContextUi.recordLabel}
                </span>
                <span className="badge badge-neutral">{activeTeam.level ?? 'Team'}</span>
              </div>
              <div>
                <h1 style={{ marginBottom: 'var(--space-1)', fontFamily: 'var(--font-display)' }}>Mission Control</h1>
                <p
                  style={{
                    color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-sm)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {seasonContextUi.label}{' '}
                  <span style={{ color: 'var(--electric-400)' }}>{'///'}</span> {seasonContextUi.weekLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center" style={{ gap: 'var(--space-6)' }}>
              <SeasonMetric
                label="Conference Rank"
                value={seasonContextUi.conferenceRank ? `#${seasonContextUi.conferenceRank}` : 'TBD'}
                tone="electric"
              />
              <SeasonMetric
                label="Playoff Odds"
                value={
                  seasonContextUi.playoffOdds != null
                    ? `${Math.round(seasonContextUi.playoffOdds * 100)}%`
                    : 'TBD'
                }
                tone="field"
              />
              <SeasonMetric
                label="Projected Wins"
                value={
                  seasonContextUi.projectedWins != null
                    ? seasonContextUi.projectedWins.toFixed(1)
                    : 'TBD'
                }
                tone="neutral"
              />
            </div>
          </div>
        </div>
        <div className="grid lg:grid-cols-12" style={{ gap: 'var(--space-6)' }}>
          <div className="lg:col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <NextMatchupCard
              opponent={opponentContext}
              daysUntil={getDaysUntil(opponentContext?.startTime ?? null)}
              primaryCta={heroCta}
              secondaryHref="/games"
              freshnessUpdatedAt={freshnessUpdatedAt}
            />

            <section>
              <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
                <h2 style={{ fontFamily: 'var(--font-display)' }}>{seasonContextUi.weekLabel} Prep Status</h2>
                <span
                  className="data-metric"
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {workflowTasks.filter((t) => t.status).length}{' '}
                  <span style={{ color: 'var(--electric-400)' }}>/</span> {workflowTasks.length}
                </span>
              </div>
              <WeeklyWorkflowCard tasks={workflowTasks} />
            </section>

            <section>
              <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
                <h2 style={{ fontFamily: 'var(--font-display)' }}>Prep Sessions</h2>
                <Link href="/games" className="btn btn-primary">
                  <Zap style={{ width: 16, height: 16 }} />
                  New Session
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {prepSessions.length > 0 ? (
                  prepSessions.map((session) => <PrepSessionCard key={session.id} session={session} />)
                ) : (
                  <div
                    className="card"
                    style={{
                      padding: 'var(--space-4)',
                      border: '1px dashed var(--border-default)',
                      background: 'rgba(255,255,255,0.02)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    No prep sessions scheduled. Create one to get the staff aligned.
                  </div>
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
                <h2 style={{ fontFamily: 'var(--font-display)' }}>Unit Performance</h2>
                <Link
                  href="/analytics"
                  className="flex items-center transition-colors"
                  style={{
                    gap: 'var(--space-2)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--electric-400)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 'var(--font-semibold)',
                  }}
                >
                  Full Analytics
                  <ChevronRight style={{ width: 16, height: 16 }} />
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {unitPerformance.map((unit) => (
                  <UnitPerformanceCard key={unit.id} unit={unit} />
                ))}
              </div>
            </section>
          </div>

          <div
            className="lg:col-span-4"
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', minHeight: '100%' }}
          >
            <section>
              <div className="flex items-center" style={{ gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                <Target style={{ width: 18, height: 18, color: 'var(--electric-400)' }} />
                <h3 style={{ fontFamily: 'var(--font-display)' }}>AI Insights</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {insights.length > 0 ? (
                  insights.map((insight) => <InsightCard key={insight.id} insight={insight} />)
                ) : (
                  <div
                    className="card"
                    style={{
                      padding: 'var(--space-4)',
                      border: '1px dashed var(--border-default)',
                      background: 'rgba(255,255,255,0.02)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    No insights available yet. Collect more games or scouting to unlock recommendations.
                  </div>
                )}
              </div>
            </section>

            <section className="mission-control-card" style={{ padding: 'var(--space-4)' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-3)' }}>
                <h4 style={{ fontFamily: 'var(--font-display)' }}>Live Sessions</h4>
                <span className="badge badge-brand">Realtime</span>
              </div>
              <LiveSessionList sessions={sessionList} />
            </section>

            <section className="mission-control-card" style={{ padding: 'var(--space-4)' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-3)' }}>
                <h4 style={{ fontFamily: 'var(--font-display)' }}>Recent Plays</h4>
                <Link
                  href={currentGameId ? `/games/${currentGameId}` : '/games'}
                  className="text-xs uppercase tracking-[0.2em]"
                  style={{ color: 'var(--electric-400)' }}
                >
                  Full Log
                </Link>
              </div>
              <LiveEventFeed
                teamId={activeTeam.id}
                initialEvents={recentEvents}
                fullLogHref={currentGameId ? `/games/${currentGameId}` : '/games'}
              />
            </section>

          </div>
        </div>

        <section
          className="mission-control-card"
          style={{
            position: 'sticky',
            bottom: 0,
            width: '100%',
            marginTop: 'var(--space-6)',
            padding: 'var(--space-4)',
            zIndex: 20,
          }}
        >
          <div className="flex flex-wrap items-center justify-between" style={{ gap: 'var(--space-3)' }}>
            <h4 style={{ fontFamily: 'var(--font-display)' }}>Quick Actions</h4>
            <div className="flex flex-wrap items-center" style={{ gap: 'var(--space-2)' }}>
              <QuickActionButton icon={BarChart3} label="Season Analytics" href="/analytics" />
              <QuickActionButton icon={Target} label="Scouting Reports" href="/scouting" />
              <QuickActionButton icon={Calendar} label="Game Schedule" href="/games" />
              <QuickActionButton icon={Users} label="Team Settings" href="/settings" />
              <QuickActionButton icon={Upload} label="Import Data" href="/scouting/import" />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function resolveHeroCta(session: SessionSummary | null, gameId: string | null): HeroCta {
  if (session) {
    return {
      href: `/games/${session.game_id}/chart/${(session.unit || 'offense').toLowerCase().replace('_', '-')}`,
      label: session.status === 'active' ? 'Resume live game' : 'Open live prep',
    }
  }
  if (gameId) {
    return {
      href: `/games/${gameId}`,
      label: 'Start game session',
    }
  }
  return { href: '/games', label: 'Schedule next opponent' }
}

function buildSeasonContextUi({
  seasonAggregate,
  projection,
  games,
}: {
  seasonAggregate: SeasonAggregate
  projection: ReturnType<typeof buildStacksForGames>['projection']
  games: GameListRow[]
}): SeasonContextUi {
  const label = games[0]?.season_label ?? 'Current Season'
  const now = Date.now()
  const scheduled = games.filter((g) => g.start_time)
  const played = scheduled.filter((g) => g.start_time && new Date(g.start_time).getTime() <= now).length
  const totalScheduled = games.length || seasonAggregate.games || projection?.gamesModeled || 0
  const gamesRemaining = Math.max(totalScheduled - played, 0)
  const weekLabel = `Week ${Math.max(played + 1, 1)}`
  const conferenceRank = deriveConferenceRank({ projection, seasonAggregate })
  const playoffOdds = derivePlayoffOdds({ projection, seasonAggregate })
  const projectedWins = deriveProjectedWins({ projection, totalScheduled })

  return {
    label,
    weekLabel,
    gamesRemaining,
    recordLabel: totalScheduled ? `${played}-${gamesRemaining} (games logged)` : 'Record unavailable',
    conferenceRank,
    playoffOdds,
    projectedWins,
  }
}

function buildOpponentContext(game: GameListRow | null): OpponentContext {
  if (!game) return null
  return {
    name: game.opponent_name ?? 'Opponent TBD',
    startTime: game.start_time ?? null,
    location: game.location ?? null,
    homeAway: game.home_or_away ?? null,
    winProbability: null,
  }
}

function buildWorkflowTasks({
  currentGameId,
  seasonEventsCount,
  sessions,
}: {
  currentGameId: string | null
  seasonEventsCount: number
  sessions: SessionSummary[]
}): WorkflowTask[] {
  const hasOffensePrep = sessions.some((s) => s.unit === 'OFFENSE')
  const hasDefensePrep = sessions.some((s) => s.unit === 'DEFENSE')
  const hasSpecialPrep = sessions.some((s) => s.unit === 'SPECIAL_TEAMS')

  return [
    { key: 'opponentScheduled', label: 'Opponent scheduled in Games', status: Boolean(currentGameId) },
    { key: 'scoutingDataLoaded', label: 'Scouting data imported', status: seasonEventsCount > 0 },
    { key: 'offensePrepStarted', label: 'Offense prep session started', status: hasOffensePrep },
    { key: 'defensePrepStarted', label: 'Defense prep session started', status: hasDefensePrep },
    { key: 'specialTeamsPrepStarted', label: 'Special teams prep started', status: hasSpecialPrep },
    { key: 'gameplanReviewed', label: 'Game plan reviewed', status: false },
    { key: 'filmReviewComplete', label: 'Film review complete', status: false },
  ]
}

function buildPrepSessions(sessions: SessionSummary[]): PrepSessionDisplay[] {
  return sessions.slice(0, 4).map((session) => ({
    id: session.id,
    unit: session.unit || 'Unit',
    status: session.status,
    title: session.games?.opponent_name ? `Prep: ${session.games.opponent_name}` : 'Session ready to start',
    scheduledDate: session.started_at ?? session.games?.start_time ?? null,
    assignedTo: session.unit ? `${session.unit} coach` : null,
    progress: session.status === 'active' ? 50 : null,
  }))
}

function buildUnitPerformance({
  offenseStack,
  defenseStack,
  specialStack,
}: {
  offenseStack: ReturnType<typeof buildStatsStack>
  defenseStack: ReturnType<typeof buildStatsStack>
  specialStack: ReturnType<typeof buildStatsStack>
}): UnitPerformanceDisplay[] {
  return [
    {
      id: 'offense',
      name: 'Offense',
      leagueRank: null,
      trend: offenseStack.box.yardsPerPlay > 0 ? 'up' : 'flat',
      coordinator: 'Offense',
      metrics: [
        { label: 'Yards/Play', value: formatDecimal(offenseStack.box.yardsPerPlay), positive: true },
        { label: 'Success Rate', value: formatPercent(offenseStack.game.efficiency.success.rate), positive: true },
        { label: 'Explosive Diff', value: formatNumber(offenseStack.explosives.offense.explosives - offenseStack.explosives.defense.explosives) },
        { label: 'Points/Drive', value: formatDecimal(offenseStack.core?.pointsPerDrive ?? offenseStack.advanced.estimatedEPAperPlay) },
      ],
    },
    {
      id: 'defense',
      name: 'Defense',
      leagueRank: null,
      trend: defenseStack.defense?.havoc.rate ? 'up' : 'flat',
      coordinator: 'Defense',
      metrics: [
        { label: 'Havoc Rate', value: formatPercent(defenseStack.defense?.havoc.rate ?? 0), positive: true },
        { label: 'Yards/Play Allowed', value: formatDecimal(defenseStack.box.yardsPerPlay) },
        { label: 'Points/Drive Allowed', value: formatDecimal(defenseStack.defense?.drives.pointsPerDrive ?? 0) },
        { label: 'Takeaways', value: formatNumber(defenseStack.turnovers.takeaways) },
      ],
    },
    {
      id: 'special',
      name: 'Special Teams',
      leagueRank: null,
      trend: specialStack.specialTeams.fieldPosition.netStart ? 'up' : 'flat',
      coordinator: 'Special Teams',
      metrics: [
        {
          label: 'Net Field Pos',
          value: formatNumber(specialStack.specialTeams.fieldPosition.netStart ?? 0),
          positive: true,
        },
        {
          label: 'FG Make %',
          value: formatPercent(specialStack.specialTeams.fieldGoals.overall.pct ?? 0),
          positive: true,
        },
        {
          label: 'Punt Net',
          value: formatDecimal(specialStack.specialTeams.punting.team.net ?? 0),
        },
        {
          label: 'Returns AVG',
          value: formatDecimal(specialStack.specialTeams.kickoffReturns.team.average ?? 0),
          positive: true,
        },
      ],
    },
  ]
}

function buildInsights({
  gameStack,
  seasonAggregate,
}: {
  gameStack: ReturnType<typeof buildStatsStack>
  seasonAggregate: SeasonAggregate
}): Insight[] {
  const insights: Insight[] = []
  const explosiveDiff =
    seasonAggregate.explosives.offenseRate - seasonAggregate.explosives.defenseRate
  insights.push({
    id: 'explosive-edge',
    type: explosiveDiff >= 0 ? 'opportunity' : 'warning',
    title: explosiveDiff >= 0 ? 'Explosive edge available' : 'Explosive plays conceded',
    description:
      explosiveDiff >= 0
        ? 'Offense holds an explosive play rate advantage. Lean into shot plays early.'
        : 'Opponent matches explosives. Tighten coverage shells and limit explosives.',
    source: 'Season analytics',
    confidence: 0.84,
  })

  const turnoverMargin = seasonAggregate.turnover.averageMargin
  insights.push({
    id: 'turnover-margin',
    type: turnoverMargin >= 0 ? 'opportunity' : 'warning',
    title: turnoverMargin >= 0 ? 'Protect the ball, press takeaways' : 'Turnover margin slipping',
    description:
      turnoverMargin >= 0
        ? 'Positive turnover margin - keep pressure on QB and secure ball security drills.'
        : 'Negative turnover margin - tighten ball security and simplify reads this week.',
    source: 'Season analytics',
    confidence: 0.8,
  })

  if (gameStack.advanced.estimatedEPAperPlay) {
    insights.push({
      id: 'live-epa',
      type: 'trend',
      title: 'Live EPA trend',
      description: `Current estimated EPA/play ${formatDecimal(
        gameStack.advanced.estimatedEPAperPlay
      )}. Sustain tempo to keep edge.`,
      source: 'Live stack',
      confidence: 0.76,
    })
  }

  return insights
}

function mergeUpcomingSessions(sessions: SessionSummary[], games: GameListRow[]): SessionSummary[] {
  const sessionByGame = new Set(sessions.map((s) => s.game_id))
  const placeholders: SessionSummary[] = games
    .filter((g) => !sessionByGame.has(g.id))
    .map((g) => ({
      id: `upcoming-${g.id}`,
      unit: 'OFFENSE',
      status: 'pending',
      started_at: g.start_time,
      game_id: g.id,
      games: {
        opponent_name: g.opponent_name,
        start_time: g.start_time,
        home_or_away: g.home_or_away,
        location: g.location,
        status: g.status,
        season_label: g.season_label,
      },
    }))

  return [...sessions, ...placeholders]
}

function formatNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '0'
  return Math.round(value).toLocaleString()
}

function formatDecimal(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '0.0'
  return (Math.round(value * 100) / 100).toFixed(2)
}

function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '0%'
  return `${Math.round(value * 100)}%`
}

function deriveConferenceRank({
  projection,
  seasonAggregate,
}: {
  projection: ReturnType<typeof buildStacksForGames>['projection']
  seasonAggregate: SeasonAggregate
}): number | null {
  if (projection?.projectedConferenceWinRate != null) {
    const teamsInConference = 12
    return Math.max(1, Math.round((1 - projection.projectedConferenceWinRate) * teamsInConference))
  }

  const avgDiff = seasonAggregate.scoring.averageDifferential
  if (Number.isNaN(avgDiff)) return null
  if (avgDiff >= 14) return 1
  if (avgDiff >= 7) return 3
  if (avgDiff >= 3) return 5
  if (avgDiff >= 0) return 7
  return 9
}

function derivePlayoffOdds({
  projection,
  seasonAggregate,
}: {
  projection: ReturnType<typeof buildStacksForGames>['projection']
  seasonAggregate: SeasonAggregate
}): number | null {
  if (projection?.projectedPlayoffRate != null) return projection.projectedPlayoffRate

  const avgDiff = seasonAggregate.scoring.averageDifferential
  const turnoverMargin = seasonAggregate.turnover.averageMargin
  if (Number.isNaN(avgDiff) || Number.isNaN(turnoverMargin)) return null

  const score = avgDiff * 0.04 + turnoverMargin * 0.06
  const odds = 1 / (1 + Math.exp(-score))
  return Number(odds.toFixed(2))
}

function deriveProjectedWins({
  projection,
  totalScheduled,
}: {
  projection: ReturnType<typeof buildStacksForGames>['projection']
  totalScheduled: number
}): number | null {
  if (projection?.projectedWinRate != null) {
    const games = Math.max(totalScheduled || 10, 10)
    return Number((projection.projectedWinRate * games).toFixed(1))
  }
  return null
}

function getDaysUntil(startTime: string | null): number | null {
  if (!startTime) return null
  const diff = new Date(startTime).getTime() - Date.now()
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0)
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return 'TBD'
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateString))
}

function SeasonMetric({ label, value, tone }: { label: string; value: string; tone: 'electric' | 'field' | 'neutral' }) {
  const color =
    tone === 'electric'
      ? 'var(--electric-400)'
      : tone === 'field'
        ? 'var(--field-400)'
        : 'var(--text-primary)'
  return (
    <div>
      <div className="stat-label" style={{ marginBottom: 'var(--space-2)' }}>
        {label}
      </div>
      <div
        className="data-metric"
        style={{
          fontSize: 'var(--text-3xl)',
          fontWeight: 'var(--font-black)',
          color,
          textShadow: tone !== 'neutral' ? '0 0 16px rgba(56, 189, 248, 0.35)' : undefined,
        }}
      >
        {value}
      </div>
    </div>
  )
}

function NextMatchupCard({
  opponent,
  daysUntil,
  primaryCta,
  secondaryHref,
  freshnessUpdatedAt,
}: {
  opponent: OpponentContext
  daysUntil: number | null
  primaryCta: HeroCta
  secondaryHref: string
  freshnessUpdatedAt: string | null
}) {
  return (
    <div className="mission-control-card" style={{ padding: 'var(--space-6)' }}>
      <div className="flex items-start justify-between" style={{ marginBottom: 'var(--space-5)' }}>
        <div>
          <div className="flex items-center" style={{ gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <span className="badge badge-brand">Next Matchup</span>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
              {daysUntil == null ? 'Schedule upcoming' : daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil} days`}
            </span>
          </div>
          <h2 style={{ marginBottom: 'var(--space-3)', fontFamily: 'var(--font-display)' }}>
            {opponent?.name ? `vs ${opponent.name}` : 'Next opponent not set'}
          </h2>
          <div className="flex items-center" style={{ gap: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
            <span>{opponent?.startTime ? formatDateTime(opponent.startTime) : 'Kickoff TBD'}</span>
            <span>•</span>
            <span>{opponent?.location ?? 'Location TBD'}</span>
            <span>•</span>
            <span className="badge badge-neutral">{opponent?.homeAway ?? 'TBD'}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="stat-label" style={{ marginBottom: 'var(--space-1)' }}>
            Win Probability
          </div>
          <div
            style={{
              fontSize: 'var(--text-3xl)',
              fontWeight: 'var(--font-semibold)',
              fontFamily: 'var(--font-mono)',
              color: opponent?.winProbability && opponent.winProbability > 0.5 ? 'var(--field-400)' : 'var(--text-secondary)',
            }}
          >
            {opponent?.winProbability != null ? `${Math.round(opponent.winProbability * 100)}%` : 'TBD'}
          </div>
          <div
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-quaternary)',
              marginTop: 'var(--space-1)',
            }}
          >
            Last updated {freshnessUpdatedAt ? formatDateTime(freshnessUpdatedAt) : 'pending stats'}
          </div>
        </div>
      </div>

      <div className="flex" style={{ gap: 'var(--space-3)' }}>
        <Link href={primaryCta.href} className="btn btn-primary">
          <Zap style={{ width: 16, height: 16 }} />
          {primaryCta.label}
        </Link>
        <Link href={secondaryHref} className="btn btn-secondary">
          <Target style={{ width: 16, height: 16 }} />
          Scout Report
        </Link>
        <Link href={secondaryHref} className="btn btn-secondary">
          <FileText style={{ width: 16, height: 16 }} />
          Game Plan
        </Link>
      </div>
    </div>
  )
}

function WeeklyWorkflowCard({ tasks }: { tasks: WorkflowTask[] }) {
  return (
    <div className="card" style={{ padding: 'var(--space-5)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {tasks.map((task) => (
          <div key={task.key} className="flex items-center justify-between">
            <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
              {task.status ? (
                <CheckCircle2 style={{ width: 16, height: 16, color: 'var(--field-400)' }} />
              ) : (
                <Circle style={{ width: 16, height: 16, color: 'var(--text-quaternary)' }} />
              )}
              <span style={{ fontSize: 'var(--text-sm)', color: task.status ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>
                {task.label}
              </span>
            </div>
            {!task.status && (
              <button className="btn badge-neutral" type="button">
                Start
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function PrepSessionCard({ session }: { session: PrepSessionDisplay }) {
  const getStatusBadge = () => {
    switch (session.status) {
      case 'active':
        return <span className="badge badge-brand">IN PROGRESS</span>
      case 'pending':
        return <span className="badge badge-neutral">PENDING</span>
      case 'completed':
        return <span className="badge badge-success">COMPLETED</span>
      default:
        return null
    }
  }

  return (
    <div className="card-hover" style={{ padding: 'var(--space-4)' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-3)' }}>
        <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
          <div>
            <span className="badge badge-neutral" style={{ marginBottom: 'var(--space-1)' }}>
              {session.unit}
            </span>
            <h3 style={{ marginTop: 'var(--space-1)', fontFamily: 'var(--font-display)' }}>{session.title}</h3>
          </div>
          {getStatusBadge()}
        </div>
        <Link href="/games" className="btn btn-primary">
          <Zap style={{ width: 16, height: 16 }} />
          {session.status === 'active' ? 'Resume' : 'Start'}
        </Link>
      </div>

      <div className="grid grid-cols-3" style={{ gap: 'var(--space-4)' }}>
        <div>
          <div className="stat-label" style={{ marginBottom: 'var(--space-1)' }}>
            Assigned To
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            {session.assignedTo ?? 'Unassigned'}
          </div>
        </div>
        <div>
          <div className="stat-label" style={{ marginBottom: 'var(--space-1)' }}>
            Scheduled
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            {session.scheduledDate ? formatDateTime(session.scheduledDate) : 'TBD'}
          </div>
        </div>
        <div>
          <div className="stat-label" style={{ marginBottom: 'var(--space-1)' }}>
            Est. Time
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>~1 hour</div>
        </div>
      </div>

      {session.status === 'active' && (
        <>
          <div className="divider" style={{ margin: 'var(--space-3) 0' }} />
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                Progress
              </span>
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-semibold)',
                  color: 'var(--field-400)',
                }}
              >
                {session.progress ?? 0}%
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '4px',
                background: 'var(--surface-muted)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${session.progress ?? 0}%`,
                  height: '100%',
                  background: 'var(--field-400)',
                  transition: 'width var(--transition-base)',
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function UnitPerformanceCard({ unit }: { unit: UnitPerformanceDisplay }) {
  const TrendIcon = unit.trend === 'up' ? TrendingUp : unit.trend === 'down' ? TrendingDown : Activity

  return (
    <div className="card-hover" style={{ padding: 'var(--space-5)' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)' }}>{unit.name}</h3>
          <span className="badge badge-neutral data-metric">
            Rank {unit.leagueRank ? `#${unit.leagueRank}` : 'TBD'}
          </span>
        </div>
        <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
          <TrendIcon
            style={{
              width: 18,
              height: 18,
              color: unit.trend === 'up' ? 'var(--field-400)' : 'var(--text-quaternary)',
              filter: unit.trend === 'up' ? 'drop-shadow(0 0 4px rgba(74, 222, 128, 0.4))' : 'none',
            }}
          />
          <span
            style={{
              fontSize: 'var(--text-sm)',
              color: unit.trend === 'up' ? 'var(--field-400)' : 'var(--text-tertiary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {unit.trend === 'up' ? 'Improving' : unit.trend === 'down' ? 'Falling' : 'Steady'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ gap: 'var(--space-4)' }}>
        {unit.metrics.map((metric) => (
          <div
            key={metric.label}
            className="card"
            style={{
              padding: 'var(--space-3)',
              background: 'var(--surface-base)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="stat-label" style={{ marginBottom: 'var(--space-2)' }}>
              {metric.label}
            </div>
            <div className="flex items-baseline justify-between">
              <span
                className="data-metric"
                style={{
                  fontSize: 'var(--text-2xl)',
                  fontWeight: 'var(--font-black)',
                  color: metric.positive ? 'var(--field-400)' : 'var(--text-primary)',
                }}
              >
                {metric.value}
              </span>
              {metric.rank != null ? (
                <span className="badge badge-neutral data-metric" style={{ fontSize: 'var(--text-xs)' }}>
                  #{metric.rank}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="divider" style={{ margin: 'var(--space-4) 0' }} />

      <div className="flex items-center justify-between">
        <span
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Coordinator: <span style={{ color: 'var(--text-secondary)' }}>{unit.coordinator ?? 'TBD'}</span>
        </span>
        <Link
          href="/analytics"
          className="flex items-center transition-colors"
          style={{
            gap: 'var(--space-1)',
            fontSize: 'var(--text-sm)',
            color: 'var(--electric-400)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: 'var(--font-semibold)',
          }}
        >
          Details
          <ChevronRight style={{ width: 14, height: 14 }} />
        </Link>
      </div>
    </div>
  )
}

function InsightCard({ insight }: { insight: Insight }) {
  const icon =
    insight.type === 'opportunity' ? (
      <Target style={{ width: 14, height: 14 }} />
    ) : insight.type === 'warning' ? (
      <AlertCircle style={{ width: 14, height: 14 }} />
    ) : (
      <Activity style={{ width: 14, height: 14 }} />
    )

  const color =
    insight.type === 'opportunity'
      ? 'var(--field-400)'
      : insight.type === 'warning'
        ? 'var(--combat-400)'
        : 'var(--electric-400)'

  return (
    <div className="card" style={{ padding: 'var(--space-4)' }}>
      <div className="flex items-start" style={{ gap: 'var(--space-2)' }}>
        <div style={{ color, marginTop: '2px' }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-semibold)',
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-1)',
            }}
          >
            {insight.title}
          </div>
          <div
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-tertiary)',
              marginBottom: 'var(--space-2)',
            }}
          >
            {insight.description}
          </div>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-quaternary)' }}>{insight.source}</span>
            <span
              style={{
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-quaternary)',
              }}
            >
              {insight.confidence != null ? `${Math.round(insight.confidence * 100)}% confidence` : '--'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function QuickActionButton({ icon: Icon, label, href }: { icon: ElementType; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border transition-all"
      style={{
        padding: 'var(--space-3)',
        borderColor: 'var(--border-default)',
        background: 'transparent',
      }}
    >
      <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
        <Icon style={{ width: 16, height: 16, color: 'var(--text-quaternary)' }} />
        <span style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      <ChevronRight style={{ width: 16, height: 16, color: 'var(--text-quaternary)' }} />
    </Link>
  )
}
