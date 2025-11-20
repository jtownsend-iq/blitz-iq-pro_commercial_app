'use client'

import { useEffect, useState } from 'react'
import { useDashboardRealtime } from './hooks/useDashboardRealtime'

type DashboardRealtimeProps = {
  teamId: string
}

export function DashboardRealtimeClient({ teamId }: DashboardRealtimeProps) {
  const [metrics, setMetrics] = useState({
    totalPlays: 0,
    explosivePlays: 0,
    turnovers: 0,
  })

  const [sessionState, setSessionState] = useState<Record<string, string>>({})

  useDashboardRealtime({
    teamId,
    onEvent: (event) => {
      if (event.type === 'event') {
        setMetrics((prev) => ({
          totalPlays: prev.totalPlays + 1,
          explosivePlays: event.payload.explosive ? prev.explosivePlays + 1 : prev.explosivePlays,
          turnovers: event.payload.turnover ? prev.turnovers + 1 : prev.turnovers,
        }))
      }

      if (event.type === 'session') {
        setSessionState((prev) => ({
          ...prev,
          [event.payload.unit]: event.payload.status,
        }))
      }
    },
  })

  useEffect(() => {
    // Optionally send metrics to a client-side store or toast notifications.
  }, [metrics, sessionState])

  return null
}
