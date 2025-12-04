'use client'

import Link from 'next/link'
import { trackEvent } from '@/utils/telemetry'

type HeroCtaLinkProps = {
  href: string
  label: string
  teamId: string
  role: string | null
  mode: string
  className?: string
}

export function HeroCtaLink({ href, label, teamId, role, mode, className }: HeroCtaLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => trackEvent('dashboard_hero_cta_clicked', { href, teamId, role, mode }, 'dashboard')}
    >
      {label}
    </Link>
  )
}
