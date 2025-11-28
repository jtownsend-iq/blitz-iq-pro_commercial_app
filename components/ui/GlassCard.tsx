import type { ReactNode } from 'react'

type GlassCardProps = {
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  tone?: 'neutral' | 'emerald' | 'cyan' | 'amber'
  interactive?: boolean
}

const toneMap: Record<NonNullable<GlassCardProps['tone']>, string> = {
  neutral: 'border-white/10 bg-gradient-to-br from-slate-950/85 via-slate-950/65 to-black/60',
  emerald: 'border-emerald-500/25 bg-emerald-500/10',
  cyan: 'border-cyan-500/25 bg-cyan-500/10',
  amber: 'border-amber-500/25 bg-amber-500/10',
}

const paddingMap: Record<NonNullable<GlassCardProps['padding']>, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
}

export function GlassCard({
  children,
  className = '',
  padding = 'lg',
  tone = 'neutral',
  interactive = false,
}: GlassCardProps) {
  return (
    <div
      className={[
        'relative overflow-hidden rounded-3xl backdrop-blur-2xl shadow-[0_30px_120px_-60px_rgba(0,0,0,0.9)]',
        toneMap[tone],
        interactive ? 'transition hover:-translate-y-[1px] hover:border-white/20' : '',
        paddingMap[padding],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.06),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.04),transparent_35%)]" />
      <div className="relative">{children}</div>
    </div>
  )
}
