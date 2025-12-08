import { TrendingDown, TrendingUp } from 'lucide-react'

export type StatCard = {
  id: string
  label: string
  value: string
  helper?: string
  trend?: string
  intent?: 'positive' | 'warning' | 'neutral'
}

type StatsGridProps = {
  tiles: StatCard[]
}

export function StatsGrid({ tiles }: StatsGridProps) {
  return (
    <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
      {tiles.map((tile) => (
        <article
          key={tile.id}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/80 via-slate-900/70 to-black/60 p-4 shadow-[0_22px_70px_-38px_rgba(0,0,0,0.75)] backdrop-blur-xl"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.06),transparent_50%)]" />
          <div className="relative flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 text-[0.75rem] uppercase tracking-[0.2em] text-slate-400">
              <span className="line-clamp-1 break-words">{tile.label}</span>
              {tile.intent === 'positive' ? (
                <TrendingUp className="h-4 w-4 text-emerald-300" />
              ) : tile.intent === 'warning' ? (
                <TrendingDown className="h-4 w-4 text-amber-300" />
              ) : null}
            </div>
            <p className="text-3xl font-semibold text-slate-50 leading-tight tabular-nums">{tile.value}</p>
            {tile.helper && <p className="text-xs text-slate-400 line-clamp-2 break-words">{tile.helper}</p>}
            {tile.trend && (
              <div
                className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-[0.7rem] uppercase tracking-[0.18em] ${
                  tile.intent === 'positive'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                    : tile.intent === 'warning'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                    : 'border-white/10 bg-white/5 text-slate-200'
                }`}
              >
                {tile.trend}
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}
