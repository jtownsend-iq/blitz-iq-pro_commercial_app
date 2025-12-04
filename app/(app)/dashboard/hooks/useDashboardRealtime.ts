'use client'

import { useEffect, useRef } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from '@/utils/supabase/browser'

type ChartEventPayload = {
  team_id: string
  explosive: boolean | null
  turnover: boolean | null
}

type SessionPayload = {
  team_id: string
  id: string
  unit: string
  status: string
  started_at: string | null
}

export type DashboardEvent =
  | { type: 'event'; payload: ChartEventPayload }
  | { type: 'session'; payload: SessionPayload }
  | { type: 'signal'; payload: { status: 'connected' | 'degraded' | 'disconnected'; lastEventAt: string | null } }

type DashboardRealtimeOptions = {
  teamId: string
  onEvent: (event: DashboardEvent) => void
  clientFactory?: () => ReturnType<typeof createSupabaseBrowserClient>
}

const STALE_WINDOW_MS = 45_000

export function useDashboardRealtime({ teamId, onEvent, clientFactory }: DashboardRealtimeOptions) {
  const handlerRef = useRef(onEvent)
  const lastEventAtRef = useRef<number | null>(null)
  const sessionStatusRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    handlerRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    let supabase: ReturnType<typeof createSupabaseBrowserClient> | null = null
    try {
      supabase = (clientFactory ?? createSupabaseBrowserClient)()
    } catch (err) {
      console.warn('Dashboard realtime unavailable: Supabase not configured', err)
      handlerRef.current({
        type: 'signal',
        payload: { status: 'disconnected', lastEventAt: lastEventAtIso(lastEventAtRef.current) },
      })
      return
    }

    const channel = supabase
      .channel(`dashboard-team-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chart_events',
          filter: `team_id=eq.${teamId}`,
        },
        (payload: RealtimePostgresChangesPayload<ChartEventPayload>) => {
          try {
            if (!payload.new) return
            const data = payload.new as ChartEventPayload
            lastEventAtRef.current = Date.now()
            handlerRef.current({ type: 'event', payload: data })
            handlerRef.current({
              type: 'signal',
              payload: {
                status: 'connected',
                lastEventAt: lastEventAtIso(lastEventAtRef.current),
              },
            })
          } catch {
            handlerRef.current({
              type: 'signal',
              payload: { status: 'degraded', lastEventAt: lastEventAtIso(lastEventAtRef.current) },
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions',
          filter: `team_id=eq.${teamId}`,
        },
        (payload: RealtimePostgresChangesPayload<SessionPayload>) => {
          try {
            if (!payload.new) return
            const data = payload.new as SessionPayload
            sessionStatusRef.current.set(data.id, data.status)
            handlerRef.current({ type: 'session', payload: data })
          } catch {
            handlerRef.current({
              type: 'signal',
              payload: { status: 'degraded', lastEventAt: lastEventAtIso(lastEventAtRef.current) },
            })
          }
        }
      )
      .subscribe()

    const staleTimer = setInterval(() => {
      const hasLiveSession = Array.from(sessionStatusRef.current.values()).some((status) => status === 'active')
      if (!hasLiveSession) return
      const last = lastEventAtRef.current
      const now = Date.now()
      if (!last || now - last > STALE_WINDOW_MS) {
        handlerRef.current({
          type: 'signal',
          payload: { status: 'degraded', lastEventAt: lastEventAtIso(lastEventAtRef.current) },
        })
      }
    }, STALE_WINDOW_MS)

    return () => {
      clearInterval(staleTimer)
      supabase?.removeChannel(channel)
    }
  }, [teamId, clientFactory])
}

function lastEventAtIso(value: number | null) {
  if (!value) return null
  return new Date(value).toISOString()
}
