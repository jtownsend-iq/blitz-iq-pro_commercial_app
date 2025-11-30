import Link from 'next/link'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { LiveEventFeed } from '@/components/dashboard/LiveEventFeed'
import { LiveSessionList } from '@/components/dashboard/LiveSessionList'
import { StatsGrid } from '@/components/dashboard/StatsGrid'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { requireAuth } from '@/utils/auth/requireAuth'
import { DashboardRealtimeClient } from './RealtimeClient'
import { ActionButton } from './ActionButton'
import { setActiveTeam } from './actions'
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

  const activeRole =
    memberships.find((m) => m.team_id === activeTeamId)?.role || memberships[0]?.role || 'Coach'

  const statsCounts: DashboardCounts = {
    totalPlays,
    explosivePlays,
    turnovers,
    activeSessions: sessionSummaries.filter((s) => s.status === 'active').length,
  }

  const volumeSparkline = buildVolumeSparkline(recentEvents)
  const explosiveSparkline = buildExplosiveSparkline(recentEvents)

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

  const formatKickoff = (value: string | null | undefined) => {
    if (!value) return 'Kickoff time TBD'
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value))
  }

  const unitSlug = (value: string | null | undefined) =>
    (value || 'offense').toLowerCase().replace('_', '-')

  const opponentName = currentSession?.games?.opponent_name || 'Opponent TBD'
  const kickoffLabel = formatKickoff(currentSession?.games?.start_time)
  const hasUpcomingGame = Boolean(nextGameSession)
  const hasLiveSession = liveSessionCount > 0

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

  let heroTitle = "Set tonight's matchup"
  let heroSubtitle =
    'No upcoming game is scheduled. Lock in opponent and kickoff so the staff can chart in one click.'

  if (hasUpcomingGame && !hasLiveSession) {
    heroTitle = 'Upcoming game locked in'
    heroSubtitle = `vs ${opponentName} - ${kickoffLabel}. Start charting or assign units before warmups.`
  }

  if (hasLiveSession) {
    heroTitle = 'Live game-day control'
    heroSubtitle = `vs ${opponentName} - ${kickoffLabel}. Active sessions are ready for the staff.`
  }

  const roleLabel = (activeRole || '').toLowerCase()
  let ctaLabel = 'Open game-day view'
  if (roleLabel.includes('offensive') || roleLabel.includes('oc')) {
    ctaLabel = 'Open offense chart'
  } else if (roleLabel.includes('defensive') || roleLabel.includes('dc')) {
    ctaLabel = 'Open defense chart'
  } else if (roleLabel.includes('special')) {
    ctaLabel = 'Open special teams chart'
  } else if (roleLabel.includes('analyst')) {
    ctaLabel = 'Open charting for tonight'
  } else if (roleLabel.includes('it') || roleLabel.includes('admin')) {
    ctaLabel = "Manage tonight's sessions"
  }

  const ctaHref = currentSession
    ? `/games/${currentSession.game_id}/chart/${unitSlug(currentSession.unit)}`
    : '/games'

  const hasSuccessfulImport = scoutingImports.some((imp) => {
    const status = (imp.status || '').toLowerCase()
    return status === 'success' || status === 'completed' || status === 'processed'
  })
  const hasImports = scoutingImports.length > 0
  const hasImportErrors =
    scoutingImports.some((imp) => {
      const status = (imp.status || '').toLowerCase()
      return status === 'error' || status === 'failed' || status === 'failure'
    }) || scoutingImports.some((imp) => Boolean(imp.error_log))

  const scoutingStatusLabel = hasSuccessfulImport ? 'Ready' : hasImports ? 'Incomplete' : 'Missing'
  const scoutingErrorsLabel = hasImportErrors ? 'Needs fixes' : 'Clean'

  return (
    <section className="container space-y-8 py-6">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950/80 via-slate-950/70 to-black/60 p-6 shadow-[0_25px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(52,211,153,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.12),transparent_30%)]" />
          <div className="relative space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-[0.26em] text-emerald-100">
              <Sparkles className="h-4 w-4" />
              Game control
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-semibold text-slate-50 md:text-4xl">{heroTitle}</h1>
              <p className="text-sm text-slate-300">{heroSubtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[0.75rem] text-slate-200">
              <span className="pill bg-slate-900/70 border-slate-800 text-slate-100">
                Role: {activeRole || 'Coach'}
              </span>
              {activeTeam && (
                <span className="pill bg-slate-900/70 border-slate-800 text-slate-100">
                  Team: {activeTeam.name || 'Unnamed'}
                </span>
              )}
              {hasLiveSession ? (
                <span className="pill bg-emerald-500/10 border-emerald-700/40 text-emerald-300">Live</span>
              ) : (
                <span className="pill bg-slate-900/70 border-slate-800 text-slate-200">Not live</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href={ctaHref} className="btn-primary text-[0.75rem] tracking-[0.18em]">
                {ctaLabel}
              </Link>
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
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-[0_25px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.72rem] uppercase tracking-[0.2em] text-slate-500">Game snapshot</p>
              <p className="text-sm text-slate-300">Fast glance at tonight</p>
            </div>
            <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.24em] text-emerald-100">
              {hasLiveSession ? 'Live' : 'Staged'}
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Plays this game</p>
              <p className="mt-2 text-2xl font-semibold text-slate-50">{playsThisGame}</p>
              <p className="text-xs text-slate-400">Recent charted plays for this matchup</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Explosive rate</p>
              <p className="mt-2 text-2xl font-semibold text-slate-50">{explosiveRate}%</p>
              <p className="text-xs text-slate-400">Explosive plays in this game sample</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Turnovers</p>
              <p className="mt-2 text-2xl font-semibold text-slate-50">{turnoversThisGame}</p>
              <p className="text-xs text-slate-400">Giveaways recorded this game</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Live sessions</p>
              <p className="mt-2 text-2xl font-semibold text-slate-50">{liveSessionCount}</p>
              <p className="text-xs text-slate-400">Active or pending units</p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.18em] text-slate-500">Weekly prep</p>
                <p className="text-xs text-slate-300">Scouting for {opponentName}</p>
              </div>
              <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.24em] text-emerald-100">
                {scoutingStatusLabel}
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
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
                  {scoutingPlaysCount} for {opponentName}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <StatsGrid totals={statsCounts} volumeTrend={volumeSparkline} explosiveTrend={explosiveSparkline} />

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
          initialCounts={statsCounts}
          initialSessions={sessionSummaries}
        />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <LiveSessionList sessions={sessionSummaries} />
        <LiveEventFeed key={activeTeam.id} teamId={activeTeam.id} initialEvents={recentEvents} />
      </div>

      {teams.length > 1 && (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-6 shadow-[0_25px_80px_-35px_rgba(0,0,0,0.7)] backdrop-blur-xl">
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
                    <p className="font-semibold text-slate-100">{team.name || 'Unnamed Team'}</p>
                    <p className="text-xs text-slate-500">
                      {team.school_name || 'School TBD'}
                      {team.level && ` | ${team.level}`}
                    </p>
                  </div>
                  {membership?.role && (
                    <span className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                      {membership.role}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
