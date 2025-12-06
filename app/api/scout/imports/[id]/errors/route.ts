import { NextResponse } from 'next/server'
import { assertTeamScope, requireTenantContext } from '@/utils/tenant/context'
import { guardTenantAction } from '@/utils/tenant/limits'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolved = await params
    const importId = resolved.id
    const tenant = await requireTenantContext({ auditEvent: 'scout_import_errors' })
    await guardTenantAction(tenant, 'default')
    const supabase = tenant.supabase

    if (!importId) return NextResponse.json({ error: 'importId is required' }, { status: 400 })

    const { data: imp, error: impErr } = await supabase
      .from('scout_imports')
      .select('team_id, opponent_name, season')
      .eq('id', importId)
      .maybeSingle()
    if (impErr || !imp) return NextResponse.json({ error: 'Import not found' }, { status: 404 })

    assertTeamScope(tenant.teamId, imp.team_id as string, 'scout_import_errors')

    const { data: rows, error: rowsErr } = await supabase
      .from('scout_import_rows')
      .select('raw_row, errors')
      .eq('import_id', importId)
      .neq('errors', '{}')

    if (rowsErr) return NextResponse.json({ error: rowsErr.message }, { status: 400 })

    const headers = ['row_number', 'errors', 'raw']
    const csvLines = [
      headers.join(','),
      ...(rows ?? []).map((r) => {
        const raw = r.raw_row as Record<string, unknown> | null
        const rowNum = (raw?.row_number as number | string | undefined) ?? ''
        const errs = Array.isArray(r.errors) ? r.errors.join('|') : ''
        const rawStr = JSON.stringify(raw || {})
        return [rowNum, errs, rawStr].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
      }),
    ].join('\n')

    return new NextResponse(csvLines, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="import_errors_${imp.opponent_name}_${imp.season || 'season'}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
