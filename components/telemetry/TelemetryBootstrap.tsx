"use client"

import { useEffect } from 'react'
import { setTelemetryContext } from '@/utils/telemetry'
import { useAuthContext } from '@/components/auth/AuthProvider'

export function TelemetryBootstrap() {
  const auth = useAuthContext()

  useEffect(() => {
    setTelemetryContext({
      teamId: auth.activeTeamId ?? null,
      userId: auth.user.id,
    })
  }, [auth.activeTeamId, auth.user.id])

  return null
}
