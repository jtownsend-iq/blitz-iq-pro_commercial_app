import { NextResponse } from 'next/server'
import { guardTenantAction } from '@/utils/tenant/limits'
import { requireTenantContext } from '@/utils/tenant/context'

export async function GET() {
  try {
    const tenant = await requireTenantContext({ auditEvent: 'scout_opponents_read' })
    await guardTenantAction(tenant, 'default')
    const supabase = tenant.supabase
    const teamId = tenant.teamId

    const [{ data: plays }, { data: imports }] = await Promise.all([
      supabase.from('scout_plays').select('opponent_name, season').eq('team_id', teamId),
      supabase.from('scout_imports').select('opponent_name, season').eq('team_id', teamId),
    ])

    const combined = [...(plays ?? []), ...(imports ?? [])]
    const unique = Array.from(
      new Map(
        combined.map((row) => {
          const key = `${row.opponent_name || ''}|${row.season || ''}`
          return [key, { opponent: row.opponent_name, season: row.season }]
        })
      ).values()
    ).sort((a, b) => (`${a.opponent}-${a.season}`).localeCompare(`${b.opponent}-${b.season}`))

    return NextResponse.json({ opponents: unique })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
