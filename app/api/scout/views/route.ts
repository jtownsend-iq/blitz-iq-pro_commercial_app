import { NextResponse } from 'next/server'
import { guardTenantAction } from '@/utils/tenant/limits'
import { requireTenantContext } from '@/utils/tenant/context'

export async function GET() {
  try {
    const tenant = await requireTenantContext({ auditEvent: 'scout_views_read' })
    await guardTenantAction(tenant, 'default')
    const supabase = tenant.supabase
    const teamId = tenant.teamId

    const { data, error } = await supabase
      .from('scout_views')
      .select('id, name, opponent_name, season, filters, created_at')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ views: data ?? [] }, { headers: { 'Cache-Control': 'private, max-age=30' } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await requireTenantContext({ auditEvent: 'scout_views_write' })
    await guardTenantAction(tenant, 'write')
    const supabase = tenant.supabase

    const body = await request.json()
    const name: string | undefined = body.name
    const opponent: string | undefined = body.opponent
    const season: string | undefined = body.season
    const filters = body.filters as Record<string, unknown> | undefined

    if (!name || name.trim().length === 0) return NextResponse.json({ error: 'name is required' }, { status: 400 })
    if (name.length > 120) return NextResponse.json({ error: 'name too long (max 120)' }, { status: 400 })

    const safeFilters = filters && typeof filters === 'object' ? filters : {}

    const { data, error } = await supabase
      .from('scout_views')
      .insert({
        team_id: tenant.teamId,
        name: name.trim(),
        opponent_name: opponent,
        season,
        filters: safeFilters,
        created_by: tenant.userId,
      })
      .select('id')
      .maybeSingle()

    if (error || !data) return NextResponse.json({ error: error?.message || 'Failed to save view' }, { status: 400 })

    const resp = NextResponse.json({ id: data.id })
    resp.headers.set('Cache-Control', 'no-store')
    return resp
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
