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

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const playerId = params.id
    const { supabase: svc, teamId } = await assertMembership(playerId, user.id)

    const url = new URL(request.url)
    const limit = Math.min(Number(url.searchParams.get('limit') || '20'), 100)
    const offset = Math.max(Number(url.searchParams.get('offset') || '0'), 0)

    const { data, error } = await svc
      .from('player_notes')
      .select('id, player_id, body, tags, created_at')
      .eq('team_id', teamId)
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + (limit > 0 ? limit : 20) - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, data: data ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const playerId = params.id
    const noteBody: string | undefined = body.body
    const tags: string[] = Array.isArray(body.tags) ? body.tags : []

    if (!playerId || !noteBody || noteBody.trim().length === 0) {
      return NextResponse.json({ error: 'playerId and body are required' }, { status: 400 })
    }

    const trimmed = noteBody.trim()
    if (trimmed.length > 2000) {
      return NextResponse.json({ error: 'Note body too long (max 2000 chars)' }, { status: 400 })
    }
    if (tags.length > 20) {
      return NextResponse.json({ error: 'Too many tags (max 20)' }, { status: 400 })
    }
    if (tags.some((t) => t.length > 50)) {
      return NextResponse.json({ error: 'Tag entries too long (max 50 chars)' }, { status: 400 })
    }

    const { supabase: svc, teamId } = await assertMembership(playerId, user.id)

    const { error } = await svc.from('player_notes').insert({
      team_id: teamId,
      player_id: playerId,
      author_id: user.id,
      body: trimmed,
      tags,
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
