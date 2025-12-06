import { AppShell, type NavItem } from '@/components/layout/AppShell'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { TelemetryBootstrap } from '@/components/telemetry/TelemetryBootstrap'
import { requireAuth } from '@/utils/auth/requireAuth'
import type { ReactNode } from 'react'

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/games', label: 'Games' },
  { href: '/scouting', label: 'Scouting' },
  { href: '/team', label: 'Team' },
  { href: '/settings', label: 'Settings' },
]

export default async function AppLayout({ children }: { children: ReactNode }) {
  const auth = await requireAuth()

  return (
    <AuthProvider value={auth}>
      <TelemetryBootstrap />
      <AppShell
        navItems={navItems}
        shellConfig={{ variant: 'app', showFooter: true }}
      >
        {children}
      </AppShell>
    </AuthProvider>
  )
}
