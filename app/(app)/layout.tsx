import { AppShell, type NavItem } from '@/components/shell/AppShell'
import type { ReactNode } from 'react'

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/games', label: 'Games' },
  { href: '/scouting', label: 'Scouting' },
  { href: '/team', label: 'Team' },
  { href: '/settings', label: 'Settings' },
]

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      navItems={navItems}
      shellConfig={{ variant: 'app', showFooter: true }}
    >
      {children}
    </AppShell>
  )
}
