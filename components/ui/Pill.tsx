import type { ReactNode } from 'react'

type PillProps = {
  label: string
  icon?: ReactNode
  tone?: 'slate' | 'emerald' | 'cyan' | 'amber'
}

const toneMap: Record<NonNullable<PillProps['tone']>, string> = {
  slate: 'border-white/15 bg-white/5 text-slate-200',
  emerald: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
  cyan: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-100',
  amber: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
}

export function Pill({ label, icon, tone = 'slate' }: PillProps) {
  return (
    <span
      className={[
        'inline-flex items-center justify-center gap-2 rounded-full border px-3.5 py-1.5 text-[0.7rem] uppercase tracking-[0.22em] leading-none text-center',
        toneMap[tone],
      ].join(' ')}
    >
      {icon}
      {label}
    </span>
  )
}
