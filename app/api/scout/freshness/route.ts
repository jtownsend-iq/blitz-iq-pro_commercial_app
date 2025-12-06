import { NextResponse } from 'next/server'
import { guardTenantAction } from '@/utils/tenant/limits'
import { requireTenantContext } from '@/utils/tenant/context'

export async function GET(request: Request) {
  try {
    const tenant = await requireTenantContext({ auditEvent: 'scout_freshness_read' })
    await guardTenantAction(tenant, 'default')
    const supabase = tenant.supabase

    const { searchParams } = new URL(request.url)
    const opponent = searchParams.get('opponent')
    const season = searchParams.get('season')

    const query = supabase
      .from('scout_tendencies_mv')
      .select('opponent_name, season, updated_at')
      .eq('team_id', tenant.teamId)
      .order('updated_at', { ascending: false })

    if (opponent) query.eq('opponent_name', opponent)
    if (season) query.eq('season', season)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const resp = NextResponse.json({ freshness: data ?? [] })
    resp.headers.set('Cache-Control', 'private, max-age=60')
    return resp
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
