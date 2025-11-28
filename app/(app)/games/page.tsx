import { redirect } from 'next/navigation'
import { CalendarClock, Gamepad2, MapPin, PauseCircle, Play, Radio, ShieldCheck } from 'lucide-react'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { GlassCard } from '@/components/ui/GlassCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Pill } from '@/components/ui/Pill'
import { StatBadge } from '@/components/ui/StatBadge'
import { CTAButton } from '@/components/ui/CTAButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { closeGameSession, startGameSession } from './chart-actions'
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

export default async function GamesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createSupabaseServerClient()
  const resolvedSearchParams = (searchParams ? await searchParams : {}) ?? {}

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
    .select('id, opponent_name, start_time, home_away, location, season_label, status')
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

  const liveSessionsCount = Object.values(sessionsByGame)
    .flat()
    .filter((session) => session.status === 'active').length
  const pendingSessionsCount = Object.values(sessionsByGame)
    .flat()
    .filter((session) => session.status === 'pending').length

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

  const nextKickoff = games
    .map((game) => game.start_time)
    .filter(Boolean)
    .map((t) => new Date(t as string).getTime())
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b)[0]

  const renderErrorMessage = (code: string | null, reason?: string | null) => {
    const map: Record<string, string> = {
      invalid_game: 'Please check all required fields and use a valid kickoff time.',
      create_failed: 'Could not create the game. Please try again or contact an admin.',
    }
    const base = code && code in map ? map[code] : 'Unable to create game.'
    if (reason) return `${base} (${reason})`
    return base
  }

  const errorCode = Array.isArray(resolvedSearchParams.error)
    ? resolvedSearchParams.error[0]
    : resolvedSearchParams.error ?? null
  const errorReason = Array.isArray(resolvedSearchParams.reason)
    ? resolvedSearchParams.reason[0]
    : resolvedSearchParams.reason ?? null
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
  const formatHomeAway = (value: string | null) => {
    if (!value) return 'Home/Away'
    return value.toUpperCase() === 'HOME' ? 'Home' : 'Away'
  }

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

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
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
              <StatBadge label="Games scheduled" value={games.length} tone="cyan" />
              <StatBadge label="Units" value={unitConfigs.length} tone="emerald" />
              <StatBadge label="Live sessions" value={liveSessionsCount} tone="amber" />
            </div>
          </div>
          {errorCode ? (
            <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              {renderErrorMessage(errorCode, errorReason)}
            </div>
          ) : null}
          <form
            action={async (formData) => {
              'use server'
              await createGame(formData)
              return
            }}
            className="grid gap-3 md:grid-cols-2 mt-4"
          >
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
                  <form
                    action={async (formData) => {
                      'use server'
                      await startGameSession(formData)
                      return
                    }}
                  >
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
      </div>

      {games.length === 0 ? (
        <EmptyState
          icon={<Gamepad2 className="h-10 w-10 text-slate-500" />}
          title="No games on the calendar yet"
          description="Create your first matchup above to activate charting sessions."
          action={
            <CTAButton href="/onboarding/quickstart" variant="secondary" size="sm">
              Run Quickstart
            </CTAButton>
          }
        />
      ) : (
        <div className="space-y-6">
          {games.map((game) => {
            const sessions = sessionsByGame[game.id] ?? []
            return (
              <GlassCard key={game.id} className="space-y-6">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500">
                    <Pill label={game.season_label || 'Season TBD'} tone="slate" />
                    <Pill label={formatKickoff(game.start_time)} tone="cyan" icon={<CalendarClock className="h-3 w-3" />} />
                  </div>
                  <h2 className="text-2xl font-semibold text-slate-50">
                    {game.opponent_name || 'Opponent TBD'}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {[
                      formatKickoff(game.start_time),
                      game.home_away ? game.home_away.toUpperCase() : null,
                      game.location || 'Venue TBD',
                    ]
                      .filter(Boolean)
                      .join(' | ')}
                  </p>
                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
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
                      <GlassCard key={unit.key} padding="md" className="flex flex-col gap-3" interactive>
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{unit.label}</p>
                          <p className="text-xs text-slate-500">{unit.description}</p>
                        </div>

                        {activeSession ? (
                          <div className="space-y-3">
                            <Pill
                              label={`Active | Analyst ${activeSession.analyst_user_id ? activeSession.analyst_user_id.slice(0, 6) : 'Assigned'}`}
                              tone="emerald"
                              icon={<Play className="h-3.5 w-3.5" />}
                            />
                            <div className="flex gap-2">
                              <a
                                href={`/games/${game.id}/chart/${unit.key.toLowerCase()}`}
                                className="flex-1 rounded-full bg-brand px-3 py-1.5 text-center text-xs font-semibold uppercase tracking-[0.2em] text-black"
                              >
                                Open chart
                              </a>
                              <form
                                action={async (formData) => {
                                  'use server'
                                  await closeGameSession(formData)
                                  return
                                }}
                                className="flex-1"
                              >
                                <input
                                  type="hidden"
                                  name="sessionId"
                                  value={activeSession.id}
                                />
                                <CTAButton type="submit" variant="secondary" fullWidth size="sm">
                                  Close
                                </CTAButton>
                              </form>
                            </div>
                          </div>
                        ) : pendingSession ? (
                          <Pill label="Pending session exists | resume from chart" tone="amber" icon={<PauseCircle className="h-3.5 w-3.5" />} />
                        ) : (
                          <form
                            action={async (formData) => {
                              'use server'
                              await startGameSession(formData)
                              return
                            }}
                            className="space-y-2"
                          >
                            <input type="hidden" name="gameId" value={game.id} />
                            <input type="hidden" name="unit" value={unit.key} />
                            <CTAButton type="submit" disabled={disabled} fullWidth size="sm">
                              Start session
                            </CTAButton>
                          </form>
                        )}
                      </GlassCard>
                    )
                  })}
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}
    </section>
  )
}
