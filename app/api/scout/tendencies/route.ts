import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'

async function assertMembership(teamId: string, userId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) {
    throw new Error('You do not have access to this team')
  }
  return supabase
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const opponent = searchParams.get('opponent')
    const season = searchParams.get('season')
    const phase = (searchParams.get('phase') || undefined) as 'OFFENSE' | 'DEFENSE' | undefined
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

    if (!teamId) return NextResponse.json({ error: 'teamId is required' }, { status: 400 })
    if (!opponent) return NextResponse.json({ error: 'opponent is required' }, { status: 400 })
    if (!season) return NextResponse.json({ error: 'season is required' }, { status: 400 })

    await assertMembership(teamId, user.id)

    const { data, error } = await supabase.rpc('get_scout_tendencies', {
      p_team: teamId,
      p_opponent: opponent,
      p_season: season,
      p_phase: phase ?? null,
      p_tags: tags,
      p_tag_logic: tagLogic,
      p_hash: hashFilter,
      p_field_bucket: fieldBucket,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const res = NextResponse.json({ tendencies: data ?? [] })
    res.headers.set('Cache-Control', 'private, max-age=60')
    return res
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
