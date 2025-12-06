import { NextResponse } from 'next/server'
import { guardTenantAction } from '@/utils/tenant/limits'
import { requireTenantContext } from '@/utils/tenant/context'

export async function GET() {
  try {
    const tenant = await requireTenantContext({ auditEvent: 'scout_imports_read' })
    await guardTenantAction(tenant, 'default')
    const supabase = tenant.supabase
    const teamId = tenant.teamId

    const { data, error } = await supabase
      .from('scout_imports')
      .select('id, opponent_name, season, status, created_at, original_filename, file_hash, error_log')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ imports: data ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
