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

    if (!teamId || !opponent || !season) {
      return NextResponse.json({ error: 'teamId, opponent, and season are required' }, { status: 400 })
    }

    await assertMembership(teamId, user.id)

    const { data, error } = await supabase.rpc('get_scout_tendencies', {
      p_team: teamId,
      p_opponent: opponent,
      p_season: season,
      p_phase: phase ?? null,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const rows = (data as {
      formation: string | null
      personnel: string | null
      play_family: string | null
      down_bucket: string | null
      distance_bucket: string | null
      hash: string | null
      samples: number
      explosive_rate: number
      turnover_rate: number
      avg_gain: number
    }[] | null) ?? []
    const headers = [
      'formation',
      'personnel',
      'play_family',
      'down_bucket',
      'distance_bucket',
      'hash',
      'samples',
      'explosive_rate',
      'turnover_rate',
      'avg_gain',
    ]
    const csvLines = [
      headers.join(','),
      ...rows.map((r) =>
        [
          r.formation ?? '',
          r.personnel ?? '',
          r.play_family ?? '',
          r.down_bucket ?? '',
          r.distance_bucket ?? '',
          r.hash ?? '',
          r.samples ?? 0,
          (Number(r.explosive_rate ?? 0) * 100).toFixed(1) + '%',
          (Number(r.turnover_rate ?? 0) * 100).toFixed(1) + '%',
          Number(r.avg_gain ?? 0).toFixed(2),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n')

    return new NextResponse(csvLines, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="tendencies_${opponent}_${season}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
