'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/utils/telemetry'

type DashboardTrackerProps = {
  teamId: string
  role: string | null
  mode: string
}

export function DashboardTracker({ teamId, role, mode }: DashboardTrackerProps) {
  useEffect(() => {
    trackEvent('dashboard_viewed', { teamId, role, mode }, 'dashboard')
  }, [teamId, role, mode])

  return null
}
