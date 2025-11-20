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
    onEvent: (type, payload) => {
      if (type === 'event') {
        setMetrics((prev) => ({
          totalPlays: prev.totalPlays + 1,
          explosivePlays: payload.explosive ? prev.explosivePlays + 1 : prev.explosivePlays,
          turnovers: payload.turnover ? prev.turnovers + 1 : prev.turnovers,
        }))
      }

      if (type === 'session') {
        setSessionState((prev) => ({
          ...prev,
          [payload.unit]: payload.status,
        }))
      }
    },
  })

  useEffect(() => {
    // Optionally send metrics to a client-side store or toast notifications.
  }, [metrics, sessionState])

  return null
}
