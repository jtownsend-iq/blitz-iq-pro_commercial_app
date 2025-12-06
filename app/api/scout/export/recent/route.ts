import { NextResponse, type NextRequest } from 'next/server'
import { guardTenantAction } from '@/utils/tenant/limits'
import { requireTenantContext } from '@/utils/tenant/context'

export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenantContext({ auditEvent: 'scout_recent_export' })
    await guardTenantAction(tenant, 'default')
    const supabase = tenant.supabase

    const { searchParams } = new URL(request.url)
    const opponent = searchParams.get('opponent')
    const season = searchParams.get('season')
    const limit = Math.max(0, Math.min(1000, Number(searchParams.get('limit')) || 200))

    if (!opponent || !season) {
      return NextResponse.json({ error: 'opponent and season are required' }, { status: 400 })
    }

    const tagsParam = searchParams.get('tags')
    const tagLogic = (searchParams.get('tagLogic') || 'OR').toUpperCase() as 'AND' | 'OR'
    const hashFilter = searchParams.get('hash') || null
    const fieldBucket = searchParams.get('fieldBucket') || null
    const tags =
      tagsParam && tagsParam.length
        ? tagsParam
            .split(',')
            .map((t: string) => t.toLowerCase().trim())
            .filter(Boolean)
        : null

    const { data, error } = await supabase.rpc('get_scout_recent', {
      p_team: tenant.teamId,
      p_opponent: opponent,
      p_season: season,
      p_limit: limit,
      p_offset: 0,
      p_tags: tags,
      p_tag_logic: tagLogic,
      p_hash: hashFilter,
      p_field_bucket: fieldBucket,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const rows = (data as {
      created_at: string | null
      phase: 'OFFENSE' | 'DEFENSE'
      down: number | null
      distance: number | null
      hash: string | null
      field_position: number | null
      quarter: number | null
      time_remaining_seconds: number | null
      formation: string | null
      personnel: string | null
      play_family: string | null
      result: string | null
      gained_yards: number | null
      explosive: boolean | null
      turnover: boolean | null
      tags: string[] | null
    }[] | null) ?? []
    const headers = [
      'created_at',
      'phase',
      'down',
      'distance',
      'hash',
      'field_position',
      'quarter',
      'time_remaining_seconds',
      'formation',
      'personnel',
      'play_family',
      'result',
      'gained_yards',
      'explosive',
      'turnover',
      'tags',
    ]
    const csvLines = [
      headers.join(','),
      ...rows.map((r) =>
        [
          r.created_at ?? '',
          r.phase ?? '',
          r.down ?? '',
          r.distance ?? '',
          r.hash ?? '',
          r.field_position ?? '',
          r.quarter ?? '',
          r.time_remaining_seconds ?? '',
          r.formation ?? '',
          r.personnel ?? '',
          r.play_family ?? '',
          r.result ?? '',
          r.gained_yards ?? '',
          r.explosive ?? false,
          r.turnover ?? false,
          Array.isArray(r.tags) ? r.tags.join('|') : '',
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n')

    return new NextResponse(csvLines, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="recent_${opponent}_${season}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
