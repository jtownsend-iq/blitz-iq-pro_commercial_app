import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'

type ErrorStateProps = {
  title?: string
  description?: string
  action?: ReactNode
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again. If the issue persists, contact support.',
  action,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-6 py-8 text-center text-amber-50">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-amber-500/40 bg-black/40 text-amber-200">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-amber-50">{title}</p>
      {description ? <p className="text-sm text-amber-100/80">{description}</p> : null}
      {action}
    </div>
  )
}
