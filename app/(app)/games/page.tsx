import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import {
  closeGameSession,
  startGameSession,
} from './chart-actions'
import { createGame } from './actions'

export const revalidate = 0

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

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string }>
}) {
  const supabase = await createSupabaseServerClient()
  const resolvedSearchParams = await searchParams

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

  const renderErrorMessage = (code: string, reason?: string) => {
    const map: Record<string, string> = {
      invalid_game: 'Please check all required fields and use a valid kickoff time.',
      create_failed: 'Could not create the game. Please try again or contact an admin.',
    }
    if (reason) {
      return `${map[code] || 'Unable to create game.'} (${reason})`
    }
    return map[code] || 'Unable to create game.'
  }

  const errorCode = resolvedSearchParams?.error
  const errorReason = resolvedSearchParams?.reason

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
        {errorCode && (
          <p className="text-xs text-amber-400">
            {renderErrorMessage(errorCode, errorReason)}
          </p>
        )}
      </header>

      <div className="rounded-3xl border border-slate-900/70 bg-surface-raised/60 p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Add a game</p>
            <h2 className="text-lg font-semibold text-slate-50">Schedule a matchup</h2>
            <p className="text-sm text-slate-400">
              Create a game to enable charting sessions for offense, defense, and special teams.
            </p>
          </div>
        </div>
        <form action={createGame} className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-xs text-slate-400">
            <span className="uppercase tracking-[0.2em]">Opponent</span>
            <input
              type="text"
              name="opponent_name"
              required
              className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
              placeholder="Springfield Prep"
            />
          </label>
          <label className="space-y-1 text-xs text-slate-400">
            <span className="uppercase tracking-[0.2em]">Kickoff</span>
            <input
              type="datetime-local"
              name="start_time"
              required
              className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </label>
          <label className="space-y-1 text-xs text-slate-400">
            <span className="uppercase tracking-[0.2em]">Home / Away</span>
            <input
              type="text"
              name="home_or_away"
              placeholder="Home or Away"
              className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </label>
          <label className="space-y-1 text-xs text-slate-400">
            <span className="uppercase tracking-[0.2em]">Location</span>
            <input
              type="text"
              name="location"
              placeholder="Stadium or Venue"
              className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </label>
          <label className="space-y-1 text-xs text-slate-400 md:col-span-2">
            <span className="uppercase tracking-[0.2em]">Season label</span>
            <input
              type="text"
              name="season_label"
              placeholder="2025 Season"
              className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </label>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              className="rounded-full bg-brand px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black"
            >
              Create game
            </button>
          </div>
        </form>
      </div>

      {games.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-black/20 p-10 space-y-3 text-center">
          <p className="text-sm text-slate-300 font-semibold">No games on the calendar yet</p>
          <p className="text-sm text-slate-400">
            Create your first matchup above to activate charting sessions for your units.
          </p>
          <a
            href="/onboarding/quickstart"
            className="inline-flex justify-center rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200"
          >
            Need help? Run Quickstart
          </a>
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
                    {[
                      formatKickoff(game.start_time),
                      game.home_or_away ? game.home_or_away.toUpperCase() : null,
                      game.location || 'Venue TBD',
                    ]
                      .filter(Boolean)
                      .join(' | ')}
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
                              Active | Analyst{' '}
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
                            Pending session exists | refresh or resume from chart view.
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
