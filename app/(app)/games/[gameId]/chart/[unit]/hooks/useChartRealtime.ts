import { useEffect } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from '@/utils/supabase/clients'

type RealtimeOptions<T extends Record<string, unknown>> = {
  sessionId: string
  onEvent: (payload: T) => void
}

type ChartEventPayload<T extends Record<string, unknown>> = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T
  old: T
}

export function useChartRealtime<T extends Record<string, unknown>>({
  sessionId,
  onEvent,
}: RealtimeOptions<T>) {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    const channel = supabase
      .channel(`chart-events-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chart_events',
          filter: `game_session_id=eq.${sessionId}`,
        },
        (payload: RealtimePostgresChangesPayload<ChartEventPayload<T>>) => {
          if (!payload.new) return
          const data = payload.new as T
          onEvent(data)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, onEvent])
}
