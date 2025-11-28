import type { ReactNode } from 'react'

type EmptyStateProps = {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center text-slate-300">
      {icon}
      <p className="text-sm font-semibold text-slate-100">{title}</p>
      {description ? <p className="text-sm text-slate-400">{description}</p> : null}
      {action}
    </div>
  )
}
