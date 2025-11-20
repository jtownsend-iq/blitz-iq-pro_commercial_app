import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createSupabaseServerClient } from '@/utils/supabase/clients'
import { DashboardRealtimeClient } from './RealtimeClient'

type TeamRow = {
  id: string
  name: string | null
  level: string | null
  school_name: string | null
}

type TeamMemberRow = {
  team_id: string
  role: string | null
}

type GameRow = {
  id: string
  opponent_name: string | null
  start_time: string | null
  home_or_away: string | null
  location: string | null
}

type SessionSummary = {
  id: string
  unit: string
  status: string
  started_at: string | null
  game_id: string
  games: {
    opponent_name: string | null
    start_time: string | null
  } | null
}

type EventSummary = {
  id: string
  sequence: number
  play_call: string | null
  result: string | null
  gained_yards: number | null
  explosive: boolean | null
  turnover: boolean | null
  created_at: string | null
  game_sessions: {
    unit: string | null
    game_id: string | null
  } | null
}

type SnapshotRow = {
  id: string
  situation: Record<string, unknown> | null
  metrics: Record<string, unknown> | null
  generated_at: string | null
}

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

  const fullName = (profile?.full_name as string | null) ?? null
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

  const activeTeam =
    (activeTeamId && teams.find((team) => team.id === activeTeamId)) || teams[0]

  let nextGame: GameRow | null = null
  if (activeTeam) {
    const nowIso = new Date().toISOString()
    const { data: gamesData, error: gamesError } = await supabase
      .from('games')
      .select('id, opponent_name, start_time, home_or_away, location')
      .eq('team_id', activeTeam.id)
      .gte('start_time', nowIso)
      .order('start_time', { ascending: true })
      .limit(1)

    if (gamesError) {
      console.error('Error fetching next game:', gamesError.message)
    } else if (gamesData && gamesData.length > 0) {
      nextGame = gamesData[0] as GameRow
    }
  }

  let sessionSummaries: SessionSummary[] = []
  let recentEvents: EventSummary[] = []
  let aiSnapshots: SnapshotRow[] = []
  let totalPlays = 0
  let explosivePlays = 0
  let turnovers = 0

  if (activeTeam) {
    const [
      sessionsRes,
      eventsRes,
      totalPlaysRes,
      explosiveRes,
      turnoverRes,
      snapshotsRes,
    ] = await Promise.all([
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
        .limit(12),
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
      supabase
        .from('chart_snapshots')
        .select('id, situation, metrics, generated_at')
        .eq('team_id', activeTeam.id)
        .order('generated_at', { ascending: false })
        .limit(3),
    ])

    if (sessionsRes.error) {
      console.error('Dashboard sessions error:', sessionsRes.error.message)
    } else if (sessionsRes.data) {
      sessionSummaries = sessionsRes.data as SessionSummary[]
    }

    if (eventsRes.error) {
      console.error('Dashboard events error:', eventsRes.error.message)
    } else if (eventsRes.data) {
      recentEvents = eventsRes.data as EventSummary[]
    }

    totalPlays = totalPlaysRes.count ?? 0
    explosivePlays = explosiveRes.count ?? 0
    turnovers = turnoverRes.count ?? 0

    if (snapshotsRes.error) {
      console.error('Dashboard snapshots error:', snapshotsRes.error.message)
    } else if (snapshotsRes.data) {
      aiSnapshots = snapshotsRes.data as SnapshotRow[]
    }
  }

  const displayName = fullName || user.email || 'Coach'

  const stats = [
    { label: 'Total plays logged', value: totalPlays.toLocaleString(), helper: 'All-time snaps' },
    { label: 'Explosive plays', value: explosivePlays.toString(), helper: 'Tagged explosive' },
    { label: 'Turnovers recorded', value: turnovers.toString(), helper: 'Fumbles & INTs' },
    {
      label: 'Active sessions',
      value: sessionSummaries.filter((s) => s.status === 'active').length.toString(),
      helper: 'Analysts charting now',
    },
  ]

  const snapshotGroups = ['OFFENSE', 'DEFENSE', 'SPECIAL_TEAMS']
    .map((unit) => ({
      unit,
      label: formatUnitLabel(unit),
      snapshots: aiSnapshots.filter(
        (snapshot) =>
          (snapshot.situation?.unit as string | undefined)?.toUpperCase() === unit
      ),
    }))
    .filter((group) => group.snapshots.length > 0)

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-brand">Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            Signed in as <span className="font-semibold">{displayName}</span>
          </p>
          {activeTeam ? (
            <p className="text-xs text-slate-500 mt-1">
              Active team: <span className="font-semibold">{activeTeam.name || 'Unnamed Team'}</span>{' '}
              {activeTeam.school_name && `• ${activeTeam.school_name}`}
              {activeTeam.level && ` • ${activeTeam.level}`}
            </p>
          ) : (
            <p className="text-xs text-slate-500 mt-1">No teams linked to this account yet.</p>
          )}
        </div>
      </div>

      <Suspense fallback={null}>
        <DashboardRealtimeClient teamId={activeTeam.id} />
      </Suspense>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-3xl border border-slate-900/60 bg-black/30 p-4 shadow-inner shadow-black/10"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-50">{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.helper}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-900/70 bg-surface-raised/60 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Live sessions</h2>
                <p className="text-sm text-slate-500">
                  Quickly jump into active charting or review recent sessions.
                </p>
              </div>
              <Link
                href="/games"
                className="text-xs font-semibold text-brand underline underline-offset-4"
              >
                Manage
              </Link>
            </div>
            {sessionSummaries.length === 0 ? (
              <p className="text-sm text-slate-500">
                No sessions started yet. Kick off offense, defense, or special teams via the games
                page before kickoff.
              </p>
            ) : (
              <div className="space-y-3">
                {sessionSummaries.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-2xl border border-slate-900/70 bg-black/30 p-4 flex flex-col gap-1"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-100">
                        {formatUnitLabel(session.unit)}
                      </div>
                      <span
                        className={`text-[0.65rem] uppercase tracking-[0.3em] ${
                          session.status === 'active' ? 'text-emerald-300' : 'text-slate-500'
                        }`}
                      >
                        {session.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      vs {session.games?.opponent_name || 'Opponent TBD'} •{' '}
                      {formatDateShort(session.games?.start_time)}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2 text-xs">
                      <Link
                        href={`/games/${session.game_id}/chart/${(session.unit || '')
                          .toLowerCase()
                          .replace('_', '-')}`}
                        className="rounded-full bg-brand/80 px-3 py-1 font-semibold text-black"
                      >
                        Open chart
                      </Link>
                      <span className="rounded-full border border-slate-800 px-3 py-1 text-slate-400">
                        Started {formatRelativeTime(session.started_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-900/70 bg-black/20 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Assistant Coach (AI)</h2>
                <p className="text-sm text-slate-500">
                  Summaries generated from chart_snapshots – use them during halftime or timeouts.
                </p>
              </div>
              <span className="text-xs rounded-full border border-slate-700 px-3 py-1 text-slate-400">
                Experimental
              </span>
            </div>
          {snapshotGroups.length === 0 ? (
            <p className="text-sm text-slate-500">
              No snapshots generated yet. Once you chart a few drives, we’ll surface AI insights
              here.
            </p>
          ) : (
            <div className="space-y-5">
              {snapshotGroups.map((group) => (
                <div key={group.unit} className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                    {group.label}
                  </p>
                  {group.snapshots.map((snapshot) => (
                    <div
                      key={snapshot.id}
                      className="rounded-2xl border border-slate-900/60 bg-slate-950/40 p-4 text-sm text-slate-200"
                    >
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                        {formatSnapshotSituation(snapshot.situation)}
                      </p>
                      <p className="mt-2 text-sm text-slate-100">
                        {(snapshot.metrics?.ai_summary as string) ||
                          'AI summary will appear here once enough plays have been logged.'}
                      </p>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-400">
                        <div className="rounded-lg border border-slate-900/60 bg-black/20 px-3 py-2">
                          <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                            Plays
                          </p>
                          <p className="text-slate-100 font-semibold">
                            {(snapshot.metrics?.plays as number) ?? 0}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-900/60 bg-black/20 px-3 py-2">
                          <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                            Yards
                          </p>
                          <p className="text-slate-100 font-semibold">
                            {(snapshot.metrics?.totalYards as number) ?? 0}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-900/60 bg-black/20 px-3 py-2">
                          <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                            Explosive
                          </p>
                          <p className="text-slate-100 font-semibold">
                            {(snapshot.metrics?.explosivePlays as number) ?? 0}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 text-[0.65rem] text-slate-500">
                        Generated {formatDateShort(snapshot.generated_at)}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-900/70 bg-surface-raised/60 p-6">
            <h2 className="text-lg font-semibold text-slate-100">Next game</h2>
            {!activeTeam ? (
              <p className="text-sm text-slate-500">
                Link your user to a team in Supabase to see schedule information.
              </p>
            ) : !nextGame ? (
              <p className="text-sm text-slate-500">
                No upcoming game scheduled. Add your season calendar to unlock live charting links.
              </p>
            ) : (
              <div className="mt-3 space-y-1 text-sm text-slate-300">
                <p className="text-2xl font-semibold text-slate-50">
                  {nextGame.opponent_name || 'Opponent TBD'}
                </p>
                <p className="text-slate-400">{formatKickoffDisplay(nextGame)}</p>
                <Link
                  href="/games"
                  className="inline-flex text-xs font-semibold text-brand underline underline-offset-4"
                >
                  Go to game
                </Link>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-900/70 bg-black/20 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Recent plays logged</h2>
              <span className="text-xs text-slate-500">
                Last {recentEvents.length} events
              </span>
            </div>
            {recentEvents.length === 0 ? (
              <p className="text-sm text-slate-500">
                Chart events will show here in real time once analysts start logging.
              </p>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-slate-900/60 bg-slate-950/40 px-4 py-3 text-sm text-slate-200"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span>{formatUnitLabel(event.game_sessions?.unit)}</span>
                      <span>
                        Seq {event.sequence} • {formatEventTimestamp(event.created_at)}
                      </span>
                    </div>
                    <div className="mt-1 font-semibold text-slate-100">
                      {event.play_call || 'Play call TBD'}
                    </div>
                    <div className="text-xs text-slate-400">
                      {event.result || 'Result TBD'} • Yardage:{' '}
                      {typeof event.gained_yards === 'number' ? `${event.gained_yards}` : '—'}
                    </div>
                    <div className="text-[0.65rem] text-slate-500">
                      {event.explosive ? 'Explosive • ' : ''}
                      {event.turnover ? 'Turnover • ' : ''}
                      {event.game_sessions?.unit
                        ? `Session ${event.game_sessions.unit.toLowerCase()}`
                        : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {teams.length > 1 && (
            <div className="rounded-3xl border border-slate-900/70 bg-black/30 p-6">
              <h2 className="text-lg font-semibold text-slate-100">Your teams</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {teams.map((team) => {
                  const membership = memberships.find((m) => m.team_id === team.id)
                  return (
                    <li
                      key={team.id}
                      className="flex items-center justify-between gap-2 rounded-2xl border border-slate-800/60 bg-slate-950/30 px-3 py-2"
                    >
                      <div>
                        <p className="font-semibold text-slate-100">
                          {team.name || 'Unnamed Team'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {team.school_name || 'School TBD'}
                          {team.level && ` • ${team.level}`}
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
        </div>
      </div>
    </section>
  )
}

function formatUnitLabel(unit?: string | null) {
  if (!unit) return 'Unknown unit'
  const lower = unit.toLowerCase()
  if (lower === 'special_teams') return 'Special Teams'
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function formatDateShort(value: string | null) {
  if (!value) return 'TBD'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatRelativeTime(value: string | null) {
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

function formatEventTimestamp(value: string | null) {
  if (!value) return 'just now'
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatKickoffDisplay(game: GameRow) {
  if (!game.start_time) return 'Kickoff TBD'
  return `${new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(game.start_time))} • ${game.home_or_away?.toUpperCase() || 'TBD'}${
    game.location ? ` • ${game.location}` : ''
  }`
}

function formatSnapshotSituation(situation: Record<string, unknown> | null) {
  if (!situation) return 'Latest insight'
  const parts: string[] = []
  if (situation.down) parts.push(`Down ${situation.down}`)
  if (situation.distance) parts.push(`${situation.distance} to go`)
  if (situation.hash) parts.push(`${situation.hash} hash`)
  return parts.length > 0 ? parts.join(' • ') : 'Latest insight'
}

