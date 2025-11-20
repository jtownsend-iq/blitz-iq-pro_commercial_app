import { useEffect } from 'react'
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
      .on<ChartEventPayload<T>>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chart_events',
          filter: `game_session_id=eq.${sessionId}`,
        },
        (payload) => {
          onEvent(payload.new)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, onEvent])
}
