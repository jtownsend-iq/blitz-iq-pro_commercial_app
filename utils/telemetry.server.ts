import { createSupabaseServiceRoleClient } from '@/utils/supabase/server'

type ServerTelemetryPayload = Record<string, unknown>

export async function sendServerTelemetry(event: string, payload: ServerTelemetryPayload = {}, source = 'server') {
  if (!event) return
  try {
    const supabase = createSupabaseServiceRoleClient()
    await supabase.from('telemetry_events').insert({
      event,
      payload,
      source,
      ts: Date.now(),
    })
  } catch {
    // Keep server telemetry best-effort only
  }
}
