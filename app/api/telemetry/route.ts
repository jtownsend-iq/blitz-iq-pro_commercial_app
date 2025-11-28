import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const event = typeof body?.event === 'string' ? body.event : ''
    if (!event) {
      return NextResponse.json({ error: 'Missing event' }, { status: 400 })
    }
    const payload = body?.payload ?? {}
    const source = body?.source ?? 'app'
    const ts = body?.ts ?? Date.now()
    console.info('[telemetry]', { event, source, ts, payload })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Telemetry route error', err)
    return NextResponse.json({ error: 'Telemetry failed' }, { status: 500 })
  }
}
