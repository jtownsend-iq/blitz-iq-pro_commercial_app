import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

export type NavItem = {
  href: string
  label: string
}

export type ShellVariant = 'app' | 'auth'

export type ShellConfig = {
  variant?: ShellVariant
  navItems?: NavItem[]
  showFooter?: boolean
  tenantTheme?: string
}

export type AppShellProps = {
  children: ReactNode
  navItems?: NavItem[]
  showFooter?: boolean
  tenantTheme?: string
  shellConfig?: ShellConfig
}

const defaultShellConfig: Required<Omit<ShellConfig, 'navItems'>> = {
  variant: 'app',
  showFooter: true,
  tenantTheme: 'default',
}

export function AppShell({
  children,
  navItems,
  showFooter,
  tenantTheme,
  shellConfig,
}: AppShellProps) {
  const mergedVariant = shellConfig?.variant ?? defaultShellConfig.variant
  const mergedNavItems = shellConfig?.navItems ?? navItems ?? []
  const mergedShowFooter =
    typeof showFooter === 'boolean'
      ? showFooter
      : shellConfig?.showFooter ?? defaultShellConfig.showFooter
  const mergedTenantTheme =
    shellConfig?.tenantTheme ?? tenantTheme ?? defaultShellConfig.tenantTheme

  const themeClasses =
    mergedTenantTheme === 'default'
      ? 'bg-surface text-slate-50'
      : mergedTenantTheme

  const isAuthVariant = mergedVariant === 'auth'

  return (
    <div
      className={[
        'min-h-screen flex flex-col',
        isAuthVariant
          ? 'bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.7),rgba(2,6,23,1))]'
          : '',
        themeClasses,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {isAuthVariant ? null : <TopNav navItems={mergedNavItems} />}

      <main
        className={
          isAuthVariant
            ? 'flex-1 flex items-center justify-center px-4 py-10'
            : 'flex-1'
        }
      >
        <div
          className={
            isAuthVariant ? 'w-full' : 'max-w-6xl mx-auto px-4 py-6 w-full'
          }
        >
          {children}
        </div>
      </main>

      {!isAuthVariant && mergedShowFooter ? <Footer /> : null}
    </div>
  )
}

type TopNavProps = {
  navItems: NavItem[]
}

export function TopNav({ navItems }: TopNavProps) {
  return (
    <header className="border-b border-slate-800 bg-black/60 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-16">
            <Image
              src="/blitziq-logo.png"
              alt="BlitzIQ Pro™"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide">BlitzIQ Pro™</div>
            <div className="text-[0.7rem] uppercase tracking-[0.16em] text-brand-soft">
              Engineered to Destroy Egos.
            </div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-4 text-xs font-medium">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 rounded-full text-slate-300 hover:text-slate-50 hover:bg-slate-800/60 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-black/70">
      <div className="max-w-6xl mx-auto px-4 py-3 text-[0.7rem] text-slate-500 flex justify-between items-center">
        <span>
          © {new Date().getFullYear()} Trips Right, LLC. All rights reserved.
        </span>
        <span className="text-slate-400">BlitzIQ Pro™</span>
      </div>
    </footer>
  )
}
