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
import { buildLocalNumericSummary, getAiTendenciesAndNextCall } from '@/utils/ai/getTendencies'
import {
  buildTendencyLens,
  buildStatsStack,
  mapChartEventToPlayEvent,
  sumYards,
  yardLineFromBallOn,
} from '@/utils/stats/engine'
import type { PlayEvent } from '@/utils/stats/types'

type GameRow = {
  id: string
  opponent_name: string | null
  start_time: string | null
  home_away: string | null
  location: string | null
  season_label: string | null
  team_id: string
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
      [
        'id',
        'team_id',
        'game_id',
        'sequence',
        'quarter',
        'clock_seconds',
        'down',
        'distance',
        'ball_on',
        'hash_mark',
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
    )
    .eq('game_session_id', session.id)
    .order('sequence', { ascending: false })
    .limit(25)

  if (eventError) {
    console.error('Chart page events error:', eventError.message)
  }

  const rawEvents: PlayEvent[] = (eventData as PlayEvent[] | null) ?? []
  const events: PlayEvent[] = rawEvents.map((ev) =>
    mapChartEventToPlayEvent(ev, { teamId: activeTeamId, opponent: game.opponent_name || null })
  )
  const nextSequence = (events[0]?.sequence ?? 0) + 1
  const unitLabel = unitLabels[normalizedUnit.toLowerCase()] || normalizedUnit.replace('_', ' ')
  const statsStack = buildStatsStack({ events, unit: normalizedUnit })
  const { base: baseCounts, box } = statsStack
  const totalPlays = baseCounts.plays
  const totalYards = baseCounts.totalYards
  const explosives = baseCounts.explosives
  const turnovers = baseCounts.turnovers
  const ypp = box.yardsPerPlay
  const currentDrive = events[0]?.drive_number ?? null
  const lastResult = events[0]?.result || '--'
  const successRate = box.successRate
  const explosiveRate = box.explosiveRate
  const lateDownAttempts = box.lateDown.attempts
  const lateDownConversions = box.lateDown.conversions
  const lateDownRate = box.lateDown.rate
  const currentDriveEvents = currentDrive ? events.filter((ev) => ev.drive_number === currentDrive) : []
  const currentDriveYards = sumYards(currentDriveEvents)
  const lastThreeYards = sumYards(events.slice(0, 3))
  const scoringPlays = baseCounts.scoringPlays
  const lens = buildTendencyLens(events, normalizedUnit)
  const numericSummary = buildLocalNumericSummary(normalizedUnit, events)
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
              lateDownAttempts > 0
                ? `${lateDownConversions}/${lateDownAttempts} (${Math.round(lateDownRate * 100)}%)`
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
          teamId={activeTeamId}
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
