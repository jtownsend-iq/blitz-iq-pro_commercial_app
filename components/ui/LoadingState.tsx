import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

type LoadingStateProps = {
  title?: string
  description?: string
  icon?: ReactNode
}

export function LoadingState({ title = 'Loading', description, icon }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center text-slate-300">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/40 text-brand">
        {icon ?? <Loader2 className="h-6 w-6 animate-spin" />}
      </div>
      <p className="text-sm font-semibold text-slate-100">{title}</p>
      {description ? <p className="text-sm text-slate-400">{description}</p> : null}
    </div>
  )
}
