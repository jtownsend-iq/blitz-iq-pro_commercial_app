import { AppShell, type NavItem, type TeamContextSummary } from '@/components/layout/AppShell'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { TelemetryBootstrap } from '@/components/telemetry/TelemetryBootstrap'
import { requireAuth } from '@/utils/auth/requireAuth'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { loadTeamSeasonContext } from '@/lib/preferences'
import type { ReactNode } from 'react'

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/teams', label: 'Teams' },
  { href: '/analytics', label: 'Season' },
  { href: '/games', label: 'Games' },
  { href: '/scouting', label: 'Scouting' },
  { href: '/settings', label: 'Settings' },
]

export default async function AppLayout({ children }: { children: ReactNode }) {
  const auth = await requireAuth()
  const supabase = await createSupabaseServerClient()

  let teamContext: TeamContextSummary | undefined

  if (auth.activeTeamId) {
    const { data: teamRow } = await supabase
      .from('teams')
      .select('id, name, school_name, level')
      .eq('id', auth.activeTeamId)
      .maybeSingle()

    const seasonContext = await loadTeamSeasonContext(supabase, auth.activeTeamId)

    const { data: recentGame } = await supabase
      .from('games')
      .select('season_label, start_time')
      .eq('team_id', auth.activeTeamId)
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle()

    const inferredSeason =
      seasonContext.seasonLabel ||
      (seasonContext.seasonYear ? seasonContext.seasonYear.toString() : null) ||
      recentGame?.season_label ||
      (recentGame?.start_time ? new Date(recentGame.start_time).getFullYear().toString() : null)

    if (teamRow) {
      teamContext = {
        id: teamRow.id,
        name: teamRow.name || 'Active team',
        school: teamRow.school_name,
        level: teamRow.level,
        seasonLabel: inferredSeason ?? 'Season TBD',
      }
    }
  }

  return (
    <AuthProvider value={auth}>
      <TelemetryBootstrap />
      <AppShell
        navItems={navItems}
        shellConfig={{ variant: 'app', showFooter: true }}
        teamContext={teamContext}
      >
        {children}
      </AppShell>
    </AuthProvider>
  )
}
