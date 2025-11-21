import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/utils/supabase/server'
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

  const { data: teamsData, error: teamsError } = await supabase
    .from('teams')
    .select('id, name, school_name, level')
    .in('id', teamIds)

  if (teamsError) {
    console.error('SelectTeam: teams fetch error', teamsError.message)
  }

  const teams: TeamRow[] = (teamsData as TeamRow[] | null) ?? []

  if (teams.length === 1) {
    // If only one team, set it and go.
    const formData = new FormData()
    formData.set('teamId', teams[0].id)
    await setActiveTeam(formData)
  }

  return (
    <section className="max-w-3xl mx-auto space-y-6 px-4 py-10">
      <div className="space-y-2">
        <p className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-500">
          Onboarding
        </p>
        <h1 className="text-3xl font-bold text-slate-50">Select your active team</h1>
        <p className="text-sm text-slate-400">
          Choose which team to work on. You can switch later from the dashboard header.
        </p>
      </div>

      <form action={setActiveTeam} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Team</label>
          <select
            name="teamId"
            className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
            defaultValue={teams[0]?.id}
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name || 'Unnamed Team'}
                {team.school_name ? ` | ${team.school_name}` : ''}
                {team.level ? ` | ${team.level}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-3">
          <ActionButton label="Set active team" pendingLabel="Setting..." />
          <Link
            href="/onboarding/team"
            className="text-xs font-semibold text-slate-300 underline underline-offset-4"
          >
            Create a new team
          </Link>
        </div>
      </form>
    </section>
  )
}
