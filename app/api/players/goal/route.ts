import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'

async function assertMembership(playerId: string, userId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('team_id')
    .eq('id', playerId)
    .maybeSingle()

  if (playerError || !player?.team_id) {
    throw new Error('Player not found or team missing')
  }

  const { data: membership, error: membershipError } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('team_id', player.team_id)
    .eq('user_id', userId)
    .maybeSingle()

  if (membershipError || !membership) {
    throw new Error('You do not have access to this team')
  }

  return { supabase, teamId: player.team_id as string }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const playerId: string | undefined = body.playerId
    const goalText: string | undefined = body.goal
    const dueDate: string | null = body.dueDate ?? null
    const status: string = typeof body.status === 'string' ? body.status : 'open'
    const ownerId: string | null = typeof body.ownerId === 'string' ? body.ownerId : user.id

    if (!playerId || !goalText || goalText.trim().length === 0) {
      return NextResponse.json({ error: 'playerId and goal are required' }, { status: 400 })
    }

    const trimmed = goalText.trim()
    if (trimmed.length > 500) {
      return NextResponse.json({ error: 'Goal text too long (max 500 chars)' }, { status: 400 })
    }

    const { supabase: svc, teamId } = await assertMembership(playerId, user.id)

    const { error } = await svc.from('player_goals').insert({
      team_id: teamId,
      player_id: playerId,
      owner_id: ownerId,
      goal: trimmed,
      due_date: dueDate,
      status,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
