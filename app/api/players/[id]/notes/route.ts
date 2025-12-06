import { NextResponse, type NextRequest } from 'next/server'
import { createTenantRateLimiter } from '@/utils/rateLimit'
import { assertTeamScope, requireTenantContext } from '@/utils/tenant/context'
import { fetchPlayerTeamId } from '@/utils/tenant/player'
import { sendServerTelemetry } from '@/utils/telemetry.server'

const notesLimiter = createTenantRateLimiter(120, 60_000) // per-team per-minute guard

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playerId } = await context.params
    const tenant = await requireTenantContext({ auditEvent: 'player_notes_access' })
    await notesLimiter.guard(`player_notes:${tenant.teamId}:read`)
    const playerTeamId = await fetchPlayerTeamId(tenant.supabase, playerId)
    assertTeamScope(tenant.teamId, playerTeamId, 'player_notes_read')

    const url = new URL(request.url)
    const limit = Math.min(Number(url.searchParams.get('limit') || '20'), 100)
    const offset = Math.max(Number(url.searchParams.get('offset') || '0'), 0)

    const { data, error } = await tenant.supabase
      .from('player_notes')
      .select('id, player_id, body, tags, created_at')
      .eq('team_id', tenant.teamId)
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + (limit > 0 ? limit : 20) - 1)

    if (error) {
      await sendServerTelemetry('player_notes_fetch_error', {
        teamId: tenant.teamId,
        userId: tenant.userId,
        message: error.message,
      })
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, data: data ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await requireTenantContext({ auditEvent: 'player_notes_write' })
    await notesLimiter.guard(`player_notes:${tenant.teamId}:write`)

    const body = await request.json()
    const { id: playerId } = await context.params
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

    const playerTeamId = await fetchPlayerTeamId(tenant.supabase, playerId)
    assertTeamScope(tenant.teamId, playerTeamId, 'player_notes_write')

    const { error } = await tenant.supabase.from('player_notes').insert({
      team_id: tenant.teamId,
      player_id: playerId,
      author_id: tenant.userId,
      body: trimmed,
      tags,
    })

    if (error) {
      await sendServerTelemetry('player_notes_write_error', {
        teamId: tenant.teamId,
        userId: tenant.userId,
        message: error.message,
      })
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
