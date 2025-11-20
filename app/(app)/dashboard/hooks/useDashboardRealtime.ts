'use client'

import { useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/utils/supabase/clients'

type ChartEventPayload = {
  new: {
    team_id: string
    explosive: boolean | null
    turnover: boolean | null
  }
}

type SessionPayload = {
  new: {
    team_id: string
    id: string
    unit: string
    status: string
    started_at: string | null
  }
}

type DashboardRealtimeOptions = {
  teamId: string
  onEvent: (type: 'event' | 'session', payload: Record<string, unknown>) => void
}

export function useDashboardRealtime({ teamId, onEvent }: DashboardRealtimeOptions) {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    const channel = supabase
      .channel(`dashboard-team-${teamId}`)
      .on<ChartEventPayload>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chart_events',
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          onEvent('event', payload.new)
        }
      )
      .on<SessionPayload>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions',
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          onEvent('session', payload.new)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [teamId, onEvent])
}
