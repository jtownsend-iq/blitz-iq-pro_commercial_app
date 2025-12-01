import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { Radio, ShieldAlert } from 'lucide-react'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { closeGameSession, recordChartEvent } from '../../../chart-actions'
import { ChartEventPanel } from './ChartEventPanel'
import { loadDictionaryBundle } from '@/lib/dictionaries'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { GlassCard } from '@/components/ui/GlassCard'
import { StatBadge } from '@/components/ui/StatBadge'
import { Pill } from '@/components/ui/Pill'
import { CTAButton } from '@/components/ui/CTAButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { buildNumericSummary, getAiTendenciesAndNextCall } from '@/utils/ai/getTendencies'

type GameRow = {
  id: string
  opponent_name: string | null
  start_time: string | null
  home_away: string | null
  location: string | null
  season_label: string | null
  team_id: string
}

type EventRow = {
  id: string
  sequence: number
  quarter: number | null
  clock_seconds: number | null
  down: number | null
  distance: number | null
  ball_on: string | null
  play_call: string | null
  result: string | null
  gained_yards: number | null
  created_at: string | null
  play_family?: 'RUN' | 'PASS' | 'RPO' | 'SPECIAL_TEAMS' | null
  run_concept?: string | null
  wr_concept_id?: string | null
  st_play_type?: string | null
  st_variant?: string | null
  offensive_personnel_code?: string | null
  offensive_formation_id?: string | null
  backfield_code?: string | null
  front_code?: string | null
  defensive_structure_id?: string | null
  coverage_shell_pre?: string | null
  coverage_shell_post?: string | null
  pressure_code?: string | null
  drive_number?: number | null
  explosive?: boolean | null
  turnover?: boolean | null
}

const unitLabels: Record<string, string> = {
  offense: 'Offense',
  defense: 'Defense',
  special_teams: 'Special Teams',
}

export default async function ChartUnitPage({
  params,
}: {
  params: Promise<{ gameId: string; unit: string }>
}) {
  const resolved = await params
  const { gameId, unit } = resolved || { gameId: '', unit: '' }
  const normalizedUnit = unit?.toUpperCase() as 'OFFENSE' | 'DEFENSE' | 'SPECIAL_TEAMS'
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
    console.error('Chart page profile error:', profileError.message)
  }

  const activeTeamId = profile?.active_team_id as string | null

  if (!activeTeamId) {
    redirect('/onboarding/team')
  }

  if (!['OFFENSE', 'DEFENSE', 'SPECIAL_TEAMS'].includes(normalizedUnit)) {
    notFound()
  }

  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, opponent_name, start_time, home_away, location, season_label, team_id')
    .eq('id', gameId)
    .maybeSingle()

  if (gameError || !game) {
    console.error('Chart page unable to load game:', gameError?.message)
    notFound()
  }

  if (game.team_id !== activeTeamId) {
    redirect('/games')
  }

  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .select('id, unit, status, analyst_user_id, started_at')
    .eq('game_id', game.id)
    .eq('unit', normalizedUnit)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (sessionError) {
    console.error('Chart page session error:', sessionError.message)
  }

  if (!session) {
    return (
      <section className="space-y-4">
        <p className="text-sm text-slate-400">
          No {unitLabels[normalizedUnit.toLowerCase()] || normalizedUnit} session exists for this game. Start
          one from{' '}
          <Link href="/games" className="text-brand underline">
            the games page
          </Link>{' '}
          first.
        </p>
      </section>
    )
  }

  const { data: eventData, error: eventError } = await supabase
    .from('chart_events')
    .select(
      'id, sequence, quarter, clock_seconds, down, distance, ball_on, play_call, result, gained_yards, created_at, drive_number, explosive, turnover, offensive_personnel_code:offensive_personnel, front_code:front, coverage_shell_post:coverage, pressure_code:pressure'
    )
    .eq('game_session_id', session.id)
    .order('sequence', { ascending: false })
    .limit(25)

  if (eventError) {
    console.error('Chart page events error:', eventError.message)
  }

  const events: EventRow[] = (eventData as EventRow[] | null) ?? []
  const nextSequence = (events[0]?.sequence ?? 0) + 1
  const unitLabel = unitLabels[normalizedUnit.toLowerCase()] || normalizedUnit.replace('_', ' ')
  const totalPlays = events.length
  const totalYards = events.reduce((sum, ev) => sum + (ev.gained_yards ?? 0), 0)
  const explosives = events.filter((ev) => ev.explosive || (ev.gained_yards ?? 0) >= 20).length
  const turnovers = events.filter((ev) => ev.turnover || (ev.result || '').toLowerCase().includes('int') || (ev.result || '').toLowerCase().includes('fumble')).length
  const ypp = totalPlays > 0 ? totalYards / totalPlays : 0
  const currentDrive = events[0]?.drive_number ?? null
  const lastResult = events[0]?.result || '--'
  const eventsWithContext = events.filter((ev) => ev.down != null && ev.distance != null && ev.gained_yards != null)
  const successPlays = eventsWithContext.filter((ev) => isSuccessful(ev))
  const successRate = eventsWithContext.length > 0 ? successPlays.length / eventsWithContext.length : 0
  const explosiveRate = totalPlays > 0 ? explosives / totalPlays : 0
  const lateDownAttempts = eventsWithContext.filter((ev) => (ev.down ?? 0) >= 3)
  const lateDownConversions = lateDownAttempts.filter(
    (ev) => (ev.gained_yards ?? 0) >= (ev.distance ?? Number.POSITIVE_INFINITY)
  )
  const lateDownRate = lateDownAttempts.length > 0 ? lateDownConversions.length / lateDownAttempts.length : 0
  const currentDriveEvents = currentDrive ? events.filter((ev) => ev.drive_number === currentDrive) : []
  const currentDriveYards = sumYards(currentDriveEvents)
  const lastThreeYards = sumYards(events.slice(0, 3))
  const scoringPlays = events.filter((ev) => isScoringPlay(ev.result)).length
  const lens = buildTendencyLens(events, normalizedUnit)
  const numericSummary = buildNumericSummary(normalizedUnit, events)
  const aiResult = await getAiTendenciesAndNextCall({
    unit: normalizedUnit,
    events,
    numericSummary,
    situation: {
      down: events[0]?.down,
      distance: events[0]?.distance,
      yardLine: yardLineFromBallOn(events[0]?.ball_on || null),
      hash: null,
      drive: events[0]?.drive_number ?? null,
      series: null,
    },
    fallback: {
      summary: lens.summary,
      recommendations: lens.options.map((opt) => ({
        label: opt.label,
        rationale: opt.note || '',
        successProbability: Math.round(opt.success * 100),
        statLine: `Success ${Math.round(opt.success * 100)}% | Explosive ${Math.round(opt.explosive * 100)}%`,
      })),
      source: 'fallback',
    },
  })

  const closeSession = async (formData: FormData) => {
    'use server'
    await closeGameSession(formData)
  }

  const dictionaries = await loadDictionaryBundle()

  return (
    <section className="container space-y-8 py-8">
      <SectionHeader
        eyebrow={game.season_label || 'Season'}
        title={`${unitLabel} Chart | ${game.opponent_name || 'Opponent'}`}
        description={`${formatKickoffLabel(game)} | Session started ${formatDate(session.started_at)}`}
        badge="Command Center"
        actions={
          <div className="flex flex-wrap gap-2">
            <CTAButton href="/games" variant="secondary" size="sm">
              Back to games
            </CTAButton>
            {session.status === 'active' && (
              <form action={closeSession}>
                <input type="hidden" name="sessionId" value={session.id} />
                <CTAButton type="submit" variant="secondary" size="sm">
                  Close session
                </CTAButton>
              </form>
            )}
            <Pill label={`Status: ${session.status.toUpperCase()}`} tone="emerald" icon={<Radio className="h-3 w-3" />} />
          </div>
        }
      />

      <GlassCard className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <StatBadge label="Plays" value={totalPlays} tone="cyan" />
          <StatBadge label="Yards / YPP" value={`${totalYards} / ${ypp.toFixed(1)}`} tone="emerald" />
          <StatBadge label="Explosives" value={explosives} tone="amber" />
          <StatBadge label="Turnovers" value={turnovers} tone="slate" />
          <StatBadge label="Drive" value={currentDrive ?? '--'} tone="slate" />
          <StatBadge label="Last result" value={lastResult || '--'} tone="slate" />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <StatBadge label="Success rate" value={`${Math.round(successRate * 100)}%`} tone="emerald" />
          <StatBadge
            label="Explosive rate"
            value={totalPlays > 0 ? `${explosives}/${totalPlays} (${Math.round(explosiveRate * 100)}%)` : '--'}
            tone="amber"
          />
          <StatBadge
            label="Late-down conv."
            value={
              lateDownAttempts.length > 0
                ? `${lateDownConversions.length}/${lateDownAttempts.length} (${Math.round(lateDownRate * 100)}%)`
                : '--'
            }
            tone="cyan"
          />
          <StatBadge
            label="Current drive load"
            value={
              currentDrive
                ? `${currentDrive} | ${currentDriveEvents.length} plays / ${currentDriveYards} yds`
                : '--'
            }
            tone="slate"
          />
          <StatBadge label="Last 3 plays" value={lastThreeYards === 0 ? '0 yds' : `${lastThreeYards} yds`} tone="slate" />
          <StatBadge label="Scoring plays" value={scoringPlays} tone="emerald" />
        </div>
      </GlassCard>

      <GlassCard className="space-y-4" tone="neutral">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">Tendency lens</h3>
          <Pill label={unitLabel} tone="emerald" />
        </div>
        <p className="text-sm text-slate-200">{lens.summary}</p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {lens.options.map((opt) => (
            <div
              key={opt.label}
              className="rounded-2xl border border-slate-900/60 bg-surface-muted p-3 text-sm text-slate-100"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{opt.label}</span>
                <span className="text-xs text-slate-400">{opt.sample} plays</span>
              </div>
              <div className="text-xs text-slate-300">
                Success {Math.round(opt.success * 100)}% | Explosive {Math.round(opt.explosive * 100)}%
              </div>
              {opt.note && <div className="text-[0.7rem] text-slate-400 mt-1">{opt.note}</div>}
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">AI Analyst</h3>
            <p className="text-sm text-slate-300">Situation-aware suggestions for this unit.</p>
          </div>
          <Pill label={aiResult.source === 'openai' ? 'AI' : 'Local'} tone="emerald" />
        </div>
        <p className="text-sm text-slate-100">{aiResult.summary}</p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {aiResult.recommendations.slice(0, 3).map((rec) => (
            <div key={rec.label} className="rounded-2xl border border-slate-900/60 bg-surface-muted p-3 text-sm text-slate-100">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{rec.label}</span>
                <span className="text-xs text-slate-400">{Math.round(rec.successProbability)}% est.</span>
              </div>
              <div className="text-xs text-slate-300">{rec.statLine}</div>
              {rec.rationale && <div className="text-[0.7rem] text-slate-400 mt-1">{rec.rationale}</div>}
            </div>
          ))}
        </div>
      </GlassCard>

      {session.status !== 'active' ? (
        <EmptyState
          icon={<ShieldAlert className="h-10 w-10 text-amber-300" />}
          title="This session is closed"
          description="Restart from Games to continue logging plays."
          action={<CTAButton href="/games" variant="primary" size="sm">Go to games</CTAButton>}
        />
      ) : (
        <ChartEventPanel
          sessionId={session.id}
          gameId={game.id}
          unitLabel={unitLabel}
          unit={normalizedUnit}
          initialEvents={events}
          nextSequence={nextSequence}
          recordAction={recordChartEvent}
          offenseFormations={dictionaries.offenseFormations}
          offensePersonnel={dictionaries.offensePersonnel}
          backfieldOptions={dictionaries.backfieldOptions}
          backfieldFamilies={dictionaries.backfieldFamilies}
          defenseStructures={dictionaries.defenseStructures}
          wrConcepts={dictionaries.wrConcepts}
        />
      )}
    </section>
  )
}

function isSuccessful(ev: EventRow) {
  if (ev.down == null || ev.distance == null || ev.gained_yards == null) return false
  if (ev.down === 1) return ev.gained_yards >= ev.distance * 0.5
  if (ev.down === 2) return ev.gained_yards >= ev.distance * 0.7
  return ev.gained_yards >= ev.distance
}

function sumYards(list: EventRow[]) {
  return list.reduce((sum, ev) => sum + (ev.gained_yards ?? 0), 0)
}

function isScoringPlay(result: string | null) {
  if (!result) return false
  const normalized = result.toLowerCase()
  return normalized.includes('td') || normalized.includes('touchdown') || normalized.includes('fg') || normalized.includes('field goal')
}

type TendencyOption = {
  label: string
  success: number
  explosive: number
  sample: number
  note?: string
}

function buildTendencyLens(events: EventRow[], unit: 'OFFENSE' | 'DEFENSE' | 'SPECIAL_TEAMS') {
  if (events.length === 0) {
    return { summary: 'No charted plays yet to build tendencies.', options: [] as TendencyOption[] }
  }
  const current = events[0]
  const downBucket = bucketDownDistance(current.down, current.distance)
  const yardLine = yardLineFromBallOn(current.ball_on)
  const zone = fieldZone(yardLine)
  const driveLabel = current.drive_number ? `Drive ${current.drive_number}` : 'current drive'
  const filtered = events.filter((ev) => bucketDownDistance(ev.down, ev.distance) === downBucket)

  if (unit === 'OFFENSE') {
    const familyStats = aggregateByKey(filtered, (ev) => ev.play_family || 'UNKNOWN')
    const conceptStats = aggregateByKey(
      filtered,
      (ev) => ev.run_concept || ev.wr_concept_id || ev.play_call || ev.play_family || 'Concept'
    )
    const bestConcepts = topOptions(conceptStats)
    const bestFamily = topOptions(familyStats)[0]
    const summary = bestFamily
      ? `On ${downBucket} in ${driveLabel}, ${prettyLabel(bestFamily.label)} has led the way: ${pct(
          bestFamily.success
        )}% success, ${pct(bestFamily.explosive)}% explosive. In ${zone} field position, stay with ${prettyLabel(
          bestConcepts[0]?.label || bestFamily.label
        )}.`
      : `On ${downBucket} tonight, stay with your top concepts in this field zone (${zone}).`
    return { summary, options: bestConcepts.slice(0, 3) }
  }

  if (unit === 'DEFENSE') {
    const coverageStats = aggregateByKey(filtered, (ev) => ev.coverage_shell_post || ev.coverage_shell_pre || 'Coverage')
    const frontStats = aggregateByKey(filtered, (ev) => ev.front_code || 'Front')
    const bestCoverage = topOptions(coverageStats)[0]
    const bestFront = topOptions(frontStats)[0]
    const summary = `On ${downBucket} looks, ${prettyLabel(bestCoverage?.label || 'coverage')} with ${prettyLabel(
      bestFront?.label || 'front'
    )} has limited explosives to ${pct(bestCoverage?.explosive ?? 0)}%. Consider mixing those to cap yards.`
    const options = topOptions([...coverageStats.slice(0, 3), ...frontStats.slice(0, 3)]).slice(0, 3)
    return { summary, options }
  }

  const stStats = aggregateByKey(filtered, (ev) => ev.st_play_type || 'ST call')
  const bestSt = topOptions(stStats)
  const summary = `In ${zone} field position, your best ST outcomes have come from ${prettyLabel(
    bestSt[0]?.label || 'this call'
  )} with avg net ${yppFromStats(bestSt[0])} yds.`
  return { summary, options: bestSt.slice(0, 3) }
}

function aggregateByKey(list: EventRow[], keyFn: (ev: EventRow) => string | null | undefined) {
  const map = new Map<
    string,
    { success: number; explosive: number; sample: number; yards: number }
  >()
  list.forEach((ev) => {
    const key = keyFn(ev)
    if (!key) return
    const bucket = map.get(key) || { success: 0, explosive: 0, sample: 0, yards: 0 }
    bucket.sample += 1
    bucket.success += isSuccessful(ev) ? 1 : 0
    bucket.explosive += isExplosive(ev) ? 1 : 0
    bucket.yards += ev.gained_yards ?? 0
    map.set(key, bucket)
  })
  return Array.from(map.entries()).map(([label, stats]) => ({
    label,
    success: stats.sample ? stats.success / stats.sample : 0,
    explosive: stats.sample ? stats.explosive / stats.sample : 0,
    sample: stats.sample,
    note: `YPP ${stats.sample ? (stats.yards / stats.sample).toFixed(1) : '0.0'}`,
  }))
}

function topOptions(options: TendencyOption[]) {
  return options
    .filter((opt) => opt.sample > 0)
    .sort((a, b) => b.success - a.success || b.sample - a.sample)
}

function bucketDownDistance(down?: number | null, distance?: number | null) {
  if (!down || !distance) return 'any down'
  if (distance <= 2) return `short ${ordinal(down)}`
  if (distance <= 6) return `medium ${ordinal(down)}`
  return `long ${ordinal(down)}`
}

function ordinal(n: number) {
  const suffix = ['th', 'st', 'nd', 'rd'][((n + 90) % 100 - 10) % 10] || 'th'
  return `${n}${suffix}`
}

function pct(n: number) {
  return Math.round(n * 100)
}

function prettyLabel(label: string) {
  return label.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function yardLineFromBallOn(ball_on: string | null) {
  if (!ball_on) return 50
  const num = Number(ball_on.replace(/[^0-9]/g, ''))
  if (Number.isNaN(num)) return 50
  if (ball_on.toUpperCase().startsWith('O')) {
    return num
  }
  if (ball_on.toUpperCase().startsWith('D') || ball_on.toUpperCase().startsWith('X')) {
    return 100 - num
  }
  return num
}

function fieldZone(yardLine: number) {
  if (yardLine <= 20) return 'backed up'
  if (yardLine <= 40) return 'coming out'
  if (yardLine <= 60) return 'midfield'
  if (yardLine <= 80) return 'fringe'
  return 'red zone'
}

function isExplosive(ev: EventRow) {
  return Boolean(ev.explosive) || (ev.gained_yards ?? 0) >= 20
}

function yppFromStats(opt?: TendencyOption) {
  if (!opt?.note) return '--'
  return opt.note.replace('YPP ', '')
}

function formatKickoffLabel(game: GameRow) {
  const kickoff = formatDate(game.start_time)
  const status = game.home_away ? game.home_away.toUpperCase() : 'TBD'
  return `${kickoff} | ${status} | ${game.location || 'Venue TBD'}`
}

function formatDate(value: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}
