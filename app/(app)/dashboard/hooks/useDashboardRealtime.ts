'use client'

import { useEffect } from 'react'
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

type DashboardEvent =
  | { type: 'event'; payload: ChartEventPayload }
  | { type: 'session'; payload: SessionPayload }

type DashboardRealtimeOptions = {
  teamId: string
  onEvent: (event: DashboardEvent) => void
}

export function useDashboardRealtime({ teamId, onEvent }: DashboardRealtimeOptions) {
  useEffect(() => {
    let supabase: ReturnType<typeof createSupabaseBrowserClient> | null = null
    try {
      supabase = createSupabaseBrowserClient()
    } catch (err) {
      console.warn('Dashboard realtime unavailable: Supabase not configured', err)
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
          if (!payload.new) return
          const data = payload.new as ChartEventPayload
          onEvent({ type: 'event', payload: data })
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
          if (!payload.new) return
          const data = payload.new as SessionPayload
          onEvent({ type: 'session', payload: data })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [teamId, onEvent])
}
