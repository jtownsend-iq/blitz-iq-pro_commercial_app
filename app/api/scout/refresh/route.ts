import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/utils/supabase/server'

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
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const teamId: string | undefined = body.teamId
    if (!teamId) return NextResponse.json({ error: 'teamId is required' }, { status: 400 })

    await assertMembership(teamId, user.id)

    const svc = createSupabaseServiceRoleClient()
    const { error } = await svc.rpc('refresh_all_scout_tendencies', { p_team: teamId })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const resp = NextResponse.json({ ok: true })
    resp.headers.set('Cache-Control', 'no-store')
    return resp
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
