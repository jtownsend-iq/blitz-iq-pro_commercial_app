import { NextResponse } from 'next/server'
import { createSupabaseServiceRoleClient } from '@/utils/supabase/server'

type TelemetryPayload = Record<string, unknown>

function pickString(obj: TelemetryPayload, key: string): string | null {
  const value = obj[key]
  return typeof value === 'string' ? value : null
}

export async function POST(req: Request) {
  try {
    const raw = await req.text()
    if (!raw || raw.length > 200_000) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    let body: unknown
    try {
      body = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: 'Malformed JSON' }, { status: 400 })
    }

    const typed = body as { event?: unknown; payload?: unknown; source?: unknown; ts?: unknown }
    const event = typeof typed.event === 'string' ? typed.event : ''
    if (!event) {
      return NextResponse.json({ error: 'Missing event' }, { status: 400 })
    }

    const payload: TelemetryPayload =
      typeof typed.payload === 'object' && typed.payload !== null ? (typed.payload as TelemetryPayload) : {}
    const source = typeof typed.source === 'string' ? typed.source : 'app'
    const ts = typeof typed.ts === 'number' ? typed.ts : Date.now()
    const teamId = pickString(payload, 'teamId') ?? pickString(payload, 'team_id')
    const tier = pickString(payload, 'tier') ?? pickString(payload, 'teamTier')
    const userAgent = req.headers.get('user-agent') ?? ''
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')?.[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      ''

    try {
      const supabase = createSupabaseServiceRoleClient()
      await supabase.from('telemetry_events').insert({
        event,
        source,
        payload,
        team_id: teamId,
        tier,
        ts,
        user_agent: userAgent,
        ip,
      })
    } catch (err) {
      console.error('Telemetry persist error', err)
      // Do not fail the request; keep telemetry non-blocking.
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Telemetry route error', err)
    return NextResponse.json({ error: 'Telemetry failed' }, { status: 500 })
  }
}
