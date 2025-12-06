import { NextResponse } from 'next/server'
import { guardTenantAction } from '@/utils/tenant/limits'
import { requireTenantContext } from '@/utils/tenant/context'

export async function GET(request: Request) {
  try {
    const tenant = await requireTenantContext({ auditEvent: 'scout_recent_read' })
    await guardTenantAction(tenant, 'default')
    const supabase = tenant.supabase

    const { searchParams } = new URL(request.url)
    const opponent = searchParams.get('opponent')
    const season = searchParams.get('season')
    const limit = Math.max(0, Math.min(200, Number(searchParams.get('limit')) || 25))
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0)
    const tagsParam = searchParams.get('tags')
    const tagLogic = (searchParams.get('tagLogic') || 'OR').toUpperCase() as 'AND' | 'OR'
    const hashFilter = searchParams.get('hash') || null
    const fieldBucket = searchParams.get('fieldBucket') || null
    const tags =
      tagsParam && tagsParam.length
        ? tagsParam
            .split(',')
            .map((t) => t.toLowerCase().trim())
            .filter(Boolean)
        : null

    if (!opponent) return NextResponse.json({ error: 'opponent is required' }, { status: 400 })
    if (!season) return NextResponse.json({ error: 'season is required' }, { status: 400 })

    const { data, error } = await supabase.rpc('get_scout_recent', {
      p_team: tenant.teamId,
      p_opponent: opponent,
      p_season: season,
      p_limit: limit,
      p_offset: offset,
      p_tags: tags,
      p_tag_logic: tagLogic,
      p_hash: hashFilter,
      p_field_bucket: fieldBucket,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const res = NextResponse.json({ plays: data ?? [] })
    res.headers.set('Cache-Control', 'private, max-age=15')
    return res
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
