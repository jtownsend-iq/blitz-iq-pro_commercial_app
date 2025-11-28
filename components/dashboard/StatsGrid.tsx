'use client'

import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useId } from 'react'
import { Activity, Flame, Shield, Timer } from 'lucide-react'
import { DashboardCounts, SparkPoint } from '@/app/(app)/dashboard/types'

type StatsGridProps = {
  totals: DashboardCounts
  volumeTrend: SparkPoint[]
  explosiveTrend: SparkPoint[]
}

export function StatsGrid({ totals, volumeTrend, explosiveTrend }: StatsGridProps) {
  const cards = [
    {
      label: 'Total plays logged',
      value: totals.totalPlays,
      helper: 'All-time snaps',
      tooltip: 'Play velocity',
      suffix: 'plays',
      icon: <Activity className="h-4 w-4 text-cyan-300" strokeWidth={1.5} />,
      tone: 'from-cyan-500/20 via-blue-500/10 to-transparent',
      sparkline: volumeTrend,
      sparkColor: 'rgba(125, 211, 252, 0.95)',
    },
    {
      label: 'Explosive plays',
      value: totals.explosivePlays,
      helper: 'Tagged explosive',
      tooltip: 'Explosive momentum',
      suffix: 'explosive',
      icon: <Flame className="h-4 w-4 text-amber-300" strokeWidth={1.5} />,
      tone: 'from-amber-500/25 via-orange-500/15 to-transparent',
      sparkline: explosiveTrend,
      sparkColor: 'rgba(251, 191, 36, 0.95)',
    },
    {
      label: 'Turnovers recorded',
      value: totals.turnovers,
      helper: 'Fumbles & INTs',
      tooltip: 'Disruption spikes',
      suffix: 'takeaways',
      icon: <Shield className="h-4 w-4 text-rose-200" strokeWidth={1.5} />,
      tone: 'from-rose-500/20 via-red-500/10 to-transparent',
      sparkline: volumeTrend,
      sparkColor: 'rgba(248, 113, 113, 0.9)',
    },
    {
      label: 'Active sessions',
      value: totals.activeSessions,
      helper: 'Analysts charting now',
      tooltip: 'Live session heat',
      suffix: 'live',
      icon: <Timer className="h-4 w-4 text-emerald-200" strokeWidth={1.5} />,
      tone: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      sparkline: explosiveTrend,
      sparkColor: 'rgba(52, 211, 153, 0.9)',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.label}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-950/75 to-black/60 p-4 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.8)] backdrop-blur-xl"
        >
          <div className="pointer-events-none absolute inset-0 opacity-70">
            <div className={`absolute inset-0 bg-gradient-to-br ${card.tone}`} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.06),transparent_45%)]" />
            <MiniSparkline
              data={card.sparkline}
              accentClass={card.tone}
              stroke={card.sparkColor}
              label={card.tooltip}
            />
          </div>

          <div className="relative space-y-2">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-400">
              <span>{card.label}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[0.6rem] text-slate-200">
                live
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="flex items-center gap-2 text-3xl font-semibold text-slate-50 tabular-nums">
                  {card.value.toLocaleString()}
                  <span className="text-xs font-normal text-slate-400">{card.suffix}</span>
                </p>
                <p className="text-xs text-slate-400">{card.helper}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 backdrop-blur">
                {card.icon}
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

type MiniSparklineProps = {
  data: SparkPoint[]
  accentClass: string
  stroke: string
  label: string
}

function MiniSparkline({ data, accentClass, stroke, label }: MiniSparklineProps) {
  const gradientId = useId()

  return (
    <div className="absolute inset-x-0 bottom-0 h-20">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.85} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeDasharray: '4 4' }}
            wrapperClassName="!bg-slate-900 !text-slate-100 !rounded-xl !px-3 !py-2 !border !border-white/10 !shadow-xl"
            contentStyle={{ background: 'transparent', border: 'none' }}
            labelStyle={{ display: 'none' }}
            formatter={(value: number) => [`${value}`, label]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            fill={`url(#${gradientId})`}
            strokeWidth={2}
            fillOpacity={0.2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accentClass}`} />
    </div>
  )
}
