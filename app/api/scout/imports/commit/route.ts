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
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const importId: string | undefined = body.importId
    if (!importId) return NextResponse.json({ error: 'importId is required' }, { status: 400 })

    const svc = createSupabaseServiceRoleClient()
    const { data: imp, error: importErr } = await svc
      .from('scout_imports')
      .select('id, team_id, opponent_name, season, status')
      .eq('id', importId)
      .maybeSingle()
    if (importErr || !imp) return NextResponse.json({ error: 'Import not found' }, { status: 404 })

    await assertMembership(imp.team_id as string, user.id)

    const { data: rows, error: rowsErr } = await svc
      .from('scout_import_rows')
      .select('*')
      .eq('import_id', importId)
      .order('created_at', { ascending: true })
    if (rowsErr) return NextResponse.json({ error: rowsErr.message }, { status: 400 })

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'No staged rows to commit' }, { status: 400 })
    }

    const valid = rows.filter((r) => !r.errors || r.errors.length === 0)
    const withErrors = rows.length - valid.length

    // Idempotent: remove prior plays tied to this import
    await svc.from('scout_plays').delete().eq('import_id', importId)

    const chunkSize = 500
    for (let i = 0; i < valid.length; i += chunkSize) {
      const chunk = valid.slice(i, i + chunkSize).map((r) => ({
        team_id: r.team_id,
        opponent_name: r.opponent_name,
        season: r.season,
        import_id: importId,
        phase: r.phase,
        down: r.down,
        distance: r.distance,
        hash: r.hash,
        field_position: r.field_position,
        quarter: r.quarter,
        time_remaining_seconds: r.time_remaining_seconds,
        formation: r.formation,
        personnel: r.personnel,
        front: r.front,
        coverage: r.coverage,
        pressure: r.pressure,
        play_family: r.play_family,
        result: r.result,
        gained_yards: r.gained_yards,
        explosive: r.explosive,
        turnover: r.turnover,
        tags: r.tags || [],
      }))
      const { error: insertErr } = await svc.from('scout_plays').insert(chunk, { returning: 'minimal' })
      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 400 })
      }
    }

    const status = valid.length > 0 ? 'completed' : 'failed'
    const log = {
      total_rows: rows.length,
      inserted_rows: valid.length,
      rows_with_errors: withErrors,
    }
    await svc.from('scout_imports').update({ status, error_log: log }).eq('id', importId)

    // Refresh precomputed tendencies for this opponent/season
    if (valid.length > 0) {
      await svc.rpc('refresh_scout_tendencies', {
        p_team: imp.team_id,
        p_opponent: imp.opponent_name,
        p_season: imp.season,
      })
    }

    const resp = NextResponse.json({
      importId,
      insertedRows: valid.length,
      rowsWithErrors: withErrors,
      totalRows: rows.length,
      status,
    })
    resp.headers.set('Cache-Control', 'no-store')
    return resp
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
