import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2, Fingerprint, Sparkles } from 'lucide-react'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { GlassCard } from '@/components/ui/GlassCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Pill } from '@/components/ui/Pill'
import { setActiveTeam } from '@/app/(app)/dashboard/actions'
import { ActionButton } from '@/app/(app)/dashboard/ActionButton'

type TeamRow = {
  id: string
  name: string | null
  school_name: string | null
  level: string | null
}

export default async function SelectTeamPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    console.error('SelectTeam: auth error', userError.message)
  }

  if (!user) {
    redirect('/login')
  }

  const { data: memberships, error: membershipError } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)

  if (membershipError) {
    console.error('SelectTeam: membership error', membershipError.message)
  }

  const teamIds =
    (memberships as { team_id: string }[] | null)?.map((row) => row.team_id) ?? []

  if (teamIds.length === 0) {
    redirect('/onboarding/team')
  }

  const { data: teams, error: teamError } = await supabase
    .from('teams')
    .select('id, name, school_name, level')
    .in('id', teamIds)

  if (teamError) {
    console.error('SelectTeam: teams error', teamError.message)
  }

  const typedTeams: TeamRow[] = (teams as TeamRow[] | null) ?? []

  return (
    <section className="space-y-8">
      <SectionHeader
        eyebrow="Onboarding"
        title="Pick your active team"
        description="Switch your active workspace to the right program. You can always swap teams later in Settings."
        badge="Secure"
        actions={<Pill label="Multi-tenant" tone="cyan" icon={<Fingerprint className="h-3 w-3" />} />}
      />

      <GlassCard>
        <div className="flex flex-wrap items-center gap-3">
          <Sparkles className="h-5 w-5 text-emerald-300" />
          <p className="text-sm text-slate-300">Choose a team to sync dashboard, games, and scouting.</p>
        </div>

        <form
          action={async (formData) => {
            'use server'
            await setActiveTeam(formData)
          }}
          className="mt-4 space-y-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {typedTeams.map((team) => (
              <label
                key={team.id}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:border-brand/60 transition"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-50">{team.name || 'Unnamed Team'}</p>
                  <p className="text-xs text-slate-400">
                    {team.school_name || 'School TBD'}
                    {team.level ? ` | ${team.level}` : ''}
                  </p>
                </div>
                <input
                  type="radio"
                  name="teamId"
                  value={team.id}
                  className="h-4 w-4 accent-brand"
                  required
                />
              </label>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ActionButton label="Activate team" pendingLabel="Activating..." />
            <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-200 underline-offset-4">
              Skip for now
            </Link>
          </div>
        </form>
      </GlassCard>

      <GlassCard tone="emerald" padding="md">
        <div className="flex items-center gap-3 text-sm text-emerald-100">
          <CheckCircle2 className="h-5 w-5" />
          Switching teams updates your dashboard, games, scouting, and player profiles immediately.
        </div>
      </GlassCard>
    </section>
  )
}
