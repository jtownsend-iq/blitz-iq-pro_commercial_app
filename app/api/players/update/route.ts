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
    if (!playerId) {
      return NextResponse.json({ error: 'playerId is required' }, { status: 400 })
    }

    const { supabase: svc } = await assertMembership(playerId, user.id)

    const update: Record<string, unknown> = {}
    if (typeof body.status === 'string') update.status = body.status
    if (typeof body.statusReason === 'string') {
      const reason = body.statusReason.trim()
      if (reason.length > 500) {
        return NextResponse.json({ error: 'statusReason too long (max 500 chars)' }, { status: 400 })
      }
      update.status_reason = reason
    }
    if (typeof body.returnTargetDate === 'string') update.return_target_date = body.returnTargetDate || null

    if (body.pitchCount !== undefined) {
      const num = Number(body.pitchCount)
      if (!Number.isNaN(num) && num >= 0) {
        update.pitch_count = num
      } else if (body.pitchCount === null) {
        update.pitch_count = null
      } else {
        return NextResponse.json({ error: 'pitchCount must be a non-negative number' }, { status: 400 })
      }
    }

    const validateStringArray = (arr: unknown, label: string, maxItems = 20, maxLen = 50) => {
      if (!Array.isArray(arr)) return null
      if (arr.length > maxItems) throw new Error(`${label} too many entries (max ${maxItems})`)
      const cleaned = arr.map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean)
      if (cleaned.some((s) => s.length > maxLen)) {
        throw new Error(`${label} entries too long (max ${maxLen} chars)`)
      }
      return cleaned
    }

    if (Array.isArray(body.packages)) update.packages = validateStringArray(body.packages, 'packages')
    if (Array.isArray(body.tags)) update.tags = validateStringArray(body.tags, 'tags')
    if (typeof body.scoutTeam === 'boolean') update.scout_team = body.scoutTeam

    const { error } = await svc.from('players').update(update).eq('id', playerId)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
