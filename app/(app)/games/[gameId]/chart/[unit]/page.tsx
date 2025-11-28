import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { closeGameSession, recordChartEvent } from '../../../chart-actions'
import { ChartEventPanel } from './ChartEventPanel'
import { loadDictionaryBundle } from '@/lib/dictionaries'

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
      'id, sequence, quarter, clock_seconds, down, distance, ball_on, play_call, result, gained_yards, created_at, drive_number, explosive, turnover'
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

  const closeSession = async (formData: FormData) => {
    'use server'
    await closeGameSession(formData)
  }

  const dictionaries = await loadDictionaryBundle()

  return (
    <section className="space-y-8">
      <header className="flex flex-col gap-3 rounded-3xl border border-slate-900/60 bg-surface-raised/70 p-6">
        <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
          {game.season_label || 'Season'}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-3xl font-bold text-slate-50">
            {unitLabel} Chart | {game.opponent_name || 'Opponent'}
          </h1>
          <span className="rounded-full border border-slate-800 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">
            Session {session.status.toUpperCase()}
          </span>
        </div>
        <p className="text-sm text-slate-400">
          {formatKickoffLabel(game)} | Session started {formatDate(session.started_at)}
        </p>
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          <Link href="/games" className="text-brand underline">
            Back to games
          </Link>
          {session.status === 'active' && (
            <form action={closeSession}>
              <input type="hidden" name="sessionId" value={session.id} />
              <button className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:border-slate-400">
                Close session
              </button>
            </form>
          )}
        </div>
      </header>

      <div className="rounded-3xl border border-slate-900/70 bg-slate-900/50 p-4 text-slate-50">
        <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-6 text-sm md:divide-x md:divide-slate-800">
          <div className="px-1 md:px-3">
            <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-300">Plays</div>
            <div className="text-2xl font-semibold text-slate-50">{totalPlays}</div>
          </div>
          <div className="px-1 md:px-3">
            <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-300">Yards / YPP</div>
            <div className="text-2xl font-semibold text-slate-50">
              {totalYards} / {ypp.toFixed(1)}
            </div>
          </div>
          <div className="px-1 md:px-3">
            <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-300">Explosives</div>
            <div className="text-2xl font-semibold text-slate-50">{explosives}</div>
          </div>
          <div className="px-1 md:px-3">
            <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-300">Turnovers</div>
            <div className="text-2xl font-semibold text-slate-50">{turnovers}</div>
          </div>
          <div className="px-1 md:px-3">
            <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-300">Drive</div>
            <div className="text-2xl font-semibold text-slate-50">{currentDrive ?? '--'}</div>
          </div>
          <div className="px-1 md:px-3">
            <div className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-300">Last result</div>
            <div className="text-2xl font-semibold text-slate-50 truncate">{lastResult}</div>
          </div>
        </div>
      </div>

      {session.status !== 'active' ? (
        <p className="text-sm text-slate-400">
          This session is closed. Restart it from the games page to log more plays.
        </p>
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
