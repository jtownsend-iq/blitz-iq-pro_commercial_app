import { redirect } from 'next/navigation'
import ScoutingBoard from '@/components/scout/ScoutingBoard'
import { createSupabaseServerClient } from '@/utils/supabase/server'

export default async function ScoutingPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('active_team_id')
    .eq('id', user.id)
    .maybeSingle()

  const activeTeamId = profile?.active_team_id as string | null

  if (!activeTeamId) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 text-sm text-amber-100">
          Select or activate a team in Settings before managing scouting.
        </div>
      </main>
    )
  }

  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('team_id', activeTeamId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-100">
          You do not have access to this team. Please switch to a team you belong to.
        </div>
      </main>
    )
  }

  const [{ data: opponentsData }, { data: importsData, error: importsError }] = await Promise.all([
    supabase.from('scout_plays').select('opponent_name, season').eq('team_id', activeTeamId),
    supabase
      .from('scout_imports')
      .select('id, opponent_name, season, status, created_at, original_filename, file_hash, error_log')
      .eq('team_id', activeTeamId)
      .order('created_at', { ascending: false }),
  ])

  const opponents =
    opponentsData && opponentsData.length > 0
      ? Array.from(
          new Map(
            opponentsData.map((o) => {
              const key = `${o.opponent_name || ''}|${o.season || ''}`
              return [key, { opponent: o.opponent_name, season: o.season }]
            })
          ).values()
        )
      : [{ opponent: 'Set Opponent', season: '' }]

  const imports = importsData ?? []

  return (
    <main className="max-w-6xl mx-auto px-4 py-10 space-y-6">
      <header className="space-y-2">
        <p className="text-[0.65rem] uppercase tracking-[0.22em] text-slate-500">Scouting</p>
        <h1 className="text-3xl font-bold text-slate-50">Opponent Intelligence</h1>
        <p className="text-sm text-slate-400 max-w-3xl">
          Upload and stage CSV scouting data, review errors, commit to the shared database, and pull live tendencies +
          recent plays for game planning and in-game decisions.
        </p>
      </header>

      {importsError ? (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-100">
          Failed to load imports: {importsError.message}
        </div>
      ) : (
        <ScoutingBoard teamId={activeTeamId} opponents={opponents} imports={imports} />
      )}
    </main>
  )
}
