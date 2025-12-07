import Link from 'next/link'
import { Suspense, type ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { Activity, Flame, Shield, Sparkles } from 'lucide-react'
import { LiveEventFeed } from '@/components/dashboard/LiveEventFeed'
import { LiveSessionList } from '@/components/dashboard/LiveSessionList'
import { StatCard, StatsGrid } from '@/components/dashboard/StatsGrid'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { requireAuth } from '@/utils/auth/requireAuth'
import { DashboardRealtimeClient } from './RealtimeClient'
import { ActionButton } from './ActionButton'
import { setActiveTeam } from './actions'
import { DashboardTracker } from './DashboardTracker'
import { HeroCtaLink } from './HeroCtaLink'
import {
  buildExplosiveSparkline,
  buildVolumeSparkline,
  normalizeEventSession,
  normalizeSessionGame,
} from './utils'
import {
  DashboardCounts,
  EventRow,
  EventSummary,
  SessionRow,
  SessionSummary,
  TeamMemberRow,
  TeamRow,
} from './types'
import { DashboardViewState, buildDashboardViewState } from './viewModel'

type SurfaceProps = {
  children: ReactNode
  className?: string
}

function Surface({ children, className }: SurfaceProps) {
  return (
    <div
      className={`rounded-3xl border border-slate-800/80 bg-slate-950/60 p-6 shadow-[0_25px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl ${className || ''}`}
    >
      {children}
    </div>
  )
}

export default async function DashboardPage() {
  const { user, activeTeamId } = await requireAuth()
  const supabase = await createSupabaseServerClient()

  const resolvedActiveTeamId = activeTeamId

  const { data: membershipsData, error: membershipError } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', user.id)

  if (membershipError) {
    console.error('Error fetching team memberships:', membershipError.message)
  }

  const memberships: TeamMemberRow[] = (membershipsData as TeamMemberRow[] | null) ?? []

  if (memberships.length === 0) {
    redirect('/onboarding/team')
  }

  const teamIds = memberships.map((m) => m.team_id)

  let teams: TeamRow[] = []
  if (teamIds.length > 0) {
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, level, school_name')
      .in('id', teamIds)

    if (teamsError) {
      console.error('Error fetching teams:', teamsError.message)
    } else if (teamsData) {
      teams = teamsData as TeamRow[]
    }
  }

  if (teams.length === 0) {
    throw new Error('No teams found for user.')
  }

  if (!resolvedActiveTeamId) {
    throw new Error('No active team set for user.')
  }

  const activeTeam = teams.find((team) => team.id === resolvedActiveTeamId)

  if (!activeTeam) {
    throw new Error('Active team not found.')
  }

  let sessionSummaries: SessionSummary[] = []
  let recentEvents: EventSummary[] = []
  let totalPlays = 0
  let explosivePlays = 0
  let turnovers = 0
  let scoutingImports: { status?: string | null; error_log?: string | null }[] = []
  let scoutingPlaysCount = 0

  if (activeTeam) {
    const [sessionsRes, eventsRes, totalPlaysRes, explosiveRes, turnoverRes] = await Promise.all([
      supabase
        .from('game_sessions')
        .select('id, unit, status, started_at, game_id, games ( opponent_name, start_time )')
        .eq('team_id', activeTeam.id)
        .order('started_at', { ascending: false })
        .limit(6),
      supabase
        .from('chart_events')
        .select(
          'id, sequence, play_call, result, gained_yards, explosive, turnover, created_at, game_sessions!inner(unit, game_id)'
        )
        .eq('team_id', activeTeam.id)
        .order('created_at', { ascending: false })
        .limit(14),
      supabase
        .from('chart_events')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', activeTeam.id),
      supabase
        .from('chart_events')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', activeTeam.id)
        .eq('explosive', true),
      supabase
        .from('chart_events')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', activeTeam.id)
        .eq('turnover', true),
    ])

    if (sessionsRes.error) {
      console.error('Dashboard sessions error:', sessionsRes.error.message)
    } else if (sessionsRes.data) {
      const sessionRows = sessionsRes.data as SessionRow[]
      sessionSummaries = sessionRows.map((session) => ({
        ...session,
        games: normalizeSessionGame(session.games),
      }))
    }

    if (eventsRes.error) {
      console.error('Dashboard events error:', eventsRes.error.message)
    } else if (eventsRes.data) {
      const eventRows = eventsRes.data as EventRow[]
      recentEvents = eventRows.map((event) => ({
        ...event,
        game_sessions: normalizeEventSession(event.game_sessions),
      }))
    }

    totalPlays = totalPlaysRes.count ?? 0
    explosivePlays = explosiveRes.count ?? 0
    turnovers = turnoverRes.count ?? 0
  }

  const activeOrPendingSessions = sessionSummaries.filter(
    (session) => session.status === 'active' || session.status === 'pending'
  )
  const nextGameSession =
    [...sessionSummaries].sort((a, b) => {
      const aStart = a.games?.start_time || a.started_at || ''
      const bStart = b.games?.start_time || b.started_at || ''
      return aStart.localeCompare(bStart)
    })[0] || null
  const currentSession = activeOrPendingSessions[0] || nextGameSession || sessionSummaries[0] || null
  const currentGameId = currentSession?.game_id ?? null
  const currentGameEvents = currentGameId
    ? recentEvents.filter((event) => event.game_sessions?.game_id === currentGameId)
    : []
  const playsThisGame = currentGameEvents.length
  const explosiveThisGame = currentGameEvents.filter((event) => event.explosive).length
  const turnoversThisGame = currentGameEvents.filter((event) => event.turnover).length
  const explosiveRate = playsThisGame ? Math.round((explosiveThisGame / playsThisGame) * 100) : 0
  const liveSessionCount = activeOrPendingSessions.length

  if (activeTeam && currentSession?.games?.opponent_name) {
    const opponentFilter = currentSession.games.opponent_name
    const seasonYear = currentSession.games.start_time
      ? new Date(currentSession.games.start_time).getFullYear().toString()
      : null

    let importsQuery = supabase
      .from('scout_imports')
      .select('id, status, error_log, opponent_name, season')
      .eq('team_id', activeTeam.id)
      .eq('opponent_name', opponentFilter)
    let playsQuery = supabase
      .from('scout_plays')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', activeTeam.id)
      .eq('opponent_name', opponentFilter)

    if (seasonYear) {
      importsQuery = importsQuery.eq('season', seasonYear)
      playsQuery = playsQuery.eq('season', seasonYear)
    }

    const [importsRes, playsRes] = await Promise.all([importsQuery, playsQuery])

    if (importsRes.error) {
      console.error('Dashboard scouting imports error:', importsRes.error.message)
    } else if (importsRes.data) {
      scoutingImports = importsRes.data
    }

    if (playsRes.error) {
      console.error('Dashboard scouting plays count error:', playsRes.error.message)
    } else {
      scoutingPlaysCount = playsRes.count ?? 0
    }
  }

  const statsCounts: DashboardCounts = {
    totalPlays,
    explosivePlays,
    turnovers,
    activeSessions: sessionSummaries.filter((s) => s.status === 'active').length,
  }

  const volumeSparkline = buildVolumeSparkline(recentEvents)
  const explosiveSparkline = buildExplosiveSparkline(recentEvents)

  const activeMembership = memberships.find((m) => m.team_id === activeTeam.id) ?? null
  const viewState: DashboardViewState = buildDashboardViewState({
    team: activeTeam,
    membership: activeMembership,
    sessions: sessionSummaries,
    events: recentEvents,
    counts: statsCounts,
    scoutingImports,
    scoutingPlaysCount,
  })
  const hasLiveSession = liveSessionCount > 0
  const opponentName = viewState.gameContext.opponentName || 'Opponent TBD'
  const scoutingStatusLabel = formatStatusLabel(viewState.scouting.status)
  const scoutingErrorsLabel = formatStatusLabel(viewState.scouting.errorsStatus)
  const hasCurrentGame = !!currentGameId

  const topCards: StatCard[] = hasCurrentGame
    ? [
        {
          label: 'Plays this game',
          value: playsThisGame,
          helper: `vs ${opponentName}`,
          live: true,
          tooltip: 'Charted snaps in current matchup',
          icon: <Activity className="h-4 w-4 text-cyan-300" strokeWidth={1.5} />,
          tone: 'from-cyan-500/20 via-blue-500/10 to-transparent',
          sparkline: volumeSparkline,
          sparkColor: 'rgba(125, 211, 252, 0.95)',
        },
        {
          label: 'Explosive rate',
          value: `${explosiveRate}%`,
          helper: 'Current matchup',
          live: true,
          tooltip: 'Explosive momentum',
          icon: <Flame className="h-4 w-4 text-amber-300" strokeWidth={1.5} />,
          tone: 'from-amber-500/25 via-orange-500/15 to-transparent',
          sparkline: explosiveSparkline,
          sparkColor: 'rgba(251, 191, 36, 0.95)',
        },
        {
          label: 'Turnovers this game',
          value: turnoversThisGame,
          helper: 'Giveaways/Takeaways',
          live: true,
          tooltip: 'Disruption count',
          icon: <Shield className="h-4 w-4 text-rose-200" strokeWidth={1.5} />,
          tone: 'from-rose-500/20 via-red-500/10 to-transparent',
          sparkline: volumeSparkline,
          sparkColor: 'rgba(248, 113, 113, 0.9)',
        },
      ]
    : [
        {
          label: 'Total plays logged',
          value: statsCounts.totalPlays,
          helper: 'All-time snaps',
          live: true,
          tooltip: 'Play velocity',
          icon: <Activity className="h-4 w-4 text-cyan-300" strokeWidth={1.5} />,
          tone: 'from-cyan-500/20 via-blue-500/10 to-transparent',
          sparkline: volumeSparkline,
          sparkColor: 'rgba(125, 211, 252, 0.95)',
        },
        {
          label: 'Explosive plays',
          value: statsCounts.explosivePlays,
          helper: 'Tagged explosive',
          live: true,
          tooltip: 'Explosive momentum',
          icon: <Flame className="h-4 w-4 text-amber-300" strokeWidth={1.5} />,
          tone: 'from-amber-500/25 via-orange-500/15 to-transparent',
          sparkline: explosiveSparkline,
          sparkColor: 'rgba(251, 191, 36, 0.95)',
        },
        {
          label: 'Active sessions',
          value: statsCounts.activeSessions,
          helper: 'Analysts charting',
          live: true,
          tooltip: 'Live session heat',
          icon: <Sparkles className="h-4 w-4 text-emerald-200" strokeWidth={1.5} />,
          tone: 'from-emerald-500/20 via-teal-500/10 to-transparent',
          sparkline: explosiveSparkline,
          sparkColor: 'rgba(52, 211, 153, 0.9)',
        },
      ]

  return (
    <section className="container space-y-8 py-6">
      <div className="grid gap-6 lg:grid-cols-12">
        <Surface className="relative overflow-hidden lg:col-span-8 xl:col-span-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(52,211,153,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.12),transparent_30%)]" />
          <div className="relative space-y-5">
            <DashboardTracker
              teamId={activeTeam.id}
              role={viewState.hero.roleLabel}
              mode={viewState.hero.modeLabel}
            />
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-[0.26em] text-emerald-100">
              <Sparkles className="h-4 w-4" />
              Game control
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-semibold text-slate-50 md:text-4xl break-words line-clamp-2">
                {viewState.hero.title}
              </h1>
              <p className="text-sm text-slate-300 break-words line-clamp-2">{viewState.hero.subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[0.75rem] text-slate-200">
              <span className="pill bg-slate-900/70 border-slate-800 text-slate-100 max-w-xs truncate">
                Role: {viewState.hero.roleLabel || 'Coach'}
              </span>
              {activeTeam && (
                <span className="pill bg-slate-900/70 border-slate-800 text-slate-100 max-w-xs truncate">
                  Team: {activeTeam.name || 'Unnamed'}
                </span>
              )}
              <span
                className={`pill ${
                  hasLiveSession
                    ? 'bg-emerald-500/10 border-emerald-700/40 text-emerald-300'
                    : 'bg-slate-900/70 border-slate-800 text-slate-200'
                }`}
              >
                {hasLiveSession ? 'Live' : 'Not live'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <HeroCtaLink
                href={viewState.hero.ctaHref}
                label={viewState.hero.ctaLabel}
                teamId={activeTeam.id}
                role={viewState.hero.roleLabel}
                mode={viewState.hero.modeLabel}
                className="btn-primary text-[0.75rem] tracking-[0.18em]"
              />
              <Link
                href="/games"
                className="inline-flex items-center text-xs uppercase tracking-[0.2em] text-slate-400 hover:text-white"
              >
                Go to schedule
              </Link>
            </div>
            {teams.length > 0 && (
              <form
                action={async (formData) => {
                  'use server'
                  await setActiveTeam(formData)
                }}
                className="mt-1 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-400 backdrop-blur"
              >
                <label htmlFor="teamId">Team</label>
                <select
                  id="teamId"
                  name="teamId"
                  defaultValue={activeTeam?.id}
                  className="rounded-xl border border-slate-800 bg-black/40 px-3 py-2 text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                >
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name || 'Unnamed Team'}
                    </option>
                  ))}
                </select>
                <ActionButton label="Switch" pendingLabel="Switching..." />
              </form>
            )}
          </div>
        </Surface>

        <Surface className="lg:col-span-4 xl:col-span-4">
          <StatsGrid
            totals={viewState.rawCounts}
            volumeTrend={volumeSparkline}
            explosiveTrend={explosiveSparkline}
            cardsOverride={topCards}
          />
        </Surface>


        <Surface className="lg:col-span-7 xl:col-span-7 space-y-5">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[0.72rem] uppercase tracking-[0.18em] text-slate-500">Performance pulse</p>
              <p className="text-sm text-slate-300 line-clamp-1 break-words">Momentum for tonight</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.68rem] uppercase tracking-[0.22em] text-slate-200">
              {opponentName}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[...(viewState.globalMetrics.drives || []), ...(viewState.globalMetrics.efficiency || []), ...(viewState.globalMetrics.fieldPosition || [])].map((tile) => (
              <div key={tile.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500 line-clamp-1 break-words">
                  {tile.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-50 line-clamp-1 break-words">
                  {tile.value}
                </p>
                {tile.context && (
                  <p className="text-xs text-slate-400 line-clamp-2 break-words">{tile.context}</p>
                )}
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <p className="text-[0.72rem] uppercase tracking-[0.18em] text-slate-500">Units</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {viewState.perUnit.map((unit) => (
                <div key={unit.unit} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400 line-clamp-1 break-words">
                      {unit.unit.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {unit.primaryStats.map((stat) => (
                      <div key={stat.id}>
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-500 line-clamp-1 break-words">
                          {stat.label}
                        </p>
                        <p className="text-2xl font-semibold text-slate-50 line-clamp-1 break-words">{stat.value}</p>
                      </div>
                    ))}
                    {unit.secondaryStats.map((stat) => (
                      <div key={stat.id}>
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-500 line-clamp-1 break-words">
                          {stat.label}
                        </p>
                        <p className="text-base font-semibold text-slate-100 line-clamp-1 break-words">
                          {stat.value}
                        </p>
                        {stat.context && (
                          <p className="text-xs text-slate-400 line-clamp-2 break-words">{stat.context}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Surface>

        <Surface className="lg:col-span-7 xl:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[0.72rem] uppercase tracking-[0.18em] text-slate-500">Weekly prep</p>
              <p className="text-sm text-slate-300 line-clamp-1 break-words">Scouting for {opponentName}</p>
            </div>
            <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.24em] text-emerald-100">
              {scoutingStatusLabel}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-[0.68rem] uppercase tracking-[0.14em] text-slate-500">Scouting CSVs</p>
              <p className="mt-1 text-base font-semibold text-slate-50">{scoutingStatusLabel}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-[0.68rem] uppercase tracking-[0.14em] text-slate-500">Scouting errors</p>
              <p className="mt-1 text-base font-semibold text-slate-50">{scoutingErrorsLabel}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-[0.68rem] uppercase tracking-[0.14em] text-slate-500">Scouted plays</p>
              <p className="mt-1 text-base font-semibold text-slate-50">
                {viewState.scouting.playsCount} for {opponentName}
              </p>
            </div>
          </div>
        </Surface>

        {teams.length > 1 && (
          <Surface className="lg:col-span-5 xl:col-span-5">
            <h2 className="text-lg font-semibold text-slate-100">Your teams</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {teams.map((team) => {
                const membership = memberships.find((m) => m.team_id === team.id)
                return (
                  <li
                    key={team.id}
                    className="flex items-center justify-between gap-2 rounded-2xl border border-slate-800/60 bg-slate-950/50 px-3 py-3"
                  >
                    <div>
                      <p className="font-semibold text-slate-100 line-clamp-1 break-words">
                        {team.name || 'Unnamed Team'}
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-2 break-words">
                        {team.school_name || 'School TBD'}
                        {team.level && ` | ${team.level}`}
                      </p>
                    </div>
                    {membership?.role && (
                      <span className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500 truncate">
                        {membership.role}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </Surface>
        )}
      </div>

      <Suspense
        fallback={
          <div className="rounded-2xl border border-slate-900/70 bg-surface-muted/70 p-4 space-y-3">
            <div className="skeleton h-4 w-24"></div>
            <div className="skeleton h-5 w-full"></div>
            <div className="skeleton h-5 w-2/3"></div>
          </div>
        }
      >
        <DashboardRealtimeClient
          key={activeTeam.id}
          teamId={activeTeam.id}
          initialCounts={viewState.rawCounts}
          initialSessions={sessionSummaries}
        />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <LiveSessionList sessions={sessionSummaries} />
        </div>
        <div className="space-y-6">
          <LiveEventFeed key={activeTeam.id} teamId={activeTeam.id} initialEvents={recentEvents} />
        </div>
      </div>
    </section>
  )
}

function formatStatusLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}
