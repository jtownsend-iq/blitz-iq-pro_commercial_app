import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/utils/supabase/clients'
import {
  closeGameSession,
  startGameSession,
} from './chart-actions'

const unitConfigs = [
  {
    key: 'OFFENSE',
    label: 'Offense',
    description: "Chart your offense vs the opponent's defense.",
  },
  {
    key: 'DEFENSE',
    label: 'Defense',
    description: "Chart the opponent's offense vs your defense.",
  },
  {
    key: 'SPECIAL_TEAMS',
    label: 'Special Teams',
    description: 'Kickoff, punt, PAT/FG, and return phases.',
  },
] as const

type GameRow = {
  id: string
  opponent_name: string | null
  start_time: string | null
  home_or_away: string | null
  location: string | null
  season_label: string | null
  status: string | null
}

type SessionRow = {
  id: string
  game_id: string
  unit: string
  status: string
  analyst_user_id: string | null
}

export default async function GamesPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('active_team_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Error loading profile for games page:', profileError.message)
  }

  const activeTeamId = profile?.active_team_id as string | null

  if (!activeTeamId) {
    redirect('/onboarding/team')
  }

  const { data: gamesData, error: gamesError } = await supabase
    .from('games')
    .select('id, opponent_name, start_time, home_or_away, location, season_label, status')
    .eq('team_id', activeTeamId)
    .order('start_time', { ascending: false })

  if (gamesError) {
    console.error('Error loading games:', gamesError.message)
  }

  const games: GameRow[] = (gamesData as GameRow[] | null) ?? []
  const gameIds = games.map((game) => game.id)

  let sessionsByGame: Record<string, SessionRow[]> = {}

  if (gameIds.length > 0) {
    const { data: sessionData, error: sessionError } = await supabase
      .from('game_sessions')
      .select('id, game_id, unit, status, analyst_user_id')
      .eq('team_id', activeTeamId)
      .in('game_id', gameIds)

    if (sessionError) {
      console.error('Error loading game sessions:', sessionError.message)
    } else if (sessionData) {
      sessionsByGame = sessionData.reduce<Record<string, SessionRow[]>>(
        (acc, row) => {
          const list = acc[row.game_id] ?? []
          list.push(row as SessionRow)
          acc[row.game_id] = list
          return acc
        },
        {}
      )
    }
  }

  const formatKickoff = (value: string | null) => {
    if (!value) return 'Kickoff TBD'
    const date = new Date(value)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  }

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <p className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-500">
          Games & Charting
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-50">
          Manage your schedule
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Start live charting sessions for offense, defense, and special teams. Sessions remain
          active until you close them, and only one session per unit can run at a time.
        </p>
      </header>

      {games.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-black/20 p-10 text-center">
          <p className="text-sm text-slate-400">
            No games have been scheduled yet. Add games via Supabase or future schedule management
            tools to begin charting.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {games.map((game) => {
            const sessions = sessionsByGame[game.id] ?? []
            return (
              <article
                key={game.id}
                className="rounded-3xl border border-slate-900/70 bg-surface-raised/60 p-6 space-y-6 shadow-inner shadow-black/5"
              >
                <div className="flex flex-col gap-1">
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    {game.season_label || 'Season TBD'}
                  </div>
                  <h2 className="text-2xl font-semibold text-slate-50">
                    {game.opponent_name || 'Opponent TBD'}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {formatKickoff(game.start_time)} •{' '}
                    {game.home_or_away ? `${game.home_or_away.toUpperCase()} • ` : ''}
                    {game.location || 'Venue TBD'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Status: {game.status ? game.status.toUpperCase() : 'SCHEDULED'}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {unitConfigs.map((unit) => {
                    const activeSession = sessions.find(
                      (session) =>
                        session.unit === unit.key && session.status === 'active'
                    )
                    const pendingSession = sessions.find(
                      (session) =>
                        session.unit === unit.key && session.status === 'pending'
                    )
                    const disabled = Boolean(activeSession || pendingSession)

                    return (
                      <div
                        key={unit.key}
                        className="rounded-2xl border border-slate-900/60 bg-black/30 p-4 flex flex-col gap-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{unit.label}</p>
                          <p className="text-xs text-slate-500">{unit.description}</p>
                        </div>

                        {activeSession ? (
                          <div className="space-y-3">
                            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/40 px-3 py-2 text-xs text-emerald-200">
                              Active • Analyst{' '}
                              {activeSession.analyst_user_id
                                ? activeSession.analyst_user_id.slice(0, 6)
                                : 'Assigned'}
                            </div>
                            <div className="flex gap-2">
                              <a
                                href={`/games/${game.id}/chart/${unit.key.toLowerCase()}`}
                                className="flex-1 rounded-full bg-brand px-3 py-1.5 text-center text-xs font-semibold uppercase tracking-[0.2em] text-black"
                              >
                                Open chart
                              </a>
                              <form
                                action={closeGameSession}
                                className="flex-1"
                              >
                                <input
                                  type="hidden"
                                  name="sessionId"
                                  value={activeSession.id}
                                />
                                <button
                                  type="submit"
                                  className="w-full rounded-full border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:border-slate-500 hover:text-slate-200 transition"
                                >
                                  Close
                                </button>
                              </form>
                            </div>
                          </div>
                        ) : pendingSession ? (
                          <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
                            Pending session exists • refresh or resume from chart view.
                          </div>
                        ) : (
                          <form action={startGameSession} className="space-y-2">
                            <input type="hidden" name="gameId" value={game.id} />
                            <input type="hidden" name="unit" value={unit.key} />
                            <button
                              type="submit"
                              disabled={disabled}
                              className="w-full rounded-full bg-brand px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-black disabled:opacity-40"
                            >
                              Start session
                            </button>
                          </form>
                        )}
                      </div>
                    )
                  })}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
