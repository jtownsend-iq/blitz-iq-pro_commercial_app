import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createSupabaseServiceRoleClient } from '@/utils/supabase/server'
import { env } from '@/utils/env'

const verifyToken = env.telemetryVerifyToken

export async function POST() {
  if (!verifyToken) {
    return NextResponse.json(
      { error: 'Verification token not configured (set TELEMETRY_VERIFY_TOKEN).' },
      { status: 500 }
    )
  }

  const auth = (await headers()).get('authorization') || ''
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : ''
  if (token !== verifyToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createSupabaseServiceRoleClient()
    const ts = Date.now()
    const payload = { ts }
    const { data, error } = await supabase
      .from('telemetry_events')
      .insert({
        event: 'telemetry_verify',
        source: 'verify_endpoint',
        payload,
        ts,
      })
      .select('id, ts')
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ ok: true, inserted: data })
  } catch (err) {
    console.error('Telemetry verify error', err)
    return NextResponse.json({ error: 'Telemetry verify failed' }, { status: 500 })
  }
}
