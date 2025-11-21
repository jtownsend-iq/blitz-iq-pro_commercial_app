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
    const limit = Math.max(0, Math.min(1000, Number(searchParams.get('limit')) || 200))

    if (!teamId || !opponent || !season) {
      return NextResponse.json({ error: 'teamId, opponent, and season are required' }, { status: 400 })
    }

    await assertMembership(teamId, user.id)

    const { data, error } = await supabase.rpc('get_scout_recent', {
      p_team: teamId,
      p_opponent: opponent,
      p_season: season,
      p_limit: limit,
      p_offset: 0,
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
