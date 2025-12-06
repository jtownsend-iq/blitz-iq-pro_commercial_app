import { NextResponse } from 'next/server'
import { createSupabaseServiceRoleClient } from '@/utils/supabase/server'
import { assertTenantRole, requireTenantContext } from '@/utils/tenant/context'
import { guardTenantAction } from '@/utils/tenant/limits'

export async function POST(request: Request) {
  try {
    const tenant = await requireTenantContext({ auditEvent: 'scout_refresh' })
    assertTenantRole(tenant, ['admin', 'owner', 'coach'], 'scout_refresh')
    await guardTenantAction(tenant, 'ingest')

    const svc = createSupabaseServiceRoleClient()
    const { error } = await svc.rpc('refresh_all_scout_tendencies', { p_team: tenant.teamId })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const resp = NextResponse.json({ ok: true })
    resp.headers.set('Cache-Control', 'no-store')
    return resp
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
