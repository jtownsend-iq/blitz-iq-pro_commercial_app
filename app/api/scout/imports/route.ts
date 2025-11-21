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
