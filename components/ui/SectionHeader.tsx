import type { ReactNode } from 'react'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import { Pill } from './Pill'

type SectionHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  badge?: string
  align?: 'start' | 'center'
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  badge,
  align = 'start',
}: SectionHeaderProps) {
  const alignment = align === 'center' ? 'items-center text-center' : 'items-start text-left'

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl shadow-[0_25px_90px_-50px_rgba(0,0,0,0.85)]`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.16),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.16),transparent_40%)]" />
      <div className={`relative flex flex-col gap-4 md:flex-row md:justify-between ${alignment}`}>
        <div className="space-y-3 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            {eyebrow ? (
              <span className="text-[0.7rem] uppercase tracking-[0.26em] text-slate-400">{eyebrow}</span>
            ) : null}
            {badge ? <Pill tone="emerald" label={badge} /> : null}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl md:text-4xl font-semibold text-slate-50">{title}</h1>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-brand">
                <Sparkles className="h-4 w-4" />
              </span>
            </div>
            {description ? <p className="mt-2 text-sm text-slate-300">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="relative mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
        <Pill label="Glass UI" tone="slate" icon={<ArrowUpRight className="h-3 w-3" />} />
        <Pill label="Live-ready" tone="emerald" />
        <Pill label="Command Center Theme" tone="cyan" />
      </div>
    </div>
  )
}
