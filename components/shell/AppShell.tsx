 'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
      ? 'bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.08),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.08),transparent_30%),#020617] text-slate-50'
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
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-black/60 backdrop-blur-2xl shadow-[0_30px_120px_-70px_rgba(0,0,0,0.9)]">
      <div className="pointer-events-none absolute inset-x-0 bottom-[-1px] h-px bg-gradient-to-r from-transparent via-brand to-transparent opacity-60" />
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-16 overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur">
            <Image
              src="/blitziq-logo.png"
              alt="BlitzIQ Pro™"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide text-slate-50">BlitzIQ Pro™</div>
            <div className="text-[0.7rem] uppercase tracking-[0.16em] text-brand-soft">
              Command every snap.
            </div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-2 text-xs font-semibold">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-full border ${
                pathname?.startsWith(item.href)
                  ? 'border-brand text-white bg-brand/10 shadow-[0_10px_30px_-18px_rgba(0,229,255,0.8)]'
                  : 'border-white/10 bg-white/5 text-slate-200'
              } hover:border-brand hover:text-white hover:bg-brand/10 transition`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.7rem] uppercase tracking-[0.22em] text-slate-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(16,185,129,0.18)]" />
            Live sync
          </span>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-black shadow-[0_15px_40px_-18px_rgba(0,229,255,0.6)] hover:bg-brand-soft"
          >
            Command
          </Link>
        </div>
      </div>
    </header>
  )
}

export function Footer() {
  const currentYear = new Date().getFullYear()
  const copyrightSymbol = '\u00A9'

  return (
    <footer className="border-t border-slate-800 bg-black/70" aria-label="BlitzIQ Pro footer">
      <div className="max-w-6xl mx-auto px-4 py-3 text-[0.7rem] text-slate-500 flex justify-between items-center">
        <span>
          {copyrightSymbol} {currentYear} Trips Right, LLC. All rights reserved.
        </span>
        <span className="text-slate-400">BlitzIQ Pro™</span>
      </div>
    </footer>
  )
}
