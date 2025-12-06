import { NextResponse } from 'next/server'
import { assertTeamScope, requireTenantContext } from '@/utils/tenant/context'
import { guardTenantAction } from '@/utils/tenant/limits'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolved = await params
    const viewId = resolved.id
    const tenant = await requireTenantContext({ auditEvent: 'scout_view_delete' })
    await guardTenantAction(tenant, 'write')
    const supabase = tenant.supabase

    if (!viewId) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { data: view, error: viewErr } = await supabase
      .from('scout_views')
      .select('team_id')
      .eq('id', viewId)
      .maybeSingle()
    if (viewErr || !view) return NextResponse.json({ error: 'View not found' }, { status: 404 })

    assertTeamScope(tenant.teamId, view.team_id as string, 'scout_view_delete')

    const { error: delErr } = await supabase.from('scout_views').delete().eq('id', viewId)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 })

    const resp = NextResponse.json({ ok: true })
    resp.headers.set('Cache-Control', 'no-store')
    return resp
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
