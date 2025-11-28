import { redirect } from 'next/navigation'
import { Crosshair, ShieldAlert } from 'lucide-react'
import ScoutingBoard from '@/components/scout/ScoutingBoard'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'

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
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-4">
        <SectionHeader
          eyebrow="Scouting"
          title="Activate a team"
          description="Pick an active team in Settings before you manage scouting intel."
          badge="Access needed"
          actions={<Pill label="Secure" tone="amber" icon={<ShieldAlert className="h-3 w-3" />} />}
        />
        <GlassCard tone="amber">
          <p className="text-sm text-amber-100">Select or activate a team in Settings before managing scouting.</p>
        </GlassCard>
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
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-4">
        <SectionHeader
          eyebrow="Scouting"
          title="Access restricted"
          description="You do not have access to this team."
          badge="Permission"
          actions={<Pill label="Switch team" tone="amber" />}
        />
        <GlassCard tone="amber">
          <p className="text-sm text-amber-100">You do not have access to this team. Please switch to a team you belong to.</p>
        </GlassCard>
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
      <SectionHeader
        eyebrow="Scouting"
        title="Opponent Intelligence"
        description="Upload CSV data, review errors, and pull live tendencies for game planning and in-game decisions."
        badge="Command Center"
        actions={<Pill label="Analysis" tone="cyan" icon={<Crosshair className="h-3 w-3" />} />}
      />

      {importsError ? (
        <GlassCard tone="amber">
          <p className="text-sm text-amber-100">Failed to load imports: {importsError.message}</p>
        </GlassCard>
      ) : (
        <GlassCard>
          <ScoutingBoard teamId={activeTeamId} opponents={opponents} imports={imports} />
        </GlassCard>
      )}
    </main>
  )
}
