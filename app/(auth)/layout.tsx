import { AppShell } from '@/components/layout/AppShell'
import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      shellConfig={{
        variant: 'auth',
        showFooter: false,
      }}
    >
      {children}
    </AppShell>
  )
}
