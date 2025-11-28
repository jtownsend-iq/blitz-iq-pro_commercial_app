import { redirect } from 'next/navigation'
import { CalendarClock, Gamepad2, MapPin, PauseCircle, Play, Radio, ShieldCheck } from 'lucide-react'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { GlassCard } from '@/components/ui/GlassCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Pill } from '@/components/ui/Pill'
import { StatBadge } from '@/components/ui/StatBadge'
import { MotionList } from '@/components/ui/MotionList'
import { CTAButton } from '@/components/ui/CTAButton'
import { InputField } from '@/components/ui/InputField'
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
      <SectionHeader
        eyebrow="Games & Charting"
        title="Game-day control"
        description="Schedule matchups, open live charting, and keep sessions synchronized across units."
        actions={
          <div className="flex flex-wrap gap-2">
            <Pill label="Live sessions" tone="emerald" icon={<Radio className="h-3 w-3" />} />
            <Pill label="Schedule" tone="cyan" icon={<CalendarClock className="h-3 w-3" />} />
          </div>
        }
        badge="Command Center"
      />

      {errorCode ? (
        <GlassCard tone="amber" className="border-amber-500/40">
          <p className="text-sm text-amber-100">{renderErrorMessage(errorCode, errorReason)}</p>
        </GlassCard>
      ) : null}

      <GlassCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Add a game</p>
            <h2 className="text-lg font-semibold text-slate-50">Schedule a matchup</h2>
            <p className="text-sm text-slate-400">
              Create a game to enable charting sessions for offense, defense, and special teams.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatBadge label="Games scheduled" value={games.length} tone="cyan" />
            <StatBadge label="Active units" value={unitConfigs.length} tone="emerald" />
            <StatBadge label="Live sessions" value={Object.keys(sessionsByGame).length} tone="amber" />
          </div>
        </div>
        <form
          action={async (formData) => {
            'use server'
            await createGame(formData)
            return
          }}
          className="grid gap-3 md:grid-cols-2 mt-4"
        >
          <InputField
            label="Opponent"
            name="opponent_name"
            required
            placeholder="Springfield Prep"
            description="Team you are facing."
          />
          <InputField
            label="Kickoff"
            name="start_time"
            required
            type="datetime-local"
            description="Local date/time."
          />
          <InputField
            as="select"
            label="Home / Away"
            name="home_away"
            required
            options={[
              { label: 'Home', value: 'HOME' },
              { label: 'Away', value: 'AWAY' },
            ]}
            description="Venue context."
          />
          <label className="space-y-1 text-xs text-slate-400">
            <span className="uppercase tracking-[0.2em] text-slate-300">Location</span>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
              <MapPin className="h-4 w-4 text-slate-500" />
              <input
                type="text"
                name="location"
                placeholder="Stadium or Venue"
                className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
              />
            </div>
            <span className="block text-[0.7rem] text-slate-500">Venue or facility name.</span>
          </label>
          <InputField
            label="Season label"
            name="season_label"
            placeholder="2025 Season"
            description="Optional season tag."
            required={false}
            />
          <div className="md:col-span-2 flex justify-end">
            <CTAButton type="submit" variant="primary">
              Create game
            </CTAButton>
          </div>
        </form>
      </GlassCard>

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
          <MotionList
            items={games}
            getKey={(game) => game.id}
            renderItem={(game) => {
              const sessions = sessionsByGame[game.id] ?? []
              return (
                <GlassCard className="space-y-6">
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
            }}
          />
        </div>
      )}
    </section>
  )
}
