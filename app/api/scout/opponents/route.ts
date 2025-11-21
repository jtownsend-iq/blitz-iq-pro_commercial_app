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
