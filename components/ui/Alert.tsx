import type { ReactNode } from 'react'

type AlertProps = {
  title?: string
  description?: string
  children?: ReactNode
  variant?: 'info' | 'success' | 'warning' | 'error'
  className?: string
}

const variantMap: Record<NonNullable<AlertProps['variant']>, string> = {
  info: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-50',
  success: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-50',
  warning: 'border-amber-400/40 bg-amber-500/10 text-amber-50',
  error: 'border-rose-400/30 bg-rose-500/10 text-rose-50',
}

export function Alert({ title, description, children, variant = 'info', className = '' }: AlertProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={[
        'rounded-xl border px-4 py-3 text-sm shadow-[0_12px_30px_-22px_rgba(0,0,0,0.65)]',
        variantMap[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {title ? <div className="font-semibold text-current">{title}</div> : null}
      {description ? <p className="mt-1 text-[0.92rem] opacity-90">{description}</p> : null}
      {children}
    </div>
  )
}
