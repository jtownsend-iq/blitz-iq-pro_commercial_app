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

    if (!teamId) return NextResponse.json({ error: 'teamId is required' }, { status: 400 })
    await assertMembership(teamId, user.id)

    const query = supabase
      .from('scout_tendencies_mv')
      .select('opponent_name, season, updated_at')
      .eq('team_id', teamId)
      .order('updated_at', { ascending: false })

    if (opponent) query.eq('opponent_name', opponent)
    if (season) query.eq('season', season)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const resp = NextResponse.json({ freshness: data ?? [] })
    resp.headers.set('Cache-Control', 'private, max-age=60')
    return resp
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
