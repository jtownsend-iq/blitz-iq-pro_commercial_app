import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Sparkles } from 'lucide-react'
import { LiveEventFeed } from '@/components/dashboard/LiveEventFeed'
import { LiveSessionList } from '@/components/dashboard/LiveSessionList'
import { StatsGrid } from '@/components/dashboard/StatsGrid'
import { createSupabaseServerClient } from '@/utils/supabase/server'
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
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    console.error('Error fetching auth user:', userError.message)
  }

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('full_name, active_team_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Error fetching user profile:', profileError.message)
  }

  const activeTeamId = (profile?.active_team_id as string | null) ?? null

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
    redirect('/onboarding/team')
  }

  if (!activeTeamId) {
    redirect('/onboarding/select-team')
  }

  const activeTeam = teams.find((team) => team.id === activeTeamId)

  if (!activeTeam) {
    redirect('/onboarding/select-team')
  }

  let sessionSummaries: SessionSummary[] = []
  let recentEvents: EventSummary[] = []
  let totalPlays = 0
  let explosivePlays = 0
  let turnovers = 0

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

  return (
    <section className="container space-y-8 py-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950/80 via-slate-950/70 to-black/60 p-6 shadow-[0_25px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(52,211,153,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.12),transparent_30%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-[0.26em] text-emerald-100">
              <Sparkles className="h-4 w-4" />
              Command Center
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold text-slate-50 md:text-4xl">
                Game day intelligence
              </h1>
              <p className="text-sm text-slate-300">
                {activeRole || 'Coach'} | {activeTeam ? activeTeam.name || 'Unnamed Team' : 'No team'}{' '}
                {activeTeam?.school_name ? `| ${activeTeam.school_name}` : ''}{' '}
                {activeTeam?.level ? `| ${activeTeam.level}` : ''} | Live updates enabled
              </p>
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
              <span className="pill bg-emerald-500/10 border-emerald-700/40 text-emerald-300">
                Live updates
              </span>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <Link href="/games" className="btn-primary text-[0.75rem] tracking-[0.2em]">
              Go to Games
            </Link>
            {teams.length > 0 && (
              <form
                action={async (formData) => {
                  'use server'
                  await setActiveTeam(formData)
                }}
                className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm backdrop-blur"
              >
                <label htmlFor="teamId" className="text-slate-400">
                  Team
                </label>
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
