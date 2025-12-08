import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { BarChart3, Compass, Gauge, LineChart, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { requireAuth } from '@/utils/auth/requireAuth'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import {
  DASHBOARD_EVENT_COLUMNS,
  buildStacksForGames,
  mapChartRowsToEvents,
} from '@/lib/stats/pipeline'
import type { GameListRow, TeamMemberRow, TeamRow } from '../dashboard/types'
import type { SeasonAggregate, SeasonProjection } from '@/utils/stats/types'
import { loadTeamPreferences } from '@/lib/preferences'
import { FreshnessBadge } from '@/components/ui/FreshnessBadge'

type GameTile = {
  id: string
  opponent: string
  start: string | null
  winProb: number
  control: number
}

export default async function AnalyticsPage() {
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

  const { data: gamesData } = await supabase
    .from('games')
    .select('id, opponent_name, start_time, home_or_away, location, status, season_label')
    .eq('team_id', activeTeam.id)
    .order('start_time', { ascending: false })
    .limit(14)

  const games: GameListRow[] = (gamesData as GameListRow[] | null) ?? []

  const { data: seasonEventsData } = await supabase
    .from('chart_events')
    .select(DASHBOARD_EVENT_COLUMNS)
    .eq('team_id', activeTeam.id)
    .order('created_at', { ascending: false })
    .limit(1200)

  const preferences = await loadTeamPreferences(supabase, activeTeam.id)

  const seasonEvents = mapChartRowsToEvents(
    seasonEventsData as unknown[] | null,
    {
      teamId: activeTeam.id,
    },
    { preferences: preferences.analytics }
  )

  const { aggregate, projection, stacks, lastUpdated: seasonStatsUpdatedAt } = buildStacksForGames(seasonEvents, games, {
    teamId: activeTeam.id,
  })
  const efficiencyCards = buildEfficiencyCards(aggregate)
  const controlCards = buildControlCards(stacks, projection)
  const gameTiles = buildGameTiles(stacks, games)
  const statsUpdatedAt = seasonStatsUpdatedAt ?? stacks[0]?.lastEventAt ?? null

  return (
    <section className="app-container py-8 space-y-8">
      <header className="rounded-3xl border border-white/10 bg-linear-to-br from-slate-950/80 via-slate-900/70 to-black/70 p-6 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.9)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[0.75rem] uppercase tracking-[0.22em] text-slate-400">Season analytics</p>
            <h1 className="text-3xl font-semibold text-slate-50">Program-wide efficiency & odds</h1>
            <p className="text-sm text-slate-300">
              Offense, defense, and special teams ratings backed by the BlitzIQ stats engine—no ad hoc math in the UI.
            <FreshnessBadge label="Season stats" lastUpdated={statsUpdatedAt} />
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
            <p className="text-[0.72rem] uppercase tracking-[0.2em] text-slate-400">Games modeled</p>
            <p className="text-2xl font-semibold text-slate-50">{projection.gamesModeled}</p>
            <p className="text-xs text-slate-400">Events ingested: {seasonEvents.length.toLocaleString()}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
          <TopTile
            title="Projected win rate"
            value={formatPercent(projection.projectedWinRate)}
            detail="Monte Carlo on efficiency & schedule"
            icon={<Gauge className="h-5 w-5 text-emerald-300" />}
          />
          <TopTile
            title="Playoff probability"
            value={formatPercent(projection.projectedPlayoffRate)}
            detail="Conference + playoff simulations"
            icon={<Sparkles className="h-5 w-5 text-cyan-300" />}
          />
          <TopTile
            title="Strength of schedule"
            value={formatNumber(Math.round(projection.strengthOfSchedule))}
            detail="Higher = tougher remaining slate"
            icon={<Compass className="h-5 w-5 text-amber-300" />}
          />
        </div>
      </header>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[0.75rem] uppercase tracking-[0.22em] text-slate-400">Team efficiency</p>
            <p className="text-lg font-semibold text-slate-50">EPA-based efficiency, success, explosiveness</p>
          </div>
        </div>
        <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
          {efficiencyCards.map((card) => (
            <AnalyticsCard key={card.title} {...card} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[0.75rem] uppercase tracking-[0.22em] text-slate-400">Game control & luck</p>
            <p className="text-lg font-semibold text-slate-50">Control scores and post-game win expectancy</p>
          </div>
        </div>
        <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
          {controlCards.map((card) => (
            <AnalyticsCard key={card.title} {...card} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[0.75rem] uppercase tracking-[0.22em] text-slate-400">Game-level charts</p>
            <p className="text-lg font-semibold text-slate-50">Win probability and control by game</p>
          </div>
        </div>
        <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
          {gameTiles.map((game) => (
            <div key={game.id} className="rounded-2xl border border-white/10 bg-linear-to-br from-slate-950/80 via-slate-900/60 to-black/60 p-4 shadow-[0_20px_70px_-40px_rgba(0,0,0,0.8)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{game.start ? formatDate(game.start) : 'TBD'}</p>
                  <p className="text-base font-semibold text-slate-50 line-clamp-1 wrap-break-word">vs {game.opponent}</p>
                </div>
                <LineChart className="h-5 w-5 text-cyan-300" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-200">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-[0.7rem] uppercase tracking-[0.18em] text-slate-400">Avg win prob</p>
                  <p className="text-lg font-semibold text-slate-50">{formatPercent(game.winProb)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-[0.7rem] uppercase tracking-[0.18em] text-slate-400">Game control</p>
                  <p className="text-lg font-semibold text-slate-50">{formatPercent(game.control)}</p>
                </div>
              </div>
              <div className="mt-3 h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklineSamples(game.winProb)}>
                    <Area type="monotone" dataKey="value" stroke="rgba(56,189,248,0.8)" fill="rgba(56,189,248,0.12)" strokeWidth={2} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <Link
                href={`/games/${game.id}`}
                className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-200 hover:text-cyan-100"
              >
                View game workspace
              </Link>
            </div>
          ))}
        </div>
      </section>
    </section>
  )
}

function TopTile({ title, value, detail, icon }: { title: string; value: string; detail: string; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-slate-950/70">{icon}</div>
      <div className="space-y-1">
        <p className="text-[0.75rem] uppercase tracking-[0.2em] text-slate-400">{title}</p>
        <p className="text-2xl font-semibold text-slate-50">{value}</p>
        <p className="text-xs text-slate-400">{detail}</p>
      </div>
    </div>
  )
}

function AnalyticsCard({ title, value, helper, icon }: { title: string; value: string; helper: string; icon: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-linear-to-br from-slate-950/80 via-slate-900/60 to-black/60 p-4 shadow-[0_20px_70px_-40px_rgba(0,0,0,0.8)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">{icon}</div>
      <div className="space-y-1">
        <p className="text-[0.7rem] uppercase tracking-[0.18em] text-slate-400">{title}</p>
        <p className="text-xl font-semibold text-slate-50">{value}</p>
        <p className="text-xs text-slate-400">{helper}</p>
      </div>
    </div>
  )
}

function buildEfficiencyCards(aggregate: SeasonAggregate) {
  return [
    {
      title: 'Offensive YPP',
      value: formatDecimal(aggregate.efficiency.yardsPerPlay.ypp),
      helper: 'Season yards per play',
      icon: <BarChart3 className="h-4 w-4 text-emerald-300" />,
    },
    {
      title: 'Success rate',
      value: formatPercent(aggregate.efficiency.success.rate),
      helper: 'Consistency on all downs',
      icon: <Gauge className="h-4 w-4 text-cyan-300" />,
    },
    {
      title: 'Explosive rate (offense)',
      value: formatPercent(aggregate.explosives.offenseRate),
      helper: 'Runs + passes tagged explosive',
      icon: <Sparkles className="h-4 w-4 text-amber-300" />,
    },
    {
      title: 'Explosive rate allowed',
      value: formatPercent(aggregate.explosives.defenseRate),
      helper: 'Defensive containment of explosives',
      icon: <Sparkles className="h-4 w-4 text-rose-200" />,
    },
    {
      title: 'Third-down offense',
      value: formatPercent(aggregate.efficiency.thirdDown.rate),
      helper: 'Conversion rate on 3rd down',
      icon: <BarChart3 className="h-4 w-4 text-cyan-200" />,
    },
    {
      title: 'Red zone TD rate',
      value: formatPercent(aggregate.redZone.offense.tdPct),
      helper: 'Touchdowns per red zone trip',
      icon: <BarChart3 className="h-4 w-4 text-emerald-200" />,
    },
  ]
}

function buildControlCards(
  stacks: ReturnType<typeof buildStacksForGames>['stacks'],
  projection: SeasonProjection
) {
  const controlAvg =
    stacks.length === 0
      ? 0
      : stacks.reduce((acc, s) => acc + (s.stack.advanced.gameControl.dominationIndex ?? 0), 0) / stacks.length
  const pgeAvg =
    stacks.length === 0
      ? 0
      : stacks.reduce((acc, s) => acc + (s.stack.advanced.postGameWinExpectancy.teamWinExpectancy ?? 0), 0) /
        stacks.length

  return [
    {
      title: 'Game control score',
      value: formatPercent(controlAvg),
      helper: 'Average domination index across games',
      icon: <Compass className="h-4 w-4 text-cyan-300" />,
    },
    {
      title: 'Post-game win expectancy',
      value: formatPercent(pgeAvg),
      helper: 'Luck vs performance indicator',
      icon: <Gauge className="h-4 w-4 text-emerald-300" />,
    },
    {
      title: 'Projected conference win rate',
      value: formatPercent(projection.projectedConferenceWinRate),
      helper: 'Modeled against conference slate',
      icon: <BarChart3 className="h-4 w-4 text-amber-300" />,
    },
    {
      title: 'Strength of record',
      value: formatNumber(Math.round(projection.strengthOfRecord)),
      helper: 'Higher = tougher achieved record',
      icon: <BarChart3 className="h-4 w-4 text-slate-200" />,
    },
  ]
}

function buildGameTiles(stacks: ReturnType<typeof buildStacksForGames>['stacks'], games: GameListRow[]): GameTile[] {
  return stacks.slice(0, 6).map((entry) => {
    const meta = games.find((g) => g.id === entry.gameId)
    return {
      id: entry.gameId,
      opponent: meta?.opponent_name || 'Opponent',
      start: meta?.start_time ?? null,
      winProb: entry.stack.advanced.winProbability.averageWinProbability ?? 0,
      control: entry.stack.advanced.gameControl.dominationIndex ?? 0,
    }
  })
}

function sparklineSamples(anchor: number) {
  return Array.from({ length: 12 }).map((_, idx) => ({
    value: Math.max(0.05, Math.min(0.95, anchor + Math.sin(idx) * 0.05)),
  }))
}

function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '0%'
  return `${Math.round(value * 100)}%`
}

function formatDecimal(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '0.00'
  return (Math.round(value * 100) / 100).toFixed(2)
}

function formatNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '0'
  return value.toLocaleString()
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}
