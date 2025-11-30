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
      'id, sequence, quarter, clock_seconds, down, distance, ball_on, play_call, result, gained_yards, created_at, drive_number, play_family, explosive, turnover'
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

      <GlassCard>
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
