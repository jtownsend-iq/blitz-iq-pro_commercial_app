import Image from 'next/image'
import { redirect } from 'next/navigation'
import { Building2, ExternalLink, Shield, Users } from 'lucide-react'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { requireAuth } from '@/utils/auth/requireAuth'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import { CTAButton } from '@/components/ui/CTAButton'
import { setActiveTeamAndGo } from '@/app/(app)/dashboard/actions'
import { loadTeamSeasonContext } from '@/lib/preferences'

type MembershipRow = {
  team_id: string
  role: string | null
}

type TeamRow = {
  id: string
  name: string | null
  school_name: string | null
  level: string | null
  primary_color?: string | null
  logo_url?: string | null
}

export default async function TeamsIndexPage() {
  const { user } = await requireAuth()
  const supabase = await createSupabaseServerClient()

  const { data: membershipsData } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', user.id)

  const memberships: MembershipRow[] = (membershipsData as MembershipRow[] | null) ?? []
  if (memberships.length === 0) {
    redirect('/onboarding/team')
  }

  const teamIds = memberships.map((m) => m.team_id)
  const { data: teamsData } = await supabase
    .from('teams')
    .select('id, name, school_name, level, primary_color, logo_url')
    .in('id', teamIds)

  const teams: TeamRow[] = (teamsData as TeamRow[] | null) ?? []

  const seasonContexts = await Promise.all(
    teams.map(async (team) => ({
      teamId: team.id,
      season: await loadTeamSeasonContext(supabase, team.id),
    }))
  )

  const seasonByTeam = new Map(seasonContexts.map((entry) => [entry.teamId, entry.season]))

  const cards = teams.map((team) => {
    const membership = memberships.find((m) => m.team_id === team.id)
    const season = seasonByTeam.get(team.id)
    return {
      ...team,
      role: membership?.role ?? 'Coach',
      seasonYear: season?.seasonYear ?? new Date().getFullYear(),
      seasonLabel: season?.seasonLabel ?? null,
    }
  })

  return (
    <section className="space-y-8">
      <SectionHeader
        eyebrow="Teams"
        title="Pick a team workspace"
        description="Multi-program staffs can see all teams, switch context, and open settings without digging through menus."
        badge="Multi-tenant"
        actions={<Pill label="Teams" tone="cyan" icon={<Users className="h-3.5 w-3.5" />} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {cards.map((team) => (
          <GlassCard
            key={team.id}
            className="group flex flex-col justify-between border border-white/10 bg-gradient-to-br from-slate-950/80 via-slate-900/70 to-black/70 transition hover:border-brand/40 hover:shadow-[0_20px_60px_-40px_rgba(0,229,255,0.4)] focus-within:border-brand/60"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Team</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-slate-50 break-words">{team.name || 'Unnamed team'}</span>
                  {team.level ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[0.7rem] uppercase tracking-[0.2em] text-slate-300">
                      {team.level}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-slate-300">{team.school_name || 'School / Program TBD'}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <Pill label={formatRole(team.role)} tone="emerald" icon={<Shield className="h-3.5 w-3.5" />} />
                  <Pill
                    label={`Season ${team.seasonLabel || team.seasonYear}`}
                    tone="slate"
                    icon={<Building2 className="h-3.5 w-3.5" />}
                  />
                </div>
              </div>
              {team.logo_url ? (
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                  <Image
                    src={team.logo_url}
                    alt={`${team.name || 'Team'} logo`}
                    fill
                    sizes="48px"
                    className="object-contain"
                    priority
                  />
                </div>
              ) : null}
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <form
                action={async (formData) => {
                  'use server'
                  formData.set('teamId', team.id)
                  formData.set('redirectTo', `/teams/${team.id}`)
                  await setActiveTeamAndGo(formData)
                }}
              >
                <CTAButton
                  type="submit"
                  variant="primary"
                  className="w-full justify-center"
                  iconRight={<ExternalLink className="h-4 w-4" />}
                >
                  Enter team
                </CTAButton>
              </form>
              <form
                action={async (formData) => {
                  'use server'
                  formData.set('teamId', team.id)
                  formData.set('redirectTo', `/settings?surface=quick`)
                  await setActiveTeamAndGo(formData)
                }}
              >
                <CTAButton
                  type="submit"
                  variant="secondary"
                  className="w-full justify-center"
                  iconRight={<ExternalLink className="h-4 w-4" />}
                >
                  Team settings
                </CTAButton>
              </form>
            </div>
          </GlassCard>
        ))}
      </div>
    </section>
  )
}

function formatRole(role: string | null | undefined) {
  if (!role) return 'Coach'
  const normalized = role.replace(/_/g, ' ').toLowerCase()
  return normalized
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
