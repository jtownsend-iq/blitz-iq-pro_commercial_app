import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { DEFAULT_TIMEZONE } from '@/utils/timezone'
import PlayerGrid from '@/components/players/PlayerGrid'

export default async function PlayersPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('active_team_id')
    .eq('id', user.id)
    .maybeSingle()

  const activeTeamId = profile?.active_team_id as string | null

  if (profileError) {
    console.error('Error fetching profile:', profileError.message)
  }

  if (!activeTeamId) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 text-sm text-amber-100">
          Select or activate a team in Settings before managing players.
        </div>
      </main>
    )
  }

  const { data: membership, error: membershipError } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('team_id', activeTeamId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (membershipError) {
    console.error('Error verifying membership:', membershipError.message)
  }

  if (!membership) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-100">
          You do not have access to this team. Please switch to a team you belong to.
        </div>
      </main>
    )
  }

  const { data: players, error } = await supabase
    .from('players')
    .select(
      [
        'id',
        'first_name',
        'last_name',
        'jersey_number',
        'position',
        'unit',
        'class_year',
        'status',
        'status_reason',
        'return_target_date',
        'pitch_count',
        'packages',
        'scout_team',
        'tags',
      ].join(',')
    )
    .eq('team_id', activeTeamId)
    .order('last_name', { ascending: true })

  if (error) {
    console.error('Error fetching players:', error.message)
    return (
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-100">
          We could not load players right now. Please retry or contact support if this persists.
        </div>
      </main>
    )
  }

  const { data: notes, error: notesError } = await supabase
    .from('player_notes')
    .select('id, player_id, body, tags, created_at')
    .eq('team_id', activeTeamId)
    .order('created_at', { ascending: false })

  const { data: goals, error: goalsError } = await supabase
    .from('player_goals')
    .select('id, player_id, goal, status, due_date, created_at')
    .eq('team_id', activeTeamId)
    .order('created_at', { ascending: false })

  const displayTimezone =
    (
      await supabase
        .from('team_settings')
        .select('default_timezone')
        .eq('team_id', activeTeamId)
        .maybeSingle()
    ).data?.default_timezone ||
    (
      await supabase
        .from('users')
        .select('timezone')
        .eq('id', user.id)
        .maybeSingle()
    ).data?.timezone ||
    DEFAULT_TIMEZONE

  return (
    <main className="max-w-6xl mx-auto px-4 py-10 space-y-6">
      <header className="space-y-2">
        <p className="text-[0.65rem] uppercase tracking-[0.22em] text-slate-500">Roster</p>
        <h1 className="text-3xl font-bold text-slate-50">Players & Development</h1>
        <p className="text-sm text-slate-400 max-w-3xl">
          Track availability, pitch counts, assignments, and development signals to make faster,
          better game-time decisions. Data stays in UTC; we render in your local staff timezone.
        </p>
      </header>

      <PlayerGrid
        players={players ?? []}
        notes={notes ?? []}
        goals={goals ?? []}
        displayTimezone={displayTimezone || DEFAULT_TIMEZONE}
        notesError={notesError?.message}
        goalsError={goalsError?.message}
      />
    </main>
  )
}
