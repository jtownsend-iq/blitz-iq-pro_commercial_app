'use client'

import type { ReactNode } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useId } from 'react'
import { Activity, Flame, Shield, Timer } from 'lucide-react'
import { DashboardCounts, SparkPoint } from '@/app/(app)/dashboard/types'

type StatsGridProps = {
  totals: DashboardCounts
  volumeTrend: SparkPoint[]
  explosiveTrend: SparkPoint[]
  cardsOverride?: StatCard[]
}

export type StatCard = {
  label: string
  value: number | string
  helper?: string
  live?: boolean
  tooltip?: string
  suffix?: string
  icon: ReactNode
  tone: string
  sparkline?: SparkPoint[]
  sparkColor?: string
}

export function StatsGrid({ totals, volumeTrend, explosiveTrend, cardsOverride }: StatsGridProps) {
  const defaultCards: StatCard[] = [
    {
      label: 'Total plays logged',
      value: totals.totalPlays,
      helper: 'All-time snaps • plays',
      live: true,
      tooltip: 'Play velocity',
      suffix: '',
      icon: <Activity className="h-4 w-4 text-cyan-300" strokeWidth={1.5} />,
      tone: 'from-cyan-500/20 via-blue-500/10 to-transparent',
      sparkline: volumeTrend,
      sparkColor: 'rgba(125, 211, 252, 0.95)',
    },
    {
      label: 'Explosive plays',
      value: totals.explosivePlays,
      helper: 'Tagged explosive • plays',
      live: true,
      tooltip: 'Explosive momentum',
      suffix: '',
      icon: <Flame className="h-4 w-4 text-amber-300" strokeWidth={1.5} />,
      tone: 'from-amber-500/25 via-orange-500/15 to-transparent',
      sparkline: explosiveTrend,
      sparkColor: 'rgba(251, 191, 36, 0.95)',
    },
    {
      label: 'Turnovers recorded',
      value: totals.turnovers,
      helper: 'Fumbles & INTs • takeaways',
      live: true,
      tooltip: 'Disruption spikes',
      suffix: '',
      icon: <Shield className="h-4 w-4 text-rose-200" strokeWidth={1.5} />,
      tone: 'from-rose-500/20 via-red-500/10 to-transparent',
      sparkline: volumeTrend,
      sparkColor: 'rgba(248, 113, 113, 0.9)',
    },
    {
      label: 'Active sessions',
      value: totals.activeSessions,
      helper: 'Analysts charting now • sessions',
      live: true,
      tooltip: 'Live session heat',
      suffix: '',
      icon: <Timer className="h-4 w-4 text-emerald-200" strokeWidth={1.5} />,
      tone: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      sparkline: explosiveTrend,
      sparkColor: 'rgba(52, 211, 153, 0.9)',
    },
  ]

  const cards = cardsOverride ?? defaultCards

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <article
          key={card.label}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-950/75 to-black/60 p-4 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.8)] backdrop-blur-xl"
        >
          <div className="pointer-events-none absolute inset-0 opacity-70">
            <div className={`absolute inset-0 bg-gradient-to-br ${card.tone}`} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.06),transparent_45%)]" />
            {card.sparkline && card.sparkline.length > 0 ? (
              <MiniSparkline
                data={card.sparkline}
                accentClass={card.tone}
                stroke={card.sparkColor ?? 'rgba(125, 211, 252, 0.95)'}
                label={card.tooltip ?? ''}
              />
            ) : null}
          </div>

          <div className="relative flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 text-[0.78rem] font-semibold text-slate-200">
              <span className="truncate">{card.label}</span>
              {card.live ? (
                <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em] text-slate-200">
                  Live
                </span>
              ) : null}
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="flex items-baseline gap-2 text-3xl font-semibold text-slate-50 tabular-nums leading-tight">
                  {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                </p>
                {card.helper ? (
                  <p className="text-xs text-slate-400 line-clamp-1 break-words">{card.helper}</p>
                ) : null}
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
    <div className="absolute inset-x-0 bottom-0 h-20 min-w-[140px]">
      <ResponsiveContainer width="100%" height={80}>
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
