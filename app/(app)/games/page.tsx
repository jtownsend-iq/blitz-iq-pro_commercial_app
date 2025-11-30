import { redirect } from 'next/navigation'
import { CalendarClock, Gamepad2, MapPin, Play, Radio, ShieldCheck } from 'lucide-react'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { GlassCard } from '@/components/ui/GlassCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Pill } from '@/components/ui/Pill'
import { StatBadge } from '@/components/ui/StatBadge'
import { CTAButton } from '@/components/ui/CTAButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { sendServerTelemetry } from '@/utils/telemetry.server'
import { startGameSession } from './chart-actions'
import { createGame } from './actions'

export const revalidate = 0

export async function createGameAction(formData: FormData) {
  'use server'
  await createGame(formData)
}

export async function startGameSessionAction(formData: FormData) {
  'use server'
  await startGameSession(formData)
}

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
  home_away: string | null
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

type GamesPageSearchParams = Promise<Record<string, string | string[] | undefined> | undefined> | Record<string, string | string[] | undefined> | undefined

function getSearchParam(
  params: Record<string, string | string[] | undefined>,
  key: string
): string | null {
  const value = params[key]
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export default async function GamesPage({ searchParams }: { searchParams?: GamesPageSearchParams }) {
  const errors: string[] = []
  const supabase = await createSupabaseServerClient()
  const resolvedSearchParams = ((searchParams ? await searchParams : {}) ?? {}) as Record<
    string,
    string | string[] | undefined
  >

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
    await sendServerTelemetry('games_profile_error', { message: profileError.message, userId: user.id })
  }

  const activeTeamId = profile?.active_team_id as string | null

  if (!activeTeamId) {
    redirect('/onboarding/team')
  }

  const { data: gamesData, error: gamesError } = await supabase
    .from('games')
    .select('id, opponent_name, start_time, home_away, location, season_label, status')
    .eq('team_id', activeTeamId)
    .order('start_time', { ascending: false })

  if (gamesError) {
    const message = 'Error loading games.'
    errors.push(message)
    console.error(message, gamesError.message)
    await sendServerTelemetry('games_fetch_error', { message: gamesError.message, teamId: activeTeamId })
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
      const message = 'Error loading game sessions.'
      errors.push(message)
      console.error(message, sessionError.message)
      await sendServerTelemetry('game_sessions_fetch_error', {
        message: sessionError.message,
        teamId: activeTeamId,
      })
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

  const liveSessionsCount = Object.values(sessionsByGame)
    .flat()
    .filter((session) => session.status === 'active').length
  const pendingSessionsCount = Object.values(sessionsByGame)
    .flat()
    .filter((session) => session.status === 'pending').length

  const nextKickoff = games
    .map((game) => game.start_time)
    .filter(Boolean)
    .map((t) => new Date(t as string).getTime())
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b)[0]

  const errorCode = getSearchParam(resolvedSearchParams, 'error')
  const errorReason = getSearchParam(resolvedSearchParams, 'reason')
  const formDefaults = {
    opponent_name:
      (Array.isArray(resolvedSearchParams.opponent_name)
        ? resolvedSearchParams.opponent_name[0]
        : resolvedSearchParams.opponent_name) || '',
    start_time:
      (Array.isArray(resolvedSearchParams.start_time)
        ? resolvedSearchParams.start_time[0]
        : resolvedSearchParams.start_time) || '',
    home_away:
      (Array.isArray(resolvedSearchParams.home_away)
        ? resolvedSearchParams.home_away[0]
        : resolvedSearchParams.home_away) || '',
    location:
      (Array.isArray(resolvedSearchParams.location)
        ? resolvedSearchParams.location[0]
        : resolvedSearchParams.location) || '',
    season_label:
      (Array.isArray(resolvedSearchParams.season_label)
        ? resolvedSearchParams.season_label[0]
        : resolvedSearchParams.season_label) || '',
  }

  const upcomingGamesByStart = [...games].sort((a, b) => {
    const aTime = a.start_time ? new Date(a.start_time).getTime() : Number.MAX_SAFE_INTEGER
    const bTime = b.start_time ? new Date(b.start_time).getTime() : Number.MAX_SAFE_INTEGER
    return aTime - bTime
  })
  const nextGame = upcomingGamesByStart[0] ?? null
  const nextGameSessions = nextGame ? sessionsByGame[nextGame.id] ?? [] : []
  const unitStatus = (unitKey: string) => {
    const session = nextGameSessions.find((s) => s.unit === unitKey) || null
    const status = session?.status?.toLowerCase() || 'none'
    return { session, status }
  }

  const renderErrors = () =>
    errors.length ? (
      <ErrorState
        title="We hit a snag loading your games"
        description={errors.join(' ')}
      />
    ) : null

  return (
    <section className="space-y-8">
      <SectionHeader
        eyebrow="Games & charting"
        title="Game-day control"
        description="Schedule matchups and manage unit sessions so charting is one click away."
        actions={
          <div className="flex flex-wrap gap-2">
            <Pill label="Live sessions" tone="emerald" icon={<Radio className="h-3 w-3" />} />
            <Pill label="Schedule" tone="cyan" icon={<CalendarClock className="h-3 w-3" />} />
            <CTAButton href="/onboarding/quickstart" variant="secondary" size="sm">
              Quickstart
            </CTAButton>
          </div>
        }
        badge="Command Center"
      />

      {renderErrors()}

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <GamesCreateForm
          gamesCount={games.length}
          unitCount={unitConfigs.length}
          liveSessionsCount={liveSessionsCount}
          errorCode={errorCode}
          errorReason={errorReason}
          formDefaults={formDefaults}
        />

        <GamesReadinessCard
          nextGame={nextGame}
          nextKickoff={nextKickoff}
          pendingSessionsCount={pendingSessionsCount}
          liveSessionsCount={liveSessionsCount}
          unitStatus={unitStatus}
        />
      </div>

      {games.length === 0 ? (
        <EmptyState
          icon={<Gamepad2 className="h-10 w-10 text-slate-500" />}
          title="No games on the calendar yet"
          description="Create your first matchup above or launch Quickstart to spin up a sample game and sessions without touching live team data."
          action={
            <CTAButton href="/onboarding/quickstart" variant="secondary" size="sm">
              Launch Quickstart demo
            </CTAButton>
          }
        />
      ) : (
        <GamesList games={games} sessionsByGame={sessionsByGame} />
      )}
    </section>
  )
}

function formatKickoff(value: string | null) {
  if (!value) return 'Kickoff TBD'
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function formatHomeAway(value: string | null) {
  if (!value) return 'Home/Away'
  return value.toUpperCase() === 'HOME' ? 'Home' : 'Away'
}

function renderErrorMessage(code: string | null, reason?: string | null) {
  const map: Record<string, string> = {
    invalid_game: 'Please check all required fields and use a valid kickoff time.',
    create_failed: 'Could not create the game. Please try again or contact an admin.',
  }
  const base = code && code in map ? map[code] : 'Unable to create game.'
  if (reason) return `${base} (${reason})`
  return base
}

function deriveGameStatus(game: GameRow, sessions: SessionRow[]) {
  const hasActive = sessions.some((s) => s.status === 'active')
  const hasFinal = sessions.some((s) => s.status === 'closed' || s.status === 'final')
  const lowerStatus = (game.status || '').toLowerCase()
  if (hasActive) return 'In Progress'
  if (lowerStatus === 'final' || lowerStatus === 'closed' || hasFinal) return 'Final'
  return 'Scheduled'
}

function GamesCreateForm({
  gamesCount,
  unitCount,
  liveSessionsCount,
  errorCode,
  errorReason,
  formDefaults,
}: {
  gamesCount: number
  unitCount: number
  liveSessionsCount: number
  errorCode: string | null
  errorReason: string | null
  formDefaults: Record<string, string>
}) {
  return (
    <GlassCard>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Add a game</p>
          <h2 className="text-lg font-semibold text-slate-50">Schedule a matchup</h2>
          <p className="text-sm text-slate-400">
            Set opponent and kickoff so offense, defense, and special teams can chart instantly.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatBadge label="Games scheduled" value={gamesCount} tone="cyan" />
          <StatBadge label="Units" value={unitCount} tone="emerald" />
          <StatBadge label="Live sessions" value={liveSessionsCount} tone="amber" />
        </div>
      </div>
      {errorCode ? (
        <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {renderErrorMessage(errorCode, errorReason)}
        </div>
      ) : null}
      <form action={createGameAction} className="grid gap-3 md:grid-cols-2 mt-4">
        <label className="space-y-1 text-xs text-slate-400">
          <span className="uppercase tracking-[0.2em] text-slate-300">Opponent</span>
          <input
            type="text"
            name="opponent_name"
            required
            defaultValue={formDefaults.opponent_name}
            placeholder="Springfield Prep"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
          <span className="block text-[0.7rem] text-slate-500">Team you are facing.</span>
        </label>
        <label className="space-y-1 text-xs text-slate-400">
          <span className="uppercase tracking-[0.2em] text-slate-300">Kickoff</span>
          <input
            type="datetime-local"
            name="start_time"
            required
            defaultValue={formDefaults.start_time}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
          <span className="block text-[0.7rem] text-slate-500">Local date/time.</span>
        </label>
        <label className="space-y-1 text-xs text-slate-400">
          <span className="uppercase tracking-[0.2em] text-slate-300">Home / Away</span>
          <select
            name="home_away"
            required
            defaultValue={formDefaults.home_away}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
          >
            <option value="">Select</option>
            <option value="HOME">Home</option>
            <option value="AWAY">Away</option>
          </select>
          <span className="block text-[0.7rem] text-slate-500">Venue context.</span>
        </label>
        <label className="space-y-1 text-xs text-slate-400">
          <span className="uppercase tracking-[0.2em] text-slate-300">Location</span>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
            <MapPin className="h-4 w-4 text-slate-500" />
            <input
              type="text"
              name="location"
              defaultValue={formDefaults.location}
              placeholder="Stadium or Venue"
              className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
            />
          </div>
          <span className="block text-[0.7rem] text-slate-500">Venue or facility name.</span>
        </label>
        <label className="space-y-1 text-xs text-slate-400">
          <span className="uppercase tracking-[0.2em] text-slate-300">Season label</span>
          <input
            type="text"
            name="season_label"
            defaultValue={formDefaults.season_label}
            placeholder="2025 Season"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
          <span className="block text-[0.7rem] text-slate-500">Optional season tag.</span>
        </label>
        <div className="md:col-span-2 flex justify-end pt-2">
          <CTAButton type="submit" variant="primary">
            Create game
          </CTAButton>
        </div>
      </form>
    </GlassCard>
  )
}

function GamesReadinessCard({
  nextGame,
  nextKickoff,
  pendingSessionsCount,
  liveSessionsCount,
  unitStatus,
}: {
  nextGame: GameRow | null
  nextKickoff: number | undefined
  pendingSessionsCount: number
  liveSessionsCount: number
  unitStatus: (unitKey: string) => { session: SessionRow | null; status: string }
}) {
  return (
    <GlassCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Operational status</p>
          <h2 className="text-base font-semibold text-slate-50">Readiness snapshot</h2>
          {nextGame ? (
            <p className="text-sm text-slate-400">
              {nextGame.opponent_name || 'Opponent TBD'} | {formatKickoff(nextGame.start_time)} |{' '}
              {formatHomeAway(nextGame.home_away)} | {nextGame.location || 'Venue TBD'}
            </p>
          ) : (
            <p className="text-sm text-slate-400">No upcoming game yet. Schedule to unlock sessions.</p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatBadge label="Pending sessions" value={pendingSessionsCount} tone="slate" />
          <StatBadge
            label="Next kickoff"
            value={
              nextKickoff
                ? new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  }).format(new Date(nextKickoff))
                : 'TBD'
            }
            tone="cyan"
          />
          <StatBadge label="Open slots" value={Math.max(unitConfigs.length - liveSessionsCount, 0)} tone="emerald" />
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {unitConfigs.map((unit) => {
          const { status } = unitStatus(unit.key)
          const unitSlug = unit.key.toLowerCase()
          if (!nextGame) {
            return (
              <GlassCard key={unit.key} padding="md" className="space-y-2 bg-slate-950/60">
                <p className="text-sm font-semibold text-slate-100">{unit.label}</p>
                <p className="text-xs text-slate-500">Schedule a game to start.</p>
              </GlassCard>
            )
          }

          const statusLabel =
            status === 'active'
              ? 'Live'
              : status === 'pending'
              ? 'Pending'
              : status === 'closed' || status === 'final'
              ? 'Final'
              : 'No session'

          const renderCta = () => {
            if (status === 'active') {
              return (
                <CTAButton href={`/games/${nextGame.id}/chart/${unitSlug}`} size="sm" fullWidth>
                  Open chart
                </CTAButton>
              )
            }
            if (status === 'pending') {
              return (
                <CTAButton href={`/games/${nextGame.id}/chart/${unitSlug}`} size="sm" fullWidth variant="secondary">
                  Resume chart
                </CTAButton>
              )
            }
            if (status === 'closed' || status === 'final') {
              return (
                <CTAButton href={`/games/${nextGame.id}/chart/${unitSlug}`} size="sm" fullWidth variant="secondary">
                  View report
                </CTAButton>
              )
            }
            return (
              <form action={startGameSessionAction}>
                <input type="hidden" name="gameId" value={nextGame.id} />
                <input type="hidden" name="unit" value={unit.key} />
                <CTAButton type="submit" size="sm" fullWidth>
                  Start
                </CTAButton>
              </form>
            )
          }

          return (
            <GlassCard key={unit.key} padding="md" className="space-y-3 bg-slate-950/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-100">{unit.label}</p>
                  <p className="text-xs text-slate-500">{unit.description}</p>
                </div>
                <Pill
                  label={statusLabel}
                  tone={
                    status === 'active'
                      ? 'emerald'
                      : status === 'pending'
                      ? 'amber'
                      : status === 'closed' || status === 'final'
                      ? 'slate'
                      : 'slate'
                  }
                  icon={status === 'active' ? <Play className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                />
              </div>
              {renderCta()}
            </GlassCard>
          )
        })}
      </div>
    </GlassCard>
  )
}

function GamesList({ games, sessionsByGame }: { games: GameRow[]; sessionsByGame: Record<string, SessionRow[]> }) {
  return (
    <div className="space-y-6">
      {games.map((game) => {
        const sessions = sessionsByGame[game.id] ?? []
        const gameStatus = deriveGameStatus(game, sessions)
        return (
          <GlassCard key={game.id} className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-500">
                  <Pill label={game.season_label || 'Season TBD'} tone="slate" />
                  <Pill label={formatKickoff(game.start_time)} tone="cyan" icon={<CalendarClock className="h-3 w-3" />} />
                </div>
                <h2 className="text-xl font-semibold text-slate-50">{game.opponent_name || 'Opponent TBD'}</h2>
                <p className="text-sm text-slate-400">
                  {[formatKickoff(game.start_time), game.home_away ? game.home_away.toUpperCase() : null, game.location || 'Venue TBD']
                    .filter(Boolean)
                    .join(' | ')}
                </p>
              </div>
              <Pill
                label={gameStatus}
                tone={gameStatus === 'In Progress' ? 'emerald' : gameStatus === 'Final' ? 'slate' : 'cyan'}
                icon={<ShieldCheck className="h-4 w-4" />}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {unitConfigs.map((unit) => {
                const unitSession = sessions.find((session) => session.unit === unit.key) || null
                const status = unitSession?.status?.toLowerCase() || 'none'
                const unitSlug = unit.key.toLowerCase()

                const statusLabel =
                  status === 'active'
                    ? 'Live'
                    : status === 'pending'
                    ? 'Pending'
                    : status === 'closed' || status === 'final'
                    ? 'Final'
                    : 'No session'

                const renderCta = () => {
                  if (status === 'active') {
                    return (
                      <CTAButton href={`/games/${game.id}/chart/${unitSlug}`} size="sm" fullWidth>
                        Open chart
                      </CTAButton>
                    )
                  }
                  if (status === 'pending') {
                    return (
                      <CTAButton href={`/games/${game.id}/chart/${unitSlug}`} size="sm" fullWidth variant="secondary">
                        Resume chart
                      </CTAButton>
                    )
                  }
                  if (status === 'closed' || status === 'final') {
                    return (
                      <CTAButton href={`/games/${game.id}/chart/${unitSlug}`} size="sm" fullWidth variant="secondary">
                        View report
                      </CTAButton>
                    )
                  }
                  return (
                    <form action={startGameSessionAction}>
                      <input type="hidden" name="gameId" value={game.id} />
                      <input type="hidden" name="unit" value={unit.key} />
                      <CTAButton type="submit" size="sm" fullWidth>
                        Start
                      </CTAButton>
                    </form>
                  )
                }

                return (
                  <div key={unit.key} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-100">{unit.label}</p>
                      <Pill
                        label={statusLabel}
                        tone={
                          status === 'active'
                            ? 'emerald'
                            : status === 'pending'
                            ? 'amber'
                            : status === 'closed' || status === 'final'
                            ? 'slate'
                            : 'slate'
                        }
                        icon={status === 'active' ? <Play className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                      />
                    </div>
                    {renderCta()}
                  </div>
                )
              })}
            </div>
          </GlassCard>
        )
      })}
      <GlassCard className="space-y-2 border-dashed border-white/15 bg-slate-950/70">
        <h3 className="text-base font-semibold text-slate-50">Quickstart demo</h3>
        <p className="text-sm text-slate-400">
          Launch a sample game with offense, defense, and special teams sessions to see live charting in under two
          minutes—no real team data touched.
        </p>
        <CTAButton href="/onboarding/quickstart" variant="secondary" size="sm">
          Launch Quickstart demo
        </CTAButton>
      </GlassCard>
    </div>
  )
}
