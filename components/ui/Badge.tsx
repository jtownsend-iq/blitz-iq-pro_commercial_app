import type { ReactNode } from 'react'

type BadgeProps = {
  children: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'info'
  className?: string
}

const toneMap: Record<NonNullable<BadgeProps['tone']>, string> = {
  default: 'border-white/10 bg-white/5 text-slate-100',
  success: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-50',
  warning: 'border-amber-400/40 bg-amber-500/10 text-amber-50',
  info: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-50',
}

export function Badge({ children, tone = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.75rem] font-medium',
        toneMap[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  )
}
