import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

type EmptyStateProps = {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const defaultIcon = (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 border border-white/10">
      <Inbox className="h-6 w-6 text-slate-400" aria-hidden="true" />
    </div>
  )

  return (
    <div 
      className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center"
      role="status"
    >
      {icon || defaultIcon}
      <div className="space-y-2">
        <p className="text-base font-semibold text-slate-100">{title}</p>
        {description ? (
          <p className="text-sm text-slate-400 max-w-md">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}
