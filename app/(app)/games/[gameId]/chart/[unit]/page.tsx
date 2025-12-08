import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowRight, Flag, Radio, ShieldAlert, TimerReset } from 'lucide-react'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { closeGameSession, recordChartEvent } from '../../../chart-actions'
import { ChartEventPanel } from './ChartEventPanel'
import { loadDictionaryBundle } from '@/lib/dictionaries'
import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import { CTAButton } from '@/components/ui/CTAButton'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  bucketDownDistance,
  buildStatsStack,
  fieldZone,
  isExplosivePlay,
  isSuccessfulPlay,
  mapChartEventToPlayEvent,
  yardLineFromBallOn,
} from '@/utils/stats/engine'
import type { ChartUnit, FieldGoalMetrics, PlayEvent } from '@/utils/stats/types'

type UnitSlug = 'offense' | 'defense' | 'special_teams' | 'all'
type NormalizedUnit = ChartUnit | 'ALL'

const unitLabels: Record<UnitSlug, string> = {
  offense: 'Offense',
  defense: 'Defense',
  special_teams: 'Special Teams',
  all: 'All',
}

const unitAccent: Record<NormalizedUnit, string> = {
  OFFENSE: 'from-emerald-500/80 via-emerald-500/40 to-transparent',
  DEFENSE: 'from-blue-500/80 via-blue-500/40 to-transparent',
  SPECIAL_TEAMS: 'from-amber-500/80 via-amber-500/40 to-transparent',
  ALL: 'from-slate-500/80 via-slate-500/40 to-transparent',
}

const baseSelectColumns = [
  'id',
  'team_id',
  'game_id',
  'game_session_id',
  'sequence',
  'quarter',
  'clock_seconds',
  'down',
  'distance',
  'ball_on',
  'hash_mark',
  'possession',
  'play_call',
  'result',
  'gained_yards',
  'created_at',
  'drive_number',
  'explosive',
  'turnover',
  'play_family',
  'run_concept',
  'wr_concept_id',
  'st_play_type',
  'st_variant',
  'st_return_yards',
  'offensive_personnel_code:offensive_personnel',
  'offensive_formation_id',
  'backfield_code',
  'qb_alignment',
  'front_code:front',
  'defensive_structure_id',
  'coverage_shell_pre',
  'coverage_shell_post:coverage',
  'pressure_code:pressure',
  'strength',
  'tags',
].join(', ')

export default async function GameWorkspacePage({ params }: { params: Promise<{ gameId: string; unit: string }> }) {
  const resolved = await params
  const gameId = resolved?.gameId ?? ''
  const slug = (resolved?.unit ?? '').toLowerCase() as UnitSlug
  const normalizedUnit: NormalizedUnit =
    slug === 'all'
      ? 'ALL'
      : slug === 'offense'
      ? 'OFFENSE'
      : slug === 'defense'
      ? 'DEFENSE'
      : slug === 'special_teams'
      ? 'SPECIAL_TEAMS'
      : (() => {
          notFound()
        })()

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
    console.error('Game workspace profile error:', profileError.message)
  }

  const activeTeamId = profile?.active_team_id as string | null
  if (!activeTeamId) {
    redirect('/onboarding/team')
  }

  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, opponent_name, start_time, home_away, location, season_label, team_id')
    .eq('id', gameId)
    .maybeSingle()

  if (gameError || !game) {
    console.error('Game workspace unable to load game:', gameError?.message)
    notFound()
  }
  if (game.team_id !== activeTeamId) {
    redirect('/games')
  }

  const { data: session, error: sessionError } =
    normalizedUnit === 'ALL'
      ? { data: null, error: null }
      : await supabase
          .from('game_sessions')
          .select('id, unit, status, analyst_user_id, started_at')
          .eq('game_id', game.id)
          .eq('unit', normalizedUnit)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle()

  if (sessionError) {
    console.error('Game workspace session error:', sessionError.message)
  }

  const { data: sessionEventData, error: sessionEventError } =
    session && session.id
      ? await supabase
          .from('chart_events')
          .select(baseSelectColumns)
          .eq('game_session_id', session.id)
          .order('sequence', { ascending: false })
          .limit(60)
      : { data: null, error: null }

  if (sessionEventError) {
    console.error('Game workspace session events error:', sessionEventError.message)
  }

  const { data: allEventData, error: allEventError } = await supabase
    .from('chart_events')
    .select(baseSelectColumns)
    .eq('game_id', game.id)
    .eq('team_id', activeTeamId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (allEventError) {
    console.error('Game workspace all-events error:', allEventError.message)
  }

  const sessionRows = Array.isArray(sessionEventData)
    ? (sessionEventData as unknown[]).filter((row): row is PlayEvent => typeof (row as { id?: unknown }).id === 'string')
    : []
  const allRows = Array.isArray(allEventData)
    ? (allEventData as unknown[]).filter((row): row is PlayEvent => typeof (row as { id?: unknown }).id === 'string')
    : []

  const mappedSessionEvents: PlayEvent[] = sessionRows.map((ev) =>
    mapChartEventToPlayEvent(ev, { teamId: activeTeamId, opponent: game.opponent_name || null })
  )
  const mappedAllEvents: PlayEvent[] = allRows.map((ev) =>
    mapChartEventToPlayEvent(ev, { teamId: activeTeamId, opponent: game.opponent_name || null })
  )

  const nextSequence =
    normalizedUnit === 'ALL' ? 1 : ((mappedSessionEvents[0]?.sequence ?? 0) as number) + 1
  const unitEvents = filterUnitEvents(mappedAllEvents, normalizedUnit)
  const latestAny = mappedAllEvents[0] || null
  const latestUnit = unitEvents[0] || latestAny

  const offenseStats = buildStatsStack({ events: mappedAllEvents, unit: 'OFFENSE', gameId: game.id })
  const defenseStats = buildStatsStack({ events: mappedAllEvents, unit: 'DEFENSE', gameId: game.id })
  const specialStats = buildStatsStack({ events: mappedAllEvents, unit: 'SPECIAL_TEAMS', gameId: game.id })
  const allStats = buildStatsStack({ events: mappedAllEvents, gameId: game.id })
  const currentStats =
    normalizedUnit === 'OFFENSE'
      ? offenseStats
      : normalizedUnit === 'DEFENSE'
      ? defenseStats
      : normalizedUnit === 'SPECIAL_TEAMS'
      ? specialStats
      : allStats

  const lastTwenty = unitEvents.slice(0, 30)
  const timeouts = allStats.timeouts
  const scoreFor = allStats.scoring.pointsFor ?? 0
  const scoreAgainst = allStats.scoring.pointsAllowed ?? 0
  const possessionSide = derivePossession(latestUnit)
  const dictionaries = await loadDictionaryBundle()

  const closeSession = async (formData: FormData) => {
    'use server'
    await closeGameSession(formData)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-400">In-game workspace</p>
            <div className="flex items-center gap-3">
              <span className="text-xl font-semibold">{unitLabels[slug]}</span>
              <span className="text-sm text-slate-300">vs {game.opponent_name || 'Opponent TBD'}</span>
              {session?.status && (
                <Pill label={`Status: ${session.status}`} tone="emerald" icon={<Radio className="h-3 w-3" />} />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
              <span>
                Q{latestAny?.quarter ?? '--'} | {formatClock(latestAny?.clock_seconds)} | {formatPossessionLabel(possessionSide)}
              </span>
              <Separator />
              <span>
                Score {scoreFor} - {scoreAgainst}
              </span>
              <Separator />
              <span>
                TO: {timeouts?.team ?? '—'} / {timeouts?.opponent ?? '—'}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <HeaderControl label="New drive" icon={<ArrowRight className="h-4 w-4" />} />
            <HeaderControl label="End of half" icon={<TimerReset className="h-4 w-4" />} />
            <HeaderControl label="End game" icon={<Flag className="h-4 w-4" />} />
            <CTAButton href="/games" variant="secondary" size="sm">
              Back to games
            </CTAButton>
            {session?.status === 'active' && (
              <form action={closeSession}>
                <input type="hidden" name="sessionId" value={session.id} />
                <CTAButton type="submit" variant="secondary" size="sm">
                  Close session
                </CTAButton>
              </form>
            )}
          </div>
        </div>
        <div className="container mx-auto px-4 pb-3">
          <UnitTabs gameId={game.id} active={slug} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <GlassCard className="space-y-3">
              <SituationalStrip event={latestUnit} scoreFor={scoreFor} scoreAgainst={scoreAgainst} possession={possessionSide} unit={normalizedUnit} />
              <HudRow unit={normalizedUnit} offense={offenseStats} defense={defenseStats} special={specialStats} />
              <SecondaryMetrics unit={normalizedUnit} offense={offenseStats} defense={defenseStats} special={specialStats} />
            </GlassCard>

            {normalizedUnit === 'ALL' ? (
              <GlassCard>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">All-unit overview</h3>
                    <p className="text-sm text-slate-300">Switch to a specific unit to chart plays; this overview stays in sync.</p>
                  </div>
                  <Pill label="Read-only" tone="slate" />
                </div>
              </GlassCard>
            ) : session ? (
              <ChartEventPanel
                sessionId={session.id}
                gameId={game.id}
                teamId={activeTeamId}
                unitLabel={unitLabels[slug]}
                unit={normalizedUnit as ChartUnit}
                initialEvents={mappedSessionEvents}
                nextSequence={nextSequence}
                recordAction={recordChartEvent}
                offenseFormations={dictionaries.offenseFormations}
                offensePersonnel={dictionaries.offensePersonnel}
                backfieldOptions={dictionaries.backfieldOptions}
                backfieldFamilies={dictionaries.backfieldFamilies}
                defenseStructures={dictionaries.defenseStructures}
                wrConcepts={dictionaries.wrConcepts}
                showSidebar={false}
              />
            ) : (
              <GlassCard>
                <EmptyState
                  icon={<ShieldAlert className="h-10 w-10 text-amber-300" />}
                  title={`No ${unitLabels[slug]} session`}
                  description="Start the unit session from Games to begin charting."
                  action={
                    <CTAButton href="/games" variant="primary" size="sm">
                      Go to games
                    </CTAButton>
                  }
                />
              </GlassCard>
            )}
          </div>

          <div className="space-y-4">
            <GlassCard className="space-y-3">
              <div role="region" aria-live="polite" className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Live event feed</h3>
                    <p className="text-sm text-slate-300">Latest {lastTwenty.length} plays in result-first view.</p>
                  </div>
                  <Link href={`/games/${game.id}`} className="text-sm text-cyan-300 underline decoration-dotted underline-offset-4">
                    View full game log
                  </Link>
                </div>
                {lastTwenty.length === 0 ? (
                  <p className="text-sm text-slate-400">No charted plays yet for this unit.</p>
                ) : (
                  <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1" role="list">
                    {lastTwenty.map((ev) => (
                      <EventRow key={ev.id} event={ev} />
                    ))}
                  </div>
                )}
              </div>
            </GlassCard>

            <GlassCard>
              <details className="group" aria-label="Situational analytics">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-100">
                  <span>Situational analytics</span>
                  <span className="text-xs text-slate-400 group-open:hidden">Show</span>
                  <span className="text-xs text-slate-400 hidden group-open:inline">Hide</span>
                </summary>
                <SituationalAnalytics
                  unit={normalizedUnit}
                  events={unitEvents}
                  reference={latestUnit}
                  epaDetail={currentStats.advanced.epa.playsDetail}
                />
              </details>
            </GlassCard>
          </div>
        </div>
      </main>
    </div>
  )
}

function HeaderControl({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-slate-200 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-brand/60"
      aria-label={label}
    >
      {icon}
      {label}
    </button>
  )
}

function UnitTabs({ gameId, active }: { gameId: string; active: UnitSlug }) {
  const tabs: { slug: UnitSlug; label: string }[] = [
    { slug: 'offense', label: 'Offense' },
    { slug: 'defense', label: 'Defense' },
    { slug: 'special_teams', label: 'Special Teams' },
    { slug: 'all', label: 'All' },
  ]
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/5 p-2" role="tablist" aria-label="Units">
      {tabs.map((tab) => {
        const selected = tab.slug === active
        return (
          <Link
            key={tab.slug}
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            href={`/games/${gameId}/chart/${tab.slug}`}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              selected ? 'bg-brand text-black shadow-[0_10px_40px_-15px_rgba(0,0,0,0.8)]' : 'text-slate-200 hover:bg-white/10'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}

function Separator() {
  return <span className="text-slate-700">-</span>
}

function SituationalStrip({
  event,
  scoreFor,
  scoreAgainst,
  possession,
  unit,
}: {
  event: PlayEvent | null
  scoreFor: number
  scoreAgainst: number
  possession: 'TEAM' | 'OPPONENT' | null
  unit: NormalizedUnit
}) {
  const yard = yardLineFromBallOn(event?.ball_on ?? null)
  const zone = fieldZone(yard)
  const diff = scoreFor - scoreAgainst
  const accent = unitAccent[unit]
  return (
    <div className="space-y-3" role="group" aria-label="Situational overview">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-200">
        <Pill label={event?.down ? `${event.down} & ${event.distance ?? '--'}` : 'Down & distance'} tone="slate" />
        <Pill label={`Ball ${event?.ball_on || '--'}`} tone="slate" />
        <Pill label={`Hash ${event?.hash_mark || '--'}`} tone="slate" />
        <Pill label={zone ? zoneLabel(zone) : 'Field zone --'} tone="slate" />
        <Pill label={`Diff ${diff >= 0 ? `+${diff}` : diff}`} tone="emerald" />
        <Pill label={`Possession: ${formatPossessionLabel(possession)}`} tone="cyan" />
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-900/80">
        <div className={`absolute inset-0 bg-gradient-to-r ${accent}`} aria-hidden />
        <div
          className="absolute inset-y-0 w-1 rounded-full bg-white/80"
          style={{ left: `${Math.min(Math.max(yard ?? 50, 0), 100)}%` }}
          aria-label="Ball position"
        />
      </div>
    </div>
  )
}

function HudRow({
  unit,
  offense,
  defense,
  special,
}: {
  unit: NormalizedUnit
  offense: ReturnType<typeof buildStatsStack>
  defense: ReturnType<typeof buildStatsStack>
  special: ReturnType<typeof buildStatsStack>
}) {
  const cards =
    unit === 'OFFENSE'
      ? [
          { label: 'Plays run', value: offense.base.plays.toLocaleString() },
          { label: 'Yards / play', value: offense.box.yardsPerPlay.toFixed(1) },
          { label: 'Success rate', value: pct(offense.box.successRate) },
          { label: 'Explosive rate', value: pct(offense.box.explosiveRate) },
          { label: 'Turnover margin', value: formatMargin(offense.turnovers.margin) },
        ]
      : unit === 'DEFENSE'
      ? [
          { label: 'Plays faced', value: defense.base.plays.toLocaleString() },
          { label: 'Yards allowed/play', value: defense.box.yardsPerPlay.toFixed(1) },
          { label: 'Success rate allowed', value: pct(defense.box.successRate) },
          { label: 'Explosive rate allowed', value: pct(defense.box.explosiveRate) },
          { label: 'Takeaways', value: defense.defense.takeaways.total.toLocaleString() },
        ]
      : unit === 'SPECIAL_TEAMS'
      ? [
          { label: 'Avg start (us)', value: formatFieldPos(special.specialTeams.fieldPosition.offenseStart) },
          { label: 'Avg start (opp)', value: formatFieldPos(special.specialTeams.fieldPosition.defenseStart) },
          { label: 'Net field pos', value: formatFieldPos(special.specialTeams.fieldPosition.netStart) },
          { label: 'Net punting', value: fmtNumber(special.specialTeams.punting.team.net, 1) },
          { label: 'Kicking reliability', value: formatKickingReliability(special.specialTeams.fieldGoals) },
        ]
      : [
          { label: 'Plays', value: offense.base.plays + defense.base.plays + special.base.plays },
          { label: 'Yards/play (off)', value: offense.box.yardsPerPlay.toFixed(1) },
          { label: 'Yards/play (def)', value: defense.box.yardsPerPlay.toFixed(1) },
          { label: 'Turnover margin', value: formatMargin(offense.turnovers.margin) },
          { label: 'Red zone trips', value: offense.redZone.offense.trips },
        ]

  return (
    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" role="list">
      {cards.map((card) => (
        <div
          key={card.label}
          role="listitem"
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-100"
        >
          <div className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-400">{card.label}</div>
          <div className="text-lg font-semibold">{card.value}</div>
        </div>
      ))}
    </div>
  )
}

function SecondaryMetrics({
  unit,
  offense,
  defense,
  special,
}: {
  unit: NormalizedUnit
  offense: ReturnType<typeof buildStatsStack>
  defense: ReturnType<typeof buildStatsStack>
  special: ReturnType<typeof buildStatsStack>
}) {
  if (unit === 'OFFENSE') {
    return (
      <details className="group rounded-xl border border-white/10 bg-slate-900/50 p-3">
        <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-100">
          <span>More offense metrics</span>
          <span className="text-xs text-slate-400 group-open:hidden">Show</span>
          <span className="text-xs text-slate-400 hidden group-open:inline">Hide</span>
        </summary>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <MetricChip label="3rd down" value={formatConversion(offense.box.thirdDown)} />
          <MetricChip label="4th down" value={formatConversion(offense.box.fourthDown)} />
          <MetricChip label="Red zone TDs" value={`${offense.redZone.offense.touchdowns}/${offense.redZone.offense.trips}`} />
          <MetricChip label="Time of possession" value={formatSeconds(offense.boxScore?.team.timeOfPossessionSeconds)} />
          <MetricChip label="Possessions" value={offense.drives.length} />
          <MetricChip label="EPA / play" value={fmtNumber(offense.advanced.epa.byUnit.OFFENSE?.perPlay ?? 0, 2)} />
        </div>
      </details>
    )
  }

  if (unit === 'DEFENSE') {
    return (
      <details className="group rounded-xl border border-white/10 bg-slate-900/50 p-3">
        <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-100">
          <span>More defense metrics</span>
          <span className="text-xs text-slate-400 group-open:hidden">Show</span>
          <span className="text-xs text-slate-400 hidden group-open:inline">Hide</span>
        </summary>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <MetricChip label="3rd down stops" value={formatStop(defense.defense.thirdDown)} />
          <MetricChip label="4th down stops" value={formatStop(defense.defense.fourthDown)} />
          <MetricChip label="Forced 3-and-outs" value={`${defense.defense.drives.threeAndOuts.count} (${pct(defense.defense.drives.threeAndOuts.rate)})`} />
          <MetricChip label="Opp RZ trips/TD/FG" value={`${defense.defense.redZone.trips} | ${defense.defense.redZone.touchdowns} TD | ${defense.defense.redZone.fieldGoals} FG`} />
          <MetricChip label="Points / drive" value={fmtNumber(defense.defense.drives.pointsPerDrive, 2)} />
          <MetricChip label="Points / possession" value={fmtNumber(defense.defense.drives.pointsPerPossession, 2)} />
        </div>
      </details>
    )
  }

  if (unit === 'SPECIAL_TEAMS') {
    return (
      <details className="group rounded-xl border border-white/10 bg-slate-900/50 p-3">
        <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-100">
          <span>More special teams metrics</span>
          <span className="text-xs text-slate-400 group-open:hidden">Show</span>
          <span className="text-xs text-slate-400 hidden group-open:inline">Hide</span>
        </summary>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <MetricChip label="Kickoff coverage avg" value={fmtNumber(special.specialTeams.coverage.kickoff.average, 1)} />
          <MetricChip label="Punt coverage avg" value={fmtNumber(special.specialTeams.coverage.punt.average, 1)} />
          <MetricChip label="Return avg (KO/P)" value={`${fmtNumber(special.specialTeams.kickoffReturns.team.average, 1)} / ${fmtNumber(special.specialTeams.puntReturns.team.average, 1)}`} />
          <MetricChip label="Touchback rate" value={pct(special.specialTeams.kickoff.touchbackPct)} />
          <MetricChip label="FG % by band" value={`<30: ${pct(special.specialTeams.fieldGoals.bands.inside30.pct)} | 30-39: ${pct(special.specialTeams.fieldGoals.bands.from30to39.pct)} | 40-49: ${pct(special.specialTeams.fieldGoals.bands.from40to49.pct)}`} />
          <MetricChip label="Longest FG" value={special.specialTeams.fieldGoals.longestMade ?? '--'} />
        </div>
      </details>
    )
  }

  return null
}

function MetricChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">
      <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  )
}

function EventRow({ event }: { event: PlayEvent }) {
  const badgeLabel = formatResultBadge(event)
  const tags = buildTags(event)
  const zone = fieldZone(yardLineFromBallOn(event.ball_on))
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 shadow-lg" role="listitem" aria-label={`Sequence ${event.sequence ?? '--'} result ${event.result ?? 'TBD'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 font-semibold text-slate-100">
          {badgeLabel}
        </span>
        <span className="tabular-nums">
          Q{event.quarter ?? '--'} | {formatClock(event.clock_seconds)} | {event.down ? `${event.down} & ${event.distance ?? '--'}` : '--'}
        </span>
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-100">{event.play_call || 'Play call TBD'}</div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.8rem] text-slate-300">
        <span>{event.result || 'Result TBD'}</span>
        <span className="text-slate-500">|</span>
        <span className="tabular-nums">Yards {formatSigned(event.gained_yards)}</span>
        <span className="text-slate-500">|</span>
        <span>
          Field {event.ball_on ?? '--'} {zone ? `(${zoneLabel(zone)})` : ''}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        {tags.map((tag) => (
          <span key={tag} className="rounded-full bg-white/5 px-2 py-1">
            {tag}
          </span>
        ))}
      </div>
    </article>
  )
}

function SituationalAnalytics({
  unit,
  events,
  reference,
  epaDetail,
}: {
  unit: NormalizedUnit
  events: PlayEvent[]
  reference: PlayEvent | null
  epaDetail: Record<string, { adjusted: number }> | undefined
}) {
  if (!reference) {
    return <p className="text-sm text-slate-400">No reference play yet.</p>
  }
  const bucket = bucketDownDistance(reference.down, reference.distance)
  const zone = fieldZone(yardLineFromBallOn(reference.ball_on))
  const filtered = events.filter(
    (ev) => bucketDownDistance(ev.down, ev.distance) === bucket && fieldZone(yardLineFromBallOn(ev.ball_on)) === zone
  )
  const familyStats = summarizeByFamily(filtered, epaDetail)
  const conceptStats = summarizeByConcept(filtered, epaDetail)

  if (unit === 'ALL') {
    return <p className="text-sm text-slate-300">Switch to a unit to see situational analytics.</p>
  }

  return (
    <div className="mt-3 space-y-3 text-sm text-slate-200">
      <p className="text-slate-300">
        {bucket} | {zone ? zoneLabel(zone) : 'Field'} | {filtered.length} plays in sample
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400">Mix</p>
          {familyStats.length === 0 ? (
            <p className="text-slate-300">No sample yet.</p>
          ) : (
            <ul className="space-y-1">
              {familyStats.map((row) => (
                <li key={row.label} className="flex justify-between">
                  <span>{row.label}</span>
                  <span>
                    SR {pct(row.successRate)} | XR {pct(row.explosiveRate)} | EPA {fmtNumber(row.epaPerPlay, 2)} | {row.plays} plays
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400">Top concepts (success / EPA / YPP)</p>
          {conceptStats.length === 0 ? (
            <p className="text-slate-300">No sample yet.</p>
          ) : (
            <ul className="space-y-1">
              {conceptStats.slice(0, 4).map((row) => (
                <li key={row.label} className="flex justify-between">
                  <span>{row.label}</span>
                  <span>
                    SR {pct(row.successRate)} | EPA {fmtNumber(row.epaPerPlay, 2)} | {fmtNumber(row.ypp, 1)} ypp | {row.plays} plays
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function summarizeByFamily(events: PlayEvent[], epaDetail: Record<string, { adjusted: number }> | undefined) {
  const map = new Map<string, { plays: number; success: number; explosive: number; yards: number; epa: number }>()
  events.forEach((ev) => {
    const key = ev.play_family || 'UNKNOWN'
    const entry = map.get(key) || { plays: 0, success: 0, explosive: 0, yards: 0, epa: 0 }
    entry.plays += 1
    if (isSuccessfulPlay(ev)) entry.success += 1
    if (isExplosivePlay(ev)) entry.explosive += 1
    entry.yards += ev.gained_yards ?? 0
    entry.epa += epaDetail?.[ev.id]?.adjusted ?? 0
    map.set(key, entry)
  })
  return Array.from(map.entries()).map(([label, stats]) => ({
    label,
    plays: stats.plays,
    successRate: stats.plays ? stats.success / stats.plays : 0,
    explosiveRate: stats.plays ? stats.explosive / stats.plays : 0,
    epaPerPlay: stats.plays ? stats.epa / stats.plays : 0,
    ypp: stats.plays ? stats.yards / stats.plays : 0,
  }))
}

function summarizeByConcept(events: PlayEvent[], epaDetail: Record<string, { adjusted: number }> | undefined) {
  const map = new Map<string, { plays: number; success: number; explosive: number; yards: number; epa: number }>()
  events.forEach((ev) => {
    const key = ev.run_concept || ev.wr_concept_id || ev.play_call || 'Concept'
    const entry = map.get(key) || { plays: 0, success: 0, explosive: 0, yards: 0, epa: 0 }
    entry.plays += 1
    if (isSuccessfulPlay(ev)) entry.success += 1
    if (isExplosivePlay(ev)) entry.explosive += 1
    entry.yards += ev.gained_yards ?? 0
    entry.epa += epaDetail?.[ev.id]?.adjusted ?? 0
    map.set(key, entry)
  })
  return Array.from(map.entries())
    .map(([label, stats]) => ({
      label,
      plays: stats.plays,
      successRate: stats.plays ? stats.success / stats.plays : 0,
      explosiveRate: stats.plays ? stats.explosive / stats.plays : 0,
      epaPerPlay: stats.plays ? stats.epa / stats.plays : 0,
      ypp: stats.plays ? stats.yards / stats.plays : 0,
    }))
    .sort((a, b) => b.successRate - a.successRate)
}

function filterUnitEvents(events: PlayEvent[], unit: NormalizedUnit) {
  if (unit === 'ALL') return events
  if (unit === 'OFFENSE') return events.filter((ev) => deriveSide(ev) === 'OFFENSE')
  if (unit === 'DEFENSE') return events.filter((ev) => deriveSide(ev) === 'DEFENSE')
  return events.filter((ev) => deriveSide(ev) === 'SPECIAL_TEAMS')
}

function deriveSide(ev: PlayEvent): ChartUnit {
  if (ev.play_family === 'SPECIAL_TEAMS' || ev.possession === 'SPECIAL_TEAMS') return 'SPECIAL_TEAMS'
  if (ev.possession === 'OFFENSE' || ev.possession === 'DEFENSE') return ev.possession
  if (ev.possession_team_id && ev.team_id) {
    return ev.possession_team_id === ev.team_id ? 'OFFENSE' : 'DEFENSE'
  }
  return 'OFFENSE'
}

function derivePossession(ev: PlayEvent | null): 'TEAM' | 'OPPONENT' | null {
  if (!ev) return null
  const side = deriveSide(ev)
  if (side === 'OFFENSE') return 'TEAM'
  if (side === 'DEFENSE') return 'OPPONENT'
  return null
}

function formatClock(seconds: number | null | undefined) {
  if (seconds == null) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function formatPossessionLabel(value: 'TEAM' | 'OPPONENT' | null) {
  if (value === 'TEAM') return 'We have ball'
  if (value === 'OPPONENT') return 'Opponent ball'
  return 'Possession TBD'
}

function zoneLabel(zone: ReturnType<typeof fieldZone>) {
  switch (zone) {
    case 'BACKED_UP':
      return 'Backed up'
    case 'COMING_OUT':
      return 'Coming out'
    case 'OPEN_FIELD':
      return 'Open field'
    case 'SCORING_RANGE':
      return 'Scoring range'
    case 'RED_ZONE':
      return 'Red zone'
    default:
      return 'Field'
  }
}

function formatResultBadge(event: PlayEvent) {
  const yards = formatSigned(event.gained_yards)
  const result = event.result || 'Result'
  return `${yards} ${result}`.trim()
}

function formatSigned(value: number | null | undefined) {
  if (value == null) return '--'
  if (value > 0) return `+${value}`
  if (value === 0) return '0'
  return `${value}`
}

function buildTags(event: PlayEvent): string[] {
  const tags: string[] = []
  if (isExplosivePlay(event)) tags.push('Explosive')
  if (event.turnover) tags.push('Turnover')
  if (event.down === 3) tags.push('3rd down')
  if (event.down === 4) tags.push('4th down')
  const zone = fieldZone(yardLineFromBallOn(event.ball_on))
  if (zone === 'RED_ZONE' || zone === 'SCORING_RANGE') tags.push('Red zone')
  if (event.st_play_type) tags.push(event.st_play_type.replace('_', ' '))
  return tags
}

function pct(value: number) {
  return `${Math.round((value || 0) * 100)}%`
}

function formatMargin(value: number) {
  return value > 0 ? `+${value}` : value.toString()
}

function formatConversion(conv: { attempts: number; conversions: number }) {
  if (!conv.attempts) return '--'
  const rate = (conv as { rate?: number }).rate ?? (conv.conversions ? conv.conversions / conv.attempts : 0)
  return `${conv.conversions}/${conv.attempts} (${pct(rate)})`
}

function formatStop(conv: { attempts: number; stops: number; stopRate?: number }) {
  if (!conv.attempts) return '--'
  const rate = conv.stopRate ?? (conv.stops ? conv.stops / conv.attempts : 0)
  return `${conv.stops}/${conv.attempts} (${pct(rate)})`
}

function formatSeconds(value?: number | null) {
  if (value == null) return '--'
  const minutes = Math.floor(value / 60)
  const seconds = value % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function fmtNumber(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) return '--'
  return value.toFixed(digits)
}

function formatFieldPos(value: number | null | undefined) {
  if (value == null) return '--'
  return value >= 50 ? `Opp ${Math.round(100 - value)}` : `Own ${Math.round(value)}`
}

function formatKickingReliability(fieldGoals: FieldGoalMetrics) {
  const fg = pct(fieldGoals.overall.pct)
  const xp = pct(fieldGoals.extraPoint.pct)
  return `${fg} FG | ${xp} XP`
}
