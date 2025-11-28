'use client'

import { useEffect, useState } from 'react'
import { Activity, Bolt, Radio, Shield } from 'lucide-react'
import { useDashboardRealtime } from './hooks/useDashboardRealtime'
import { DashboardCounts, SessionSummary } from './types'
import { formatUnitLabel } from './utils'

type DashboardRealtimeProps = {
  teamId: string
  initialCounts: DashboardCounts
  initialSessions: SessionSummary[]
}

export function DashboardRealtimeClient({ teamId, initialCounts, initialSessions }: DashboardRealtimeProps) {
  const [metrics, setMetrics] = useState<DashboardCounts>(initialCounts)
  const [sessionState, setSessionState] = useState<Record<string, string>>(() =>
    initialSessions.reduce<Record<string, string>>((acc, session) => {
      acc[session.unit] = session.status
      return acc
    }, {})
  )
  const [livePulse, setLivePulse] = useState(0)

  useDashboardRealtime({
    teamId,
    onEvent: (event) => {
      if (event.type === 'event') {
        setMetrics((prev) => ({
          totalPlays: prev.totalPlays + 1,
          explosivePlays: event.payload.explosive ? prev.explosivePlays + 1 : prev.explosivePlays,
          turnovers: event.payload.turnover ? prev.turnovers + 1 : prev.turnovers,
          activeSessions: prev.activeSessions,
        }))
        setLivePulse((prev) => prev + 1)
      }

      if (event.type === 'session') {
        setSessionState((prev) => {
          const next = {
            ...prev,
            [event.payload.unit]: event.payload.status,
          }
          setMetrics((current) => ({
            ...current,
            activeSessions: Object.values(next).filter((status) => status === 'active').length,
          }))
          return next
        })
        setLivePulse((prev) => prev + 1)
      }
    },
  })

  useEffect(() => {
    const timer = setInterval(() => setLivePulse(0), 45_000)
    return () => clearInterval(timer)
  }, [])

  const sessionEntries = Object.entries(sessionState)

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-emerald-200">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(16,185,129,0.15)]" />
          Live telemetry secured
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.7rem] uppercase tracking-[0.22em] text-slate-300 tabular-nums">
          {livePulse} new signals
        </span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Plays',
            value: metrics.totalPlays,
            icon: <Activity className="h-4 w-4 text-cyan-200" />,
            tone: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-50',
          },
          {
            label: 'Explosive',
            value: metrics.explosivePlays,
            icon: <Bolt className="h-4 w-4 text-amber-200" />,
            tone: 'border-amber-500/30 bg-amber-500/10 text-amber-50',
          },
          {
            label: 'Turnovers',
            value: metrics.turnovers,
            icon: <Shield className="h-4 w-4 text-rose-200" />,
            tone: 'border-rose-500/30 bg-rose-500/10 text-rose-50',
          },
          {
            label: 'Live sessions',
            value: metrics.activeSessions,
            icon: <Radio className="h-4 w-4 text-emerald-200" />,
            tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-50',
          },
        ].map((item) => (
          <div
            key={item.label}
            className={`flex items-center justify-between rounded-xl border px-3 py-2 backdrop-blur ${item.tone}`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold tabular-nums">
              {item.icon}
              {item.value.toLocaleString()}
            </div>
            <span className="text-[0.7rem] uppercase tracking-[0.22em] text-white/70">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {sessionEntries.length === 0 ? (
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            Waiting for analysts to go live...
          </span>
        ) : (
          sessionEntries.map(([unit, status]) => (
            <span
              key={unit}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                status === 'active'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                  : 'border-slate-600 bg-slate-800/70 text-slate-300'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-current" />
              {formatUnitLabel(unit)} | {status}
            </span>
          ))
        )}
      </div>
    </div>
  )
}
