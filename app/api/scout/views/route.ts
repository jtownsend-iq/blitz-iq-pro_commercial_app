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
    if (!teamId) return NextResponse.json({ error: 'teamId is required' }, { status: 400 })

    await assertMembership(teamId, user.id)

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
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await request.json()
    const teamId: string | undefined = body.teamId
    const name: string | undefined = body.name
    const opponent: string | undefined = body.opponent
    const season: string | undefined = body.season
    const filters = body.filters as Record<string, unknown> | undefined

    if (!teamId) return NextResponse.json({ error: 'teamId is required' }, { status: 400 })
    if (!name || name.trim().length === 0) return NextResponse.json({ error: 'name is required' }, { status: 400 })
    if (name.length > 120) return NextResponse.json({ error: 'name too long (max 120)' }, { status: 400 })

    await assertMembership(teamId, user.id)

    const safeFilters = filters && typeof filters === 'object' ? filters : {}

    const { data, error } = await supabase
      .from('scout_views')
      .insert({
        team_id: teamId,
        name: name.trim(),
        opponent_name: opponent,
        season,
        filters: safeFilters,
        created_by: user.id,
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
