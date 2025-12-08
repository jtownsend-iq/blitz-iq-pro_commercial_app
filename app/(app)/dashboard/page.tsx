import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Radio, Sparkles, Target } from 'lucide-react'
import { LiveEventFeed } from '@/components/dashboard/LiveEventFeed'
import { LiveSessionList } from '@/components/dashboard/LiveSessionList'
import { StatsGrid, type StatCard } from '@/components/dashboard/StatsGrid'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { requireAuth } from '@/utils/auth/requireAuth'
import {
  DASHBOARD_EVENT_COLUMNS,
  buildStacksForGames,
  mapChartRowsToEvents,
} from '@/lib/stats/pipeline'
import { buildStatsStack } from '@/utils/stats/engine'
import type {
  EventRow,
  EventSummary,
  GameListRow,
  SessionRow,
  SessionSummary,
  TeamMemberRow,
  TeamRow,
} from './types'
import { normalizeEventSession, normalizeSessionGame } from './utils'
import type { SeasonAggregate } from '@/utils/stats/types'

const RENDER_TIMESTAMP = Date.now()

type HeroCta = { href: string; label: string }

export default async function DashboardPage() {
  const { user, activeTeamId } = await requireAuth()
  const supabase = await createSupabaseServerClient()

  const { data: membershipsData } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', user.id)

  const memberships: TeamMemberRow[] = (membershipsData as TeamMemberRow[] | null) ?? []
  if (memberships.length === 0) redirect('/onboarding/team')

  const teamIds = memberships.map((m) => m.team_id)
  const { data: teamsData } = await supabase
    .from('teams')
    .select('id, name, level, school_name')
    .in('id', teamIds)

  const teams: TeamRow[] = (teamsData as TeamRow[] | null) ?? []
  if (!activeTeamId) throw new Error('No active team set for user.')
  const activeTeam = teams.find((team) => team.id === activeTeamId)
  if (!activeTeam) throw new Error('Active team not found.')

  const { data: sessionsData } = await supabase
    .from('game_sessions')
    .select(
      'id, unit, status, started_at, game_id, games:games(id, opponent_name, start_time, home_or_away, location, status, season_label)'
    )
    .eq('team_id', activeTeam.id)
    .order('started_at', { ascending: false })
    .limit(12)

  const sessionRows: SessionRow[] = (sessionsData as SessionRow[] | null) ?? []
  const sessions: SessionSummary[] = sessionRows.map((session) => ({
    ...session,
    games: normalizeSessionGame(session.games),
  }))

  const { data: gamesData } = await supabase
    .from('games')
    .select('id, opponent_name, start_time, home_or_away, location, status, season_label')
    .eq('team_id', activeTeam.id)
    .order('start_time', { ascending: true })
    .limit(10)

  const games: GameListRow[] = (gamesData as GameListRow[] | null) ?? []

  const activeSessions = sessions.filter((s) => s.status === 'active' || s.status === 'pending')
  const upcomingGameFromGames =
    games.find((g) => (g.start_time ? new Date(g.start_time).getTime() : 0) >= RENDER_TIMESTAMP) ?? null
  const upcomingSession =
    sessions.find(
      (s) => s.games?.start_time && new Date(s.games.start_time).getTime() >= RENDER_TIMESTAMP
    ) ?? null
  const upcomingSessionGame: GameListRow | null = upcomingSession
    ? {
        id: upcomingSession.game_id,
        opponent_name: upcomingSession.games?.opponent_name ?? null,
        start_time: upcomingSession.games?.start_time ?? null,
        home_or_away: upcomingSession.games?.home_or_away ?? null,
        location: upcomingSession.games?.location ?? null,
        status: upcomingSession.games?.status ?? null,
        season_label: upcomingSession.games?.season_label ?? null,
      }
    : null

  const primarySession = activeSessions[0] ?? null
  const currentGameId =
    primarySession?.game_id ??
    upcomingGameFromGames?.id ??
    upcomingSession?.game_id ??
    sessions[0]?.game_id ??
    games[0]?.id ??
    null
  const currentGame: GameListRow | null =
    (currentGameId ? games.find((g) => g.id === currentGameId) : null) ??
    upcomingGameFromGames ??
    upcomingSessionGame

  const { data: recentEventsData } = await supabase
    .from('chart_events')
    .select(
      'id, sequence, play_call, result, gained_yards, explosive, turnover, created_at, game_sessions!inner(unit, game_id)'
    )
    .eq('team_id', activeTeam.id)
    .order('created_at', { ascending: false })
    .limit(40)

  const recentEventRows: EventRow[] = (recentEventsData as EventRow[] | null) ?? []
  const recentEvents: EventSummary[] = recentEventRows.map((event) => ({
    ...event,
    game_sessions: normalizeEventSession(event.game_sessions),
  }))

  const { data: currentGameEventsData } =
    currentGameId && currentGameId.length > 0
      ? await supabase
          .from('chart_events')
          .select(DASHBOARD_EVENT_COLUMNS)
          .eq('team_id', activeTeam.id)
          .eq('game_id', currentGameId)
          .order('created_at', { ascending: false })
          .limit(400)
      : { data: [] }

  const currentGameEvents = mapChartRowsToEvents(currentGameEventsData as unknown[] | null, {
    teamId: activeTeam.id,
    opponent: currentGame?.opponent_name ?? null,
  })

  const { data: seasonEventsData } = await supabase
    .from('chart_events')
    .select(DASHBOARD_EVENT_COLUMNS)
    .eq('team_id', activeTeam.id)
    .order('created_at', { ascending: false })
    .limit(900)

  const seasonEvents = mapChartRowsToEvents(seasonEventsData as unknown[] | null, {
    teamId: activeTeam.id,
  })

  const offenseStack = buildStatsStack({ events: currentGameEvents, unit: 'OFFENSE', gameId: currentGameId ?? undefined })
  const defenseStack = buildStatsStack({ events: currentGameEvents, unit: 'DEFENSE', gameId: currentGameId ?? undefined })
  const specialStack = buildStatsStack({
    events: currentGameEvents,
    unit: 'SPECIAL_TEAMS',
    gameId: currentGameId ?? undefined,
  })
  const gameStack = buildStatsStack({ events: currentGameEvents, gameId: currentGameId ?? undefined })
  const { aggregate: seasonAggregate, projection } = buildStacksForGames(seasonEvents, games)

  const heroCta = resolveHeroCta(primarySession, currentGameId)
  const heroSubtitle = currentGame
    ? buildGameLine(currentGame)
    : 'Schedule the next game so the staff lands in the right context on load.'

  const coreTiles = buildCoreTiles(gameStack, seasonAggregate)
  const unitCards = buildUnitCards({ offenseStack, defenseStack, specialStack, gameId: currentGameId })
  const seasonContext = projection
  const lastEventAt = recentEvents[0]?.created_at ?? null
  const freshnessLabel = lastEventAt ? formatRelative(lastEventAt, RENDER_TIMESTAMP) : null

  const sessionList = mergeUpcomingSessions(sessions, games)

  return (
    <section className="app-container py-8 space-y-8">
      <div className="grid gap-6 lg:grid-cols-12">
        <HeroStrip
          team={activeTeam}
          title={currentGame?.opponent_name ? `vs ${currentGame.opponent_name}` : 'Next opponent not set'}
          subtitle={heroSubtitle}
          live={Boolean(primarySession)}
          cta={heroCta}
          secondaryHref="/games"
          kickLabel={formatKickLabel(currentGame?.start_time)}
          freshnessLabel={freshnessLabel}
        />
        <div className="lg:col-span-12">
          <StatsGrid tiles={coreTiles} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {unitCards.map((card) => (
          <UnitCard key={card.unit} {...card} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <LiveSessionList sessions={sessionList} />
        </div>
        <div className="space-y-4">
          <LiveEventFeed teamId={activeTeam.id} initialEvents={recentEvents} fullLogHref={currentGameId ? `/games/${currentGameId}` : '/games'} />
          <SeasonPulse projection={seasonContext} />
        </div>
      </div>
    </section>
  )
}

function resolveHeroCta(session: SessionSummary | null, gameId: string | null): HeroCta {
  if (session) {
    return {
      href: `/games/${session.game_id}/chart/${(session.unit || 'offense').toLowerCase().replace('_', '-')}`,
      label: session.status === 'active' ? 'Resume live game' : 'Open live prep',
    }
  }
  if (gameId) {
    return {
      href: `/games/${gameId}`,
      label: 'Start game session',
    }
  }
  return { href: '/games', label: 'Schedule next opponent' }
}

function buildGameLine(game: GameListRow): string {
  const pieces = [game.opponent_name ? `vs ${game.opponent_name}` : 'Opponent TBD']
  if (game.start_time) pieces.push(formatKickLabel(game.start_time))
  if (game.home_or_away) pieces.push(game.home_or_away === 'home' ? 'Home' : 'Away')
  if (game.location) pieces.push(game.location)
  return pieces.join(' • ')
}

function formatKickLabel(start?: string | null) {
  if (!start) return 'Kickoff TBD'
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(start))
}

function buildCoreTiles(gameStack: ReturnType<typeof buildStatsStack>, seasonAggregate: SeasonAggregate): StatCard[] {
  const hasGame = gameStack.base.plays > 0
  const diff = hasGame ? gameStack.scoring.pointDifferential : seasonAggregate.scoring.averageDifferential
  const turnoverMargin = hasGame ? gameStack.turnovers.margin : seasonAggregate.turnover.averageMargin
  const explosiveDiff = hasGame
    ? gameStack.explosives.offense.explosives - gameStack.explosives.defense.explosives
    : seasonAggregate.explosives.offenseRate - seasonAggregate.explosives.defenseRate
  const epaPerPlay = hasGame ? gameStack.advanced.estimatedEPAperPlay : averageSeasonEpa(seasonAggregate)

  return [
    {
      id: 'point-diff',
      label: hasGame ? 'Point differential (game)' : 'Season point differential',
      value: formatNumber(diff),
      helper: hasGame ? 'Score control this matchup' : 'Avg per game',
      intent: diff >= 0 ? 'positive' : 'warning',
    },
    {
      id: 'turnover-margin',
      label: 'Turnover margin',
      value: formatNumber(turnoverMargin),
      helper: hasGame ? 'Giveaways vs takeaways tonight' : 'Avg per game',
      intent: turnoverMargin >= 0 ? 'positive' : 'warning',
    },
    {
      id: 'explosive-diff',
      label: 'Explosive play differential',
      value: formatNumber(explosiveDiff),
      helper: hasGame ? 'Explosive edge this game' : 'Season explosive rate edge',
      intent: explosiveDiff >= 0 ? 'positive' : 'warning',
    },
    {
      id: 'epa',
      label: 'Estimated EPA per play',
      value: formatDecimal(epaPerPlay),
      helper: hasGame ? 'Live efficiency' : 'Season efficiency blend',
      intent: epaPerPlay >= 0 ? 'positive' : 'warning',
    },
  ]
}

function averageSeasonEpa(aggregate: SeasonAggregate) {
  const ypp = aggregate.efficiency.yardsPerPlay.ypp
  const success = aggregate.efficiency.success.rate
  const explosiveEdge = aggregate.explosives.offenseRate - aggregate.explosives.defenseRate
  const turnoverEdge = aggregate.turnover.averageMargin
  // Simple blended proxy for EPA when full model data isn't present.
  return ypp * 0.08 + success * 2 + explosiveEdge * 0.5 + turnoverEdge * 0.2
}

function buildUnitCards({
  offenseStack,
  defenseStack,
  specialStack,
  gameId,
}: {
  offenseStack: ReturnType<typeof buildStatsStack>
  defenseStack: ReturnType<typeof buildStatsStack>
  specialStack: ReturnType<typeof buildStatsStack>
  gameId: string | null
}) {
  return [
    {
      unit: 'Offense',
      status: offenseStack.base.plays > 0 ? 'live' : 'idle',
      metrics: [
        { label: 'Yards per play', value: formatDecimal(offenseStack.box.yardsPerPlay) },
        { label: 'Success rate', value: formatPercent(offenseStack.game.efficiency.success.rate) },
      ],
      href: gameId ? `/games/${gameId}/chart/offense` : '/games',
      accent: 'from-emerald-500/20 via-emerald-500/10 to-transparent',
    },
    {
      unit: 'Defense',
      status: defenseStack.base.plays > 0 ? 'live' : 'idle',
      metrics: [
        { label: 'Yards per play allowed', value: formatDecimal(defenseStack.box.yardsPerPlay) },
        { label: 'Havoc rate', value: formatPercent(defenseStack.defense?.havoc.rate ?? 0) },
      ],
      href: gameId ? `/games/${gameId}/chart/defense` : '/games',
      accent: 'from-blue-500/20 via-blue-500/10 to-transparent',
    },
    {
      unit: 'Special Teams',
      status: specialStack.base.plays > 0 ? 'live' : 'idle',
      metrics: [
        { label: 'Net field position', value: formatNumber(specialStack.specialTeams.fieldPosition.netStart ?? 0) },
        { label: 'FG make %', value: formatPercent(specialStack.specialTeams.fieldGoals.overall.pct ?? 0) },
      ],
      href: gameId ? `/games/${gameId}/chart/special-teams` : '/games',
      accent: 'from-amber-500/20 via-amber-500/10 to-transparent',
    },
  ]
}

function formatNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '0'
  return Math.round(value).toLocaleString()
}

function formatDecimal(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '0.0'
  return (Math.round(value * 100) / 100).toFixed(2)
}

function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '0%'
  return `${Math.round(value * 100)}%`
}

function mergeUpcomingSessions(sessions: SessionSummary[], games: GameListRow[]): SessionSummary[] {
  const sessionByGame = new Set(sessions.map((s) => s.game_id))
  const placeholders: SessionSummary[] = games
    .filter((g) => !sessionByGame.has(g.id))
    .map((g) => ({
      id: `upcoming-${g.id}`,
      unit: 'OFFENSE',
      status: 'pending',
      started_at: g.start_time,
      game_id: g.id,
      games: {
        opponent_name: g.opponent_name,
        start_time: g.start_time,
        home_or_away: g.home_or_away,
        location: g.location,
        status: g.status,
        season_label: g.season_label,
      },
    }))

  return [...sessions, ...placeholders]
}

function HeroStrip({
  team,
  title,
  subtitle,
  live,
  cta,
  secondaryHref,
  kickLabel,
  freshnessLabel,
}: {
  team: TeamRow
  title: string
  subtitle: string
  live: boolean
  cta: HeroCta
  secondaryHref: string
  kickLabel: string
  freshnessLabel: string | null
}) {
  return (
    <div className="lg:col-span-12">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950/80 via-slate-900/70 to-black/70 p-6 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.9)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.12),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.12),transparent_35%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.72rem] uppercase tracking-[0.2em] text-slate-200">
              <Radio className="h-4 w-4 text-emerald-300" />
              {live ? 'Live game session' : 'Pregame prep'}
            </div>
            <h1 className="font-display text-3xl font-semibold text-slate-50 md:text-4xl break-words">{title}</h1>
            <p className="text-sm text-slate-200 line-clamp-2 break-words">{subtitle}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-200">
              <span className="pill bg-slate-900/70 border-slate-800 text-slate-100">Team: {team.name || 'Unnamed'}</span>
              {team.school_name ? (
                <span className="pill bg-slate-900/70 border-slate-800 text-slate-100">{team.school_name}</span>
              ) : null}
              <span className="pill bg-emerald-500/10 border-emerald-600/40 text-emerald-200">Kickoff {kickLabel}</span>
              {freshnessLabel ? (
                <span className="pill bg-white/5 border-white/10 text-slate-200">Updated {freshnessLabel}</span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={cta.href}
                className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-[0.85rem] font-semibold uppercase tracking-[0.2em] text-black shadow-[0_15px_40px_-18px_rgba(0,229,255,0.6)] hover:bg-brand-soft"
              >
                {cta.label}
              </Link>
              <Link
                href={secondaryHref}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 hover:border-brand"
              >
                Go to schedule
              </Link>
            </div>
          </div>
          <div className="w-full max-w-xs space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="flex items-center justify-between text-sm text-slate-200">
              <span>Live status</span>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${live ? 'bg-emerald-500/10 text-emerald-200' : 'bg-slate-800 text-slate-300'}`}>
                <span className={`h-2 w-2 rounded-full ${live ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                {live ? 'Active' : 'Idle'}
              </span>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Sparkles className="h-4 w-4 text-cyan-300" />
                Priority tonight
              </div>
              <p className="text-lg font-semibold text-slate-50">Be ready to launch the next session instantly.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function UnitCard({
  unit,
  status,
  metrics,
  href,
  accent,
}: {
  unit: string
  status: string
  metrics: { label: string; value: string }[]
  href: string
  accent: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-black/60 p-5 shadow-[0_20px_70px_-40px_rgba(0,0,0,0.8)]">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent}`} />
      <div className="relative flex flex-col h-full gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{unit}</p>
            <p className="text-base font-semibold text-slate-50">Unit workspace</p>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.7rem] uppercase tracking-[0.2em] ${
              status === 'live'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                : 'border-slate-700 bg-slate-900/70 text-slate-300'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${status === 'live' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            {status}
          </span>
        </div>
        <div className="grid gap-2">
          {metrics.map((metric) => (
            <div key={metric.label} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <span className="text-xs uppercase tracking-[0.18em] text-slate-400">{metric.label}</span>
              <span className="text-lg font-semibold text-slate-50 tabular-nums">{metric.value}</span>
            </div>
          ))}
        </div>
        <Link
          href={href}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-3 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.2em] text-black shadow-[0_12px_36px_-18px_rgba(0,229,255,0.55)] hover:bg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
        >
          Open unit workspace
        </Link>
      </div>
    </div>
  )
}

function SeasonPulse({ projection }: { projection: ReturnType<typeof buildStacksForGames>['projection'] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-black/60 p-5 shadow-[0_22px_70px_-38px_rgba(0,0,0,0.75)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[0.72rem] uppercase tracking-[0.2em] text-slate-500">Season outlook</p>
          <p className="text-lg font-semibold text-slate-50">Projected record & playoff odds</p>
        </div>
        <Target className="h-6 w-6 text-cyan-300" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-[0.72rem] uppercase tracking-[0.2em] text-slate-400">Projected win rate</p>
          <p className="mt-1 text-2xl font-semibold text-slate-50">{formatPercent(projection.projectedWinRate)}</p>
          <p className="text-xs text-slate-400">Based on efficiency + opponent strength</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-[0.72rem] uppercase tracking-[0.2em] text-slate-400">Playoff probability</p>
          <p className="mt-1 text-2xl font-semibold text-slate-50">{formatPercent(projection.projectedPlayoffRate)}</p>
          <p className="text-xs text-slate-400">Modeled with Monte Carlo schedule simulations</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-[0.72rem] uppercase tracking-[0.2em] text-slate-400">Strength of schedule</p>
          <p className="mt-1 text-2xl font-semibold text-slate-50">{formatNumber(Math.round(projection.strengthOfSchedule))}</p>
          <p className="text-xs text-slate-400">Higher = tougher slate</p>
        </div>
      </div>
    </div>
  )
}

function formatRelative(value: string, reference: number) {
  const delta = reference - new Date(value).getTime()
  const minutes = Math.floor(delta / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
