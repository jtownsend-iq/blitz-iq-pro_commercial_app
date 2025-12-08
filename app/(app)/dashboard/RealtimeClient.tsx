'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Activity, Bolt, Radio, Shield } from 'lucide-react'
import { DashboardEvent, useDashboardRealtime } from './hooks/useDashboardRealtime'
import { DashboardCounts, SessionSummary } from './types'
import { formatUnitLabel } from './utils'
import { trackEvent } from '@/utils/telemetry'
import { FreshnessBadge, computeFreshnessState } from '@/components/ui/FreshnessBadge'

type DashboardRealtimeProps = {
  teamId: string
  initialCounts: DashboardCounts
  initialSessions: SessionSummary[]
}

export function DashboardRealtimeClient({ teamId, initialCounts, initialSessions }: DashboardRealtimeProps) {
  const [metrics, setMetrics] = useState<DashboardCounts>(initialCounts)
  const [sessions, setSessions] = useState<SessionSummary[]>(initialSessions)
  const [livePulse, setLivePulse] = useState(0)
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'degraded' | 'disconnected'>('connected')
  const [lastRealtimeAt, setLastRealtimeAt] = useState<string | null>(new Date().toISOString())
  const prefersReducedMotion = useReducedMotion()
  const lastStatusRef = useRef<'connected' | 'degraded' | 'disconnected'>('connected')

  const handleRealtimeEvent = useCallback(
    (event: DashboardEvent) => {
      if (event.type === 'event') {
        setMetrics((prev) => ({
          totalPlays: prev.totalPlays + 1,
          explosivePlays: event.payload.explosive ? prev.explosivePlays + 1 : prev.explosivePlays,
          turnovers: event.payload.turnover ? prev.turnovers + 1 : prev.turnovers,
          activeSessions: prev.activeSessions,
        }))
        setRealtimeStatus('connected')
        setLivePulse((prev) => prev + 1)
        setLastRealtimeAt(new Date().toISOString())
        return
      }

      if (event.type === 'session') {
        setSessions((prev) => {
          const idx = prev.findIndex((session) => session.id === event.payload.id)
          const existing: SessionSummary | undefined = idx >= 0 ? prev[idx] : undefined
          const nextSession: SessionSummary = existing
            ? existing
            : {
                id: event.payload.id,
                unit: event.payload.unit,
                status: event.payload.status,
                started_at: event.payload.started_at,
                game_id: '',
                games: null,
              }

          const updatedSession: SessionSummary = {
            ...nextSession,
            unit: event.payload.unit || nextSession.unit,
            status: event.payload.status,
            started_at: event.payload.started_at ?? nextSession.started_at,
          }

          const next = idx >= 0 ? [...prev.slice(0, idx), updatedSession, ...prev.slice(idx + 1)] : [...prev, updatedSession]
          const activeCount = next.filter((session) => session.status === 'active').length
        setMetrics((current) => ({
          ...current,
          activeSessions: activeCount,
        }))
        return next
      })
      setRealtimeStatus('connected')
      setLivePulse((prev) => prev + 1)
      setLastRealtimeAt(new Date().toISOString())
      return
    }

    if (event.type === 'signal') {
      setRealtimeStatus(event.payload.status)
      if (event.payload.lastEventAt) {
        setLastRealtimeAt(event.payload.lastEventAt)
      }
    }
  },
    []
  )

  useDashboardRealtime({
    teamId,
    onEvent: handleRealtimeEvent,
  })

  useEffect(() => {
    const timer = setInterval(() => setLivePulse(0), 45_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (realtimeStatus !== 'connected' && lastStatusRef.current !== realtimeStatus) {
      trackEvent('dashboard_realtime_status', { status: realtimeStatus, teamId }, 'dashboard')
    }
    lastStatusRef.current = realtimeStatus
  }, [realtimeStatus, teamId])

  useEffect(() => {
    const timer = setInterval(() => {
      const freshness = computeFreshnessState(lastRealtimeAt, Date.now())
      if (freshness === 'offline' && realtimeStatus !== 'disconnected') {
        setRealtimeStatus('disconnected')
      } else if (freshness === 'stale' && realtimeStatus === 'connected') {
        setRealtimeStatus('degraded')
      }
    }, 15_000)
    return () => clearInterval(timer)
  }, [lastRealtimeAt, realtimeStatus])

  const sessionEntries = useMemo(() => {
    const byUnit = sessions.reduce<Record<string, string>>((acc, session) => {
      const unit = session.unit
      const status = session.status
      const existing = acc[unit]
      if (existing === 'active') return acc
      if (status === 'active') {
        acc[unit] = 'active'
      } else if (status === 'pending' && existing !== 'active') {
        acc[unit] = 'pending'
      } else if (!existing) {
        acc[unit] = status
      }
      return acc
    }, {})

    const units = ['OFFENSE', 'DEFENSE', 'SPECIAL_TEAMS']
    return units
      .filter((unit) => byUnit[unit])
      .map((unit) => ({
        unit,
        status: byUnit[unit],
      }))
  }, [sessions])

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-emerald-200">
          <span
            className={`h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(16,185,129,0.15)] ${
              prefersReducedMotion ? '' : 'animate-pulse'
            }`}
          />
          Live telemetry secured
          {realtimeStatus !== 'connected' && (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-amber-100">
              {realtimeStatus === 'degraded' ? 'Signal delayed' : 'Signal lost'}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FreshnessBadge label="Realtime" lastUpdated={lastRealtimeAt} />
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.7rem] uppercase tracking-[0.22em] text-slate-300 tabular-nums">
            {livePulse} new signals
          </span>
        </div>
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
          sessionEntries.map(({ unit, status }) => (
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
