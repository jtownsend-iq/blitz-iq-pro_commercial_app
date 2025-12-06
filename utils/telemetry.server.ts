import { createSupabaseServiceRoleClient } from '@/utils/supabase/server'

type ServerTelemetryPayload = Record<string, unknown>

type TelemetryOptions = {
  source?: string
  teamId?: string
  userId?: string
  correlationId?: string
  tier?: string
}

export async function sendServerTelemetry(
  event: string,
  payload: ServerTelemetryPayload = {},
  options: TelemetryOptions = {}
) {
  if (!event) return
  const { source = 'server', teamId, userId, correlationId, tier } = options
  try {
    const supabase = createSupabaseServiceRoleClient()
    await supabase.from('telemetry_events').insert({
      event,
      payload: {
        ...payload,
        teamId,
        userId,
        correlationId,
        tier,
      },
      source,
      ts: Date.now(),
    })
  } catch {
    // Keep server telemetry best-effort only
  }
}
