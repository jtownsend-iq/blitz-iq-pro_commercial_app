import type { HTMLAttributes, ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  padding?: 'sm' | 'md' | 'lg'
  tone?: 'neutral' | 'muted' | 'brand' | 'success' | 'warning'
  interactive?: boolean
  className?: string
}

type SectionProps = {
  children: ReactNode
  className?: string
} & HTMLAttributes<HTMLDivElement>

const paddingMap: Record<NonNullable<CardProps['padding']>, string> = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

const toneMap: Record<NonNullable<CardProps['tone']>, string> = {
  neutral: 'border-white/10 bg-linear-to-br from-slate-950/90 via-slate-950/70 to-black/70',
  muted: 'border-white/5 bg-surface/80',
  brand: 'border-cyan-400/25 bg-linear-to-br from-cyan-500/10 via-slate-900/70 to-black/70',
  success: 'border-emerald-400/25 bg-emerald-500/10',
  warning: 'border-amber-400/25 bg-amber-500/10',
}

export function Card({
  children,
  padding = 'lg',
  tone = 'neutral',
  interactive,
  className = '',
}: CardProps) {
  return (
    <div
      className={[
        'relative overflow-hidden rounded-2xl backdrop-blur-xl shadow-[0_25px_80px_-40px_rgba(0,0,0,0.8)]',
        toneMap[tone],
        paddingMap[padding],
        interactive ? 'transition hover:-translate-y-[1px] hover:border-brand/30' : '',
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

export function CardHeader({ children, className = '', ...rest }: SectionProps) {
  return (
    <div className={['flex items-start justify-between gap-3', className].join(' ')} {...rest}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '', ...rest }: SectionProps) {
  return (
    <h3 className={['text-lg font-semibold text-slate-50', className].join(' ')} {...rest}>
      {children}
    </h3>
  )
}

export function CardDescription({ children, className = '', ...rest }: SectionProps) {
  return (
    <p className={['text-sm text-slate-400', className].join(' ')} {...rest}>
      {children}
    </p>
  )
}

export function CardContent({ children, className = '', ...rest }: SectionProps) {
  return (
    <div className={['mt-4', className].join(' ')} {...rest}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className = '', ...rest }: SectionProps) {
  return (
    <div className={['mt-5 flex items-center justify-between gap-3', className].join(' ')} {...rest}>
      {children}
    </div>
  )
}
