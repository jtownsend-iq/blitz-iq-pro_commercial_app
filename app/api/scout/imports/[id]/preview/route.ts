import { NextResponse, type NextRequest } from 'next/server'
import { assertTeamScope, requireTenantContext } from '@/utils/tenant/context'
import { guardTenantAction } from '@/utils/tenant/limits'

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const tenant = await requireTenantContext({ auditEvent: 'scout_import_preview' })
    await guardTenantAction(tenant, 'default')
    const supabase = tenant.supabase

    const { id: importId } = await context.params
    if (!importId) return NextResponse.json({ error: 'importId is required' }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const limit = Math.max(0, Math.min(200, Number(searchParams.get('limit')) || 50))
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0)

    const { data: imp, error: impErr } = await supabase
      .from('scout_imports')
      .select('team_id')
      .eq('id', importId)
      .maybeSingle()
    if (impErr || !imp) return NextResponse.json({ error: 'Import not found' }, { status: 404 })

    assertTeamScope(tenant.teamId, imp.team_id as string, 'scout_import_preview')

    const { data: rows, error: rowsErr } = await supabase
      .from('scout_import_rows')
      .select('*')
      .eq('import_id', importId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (rowsErr) return NextResponse.json({ error: rowsErr.message }, { status: 400 })

    return NextResponse.json({ rows: rows ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
