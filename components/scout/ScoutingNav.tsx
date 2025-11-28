'use client'

import { trackEvent } from '@/utils/telemetry'

type NavItem = { id: string; label: string }

type Props = {
  items: NavItem[]
  variant: 'mobile' | 'desktop'
}

export function ScoutingNav({ items, variant }: Props) {
  const baseLink =
    variant === 'mobile'
      ? 'rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:border-brand hover:text-white'
      : 'block rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-slate-50'

  const containerClasses =
    variant === 'mobile'
      ? 'flex gap-3 overflow-x-auto pb-2 -mx-1 px-1'
      : 'space-y-1 p-4'

  return (
    <nav className={containerClasses}>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={baseLink}
          onClick={() => trackEvent('scouting_nav_click', { target: item.id, label: item.label }, 'scouting_page')}
        >
          {item.label}
        </a>
      ))}
    </nav>
  )
}
