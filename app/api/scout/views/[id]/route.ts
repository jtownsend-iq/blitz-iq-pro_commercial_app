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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolved = await params
    const viewId = resolved.id
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    if (!viewId) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { data: view, error: viewErr } = await supabase
      .from('scout_views')
      .select('team_id')
      .eq('id', viewId)
      .maybeSingle()
    if (viewErr || !view) return NextResponse.json({ error: 'View not found' }, { status: 404 })

    await assertMembership(view.team_id as string, user.id)

    const { error: delErr } = await supabase.from('scout_views').delete().eq('id', viewId)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 })

    const resp = NextResponse.json({ ok: true })
    resp.headers.set('Cache-Control', 'no-store')
    return resp
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
