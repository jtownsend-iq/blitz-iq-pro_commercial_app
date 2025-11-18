// app/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

type TeamRow = {
  id: string
  name: string | null
  level: string | null
  school_name: string | null
  logo_url: string | null
  primary_color: string | null
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

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1) Auth user
  const { data: authData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    console.error('Error fetching auth user:', userError.message)
  }

  const user = authData?.user

  if (!user) {
    // Middleware should already guard this, but safety first
    redirect('/login')
  }

  // 2) User profile (full_name, active_team_id)
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('full_name, active_team_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Error fetching user profile:', profileError.message)
  }

  const fullName: string | null = (profile?.full_name as string | null) ?? null
  const activeTeamId: string | null =
    (profile?.active_team_id as string | null) ?? null

  // 3) Team memberships – if none, force onboarding
  const { data: membershipsData, error: membershipError } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', user.id)

  if (membershipError) {
    console.error('Error fetching team memberships:', membershipError.message)
  }

  const memberships: TeamMemberRow[] =
    (membershipsData as TeamMemberRow[] | null) ?? []

  if (memberships.length === 0) {
    // No team yet → go to onboarding
    redirect('/onboarding/team')
  }

  const teamIds = memberships.map((m) => m.team_id)

  // 4) Teams for this user
  let teams: TeamRow[] = []
  if (teamIds.length > 0) {
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, level, school_name, logo_url, primary_color')
      .in('id', teamIds)

    if (teamsError) {
      console.error('Error fetching teams:', teamsError.message)
    } else if (teamsData) {
      teams = teamsData as TeamRow[]
    }
  }

  // Extra safety: if somehow still no teams, go to onboarding
  if (teams.length === 0) {
    redirect('/onboarding/team')
  }

  // 5) Active team
  let activeTeam: TeamRow | null = null
  if (teams.length > 0) {
    activeTeam =
      (activeTeamId && teams.find((t) => t.id === activeTeamId)) || teams[0]
  }

  // 6) Next game for active team
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
      console.error('Error fetching games:', gamesError.message)
    } else if (gamesData && gamesData.length > 0) {
      nextGame = gamesData[0] as GameRow
    }
  }

  const displayName = fullName || user.email || 'Coach'

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-brand">
            Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Signed in as <span className="font-semibold">{displayName}</span>
          </p>
          {activeTeam ? (
            <p className="text-xs text-slate-500 mt-1">
              Active team:{' '}
              <span className="font-semibold">
                {activeTeam.name || 'Unnamed Team'}
              </span>{' '}
              {activeTeam.school_name && `· ${activeTeam.school_name}`}
              {activeTeam.level && ` · ${activeTeam.level}`}
            </p>
          ) : (
            <p className="text-xs text-slate-500 mt-1">
              No teams linked to this account yet.
            </p>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Next Game */}
        <div className="bg-surface-raised border border-slate-800 rounded-2xl p-4 shadow-brand-card">
          <h2 className="text-sm font-semibold mb-2 text-slate-100">
            Next Game
          </h2>
          {!activeTeam && (
            <p className="text-xs text-slate-500">
              Link this user to at least one team in Supabase to see game
              information.
            </p>
          )}
          {activeTeam && !nextGame && (
            <p className="text-xs text-slate-500">
              No upcoming games found. Add games for{' '}
              <span className="font-semibold">
                {activeTeam.name || 'this team'}
              </span>{' '}
              in the database.
            </p>
          )}
          {activeTeam && nextGame && (
            <div className="space-y-1 text-xs text-slate-300">
              <p>
                <span className="font-semibold">
                  vs {nextGame.opponent_name || 'Opponent'}
                </span>
              </p>
              <p className="text-slate-400">
                {nextGame.home_or_away
                  ? nextGame.home_or_away.toUpperCase()
                  : 'TBD'}
                {nextGame.location ? ` · ${nextGame.location}` : ''}
              </p>
              {nextGame.start_time && (
                <p className="text-slate-500">
                  {new Date(nextGame.start_time).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Scouting Snapshot */}
        <div className="bg-surface-raised border border-slate-800 rounded-2xl p-4">
          <h2 className="text-sm font-semibold mb-2 text-slate-100">
            Scouting Snapshot
          </h2>
          <p className="text-xs text-slate-500">
            This will show top opponent tendencies and AI-generated notes based
            on Hudl CSV and your scouting tables.
          </p>
        </div>

        {/* Player Development */}
        <div className="bg-surface-raised border border-slate-800 rounded-2xl p-4">
          <h2 className="text-sm font-semibold mb-2 text-slate-100">
            Player Development
          </h2>
          <p className="text-xs text-slate-500">
            This will summarize recent evals, flags, and development focus
            points for your roster.
          </p>
        </div>
      </div>

      {/* Team list */}
      {teams.length > 1 && (
        <div className="mt-2 bg-surface-raised border border-slate-800 rounded-2xl p-4">
          <h2 className="text-sm font-semibold mb-2 text-slate-100">
            Your Teams
          </h2>
          <ul className="space-y-1 text-xs text-slate-300">
            {teams.map((team) => {
              const membership = memberships.find(
                (m) => m.team_id === team.id
              )
              return (
                <li
                  key={team.id}
                  className="flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-medium">
                      {team.name || 'Unnamed Team'}
                    </div>
                    <div className="text-slate-500">
                      {team.school_name || 'No school name'}
                      {team.level && ` · ${team.level}`}
                    </div>
                  </div>
                  {membership?.role && (
                    <span className="text-[0.7rem] uppercase tracking-wide text-slate-500">
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
